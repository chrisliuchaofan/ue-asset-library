'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { type Asset } from '@/data/manifest.schema';
import { X, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getClientAssetUrl, getOptimizedImageUrl } from '@/lib/utils';

interface MediaGalleryProps {
  asset: Asset;
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
  
  // 获取所有预览图/视频 URL
  const galleryUrls = asset.gallery && asset.gallery.length > 0 
    ? asset.gallery 
    : [asset.src];
  
  const currentSource = galleryUrls[currentIndex];
  const currentUrl = currentSource ? getClientAssetUrl(currentSource) : '';
  const isVideo = isVideoUrl(currentUrl);

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

