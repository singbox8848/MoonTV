/* eslint-disable react-hooks/exhaustive-deps, no-console */

'use client';

export const runtime = 'edge';

import { ArrowUp, RotateCcw, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  buildBrowseHref,
  CATEGORIES,
  defaultSelections,
  findCategory,
  paramsKey,
  selectionsFromParams,
  toApiParams,
} from '@/lib/categories';
import { getDoubanCategories } from '@/lib/douban.client';
import { DoubanItem } from '@/lib/types';

import DoubanCardSkeleton from '@/components/DoubanCardSkeleton';
import FilterBar from '@/components/FilterBar';
import MediaGrid from '@/components/MediaGrid';
import OnlineBadge from '@/components/OnlineBadge';
import PageLayout from '@/components/PageLayout';
import VideoCard from '@/components/VideoCard';

const PAGE_SIZE = 25;
const SKELETON_COUNT = 25;

type Selections = Record<string, string>;
type SelectionStore = Record<string, Selections>;

function BrowsePageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeCategory = useMemo(
    () => findCategory(searchParams.get('type')),
    [searchParams]
  );
  const activeKey = activeCategory.key;

  /**
   * 每个 tab 的筛选记忆。
   *
   * 重构前切换分类会整页跳转、筛选重置，回来还得重新点一遍；现在切走再切回
   * 依然停留在原来的筛选上（`selectionsFromParams` 负责深链首次进入的情形）。
   */
  const [store, setStore] = useState<SelectionStore>({});

  const urlSelections = useMemo(
    () =>
      selectionsFromParams(
        activeCategory,
        new URLSearchParams(searchParams.toString())
      ),
    [activeCategory, searchParams]
  );
  const selections = store[activeKey] ?? urlSelections;

  const apiParams = useMemo(
    () => toApiParams(activeCategory, selections),
    [activeCategory, selections]
  );
  const feedKey = paramsKey(apiParams);

  // 每个 tab 的目标链接带上各自记住的筛选，保证可分享、刷新不丢
  const tabHrefs = useMemo(() => {
    const result: Record<string, string> = {};
    for (const category of CATEGORIES) {
      const sel = store[category.key] ?? defaultSelections(category);
      result[category.key] = buildBrowseHref(category, sel);
    }
    return result;
  }, [store]);

  const isFiltered = activeCategory.axes.some(
    (axis) => (selections[axis.param] ?? axis.fallback) !== axis.fallback
  );

  // ---------------------------------------------------------------------------
  // 数据
  // ---------------------------------------------------------------------------
  const [items, setItems] = useState<DoubanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** 手动重试用：自增后重新触发首屏请求 */
  const [reloadToken, setReloadToken] = useState(0);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const apiParamsRef = useRef(apiParams);
  apiParamsRef.current = apiParams;

  // 条件变化 → 重置并拉第一页（120ms 防抖，合并连续点击）
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const data = await getDoubanCategories({
          ...apiParamsRef.current,
          pageLimit: PAGE_SIZE,
          pageStart: 0,
        });
        if (cancelled) return;

        if (data.code === 200) {
          setItems(data.list);
          setHasMore(data.list.length === PAGE_SIZE);
          setPage(0);
        } else {
          setItems([]);
          setHasMore(false);
          setError('数据源返回异常，请稍后重试');
        }
      } catch (err) {
        console.error('获取片单失败', err);
        if (!cancelled) {
          setItems([]);
          setHasMore(false);
          setError('加载失败，请检查网络后重试');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 120);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [feedKey, reloadToken]);

  // 追加下一页
  const loadMore = useCallback(async () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const data = await getDoubanCategories({
        ...apiParamsRef.current,
        pageLimit: PAGE_SIZE,
        pageStart: nextPage * PAGE_SIZE,
      });
      if (data.code === 200) {
        setItems((prev) => {
          // 数据源偶发重复返回同一页，这里按 id 去重避免出现重复卡片
          const seen = new Set(prev.map((item) => item.id));
          return [...prev, ...data.list.filter((item) => !seen.has(item.id))];
        });
        setHasMore(data.list.length === PAGE_SIZE);
        setPage(nextPage);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('加载下一页失败', err);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [page]);

  // 触底自动翻页
  useEffect(() => {
    const target = sentinelRef.current;
    if (!target || !hasMore || loadingMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) void loadMore();
      },
      { rootMargin: '400px 0px' }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, loadMore]);

  // ---------------------------------------------------------------------------
  // 交互
  // ---------------------------------------------------------------------------
  const handleFilterChange = useCallback(
    (param: string, value: string) => {
      const next = { ...selections, [param]: value };
      setStore((prev) => ({ ...prev, [activeKey]: next }));
      // 只改查询串，不滚动 —— 筛选时视线保持在筛选器上
      router.replace(buildBrowseHref(activeCategory, next), { scroll: false });
    },
    [activeCategory, activeKey, router, selections]
  );

  const handleReset = useCallback(() => {
    const next = defaultSelections(activeCategory);
    setStore((prev) => ({ ...prev, [activeKey]: next }));
    router.replace(buildBrowseHref(activeCategory, next), { scroll: false });
  }, [activeCategory, activeKey, router]);

  // 在线心跳由 PageLayout 统一上报（浏览态），播放页会额外覆盖为观看态

  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 800);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const activeTabLabel = activeCategory.label;

  return (
    <PageLayout activePath={tabHrefs[activeKey]}>
      <div className='mx-auto max-w-wide px-4 pb-16 pt-8 sm:px-8 lg:px-10 lg:pt-10'>
        {/* 标题 + 在线人数 */}
        <header className='mb-6 flex flex-wrap items-end justify-between gap-3'>
          <div>
            <h1 className='apple-headline'>{activeTabLabel}</h1>
            <p className='apple-body mt-2'>{activeCategory.desc}</p>
          </div>
          <OnlineBadge variant='inline' withPlaying className='mb-1' />
        </header>

        {/* 一级分类 tab：就地切换，不整页跳转 */}
        <nav
          aria-label='内容分类'
          className='scrollbar-hide -mx-4 mb-5 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0'
        >
          {CATEGORIES.map((category) => {
            const active = category.key === activeKey;
            return (
              <Link
                key={category.key}
                href={tabHrefs[category.key]}
                scroll={false}
                replace
                aria-current={active ? 'page' : undefined}
                className={[
                  'shrink-0 rounded-pill px-4 py-2 text-[14px] transition-colors duration-250 ease-apple',
                  active
                    ? 'bg-ink font-medium text-canvas'
                    : 'text-ink-2 hover:bg-hairline/[0.06] hover:text-ink',
                ].join(' ')}
              >
                {category.label}
              </Link>
            );
          })}
        </nav>

        {/* 筛选区：吸顶，滚动时始终可切换 */}
        <div className='sticky top-nav z-[400] -mx-4 mb-8 px-4 pb-3 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10'>
          <div className='apple-glass-strong rounded-apple-lg border border-hairline/[0.07] p-3 sm:p-4'>
            <FilterBar
              axes={activeCategory.axes}
              selections={selections}
              onChange={handleFilterChange}
              busy={loading}
            />
          </div>
        </div>

        {/* 结果状态条 */}
        {!loading && !error && (
          <div className='mb-5 flex items-center justify-between gap-3 text-[13px] text-ink-3'>
            <span className='tabular-nums'>
              已加载 {items.length} 部{isFiltered ? '（已筛选）' : ''}
            </span>
            {isFiltered && (
              <button
                type='button'
                onClick={handleReset}
                className='inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-ink-2 transition-colors duration-250 ease-apple hover:bg-hairline/[0.06] hover:text-ink'
              >
                <RotateCcw className='h-3.5 w-3.5' />
                重置筛选
              </button>
            )}
          </div>
        )}

        {/* 列表 */}
        {error ? (
          <div className='flex flex-col items-center gap-3 rounded-apple-lg bg-surface-2 py-20 text-center'>
            <SlidersHorizontal className='h-5 w-5 text-ink-3' />
            <p className='text-[15px] text-ink-2'>{error}</p>
            <button
              type='button'
              onClick={() => setReloadToken((n) => n + 1)}
              className='apple-btn-primary px-5 py-2 text-[14px]'
            >
              重试
            </button>
          </div>
        ) : (
          <MediaGrid>
            {loading
              ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                  <DoubanCardSkeleton key={i} />
                ))
              : items.map((item, index) => (
                  <VideoCard
                    key={`${item.id}-${index}`}
                    from='douban'
                    title={item.title}
                    poster={item.poster}
                    douban_id={item.id}
                    rate={item.rate}
                    year={item.year}
                    type={activeCategory.kind === 'movie' ? 'movie' : ''}
                  />
                ))}
          </MediaGrid>
        )}

        {/* 触底哨兵 */}
        {!error && hasMore && !loading && (
          <div ref={sentinelRef} className='flex justify-center py-12'>
            {loadingMore && (
              <div className='flex items-center gap-3 text-[14px] text-ink-2'>
                <span className='h-5 w-5 animate-spin rounded-full border-2 border-hairline/[0.15] border-t-accent' />
                加载中…
              </div>
            )}
          </div>
        )}

        {!error && !hasMore && items.length > 0 && (
          <p className='py-12 text-center text-[13px] text-ink-3'>
            已看完全部 {items.length} 部
          </p>
        )}

        {!error && !loading && items.length === 0 && (
          <p className='py-24 text-center text-[15px] text-ink-2'>
            该筛选下暂无内容，换个条件试试
          </p>
        )}
      </div>

      {/* 回到顶部 */}
      {showTop && (
        <button
          type='button'
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label='回到顶部'
          className='apple-glass-strong fixed bottom-24 right-4 z-[500] flex h-10 w-10 items-center justify-center rounded-full border border-hairline/[0.08] text-ink-2 shadow-apple-card transition-colors duration-250 ease-apple hover:text-ink md:bottom-8 md:right-8'
        >
          <ArrowUp className='h-4 w-4' />
        </button>
      )}
    </PageLayout>
  );
}

export default function BrowsePage() {
  return (
    <Suspense>
      <BrowsePageClient />
    </Suspense>
  );
}
