'use client';

import Link from 'next/link';

import { BackButton } from './BackButton';
import { useSite } from './SiteProvider';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

interface MobileHeaderProps {
  showBackButton?: boolean;
}

/**
 * 移动端顶栏：48px、毛玻璃、Logo 居中、动作区靠右。
 */
const MobileHeader = ({ showBackButton = false }: MobileHeaderProps) => {
  const { siteName } = useSite();

  return (
    <header
      className='apple-glass-strong fixed inset-x-0 top-0 z-[700] border-b border-hairline/[0.08] md:hidden'
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className='relative flex h-nav items-center justify-between px-3'>
        <div className='flex min-w-[68px] items-center'>
          {showBackButton && <BackButton />}
        </div>

        {/* Logo 绝对居中，与两侧元素解耦 */}
        <Link
          href='/'
          className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-display text-[17px] font-semibold tracking-[-0.02em] text-ink transition-opacity duration-250 ease-apple active:opacity-60'
        >
          {siteName}
        </Link>

        <div className='flex min-w-[68px] items-center justify-end gap-0.5'>
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
};

export default MobileHeader;
