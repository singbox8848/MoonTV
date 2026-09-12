'use client';

import React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-hover active:scale-[0.98]',
  secondary:
    'border border-hairline/[0.14] bg-surface text-ink hover:bg-surface-2 active:scale-[0.98] dark:border-hairline/[0.18]',
  ghost: 'text-accent hover:bg-accent/[0.08] active:scale-[0.98]',
  danger: 'bg-[#ff3b30] text-white hover:bg-[#ff4f45] active:scale-[0.98]',
};

const SIZE_CLASS: Record<Size, string> = {
  sm: 'px-3.5 py-1.5 text-[13px]',
  md: 'px-5 py-[9px] text-[15px]',
  lg: 'px-6 py-3 text-[17px]',
};

/**
 * Apple 风格按钮：胶囊形、无边框、按下时轻微缩小。
 */
export function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-pill font-medium leading-none',
        'transition-all duration-250 ease-apple',
        'disabled:pointer-events-none disabled:opacity-40',
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        block ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    />
  );
}

export default Button;
