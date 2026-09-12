'use client';

import { Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { isNavItemActive, SEARCH_HREF, useNavItems } from '@/lib/nav';

interface MobileBottomNavProps {
  /**
   * 主动指定当前激活的路径。当未提供时，自动使用 usePathname() 获取的路径。
   */
  activePath?: string;
}

/**
 * 移动端底部标签栏：毛玻璃、均分宽度、激活项使用强调色。
 * 首页与搜索固定在前两位，其余投屏分类由 useNavItems 提供。
 */
const MobileBottomNav = ({ activePath }: MobileBottomNavProps) => {
  const pathname = usePathname();
  const currentActive = activePath ?? pathname;
  const navItems = useNavItems();

  // 首页 / 搜索 为固定入口，其余为内容分类
  const items = [
    navItems[0],
    { icon: Search, label: '搜索', href: SEARCH_HREF, filterType: undefined },
    ...navItems.slice(1),
  ].filter(Boolean);

  // 项目多于 5 个时（启用自定义分类）退化为可横向滚动
  const scrollable = items.length > 5;

  return (
    <nav
      className='apple-glass-strong fixed inset-x-0 bottom-0 z-[600] border-t border-hairline/[0.08] md:hidden'
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <ul
        className={[
          'flex items-stretch',
          scrollable ? 'overflow-x-auto scrollbar-hide' : '',
        ].join(' ')}
      >
        {items.map((item) => {
          const active =
            item.href === SEARCH_HREF
              ? currentActive.startsWith('/search')
              : isNavItemActive(item.href, currentActive);

          return (
            <li
              key={item.href}
              className='flex-1 shrink-0'
              style={scrollable ? { minWidth: '20vw' } : undefined}
            >
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className='flex h-[52px] flex-col items-center justify-center gap-1 transition-colors duration-250 ease-apple'
              >
                <item.icon
                  className={[
                    'h-[22px] w-[22px] transition-colors duration-250 ease-apple',
                    active ? 'text-accent' : 'text-ink-2',
                  ].join(' ')}
                />
                <span
                  className={[
                    'text-[10px] leading-none tracking-tight transition-colors duration-250 ease-apple',
                    active ? 'font-medium text-accent' : 'text-ink-2',
                  ].join(' ')}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default MobileBottomNav;
