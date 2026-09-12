/**
 * 统一的骨架屏。
 *
 * 原先 page.tsx / ContinueWatching.tsx / DoubanCardSkeleton.tsx 各写了一份
 * 结构几乎相同的骨架屏，这里合并成一处。
 */
export function Skeleton({
  className = '',
  rounded = 'rounded-apple-md',
}: {
  className?: string;
  rounded?: string;
}) {
  return <div className={`apple-skeleton ${rounded} ${className}`} />;
}

/** 海报卡片骨架（2:3 竖版） */
export function PosterSkeleton({
  showMeta = true,
  className = '',
}: {
  showMeta?: boolean;
  className?: string;
}) {
  return (
    <div className={className} aria-hidden='true'>
      <Skeleton className='aspect-[2/3] w-full' rounded='rounded-apple-lg' />
      {showMeta && (
        <>
          <Skeleton className='mt-3 h-4 w-4/5' rounded='rounded-full' />
          <Skeleton className='mt-2 h-3 w-2/5' rounded='rounded-full' />
        </>
      )}
    </div>
  );
}

/** 一行 n 个海报骨架 */
export function PosterSkeletonRow({ count = 8 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <PosterSkeleton key={i} className='w-28 shrink-0 sm:w-44' />
      ))}
    </>
  );
}

export default Skeleton;
