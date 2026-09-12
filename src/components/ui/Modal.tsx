'use client';

import { X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  /** 标题右侧的操作区（例如"重置"按钮） */
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** 宽度档位 */
  size?: 'sm' | 'md' | 'lg';
}

const SIZE = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
} as const;

/**
 * Apple 风格对话框：毛玻璃遮罩 + 圆角面板 + 上浮入场，支持 ESC 关闭与滚动锁定。
 */
export function Modal({
  open,
  onClose,
  title,
  headerExtra,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ESC 关闭 + 打开时锁定背景滚动
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className='fixed inset-0 z-[1000] flex items-center justify-center p-4'>
      {/* 遮罩 */}
      <div
        className='absolute inset-0 bg-black/40 backdrop-blur-md animate-fade-in dark:bg-black/60'
        onClick={onClose}
      />

      {/* 面板 */}
      <div
        role='dialog'
        aria-modal='true'
        className={[
          'relative w-full animate-apple-scale-in overflow-hidden rounded-apple-xl',
          'border border-hairline/[0.08] bg-surface shadow-apple-float dark:border-hairline/[0.1]',
          SIZE[size],
        ].join(' ')}
      >
        {(title || headerExtra) && (
          <div className='flex items-center justify-between gap-4 px-6 pb-4 pt-6'>
            <div className='flex items-center gap-3'>
              {title && (
                <h3 className='font-display text-[19px] font-semibold tracking-[-0.018em] text-ink'>
                  {title}
                </h3>
              )}
              {headerExtra}
            </div>
            <button
              onClick={onClose}
              aria-label='关闭'
              className='apple-icon-btn -mr-1.5 shrink-0'
            >
              <X className='h-4 w-4' />
            </button>
          </div>
        )}

        <div className={title ? 'px-6 pb-6' : 'p-6'}>{children}</div>

        {footer && (
          <div className='border-t border-hairline/[0.08] bg-parchment/60 px-6 py-4 dark:border-hairline/[0.1] dark:bg-surface-2/40'>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default Modal;
