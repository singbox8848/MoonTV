'use client';

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

interface CapsuleSwitchProps {
  options: { label: string; value: string }[];
  active: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * Apple 分段控件（Segmented Control）。
 *
 * 相对原实现修正了两点：
 * 1. 用 useLayoutEffect + ResizeObserver 精确跟随尺寸变化，不再依赖
 *    `setTimeout(..., 0)` 猜测布局时机（窗口 resize 时指示条也不会跑偏）。
 * 2. 指示器宽度为 0 时不再渲染，避免首帧闪现在错误位置。
 */
const CapsuleSwitch: React.FC<CapsuleSwitchProps> = ({
  options,
  active,
  onChange,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const activeIndex = options.findIndex((opt) => opt.value === active);

  const updateIndicator = useCallback(() => {
    const container = containerRef.current;
    const button = activeIndex >= 0 ? buttonRefs.current[activeIndex] : null;
    if (!container || !button || button.offsetWidth === 0) return;

    const containerRect = container.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();

    setIndicator({
      left: buttonRect.left - containerRect.left,
      width: buttonRect.width,
    });
  }, [activeIndex]);

  // 布局阶段同步测量，避免首帧闪烁
  useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator, options.length]);

  // 容器尺寸变化（窗口缩放、字体加载）时重新测量
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(updateIndicator);
    observer.observe(container);
    return () => observer.disconnect();
  }, [updateIndicator]);

  return (
    <div
      ref={containerRef}
      role='tablist'
      className={[
        'relative inline-flex items-center rounded-pill bg-hairline/[0.07] p-[3px]',
        className ?? '',
      ].join(' ')}
    >
      {/* 滑块 */}
      {indicator.width > 0 && (
        <span
          aria-hidden='true'
          className='absolute bottom-[3px] top-[3px] rounded-pill bg-surface shadow-apple-xs transition-all duration-300 ease-apple-out dark:bg-[#636366]'
          style={{
            left: indicator.left,
            width: indicator.width,
          }}
        />
      )}

      {options.map((opt, index) => {
        const isActive = active === opt.value;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            role='tab'
            aria-selected={isActive}
            onClick={() => onChange(opt.value)}
            className={[
              'relative z-10 rounded-pill px-4 py-1.5 text-[13px] font-medium',
              'transition-colors duration-250 ease-apple',
              isActive ? 'text-ink' : 'text-ink-2 hover:text-ink',
            ].join(' ')}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};

export default CapsuleSwitch;
