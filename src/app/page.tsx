/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, no-console */

'use client';

import { Search } from 'lucide-react';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';

// 客户端收藏 API
import {
  clearAllFavorites,
  getAllFavorites,
  getAllPlayRecords,
  subscribeToDataUpdates,
} from '@/lib/db.client';
import { getDoubanCategories } from '@/lib/douban.client';
import { DoubanItem } from '@/lib/types';

import CapsuleSwitch from '@/components/CapsuleSwitch';
import ContinueWatching from '@/components/ContinueWatching';
import MediaGrid from '@/components/MediaGrid';
import PageLayout from '@/components/PageLayout';
import ScrollableRow from '@/components/ScrollableRow';
import Section from '@/components/Section';
import { useSite } from '@/components/SiteProvider';
import { Modal } from '@/components/ui/Modal';
import { PosterSkeletonRow } from '@/components/ui/Skeleton';
import VideoCard from '@/components/VideoCard';

const ROW_CARD_WIDTH = 'w-28 shrink-0 sm:w-40';

type FavoriteItem = {
  id: string;
  source: string;
  title: string;
  poster: string;
  episodes: number;
  source_name: string;
  currentEpisode?: number;
  search_title?: string;
  year?: string;
};

/** 首页的三个内容分区，避免三段几乎相同的 JSX 重复三遍 */
const SECTIONS = [
  {
    key: 'movies',
    title: '热门电影',
    href: '/douban?type=movie',
    type: 'movie',
  },
  { key: 'tv', title: '热门剧集', href: '/douban?type=tv', type: '' },
  { key: 'show', title: '热门综艺', href: '/douban?type=show', type: '' },
] as const;

