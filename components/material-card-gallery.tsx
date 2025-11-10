'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type Material } from '@/data/material.schema';
import { highlightText, cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface MaterialCardGalleryProps {
  material: Material;
  keyword?: string;
  priority?: boolean;
}

// 客户端获取 CDN base
function getClientCdnBase(): string {
  if (typeof window === 'undefined') return '/';
  return window.__CDN_BASE__ || process.env.NEXT_PUBLIC_CDN_BASE || '/';
}

// 客户端处理素材 URL
function getClientMaterialUrl(path: string): string {
  if (!path) return '';
  
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  const base = getClientCdnBase();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  if (base === '/' || !base || base.trim() === '') {
    return normalizedPath;
  }
  
  if (normalizedPath.startsWith('/assets/')) {
    if (base === '/' || !base || base.trim() === '') {
      if (typeof window !== 'undefined') {
        const ossConfig = window.__OSS_CONFIG__;
        if (ossConfig && ossConfig.bucket && ossConfig.region) {
          const ossPath = normalizedPath.substring(1);
          const region = ossConfig.region.replace(/^oss-/, '');
          return `https://${ossConfig.bucket}.oss-${region}.aliyuncs.com/${ossPath}`;
        }
      }
      return normalizedPath;
    }
    const ossPath = normalizedPath.substring(1);
    return `${base.replace(/\/+$/, '')}/${ossPath}`;
  }
  
  return `${base.replace(/\/+$/, '')}${normalizedPath}`;
}

export function MaterialCardGallery({ material, keyword, priority = false }: MaterialCardGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isEnlarged, setIsEnlarged] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const nameRef = useRef<HTMLHeadingElement>(null);
  const scrollAnimationRef = useRef<number | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 获取所有预览图/视频 URL
  const galleryUrls = material.gallery && material.gallery.length > 0 
    ? material.gallery.filter(Boolean)
    : material.thumbnail && material.thumbnail !== material.src
    ? [material.thumbnail, material.src].filter(Boolean)
    : material.thumbnail
    ? [material.thumbnail]
    : material.src
    ? [material.src]
    : [];
  
  const highlightedName = highlightText(material.name, keyword || '');

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

  // 自动播放视频
  useEffect(() => {
    galleryUrls.forEach((url, index) => {
      const video = videoRefs.current[index];
      const urlIsVideo = isVideoUrl(url);
      
      if (video && urlIsVideo && index === currentIndex) {
        video.muted = true;
        video.play().catch((err) => {
          console.warn('视频自动播放失败:', err);
        });
      } else if (video) {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [currentIndex, galleryUrls, isVideoUrl]);

  // 自动滚动播放超长名称
  useEffect(() => {
    const nameElement = nameRef.current;
    if (!nameElement) return;

    const needsScroll = nameElement.scrollWidth > nameElement.clientWidth;
    
    if (!needsScroll) {
      nameElement.scrollLeft = 0;
      return;
    }

    if (scrollAnimationRef.current) {
      cancelAnimationFrame(scrollAnimationRef.current);
      scrollAnimationRef.current = null;
    }

    let scrollPosition = nameElement.scrollLeft || 0;
    let direction = 1;
    const scrollSpeed = 0.5;
    const pauseDuration = 2000;
    let pauseTime = Date.now() + pauseDuration;
    let isPaused = false;

    const animate = () => {
      if (isPaused) {
        scrollAnimationRef.current = requestAnimationFrame(animate);
        return;
      }

      const now = Date.now();
      
      if (now < pauseTime) {
        scrollAnimationRef.current = requestAnimationFrame(animate);
        return;
      }

      scrollPosition += scrollSpeed * direction;
      const maxScroll = nameElement.scrollWidth - nameElement.clientWidth;

      if (scrollPosition >= maxScroll) {
        scrollPosition = maxScroll;
        direction = -1;
        pauseTime = now + pauseDuration;
      } else if (scrollPosition <= 0) {
        scrollPosition = 0;
        direction = 1;
        pauseTime = now + pauseDuration;
      }

      nameElement.scrollLeft = scrollPosition;
      scrollAnimationRef.current = requestAnimationFrame(animate);
    };

    const startDelay = setTimeout(() => {
      if (!isPaused) {
        scrollAnimationRef.current = requestAnimationFrame(animate);
      }
    }, 1000);

    const handleMouseEnter = () => {
      isPaused = true;
    };

    const handleMouseLeave = () => {
      isPaused = false;
      pauseTime = Date.now() + pauseDuration;
    };

    nameElement.addEventListener('mouseenter', handleMouseEnter);
    nameElement.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      clearTimeout(startDelay);
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current);
      }
      nameElement.removeEventListener('mouseenter', handleMouseEnter);
      nameElement.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [material.name, highlightedName]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
    };
  }, []);

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

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    setIsEnlarged(true);
  };

  const validIndex = galleryUrls.length > 0 ? Math.min(currentIndex, galleryUrls.length - 1) : 0;
  const currentUrl = galleryUrls[validIndex] ? getClientMaterialUrl(galleryUrls[validIndex]) : '';
  const currentIsVideo = currentUrl ? isVideoUrl(currentUrl) : false;
  const previewWrapperClass = cn(
    'relative w-full overflow-hidden bg-muted flex items-center justify-center cursor-pointer',
    'h-[300px] sm:h-[360px] lg:h-[420px]'
  );

  return (
    <>
      <Card className="group overflow-hidden transition-shadow hover:shadow-lg h-full flex flex-col relative border">
        <div
          className={previewWrapperClass}
          onDoubleClick={handleDoubleClick}
        >
          {galleryUrls.map((url, index) => {
            const urlIsVideo = isVideoUrl(url);
            if (urlIsVideo) {
              return (
                <video
                  key={`video-${index}`}
                  ref={(el) => {
                    videoRefs.current[index] = el;
                  }}
                  src={getClientMaterialUrl(url)}
                  className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-200 ${
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
          
          {!currentIsVideo && currentUrl && (
            <Image
              src={currentUrl}
              alt={`${material.name} - ${currentIndex + 1}`}
              fill
              className="object-contain transition-opacity duration-200 z-10"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              loading={priority ? 'eager' : 'lazy'}
              priority={priority}
              unoptimized={currentUrl.startsWith('http') || currentUrl.startsWith('/assets/')}
            />
          )}
          
          {!currentUrl && (
            <div className="flex items-center justify-center h-full bg-muted text-muted-foreground z-10">
              <span className="text-sm">无预览图</span>
            </div>
          )}
          
          {galleryUrls.length > 1 && (
            <>
              <div
                className="absolute left-0 top-0 bottom-0 w-1/3 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center justify-start pl-2"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handlePrev(e);
                }}
              >
                <button
                  className="h-8 w-8 bg-background/90 hover:bg-background rounded border flex items-center justify-center"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handlePrev(e);
                  }}
                  aria-label="上一张"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>
              
              <div
                className="absolute right-0 top-0 bottom-0 w-1/3 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center justify-end pr-2"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleNext(e);
                }}
              >
                <button
                  className="h-8 w-8 bg-background/90 hover:bg-background rounded border flex items-center justify-center"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleNext(e);
                  }}
                  aria-label="下一张"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
          
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
          
          <Link 
            href={`/materials/${material.id}`}
            className="absolute inset-0 z-0"
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (target.closest('button') || target.closest('[role="button"]')) {
                e.preventDefault();
                e.stopPropagation();
                return;
              }
              
              e.preventDefault();
              if (clickTimeoutRef.current) {
                clearTimeout(clickTimeoutRef.current);
              }
              clickTimeoutRef.current = setTimeout(() => {
                window.location.href = `/materials/${material.id}`;
                clickTimeoutRef.current = null;
              }, 300);
            }}
          />
        </div>
        
        <CardContent className="p-2 sm:p-2.5 sm:p-3 flex-1 flex flex-col relative">
          <Link href={`/materials/${material.id}`} className="block">
            <h3
              ref={nameRef}
              className="mb-1 sm:mb-1.5 text-[12px] sm:text-[13px] md:text-[14px] font-medium leading-tight hover:text-primary transition-colors cursor-pointer whitespace-nowrap overflow-x-auto scrollbar-hide"
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
              dangerouslySetInnerHTML={{ __html: highlightedName }}
            />
          </Link>
          <div className="mb-1.5 sm:mb-2 space-y-1">
            {/* 第一行：类型 */}
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary" className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-full font-normal">
                {material.type}
              </Badge>
            </div>
            {/* 第二行：标签 */}
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary" className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-full font-normal">
                {material.tag}
              </Badge>
            </div>
            {/* 第三行：质量 */}
            <div className="flex flex-wrap gap-1">
              {material.quality.map((q) => (
                <Badge key={q} variant="outline" className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-full font-normal">
                  {q}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 放大预览模态框 */}
      {isEnlarged && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setIsEnlarged(false)}
          onDoubleClick={(e) => {
            if (!currentIsVideo) {
              e.stopPropagation();
              setIsEnlarged(false);
            }
          }}
        >
          <button
            className="absolute right-4 top-4 text-white hover:bg-white/20 z-50 h-10 w-10 rounded-full flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              setIsEnlarged(false);
            }}
          >
            <X className="h-6 w-6" />
          </button>
          <div 
            className="relative h-full w-full max-w-7xl" 
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => {
              if (!currentIsVideo) {
                e.stopPropagation();
                setIsEnlarged(false);
              }
            }}
          >
            {currentIsVideo ? (
              <div className="relative w-full h-full">
                <video
                  src={currentUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                  muted={false}
                />
              </div>
            ) : (
              <Image
                src={currentUrl}
                alt={`${material.name} - ${currentIndex + 1}`}
                fill
                className="object-contain"
                sizes="100vw"
                unoptimized={currentUrl.startsWith('http')}
              />
            )}
            {galleryUrls.length > 1 && (
              <>
                <button
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 bg-white/20 hover:bg-white/30 text-white border border-white/30 rounded-full z-40"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : galleryUrls.length - 1));
                  }}
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 bg-white/20 hover:bg-white/30 text-white border border-white/30 rounded-full z-40"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex((prev) => (prev < galleryUrls.length - 1 ? prev + 1 : 0));
                  }}
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-40">
                  {galleryUrls.map((_, index) => (
                    <button
                      key={index}
                      className={`h-2 rounded-full transition-all ${
                        index === currentIndex
                          ? 'w-6 bg-white'
                          : 'w-2 bg-white/50 hover:bg-white/70'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentIndex(index);
                      }}
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

