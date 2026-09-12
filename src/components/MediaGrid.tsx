import React from 'react';

interface MediaGridProps {
  children: React.ReactNode;
  /** 空态文案，传入时在无内容时居中展示 */
  empty?: string;
  isEmpty?: boolean;
  className?: string;
}

/**
 * 海报网格。
 *
 * 原先首页 / 搜索页 / 豆瓣页各写了一份几乎相同的 grid class（且各自微调过
 * 间距与列数），这里收敛为一份，保证三个页面卡片尺寸一致。
 */
export function MediaGrid({
  children,
  empty,
  isEmpty = false,
  className = '',
}: MediaGridProps) {
  if (isEmpty) {
    return (
      <div className='flex flex-col items-center justify-center gap-2 py-24 text-center'>
        <p className='text-[15px] text-ink-2'>{empty ?? '暂无内容'}</p>
      </div>
    );
  }

  return (
    <div
      className={[
        'grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] lg:gap-x-6 lg:gap-y-10',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}

export default MediaGrid;
