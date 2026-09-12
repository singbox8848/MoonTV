import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

/**
 * Apple 风格设计系统
 *
 * 颜色全部走 CSS 变量（`globals.css` 中定义），因此浅/深色主题无需在每个
 * 元素上写 `dark:` 前缀，变量会自动切换。变量以 `R G B` 三元组保存，
 * 配合 `rgb(var(--x) / <alpha-value>)` 让 `bg-canvas/80` 这类透明度写法可用。
 */
const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        'mobile-landscape': {
          raw: '(orientation: landscape) and (max-height: 700px)',
        },
      },

      /**
       * 字体栈与 Apple 官网一致：有 SF Pro 的设备直接走系统字体，
       * 其余设备回退到 next/font 自托管的 Inter（--font-inter）+ 中文黑体。
       */
      fontFamily: {
        sans: [
          'SF Pro Text',
          'SF Pro Display',
          '-apple-system',
          'BlinkMacSystemFont',
          'var(--font-inter, Inter)',
          'Helvetica Neue',
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'sans-serif',
        ],
        display: [
          'SF Pro Display',
          '-apple-system',
          'BlinkMacSystemFont',
          'var(--font-inter, Inter)',
          'Helvetica Neue',
          'PingFang SC',
          'Microsoft YaHei',
          'sans-serif',
        ],
        primary: ['Inter', ...defaultTheme.fontFamily.sans],
      },

      colors: {
        // —— Apple 中性色 ——
        canvas: 'rgb(var(--c-canvas) / <alpha-value>)', // 页面底色
        parchment: 'rgb(var(--c-parchment) / <alpha-value>)', // 次级区块底色
        surface: 'rgb(var(--c-surface) / <alpha-value>)', // 卡片 / 弹层
        'surface-2': 'rgb(var(--c-surface-2) / <alpha-value>)', // 内嵌控件
        ink: 'rgb(var(--c-ink) / <alpha-value>)', // 主文字
        'ink-2': 'rgb(var(--c-ink-2) / <alpha-value>)', // 次级文字
        'ink-3': 'rgb(var(--c-ink-3) / <alpha-value>)', // 三级 / 占位
        // 注意：浅色下为黑、深色下为白，配合 /10 这类透明度使用
        hairline: 'rgb(var(--c-hairline) / <alpha-value>)',

        // —— 强调色（Apple 蓝）——
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        'accent-hover': 'rgb(var(--c-accent-hover) / <alpha-value>)',

        // —— 兼容旧类名，映射到新 token，避免大规模改类名 ——
        dark: 'rgb(var(--c-ink) / <alpha-value>)',
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#0071e3',
          600: '#0071e3',
          700: '#0062c4',
          800: '#00509f',
          900: '#003f7d',
        },
      },

      borderRadius: {
        'apple-sm': '8px',
        'apple-md': '12px',
        'apple-lg': '18px',
        'apple-xl': '28px',
        'apple-2xl': '36px',
        pill: '980px',
      },

      boxShadow: {
        // Apple 的阴影极克制：大范围、低透明度、多层叠加
        'apple-xs': '0 1px 2px rgba(0, 0, 0, 0.04)',
        'apple-card':
          '0 4px 14px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)',
        'apple-card-hover':
          '0 12px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)',
        'apple-float':
          '0 20px 60px rgba(0, 0, 0, 0.16), 0 4px 16px rgba(0, 0, 0, 0.08)',
        'apple-focus': '0 0 0 4px rgba(0, 113, 227, 0.28)',
      },

      transitionTimingFunction: {
        // Apple 的标准曲线（material 风格）与"出场"曲线
        apple: 'cubic-bezier(0.4, 0, 0.2, 1)',
        'apple-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },

      transitionDuration: {
        250: '250ms',
        400: '400ms',
        600: '600ms',
      },

      spacing: {
        nav: '48px', // 顶栏高度
        'nav-lg': '52px',
      },

      maxWidth: {
        content: '1120px', // Apple 正文容器
        wide: '1440px',
        prose: '692px',
      },

      keyframes: {
        flicker: {
          '0%, 19.999%, 22%, 62.999%, 64%, 64.999%, 70%, 100%': {
            opacity: '0.99',
            filter:
              'drop-shadow(0 0 1px rgba(252, 211, 77)) drop-shadow(0 0 15px rgba(245, 158, 11)) drop-shadow(0 0 1px rgba(252, 211, 77))',
          },
          '20%, 21.999%, 63%, 63.999%, 65%, 69.999%': {
            opacity: '0.4',
            filter: 'none',
          },
        },
        shimmer: {
          '0%': { backgroundPosition: '-700px 0' },
          '100%': { backgroundPosition: '700px 0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        // Apple 官网滚动入场：轻微上浮 + 淡入，无回弹
        appleRise: {
          '0%': { transform: 'translateY(24px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        appleScaleIn: {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        appleSheetUp: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },

      animation: {
        flicker: 'flicker 3s linear infinite',
        shimmer: 'shimmer 1.3s linear infinite',
        'fade-in': 'fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-down': 'slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'apple-rise': 'appleRise 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'apple-scale-in':
          'appleScaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'apple-sheet-up':
          'appleSheetUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
      },

      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
} satisfies Config;

export default config;
