/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

export const runtime = 'edge';

import { AlertCircle, CheckCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { checkForUpdates, CURRENT_VERSION, UpdateStatus } from '@/lib/version';

import { useSite } from '@/components/SiteProvider';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/Button';

// 版本显示组件
function VersionDisplay() {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    checkForUpdates()
      .then((status) => {
        if (!cancelled) setUpdateStatus(status);
      })
      .catch(() => {
        /* 检查失败时静默处理 */
      })
      .finally(() => {
        if (!cancelled) setIsChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <button
      onClick={() =>
        window.open('https://github.com/senshinya/MoonTV', '_blank')
      }
      className='absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 text-[12px] text-ink-3 transition-colors duration-250 ease-apple hover:text-ink-2'
    >
      <span className='font-mono'>v{CURRENT_VERSION}</span>
      {!isChecking && updateStatus !== UpdateStatus.FETCH_FAILED && (
        <span
          className={[
            'flex items-center gap-1',
            updateStatus === UpdateStatus.HAS_UPDATE
              ? 'text-accent'
              : 'text-ink-3',
          ].join(' ')}
        >
          {updateStatus === UpdateStatus.HAS_UPDATE && (
            <>
              <AlertCircle className='h-3.5 w-3.5' />
              有新版本
            </>
          )}
          {updateStatus === UpdateStatus.NO_UPDATE && (
            <>
              <CheckCircle className='h-3.5 w-3.5' />
              已是最新
            </>
          )}
        </span>
      )}
    </button>
  );
}

function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { siteName } = useSite();

  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shouldAskUsername, setShouldAskUsername] = useState(false);
  const [enableRegister, setEnableRegister] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storageType = (window as any).RUNTIME_CONFIG?.STORAGE_TYPE;
    setShouldAskUsername(
      Boolean(storageType && storageType !== 'localstorage')
    );
    setEnableRegister(Boolean((window as any).RUNTIME_CONFIG?.ENABLE_REGISTER));
  }, []);

  const redirectTo = () => searchParams.get('redirect') || '/';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!password || (shouldAskUsername && !username)) return;

    try {
      setLoading(true);
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          ...(shouldAskUsername ? { username } : {}),
        }),
      });

      if (res.ok) {
        router.replace(redirectTo());
      } else if (res.status === 401) {
        setError('密码错误');
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? '服务器错误');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError(null);
    if (!password || !username) return;

    try {
      setLoading(true);
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        router.replace(redirectTo());
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? '服务器错误');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const disabled = !password || loading || (shouldAskUsername && !username);

  return (
    <div className='relative flex min-h-screen items-center justify-center bg-parchment px-5 dark:bg-canvas'>
      <div className='absolute right-4 top-4 z-10'>
        <ThemeToggle />
      </div>

      <div className='apple-card w-full max-w-[420px] p-8 sm:p-10'>
        <div className='mb-9 text-center'>
          <h1 className='font-display text-[28px] font-semibold tracking-[-0.022em] text-ink'>
            {siteName}
          </h1>
          <p className='apple-body mt-2'>
            {shouldAskUsername
              ? '登录后即可同步收藏与观看记录'
              : '请输入访问密码'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className='space-y-4'>
          {shouldAskUsername && (
            <div>
              <label htmlFor='username' className='sr-only'>
                用户名
              </label>
              <input
                id='username'
                type='text'
                autoComplete='username'
                placeholder='用户名'
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className='apple-input'
              />
            </div>
          )}

          <div>
            <label htmlFor='password' className='sr-only'>
              密码
            </label>
            <input
              id='password'
              type='password'
              autoComplete='current-password'
              placeholder='访问密码'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className='apple-input'
            />
          </div>

          {error && (
            <p className='flex items-center gap-2 rounded-apple-md bg-[#ff3b30]/10 px-3 py-2.5 text-[13px] text-[#ff3b30]'>
              <AlertCircle className='h-4 w-4 shrink-0' />
              {error}
            </p>
          )}

          {shouldAskUsername && enableRegister ? (
            <div className='flex gap-3 pt-1'>
              <Button
                variant='secondary'
                size='lg'
                block
                onClick={handleRegister}
                disabled={disabled}
              >
                {loading ? '注册中…' : '注册'}
              </Button>
              <Button type='submit' size='lg' block disabled={disabled}>
                {loading ? '登录中…' : '登录'}
              </Button>
            </div>
          ) : (
            <Button
              type='submit'
              size='lg'
              block
              disabled={disabled}
              className='!mt-6'
            >
              {loading ? '登录中…' : '登录'}
            </Button>
          )}
        </form>
      </div>

      <VersionDisplay />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={<div className='min-h-screen bg-parchment dark:bg-canvas' />}
    >
      <LoginPageClient />
    </Suspense>
  );
}
