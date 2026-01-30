import { NextResponse } from 'next/server';

import { getCacheTime } from '@/lib/config';
import { DoubanItem, DoubanResult } from '@/lib/types';

export const runtime = 'edge';

const TIMEOUT_MS = 10000;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';
const DOUBAN_REFERER = 'https://movie.douban.com/';
// Naver 图片代理前缀
const IMAGE_PROXY_PREFIX = 'https://search.pstatic.net/common?src=';

interface DoubanApiResponse {
  subjects: Array<{
    id: string;
    title: string;
    cover: string;
    rate: string;
  }>;
}

function fixDoubanImage(url: string): string {
  if (!url) return '';
  if (!url.includes('doubanio.com')) return url;
  return `${IMAGE_PROXY_PREFIX}${url}`;
}

// ✅ 修复点 1：去掉了 isJson 后面的 ": boolean" 类型注解
async function fetchUrl(url: string, isJson = true) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const fetchOptions = {
    signal: controller.signal,
    headers: {
      'User-Agent': USER_AGENT,
      Referer: DOUBAN_REFERER,
      Accept: isJson
        ? 'application/json, text/plain, */*'
        : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    },
  };

  try {
    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      throw new Error(
        `Douban API Error: ${response.status} ${response.statusText}`
      );
    }
    return isJson ? await response.json() : await response.text();
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw new Error('Douban Request Timeout');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function createResponse(list: DoubanItem[]) {
  const response: DoubanResult = {
    code: 200,
    message: '获取成功',
    list: list,
  };

  const cacheTime = await getCacheTime();

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
      'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
      'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
    },
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const type = searchParams.get('type');
  const tag = searchParams.get('tag');

  const pageSizeStr = searchParams.get('pageSize');
  const pageStartStr = searchParams.get('pageStart');

  const pageSize = pageSizeStr
    ? Math.min(Math.max(parseInt(pageSizeStr), 1), 100)
    : 16;
  const pageStart = pageStartStr ? Math.max(parseInt(pageStartStr), 0) : 0;

  if (!type || !tag) {
    return NextResponse.json(
      { error: 'Missing parameters: type or tag' },
      { status: 400 }
    );
  }

  if (!['tv', 'movie'].includes(type)) {
    return NextResponse.json(
      { error: 'Invalid type: must be tv or movie' },
      { status: 400 }
    );
  }

  try {
    if (tag === 'top250') {
      return await handleTop250(pageStart);
    } else {
      return await handleSearchSubjects(type, tag, pageSize, pageStart);
    }
  } catch (error) {
    // ✅ 修复点 2：添加忽略规则，允许在这里打印错误日志
    // eslint-disable-next-line no-console
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data', details: (error as Error).message },
      { status: 500 }
    );
  }
}

async function handleSearchSubjects(
  type: string,
  tag: string,
  pageSize: number,
  pageStart: number
) {
  const target = `https://movie.douban.com/j/search_subjects?type=${type}&tag=${encodeURIComponent(
    tag
  )}&sort=recommend&page_limit=${pageSize}&page_start=${pageStart}`;

  const data = (await fetchUrl(target, true)) as DoubanApiResponse;

  const list: DoubanItem[] = data.subjects.map((item) => ({
    id: item.id,
    title: item.title,
    poster: fixDoubanImage(item.cover),
    rate: item.rate,
    year: '',
  }));

  return createResponse(list);
}

async function handleTop250(pageStart: number) {
  const target = `https://movie.douban.
