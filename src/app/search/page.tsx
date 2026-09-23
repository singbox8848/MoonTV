/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
'use client';

export const runtime = 'edge';

import { ChevronUp, Search, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';

import {
  addSearchHistory,
  clearSearchHistory,
  deleteSearchHistory,
  getSearchHistory,
  subscribeToDataUpdates,
} from '@/lib/db.client';
import { SearchResult } from '@/lib/types';
import { yellowWords } from '@/lib/yellow';

import MediaGrid from '@/components/MediaGrid';
import PageLayout from '@/components/PageLayout';
import Section from '@/components/Section';
import { Skeleton } from '@/components/ui/Skeleton';
import { Switch } from '@/components/ui/Switch';
import VideoCard from '@/components/VideoCard';

/** 与年份比较相关的兜底：'unknown' 排最后 */
function compareYear(a: string, b: string) {
  if (a === b) return 0;
  if (a === 'unknown') return 1;
  if (b === 'unknown') return -1;
  return parseInt(a) > parseInt(b) ? -1 : 1;
}

function SearchPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  /** 默认聚合设置：只读用户本地设置，默认启用 */
  const [viewMode, setViewMode] = useState<'agg' | 'all'>(() => {
    if (typeof window !== 'undefined') {
      const userSetting = localStorage.getItem('defaultAggregateSearch');
      if (userSetting !== null) return JSON.parse(userSetting) ? 'agg' : 'all';
    }
    return 'agg';
  });

  // 按 标题 + 年份 + 类型 聚合
  const aggregatedResults = useMemo(() => {
    const normalizedQuery = searchQuery.trim().replaceAll(' ', '');
    const map = new Map<string, SearchResult[]>();

    searchResults.forEach((item) => {
      const key = `${item.title.replaceAll(' ', '')}-${
        item.year || 'unknown'
      }-${item.episodes.length === 1 ? 'movie' : 'tv'}`;
      const arr = map.get(key);
      if (arr) arr.push(item);
      else map.set(key, [item]);
    });

    return Array.from(map.entries()).sort((a, b) => {
      // 标题包含搜索词的排前面
      const aMatch = a[1][0].title
        .replaceAll(' ', '')
        .includes(normalizedQuery);
      const bMatch = b[1][0].title
        .replaceAll(' ', '')
        .includes(normalizedQuery);
      if (aMatch !== bMatch) return aMatch ? -1 : 1;
      if (a[1][0].year === b[1][0].year) return a[0].localeCompare(b[0]);
      return compareYear(a[1][0].year, b[1][0].year);
    });
  }, [searchResults, searchQuery]);

  // 初始化：聚焦、搜索历史订阅、返回顶部监听
  useEffect(() => {
    if (!searchParams.get('q')) document.getElementById('searchInput')?.focus();

    getSearchHistory().then(setSearchHistory);
    const unsubscribe = subscribeToDataUpdates(
      'searchHistoryUpdated',
      (newHistory: string[]) => setSearchHistory(newHistory)
    );

    // 单次滚动监听 + rAF 节流即可；原实现同时挂了常驻 rAF 循环与 scroll 监听两套
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const top = Math.max(
          document.body.scrollTop,
          document.documentElement.scrollTop
        );
        setShowBackToTop(top > 300);
        ticking = false;
      });
    };

    document.body.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      unsubscribe();
      document.body.removeEventListener('scroll', onScroll);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const fetchSearchResults = async (query: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query.trim())}`
      );
      const data = await response.json();
      let results: SearchResult[] = data.results ?? [];

      // 过滤题材命中黄名单的来源
      if (
        typeof window !== 'undefined' &&
        !(window as any).RUNTIME_CONFIG?.DISABLE_YELLOW_FILTER
      ) {
        results = results.filter(
          (r) =>
            !yellowWords.some((word: string) =>
              (r.type_name || '').includes(word)
            )
        );
      }

      setSearchResults(
        results.sort((a, b) => {
          const aExact = a.title === query.trim();
          const bExact = b.title === query.trim();
          if (aExact !== bExact) return aExact ? -1 : 1;
          if (a.year === b.year) return a.title.localeCompare(b.title);
          return compareYear(a.year, b.year);
        })
      );
      setShowResults(true);
    } catch {
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
      setSearchQuery(query);
      fetchSearchResults(query);
      addSearchHistory(query); // 事件订阅会自动刷新历史列表
    } else {
      setShowResults(false);
    }
  }, [searchParams]);

  const runSearch = (raw: string) => {
    const trimmed = raw.trim().replace(/\s+/g, ' ');
    if (!trimmed) return;
    setSearchQuery(trimmed);
    setIsLoading(true);
    setShowResults(true);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    fetchSearchResults(trimmed);
    addSearchHistory(trimmed);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.body.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <PageLayout activePath='/search'>
      <div className='mx-auto max-w-wide px-4 pb-20 pt-10 sm:px-8 lg:px-10'>
        {/* 搜索入口 */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runSearch(searchQuery);
          }}
          className='mx-auto mb-14 max-w-content'
          role='search'
        >
          <div className='group relative'>
            <Search className='pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-3' />
            <input
              id='searchInput'
              type='search'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='搜索电影、剧集、综艺'
              aria-label='搜索影视'
              autoComplete='off'
              className='h-14 w-full rounded-pill border-0 bg-surface pl-11 pr-4 text-[17px] text-ink shadow-apple-card placeholder:text-ink-3 transition-all duration-250 ease-apple focus:shadow-apple-focus focus:outline-none [&::-webkit-search-cancel-button]:hidden'
            />
          </div>
        </form>

        {isLoading ? (
          <div className='mx-auto max-w-content'>
            <Skeleton className='mb-6 h-7 w-32' rounded='rounded-full' />
            <MediaGrid>
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i}>
                  <Skeleton
                    className='aspect-[2/3] w-full'
                    rounded='rounded-apple-lg'
                  />
                  <Skeleton className='mt-3 h-4 w-4/5' rounded='rounded-full' />
                  <Skeleton className='mt-2 h-3 w-2/5' rounded='rounded-full' />
                </div>
              ))}
            </MediaGrid>
          </div>
        ) : showResults ? (
          <Section
            title={`搜索结果${
              searchResults.length ? `（${searchResults.length}）` : ''
            }`}
            action={
              <label className='flex shrink-0 cursor-pointer select-none items-center gap-2'>
                <span className='text-[14px] text-ink-2'>聚合显示</span>
                <Switch
                  size='sm'
                  label='聚合显示搜索结果'
                  checked={viewMode === 'agg'}
                  onChange={(checked) => setViewMode(checked ? 'agg' : 'all')}
                />
              </label>
            }
          >
            <MediaGrid
              isEmpty={searchResults.length === 0}
              empty='没有找到相关结果，换个关键词试试'
            >
              {viewMode === 'agg'
                ? aggregatedResults.map(([key, group]) => (
                    <VideoCard
                      key={`agg-${key}`}
                      from='search'
                      items={group}
                      query={
                        searchQuery.trim() !== group[0].title
                          ? searchQuery.trim()
                          : ''
                      }
                    />
                  ))
                : searchResults.map((item) => (
                    <VideoCard
                      key={`all-${item.source}-${item.id}`}
                      id={item.id}
                      title={`${item.title} ${item.type_name}`}
                      poster={item.poster}
                      episodes={item.episodes.length}
                      source={item.source}
                      source_name={item.source_name}
                      douban_id={item.douban_id?.toString()}
                      query={
                        searchQuery.trim() !== item.title
                          ? searchQuery.trim()
                          : ''
                      }
                      year={item.year}
                      from='search'
                      type={item.episodes.length > 1 ? 'tv' : 'movie'}
                    />
                  ))}
            </MediaGrid>
          </Section>
        ) : searchHistory.length > 0 ? (
          <Section
            title='搜索历史'
            action={
              <button
                onClick={() => clearSearchHistory()}
                className='shrink-0 text-[14px] text-ink-2 transition-colors duration-250 ease-apple hover:text-accent'
              >
                清空
              </button>
            }
            className='mx-auto max-w-content'
          >
            <div className='flex flex-wrap gap-2.5'>
              {searchHistory.map((item) => (
                <div key={item} className='group relative'>
                  <button
                    onClick={() => runSearch(item)}
                    className='rounded-pill bg-surface px-4 py-2 text-[14px] text-ink shadow-apple-xs transition-all duration-250 ease-apple hover:-translate-y-0.5 hover:shadow-apple-card'
                  >
                    {item}
                  </button>
                  <button
                    aria-label={`删除「${item}」`}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      deleteSearchHistory(item);
                    }}
                    className='absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink-3 text-white opacity-0 transition-all duration-250 ease-apple hover:bg-[#ff3b30] group-hover:opacity-100'
                  >
                    <X className='h-3 w-3' />
                  </button>
                </div>
              ))}
            </div>
          </Section>
        ) : null}
      </div>

      {/* 返回顶部 */}
      <button
        onClick={scrollToTop}
        aria-label='返回顶部'
        className={[
          'apple-glass-strong fixed bottom-24 right-5 z-[500] flex h-11 w-11 items-center justify-center rounded-full',
          'border border-hairline/[0.08] text-ink shadow-apple-float md:bottom-8 md:right-8',
          'transition-all duration-400 ease-apple-out',
          showBackToTop
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-3 opacity-0',
        ].join(' ')}
      >
        <ChevronUp className='h-5 w-5' />
      </button>
    </PageLayout>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageClient />
    </Suspense>
  );
}
