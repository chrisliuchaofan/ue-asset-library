'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
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

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const callbackUrl = searchParams.get('callbackUrl') || '/admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('[LoginForm] 开始登录:', { username, hasPassword: !!password, callbackUrl });
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e41af73f-c02b-452a-8798-4720359cec20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/auth/login/page.tsx:36',message:'calling signIn',data:{username,hasPassword:!!password,callbackUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
      // #endregion
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
        callbackUrl,
      });

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e41af73f-c02b-452a-8798-4720359cec20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/auth/login/page.tsx:43',message:'signIn result',data:{ok:result?.ok,error:result?.error,status:result?.status,url:result?.url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
      // #endregion
      console.log('[LoginForm] 登录结果:', { 
        ok: result?.ok, 
        error: result?.error,
        status: result?.status,
        url: result?.url 
      });

      if (result?.error) {
        console.error('[LoginForm] 登录失败:', result.error);
        
        // 根据错误类型显示更详细的错误信息
        let errorMessage = '登录失败';
        if (result.error === 'CredentialsSignin') {
          // CredentialsSignin 通常意味着 authorize() 返回了 null 或抛出了错误
          // 检查服务器端日志以获取真实错误信息
          errorMessage = '登录失败：后端连接错误或认证失败\n\n可能的原因：\n1. 后端服务未运行（检查后端是否在运行）\n2. 网络连接问题（检查 CORS 配置）\n3. 用户名或密码错误\n\n请查看：\n- 浏览器控制台（F12）中的详细错误信息\n- 服务器端日志中的 [Auth] 错误信息';
        } else if (result.error === 'Configuration') {
          // Configuration 错误通常意味着 NextAuth 配置有问题
          errorMessage = '登录失败：NextAuth 配置错误\n\n可能的原因：\n1. NEXTAUTH_SECRET 未配置或配置错误\n2. NEXTAUTH_URL 配置错误\n3. NextAuth 配置文件中存在语法错误\n\n请检查：\n- .env.local 文件中的 NEXTAUTH_SECRET 和 NEXTAUTH_URL\n- 服务器端日志中的 NextAuth 错误信息';
        } else {
          errorMessage = `登录失败: ${result.error}`;
        }
        
        // 在控制台输出更详细的错误信息，帮助调试
        console.error('[LoginForm] ❌ 登录失败详情:', {
          error: result.error,
          status: result.status,
          url: result.url,
          note: result.error === 'Configuration' 
            ? 'NextAuth 配置错误，请检查 NEXTAUTH_SECRET 和 NEXTAUTH_URL 环境变量'
            : '请检查服务器端日志中的 [Auth] 错误信息以获取详细错误原因',
        });
        
        setError(errorMessage);
        setPassword('');
      } else if (result?.ok) {
        console.log('[LoginForm] 登录成功，跳转到:', callbackUrl);
        // 登录成功，跳转到目标页面
        // 使用 window.location 确保完全刷新页面和 session
        window.location.href = callbackUrl;
      } else {
        console.warn('[LoginForm] 登录结果异常:', result);
        // 如果 result 为 undefined 或没有 error，也尝试跳转
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err: any) {
      console.error('[LoginForm] 登录异常:', { 
        error: err.message || err,
        stack: err.stack?.substring(0, 300)
      });
      setError(`登录失败: ${err.message || '请重试'}`);
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">管理后台登录</CardTitle>
          <CardDescription>请输入您的账号和密码以访问管理页面</CardDescription>
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
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
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '登录中...' : '登录'}
            </Button>
            {/* 预留钉钉登录按钮位置 */}
            {/* 
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">或</span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => signIn('dingtalk', { callbackUrl })}
            >
              使用钉钉登录
            </Button>
            */}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">管理后台登录</CardTitle>
            <CardDescription>加载中...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

