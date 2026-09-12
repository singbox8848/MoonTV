/* eslint-disable @typescript-eslint/no-explicit-any, no-console */

import { CheckCircle2, Heart, Info, Play } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  deleteFavorite,
  deletePlayRecord,
  generateStorageKey,
  isFavorited,
  saveFavorite,
  subscribeToDataUpdates,
} from '@/lib/db.client';
import { SearchResult } from '@/lib/types';
import { processImageUrl } from '@/lib/utils';

interface VideoCardProps {
  id?: string;
  source?: string;
  title?: string;
  query?: string;
  poster?: string;
  episodes?: number;
  source_name?: string;
  progress?: number;
  year?: string;
  from: 'playrecord' | 'favorite' | 'search' | 'douban';
  currentEpisode?: number;
  douban_id?: string;
  onDelete?: () => void;
  rate?: string;
  items?: SearchResult[];
  type?: string;
}

/** 从一组搜索结果里取众数 */
function mostFrequent<T extends string | number>(map: Map<T, number>) {
  let max = 0;
  let result: T | undefined;
  map.forEach((count, key) => {
    if (count > max) {
      max = count;
      result = key;
    }
  });
  return result;
}

/**
 * 影视卡片。
 *
 * 视觉语言对齐 Apple TV 的卡片：海报满幅、12/18px 圆角、悬停轻微放大，
 * 标题左对齐、标注使用低对比度的胶囊标签，操作按钮为毛玻璃圆钮。
 */
