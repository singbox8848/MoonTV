import MobileBottomNav from './MobileBottomNav';
import MobileHeader from './MobileHeader';
import TopNav from './TopNav';

interface PageLayoutProps {
  children: React.ReactNode;
  activePath?: string;
}

/**
 * 全站骨架。
 *
 * 桌面端为顶部固定导航（Apple 官网式），移动端为顶部毛玻璃栏 + 底部标签栏，
 * 中间内容区在两种形态下都留出导航高度的安全间距。
 */
const PageLayout = ({ children, activePath = '/' }: PageLayoutProps) => {
  return (
    <div className='flex min-h-screen w-full flex-col bg-parchment dark:bg-canvas'>
      {/* 桌面端顶栏 */}
      <TopNav activePath={activePath} />

      {/* 移动端顶栏 */}
      <MobileHeader />

      {/* 内容区：上方让出固定顶栏高度，下方让出移动端标签栏高度 */}
      <main
        className='w-full flex-1'
        style={{
          paddingTop: 'calc(3rem + env(safe-area-inset-top))',
          paddingBottom: 'calc(3.25rem + env(safe-area-inset-bottom))',
        }}
      >
        {children}
      </main>

      {/* 移动端底部标签栏 */}
      <MobileBottomNav activePath={activePath} />
    </div>
  );
};

export default PageLayout;
