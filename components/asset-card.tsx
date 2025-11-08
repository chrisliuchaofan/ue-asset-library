'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type Asset } from '@/data/manifest.schema';
import { formatFileSize, formatDuration, highlightText } from '@/lib/utils';
import { Play } from 'lucide-react';

interface AssetCardProps {
  asset: Asset;
  keyword?: string;
}

// 客户端获取 CDN base
function getClientCdnBase(): string {
  if (typeof window === 'undefined') return '/';
  return (window as any).__CDN_BASE__ || process.env.NEXT_PUBLIC_CDN_BASE || '/';
}

// 客户端处理资产 URL
function getClientAssetUrl(path: string): string {
  if (!path) return '';
  
  // 如果已经是完整 URL，直接返回
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  const base = getClientCdnBase();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // 如果 base 是 /，直接返回路径（本地模式）
  if (base === '/' || !base || base.trim() === '') {
    // 如果路径是 OSS 路径，尝试构建完整 URL
    if (normalizedPath.startsWith('/assets/')) {
      if (typeof window !== 'undefined') {
        const ossConfig = (window as any).__OSS_CONFIG__;
        if (ossConfig && ossConfig.bucket && ossConfig.region) {
          const ossPath = normalizedPath.substring(1);
          const region = ossConfig.region.replace(/^oss-/, '');
          return `https://${ossConfig.bucket}.oss-${region}.aliyuncs.com/${ossPath}`;
        }
      }
    }
    return normalizedPath;
  }
  
  // 拼接 CDN base
  return `${base.replace(/\/+$/, '')}${normalizedPath}`;
}

export function AssetCard({ asset, keyword }: AssetCardProps) {
  const thumbnailUrl = getClientAssetUrl(asset.thumbnail);
  const highlightedName = highlightText(asset.name, keyword || '');

  return (
    <Link href={`/assets/${asset.id}`}>
      <Card className="group overflow-hidden transition-shadow hover:shadow-lg">
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          {asset.type === 'video' ? (
            <>
              {thumbnailUrl ? (
                <Image
                  src={thumbnailUrl}
                  alt={asset.name}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  unoptimized={thumbnailUrl.startsWith('http')}
                  onError={(e) => {
                    console.error('视频缩略图加载失败:', thumbnailUrl);
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-muted">
                  <Play className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="rounded-full bg-white/90 p-3">
                  <Play className="h-6 w-6 text-foreground" fill="currentColor" />
                </div>
              </div>
            </>
          ) : (
            <>
              {thumbnailUrl ? (
                <Image
                  src={thumbnailUrl}
                  alt={asset.name}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  unoptimized={thumbnailUrl.startsWith('http')}
                  onError={(e) => {
                    // 图片加载失败时的处理
                    console.error('图片加载失败:', thumbnailUrl);
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-muted text-muted-foreground">
                  <span className="text-sm">无预览图</span>
                </div>
              )}
            </>
          )}
        </div>
        <CardContent className="p-4">
          <h3
            className="mb-2 line-clamp-2 font-semibold"
            dangerouslySetInnerHTML={{ __html: highlightedName }}
          />
          <div className="mb-2 flex flex-wrap gap-1">
            {asset.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {asset.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{asset.tags.length - 3}
              </Badge>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {asset.type === 'image'
                ? asset.width && asset.height
                  ? `${asset.width} × ${asset.height}`
                  : '-'
                : asset.duration
                  ? formatDuration(asset.duration)
                  : '-'}
            </span>
            {asset.filesize && <span>{formatFileSize(asset.filesize)}</span>}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

