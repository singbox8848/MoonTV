import { ChevronLeft } from 'lucide-react';

/**
 * 返回按钮。使用细笔画 Chevron，与顶栏其他图标保持同一视觉重量。
 */
export function BackButton() {
  return (
    <button
      onClick={() => window.history.back()}
      className='apple-icon-btn'
      aria-label='返回'
      title='返回'
    >
      <ChevronLeft className='h-5 w-5' />
    </button>
  );
}

export default BackButton;
