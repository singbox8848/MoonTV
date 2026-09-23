'use client';

import { type LucideIcon, Clover, Film, Home, Tv } from 'lucide-react';

import { CATEGORIES } from './categories';

export interface NavItem {
  icon: LucideIcon;
  label: string;
  href: string;
  /** 豆瓣筛选类型，用于判断激活态；首页/搜索为空 */
  filterType?: string;
}

/** 注册表里的分类 key → 图标。放在这里而不是 categories.ts，避免 lib 依赖图标库。 */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  movie: Film,
  tv: Tv,
  show: Clover,
};

/**
 * 导航项。
 *
 * 直接由 `lib/categories.ts` 的分类注册表推导 —— 新增一个分类只需要在那里
 * 加一条定义，顶栏与移动端底栏都会自动出现。
 *
 * 注：原先这里还有一段「运行时探测 CUSTOM_CATEGORIES 以追加『自定义』入口」
 * 的逻辑。该入口在浏览页并没有对应的取数分支（`kind` 会被拼成 `custom`，
 * 豆瓣接口直接返回 400），点进去必然是空列表，因此随本次重构一并移除；
 * 若日后站长配置了自定义分类，应先在注册表里补一个真正的 CategoryDef。
 */
export const BASE_ITEMS: NavItem[] = [
  { icon: Home, label: '首页', href: '/' },
  ...CATEGORIES.map<NavItem>((category) => ({
    icon: CATEGORY_ICONS[category.key] ?? Film,
    label: category.label,
    href: `/douban?type=${category.key}`,
    filterType: category.key,
  })),
];

export function useNavItems(): NavItem[] {
  return BASE_ITEMS;
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

  // 仅当路径也指向 /douban 且 type 一致时才算激活（允许后面跟其他筛选参数）
  return (
    decodedActive.startsWith('/douban') &&
    new RegExp(`[?&]type=${filterType}(&|$)`).test(decodedActive)
  );
}
