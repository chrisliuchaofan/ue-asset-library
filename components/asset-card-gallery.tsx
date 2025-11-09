'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { type Asset } from '@/data/manifest.schema';
import { formatFileSize, formatDuration, highlightText } from '@/lib/utils';
import { ChevronLeft, ChevronRight, ZoomIn, X } from 'lucide-react';

interface AssetCardGalleryProps {
  asset: Asset;
  keyword?: string;
  isSelected?: boolean;
  onToggleSelection?: () => void;
  priority?: boolean; // 是否为优先加载的图片（首屏图片）
}

// 客户端获取 CDN base
function getClientCdnBase(): string {
  if (typeof window === 'undefined') return '/';
  return window.__CDN_BASE__ || process.env.NEXT_PUBLIC_CDN_BASE || '/';
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
        const ossConfig = window.__OSS_CONFIG__;
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

export function AssetCardGallery({ asset, keyword, isSelected, onToggleSelection, priority = false }: AssetCardGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isEnlarged, setIsEnlarged] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  
  // 获取所有预览图/视频 URL
  // 优先使用 gallery，如果没有则使用 thumbnail 和 src
  // 注意：如果 thumbnail 和 src 相同，只使用一个
  const galleryUrls = asset.gallery && asset.gallery.length > 0 
    ? asset.gallery.filter(Boolean) // 过滤空值
    : asset.thumbnail && asset.thumbnail !== asset.src
    ? [asset.thumbnail, asset.src].filter(Boolean)
    : asset.thumbnail
    ? [asset.thumbnail]
    : asset.src
    ? [asset.src]
    : [];
  
  const highlightedName = highlightText(asset.name, keyword || '');

  // 判断单个 URL 是否为视频
  const isVideoUrl = useCallback((url: string): boolean => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return (
      lowerUrl.includes('.mp4') ||
      lowerUrl.includes('.webm') ||
      lowerUrl.includes('.mov') ||
      lowerUrl.includes('.avi') ||
      lowerUrl.includes('.mkv')
    );
  }, []);

  // 自动播放视频（静音）- 当切换到视频时自动播放
  useEffect(() => {
    galleryUrls.forEach((url, index) => {
      const video = videoRefs.current[index];
      const urlIsVideo = isVideoUrl(url);
      
      if (video && urlIsVideo && index === currentIndex) {
        // 当前显示的是视频，自动播放
        video.muted = true;
        video.play().catch((err) => {
          console.warn('视频自动播放失败:', err);
        });
      } else if (video) {
        // 暂停其他视频
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [currentIndex, galleryUrls, isVideoUrl]);

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

  // 确保 currentIndex 在有效范围内
  const validIndex = galleryUrls.length > 0 ? Math.min(currentIndex, galleryUrls.length - 1) : 0;
  const currentUrl = galleryUrls[validIndex] ? getClientAssetUrl(galleryUrls[validIndex]) : '';
  const currentIsVideo = currentUrl ? isVideoUrl(currentUrl) : false;

  return (
    <>
      <Card className="group overflow-hidden transition-shadow hover:shadow-lg h-full flex flex-col relative border">
        {/* 多选复选框 */}
        {onToggleSelection && (
          <div className="absolute top-2 left-2 z-20">
            <Checkbox
              checked={isSelected || false}
              onChange={onToggleSelection}
              onClick={(e) => e.stopPropagation()}
              className="bg-background/80 backdrop-blur-sm"
            />
          </div>
        )}
        {/* 固定大小的预览区域 */}
        <div className="relative aspect-video w-full overflow-hidden bg-muted flex items-center justify-center">
          {/* 渲染所有视频（用于自动播放） */}
          {galleryUrls.map((url, index) => {
            const urlIsVideo = isVideoUrl(url);
            if (urlIsVideo) {
              return (
                <video
                  key={`video-${index}`}
                  ref={(el) => {
                    videoRefs.current[index] = el;
                  }}
                  src={getClientAssetUrl(url)}
                  className={`absolute inset-0 w-full h-full object-contain ${
                    index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'
                  }`}
                  muted
                  loop
                  playsInline
                />
              );
            }
            return null;
          })}
          
          {/* 渲染当前图片（如果当前项是图片） */}
          {!currentIsVideo && currentUrl && (
            <Image
              src={currentUrl}
              alt={`${asset.name} - ${currentIndex + 1}`}
              fill
              className="object-contain transition-opacity z-10"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              loading={priority ? 'eager' : 'lazy'}
              priority={priority}
              unoptimized={currentUrl.startsWith('http') || currentUrl.startsWith('/assets/')}
              onError={(e) => {
                console.error('图片加载失败:', currentUrl);
                // 如果是 OSS 路径但加载失败，尝试重新构建 URL
                if ((currentUrl.startsWith('/assets/') || galleryUrls[validIndex]?.startsWith('/assets/')) && galleryUrls[validIndex]) {
                  const ossConfig = typeof window !== 'undefined' ? window.__OSS_CONFIG__ : null;
                  if (ossConfig && ossConfig.bucket && ossConfig.region) {
                    const ossPath = galleryUrls[validIndex].startsWith('/') 
                      ? galleryUrls[validIndex].substring(1) 
                      : galleryUrls[validIndex];
                    const region = ossConfig.region.replace(/^oss-/, '');
                    const fullUrl = `https://${ossConfig.bucket}.oss-${region}.aliyuncs.com/${ossPath}`;
                    console.warn('尝试使用完整 OSS URL:', fullUrl);
                    // 强制重新加载
                    (e.target as HTMLImageElement).src = fullUrl;
                  } else {
                    console.warn('OSS 路径加载失败，请检查配置');
                  }
                }
              }}
            />
          )}
          
          {/* 如果既没有图片也没有视频 */}
          {!currentUrl && (
            <div className="flex items-center justify-center h-full bg-muted text-muted-foreground z-10">
              <span className="text-sm">无预览图</span>
            </div>
          )}
          
          {/* 左右切换区域（悬停显示，点击范围扩展到左右两边） */}
          {galleryUrls.length > 1 && (
            <>
              {/* 左侧点击区域 */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1/3 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center justify-start pl-2"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handlePrev(e);
                }}
              >
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 bg-background/90 hover:bg-background"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handlePrev(e);
                  }}
                  aria-label="上一张图片"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
              
              {/* 右侧点击区域 */}
              <div
                className="absolute right-0 top-0 bottom-0 w-1/3 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center justify-end pr-2"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleNext(e);
                }}
              >
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 bg-background/90 hover:bg-background"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleNext(e);
                  }}
                  aria-label="下一张图片"
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
            className="absolute bottom-2 right-2 h-8 w-8 bg-background/90 hover:bg-background z-20"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleEnlarge(e);
            }}
            aria-label="放大预览"
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
          
          {/* 点击预览区域跳转到详情页 */}
          <Link 
            href={`/assets/${asset.id}`}
            className="absolute inset-0 z-0"
            onClick={(e) => {
              // 如果点击的是按钮区域，不跳转
              const target = e.target as HTMLElement;
              if (target.closest('button') || target.closest('[role="button"]')) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          />
        </div>
        
        <CardContent className="p-2 sm:p-3 flex-1 flex flex-col">
          <Link href={`/assets/${asset.id}`}>
            <h3
              className="mb-1 line-clamp-2 text-sm sm:text-base font-semibold hover:text-primary transition-colors cursor-pointer"
              dangerouslySetInnerHTML={{ __html: highlightedName }}
            />
          </Link>
          {/* 类型：资产名下方小灰字 */}
          <div className="mb-1.5 text-xs text-muted-foreground">
            {asset.type}
          </div>
          {/* 标签：圆角标签，超出用+N */}
          <div className="mb-1.5 flex flex-wrap gap-1">
            {(() => {
              // 确保 tags 是数组，如果是字符串则拆分（兼容旧数据）
              const tagsArray = Array.isArray(asset.tags)
                ? asset.tags
                : typeof (asset as any).tags === 'string'
                ? (asset as any).tags.split(',').map((t: string) => t.trim()).filter(Boolean)
                : [];
              const displayTags = tagsArray.slice(0, 3);
              return (
                <>
                  {displayTags.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="text-xs rounded-full">
                      {tag}
                    </Badge>
                  ))}
                  {tagsArray.length > 3 && (
                    <Badge variant="secondary" className="text-xs rounded-full">
                      +{tagsArray.length - 3}
                    </Badge>
                  )}
                </>
              );
            })()}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-1">
            <span>
              {(() => {
                const currentUrl = galleryUrls[currentIndex] || asset.src;
                const isVideo = isVideoUrl(currentUrl);
                if (isVideo) {
                  return asset.duration ? formatDuration(asset.duration) : '-';
                } else {
                  return asset.width && asset.height
                    ? `${asset.width} × ${asset.height}`
                    : '-';
                }
              })()}
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
            {currentIsVideo ? (
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