function HomeClient() {
  const [activeTab, setActiveTab] = useState<'home' | 'favorites'>('home');
  const [items, setItems] = useState<Record<string, DoubanItem[]>>({
    movies: [],
    tv: [],
    show: [],
  });
  const [loading, setLoading] = useState(true);
  const [favoriteItems, setFavoriteItems] = useState<FavoriteItem[]>([]);
  const { announcement } = useSite();
  const [showAnnouncement, setShowAnnouncement] = useState(false);

  // 公告弹窗：仅当公告内容与上次确认过的不一致时弹出
  useEffect(() => {
    if (typeof window === 'undefined' || !announcement) return;
    setShowAnnouncement(
      localStorage.getItem('hasSeenAnnouncement') !== announcement
    );
  }, [announcement]);

  // 首页三块内容并行拉取
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const [movies, tv, show] = await Promise.all([
          getDoubanCategories({
            kind: 'movie',
            category: '热门',
            type: '全部',
          }),
          getDoubanCategories({ kind: 'tv', category: 'tv', type: 'tv' }),
          getDoubanCategories({ kind: 'tv', category: 'show', type: 'show' }),
        ]);

        if (cancelled) return;
        setItems({
          movies: movies.code === 200 ? movies.list : [],
          tv: tv.code === 200 ? tv.list : [],
          show: show.code === 200 ? show.list : [],
        });
      } catch (error) {
        console.error('获取豆瓣数据失败:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // 切换到收藏夹时加载收藏数据
  useEffect(() => {
    if (activeTab !== 'favorites') return;
    let cancelled = false;

    const updateFavoriteItems = async (allFavorites: Record<string, any>) => {
      const allPlayRecords = await getAllPlayRecords();
      if (cancelled) return;

      const sorted = Object.entries(allFavorites)
        .sort(([, a], [, b]) => b.save_time - a.save_time)
        .map(([key, fav]) => {
          const plusIndex = key.indexOf('+');
          return {
            id: key.slice(plusIndex + 1),
            source: key.slice(0, plusIndex),
            title: fav.title,
            year: fav.year,
            poster: fav.cover,
            episodes: fav.total_episodes,
            source_name: fav.source_name,
            currentEpisode: allPlayRecords[key]?.index,
            search_title: fav?.search_title,
          } as FavoriteItem;
        });

      setFavoriteItems(sorted);
    };

    getAllFavorites().then(updateFavoriteItems);

    const unsubscribe = subscribeToDataUpdates(
      'favoritesUpdated',
      (newFavorites: Record<string, any>) => {
        updateFavoriteItems(newFavorites);
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [activeTab]);

  const closeAnnouncement = () => {
    setShowAnnouncement(false);
    if (announcement) localStorage.setItem('hasSeenAnnouncement', announcement);
  };

  return (
    <PageLayout activePath='/'>
      <div className='mx-auto max-w-wide px-4 pb-16 pt-8 sm:px-8 lg:px-10 lg:pt-12'>
        {/* Hero：苹果式大标题 + 单一主行动。
            入场用 `animate-apple-rise`（`both` 填充 + 递增 delay）做错位浮现，
            避免整块同时出现显得生硬。 */}
        <div className='mb-10 flex flex-col items-center text-center sm:mb-14'>
          <span className='animate-apple-rise mb-4 rounded-pill bg-accent/[0.1] px-3 py-1 text-[12px] font-medium text-accent'>
            影视聚合
          </span>
          <h1 className='apple-headline animate-apple-rise max-w-prose text-balance [animation-delay:60ms]'>
            找到今晚想看的那一部
          </h1>
          <p className='apple-body animate-apple-rise mt-4 max-w-prose text-balance [animation-delay:120ms]'>
            聚合豆瓣高分片单与全网播放源，一处搜索，随处开播。
          </p>
          <Link
            href='/search'
            className='apple-btn-primary animate-apple-rise mt-7 px-6 py-2.5 text-[15px] [animation-delay:180ms]'
          >
            <Search className='h-4 w-4' />
            开始搜索
          </Link>
        </div>

        {/* 首页 / 收藏夹 切换 */}
        <div className='mb-10 flex justify-center'>
          <CapsuleSwitch
            options={[
              { label: '首页', value: 'home' },
              { label: '收藏夹', value: 'favorites' },
            ]}
            active={activeTab}
            onChange={(value) => setActiveTab(value as 'home' | 'favorites')}
          />
        </div>

        {activeTab === 'favorites' ? (
          <Section
            title='我的收藏'
            action={
              favoriteItems.length > 0 && (
                <button
                  onClick={async () => {
                    await clearAllFavorites();
                    setFavoriteItems([]);
                  }}
                  className='shrink-0 text-[14px] text-ink-2 transition-colors duration-250 ease-apple hover:text-accent'
                >
                  清空
                </button>
              )
            }
          >
            <MediaGrid
              isEmpty={favoriteItems.length === 0}
              empty='还没有收藏内容，去首页逛逛吧'
            >
              {favoriteItems.map((item) => (
                <VideoCard
                  key={`${item.source}-${item.id}`}
                  query={item.search_title}
                  {...item}
                  from='favorite'
                  type={item.episodes > 1 ? 'tv' : ''}
                />
              ))}
            </MediaGrid>
          </Section>
        ) : (
          <>
            <ContinueWatching className='!mb-14' />

            {SECTIONS.map((section) => (
              <Section
                key={section.key}
                title={section.title}
                href={section.href}
              >
                <ScrollableRow>
                  {loading ? (
                    <PosterSkeletonRow count={8} />
                  ) : (
                    items[section.key].map((item, index) => (
                      <div
                        key={`${item.id}-${index}`}
                        className={ROW_CARD_WIDTH}
                      >
                        <VideoCard
                          from='douban'
                          title={item.title}
                          poster={item.poster}
                          douban_id={item.id}
                          rate={item.rate}
                          year={item.year}
                          type={section.type === 'movie' ? 'movie' : ''}
                        />
                      </div>
                    ))
                  )}
                </ScrollableRow>
              </Section>
            ))}
          </>
        )}
      </div>

      <Modal
        open={!!announcement && showAnnouncement}
        onClose={closeAnnouncement}
        title='公告'
        footer={
          <button
            onClick={closeAnnouncement}
            className='apple-btn-primary block w-full py-2.5'
          >
            我知道了
          </button>
        }
      >
        <p className='whitespace-pre-line text-[15px] leading-relaxed text-ink-2'>
          {announcement}
        </p>
      </Modal>
    </PageLayout>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeClient />
    </Suspense>
  );
}
