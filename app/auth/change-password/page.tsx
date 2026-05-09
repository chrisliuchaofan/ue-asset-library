'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Eye, EyeOff } from 'lucide-react';
import { LoginShowcase } from '@/components/auth/LoginShowcase';

function ChangePasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, update } = useSession();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const callbackUrl = searchParams.get('callbackUrl') || '/materials';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/login?callbackUrl=' + encodeURIComponent('/auth/change-password'));
    }
  }, [router, status]);

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

  const iconButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    right: 10,
    transform: 'translateY(-50%)',
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#666',
    background: 'transparent',
    border: 'none',
    borderRadius: 6,
    cursor: loading ? 'not-allowed' : 'pointer',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('新密码至少 6 个字符');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        setError(payload?.message || '修改失败，请稍后重试');
        return;
      }

      await update();
      router.replace(callbackUrl);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || '修改失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <LoginShowcase />
      <div
        style={{
          width: '100%',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'clamp(24px, 5vw, 64px)',
        }}
      >
        <div style={{ width: '100%', maxWidth: 380 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111', margin: 0, lineHeight: 1.3 }}>
            设置新密码
          </h1>
          <p style={{ marginTop: 12, fontSize: 14, color: '#666', lineHeight: 1.7 }}>
            这是临时账号的首次登录。请先修改密码，然后继续使用爆款工坊。
          </p>

          <form onSubmit={handleSubmit} style={{ marginTop: 32 }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#444', marginBottom: 6 }}>
                新密码
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="至少 6 个字符"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  required
                  disabled={loading || status === 'loading'}
                  style={{ ...inputStyle, paddingRight: 48 }}
                />
                <button
                  type="button"
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  title={showPassword ? '隐藏密码' : '显示密码'}
                  disabled={loading}
                  onClick={() => setShowPassword((value) => !value)}
                  style={iconButtonStyle}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#444', marginBottom: 6 }}>
                确认新密码
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="再次输入新密码"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                  required
                  disabled={loading || status === 'loading'}
                  style={{ ...inputStyle, paddingRight: 48 }}
                />
                <button
                  type="button"
                  aria-label={showConfirmPassword ? '隐藏密码' : '显示密码'}
                  title={showConfirmPassword ? '隐藏密码' : '显示密码'}
                  disabled={loading}
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  style={iconButtonStyle}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                padding: '10px 14px',
                fontSize: 13,
                color: '#dc2626',
                background: '#fef2f2',
                borderRadius: 8,
                marginBottom: 16,
                wordBreak: 'break-word',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || status === 'loading'}
              style={{
                width: '100%',
                padding: '12px 0',
                fontSize: 15,
                fontWeight: 600,
                color: '#fff',
                background: '#111',
                border: 'none',
                borderRadius: 8,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? '保存中...' : '保存并进入'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
        <div style={{ color: '#666' }}>加载中...</div>
      </div>
    }>
      <ChangePasswordForm />
    </Suspense>
  );
}
