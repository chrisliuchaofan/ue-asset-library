'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { type Asset } from '@/data/manifest.schema';
import { formatFileSize, formatDuration, highlightText } from '@/lib/utils';
import { ChevronLeft, ChevronRight, ZoomIn, X } from 'lucide-react';

interface AssetCardGalleryProps {
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
    return normalizedPath;
  }
  
  // 如果路径以 /assets/ 开头（OSS 模式），需要特殊处理
  // 因为 OSS 上传的路径可能是 assets/xxx 或 /assets/xxx
  if (normalizedPath.startsWith('/assets/')) {
    // 如果 base 是 / 或空，说明是本地模式，但路径是 OSS 路径
    // 这种情况下，尝试从 window 获取 OSS 配置来构建完整 URL
    if (base === '/' || !base || base.trim() === '') {
      // 尝试从 window 获取 OSS 配置（如果可用）
      if (typeof window !== 'undefined') {
        const ossConfig = (window as any).__OSS_CONFIG__;
        if (ossConfig && ossConfig.bucket && ossConfig.region) {
          const ossPath = normalizedPath.substring(1); // 移除开头的 /
          const region = ossConfig.region.replace(/^oss-/, ''); // 移除开头的 oss-（如果有）
          return `https://${ossConfig.bucket}.oss-${region}.aliyuncs.com/${ossPath}`;
        }
      }
      // 如果无法获取 OSS 配置，返回原路径（会显示错误，但至少不会崩溃）
      console.warn('检测到 OSS 路径但 CDN base 和 OSS 配置未设置，无法构建完整 URL:', normalizedPath);
      return normalizedPath;
    }
    // 移除开头的 /，因为 CDN base 通常已经包含路径分隔符
    const ossPath = normalizedPath.substring(1);
    return `${base.replace(/\/+$/, '')}/${ossPath}`;
  }
  
  // 其他情况：拼接 CDN base
  return `${base.replace(/\/+$/, '')}${normalizedPath}`;
}

export function AssetCardGallery({ asset, keyword }: AssetCardGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isEnlarged, setIsEnlarged] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  
  // 获取所有预览图/视频 URL
  // 优先使用 gallery，如果没有则使用 thumbnail 和 src
  const galleryUrls = asset.gallery && asset.gallery.length > 0 
    ? asset.gallery 
    : asset.thumbnail 
    ? [asset.thumbnail, asset.src].filter(Boolean)
    : [asset.src].filter(Boolean);
  
  const highlightedName = highlightText(asset.name, keyword || '');

  // 自动播放视频（静音）
  useEffect(() => {
    galleryUrls.forEach((url, index) => {
      const video = videoRefs.current[index];
      if (video && asset.type === 'video' && index === currentIndex) {
        video.muted = true;
        video.play().catch((err) => {
          console.warn('视频自动播放失败:', err);
        });
      } else if (video && index !== currentIndex) {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [currentIndex, galleryUrls, asset.type]);

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : galleryUrls.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev < galleryUrls.length - 1 ? prev + 1 : 0));
  };

  const handleEnlarge = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEnlarged(true);
  };

  const currentUrl = galleryUrls[currentIndex] ? getClientAssetUrl(galleryUrls[currentIndex]) : '';
  const isVideo = currentUrl && (
    currentUrl.includes('.mp4') ||
    currentUrl.includes('.webm') ||
    currentUrl.includes('.mov') ||
    asset.type === 'video'
  );

  return (
    <>
      <Card className="group overflow-hidden transition-shadow hover:shadow-lg h-full flex flex-col">
        {/* 固定大小的预览区域 */}
        <div className="relative aspect-video w-full overflow-hidden bg-muted flex items-center justify-center">
          {isVideo ? (
            <>
              {/* 视频自动播放层 */}
              {galleryUrls.map((url, index) => (
                <video
                  key={index}
                  ref={(el) => {
                    videoRefs.current[index] = el;
                  }}
                  src={getClientAssetUrl(url)}
                  className={`absolute inset-0 w-full h-full object-contain ${
                    index === currentIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                  muted
                  loop
                  playsInline
                />
              ))}
            </>
          ) : (
            <>
              {currentUrl ? (
                <Image
                  src={currentUrl}
                  alt={`${asset.name} - ${currentIndex + 1}`}
                  fill
                  className="object-contain transition-opacity"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  unoptimized={currentUrl.startsWith('http') || currentUrl.startsWith('/assets/')}
                  onError={(e) => {
                    console.error('图片加载失败:', currentUrl);
                    // 如果是 OSS 路径但加载失败，可能是 CDN base 配置问题
                    if (currentUrl.startsWith('/assets/')) {
                      console.warn('OSS 路径加载失败，请检查 NEXT_PUBLIC_CDN_BASE 配置');
                    }
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-muted text-muted-foreground">
                  <span className="text-sm">无预览图</span>
                </div>
              )}
            </>
          )}
          
          {/* 左右切换区域（悬停显示，点击范围扩展到左右两边） */}
          {galleryUrls.length > 1 && (
            <>
              {/* 左侧点击区域 */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1/3 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-start pl-2"
                onClick={handlePrev}
              >
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 bg-background/90 hover:bg-background"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrev(e);
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
              
              {/* 右侧点击区域 */}
              <div
                className="absolute right-0 top-0 bottom-0 w-1/3 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-end pr-2"
                onClick={handleNext}
              >
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 bg-background/90 hover:bg-background"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNext(e);
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
          
          {/* 放大按钮 */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute bottom-2 right-2 h-8 w-8 bg-background/90 hover:bg-background z-10"
            onClick={handleEnlarge}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          
          {/* 指示器（多图/视频时显示） */}
          {galleryUrls.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
              {galleryUrls.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 rounded-full transition-all ${
                    index === currentIndex
                      ? 'w-4 bg-primary'
                      : 'w-1.5 bg-background/50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
        
        <CardContent className="p-4 flex-1 flex flex-col">
          <Link href={`/assets/${asset.id}`}>
            <h3
              className="mb-2 line-clamp-2 font-semibold hover:text-primary transition-colors"
              dangerouslySetInnerHTML={{ __html: highlightedName }}
            />
          </Link>
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
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto">
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

      {/* 放大预览模态框 */}
      {isEnlarged && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setIsEnlarged(false)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 text-white hover:bg-white/20"
            onClick={() => setIsEnlarged(false)}
          >
            <X className="h-6 w-6" />
          </Button>
          <div className="relative h-full w-full max-w-7xl" onClick={(e) => e.stopPropagation()}>
            {isVideo ? (
              <video
                src={currentUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
                muted={false}
              />
            ) : (
              <Image
                src={currentUrl}
                alt={`${asset.name} - ${currentIndex + 1}`}
                fill
                className="object-contain"
                sizes="100vw"
                unoptimized={currentUrl.startsWith('http')}
              />
            )}
            {/* 大图模式下的切换按钮 */}
            {galleryUrls.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 bg-white/20 hover:bg-white/30 text-white border-white/30"
                  onClick={() => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : galleryUrls.length - 1))}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 bg-white/20 hover:bg-white/30 text-white border-white/30"
                  onClick={() => setCurrentIndex((prev) => (prev < galleryUrls.length - 1 ? prev + 1 : 0))}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
                {/* 指示器 */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {galleryUrls.map((_, index) => (
                    <button
                      key={index}
                      className={`h-2 rounded-full transition-all ${
                        index === currentIndex
                          ? 'w-6 bg-white'
                          : 'w-2 bg-white/50 hover:bg-white/70'
                      }`}
                      onClick={() => setCurrentIndex(index)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

