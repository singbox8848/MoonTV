'use client';

import { type LucideIcon, Clover, Film, Home, Star, Tv } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface NavItem {
  icon: LucideIcon;
  label: string;
  href: string;
  /** 豆瓣筛选类型，用于判断激活态；首页/搜索为空 */
  filterType?: string;
}

const BASE_ITEMS: NavItem[] = [
  { icon: Home, label: '首页', href: '/' },
  {
    icon: Film,
    label: '电影',
    href: '/douban?type=movie',
    filterType: 'movie',
  },
  { icon: Tv, label: '剧集', href: '/douban?type=tv', filterType: 'tv' },
  {
    icon: Clover,
    label: '综艺',
    href: '/douban?type=show',
    filterType: 'show',
  },
];

const CUSTOM_ITEM: NavItem = {
  icon: Star,
  label: '自定义',
  href: '/douban?type=custom',
  filterType: 'custom',
};

/**
 * 导航项。原先 Sidebar 与 MobileBottomNav 各自复制了一份菜单定义和
 * 激活态判断逻辑，这里统一到一处，并补上「自定义」分类的运行时探测。
 */
export function useNavItems(): NavItem[] {
  const [items, setItems] = useState<NavItem[]>(BASE_ITEMS);

  useEffect(() => {
    const runtimeConfig = (
      window as unknown as {
        RUNTIME_CONFIG?: { CUSTOM_CATEGORIES?: unknown[] };
      }
    ).RUNTIME_CONFIG;

    if (runtimeConfig?.CUSTOM_CATEGORIES?.length) {
      setItems([...BASE_ITEMS, CUSTOM_ITEM]);
    }
  }, []);

  return items;
}

/** 搜索是独立入口，桌面端顶栏需要单独列出 */
export const SEARCH_HREF = '/search';

/**
 * 判断某个导航项是否处于激活态。
 * 传入的 activePath 可能是 `/douban?type=tv` 这种带 query 的形式。
 */
export function isNavItemActive(href: string, activePath: string): boolean {
  if (!activePath) return false;

  let decodedActive = activePath;
  let decodedHref = href;
  try {
    decodedActive = decodeURIComponent(activePath);
    decodedHref = decodeURIComponent(href);
  } catch {
    // 非法编码时退回原值比较，不抛错
  }

  if (decodedHref === '/') return decodedActive === '/';
  if (decodedActive === decodedHref) return true;

  const filterType = decodedHref.match(/type=([^&]+)/)?.[1];
  if (!filterType) return false;

  // 仅当路径也指向 /douban 且 type 一致时才算激活
  return (
    decodedActive.startsWith('/douban') &&
    new RegExp(`[?&]type=${filterType}(&|$)`).test(decodedActive)
  );
}
