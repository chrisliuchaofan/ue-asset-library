'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
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

type RegisterFormProps = {
  allowedDomains: string[];
};

function getCompanyEmailHint(allowedDomains: string[]) {
  if (allowedDomains.length === 0) {
    return '仅支持公司邮箱注册';
  }

  return `仅支持 ${allowedDomains.map((domain) => `@${domain}`).join('、')} 邮箱注册`;
}

function isCompanyEmail(email: string, allowedDomains: string[]) {
  const domain = email.trim().toLowerCase().split('@')[1] || '';
  return allowedDomains.length > 0 && allowedDomains.includes(domain);
}

export function RegisterForm({ allowedDomains }: RegisterFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [codeNotice, setCodeNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const emailHint = getCompanyEmailHint(allowedDomains);

  const handleSendCode = async () => {
    setError('');
    setCodeNotice('');

    if (!isCompanyEmail(email, allowedDomains)) {
      setError(emailHint);
      return;
    }

    setSendingCode(true);

    try {
      const res = await fetch('/api/auth/register/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || '验证码发送失败');
        return;
      }

      setCodeSent(true);
      setCodeNotice(data.message || '验证码已发送，请查看公司邮箱');
    } catch (err: any) {
      setError(`验证码发送失败: ${err.message || '请重试'}`);
    } finally {
      setSendingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setCodeNotice('');

    if (password !== confirmPassword) {
      setError('两次密码输入不一致');
      return;
    }

    if (password.length < 6) {
      setError('密码至少 6 个字符');
      return;
    }

    if (!isCompanyEmail(email, allowedDomains)) {
      setError(emailHint);
      return;
    }

    if (verificationCode.trim().length < 6) {
      setError('请输入邮箱验证码');
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
          verification_code: verificationCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || '注册失败');
        return;
      }

      setSuccess(`注册成功！已加入团队「${data.user?.teamName || ''}」，即将跳转登录页...`);

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
          <CardDescription>{emailHint}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
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
                autoFocus
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
                  setVerificationCode('');
                  setCodeSent(false);
                  setCodeNotice('');
                  setError('');
                }}
                required
                disabled={loading || sendingCode}
              />
              <p className="text-xs text-muted-foreground">{emailHint}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="verificationCode">邮箱验证码</Label>
              <div className="flex gap-2">
                <Input
                  id="verificationCode"
                  type="text"
                  inputMode="numeric"
                  placeholder="请输入验证码"
                  value={verificationCode}
                  onChange={(e) => {
                    setVerificationCode(e.target.value);
                    setError('');
                  }}
                  required
                  disabled={loading}
                  minLength={6}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendCode}
                  disabled={loading || sendingCode || !email}
                  className="shrink-0"
                >
                  {sendingCode ? '发送中...' : codeSent ? '重新发送' : '发送验证码'}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="至少 6 个字符"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  required
                  disabled={loading}
                  minLength={6}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  title={showPassword ? '隐藏密码' : '显示密码'}
                  disabled={loading}
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认密码</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="请再次输入密码"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError('');
                  }}
                  required
                  disabled={loading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={showConfirmPassword ? '隐藏确认密码' : '显示确认密码'}
                  title={showConfirmPassword ? '隐藏确认密码' : '显示确认密码'}
                  disabled={loading}
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {codeNotice && (
              <div className="rounded-md bg-blue-500/15 p-3 text-sm text-blue-700 dark:text-blue-300">
                {codeNotice}
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
              {loading ? '注册中...' : '验证并注册'}
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
