/* eslint-disable no-console,@typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * 在线 / 正在观看人数。
 *
 * 数据落在 D1（Pages 项目已绑定 `DB`）。每台设备只占一行，由客户端每 25s
 * 心跳一次；超过 {@link ONLINE_WINDOW_MS} 未心跳即视为离线，在下次心跳时被清理。
 * 因此「在线数」是 `presence` 表当前行数，无需额外的时间窗口过滤。
 *
 * 之所以不用内存 Map：Pages 的 Worker 会按机房水平扩容，多 isolate 各持一份
 * 计数会严重偏低；D1 才是一次写入、全局可见。
 */

const ONLINE_WINDOW_MS = 75_000; // 心跳 25s × 3，容错两次丢包
const MAX_SESSION_ID_LEN = 64;
const MAX_TITLE_LEN = 120;

interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = any>(colName?: string): Promise<T | null>;
  run(): Promise<any>;
  all<T = any>(): Promise<{ results: T[] }>;
}

interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<any>;
}

/**
 * D1 绑定。
 *
 * 不引入 `@cloudflare/next-on-pages` 的 `getRequestContext()` —— 该包入口会
 * import `server-only` 等模块，打进 edge 产物有构建风险。但它的实现其实只有一行：
 * 从 `globalThis` 上按约定取一个 Symbol（`Symbol.for` 走全局注册表，跨模块拿到
 * 的是同一个 Symbol），这里直接复刻那一步。另外 next-on-pages 也会把绑定挂到
 * `process.env`（仓库里 `lib/d1.db.ts` 一直这么用），一并兜住。
 * 全是零成本查找；取不到就返回 null，接口降级为「不可用」而不是报错。
 */
const CF_CONTEXT_SYMBOL = Symbol.for('__cloudflare-request-context__');

function getDatabase(): D1Database | null {
  const g = globalThis as any;
  return (
    (process.env as any)?.DB ??
    g[CF_CONTEXT_SYMBOL]?.env?.DB ??
    g?.DB ??
    g?.env?.DB ??
    null
  );
}

function clean(value: unknown, maxLen: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLen);
}

/** 统计语句统一返回 `SELECT COUNT(*) AS n`，因此只有一列 */
interface CountRow {
  n: number | string;
}

/**
 * 清理过期会话并统计。
 * 用 batch 一次往返拿回全部计数，避免每个数字一次查询。
 */
async function pruneAndCount(
  db: D1Database,
  cutoff: number,
  source: string | null,
  videoId: string | null
) {
  const statements = [
    db.prepare('DELETE FROM presence WHERE last_seen < ?').bind(cutoff),
    db.prepare('SELECT COUNT(*) AS n FROM presence'),
    db.prepare("SELECT COUNT(*) AS n FROM presence WHERE kind = 'play'"),
  ];

  if (source && videoId) {
    statements.push(
      db
        .prepare(
          'SELECT COUNT(*) AS n FROM presence WHERE source = ? AND video_id = ?'
        )
        .bind(source, videoId)
    );
  }

  const results = await db.batch(statements);
  const rowOf = (index: number): number =>
    Number((results?.[index]?.results?.[0] as CountRow | undefined)?.n ?? 0) ||
    0;

  return {
    online: rowOf(1),
    playing: rowOf(2),
    titleViewers: source && videoId ? rowOf(3) : null,
  };
}

function unavailable() {
  return NextResponse.json(
    { available: false, online: null, playing: null, titleViewers: null },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );
}

/**
 * 心跳：上报当前会话状态，并返回最新统计。
 * body: { sid, kind: 'browse' | 'play', source?, videoId?, title?, episode? }
 */
export async function POST(request: NextRequest) {
  const db = getDatabase();
  if (!db) return unavailable();

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '无效的请求体' }, { status: 400 });
  }

  const sid = clean(body.sid, MAX_SESSION_ID_LEN);
  if (!sid) {
    return NextResponse.json({ error: '缺少会话标识' }, { status: 400 });
  }

  const kind = body.kind === 'play' ? 'play' : 'browse';
  const source = clean(body.source, MAX_SESSION_ID_LEN);
  const videoId = clean(body.videoId, MAX_SESSION_ID_LEN);
  const title = clean(body.title, MAX_TITLE_LEN);
  const episode =
    typeof body.episode === 'number' && Number.isFinite(body.episode)
      ? Math.trunc(body.episode)
      : null;

  const now = Date.now();
  const cutoff = now - ONLINE_WINDOW_MS;

  try {
    await db
      .prepare(
        `INSERT INTO presence (session_id, last_seen, kind, source, video_id, title, episode)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(session_id) DO UPDATE SET
           last_seen = excluded.last_seen,
           kind      = excluded.kind,
           source    = excluded.source,
           video_id  = excluded.video_id,
           title     = excluded.title,
           episode   = excluded.episode`
      )
      .bind(sid, now, kind, source, videoId, title, episode)
      .run();

    const counts = await pruneAndCount(db, cutoff, source, videoId);
    return NextResponse.json(
      { available: true, ...counts, at: now },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('presence 心跳失败', error);
    return unavailable();
  }
}

/** 只读统计，供需要轮询但不改状态的场景使用 */
export async function GET(request: NextRequest) {
  const db = getDatabase();
  if (!db) return unavailable();

  const { searchParams } = new URL(request.url);
  const source = clean(searchParams.get('source'), MAX_SESSION_ID_LEN);
  const videoId = clean(searchParams.get('id'), MAX_SESSION_ID_LEN);

  try {
    const counts = await pruneAndCount(
      db,
      Date.now() - ONLINE_WINDOW_MS,
      source,
      videoId
    );
    return NextResponse.json(
      { available: true, ...counts, at: Date.now() },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('presence 查询失败', error);
    return unavailable();
  }
}
