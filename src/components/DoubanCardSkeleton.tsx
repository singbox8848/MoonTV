import { PosterSkeleton } from './ui/Skeleton';

/**
 * 豆瓣分类页的加载骨架。改用统一的 PosterSkeleton 实现，
 * 与首页 / 继续观看的骨架保持一致的尺寸与节奏。
 */
export default function DoubanCardSkeleton() {
  return <PosterSkeleton className='w-full' />;
}
