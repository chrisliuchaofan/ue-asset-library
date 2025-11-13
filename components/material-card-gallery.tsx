'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  const [isHoveringPreview, setIsHoveringPreview] = useState(false);
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const router = useRouter();
  const nameRef = useRef<HTMLHeadingElement>(null);
  const scrollAnimationRef = useRef<number | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const extractingFrameRef = useRef(false);
  const lastVideoUrlRef = useRef<string | null>(null);
  
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

  const imageUrls = useMemo(
    () => galleryUrls.filter((url) => url && !isVideoUrl(url)),
    [galleryUrls, isVideoUrl]
  );

  const videoUrls = useMemo(
    () => galleryUrls.filter((url) => url && isVideoUrl(url)),
    [galleryUrls, isVideoUrl]
  );

  // 稳定第一个视频 URL 的引用
  const firstVideoUrl = useMemo(() => videoUrls[0] || null, [videoUrls]);

  // 当只有视频时，从第一个视频中提取首帧作为预览图
  useEffect(() => {
    const shouldExtract = imageUrls.length === 0 && firstVideoUrl !== null;
    
    if (!shouldExtract) {
      if (lastVideoUrlRef.current !== null) {
        setVideoThumbnail(null);
        lastVideoUrlRef.current = null;
        extractingFrameRef.current = false;
      }
      return;
    }

    if (extractingFrameRef.current || lastVideoUrlRef.current === firstVideoUrl) {
      return;
    }

    extractingFrameRef.current = true;
    lastVideoUrlRef.current = firstVideoUrl;

    const extractFirstFrame = async () => {
      try {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          extractingFrameRef.current = false;
          return;
        }

        const videoUrl = getClientAssetUrl(firstVideoUrl);
        const isCrossOrigin = videoUrl.startsWith('http://') || videoUrl.startsWith('https://');
        
        if (isCrossOrigin) {
          video.crossOrigin = 'anonymous';
        }
        
        video.preload = 'metadata';
        video.src = videoUrl;

        await new Promise<void>((resolve, reject) => {
          let timeoutId: NodeJS.Timeout | null = null;
          let resolved = false;
          
          const cleanup = () => {
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
            video.onloadedmetadata = null;
            video.onerror = null;
          };

          const handleSuccess = () => {
            if (!resolved) {
              resolved = true;
              cleanup();
              resolve();
            }
          };

          const handleError = (errorMsg: string) => {
            if (!resolved) {
              resolved = true;
              cleanup();
              reject(new Error(errorMsg));
            }
          };

          video.onloadedmetadata = handleSuccess;
          video.onerror = () => handleError('视频加载失败');
          
          timeoutId = setTimeout(() => {
            if (!resolved && video.readyState < 2) {
              handleError('视频加载超时');
            }
          }, 10000);
        });

        const duration = video.duration;
        if (!duration || !isFinite(duration)) {
          extractingFrameRef.current = false;
          return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // 提取首帧（0.1秒位置，避免黑屏）
        video.currentTime = Math.min(0.1, duration * 0.1);
        
        await new Promise<void>((resolve) => {
          video.onseeked = () => {
            try {
              ctx.drawImage(video, 0, 0);
              
              try {
                canvas.toBlob(
                  (blob) => {
                    if (blob) {
                      const url = URL.createObjectURL(blob);
                      setVideoThumbnail(url);
                    }
                    extractingFrameRef.current = false;
                    resolve();
                  },
                  'image/jpeg',
                  0.8
                );
              } catch (blobError: any) {
                if (blobError.name === 'SecurityError' || blobError.message?.includes('Tainted')) {
                  if (process.env.NODE_ENV !== 'production') {
                    console.warn('无法提取视频帧（CORS 限制）');
                  }
                }
                extractingFrameRef.current = false;
                resolve();
              }
            } catch (drawError) {
              extractingFrameRef.current = false;
              resolve();
            }
          };
        });
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('提取视频帧失败:', error);
        }
        setVideoThumbnail(null);
        extractingFrameRef.current = false;
        lastVideoUrlRef.current = null;
      }
    };

    // 延迟执行视频帧提取，优先保证首屏渲染
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      requestIdleCallback(() => {
        setTimeout(() => {
          extractFirstFrame();
        }, 2000);
      }, { timeout: 3000 });
    } else {
      setTimeout(() => {
        extractFirstFrame();
      }, 3000);
    }
  }, [imageUrls.length, firstVideoUrl]);

  // 根据实际显示尺寸优化图片宽度
  const [imageWidth, setImageWidth] = useState(400);
  useEffect(() => {
    const updateImageWidth = () => {
      if (typeof window === 'undefined') return;
      const viewportWidth = window.innerWidth;
      let cardWidth = 300; // 默认值，缩小了
      if (viewportWidth >= 1536) cardWidth = 240; // 2xl: 7列
      else if (viewportWidth >= 1280) cardWidth = 260; // xl: 6列
      else if (viewportWidth >= 1024) cardWidth = 280; // lg: 5列
      else if (viewportWidth >= 768) cardWidth = 300; // md: 4列
      else if (viewportWidth >= 640) cardWidth = 360; // sm: 3列
      else cardWidth = 400; // 2列
      setImageWidth(Math.min(Math.ceil(cardWidth * 1.5), 500));
    };
    
    updateImageWidth();
    window.addEventListener('resize', updateImageWidth);
    return () => window.removeEventListener('resize', updateImageWidth);
  }, []);

  // 智能缩放：根据卡片宽度动态计算高度
  const [cardWidth, setCardWidth] = useState(300);
  useEffect(() => {
    const updateCardWidth = () => {
      if (typeof window === 'undefined') return;
      const viewportWidth = window.innerWidth;
      let width = 300;
      if (viewportWidth >= 1536) width = 240;
      else if (viewportWidth >= 1280) width = 260;
      else if (viewportWidth >= 1024) width = 280;
      else if (viewportWidth >= 768) width = 300;
      else if (viewportWidth >= 640) width = 360;
      else width = 400;
      setCardWidth(width);
    };
    
    updateCardWidth();
    window.addEventListener('resize', updateCardWidth);
    return () => window.removeEventListener('resize', updateCardWidth);
  }, []);

  const baseCardWidth = 300;
  const basePreviewHeight = 200; // 预览区域基准高度
  
  const currentSource = galleryUrls[currentIndex] || '';
  const currentIsVideo = isVideoUrl(currentSource);
  
  const currentUrl = currentSource ? (currentIsVideo ? getClientAssetUrl(currentSource) : getOptimizedImageUrl(currentSource, imageWidth)) : '';
  
  const highlightedName = highlightText(material.name, keyword || '');
  
  const widthRatio = cardWidth / baseCardWidth;
  const previewAreaHeight = Math.floor(basePreviewHeight * widthRatio);
  
  // 计算卡片总高度（预览区域 + 文字区域）
  // 文字区域占卡片总高度的30%
  // 设总高度为 H，预览区域 = H * 0.7，文字区域 = H * 0.3
  // 所以 H = 预览区域 / 0.7
  const totalCardHeight = Math.floor(previewAreaHeight / 0.7);
  const textAreaHeight = Math.floor(totalCardHeight * 0.3);

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

  // 清理定时器和视频首帧 blob URL
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      if (videoThumbnail && videoThumbnail.startsWith('blob:')) {
        URL.revokeObjectURL(videoThumbnail);
      }
    };
  }, [videoThumbnail]);

  // 悬停时才播放视频（预览图区域）
  useEffect(() => {
    galleryUrls.forEach((url, index) => {
      const video = videoRefs.current[index];
      if (!video) return;
      if (index === currentIndex && isHoveringPreview && isVideoUrl(url)) {
        // 确保视频已加载元数据后再播放，避免黑屏
        if (video.readyState >= 2) {
          video.muted = true;
          video.play().catch(() => {});
        } else {
          video.load();
          video.onloadeddata = () => {
            video.muted = true;
            video.play().catch(() => {});
          };
        }
      } else {
        video.pause();
        // 不重置 currentTime，保持视频位置，避免切换时的闪烁
      }
    });
  }, [currentIndex, galleryUrls, isHoveringPreview, isVideoUrl]);


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

  return (
    <>
      <Card
        className="group overflow-hidden transition-shadow hover:shadow-lg h-full flex flex-col relative border"
        style={{ height: totalCardHeight }}
      >
        {/* 预览区域 */}
        <div
          className="relative w-full overflow-hidden bg-muted flex items-center justify-center cursor-pointer"
          style={{ height: previewAreaHeight }}
          onDoubleClick={handleDoubleClick}
          onMouseEnter={() => setIsHoveringPreview(true)}
          onMouseLeave={() => setIsHoveringPreview(false)}
        >
          {galleryUrls.map((url, index) => {
            if (!isVideoUrl(url)) {
              return null;
            }
            return (
              <video
                key={`video-${index}`}
                ref={(el) => {
                  videoRefs.current[index] = el;
                }}
                src={getClientAssetUrl(url)}
                preload="metadata"
                className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${
                  index === currentIndex && isHoveringPreview ? 'z-20 opacity-100' : 'pointer-events-none opacity-0 z-0'
                }`}
                muted
                loop
                playsInline
                onLoadedData={() => {
                  // 视频加载完成后，如果正在悬停，立即播放
                  if (index === currentIndex && isHoveringPreview) {
                    const video = videoRefs.current[index];
                    if (video) {
                      video.play().catch(() => {});
                    }
                  }
                }}
              />
            );
          })}
          
          {/* 显示图片或视频首帧 */}
          {!currentIsVideo && currentUrl && (
            <Image
              src={currentUrl}
              alt={material.name}
              fill
              className="z-10 object-contain"
              loading={priority ? 'eager' : 'lazy'}
              priority={priority}
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, (max-width: 1536px) 16vw, 14vw"
              unoptimized={currentUrl.includes('x-oss-process=image')}
            />
          )}
          
          {/* 当只有视频时，显示视频首帧作为预览图（始终显示，视频在悬停时覆盖） */}
          {currentIsVideo && videoThumbnail && (
            <Image
              src={videoThumbnail}
              alt={material.name}
              fill
              className={`z-10 object-contain transition-opacity duration-300 ${
                isHoveringPreview ? 'opacity-0' : 'opacity-100'
              }`}
              loading="lazy"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, (max-width: 1536px) 16vw, 14vw"
            />
          )}
          
          {!currentUrl && !videoThumbnail && (
            <div className="flex items-center justify-center h-full bg-muted text-muted-foreground z-10">
              <span className="text-sm">无预览图</span>
            </div>
          )}
          
          {galleryUrls.length > 1 && (
            <>
              <div
                className="absolute left-0 top-0 bottom-0 z-20 flex w-1/3 cursor-pointer items-center justify-start pl-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCurrentIndex((prev) => (prev > 0 ? prev - 1 : galleryUrls.length - 1));
                }}
              >
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6 rounded-full border-white/60 bg-background/80 hover:bg-background"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : galleryUrls.length - 1));
                  }}
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
              </div>
              <div
                className="absolute right-0 top-0 bottom-0 z-20 flex w-1/3 cursor-pointer items-center justify-end pr-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCurrentIndex((prev) => (prev < galleryUrls.length - 1 ? prev + 1 : 0));
                }}
              >
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6 rounded-full border-white/60 bg-background/80 hover:bg-background"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCurrentIndex((prev) => (prev < galleryUrls.length - 1 ? prev + 1 : 0));
                  }}
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
              <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1">
                {galleryUrls.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1 rounded-full transition-all ${
                      index === validIndex ? 'w-3 bg-primary' : 'w-1 bg-background/50'
                    }`}
                  />
                ))}
              </div>
            </>
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
              
              if (clickTimeoutRef.current) {
                clearTimeout(clickTimeoutRef.current);
              }
              clickTimeoutRef.current = setTimeout(() => {
                router.push(`/materials/${material.id}`);
                clickTimeoutRef.current = null;
              }, 300);
            }}
          />
        </div>
        
        <CardContent 
          className="flex flex-col relative overflow-hidden justify-center"
          style={{ 
            height: textAreaHeight,
            padding: `${Math.floor(textAreaHeight * 0.1)}px ${Math.floor(textAreaHeight * 0.08)}px`
          }}
        >
          <Link href={`/materials/${material.id}`} className="block flex-shrink-0">
            <h3
              ref={nameRef}
              className="font-medium leading-tight hover:text-primary transition-colors cursor-pointer whitespace-nowrap overflow-x-auto scrollbar-hide"
              style={{ 
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontSize: `${Math.floor(textAreaHeight * 0.15)}px`,
                marginBottom: `${Math.floor(textAreaHeight * 0.08)}px`
              }}
              dangerouslySetInnerHTML={{ __html: highlightedName }}
            />
          </Link>
          <div className="flex-shrink-0 space-y-0.5" style={{ marginBottom: `${Math.floor(textAreaHeight * 0.05)}px` }}>
            {/* 第一行：类型 */}
            <div className="flex flex-wrap gap-0.5">
              <Badge 
                variant="secondary" 
                className="rounded-full font-normal"
                style={{
                  fontSize: `${Math.floor(textAreaHeight * 0.12)}px`,
                  padding: `${Math.floor(textAreaHeight * 0.04)}px ${Math.floor(textAreaHeight * 0.08)}px`
                }}
              >
                {material.type}
              </Badge>
            </div>
            {/* 第二行：标签 */}
            <div className="flex flex-wrap gap-0.5">
              <Badge 
                variant="secondary" 
                className="rounded-full font-normal"
                style={{
                  fontSize: `${Math.floor(textAreaHeight * 0.12)}px`,
                  padding: `${Math.floor(textAreaHeight * 0.04)}px ${Math.floor(textAreaHeight * 0.08)}px`
                }}
              >
                {material.tag}
              </Badge>
            </div>
            {/* 第三行：质量 */}
            <div className="flex flex-wrap gap-0.5">
              {material.quality.map((q) => (
                <Badge 
                  key={q} 
                  variant="outline" 
                  className="rounded-full font-normal"
                  style={{
                    fontSize: `${Math.floor(textAreaHeight * 0.12)}px`,
                    padding: `${Math.floor(textAreaHeight * 0.04)}px ${Math.floor(textAreaHeight * 0.08)}px`
                  }}
                >
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
              <Image 
                src={currentUrl} 
                alt={material.name} 
                fill 
                className="object-contain"
                sizes="100vw"
                priority
                unoptimized={currentUrl.includes('x-oss-process=image')}
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

