'use client';

import React from 'react';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  /** 无障碍标签，必填以便屏幕阅读器识别 */
  label: string;
  id?: string;
}

const SIZE = {
  md: {
    track: 'h-[31px] w-[51px]',
    knob: 'h-[27px] w-[27px]',
    on: 'translate-x-5',
    off: 'translate-x-0.5',
  },
  sm: {
    track: 'h-5 w-9',
    knob: 'h-4 w-4',
    on: 'translate-x-4',
    off: 'translate-x-0.5',
  },
} as const;

/**
 * Apple 风格开关。
 *
 * 原实现把这段 ~10 行的 track/knob 标记在 UserMenu 里复制了 5 遍，
 * 这里收敛成单一组件。
 */
export function Switch({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  label,
  id,
}: SwitchProps) {
  const s = SIZE[size];

  return (
    <button
      id={id}
      type='button'
      role='switch'
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex shrink-0 items-center rounded-full',
        'transition-colors duration-250 ease-apple',
        'disabled:cursor-not-allowed disabled:opacity-40',
        checked ? 'bg-[#34c759]' : 'bg-hairline/[0.16]',
        s.track,
      ].join(' ')}
    >
      <span
        className={[
          'pointer-events-none block rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.2)]',
          'transition-transform duration-250 ease-apple',
          s.knob,
          checked ? s.on : s.off,
        ].join(' ')}
      />
    </button>
  );
}

export default Switch;
