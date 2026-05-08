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

  const callbackUrl = searchParams.get('callbackUrl') || '/materials';

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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#444' }}>
                  密码
                </label>
                <Link href="/auth/reset-password" style={{ color: '#111', fontSize: 13, fontWeight: 600, textDecoration: 'underline' }}>
                  重设密码
                </Link>
              </div>
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

        </div>
      </div>

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
