import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

interface SectionProps {
  title: string;
  /** 右上角「查看全部」的目标 */
  href?: string;
  /** 右上角自定义操作（优先于 href），例如「清空」 */
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/**
 * 内容区块头部。
 *
 * 首页/搜索/收藏里原本各自手写了 5 处「标题 + 查看更多」的相同结构，
 * 统一到这里，标题字号与间距也随之对齐 Apple 的排版节奏。
 */
export function Section({
  title,
  href,
  action,
  className = '',
  children,
}: SectionProps) {
  return (
    <section className={['mb-12', className].filter(Boolean).join(' ')}>
      <div className='mb-5 flex items-end justify-between gap-4'>
        <h2 className='font-display text-[21px] font-semibold leading-tight tracking-[-0.018em] text-ink sm:text-[24px]'>
          {title}
        </h2>

        {action ??
          (href && (
            <Link
              href={href}
              className='group inline-flex shrink-0 items-center gap-0.5 text-[14px] text-accent transition-opacity duration-250 ease-apple hover:opacity-70'
            >
              查看全部
              <ChevronRight className='h-4 w-4 transition-transform duration-250 ease-apple group-hover:translate-x-0.5' />
            </Link>
          ))}
      </div>
      {children}
    </section>
  );
}

export default Section;
