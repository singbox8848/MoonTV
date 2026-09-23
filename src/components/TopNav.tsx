'use client';

import { Search, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { isNavItemActive, useNavItems } from '@/lib/nav';

import OnlineBadge from './OnlineBadge';
import { useSite } from './SiteProvider';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

interface TopNavProps {
  activePath?: string;
}

/**
 * 桌面端顶栏（Apple 官网式）。
 *
 * 替代了原来的左侧可折叠 Sidebar：48px 高、毛玻璃、链接居中、
 * 搜索图标点击后就地展开为输入框。
 */
export default function TopNav({ activePath = '/' }: TopNavProps) {
  const { siteName } = useSite();
  const router = useRouter();
  const navItems = useNavItems();

  const [searchOpen, setSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // 展开后自动聚焦
  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  const closeSearch = () => {
    setSearchOpen(false);
    setKeyword('');
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = keyword.trim().replace(/\s+/g, ' ');
    if (!trimmed) return;
    closeSearch();
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const searchActive =
    activePath === '/search' || activePath.startsWith('/search?');

  return (
    <header className='fixed inset-x-0 top-0 z-[700] hidden md:block'>
      <div className='apple-glass-strong border-b border-hairline/[0.08]'>
        <div className='mx-auto flex h-nav max-w-wide items-center gap-6 px-6 lg:px-10'>
          {/* Logo */}
          <Link
            href='/'
            className='shrink-0 font-display text-[17px] font-semibold tracking-[-0.02em] text-ink transition-opacity duration-250 ease-apple hover:opacity-70'
          >
            {siteName}
          </Link>

          {/* 主导航 */}
          <nav className='flex flex-1 items-center justify-center gap-1'>
            {navItems.map((item) => {
              const active = isNavItemActive(item.href, activePath);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    'rounded-pill px-3 py-1.5 text-[13px] transition-colors duration-250 ease-apple',
                    active
                      ? 'font-medium text-ink'
                      : 'text-ink-2 hover:text-ink',
                  ].join(' ')}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* 右侧操作区 */}
          <div className='flex shrink-0 items-center gap-0.5'>
            <form onSubmit={submit} className='flex items-center' role='search'>
              <div
                className={[
                  'flex items-center overflow-hidden transition-all duration-400 ease-apple',
                  searchOpen
                    ? 'w-56 rounded-pill border border-hairline/[0.14] bg-surface pl-3 dark:border-hairline/[0.18]'
                    : 'w-9',
                ].join(' ')}
              >
                <input
                  ref={inputRef}
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onBlur={() => !keyword && closeSearch()}
                  placeholder={searchOpen ? '搜索电影、剧集…' : ''}
                  aria-label='站内搜索'
                  tabIndex={searchOpen ? 0 : -1}
                  className={[
                    'min-w-0 flex-1 bg-transparent text-[14px] text-ink placeholder:text-ink-3 focus:outline-none',
                    searchOpen ? 'py-1.5' : 'hidden',
                  ].join(' ')}
                />
                {searchOpen ? (
                  <button
                    type='button'
                    onClick={closeSearch}
                    aria-label='收起搜索'
                    className='apple-icon-btn h-8 w-8 shrink-0'
                  >
                    <X className='h-4 w-4' />
                  </button>
                ) : (
                  <button
                    type='button'
                    onClick={() => setSearchOpen(true)}
                    aria-label='展开搜索'
                    className={[
                      'apple-icon-btn h-9 w-9',
                      searchActive ? 'text-accent' : '',
                    ].join(' ')}
                  >
                    <Search className='h-[17px] w-[17px]' />
                  </button>
                )}
              </div>
            </form>

            <OnlineBadge variant='pill' />
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
