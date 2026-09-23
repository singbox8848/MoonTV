'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import type { FilterAxis } from '@/lib/categories';

interface FilterBarProps {
  axes: readonly FilterAxis[];
  selections: Record<string, string>;
  onChange: (param: string, value: string) => void;
  /** 数据加载中时给一个轻微的忙碌态（不禁用，保证连续点击依然跟手） */
  busy?: boolean;
}

/**
 * 单条胶囊选择器。
 *
 * 重构前 `DoubanSelector` 用 `setTimeout(…, 0)` 测量位置，并且在 `useEffect(…, [type])`
 * 里手工计算激活下标 —— 一旦选项变化或字体后加载，指示条就会错位。
 * 这里改为：激活项打 `data-active`，用 `offsetLeft/offsetWidth` 直接量（相对
 * 定位容器，无需 getBoundingClientRect 相减），并用 ResizeObserver 跟随尺寸变化。
 */
function CapsuleGroup({
  options,
  value,
  onSelect,
}: {
  options: FilterAxis['options'];
  value: string;
  onSelect: (value: string) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{
    left: number;
    width: number;
  } | null>(null);

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const active = track.querySelector<HTMLElement>('[data-active="true"]');
    setIndicator(
      active ? { left: active.offsetLeft, width: active.offsetWidth } : null
    );
  }, []);

  useLayoutEffect(() => {
    measure();
    const track = trackRef.current;
    if (!track || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(measure);
    observer.observe(track);
    // 字体后加载会改变胶囊宽度，用它兜一次
    document.fonts?.ready?.then(measure).catch(() => undefined);
    return () => observer.disconnect();
  }, [measure, options, value]);

  // 移动端：激活项若被横向裁掉，自动滚进可视区
  useEffect(() => {
    const scroller = scrollRef.current;
    const track = trackRef.current;
    if (!scroller || !track) return;
    const active = track.querySelector<HTMLElement>('[data-active="true"]');
    if (!active) return;

    const left = active.offsetLeft;
    const right = left + active.offsetWidth;
    const viewLeft = scroller.scrollLeft;
    const viewRight = viewLeft + scroller.clientWidth;

    if (left < viewLeft || right > viewRight) {
      scroller.scrollTo({
        left: left - (scroller.clientWidth - active.offsetWidth) / 2,
        behavior: 'smooth',
      });
    }
  }, [value, options]);

  return (
    <div ref={scrollRef} className='scrollbar-hide -mx-1 overflow-x-auto px-1'>
      <div
        ref={trackRef}
        role='radiogroup'
        className='relative inline-flex rounded-pill bg-hairline/[0.06] p-1'
      >
        {indicator && indicator.width > 0 && (
          <span
            aria-hidden
            className='pointer-events-none absolute top-1 bottom-1 rounded-pill bg-surface shadow-apple-xs transition-[left,width] duration-250 ease-apple'
            style={{ left: indicator.left, width: indicator.width }}
          />
        )}

        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type='button'
              role='radio'
              aria-checked={active}
              data-active={active}
              onClick={() => !active && onSelect(option.value)}
              className={[
                'relative z-10 whitespace-nowrap rounded-pill px-3 py-1.5 text-[13px] transition-colors duration-250 ease-apple sm:px-4',
                active
                  ? 'font-medium text-ink'
                  : 'text-ink-2 hover:text-ink active:opacity-60',
              ].join(' ')}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 分类筛选区。
 *
 * 完全由 `FilterAxis[]` 驱动 —— 电影有「分类 + 地区」两条轴，剧集/综艺各有
 * 一条「类型」轴，新增分类不需要再动这里的代码。
 */
export default function FilterBar({
  axes,
  selections,
  onChange,
  busy = false,
}: FilterBarProps) {
  return (
    <div
      className={[
        'flex flex-col gap-2.5 transition-opacity duration-250 ease-apple sm:gap-3',
        busy ? 'opacity-70' : 'opacity-100',
      ].join(' ')}
    >
      {axes.map((axis) => (
        <div
          key={axis.param}
          className='flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3'
        >
          <span className='shrink-0 text-[12px] font-medium tracking-wide text-ink-3 sm:w-10 sm:text-[13px]'>
            {axis.label}
          </span>
          <CapsuleGroup
            options={axis.options}
            value={selections[axis.param] ?? axis.fallback}
            onSelect={(value) => onChange(axis.param, value)}
          />
        </div>
      ))}
    </div>
  );
}
