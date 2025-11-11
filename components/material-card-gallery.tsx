'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type Material } from '@/data/material.schema';
import { cn, highlightText, getClientAssetUrl, getOptimizedImageUrl } from '@/lib/utils';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface MaterialCardGalleryProps {
  material: Material;
  keyword?: string;
  priority?: boolean;
}

export function MaterialCardGallery({ material, keyword, priority = false }: MaterialCardGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [enlarged, setEnlarged] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const router = useRouter();
  const nameRef = useRef<HTMLHeadingElement>(null);
  const scrollAnimationRef = useRef<number | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 获取所有预览图/视频 URL
  const galleryUrls = useMemo(() => {
    const urls: string[] = [];
    if (material.gallery?.length) {
      urls.push(...material.gallery.filter(Boolean));
    }
    if (material.thumbnail) {
      urls.push(material.thumbnail);
    }
    if (material.src && !urls.includes(material.src)) {
      urls.push(material.src);
    }
    return urls.length ? urls : [''];
  }, [material.gallery, material.src, material.thumbnail]);

  const isVideoUrl = useCallback((url: string): boolean => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.mov') || lower.includes('.avi') || lower.includes('.mkv');
  }, []);

  const imageUrls = galleryUrls.filter((url) => url && !isVideoUrl(url));
  const videoUrls = galleryUrls.filter((url) => url && isVideoUrl(url));
  const currentSource = galleryUrls[currentIndex] || '';
  const currentIsVideo = isVideoUrl(currentSource);
  const currentUrl = currentSource ? (currentIsVideo ? getClientAssetUrl(currentSource) : getOptimizedImageUrl(currentSource)) : '';
  
  const highlightedName = highlightText(material.name, keyword || '');

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

  useEffect(() => {
    galleryUrls.forEach((url, index) => {
      const video = videoRefs.current[index];
      if (!video) return;
      if (index === currentIndex && isHovering && isVideoUrl(url)) {
        video.muted = true;
        video.play().catch(() => {});
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [currentIndex, galleryUrls, isHovering, isVideoUrl]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    setEnlarged(true);
  };

  const validIndex = galleryUrls.length > 0 ? Math.min(currentIndex, galleryUrls.length - 1) : 0;
  const previewWrapperClass = cn(
    'relative w-full overflow-hidden bg-muted flex items-center justify-center cursor-pointer',
    'h-[300px] sm:h-[360px] lg:h-[420px]'
  );

  return (
    <>
      <Card
        className="group overflow-hidden transition-shadow hover:shadow-lg h-full flex flex-col relative border"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
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
                  src={getClientAssetUrl(url)}
                  className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-200 ${
                    index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'
                  }`}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                />
              );
            }
            return null;
          })}
          
          {!currentIsVideo && currentUrl && (
            <Image
              src={currentUrl}
              alt={material.name}
              width={640}
              height={360}
              className="h-full w-full object-contain"
            />
          )}
          
          {!currentUrl && (
            <div className="flex items-center justify-center h-full bg-muted text-muted-foreground z-10">
              <span className="text-sm">无预览图</span>
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
      {enlarged && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setEnlarged(false)}
          onDoubleClick={(e) => {
            if (!currentIsVideo) {
              e.stopPropagation();
              setEnlarged(false);
            }
          }}
        >
          <button
            className="absolute right-4 top-4 text-white hover:bg-white/20 z-50 h-10 w-10 rounded-full flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              setEnlarged(false);
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
                setEnlarged(false);
              }
            }}
          >
            {currentIsVideo ? (
              <video src={currentUrl} controls autoPlay className="h-full w-full object-contain" muted />
            ) : (
              <Image src={currentUrl} alt={material.name} fill className="object-contain" />
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

