'use client';

import { useEffect, useState } from 'react';

/**
 * 在线人数客户端。
 *
 * 全站共用一条心跳：`OnlineBadge`（浏览态）与播放页（观看态）都只是「注册一个
 * 上报源」，由模块级单例合并后定时发出，避免每个组件各开一个定时器。
 * 观看态优先级更高 —— 在播放页时上报的信息更完整（片名 / 集数）。
 */

export interface PresenceSnapshot {
  /** 站内在线人数（近 75s 内有心跳的设备数） */
  online: number | null;
  /** 其中正在播放的人数 */
  playing: number | null;
  /** 当前这一部作品的观看人数；未观看态时为 null */
  titleViewers: number | null;
  /** 接口是否可用（D1 未绑定时为 false，UI 应整体隐藏） */
  available: boolean;
}

export interface PresenceBeat {
  kind: 'browse' | 'play';
  source?: string;
  videoId?: string;
  title?: string;
  episode?: number;
}

const SID_KEY = 'presence_sid';
const HEARTBEAT_MS = 25_000;

const EMPTY: PresenceSnapshot = {
  online: null,
  playing: null,
  titleViewers: null,
  available: true,
};

function getSessionId(): string {
  // SSR 阶段不发心跳，也就用不上会话标识
  if (typeof window === 'undefined') return 'ssr';

  try {
    const existing = localStorage.getItem(SID_KEY);
    if (existing) return existing;

    const sid =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `s_${Date.now().toString(36)}_${Math.random()
            .toString(36)
            .slice(2, 10)}`;
    localStorage.setItem(SID_KEY, sid);
    return sid;
  } catch {
    // 无 localStorage（隐私模式）时退化为一次性会话
    return `tmp_${Math.random().toString(36).slice(2, 10)}`;
  }
}

// ---------------------------------------------------------------------------
// 模块级单例
// ---------------------------------------------------------------------------

let snapshot: PresenceSnapshot = EMPTY;
const listeners = new Set<(s: PresenceSnapshot) => void>();

let browseBeat: PresenceBeat | null = null;
let playBeat: PresenceBeat | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let inFlight = false;

/** 会话标识惰性生成，避免在 SSR / 模块加载阶段碰 localStorage */
let cachedSessionId: string | null = null;
function sessionId(): string {
  if (cachedSessionId === null) cachedSessionId = getSessionId();
  return cachedSessionId;
}

function publish(next: PresenceSnapshot) {
  snapshot = next;
  listeners.forEach((fn) => fn(next));
}

function currentBeat(): PresenceBeat | null {
  return playBeat ?? browseBeat;
}

async function beat() {
  const payload = currentBeat();
  if (!payload || inFlight) return;
  if (typeof document !== 'undefined' && document.hidden) return;

  inFlight = true;
  try {
    const res = await fetch('/api/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sid: sessionId(), ...payload }),
      keepalive: true,
    });
    if (!res.ok) return;

    const data = (await res.json()) as Partial<PresenceSnapshot> & {
      available?: boolean;
    };
    publish({
      available: data.available !== false,
      online: typeof data.online === 'number' ? data.online : null,
      playing: typeof data.playing === 'number' ? data.playing : null,
      titleViewers:
        typeof data.titleViewers === 'number' ? data.titleViewers : null,
    });
  } catch {
    // 网络异常不打断浏览，下一拍自然会重试
  } finally {
    inFlight = false;
  }
}

function ensureTimer() {
  if (timer) return;
  timer = setInterval(beat, HEARTBEAT_MS);
}

function releaseTimerIfIdle() {
  if (timer && !currentBeat()) {
    clearInterval(timer);
    timer = null;
  }
}

/** 页面从后台回到前台时立刻补一拍，避免刚切回来显示的是过期数据 */
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void beat();
  });
}

/**
 * 上报源的引用计数。
 *
 * 同一个 slot 可能被多个组件同时注册（例如嵌套的 PageLayout），用计数而不是
 * 「卸载即清空」，避免先卸载的那个把还在挂载中的那个也一起清掉。
 */
const refCount: Record<'browse' | 'play', number> = { browse: 0, play: 0 };

function registerBeat(beatInfo: PresenceBeat): () => void {
  const slot: 'browse' | 'play' = beatInfo.kind === 'play' ? 'play' : 'browse';

  if (slot === 'play') playBeat = beatInfo;
  else browseBeat = { kind: 'browse' };

  refCount[slot] += 1;
  ensureTimer();
  void beat();

  let released = false;
  return () => {
    if (released) return;
    released = true;

    refCount[slot] = Math.max(0, refCount[slot] - 1);
    if (refCount[slot] > 0) return;

    if (slot === 'play') playBeat = null;
    else browseBeat = null;
    releaseTimerIfIdle();
  };
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** 订阅当前快照（只读，不产生心跳） */
export function usePresenceSnapshot(): PresenceSnapshot {
  const [state, setState] = useState(snapshot);

  useEffect(() => {
    setState(snapshot);
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return state;
}

/**
 * 注册一个心跳来源。
 * 依赖项用扁平的基本类型，避免调用方每次渲染传入新对象导致反复重注册。
 */
export function usePresenceBeat(
  kind: 'browse' | 'play',
  info?: {
    source?: string;
    videoId?: string;
    title?: string;
    episode?: number;
  }
) {
  const { source, videoId, title, episode } = info ?? {};

  useEffect(() => {
    return registerBeat({ kind, source, videoId, title, episode });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, source, videoId, title, episode]);
}
