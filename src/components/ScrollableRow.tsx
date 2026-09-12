'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface ScrollableRowProps {
  children: React.ReactNode;
  scrollDistance?: number;
}

/**
 * 横向滚动的卡片行。
 *
 * 原实现同时挂了 window.resize、ResizeObserver、MutationObserver 和一个
 * 递归 setTimeout，四套监听做同一件事。现在只用 ResizeObserver 观察
 * 容器与内容，配合 scroll 事件即可覆盖所有场景。
 */
export default function ScrollableRow({
  children,
  scrollDistance = 800,
}: ScrollableRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hovered, setHovered] = useState(false);

  const sync = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const threshold = 1; // 容差，避免小数误差导致按钮抖动
    setCanScrollLeft(el.scrollLeft > threshold);
    setCanScrollRight(
      el.scrollWidth - (el.scrollLeft + el.clientWidth) > threshold
    );
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    sync();

    const observer = new ResizeObserver(sync);
    observer.observe(el);
    // 也观察内容层，卡片增减时能立刻感知
    if (el.firstElementChild) observer.observe(el.firstElementChild);

    return () => observer.disconnect();
  }, [sync, children]);

  const scrollBy = (delta: number) => {
    containerRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  };

  return (
    <div
      className='relative'
      onMouseEnter={() => {
        setHovered(true);
        sync();
      }}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        ref={containerRef}
        onScroll={sync}
        className='flex gap-4 overflow-x-auto scrollbar-hide px-1 py-2 sm:gap-5'
      >
        {children}
      </div>

      <RowArrow
        side='left'
        visible={canScrollLeft && hovered}
        onClick={() => scrollBy(-scrollDistance)}
      />
      <RowArrow
        side='right'
        visible={canScrollRight && hovered}
        onClick={() => scrollBy(scrollDistance)}
      />
    </div>
  );
}

function RowArrow({
  side,
  visible,
  onClick,
}: {
  side: 'left' | 'right';
  visible: boolean;
  onClick: () => void;
}) {
  const isLeft = side === 'left';

  return (
    <div
      className={[
        'pointer-events-none absolute inset-y-0 hidden w-14 items-center sm:flex',
        isLeft ? 'left-0 justify-start' : 'right-0 justify-end',
        'transition-opacity duration-300 ease-apple',
        visible ? 'opacity-100' : 'opacity-0',
      ].join(' ')}
    >
      <button
        onClick={onClick}
        tabIndex={visible ? 0 : -1}
        aria-label={isLeft ? '向左滚动' : '向右滚动'}
        className={[
          'apple-glass-strong pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full',
          'border border-hairline/[0.08] text-ink-2 shadow-apple-card',
          'transition-all duration-250 ease-apple hover:scale-105 hover:text-ink active:scale-95',
        ].join(' ')}
      >
        {isLeft ? (
          <ChevronLeft className='h-5 w-5' />
        ) : (
          <ChevronRight className='h-5 w-5' />
        )}
      </button>
    </div>
  );
}
