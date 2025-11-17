'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { type Asset } from '@/data/manifest.schema';
import { X, ZoomIn, ChevronLeft, ChevronRight, Heart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getClientAssetUrl, getOptimizedImageUrl } from '@/lib/utils';

interface MediaGalleryProps {
  asset: Asset;
}

interface AIAnalyzeResult {
  tags: string[];
  description: string;
  raw?: any;
}

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

export function MediaGallery({ asset }: MediaGalleryProps) {
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  
  // AI 读图相关状态
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIAnalyzeResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  
  // 获取所有预览图/视频 URL
  const galleryUrls = asset.gallery && asset.gallery.length > 0 
    ? asset.gallery 
    : [asset.src];
  
  const currentSource = galleryUrls[currentIndex];
  const currentUrl = currentSource ? getClientAssetUrl(currentSource) : '';
  const isVideo = isVideoUrl(currentUrl);
  
  // 获取当前主图 URL（用于 AI 分析）
  // 确保返回完整的 URL（http:// 或 https:// 开头）
  const getMainImageUrl = (): string | null => {
    const tryGetUrl = (source: string | undefined): string | null => {
      if (!source || isVideoUrl(source)) return null;
      
      const url = getClientAssetUrl(source);
      if (!url || url === '/') return null;
      
      // 确保是完整的 URL（http:// 或 https:// 开头）
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
      
      // 如果是相对路径，尝试构建完整 URL
      // 检查是否有 OSS 配置
      if (typeof window !== 'undefined') {
        const ossConfig = window.__OSS_CONFIG__;
        if (ossConfig && ossConfig.bucket && ossConfig.region) {
          // 如果是 /assets/ 开头的路径，构建 OSS URL
          if (url.startsWith('/assets/')) {
            const ossPath = url.substring(1);
            const region = ossConfig.region.replace(/^oss-/, '');
            return `https://${ossConfig.bucket}.oss-${region}.aliyuncs.com/${ossPath}`;
          }
        }
      }
      
      // 如果无法构建完整 URL，返回 null
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[AI 读图] 无法构建完整 URL:', url);
      }
      return null;
    };
    
    // 优先使用当前正在展示的图片（用户看到的图片）
    const currentUrl = tryGetUrl(currentSource);
    if (currentUrl) return currentUrl;
    
    // 如果当前展示的是视频，尝试使用 gallery 中的第一张图片
    if (isVideo && galleryUrls.length > 0) {
      for (const url of galleryUrls) {
        const imageUrl = tryGetUrl(url);
        if (imageUrl) return imageUrl;
      }
    }
    
    // 回退到使用 thumbnail
    const thumbnailUrl = tryGetUrl(asset.thumbnail);
    if (thumbnailUrl) return thumbnailUrl;
    
    // 最后尝试使用 src
    const srcUrl = tryGetUrl(asset.src);
    if (srcUrl) return srcUrl;
    
    return null;
  };
  
  // AI 读图功能
  const handleAIAnalyze = async () => {
    const imageUrl = getMainImageUrl();
    
    if (!imageUrl) {
      // 提供更详细的错误信息
      const debugInfo = {
        currentSource,
        currentUrl,
        isVideo,
        galleryUrls: galleryUrls.length,
        thumbnail: asset.thumbnail,
        src: asset.src,
        ossConfig: typeof window !== 'undefined' ? window.__OSS_CONFIG__ : null,
      };
      console.warn('[AI 读图] 无法获取图片 URL:', debugInfo);
      setAiError('无法获取图片 URL，请检查图片路径配置');
      return;
    }
    
    // 调试信息：在开发环境下输出图片 URL
    if (process.env.NODE_ENV !== 'production') {
      console.log('[AI 读图] 使用的图片 URL:', imageUrl);
      console.log('[AI 读图] 当前预览索引:', currentIndex);
      console.log('[AI 读图] 当前预览源:', currentSource);
      console.log('[AI 读图] 资产信息:', {
        thumbnail: asset.thumbnail,
        src: asset.src,
        gallery: asset.gallery,
      });
    }
    
    setIsAnalyzing(true);
    setAiError(null);
    setAiResult(null);
    
    try {
      // 从 localStorage 读取 AI 分析提示词（与上传时的提示词分开）
      const customPrompt = typeof window !== 'undefined' ? localStorage.getItem('ai_analyze_prompt') : null;
      
      const response = await fetch('/api/ai/analyze-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: imageUrl,
          customPrompt: customPrompt || undefined,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.message || 'AI 分析失败';
        console.error('[AI 读图] API 调用失败:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
        });
        throw new Error(errorMessage);
      }
      
      const result: AIAnalyzeResult = await response.json();
      
      // 调试信息
      if (process.env.NODE_ENV !== 'production') {
        console.log('[AI 读图] API 返回结果:', result);
      }
      
      // 检查是否有错误（优雅的错误处理）
      if (result.raw?.error) {
        setAiError(result.raw.error);
        setAiResult(null);
      } else if (result.raw?.mock) {
        // Mock 结果也正常显示
        setAiResult(result);
        setAiError(null);
      } else {
        setAiResult(result);
        setAiError(null);
      }
    } catch (error) {
      console.error('[AI 读图] 分析失败:', error);
      setAiError(error instanceof Error ? error.message : '分析失败，请稍后重试');
      setAiResult(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 自动播放视频（静音）
  useEffect(() => {
    galleryUrls.forEach((url, index) => {
      const video = videoRefs.current[index];
      const urlIsVideo = isVideoUrl(getClientAssetUrl(url));
      if (video && urlIsVideo && index === currentIndex) {
        video.muted = true;
        video.play().catch((err) => {
          console.warn('视频自动播放失败:', err);
        });
      } else if (video && index !== currentIndex) {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [currentIndex, galleryUrls]);
  
  // 切换图片时清除 AI 分析结果
  useEffect(() => {
    setAiResult(null);
    setAiError(null);
  }, [currentIndex]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : galleryUrls.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < galleryUrls.length - 1 ? prev + 1 : 0));
  };

  return (
    <>
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted flex items-center justify-center">
        {isVideo && currentSource && currentUrl ? (
          <>
            {/* 视频自动播放层 */}
            {galleryUrls.map((url, index) => {
              const videoUrl = getClientAssetUrl(url);
              if (!videoUrl) return null;
              return (
                <video
                  key={index}
                  ref={(el) => {
                    videoRefs.current[index] = el;
                  }}
                  src={videoUrl}
                  className={`absolute inset-0 w-full h-full object-contain ${
                    index === currentIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                  muted
                  loop
                  playsInline
                  controls={index === currentIndex}
                  preload={index === currentIndex ? 'metadata' : 'none'}
                />
              );
            })}
            {/* 切换按钮 */}
            {galleryUrls.length > 1 && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 bg-background/80 hover:bg-background z-10"
                  onClick={handlePrev}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 bg-background/80 hover:bg-background z-10"
                  onClick={handleNext}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
                {/* 指示器 */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                  {galleryUrls.map((_, index) => (
                    <button
                      type="button"
                      key={index}
                      className={`h-2 rounded-full transition-all ${
                        index === currentIndex
                          ? 'w-6 bg-primary'
                          : 'w-2 bg-background/50 hover:bg-background/70'
                      }`}
                      onClick={() => setCurrentIndex(index)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <>
            {currentSource && currentUrl ? (
              <>
                <Image
                  src={getOptimizedImageUrl(currentSource, 1600)}
                  alt={`${asset.name} - ${currentIndex + 1}`}
                  fill
                  className="object-contain"
                  sizes="100vw"
                  priority={currentIndex === 0}
                  loading={currentIndex === 0 ? 'eager' : 'lazy'}
                  unoptimized={getOptimizedImageUrl(currentSource).includes('x-oss-process=image')}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute bottom-4 right-4 bg-background/80 hover:bg-background"
                  onClick={() => setIsImageOpen(true)}
                >
                  <ZoomIn className="h-5 w-5" />
                </Button>
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                无预览图
              </div>
            )}
            {/* 切换按钮 - 只在有有效预览图时显示 */}
            {galleryUrls.length > 1 && currentSource && currentUrl && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 bg-background/80 hover:bg-background z-10"
                  onClick={handlePrev}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 bg-background/80 hover:bg-background z-10"
                  onClick={handleNext}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
                {/* 指示器 */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                  {galleryUrls.map((_, index) => (
                    <button
                      type="button"
                      key={index}
                      className={`h-2 rounded-full transition-all ${
                        index === currentIndex
                          ? 'w-6 bg-primary'
                          : 'w-2 bg-background/50 hover:bg-background/70'
                      }`}
                      onClick={() => setCurrentIndex(index)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* AI 分析功能区域 */}
      {!isVideo && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAIAnalyze}
              disabled={isAnalyzing}
              className="w-full sm:w-auto"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  分析中...
                </>
              ) : (
                <>
                  <Heart className="mr-2 h-4 w-4" />
                  AI 分析
                </>
              )}
            </Button>
            {process.env.NODE_ENV !== 'production' && getMainImageUrl() && (
              <span className="text-xs text-muted-foreground truncate max-w-xs">
                图片: {getMainImageUrl()?.substring(0, 50)}...
              </span>
            )}
          </div>
          
          {/* AI 分析结果展示 */}
          {(aiResult || aiError) && (
            <div className="mt-2 text-xs text-neutral-400 space-y-1">
              {aiResult && (
                <>
                  {aiResult.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {aiResult.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-neutral-700 px-2 py-0.5"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {aiResult.description && (
                    <p className="text-neutral-300">
                      {aiResult.description}
                    </p>
                  )}
                </>
              )}
              {aiError && (
                <p className="text-red-400">
                  {aiError}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {isImageOpen && !isVideo && currentSource && currentUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setIsImageOpen(false)}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 text-white hover:bg-white/20"
            onClick={() => setIsImageOpen(false)}
          >
            <X className="h-6 w-6" />
          </Button>
          <div className="relative h-full w-full max-w-7xl" onClick={(e) => e.stopPropagation()}>
            {currentSource && currentUrl ? (
              <Image
                src={getOptimizedImageUrl(currentSource, 1920)}
                alt={`${asset.name} - ${currentIndex + 1}`}
                fill
                className="object-contain"
                sizes="100vw"
                unoptimized={getOptimizedImageUrl(currentSource).includes('x-oss-process=image')}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg text-white/80">
                无预览图
              </div>
            )}
            {/* 大图模式下的切换按钮 */}
            {galleryUrls.length > 1 && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 bg-white/20 hover:bg-white/30 text-white border-white/30"
                  onClick={handlePrev}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 bg-white/20 hover:bg-white/30 text-white border-white/30"
                  onClick={handleNext}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

