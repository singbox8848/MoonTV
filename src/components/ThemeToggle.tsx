/* eslint-disable @typescript-eslint/no-explicit-any,react-hooks/exhaustive-deps */

'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

/** 顶栏在浅/深色下的实际底色，供 iOS/Android 地址栏取色 */
const THEME_COLOR = { dark: '#161617', light: '#fbfbfd' };

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();

  const applyThemeColor = (theme?: string) => {
    const content = theme === 'dark' ? THEME_COLOR.dark : THEME_COLOR.light;
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
  };

  useEffect(() => {
    setMounted(true);
    applyThemeColor(resolvedTheme);
  }, []);

  // 渲染占位以保持顶栏布局稳定，避免水合前后跳动
  if (!mounted) return <div className='h-9 w-9' />;

  const isDark = resolvedTheme === 'dark';

  const toggleTheme = () => {
    const targetTheme = isDark ? 'light' : 'dark';
    applyThemeColor(targetTheme);

    const startViewTransition = (document as any).startViewTransition;
    if (typeof startViewTransition !== 'function') {
      setTheme(targetTheme);
      return;
    }

    startViewTransition.call(document, () => setTheme(targetTheme));
  };

  return (
    <button
      onClick={toggleTheme}
      className='apple-icon-btn'
      aria-label={isDark ? '切换到浅色外观' : '切换到深色外观'}
      title={isDark ? '浅色外观' : '深色外观'}
    >
      {isDark ? (
        <Sun className='h-[17px] w-[17px]' />
      ) : (
        <Moon className='h-[17px] w-[17px]' />
      )}
    </button>
  );
}
