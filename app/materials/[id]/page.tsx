import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MediaGallery } from '@/components/media-gallery';
import { getMaterialById, getAllMaterials } from '@/lib/materials-data';
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
    const materials = await getAllMaterials();
    return materials.map((material) => ({
      id: material.id,
    }));
  } catch (error) {
    // 如果构建时读取素材失败，返回空数组
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
  const material = await getMaterialById(id);

  if (!material) {
    return {
      title: '素材未找到 - UE 资产库',
    };
  }

  const isVideo = isVideoUrl(material.src);
  
  return {
    title: material.name,
    description: `${material.name} - ${material.type}类型素材。标签: ${material.tag}，质量: ${material.quality.join(', ')}${material.width && material.height ? `。尺寸: ${material.width}×${material.height}` : ''}`,
    keywords: [material.name, material.type, material.tag, ...material.quality],
    openGraph: {
      title: material.name,
      description: `${material.type}类型素材。标签: ${material.tag}`,
      type: 'website',
      ...(isVideo
        ? {
            videos: [{ 
              url: getAssetUrl(material.src),
              width: material.width,
              height: material.height,
            }],
          }
        : {
            images: [{ 
              url: getAssetUrl(material.thumbnail || material.src),
              width: material.width,
              height: material.height,
              alt: material.name,
            }],
          }),
    },
    twitter: {
      card: 'summary_large_image',
      title: material.name,
      description: `${material.type}类型素材 - ${material.tag}`,
      ...(isVideo
        ? {}
        : {
            images: [getAssetUrl(material.thumbnail || material.src)],
          }),
    },
  };
}

export default async function MaterialDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const material = await getMaterialById(id);

  if (!material) {
    notFound();
  }

  const currentMaterial = material;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center gap-4 px-4">
          <Link href="/materials">
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
          <h1 className="mb-4 text-3xl font-bold">{currentMaterial.name}</h1>
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge variant="secondary">{currentMaterial.type}</Badge>
            <Badge variant="secondary">{currentMaterial.tag}</Badge>
            {currentMaterial.quality.map((q) => (
              <Badge key={q} variant="outline">
                {q}
              </Badge>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-sm text-muted-foreground">素材类型</div>
              <div className="font-medium">{currentMaterial.type}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">标签</div>
              <div className="font-medium">{currentMaterial.tag}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">质量</div>
              <div className="font-medium">{currentMaterial.quality.join(', ')}</div>
            </div>
            {!isVideoUrl(currentMaterial.src) && currentMaterial.width && currentMaterial.height && (
              <div>
                <div className="text-sm text-muted-foreground">尺寸</div>
                <div className="font-medium">
                  {currentMaterial.width} × {currentMaterial.height} 像素
                </div>
              </div>
            )}
            {isVideoUrl(currentMaterial.src) && currentMaterial.duration && (
              <div>
                <div className="text-sm text-muted-foreground">时长</div>
                <div className="font-medium">{formatDuration(currentMaterial.duration)}</div>
              </div>
            )}
            {currentMaterial.filesize && (
              <div>
                <div className="text-sm text-muted-foreground">文件大小</div>
                <div className="font-medium">{formatFileSize(currentMaterial.filesize)}</div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <MediaGallery asset={currentMaterial as any} />
        </div>
      </main>
    </div>
  );
}

