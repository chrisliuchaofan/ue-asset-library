import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="mb-4 text-4xl font-bold">404</h1>
      <p className="mb-8 text-muted-foreground">资产未找到</p>
      <Link href="/assets">
        <Button>返回资产列表</Button>
      </Link>
    </div>
  );
}

