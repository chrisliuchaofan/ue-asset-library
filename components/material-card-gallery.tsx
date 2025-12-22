'use client';

import { useState, useMemo, useCallback, useRef, useEffect, memo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { type Material } from '@/data/material.schema';
import { cn, highlightText, getClientAssetUrl, getOptimizedImageUrl } from '@/lib/utils';
import { ChevronLeft, ChevronRight, X, Eye, BarChart3, Loader2, RefreshCw } from 'lucide-react';
import { MaterialDetailDialog } from '@/components/material-detail-dialog';

type ThumbSize = 'compact' | 'expanded';

interface MaterialCardGalleryProps {
  material: Material;
  keyword?: string;
  priority?: boolean;
  thumbSize?: ThumbSize;
}

// thumbSize 对应的卡片宽度（像素）
// 移动端使用更小的宽度
const getThumbSizeWidth = (thumbSize: ThumbSize, isMobile: boolean = false): number => {
  if (isMobile) {
    return thumbSize === 'compact' ? 140 : 240;
  }
  return thumbSize === 'compact' ? 180 : 320;
};

// 性能优化：使用 memo 减少不必要的重渲染
function MaterialCardGalleryComponent({ material, keyword, priority = false, thumbSize = 'compact' }: MaterialCardGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [enlarged, setEnlarged] = useState(false);
  const [isHoveringPreview, setIsHoveringPreview] = useState(false);
  const [isHoveringCard, setIsHoveringCard] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);
  const [videoThumbnails, setVideoThumbnails] = useState<string[]>([]); // 多帧预览图
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const router = useRouter();
  const nameRef = useRef<HTMLHeadingElement>(null);
  const scrollAnimationRef = useRef<number | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const extractingFrameRef = useRef(false);
  const lastVideoUrlRef = useRef<string | null>(null);
  
  // 检测是否为移动端
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    
    // 性能优化：使用防抖处理 resize 事件，避免频繁触发
    let timeoutId: NodeJS.Timeout | null = null;
    const debouncedCheckMobile = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        checkMobile();
      }, 150); // 150ms 防抖延迟
    };
    
    window.addEventListener('resize', debouncedCheckMobile, { passive: true });
    return () => {
      window.removeEventListener('resize', debouncedCheckMobile);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);
  
  // AI 分析相关状态
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<{ description: string; tags?: string[] } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [savedAnalysis, setSavedAnalysis] = useState<string | null>(null);
  
  const isVideoUrl = useCallback((url: string): boolean => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.mov') || lower.includes('.avi') || lower.includes('.mkv');
  }, []);

  // 简化逻辑：每个素材卡只显示一个内容，优先视频
  // 1. 如果有视频，只显示视频（不显示缩略图）
  // 2. 如果没有视频，显示图片（包括缩略图）
  
  // 收集所有视频 URL（优先从 gallery 和 src 获取，不包括 thumbnail）
  const videoUrls = useMemo(() => {
    const videos: string[] = [];
    // 从 gallery 中获取视频
    if (material.gallery?.length) {
      videos.push(...material.gallery.filter((url) => url && isVideoUrl(url)));
    }
    // 从 src 中获取视频
    if (material.src && isVideoUrl(material.src)) {
      videos.push(material.src);
    }
    return videos;
  }, [material.gallery, material.src, isVideoUrl]);

  // 收集所有图片 URL（不包括视频，不包括 thumbnail 如果它是视频）
  const imageUrls = useMemo(() => {
    const images: string[] = [];
    // 从 gallery 中获取图片
    if (material.gallery?.length) {
      images.push(...material.gallery.filter((url) => url && !isVideoUrl(url)));
    }
    // 从 src 中获取图片
    if (material.src && !isVideoUrl(material.src)) {
      images.push(material.src);
    }
    // 从 thumbnail 中获取图片（如果它不是视频）
    if (material.thumbnail && !isVideoUrl(material.thumbnail)) {
      images.push(material.thumbnail);
    }
    return images;
  }, [material.gallery, material.src, material.thumbnail, isVideoUrl]);

  // 稳定第一个视频 URL 的引用
  const firstVideoUrl = useMemo(() => videoUrls[0] || null, [videoUrls]);

  // 根据 thumbSize 和实际图片尺寸计算卡片尺寸
  const actualCardWidth = useMemo(() => getThumbSizeWidth(thumbSize, isMobile), [thumbSize, isMobile]);
  
  // 根据素材的实际尺寸计算卡片高度（如果有尺寸信息）
  const aspectRatio = useMemo(() => {
    if (material.width && material.height) {
      return material.width / material.height;
    }
    // 默认使用 4:3 比例
    return 4 / 3;
  }, [material.width, material.height]);

  // 计算预览区域高度（根据实际宽高比）
  const previewHeight = useMemo(() => Math.floor(actualCardWidth / aspectRatio), [actualCardWidth, aspectRatio]);
  
  // 文字区域高度（紧凑显示，减少占用空间）
  const textAreaHeight = 60; // 固定较小的高度
  
  // 卡片总高度
  const totalCardHeight = useMemo(() => previewHeight + textAreaHeight, [previewHeight]);
  
  // 图片优化宽度
  const imageWidth = useMemo(() => Math.min(Math.ceil(actualCardWidth * 1.5), 480), [actualCardWidth]);
  
  // 确定当前要显示的内容：优先视频，没有视频才显示图片
  const hasVideo = videoUrls.length > 0;
  const hasImage = imageUrls.length > 0;
  
  // 当前要显示的视频 URL（如果有视频）
  const currentVideoUrl = useMemo(() => {
    if (!hasVideo) return null;
    const videoIndex = Math.min(currentIndex, videoUrls.length - 1);
    return videoUrls[videoIndex] || null;
  }, [hasVideo, videoUrls, currentIndex]);
  
  // 当前要显示的图片 URL（如果没有视频）
  const currentImageUrl = useMemo(() => {
    if (hasVideo) return null; // 有视频时不显示图片
    if (!hasImage) return null;
    const imageIndex = Math.min(currentIndex, imageUrls.length - 1);
    return imageUrls[imageIndex] || null;
  }, [hasVideo, hasImage, imageUrls, currentIndex]);
  
  // 所有可切换的 URL（用于切换逻辑）
  const allUrls = useMemo(() => {
    // 如果有视频，使用视频列表
    if (hasVideo) return videoUrls;
    // 如果没有视频，使用图片列表
    return imageUrls;
  }, [hasVideo, videoUrls, imageUrls]);
  
  const totalUrls = allUrls.length;
  
  // 性能优化：使用 useMemo 缓存高亮文本，避免每次渲染都重新计算
  const highlightedName = useMemo(
    () => highlightText(material.name, keyword || ''),
    [material.name, keyword]
  );

  // 获取当前主图 URL（用于 AI 分析）
  const getMainImageUrl = useCallback((): string | null => {
    // 如果当前是视频且有提取的帧，使用当前索引对应的帧
    if (hasVideo && videoThumbnails.length > 0) {
      const frameIndex = Math.min(currentIndex, videoThumbnails.length - 1);
      const frameUrl = videoThumbnails[frameIndex];
      if (frameUrl && frameUrl.startsWith('blob:')) {
        return frameUrl;
      }
    }
    
    // 如果只有视频且已经抽帧生成了单帧预览图，使用它
    if (hasVideo && !hasImage && videoThumbnail && videoThumbnail.startsWith('blob:')) {
      return videoThumbnail;
    }
    
    const tryGetUrl = (source: string | undefined): string | null => {
      if (!source || isVideoUrl(source)) return null;
      
      const url = getClientAssetUrl(source);
      if (!url || url === '/') return null;
      
      // 确保是完整的 URL（http:// 或 https:// 开头）
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
      
      // 如果是相对路径，尝试构建完整 URL
      if (typeof window !== 'undefined') {
        const ossConfig = window.__OSS_CONFIG__;
        if (ossConfig && ossConfig.bucket && ossConfig.region) {
          if (url.startsWith('/assets/')) {
            const ossPath = url.substring(1);
            const region = ossConfig.region.replace(/^oss-/, '');
            return `https://${ossConfig.bucket}.oss-${region}.aliyuncs.com/${ossPath}`;
          }
        }
      }
      
      return null;
    };
    
    // 如果有视频，尝试使用图片列表中的第一张图片
    if (hasVideo && imageUrls.length > 0) {
      const imageUrl = tryGetUrl(imageUrls[0]);
      if (imageUrl) return imageUrl;
    }
    
    // 如果没有视频，使用当前图片
    if (!hasVideo && currentImageUrl) {
      const imageUrl = tryGetUrl(currentImageUrl);
      if (imageUrl) return imageUrl;
    }
    
    // 回退到使用 thumbnail（如果它不是视频）
    if (material.thumbnail && !isVideoUrl(material.thumbnail)) {
      const thumbnailUrl = tryGetUrl(material.thumbnail);
      if (thumbnailUrl) return thumbnailUrl;
    }
    
    return null;
  }, [hasVideo, hasImage, videoThumbnails, currentIndex, imageUrls, currentImageUrl, material.thumbnail, videoThumbnail, isVideoUrl]);

  // 从localStorage加载已保存的分析
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const key = `ai_analysis_material_${material.id || 'unknown'}_${currentIndex}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        setSavedAnalysis(saved);
      } else {
        setSavedAnalysis(null);
      }
    }
  }, [material.id, currentIndex]);

  // 保存分析结果到localStorage
  const saveAnalysis = useCallback((description: string) => {
    if (typeof window !== 'undefined' && description) {
      const key = `ai_analysis_material_${material.id || 'unknown'}_${currentIndex}`;
      localStorage.setItem(key, description);
      setSavedAnalysis(description);
    }
  }, [material.id, currentIndex]);

  // AI 分析功能
  const handleAIAnalyze = useCallback(async () => {
    const imageUrl = getMainImageUrl();
    
    if (!imageUrl) {
      setAiError('无法获取图片 URL，请检查图片路径配置');
      return;
    }
    
    setIsAnalyzing(true);
    setAiError(null);
    setAiResult(null);
    
    try {
      // 从 localStorage 读取 AI 分析提示词
      const promptKey = 'ai_material_analyze_prompt';
      const customPrompt = typeof window !== 'undefined' ? localStorage.getItem(promptKey) : null;
      
      // 如果是 blob URL，需要转换为 base64
      let finalImageUrl = imageUrl;
      let imageBase64: string | undefined = undefined;
      
      if (imageUrl.startsWith('blob:')) {
        try {
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const reader = new FileReader();
          imageBase64 = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (error) {
          console.error('转换 blob URL 失败:', error);
          setAiError('无法处理预览图');
          return;
        }
      }
      
      const response = await fetch('/api/ai/analyze-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: imageBase64 ? undefined : finalImageUrl,
          imageBase64: imageBase64,
          customPrompt: (customPrompt && customPrompt.trim()) ? customPrompt : undefined,
          skipTags: true, // 素材分析不需要标签，仅需要描述
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.message || 'AI 分析失败';
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      
      if (result.raw?.error) {
        setAiError(result.raw.error);
        setAiResult(null);
      } else {
        const description = result.description || '';
        const truncatedDescription = description.length > 50 ? description.substring(0, 50) + '...' : description;
        setAiResult({ description: truncatedDescription });
        saveAnalysis(truncatedDescription);
        setAiError(null);
      }
    } catch (error) {
      console.error('[AI 分析] 分析失败:', error);
      setAiError(error instanceof Error ? error.message : '分析失败，请稍后重试');
      setAiResult(null);
    } finally {
      setIsAnalyzing(false);
    }
  }, [getMainImageUrl, saveAnalysis]);

  // 重新生成分析
  const handleRegenerate = useCallback(() => {
    setAiResult(null);
    setAiError(null);
    handleAIAnalyze();
  }, [handleAIAnalyze]);

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

  // 清理定时器和视频帧 blob URL
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      if (videoThumbnail && videoThumbnail.startsWith('blob:')) {
        URL.revokeObjectURL(videoThumbnail);
      }
      videoThumbnails.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [videoThumbnail, videoThumbnails]);

  // 简化逻辑：视频默认暂停在首帧，悬停时播放
  useEffect(() => {
    // 只在有视频时才执行
    if (!hasVideo || !currentVideoUrl) {
      return;
    }
    
    const currentVideo = videoRefs.current[currentIndex];
    if (!currentVideo) {
      return;
    }
    
    // 悬停时播放
    if (isHoveringPreview) {
      if (currentVideo.readyState >= 2) {
        currentVideo.muted = true;
        currentVideo.play().catch(() => {});
      } else {
        currentVideo.onloadeddata = () => {
          currentVideo.muted = true;
          currentVideo.play().catch(() => {});
        };
      }
    } else {
      // 不悬停时暂停在首帧
      currentVideo.pause();
      if (currentVideo.readyState >= 1) {
        currentVideo.currentTime = 0;
      }
    }
  }, [hasVideo, currentVideoUrl, currentIndex, isHoveringPreview]);


  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    setEnlarged(true);
  };

  const validIndex = totalUrls > 0 ? Math.min(currentIndex, totalUrls - 1) : 0;

  return (
    <>
      <Card
        className="group overflow-hidden transition-shadow hover:shadow-lg flex flex-col relative border"
        style={{ 
          width: actualCardWidth,
          height: totalCardHeight 
        }}
        onMouseEnter={() => setIsHoveringCard(true)}
        onMouseLeave={() => setIsHoveringCard(false)}
      >
        {/* 预览区域 */}
        <div
          className="relative overflow-hidden bg-muted flex items-center justify-center cursor-pointer"
          style={{ height: previewHeight }}
          onDoubleClick={handleDoubleClick}
          onMouseEnter={() => setIsHoveringPreview(true)}
          onMouseLeave={() => setIsHoveringPreview(false)}
        >
          {/* 详情按钮和AI解析按钮 - 右上角 */}
          <div 
            className={cn(
              "absolute right-1.5 top-1.5 z-50 transition-opacity duration-200 flex items-center gap-1",
              !isHoveringCard && "opacity-0"
            )}
          >
            {/* AI解析按钮 - 在有预览图或抽帧预览图时显示 */}
            {((!hasVideo && currentImageUrl) || videoThumbnail) && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title="AI 分析"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAIAnalyze();
                }}
                disabled={isAnalyzing}
                className="h-6 w-6 rounded-full bg-black/60 text-white transition hover:bg-black/80 flex-shrink-0 flex items-center justify-center pointer-events-auto"
              >
                {isAnalyzing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <BarChart3 className="h-3 w-3" />
                )}
                <span className="sr-only">AI 分析</span>
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="查看详情"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDetailDialogOpen(true);
              }}
              className="h-6 w-6 rounded-full bg-black/60 text-white transition hover:bg-black/80 flex-shrink-0 flex items-center justify-center pointer-events-auto"
            >
              <Eye className="h-3 w-3" />
              <span className="sr-only">查看详情</span>
            </Button>
          </div>
          {/* 简化逻辑：每个素材卡只显示一个内容，优先视频 */}
          {/* 1. 如果有视频，只显示视频（不显示缩略图） */}
          {hasVideo && currentVideoUrl && (
            <video
              key={`video-${currentIndex}`}
              ref={(el) => {
                videoRefs.current[currentIndex] = el;
              }}
              src={getClientAssetUrl(currentVideoUrl)}
              preload="metadata"  // 预加载元数据以显示首帧
              className="absolute inset-0 h-full w-full object-contain z-10 opacity-100"
              muted
              loop
              playsInline
              onLoadedMetadata={() => {
                // 视频元数据加载完成后，确保在首帧并暂停
                const video = videoRefs.current[currentIndex];
                if (video) {
                  video.currentTime = 0;
                  video.pause();
                }
              }}
              onLoadedData={() => {
                // 视频数据加载完成后
                const video = videoRefs.current[currentIndex];
                if (video) {
                  if (isHoveringPreview) {
                    // 悬停时播放
                    video.play().catch(() => {});
                  } else {
                    // 不悬停时暂停在首帧
                    video.currentTime = 0;
                    video.pause();
                  }
                }
              }}
              onSeeked={() => {
                // 当视频跳转到首帧时，确保暂停
                const video = videoRefs.current[currentIndex];
                if (video && !isHoveringPreview) {
                  video.pause();
                }
              }}
            />
          )}
          
          {/* 2. 如果没有视频，显示图片 */}
          {!hasVideo && currentImageUrl && (
            <Image
              src={getOptimizedImageUrl(currentImageUrl, imageWidth)}
              alt={material.name}
              fill
              className="z-10 object-contain"
              loading={priority ? 'eager' : 'lazy'}
              priority={priority}
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, (max-width: 1536px) 16vw, 14vw"
              unoptimized={currentImageUrl.includes('x-oss-process=image')}
            />
          )}
          
          {/* 3. 无预览内容 */}
          {!hasVideo && !hasImage && (
            <div className="flex items-center justify-center h-full bg-muted text-muted-foreground z-10">
              <span className="text-sm">无预览图</span>
            </div>
          )}
          
          {totalUrls > 1 && (
            <>
              <div
                className="absolute left-0 top-0 bottom-0 z-20 flex w-1/3 cursor-pointer items-center justify-start pl-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCurrentIndex((prev) => (prev > 0 ? prev - 1 : totalUrls - 1));
                }}
              >
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6 rounded-full border-white/60 bg-background/80 hover:bg-background"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : totalUrls - 1));
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
                  setCurrentIndex((prev) => (prev < totalUrls - 1 ? prev + 1 : 0));
                }}
              >
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6 rounded-full border-white/60 bg-background/80 hover:bg-background"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCurrentIndex((prev) => (prev < totalUrls - 1 ? prev + 1 : 0));
                  }}
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
              <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1">
                {allUrls.map((_, index) => (
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
          className="flex flex-col relative overflow-hidden p-2"
          style={{ 
            height: textAreaHeight,
            minHeight: textAreaHeight
          }}
        >
          <Link href={`/materials/${material.id}`} className="block flex-shrink-0 mb-1">
            <h3
              ref={nameRef}
              className="font-medium leading-tight hover:text-primary transition-colors cursor-pointer whitespace-nowrap overflow-x-auto scrollbar-hide text-xs"
              dangerouslySetInnerHTML={{ __html: highlightedName }}
            />
          </Link>
          <div className="flex flex-wrap items-center gap-1 flex-shrink-0 mb-0.5">
            <Badge 
              variant="secondary" 
              className="rounded-full font-normal text-[10px] px-1.5 py-0.5"
            >
              {material.type}
            </Badge>
            <Badge 
              variant="secondary" 
              className="rounded-full font-normal text-[10px] px-1.5 py-0.5"
            >
              {material.tag}
            </Badge>
            {material.quality.slice(0, 2).map((q) => (
              <Badge 
                key={q} 
                variant="outline" 
                className="rounded-full font-normal text-[10px] px-1.5 py-0.5"
              >
                {q}
              </Badge>
            ))}
            {material.quality.length > 2 && (
              <span className="text-[10px] text-muted-foreground">+{String(material.quality.length - 2)}</span>
            )}
          </div>
          {/* AI分析结果 - 显示在文字信息区域，使用tooltip方式，保持卡片大小不变 */}
          {(aiResult || aiError || savedAnalysis) && (
            <div className="flex-shrink-0 min-h-0 overflow-hidden">
              {aiResult && (
                <div className="text-[9px] text-muted-foreground line-clamp-1 leading-tight" title={aiResult.description}>
                  {aiResult.description}
                </div>
              )}
              {aiError && (
                <div className="text-[9px] text-destructive line-clamp-1 leading-tight" title={aiError}>
                  {aiError}
                </div>
              )}
              {savedAnalysis && !aiResult && !isAnalyzing && (
                <div className="text-[9px] text-muted-foreground line-clamp-1 leading-tight" title={savedAnalysis}>
                  {savedAnalysis}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 放大预览模态框 */}
      {enlarged && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setEnlarged(false)}
          onDoubleClick={(e) => {
            if (!hasVideo) {
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
              if (!hasVideo) {
                e.stopPropagation();
                setEnlarged(false);
              }
            }}
          >
            {hasVideo && currentVideoUrl ? (
              <video src={getClientAssetUrl(currentVideoUrl)} controls autoPlay className="h-full w-full object-contain" muted />
            ) : currentImageUrl ? (
              <Image 
                src={getOptimizedImageUrl(currentImageUrl, imageWidth)} 
                alt={material.name} 
                fill 
                className="object-contain"
                sizes="100vw"
                priority
                unoptimized={currentImageUrl.includes('x-oss-process=image')}
              />
            ) : null}
            {totalUrls > 1 && (
              <>
                <button
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 bg-white/20 hover:bg-white/30 text-white border border-white/30 rounded-full z-40"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : totalUrls - 1));
                  }}
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 bg-white/20 hover:bg-white/30 text-white border border-white/30 rounded-full z-40"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex((prev) => (prev < totalUrls - 1 ? prev + 1 : 0));
                  }}
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-40">
                  {allUrls.map((_, index) => (
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

      {/* 素材详情对话框 */}
      <MaterialDetailDialog
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        material={material}
      />
    </>
  );
}

// 性能优化：使用 memo 减少不必要的重渲染，只在关键 props 变化时重新渲染
export const MaterialCardGallery = memo(MaterialCardGalleryComponent, (prevProps, nextProps) => {
  // 自定义比较函数：只在关键 props 变化时重新渲染
  return (
    prevProps.material.id === nextProps.material.id &&
    prevProps.material.thumbnail === nextProps.material.thumbnail &&
    prevProps.material.src === nextProps.material.src &&
    prevProps.material.gallery?.join(',') === nextProps.material.gallery?.join(',') &&
    prevProps.keyword === nextProps.keyword &&
    prevProps.priority === nextProps.priority &&
    prevProps.thumbSize === nextProps.thumbSize
  );
});

MaterialCardGallery.displayName = 'MaterialCardGallery';

