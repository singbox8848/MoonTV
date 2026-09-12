/* eslint-disable no-console,react-hooks/exhaustive-deps */

'use client';

import { useSearchParams } from 'next/navigation';
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { getDoubanCategories } from '@/lib/douban.client';
import { DoubanItem } from '@/lib/types';

import DoubanCardSkeleton from '@/components/DoubanCardSkeleton';
import DoubanSelector from '@/components/DoubanSelector';
import MediaGrid from '@/components/MediaGrid';
import PageLayout from '@/components/PageLayout';
import VideoCard from '@/components/VideoCard';

const PAGE_SIZE = 25;
const SKELETON_COUNT = 25;

const PAGE_META: Record<string, { title: string; desc: string }> = {
  movie: { title: '电影', desc: '豆瓣高分与热门院线' },
  tv: { title: '剧集', desc: '正在热播与口碑好剧' },
  show: { title: '综艺', desc: '每周更新的热门综艺' },
  custom: { title: '自定义', desc: '由站长配置的片单' },
};

/** 由 type 推导两组选择器的初始值 */
function initialSelection(type: string) {
  switch (type) {
    case 'movie':
      return { primary: '热门', secondary: '全部' };
    case 'tv':
      return { primary: '', secondary: 'tv' };
    case 'show':
      return { primary: '', secondary: 'show' };
    default:
      return { primary: '', secondary: '全部' };
  }
}

function DoubanPageClient() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type') || 'movie';

  const [doubanData, setDoubanData] = useState<DoubanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const initial = useMemo(() => initialSelection(type), [type]);
  const [primarySelection, setPrimarySelection] = useState(initial.primary);
  const [secondarySelection, setSecondarySelection] = useState(
    initial.secondary
  );

  const loadMoreRef = useRef<HTMLDivElement>(null);

  // type 变化时重置选择器
  useEffect(() => {
    setPrimarySelection(initial.primary);
    setSecondarySelection(initial.secondary);
  }, [initial]);

  const getRequestParams = useCallback(
    (pageStart: number) => {
      // tv / show 共用 kind='tv'，category 取 type 本身
      if (type === 'tv' || type === 'show') {
        return {
          kind: 'tv' as const,
          category: type,
          type: secondarySelection,
          pageLimit: PAGE_SIZE,
          pageStart,
        };
      }
      return {
        kind: type as 'tv' | 'movie',
        category: primarySelection,
        type: secondarySelection,
        pageLimit: PAGE_SIZE,
        pageStart,
      };
    },
    [type, primarySelection, secondarySelection]
  );

  // 条件变化后重新拉首页数据（100ms 防抖，合并连续的状态更新）
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setDoubanData([]);
        setCurrentPage(0);
        setHasMore(true);

        const data = await getDoubanCategories(getRequestParams(0));
        if (cancelled) return;

        if (data.code === 200) {
          setDoubanData(data.list);
          setHasMore(data.list.length === PAGE_SIZE);
        }
      } catch (err) {
        if (!cancelled) console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 100);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [getRequestParams]);

  // 触底加载下一页
  useEffect(() => {
    if (currentPage === 0) return;

    let cancelled = false;
    (async () => {
      try {
        setIsLoadingMore(true);
        const data = await getDoubanCategories(
          getRequestParams(currentPage * PAGE_SIZE)
        );
        if (cancelled) return;

        if (data.code === 200) {
          setDoubanData((prev) => [...prev, ...data.list]);
          setHasMore(data.list.length === PAGE_SIZE);
        }
      } catch (err) {
        if (!cancelled) console.error(err);
      } finally {
        if (!cancelled) setIsLoadingMore(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentPage, getRequestParams]);

  // 进入视口即翻页
  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasMore || isLoadingMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setCurrentPage((prev) => prev + 1);
      },
      { threshold: 0.1 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loading]);

  const meta = PAGE_META[type] ?? PAGE_META.movie;
  const activePath = `/douban?type=${type}`;

  return (
    <PageLayout activePath={activePath}>
      <div className='mx-auto max-w-wide px-4 pb-16 pt-10 sm:px-8 lg:px-10'>
        {/* 标题 */}
        <header className='mb-8'>
          <h1 className='apple-headline'>{meta.title}</h1>
          <p className='apple-body mt-2'>{meta.desc}</p>
        </header>

        {/* 筛选器：吸顶，滚动时始终可切换 */}
        <div className='sticky top-nav z-[400] -mx-4 mb-10 px-4 py-3 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10'>
          <div className='apple-glass-strong rounded-apple-lg border border-hairline/[0.07] p-3 sm:p-4'>
            <DoubanSelector
              type={type as 'movie' | 'tv' | 'show'}
              primarySelection={primarySelection}
              secondarySelection={secondarySelection}
              onPrimaryChange={(value) => {
                if (value !== primarySelection) {
                  setLoading(true);
                  setPrimarySelection(value);
                }
              }}
              onSecondaryChange={(value) => {
                if (value !== secondarySelection) {
                  setLoading(true);
                  setSecondarySelection(value);
                }
              }}
            />
          </div>
        </div>

        <MediaGrid>
          {loading
            ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <DoubanCardSkeleton key={i} />
              ))
            : doubanData.map((item, index) => (
                <VideoCard
                  key={`${item.title}-${index}`}
                  from='douban'
                  title={item.title}
                  poster={item.poster}
                  douban_id={item.id}
                  rate={item.rate}
                  year={item.year}
                  type={type === 'movie' ? 'movie' : ''}
                />
              ))}
        </MediaGrid>

        {/* 触底哨兵 */}
        {hasMore && !loading && (
          <div ref={loadMoreRef} className='flex justify-center py-12'>
            {isLoadingMore && (
              <div className='flex items-center gap-3 text-[14px] text-ink-2'>
                <span className='h-5 w-5 animate-spin rounded-full border-2 border-hairline/[0.15] border-t-accent' />
                加载中…
              </div>
            )}
          </div>
        )}

        {!hasMore && doubanData.length > 0 && (
          <p className='py-12 text-center text-[13px] text-ink-3'>
            已加载全部内容
          </p>
        )}

        {!loading && doubanData.length === 0 && (
          <p className='py-24 text-center text-[15px] text-ink-2'>
            暂无相关内容
          </p>
        )}
      </div>
    </PageLayout>
  );
}

export default function DoubanPage() {
  return (
    <Suspense>
      <DoubanPageClient />
    </Suspense>
  );
}
