import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-6xl">
            UE 资产库
          </h1>
          <p className="mb-8 text-lg text-muted-foreground sm:text-xl">
            浏览和搜索 Unreal Engine 资产集合
          </p>
          <Link href="/assets">
            <Button size="lg" className="gap-2">
              浏览资产
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}


