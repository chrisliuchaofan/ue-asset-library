import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MediaGallery } from '@/components/media-gallery';
import { getAssetById, getAllAssets } from '@/lib/data';
import { formatFileSize, formatDuration, getAssetUrl } from '@/lib/utils';
import type { Metadata } from 'next';

export async function generateStaticParams() {
  const assets = await getAllAssets();
  return assets.map((asset) => ({
    id: asset.id,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const asset = await getAssetById(id);

  if (!asset) {
    return {
      title: '资产未找到 - UE 资产库',
    };
  }

  return {
    title: `${asset.name} - UE 资产库`,
    description: `查看 ${asset.name} 的详细信息`,
    openGraph: {
      title: asset.name,
      description: `标签: ${asset.tags.join(', ')}`,
      type: 'website',
      ...(asset.type === 'image' && {
        images: [{ url: getAssetUrl(asset.src) }],
      }),
      ...(asset.type === 'video' && {
        videos: [{ url: getAssetUrl(asset.src) }],
      }),
    },
  };
}

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const asset = await getAssetById(id);

  if (!asset) {
    notFound();
  }

  const currentAsset = asset;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center gap-4 px-4">
          <Link href="/assets">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <a href="/" className="text-lg font-semibold">
            UE 资产库
          </a>
        </div>
      </header>

      <main className="container px-4 py-8">
        <div className="mb-6">
          <h1 className="mb-4 text-3xl font-bold">{currentAsset.name}</h1>
          <div className="mb-4 flex flex-wrap gap-2">
            {currentAsset.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-sm text-muted-foreground">类型</div>
              <div className="font-medium">
                {currentAsset.type === 'image' ? '图片' : '视频'}
              </div>
            </div>
            {currentAsset.type === 'image' && currentAsset.width && currentAsset.height && (
              <>
                <div>
                  <div className="text-sm text-muted-foreground">尺寸</div>
                  <div className="font-medium">
                    {currentAsset.width} × {currentAsset.height} 像素
                  </div>
                </div>
              </>
            )}
            {currentAsset.type === 'video' && currentAsset.duration && (
              <div>
                <div className="text-sm text-muted-foreground">时长</div>
                <div className="font-medium">{formatDuration(currentAsset.duration)}</div>
              </div>
            )}
            {currentAsset.filesize && (
              <div>
                <div className="text-sm text-muted-foreground">文件大小</div>
                <div className="font-medium">{formatFileSize(currentAsset.filesize)}</div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <MediaGallery asset={currentAsset} />
        </div>
      </main>
    </div>
  );
}

