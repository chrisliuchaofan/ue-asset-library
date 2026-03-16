import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, DollarSign, BarChart3, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MediaGallery } from '@/components/media-gallery';
import { MaterialComments } from '@/components/material-comments';
import { MaterialStatusBadge } from '@/components/materials/material-status-badge';
import { MaterialLaunchInfo } from '@/components/materials/material-launch-info';
import { MaterialNamingSection } from '@/components/materials/material-naming-section';
import { MaterialMetricsSection } from '@/components/materials/material-metrics-section';
import { MaterialDataChart } from '@/components/charts/material-data-chart';
import { getMaterialById } from '@/lib/materials-data';
import { formatFileSize, formatDuration, getAssetUrl } from '@/lib/utils';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const material = await getMaterialById(id);

  if (!material) {
    return {
      title: '素材未找到 - 投放素材',
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
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center gap-3 px-4">
          <Link href="/materials">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <span className="text-sm font-medium text-muted-foreground">投放素材详情</span>
        </div>
      </header>

      <main className="container px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-3xl font-bold">{currentMaterial.name}</h1>
            <MaterialStatusBadge status={currentMaterial.status} />
          </div>
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
            {currentMaterial.fileSize && (
              <div>
                <div className="text-sm text-muted-foreground">文件大小</div>
                <div className="font-medium">{formatFileSize(currentMaterial.fileSize)}</div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <MediaGallery asset={currentMaterial as any} />
        </div>

        {/* 素材命名 (V3) */}
        <div className="mt-6">
          <MaterialNamingSection
            materialId={id}
            materialNaming={(currentMaterial as any).materialNaming}
            namingFields={(currentMaterial as any).namingFields}
            namingVerified={(currentMaterial as any).namingVerified}
            srcUrl={getAssetUrl(currentMaterial.src)}
          />
        </div>

        {/* 投放数据 (V3) */}
        <div className="mt-6">
          <MaterialMetricsSection
            consumption={(currentMaterial as any).consumption}
            impressions={(currentMaterial as any).impressions}
            clicks={(currentMaterial as any).clicks}
            ctr={(currentMaterial as any).ctr}
            cpc={(currentMaterial as any).cpc}
            cpm={(currentMaterial as any).cpm}
            conversions={(currentMaterial as any).conversions}
            roi={(currentMaterial as any).roi}
            newUserCost={(currentMaterial as any).newUserCost}
            firstDayPayCount={(currentMaterial as any).firstDayPayCount}
            firstDayPayCost={(currentMaterial as any).firstDayPayCost}
            reportPeriod={(currentMaterial as any).reportPeriod}
          />
        </div>

        {/* 投放信息 + 状态管理 */}
        <div className="mt-6">
          <MaterialLaunchInfo
            materialId={id}
            status={currentMaterial.status}
            platformName={currentMaterial.platformName}
            platformId={currentMaterial.platformId}
            campaignId={currentMaterial.campaignId}
            adAccount={currentMaterial.adAccount}
            launchDate={currentMaterial.launchDate}
          />
        </div>

        {/* 数据追踪 (V2.2.3) */}
        {(currentMaterial.consumption !== undefined || currentMaterial.roi !== undefined || currentMaterial.conversions !== undefined) && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              数据追踪
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">累计消耗</span>
                  </div>
                  <div className="text-xl font-bold text-foreground">
                    {currentMaterial.consumption !== undefined
                      ? (currentMaterial.consumption >= 10000
                        ? `${(currentMaterial.consumption / 10000).toFixed(1)}w`
                        : currentMaterial.consumption.toLocaleString('zh-CN'))
                      : '-'}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">ROI</span>
                  </div>
                  <div className="text-xl font-bold text-foreground">
                    {currentMaterial.roi !== undefined
                      ? `${(currentMaterial.roi * 100).toFixed(1)}%`
                      : '-'}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">转化数</span>
                  </div>
                  <div className="text-xl font-bold text-foreground">
                    {currentMaterial.conversions !== undefined
                      ? currentMaterial.conversions.toLocaleString('zh-CN')
                      : '-'}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">投放日期</span>
                  </div>
                  <div className="text-xl font-bold text-foreground">
                    {currentMaterial.launchDate
                      ? new Date(currentMaterial.launchDate).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
                      : '-'}
                  </div>
                </CardContent>
              </Card>
            </div>
            {/* 数据可视化图表 */}
            <MaterialDataChart
              consumption={currentMaterial.consumption}
              roi={currentMaterial.roi}
              conversions={currentMaterial.conversions}
            />
          </div>
        )}

        {/* 团队评论 */}
        <div className="mt-6">
          <MaterialComments materialId={id} />
        </div>
      </main>
    </div>
  );
}
