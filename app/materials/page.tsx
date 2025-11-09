import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Construction } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '素材库 - 恒星UE资产库',
  description: '浏览和管理视频素材文件',
};

export default function MaterialsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center gap-4 px-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <a href="/" className="text-lg font-semibold">
            恒星UE资产库
          </a>
        </div>
      </header>

      <main className="container flex flex-1 items-center justify-center px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <Construction className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="mb-4 text-3xl font-bold tracking-tight">
            素材库
          </h1>
          <p className="mb-8 text-lg text-muted-foreground">
            此功能正在开发中，后续将支持上传和管理视频素材文件
          </p>
          <Link href="/assets">
            <Button variant="outline">
              返回资产库
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}