export default function VideoCard({
  id,
  title = '',
  query = '',
  poster = '',
  episodes,
  source,
  source_name,
  progress = 0,
  year,
  from,
  currentEpisode,
  douban_id,
  onDelete,
  rate,
  items,
  type = '',
}: VideoCardProps) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(false);
  const [imgReady, setImgReady] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const isAggregate = from === 'search' && !!items?.length;

  const aggregateData = useMemo(() => {
    if (!isAggregate || !items) return null;

    const doubanCountMap = new Map<string | number, number>();
    const episodeCountMap = new Map<number, number>();

    items.forEach((item) => {
      if (item.douban_id && item.douban_id !== 0) {
        doubanCountMap.set(
          item.douban_id,
          (doubanCountMap.get(item.douban_id) || 0) + 1
        );
      }
      const len = item.episodes?.length || 0;
      if (len > 0) {
        episodeCountMap.set(len, (episodeCountMap.get(len) || 0) + 1);
      }
    });

    return {
      first: items[0],
      mostFrequentDoubanId: mostFrequent(doubanCountMap),
      mostFrequentEpisodes: mostFrequent(episodeCountMap) || 0,
    };
  }, [isAggregate, items]);

  const actualTitle = aggregateData?.first.title ?? title;
  const actualPoster = aggregateData?.first.poster ?? poster;
  const actualSource = aggregateData?.first.source ?? source;
  const actualId = aggregateData?.first.id ?? id;
  const actualDoubanId = String(
    aggregateData?.mostFrequentDoubanId ?? douban_id ?? ''
  );
  const actualEpisodes = aggregateData?.mostFrequentEpisodes ?? episodes;
  const actualYear = aggregateData?.first.year ?? year;
  const actualQuery = query || '';
  const actualSearchType = isAggregate
    ? aggregateData?.first.episodes?.length === 1
      ? 'movie'
      : 'tv'
    : type;

  const canFavorite = from !== 'douban' && !!actualSource && !!actualId;

  // 命中浏览器缓存时 load 事件早已触发，onLoad 不会再回调，
  // 图片会永远停在 opacity-0 只留骨架屏。挂载后主动核对一次真实状态。
  useLayoutEffect(() => {
    setImgReady(false);
    setImgFailed(false);
    const el = imgRef.current;
    if (el && el.complete) {
      if (el.naturalWidth > 0) setImgReady(true);
      else setImgFailed(true);
    }
  }, [actualPoster]);

  // 收藏状态 + 订阅收藏变动
  useEffect(() => {
    if (!canFavorite || !actualSource || !actualId) return;

    let cancelled = false;

    isFavorited(actualSource, actualId)
      .then((fav) => {
        if (!cancelled) setFavorited(fav);
      })
      .catch((err) => console.warn('检查收藏状态失败:', err));

    // 监听收藏状态更新事件
    const storageKey = generateStorageKey(actualSource, actualId);
    const unsubscribe = subscribeToDataUpdates(
      'favoritesUpdated',
      (newFavorites: Record<string, any>) => {
        setFavorited(!!newFavorites[storageKey]);
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [canFavorite, actualSource, actualId]);

  const handleToggleFavorite = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!canFavorite || !actualSource || !actualId) return;

      try {
        if (favorited) {
          await deleteFavorite(actualSource, actualId);
          setFavorited(false);
        } else {
          await saveFavorite(actualSource, actualId, {
            title: actualTitle,
            source_name: source_name || '',
            year: actualYear || '',
            cover: actualPoster,
            total_episodes: actualEpisodes ?? 1,
            save_time: Date.now(),
          });
          setFavorited(true);
        }
      } catch (err) {
        // 原实现在 async 回调里 throw，会产生未捕获的 Promise 异常
        console.warn('切换收藏状态失败:', err);
      }
    },
    [
      canFavorite,
      actualSource,
      actualId,
      actualTitle,
      source_name,
      actualYear,
      actualPoster,
      actualEpisodes,
      favorited,
    ]
  );

  const handleDeleteRecord = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (from !== 'playrecord' || !actualSource || !actualId) return;

      try {
        await deletePlayRecord(actualSource, actualId);
        onDelete?.();
      } catch (err) {
        console.warn('删除播放记录失败:', err);
      }
    },
    [from, actualSource, actualId, onDelete]
  );

  const handleClick = useCallback(() => {
    if (from === 'douban') {
      router.push(
        `/play?title=${encodeURIComponent(actualTitle.trim())}${
          actualYear ? `&year=${actualYear}` : ''
        }${actualSearchType ? `&stype=${actualSearchType}` : ''}`
      );
      return;
    }

    if (actualSource && actualId) {
      router.push(
        `/play?source=${actualSource}&id=${actualId}&title=${encodeURIComponent(
          actualTitle
        )}${actualYear ? `&year=${actualYear}` : ''}${
          isAggregate ? '&prefer=true' : ''
        }${
          actualQuery ? `&stitle=${encodeURIComponent(actualQuery.trim())}` : ''
        }${actualSearchType ? `&stype=${actualSearchType}` : ''}`
      );
    }
  }, [
    from,
    actualSource,
    actualId,
    router,
    actualTitle,
    actualYear,
    isAggregate,
    actualQuery,
    actualSearchType,
  ]);

  const config = useMemo(
    () =>
      ((
        {
          playrecord: { heart: true, check: true },
          favorite: { heart: true, check: false },
          search: { heart: !isAggregate, check: false },
          douban: { heart: false, check: false },
        } as const
      )[from] ?? { heart: true, check: false }),
    [from, isAggregate]
  );

  const showRating = from === 'douban' && !!rate;
  const showEpisodeBadge = !!actualEpisodes && actualEpisodes > 1;
  // 豆瓣入口：与原有行为一致，仅搜索结果与豆瓣推荐页展示
  const showDoubanLink = from === 'douban' || from === 'search';
  // 空 src 会让 next/image 直接抛错，无海报时只渲染占位底
  const posterSrc = processImageUrl(actualPoster);

  return (
    <div
      role='link'
      tabIndex={0}
      aria-label={actualTitle}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      className='group/card relative w-full cursor-pointer rounded-apple-lg transition-transform duration-400 ease-apple-out focus-visible:outline-none hover:z-20 hover:scale-[1.03] active:scale-[0.99]'
    >
      {/* 海报 */}
      <div className='relative aspect-[2/3] overflow-hidden rounded-apple-lg bg-surface-2 shadow-apple-card transition-shadow duration-400 ease-apple group-hover/card:shadow-apple-card-hover'>
        {/* 加载中：闪烁骨架；加载失败：换成静态底，避免 60 张卡片同时跑无限动画 */}
        {!imgReady && (
          <div
            className={
              imgFailed || !posterSrc
                ? 'absolute inset-0 bg-surface-2'
                : 'apple-skeleton absolute inset-0'
            }
            aria-hidden='true'
          />
        )}

        {posterSrc && (
          <Image
            ref={imgRef}
            src={posterSrc}
            alt={actualTitle}
            fill
            sizes='(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 180px'
            className={[
              'object-cover transition-all duration-600 ease-apple',
              imgReady ? 'scale-100 opacity-100' : 'scale-105 opacity-0',
            ].join(' ')}
            referrerPolicy='no-referrer'
            onLoad={() => setImgReady(true)}
            onError={() => setImgFailed(true)}
          />
        )}

        {/* 悬停时的柔和暗角，让按钮可读 */}
        <div className='pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent opacity-0 transition-opacity duration-400 ease-apple group-hover/card:opacity-100' />

        {/* 播放按钮 */}
        <div className='pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-400 ease-apple-out group-hover/card:opacity-100'>
          <span className='flex h-12 w-12 translate-y-2 items-center justify-center rounded-full bg-white/25 backdrop-blur-md ring-1 ring-white/40 transition-transform duration-400 ease-apple-out group-hover/card:translate-y-0'>
            <Play className='ml-0.5 h-5 w-5 fill-white text-white' />
          </span>
        </div>

        {/* 右下角操作 */}
        {(config.heart || config.check) && (
          <div className='absolute bottom-3 right-3 flex gap-1.5 opacity-0 transition-all duration-400 ease-apple-out group-hover/card:opacity-100'>
            {config.check && (
              <CardIconButton label='删除播放记录' onClick={handleDeleteRecord}>
                <CheckCircle2 className='h-[15px] w-[15px]' />
              </CardIconButton>
            )}
            {config.heart && (
              <CardIconButton
                label={favorited ? '取消收藏' : '加入收藏'}
                onClick={handleToggleFavorite}
              >
                <Heart
                  className={[
                    'h-[15px] w-[15px] transition-colors',
                    favorited ? 'fill-[#ff375f] text-[#ff375f]' : '',
                  ].join(' ')}
                />
              </CardIconButton>
            )}
          </div>
        )}

        {/* 左上角评分 */}
        {showRating && (
          <span className='absolute left-3 top-3 rounded-pill bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-[#ffd60a] backdrop-blur-md'>
            {rate}
          </span>
        )}

        {/* 左下角集数 */}
        {showEpisodeBadge && (
          <span className='absolute bottom-3 left-3 rounded-pill bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-md'>
            {currentEpisode
              ? `第 ${currentEpisode} / ${actualEpisodes} 集`
              : `全 ${actualEpisodes} 集`}
          </span>
        )}

        {/* 右上角豆瓣入口 */}
        {showDoubanLink && actualDoubanId && (
          <a
            href={`https://movie.douban.com/subject/${actualDoubanId}`}
            target='_blank'
            rel='noopener noreferrer'
            onClick={(e) => e.stopPropagation()}
            aria-label='在豆瓣查看'
            title='在豆瓣查看'
            className='absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur-md transition-all duration-250 ease-apple hover:bg-black/75 group-hover/card:opacity-100'
          >
            <Info className='h-[14px] w-[14px]' />
          </a>
        )}
      </div>

      {/* 观看进度 */}
      {from === 'playrecord' && progress > 0 && (
        <div className='mt-2 h-[3px] w-full overflow-hidden rounded-pill bg-hairline/[0.12]'>
          <div
            className='h-full rounded-pill bg-accent transition-[width] duration-600 ease-apple-out'
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}

      {/* 标题与来源 */}
      <div className='mt-2.5 px-0.5'>
        <p
          title={actualTitle}
          className='truncate text-[13px] font-medium leading-snug text-ink transition-colors duration-250 ease-apple group-hover/card:text-accent'
        >
          {actualTitle}
        </p>
        <p className='mt-0.5 truncate text-[11px] leading-tight text-ink-3'>
          {[source_name, actualYear].filter(Boolean).join(' · ')}
        </p>
      </div>
    </div>
  );
}

function CardIconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type='button'
      aria-label={label}
      title={label}
      onClick={onClick}
      className='pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md transition-all duration-250 ease-apple hover:scale-110 hover:bg-black/65'
    >
      {children}
    </button>
  );
}
