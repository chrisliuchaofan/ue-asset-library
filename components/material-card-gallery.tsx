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

export function MaterialCardGallery({ material, keyword, priority = false, thumbSize = 'compact' }: MaterialCardGalleryProps) {
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
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // AI 分析相关状态
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<{ description: string; tags?: string[] } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [savedAnalysis, setSavedAnalysis] = useState<string | null>(null);
  
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

  // 当只有视频时，从第一个视频中提取多帧作为预览图（类似media-gallery）
  useEffect(() => {
    // 只有当没有图片且有视频时才提取
    const shouldExtract = imageUrls.length === 0 && firstVideoUrl !== null && videoUrls.length > 0;
    
    if (!shouldExtract) {
      if (lastVideoUrlRef.current !== null) {
        // 清理之前的帧
        videoThumbnails.forEach(url => {
          if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
          }
        });
        if (videoThumbnail && videoThumbnail.startsWith('blob:')) {
          URL.revokeObjectURL(videoThumbnail);
        }
        setVideoThumbnail(null);
        setVideoThumbnails([]);
        lastVideoUrlRef.current = null;
        extractingFrameRef.current = false;
      }
      return;
    }

    // 如果已经在提取同一个视频，跳过
    if (extractingFrameRef.current && lastVideoUrlRef.current === firstVideoUrl) {
      return;
    }

    // 如果已经提取过这个视频的帧，跳过
    if (lastVideoUrlRef.current === firstVideoUrl && (videoThumbnail || videoThumbnails.length > 0)) {
      return;
    }

    extractingFrameRef.current = true;
    lastVideoUrlRef.current = firstVideoUrl;

    const extractFrames = async () => {
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
          }, 5000);
        });

        const duration = video.duration;
        if (!duration || !isFinite(duration)) {
          extractingFrameRef.current = false;
          return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const frames: string[] = [];
        const frameCount = 6; // 提取6帧
        const interval = duration / (frameCount + 1);

        // 提取多帧
        for (let i = 1; i <= frameCount; i++) {
          const time = interval * i;
          video.currentTime = Math.min(time, duration - 0.1);
          
          await new Promise<void>((resolve) => {
            video.onseeked = () => {
              try {
                ctx.drawImage(video, 0, 0);
                
                try {
                  canvas.toBlob(
                    (blob) => {
                      if (blob) {
                        const url = URL.createObjectURL(blob);
                        frames.push(url);
                      }
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
                  resolve();
                }
              } catch (drawError) {
                resolve();
              }
            };
          });
        }
        
        if (frames.length > 0) {
          // 第一帧作为主预览图
          setVideoThumbnail(frames[0]);
          setVideoThumbnails(frames);
        }
        extractingFrameRef.current = false;
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('提取视频帧失败:', error);
        }
        setVideoThumbnail(null);
        setVideoThumbnails([]);
        extractingFrameRef.current = false;
        lastVideoUrlRef.current = null;
      }
    };

    // 延迟执行，避免阻塞首屏渲染
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      requestIdleCallback(() => {
        setTimeout(() => {
          extractFrames();
        }, 1000);
      }, { timeout: 2000 });
    } else {
      setTimeout(() => {
        extractFrames();
      }, 1000);
    }
    
    // 清理函数
    return () => {
      videoThumbnails.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [imageUrls.length, firstVideoUrl, videoUrls.length, videoThumbnail, videoThumbnails]);

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
  
  // 优先使用图片，如果没有图片则使用视频
  const currentSource = useMemo(() => {
    // 如果有图片，优先显示图片
    if (imageUrls.length > 0) {
      const imageIndex = Math.min(currentIndex, imageUrls.length - 1);
      return imageUrls[imageIndex] || galleryUrls[currentIndex] || '';
    }
    // 如果没有图片，使用当前索引的URL（可能是视频）
    return galleryUrls[currentIndex] || '';
  }, [imageUrls, galleryUrls, currentIndex]);
  
  const currentIsVideo = isVideoUrl(currentSource);
  
  const currentUrl = currentSource ? (currentIsVideo ? getClientAssetUrl(currentSource) : getOptimizedImageUrl(currentSource, imageWidth)) : '';
  
  const highlightedName = highlightText(material.name, keyword || '');

  // 获取当前主图 URL（用于 AI 分析）
  const getMainImageUrl = useCallback((): string | null => {
    // 如果当前是视频且有提取的帧，使用当前索引对应的帧
    if (currentIsVideo && videoThumbnails.length > 0) {
      const frameIndex = Math.min(currentIndex, videoThumbnails.length - 1);
      const frameUrl = videoThumbnails[frameIndex];
      if (frameUrl && frameUrl.startsWith('blob:')) {
        return frameUrl;
      }
    }
    
    // 如果只有视频且已经抽帧生成了单帧预览图，使用它
    if (imageUrls.length === 0 && videoThumbnail && videoThumbnail.startsWith('blob:')) {
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
    
    // 优先使用当前正在展示的图片
    const currentUrl = tryGetUrl(currentSource);
    if (currentUrl) return currentUrl;
    
    // 如果当前展示的是视频，尝试使用 gallery 中的第一张图片
    if (currentIsVideo && galleryUrls.length > 0) {
      for (const url of galleryUrls) {
        const imageUrl = tryGetUrl(url);
        if (imageUrl) return imageUrl;
      }
    }
    
    // 回退到使用 thumbnail
    const thumbnailUrl = tryGetUrl(material.thumbnail);
    if (thumbnailUrl) return thumbnailUrl;
    
    // 最后尝试使用 src
    const srcUrl = tryGetUrl(material.src);
    if (srcUrl) return srcUrl;
    
    return null;
  }, [currentIsVideo, videoThumbnails, currentIndex, currentSource, galleryUrls, material.thumbnail, material.src, imageUrls.length, videoThumbnail]);

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
            {((!currentIsVideo && currentUrl) || videoThumbnail) && (
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
          
          {/* 显示图片 */}
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
          {imageUrls.length === 0 && videoUrls.length > 0 && (
            <>
              {videoThumbnail ? (
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
              ) : (
                // 视频首帧提取中，显示占位符
                <div className="flex items-center justify-center h-full bg-muted text-muted-foreground z-10">
                  <span className="text-xs">加载中...</span>
                </div>
              )}
            </>
          )}
          
          {/* 无预览图 */}
          {!currentIsVideo && !currentUrl && imageUrls.length === 0 && videoUrls.length === 0 && (
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
              <span className="text-[10px] text-muted-foreground">+{material.quality.length - 2}</span>
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

      {/* 素材详情对话框 */}
      <MaterialDetailDialog
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        material={material}
      />
    </>
  );
}

