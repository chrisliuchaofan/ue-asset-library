import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MediaGallery } from '@/components/media-gallery';
import { getAssetById, getAllAssets } from '@/lib/data';
import { formatFileSize, formatDuration, getAssetUrl } from '@/lib/utils';
import type { Metadata } from 'next';

// 判断 URL 是否为视频
function isVideoUrl(url: string): boolean {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return (
    lowerUrl.includes('.mp4') ||
    lowerUrl.includes('.webm') ||
    lowerUrl.includes('.mov') ||
    lowerUrl.includes('.avi') ||
    lowerUrl.includes('.mkv')
  );
}

export async function generateStaticParams() {
  try {
    const assets = await getAllAssets();
    return assets.map((asset) => ({
      id: asset.id,
    }));
  } catch (error) {
    // 如果构建时读取资产失败（例如类型验证错误），返回空数组
    // 页面将在运行时动态生成
    console.warn('构建时无法生成静态参数，将使用动态生成:', error);
    return [];
  }
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

  const isVideo = isVideoUrl(asset.src);
  const tagsArray = Array.isArray(asset.tags) ? asset.tags : [];
  const tagsText = tagsArray.length > 0 ? tagsArray.join(', ') : '无标签';
  
  return {
    title: asset.name,
    description: `${asset.name} - ${asset.type}类型资产。标签: ${tagsText}${asset.width && asset.height ? `。尺寸: ${asset.width}×${asset.height}` : ''}`,
    keywords: [asset.name, asset.type, ...tagsArray],
    openGraph: {
      title: asset.name,
      description: `${asset.type}类型资产。标签: ${tagsText}`,
      type: 'website',
      ...(isVideo
        ? {
            videos: [{ 
              url: getAssetUrl(asset.src),
              width: asset.width,
              height: asset.height,
            }],
          }
        : {
            images: [{ 
              url: getAssetUrl(asset.thumbnail || asset.src),
              width: asset.width,
              height: asset.height,
              alt: asset.name,
            }],
          }),
    },
    twitter: {
      card: 'summary_large_image',
      title: asset.name,
      description: `${asset.type}类型资产 - ${tagsText}`,
      ...(isVideo
        ? {}
        : {
            images: [getAssetUrl(asset.thumbnail || asset.src)],
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
            {(() => {
              // 确保 tags 是数组，如果是字符串则拆分（兼容旧数据）
              const tagsArray = Array.isArray(currentAsset.tags)
                ? currentAsset.tags
                : typeof (currentAsset as any).tags === 'string'
                ? (currentAsset as any).tags.split(',').map((t: string) => t.trim()).filter(Boolean)
                : [];
              return tagsArray.map((tag: string) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ));
            })()}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-sm text-muted-foreground">资产类型</div>
              <div className="font-medium">
                {currentAsset.type}
              </div>
            </div>
            {currentAsset.style && (
              <div>
                <div className="text-sm text-muted-foreground">风格</div>
                <div className="font-medium">
                  {Array.isArray(currentAsset.style)
                    ? currentAsset.style.join(', ')
                    : currentAsset.style}
                </div>
              </div>
            )}
            {currentAsset.source && (
              <div>
                <div className="text-sm text-muted-foreground">来源</div>
                <div className="font-medium">{currentAsset.source}</div>
              </div>
            )}
            {currentAsset.engineVersion && (
              <div>
                <div className="text-sm text-muted-foreground">版本</div>
                <div className="font-medium">{currentAsset.engineVersion}</div>
              </div>
            )}
            {!isVideoUrl(currentAsset.src) && currentAsset.width && currentAsset.height && (
              <div>
                <div className="text-sm text-muted-foreground">尺寸</div>
                <div className="font-medium">
                  {currentAsset.width} × {currentAsset.height} 像素
                </div>
              </div>
            )}
            {isVideoUrl(currentAsset.src) && currentAsset.duration && (
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

