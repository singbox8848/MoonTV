/* eslint-disable no-console */
'use client';

import { useEffect, useState } from 'react';

import type { PlayRecord } from '@/lib/db.client';
import {
  clearAllPlayRecords,
  getAllPlayRecords,
  subscribeToDataUpdates,
} from '@/lib/db.client';

import ScrollableRow from '@/components/ScrollableRow';
import Section from '@/components/Section';
import { PosterSkeletonRow } from '@/components/ui/Skeleton';
import VideoCard from '@/components/VideoCard';

interface ContinueWatchingProps {
  className?: string;
}

const CARD_WIDTH = 'w-28 shrink-0 sm:w-40';

function getProgress(record: PlayRecord) {
  if (!record.total_time) return 0;
  return (record.play_time / record.total_time) * 100;
}

export default function ContinueWatching({ className }: ContinueWatchingProps) {
  const [playRecords, setPlayRecords] = useState<
    (PlayRecord & { key: string })[]
  >([]);
  const [loading, setLoading] = useState(true);

  const updatePlayRecords = (allRecords: Record<string, PlayRecord>) => {
    const sorted = Object.entries(allRecords)
      .map(([key, record]) => ({ ...record, key }))
      .sort((a, b) => b.save_time - a.save_time);
    setPlayRecords(sorted);
  };

  useEffect(() => {
    let cancelled = false;

    getAllPlayRecords()
      .then((allRecords) => {
        if (!cancelled) updatePlayRecords(allRecords);
      })
      .catch((error) => {
        console.error('获取播放记录失败:', error);
        if (!cancelled) setPlayRecords([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const unsubscribe = subscribeToDataUpdates(
      'playRecordsUpdated',
      (newRecords: Record<string, PlayRecord>) => {
        updatePlayRecords(newRecords);
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  // 无播放记录时不占位
  if (!loading && playRecords.length === 0) return null;

  return (
    <Section
      title='继续观看'
      className={className}
      action={
        !loading &&
        playRecords.length > 0 && (
          <button
            onClick={async () => {
              await clearAllPlayRecords();
              setPlayRecords([]);
            }}
            className='shrink-0 text-[14px] text-ink-2 transition-colors duration-250 ease-apple hover:text-accent'
          >
            清空
          </button>
        )
      }
    >
      <ScrollableRow>
        {loading ? (
          <PosterSkeletonRow count={6} />
        ) : (
          playRecords.map((record) => {
            const [source, id] = record.key.split('+');
            return (
              <div key={record.key} className={CARD_WIDTH}>
                <VideoCard
                  id={id}
                  title={record.title}
                  poster={record.cover}
                  year={record.year}
                  source={source}
                  source_name={record.source_name}
                  progress={getProgress(record)}
                  episodes={record.total_episodes}
                  currentEpisode={record.index}
                  query={record.search_title}
                  from='playrecord'
                  onDelete={() =>
                    setPlayRecords((prev) =>
                      prev.filter((r) => r.key !== record.key)
                    )
                  }
                  type={record.total_episodes > 1 ? 'tv' : ''}
                />
              </div>
            );
          })
        )}
      </ScrollableRow>
    </Section>
  );
}
