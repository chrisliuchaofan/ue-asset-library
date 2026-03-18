'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LoginShowcase } from '@/components/auth/LoginShowcase';

/* ───── 响应式 CSS ───── */

const LOGIN_CSS = `
.login-right{width:100%}
@media(min-width:768px){
  .login-right{width:50%}
}`;

/* ───── 登录表单 ───── */

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  const callbackUrl = searchParams.get('callbackUrl') || '/materials';

  const handleOAuth = async (provider: string) => {
    setOauthLoading(provider);
    try {
      await signIn(provider, { callbackUrl });
    } catch {
      setOauthLoading(null);
      setError('第三方登录失败，请重试');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        let errorMessage = '登录失败';
        if (result.error === 'CredentialsSignin') {
          errorMessage = '用户名或密码错误';
        } else if (result.error === 'Configuration') {
          errorMessage = '系统配置错误，请联系管理员';
        } else {
          errorMessage = `登录失败: ${result.error}`;
        }

        setError(errorMessage);
        setPassword('');
      } else if (result?.ok) {
        window.location.href = callbackUrl;
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err: any) {
      setError(`登录失败: ${err.message || '请重试'}`);
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  /* ── 输入框样式 ── */
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    fontSize: 15,
    color: '#111',
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: 8,
    outline: 'none',
    transition: 'border-color 0.2s ease',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <style>{LOGIN_CSS}</style>

      {/* ── 左侧：产品展示 ── */}
      <LoginShowcase />

      {/* ── 右侧：登录表单 ── */}
      <div
        className="login-right"
        style={{
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'clamp(24px, 5vw, 64px)',
        }}
      >
        <div style={{ width: '100%', maxWidth: 380 }}>
          {/* 标题 */}
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111', margin: 0, lineHeight: 1.3 }}>
            欢迎来到
            <br />
            爆款工坊
          </h1>
          <p style={{ marginTop: 12, fontSize: 14, color: '#666' }}>
            没有账号？{' '}
            <Link href="/auth/register" style={{ color: '#111', fontWeight: 600, textDecoration: 'underline' }}>
              免费注册
            </Link>
          </p>

          {/* 表单 */}
          <form onSubmit={handleSubmit} style={{ marginTop: 32 }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#444', marginBottom: 6 }}>
                用户名或邮箱
              </label>
              <input
                type="text"
                placeholder="请输入用户名"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(''); }}
                autoFocus
                required
                disabled={loading}
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#111'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#e0e0e0'; }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#444', marginBottom: 6 }}>
                密码
              </label>
              <input
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                required
                disabled={loading}
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#111'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#e0e0e0'; }}
              />
            </div>

            {/* 错误信息 */}
            {error && (
              <div style={{
                padding: '10px 14px',
                fontSize: 13,
                color: '#dc2626',
                background: '#fef2f2',
                borderRadius: 8,
                marginBottom: 16,
                wordBreak: 'break-word' as const,
              }}>
                {error}
              </div>
            )}

            {/* 登录按钮 */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 0',
                fontSize: 15,
                fontWeight: 600,
                color: '#fff',
                background: 'hsl(var(--popover))',
                border: 'none',
                borderRadius: 8,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'opacity 0.2s ease',
              }}
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          {/* 分隔线 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
            <div style={{ flex: 1, height: 1, background: '#e5e5e5' }} />
            <span style={{ fontSize: 12, color: '#999', textTransform: 'uppercase' }}>或</span>
            <div style={{ flex: 1, height: 1, background: '#e5e5e5' }} />
          </div>

          {/* OAuth 按钮 — 全宽堆叠 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              type="button"
              onClick={() => handleOAuth('google')}
              disabled={!!oauthLoading || loading}
              style={{
                width: '100%',
                padding: '11px 0',
                fontSize: 14,
                fontWeight: 500,
                color: '#333',
                background: '#fff',
                border: '1px solid #e0e0e0',
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                transition: 'background 0.15s ease',
              }}
            >
              {oauthLoading === 'google' ? (
                <span style={{ width: 16, height: 16, border: '2px solid #ccc', borderTopColor: '#333', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }} />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              使用 Google 登录
            </button>

            <button
              type="button"
              onClick={() => handleOAuth('github')}
              disabled={!!oauthLoading || loading}
              style={{
                width: '100%',
                padding: '11px 0',
                fontSize: 14,
                fontWeight: 500,
                color: '#333',
                background: '#fff',
                border: '1px solid #e0e0e0',
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                transition: 'background 0.15s ease',
              }}
            >
              {oauthLoading === 'github' ? (
                <span style={{ width: 16, height: 16, border: '2px solid #ccc', borderTopColor: '#333', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }} />
              ) : (
                <svg width="16" height="16" fill="#333" viewBox="0 0 24 24">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              )}
              使用 GitHub 登录
            </button>
          </div>

        </div>
      </div>

      {/* Spin animation */}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ───── Page 入口 ───── */

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111' }}>欢迎来到爆款工坊</h1>
          <p style={{ color: '#999', marginTop: 8 }}>加载中...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
