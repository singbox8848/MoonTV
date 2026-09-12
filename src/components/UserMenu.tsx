/* eslint-disable @typescript-eslint/no-explicit-any, no-console */

'use client';

import { KeyRound, LogOut, Settings, Shield, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { getAuthInfoFromBrowserCookie } from '@/lib/auth';
import { checkForUpdates, CURRENT_VERSION, UpdateStatus } from '@/lib/version';

import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { Switch } from './ui/Switch';

interface AuthInfo {
  username?: string;
  role?: 'owner' | 'admin' | 'user';
}

const ROLE_LABEL: Record<string, string> = {
  owner: '站长',
  admin: '管理员',
  user: '用户',
};

/** 本地设置项 */
interface LocalSettings {
  defaultAggregateSearch: boolean;
  doubanProxyUrl: string;
  imageProxyUrl: string;
  enableOptimization: boolean;
  enableImageProxy: boolean;
  enableDoubanProxy: boolean;
}

export const UserMenu: React.FC = () => {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const [authInfo, setAuthInfo] = useState<AuthInfo | null>(null);
  const [storageType, setStorageType] = useState('localstorage');
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  const [settings, setSettings] = useState<LocalSettings>({
    defaultAggregateSearch: true,
    doubanProxyUrl: '',
    imageProxyUrl: '',
    enableOptimization: true,
    enableImageProxy: false,
    enableDoubanProxy: false,
  });

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // 读取认证信息、存储类型与本地设置
  useEffect(() => {
    if (typeof window === 'undefined') return;

    setAuthInfo(getAuthInfoFromBrowserCookie());

    const runtime = (window as any).RUNTIME_CONFIG ?? {};
    setStorageType(runtime.STORAGE_TYPE || 'localstorage');

    const defaultDoubanProxy = runtime.DOUBAN_PROXY || '';
    const defaultImageProxy = runtime.IMAGE_PROXY || '';

    /** 读取布尔项：有存过就用存的，否则回退到服务端默认值 */
    const readBool = (key: string, fallback: boolean) => {
      const raw = localStorage.getItem(key);
      if (raw !== null) return JSON.parse(raw) as boolean;
      return fallback;
    };

    const readStr = (key: string, fallback: string) => {
      const raw = localStorage.getItem(key);
      return raw !== null ? raw : fallback;
    };

    setSettings({
      defaultAggregateSearch: readBool('defaultAggregateSearch', true),
      enableOptimization: readBool('enableOptimization', true),
      enableDoubanProxy: readBool('enableDoubanProxy', !!defaultDoubanProxy),
      doubanProxyUrl: readStr('doubanProxyUrl', defaultDoubanProxy),
      enableImageProxy: readBool('enableImageProxy', !!defaultImageProxy),
      imageProxyUrl: readStr('imageProxyUrl', defaultImageProxy),
    });
  }, []);

  // 版本检查
  useEffect(() => {
    let cancelled = false;
    checkForUpdates()
      .then((status) => {
        if (!cancelled) setUpdateStatus(status);
      })
      .catch((error) => console.warn('版本检查失败:', error))
      .finally(() => {
        if (!cancelled) setIsChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /** 更新单项设置并落盘，替代原来 6 个几乎相同的 handler */
  const updateSetting = <K extends keyof LocalSettings>(
    key: K,
    value: LocalSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        key,
        typeof value === 'boolean' ? JSON.stringify(value) : value
      );
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('注销请求失败:', error);
    }
    window.location.href = '/';
  };

  const handleResetSettings = () => {
    const runtime = (window as any).RUNTIME_CONFIG ?? {};
    const defaultDoubanProxy = runtime.DOUBAN_PROXY || '';
    const defaultImageProxy = runtime.IMAGE_PROXY || '';

    const reset: LocalSettings = {
      defaultAggregateSearch: true,
      enableOptimization: true,
      doubanProxyUrl: defaultDoubanProxy,
      enableDoubanProxy: !!defaultDoubanProxy,
      enableImageProxy: !!defaultImageProxy,
      imageProxyUrl: defaultImageProxy,
    };

    setSettings(reset);
    Object.entries(reset).forEach(([key, value]) => {
      localStorage.setItem(
        key,
        typeof value === 'boolean' ? JSON.stringify(value) : String(value)
      );
    });
  };

  const openChangePassword = () => {
    setIsOpen(false);
    setIsChangePasswordOpen(true);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };

  const submitChangePassword = async () => {
    setPasswordError('');
    if (!newPassword) return setPasswordError('新密码不得为空');
    if (newPassword !== confirmPassword)
      return setPasswordError('两次输入的密码不一致');

    setPasswordLoading(true);
    try {
      const response = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      const data = await response.json();

      if (!response.ok) {
        setPasswordError(data.error || '修改密码失败');
        return;
      }

      setIsChangePasswordOpen(false);
      await handleLogout();
    } catch {
      setPasswordError('网络错误，请稍后重试');
    } finally {
      setPasswordLoading(false);
    }
  };

  const showAdminPanel =
    authInfo?.role === 'owner' || authInfo?.role === 'admin';
  const showChangePassword =
    authInfo?.role !== 'owner' && storageType !== 'localstorage';

  /** 菜单项统一样式 */
  const menuItemClass =
    'flex w-full items-center gap-3 rounded-apple-md px-3 py-2 text-left text-[14px] text-ink transition-colors duration-250 ease-apple hover:bg-hairline/[0.06]';

  // 点击空白处 / 按 ESC 关闭菜单
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) =>
      e.key === 'Escape' && setIsOpen(false);
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  return (
    <>
      <div className='relative'>
        <button
          onClick={() => setIsOpen((v) => !v)}
          className='apple-icon-btn'
          aria-label='用户菜单'
          aria-expanded={isOpen}
          aria-haspopup='menu'
        >
          <User className='h-[17px] w-[17px]' />
        </button>
        {updateStatus === UpdateStatus.HAS_UPDATE && (
          <span className='pointer-events-none absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent ring-2 ring-canvas' />
        )}

        {/* 账号菜单：下拉面板，与顶栏右对齐 */}
        {isOpen && (
          <>
            <div
              className='fixed inset-0 z-[1000]'
              onClick={() => setIsOpen(false)}
            />
            <div
              role='menu'
              className='absolute right-0 top-[calc(100%+8px)] z-[1001] w-64 animate-apple-sheet-up overflow-hidden rounded-apple-lg border border-hairline/[0.08] bg-surface p-1.5 shadow-apple-float dark:border-hairline/[0.1]'
            >
              {/* 账号信息 */}
              <div className='px-3 py-2.5'>
                <div className='flex items-center justify-between gap-2'>
                  <span className='truncate text-[15px] font-medium text-ink'>
                    {authInfo?.username || 'default'}
                  </span>
                  <span className='shrink-0 rounded-pill bg-accent/[0.1] px-2 py-0.5 text-[11px] font-medium text-accent'>
                    {ROLE_LABEL[authInfo?.role || 'user']}
                  </span>
                </div>
                <p className='mt-0.5 text-[12px] text-ink-3'>
                  数据存储：
                  {storageType === 'localstorage' ? '本地浏览器' : storageType}
                </p>
              </div>

              <div className='my-1 h-px bg-hairline/[0.08]' />

              <button
                role='menuitem'
                onClick={() => {
                  setIsOpen(false);
                  setIsSettingsOpen(true);
                }}
                className={menuItemClass}
              >
                <Settings className='h-4 w-4 text-ink-3' />
                设置
              </button>

              {showAdminPanel && (
                <button
                  role='menuitem'
                  onClick={() => {
                    setIsOpen(false);
                    router.push('/admin');
                  }}
                  className={menuItemClass}
                >
                  <Shield className='h-4 w-4 text-ink-3' />
                  管理面板
                </button>
              )}

              {showChangePassword && (
                <button
                  role='menuitem'
                  onClick={openChangePassword}
                  className={menuItemClass}
                >
                  <KeyRound className='h-4 w-4 text-ink-3' />
                  修改密码
                </button>
              )}

              <div className='my-1 h-px bg-hairline/[0.08]' />

              <button
                role='menuitem'
                onClick={handleLogout}
                className={`${menuItemClass} text-[#ff3b30] hover:bg-[#ff3b30]/[0.08]`}
              >
                <LogOut className='h-4 w-4' />
                登出
              </button>

              <div className='my-1 h-px bg-hairline/[0.08]' />

              <button
                onClick={() =>
                  window.open('https://github.com/senshinya/MoonTV', '_blank')
                }
                className='flex w-full items-center justify-center gap-1.5 rounded-apple-md px-3 py-2 text-[12px] text-ink-3 transition-colors duration-250 ease-apple hover:text-ink-2'
              >
                <span className='font-mono'>v{CURRENT_VERSION}</span>
                {!isChecking &&
                  updateStatus &&
                  updateStatus !== UpdateStatus.FETCH_FAILED && (
                    <span
                      className={[
                        'h-1.5 w-1.5 rounded-full',
                        updateStatus === UpdateStatus.HAS_UPDATE
                          ? 'bg-accent'
                          : 'bg-[#34c759]',
                      ].join(' ')}
                    />
                  )}
              </button>
            </div>
          </>
        )}
      </div>

      {/* 本地设置 */}
      <Modal
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title='本地设置'
        size='md'
        headerExtra={
          <button
            onClick={handleResetSettings}
            className='rounded-pill border border-hairline/[0.14] px-2.5 py-0.5 text-[12px] text-ink-2 transition-colors duration-250 ease-apple hover:text-ink'
          >
            重置
          </button>
        }
      >
        <div className='space-y-5'>
          <SettingRow
            title='默认聚合搜索结果'
            desc='搜索时按标题与年份合并同一部作品'
            checked={settings.defaultAggregateSearch}
            onChange={(v) => updateSetting('defaultAggregateSearch', v)}
          />

          <SettingRow
            title='启用优选和测速'
            desc='如出现播放器被劫持的情况可关闭'
            checked={settings.enableOptimization}
            onChange={(v) => updateSetting('enableOptimization', v)}
          />

          <Divider />

          <SettingRow
            title='启用豆瓣代理'
            desc='通过代理服务器获取豆瓣数据'
            checked={settings.enableDoubanProxy}
            onChange={(v) => updateSetting('enableDoubanProxy', v)}
          />

          <SettingInput
            title='豆瓣代理地址'
            desc='仅在启用豆瓣代理时生效，留空则使用服务器 API'
            placeholder='例如：https://proxy.example.com/fetch?url='
            value={settings.doubanProxyUrl}
            disabled={!settings.enableDoubanProxy}
            onChange={(v) => updateSetting('doubanProxyUrl', v)}
          />

          <Divider />

          <SettingRow
            title='启用图片代理'
            desc='所有海报图片经由代理加载'
            checked={settings.enableImageProxy}
            onChange={(v) => updateSetting('enableImageProxy', v)}
          />

          <SettingInput
            title='图片代理地址'
            desc='仅在启用图片代理时生效'
            placeholder='例如：https://imageproxy.example.com/?url='
            value={settings.imageProxyUrl}
            disabled={!settings.enableImageProxy}
            onChange={(v) => updateSetting('imageProxyUrl', v)}
          />
        </div>

        <p className='mt-6 border-t border-hairline/[0.08] pt-4 text-center text-[12px] text-ink-3'>
          这些设置仅保存在当前浏览器
        </p>
      </Modal>

      {/* 修改密码 */}
      <Modal
        open={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        title='修改密码'
        size='md'
        footer={
          <div className='flex gap-3'>
            <Button
              variant='secondary'
              block
              onClick={() => setIsChangePasswordOpen(false)}
              disabled={passwordLoading}
            >
              取消
            </Button>
            <Button
              block
              onClick={submitChangePassword}
              disabled={passwordLoading || !newPassword || !confirmPassword}
            >
              {passwordLoading ? '修改中…' : '确认修改'}
            </Button>
          </div>
        }
      >
        <div className='space-y-4'>
          <input
            type='password'
            aria-label='新密码'
            placeholder='新密码'
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={passwordLoading}
            className='apple-input'
          />
          <input
            type='password'
            aria-label='确认密码'
            placeholder='再次输入新密码'
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={passwordLoading}
            className='apple-input'
          />

          {passwordError && (
            <p className='rounded-apple-md bg-[#ff3b30]/10 px-3 py-2.5 text-[13px] text-[#ff3b30]'>
              {passwordError}
            </p>
          )}

          <p className='text-[12px] text-ink-3'>修改密码后需要重新登录</p>
        </div>
      </Modal>
    </>
  );
};

/* ---------------------------------------------------------------- 子组件 */

function SettingRow({
  title,
  desc,
  checked,
  onChange,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className='flex items-center justify-between gap-6'>
      <div className='min-w-0'>
        <h4 className='text-[14px] font-medium text-ink'>{title}</h4>
        <p className='mt-0.5 text-[12px] leading-snug text-ink-3'>{desc}</p>
      </div>
      <Switch label={title} checked={checked} onChange={onChange} />
    </div>
  );
}

function SettingInput({
  title,
  desc,
  value,
  placeholder,
  disabled,
  onChange,
}: {
  title: string;
  desc: string;
  value: string;
  placeholder: string;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className='space-y-2'>
      <div>
        <h4 className='text-[14px] font-medium text-ink'>{title}</h4>
        <p className='mt-0.5 text-[12px] leading-snug text-ink-3'>{desc}</p>
      </div>
      <input
        type='text'
        aria-label={title}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className='apple-input text-[14px] disabled:cursor-not-allowed disabled:opacity-45'
      />
    </div>
  );
}

function Divider() {
  return <div className='h-px bg-hairline/[0.08]' />;
}

export default UserMenu;
