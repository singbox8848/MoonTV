export const runtime = 'edge';

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '安全警告 - MoonTV',
  description: '站点安全配置警告',
};

const RISKS = [
  '未经授权的访问可能导致内容被恶意传播',
  '服务器资源可能被滥用，影响正常服务',
  '可能收到相关权利方的法律通知',
  '服务提供商可能因合规问题终止服务',
];

export default function WarningPage() {
  return (
    <div className='flex min-h-screen items-center justify-center bg-parchment px-4 py-12 dark:bg-canvas'>
      <div className='apple-card w-full max-w-2xl overflow-hidden p-8 sm:p-10'>
        {/* 顶部图标与标题 */}
        <div className='mb-8 text-center'>
          <div className='mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-apple-xl bg-[#ff3b30]/10'>
            <svg
              className='h-7 w-7 text-[#ff3b30]'
              fill='none'
              stroke='currentColor'
              strokeWidth={1.8}
              viewBox='0 0 24 24'
              aria-hidden='true'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M12 9v4m0 3.5h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z'
              />
            </svg>
          </div>

          <h1 className='font-display text-[26px] font-semibold tracking-[-0.022em] text-ink sm:text-[30px]'>
            安全合规配置警告
          </h1>
          <p className='apple-body mx-auto mt-3 max-w-md'>
            检测到站点尚未配置访问控制，存在安全风险与合规隐患
          </p>
        </div>

        {/* 风险列表 */}
        <section className='mb-8'>
          <h2 className='mb-3 text-[15px] font-semibold text-ink'>主要风险</h2>
          <ul className='space-y-2.5'>
            {RISKS.map((risk) => (
              <li key={risk} className='flex items-start gap-3'>
                <span className='mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff3b30]' />
                <span className='text-[14px] leading-relaxed text-ink-2'>
                  {risk}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* 建议 */}
        <section className='rounded-apple-lg bg-surface-2 p-5'>
          <h3 className='mb-2 flex items-center gap-2 text-[15px] font-semibold text-ink'>
            <span className='text-[#ff9f0a]'>🔒</span>
            安全配置建议
          </h3>
          <p className='text-[14px] leading-relaxed text-ink-2'>
            请立即配置{' '}
            <code className='rounded-apple-sm bg-hairline/[0.08] px-1.5 py-0.5 font-mono text-[13px] text-ink'>
              PASSWORD
            </code>{' '}
            环境变量以启用访问控制。
          </p>
        </section>

        <p className='mt-8 border-t border-hairline/[0.08] pt-5 text-center text-[12px] text-ink-3'>
          为确保系统安全性与合规性，请及时完成安全配置
        </p>
      </div>
    </div>
  );
}
