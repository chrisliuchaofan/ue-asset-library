'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [invitationCode, setInvitationCode] = useState(
    searchParams.get('code') || ''
  );
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // 前端校验
    if (password !== confirmPassword) {
      setError('两次密码输入不一致');
      return;
    }

    if (password.length < 6) {
      setError('密码至少 6 个字符');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          email,
          password,
          invitation_code: invitationCode.trim().toUpperCase(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || '注册失败');
        return;
      }

      setSuccess(`注册成功！已加入团队「${data.user?.teamName || ''}」，即将跳转登录页...`);

      // 2 秒后跳转登录页
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    } catch (err: any) {
      setError(`注册失败: ${err.message || '请重试'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">注册爆款工坊</CardTitle>
          <CardDescription>使用邀请码创建账号</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invitation_code">邀请码</Label>
              <Input
                id="invitation_code"
                type="text"
                placeholder="请输入邀请码"
                value={invitationCode}
                onChange={(e) => {
                  setInvitationCode(e.target.value);
                  setError('');
                }}
                autoFocus={!invitationCode}
                required
                disabled={loading}
                className="uppercase tracking-wider font-mono"
              />
              <p className="text-xs text-muted-foreground">
                请向团队管理员获取邀请码
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                type="text"
                placeholder="请输入用户名"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                }}
                autoFocus={!!invitationCode}
                required
                disabled={loading}
                minLength={2}
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                placeholder="请输入邮箱"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="至少 6 个字符"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                required
                disabled={loading}
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认密码</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="请再次输入密码"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError('');
                }}
                required
                disabled={loading}
              />
            </div>
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-md bg-green-500/15 p-3 text-sm text-green-600 dark:text-green-400">
                {success}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading || !!success}>
              {loading ? '注册中...' : '注册'}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              已有账号？{' '}
              <Link href="/auth/login" className="text-primary hover:underline">
                去登录
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">注册爆款工坊</CardTitle>
              <CardDescription>加载中...</CardDescription>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
