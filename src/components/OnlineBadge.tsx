'use client';

import { useEffect, useState } from 'react';

import { usePresenceSnapshot } from '@/lib/presence.client';

interface OnlineBadgeProps {
  /**
   * `pill` —— 顶栏用的紧凑形态；
   * `inline` —— 内容区用的形态，可带上「正在观看」的细分。
   */
  variant?: 'pill' | 'inline';
  /** 是否附带「正在播放」的细分数字 */
  withPlaying?: boolean;
  /** 作品维度的观看人数，传入时作为主文案 */
  titleViewers?: number | null;
  className?: string;
}

/**
 * 在线人数徽标。
 *
 * 数据来自 `usePresenceSnapshot()`（不再单独发心跳，由页面级 beat 统一上报）。
 * D1 不可用时静默隐藏 —— 与其显示一个恒为 0 的假数字，不如什么都不显示。
 */
export default function OnlineBadge({
  variant = 'pill',
  withPlaying = false,
  titleViewers = null,
  className = '',
}: OnlineBadgeProps) {
  const { online, playing, available } = usePresenceSnapshot();

  // 数字变化时轻微跳动，提示「这是活的」
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (online === null) return;
    setPulse(true);
    const id = setTimeout(() => setPulse(false), 400);
    return () => clearTimeout(id);
  }, [online]);

  if (!available || online === null) return null;

  // 作品维度优先：只有自己一个人时给一句更自然的话，避免「1 人正在看这部」
  const primary =
    titleViewers === null
      ? `${online} 人在线`
      : titleViewers <= 1
      ? '暂时只有你在看'
      : `${titleViewers} 人正在看这部`;

  const secondary =
    titleViewers !== null
      ? `全站 ${online} 人在线`
      : withPlaying && playing !== null && playing > 0
      ? `${playing} 人正在播放`
      : null;

  const isPill = variant === 'pill';

  return (
    <div
      className={[
        'inline-flex items-center gap-1.5 rounded-pill',
        isPill ? 'bg-hairline/[0.06] px-2.5 py-1' : 'bg-surface-2 px-3 py-1.5',
        className,
      ].join(' ')}
      title={`${primary}${secondary ? ` · ${secondary}` : ''}`}
      aria-live='polite'
    >
      <LiveDot />
      <span
        className={[
          'tabular-nums whitespace-nowrap font-medium text-ink-2 transition-opacity duration-250 ease-apple',
          isPill ? 'text-[12px]' : 'text-[13px]',
          pulse ? 'opacity-60' : 'opacity-100',
        ].join(' ')}
      >
        {primary}
        {secondary && <span className='text-ink-3'> · {secondary}</span>}
      </span>
    </div>
  );
}

/** 呼吸中的绿点，暗示「实时」 */
function LiveDot() {
  return (
    <span className='relative flex h-1.5 w-1.5 shrink-0'>
      <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/60' />
      <span className='relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500' />
    </span>
  );
}
