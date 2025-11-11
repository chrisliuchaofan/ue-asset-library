'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { type Asset } from '@/data/manifest.schema';
import { highlightText, cn, getClientAssetUrl, getOptimizedImageUrl } from '@/lib/utils';
import { ChevronLeft, ChevronRight, X, FolderOpen, Plus, Eye, Check } from 'lucide-react';
import { type OfficeLocation } from '@/lib/nas-utils';

interface AssetCardGalleryProps {
  asset: Asset;
  keyword?: string;
  isSelected?: boolean;
  onToggleSelection?: () => void;
  priority?: boolean; // 是否为优先加载的图片（首屏图片）
  officeLocation?: OfficeLocation; // 办公地点，用于选择对应的 NAS 路径
  viewMode: 'classic' | 'thumbnail' | 'grid';
}

export function AssetCardGallery({ asset, keyword, isSelected, onToggleSelection, priority = false, officeLocation = 'guangzhou', viewMode }: AssetCardGalleryProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isEnlarged, setIsEnlarged] = useState(false);
  const [isHoveringPreview, setIsHoveringPreview] = useState(false);
  const [thumbnailPage, setThumbnailPage] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const nameRef = useRef<HTMLHeadingElement>(null);
  const scrollAnimationRef = useRef<number | null>(null);
  
  // 获取所有预览图/视频 URL
  // 优先使用 gallery，如果没有则使用 thumbnail 和 src
  // 注意：如果 thumbnail 和 src 相同，只使用一个
  const rawGallery = asset.gallery && asset.gallery.length > 0 ? asset.gallery.filter(Boolean) : [];
  const fallbackImages = [asset.thumbnail, asset.src].filter(Boolean);
  const galleryUrls = rawGallery.length > 0 ? rawGallery : fallbackImages;
  
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

  const imageUrls = useMemo(
    () => galleryUrls.filter((url) => !isVideoUrl(url)),
    [galleryUrls, isVideoUrl]
  );

  // 根据视图模式调整当前索引（缩略图优先展示视频）
  useEffect(() => {
    if (galleryUrls.length === 0) {
      if (currentIndex !== 0) {
        setCurrentIndex(0);
      }
      return;
    }

    const maxIndex = galleryUrls.length - 1;
    if (currentIndex > maxIndex) {
      setCurrentIndex(0);
      return;
    }

    if (viewMode === 'thumbnail') {
      const firstVideoIndex = galleryUrls.findIndex((url) => isVideoUrl(url));
      const targetIndex = firstVideoIndex >= 0 ? firstVideoIndex : 0;
      if (currentIndex !== targetIndex) {
        setCurrentIndex(targetIndex);
      }
      return;
    }

    if (viewMode === 'grid') {
      const firstImageIndex = galleryUrls.findIndex((url) => !isVideoUrl(url));
      if (firstImageIndex >= 0 && currentIndex !== firstImageIndex) {
        setCurrentIndex(firstImageIndex);
      }
    }
  }, [currentIndex, galleryUrls, isVideoUrl, viewMode]);

  const validIndex = galleryUrls.length > 0 ? Math.min(currentIndex, galleryUrls.length - 1) : 0;
  const firstVideoIndexForDisplay = galleryUrls.findIndex((url) => isVideoUrl(url));
  const firstImageIndexForDisplay = galleryUrls.findIndex((url) => !isVideoUrl(url));
  const isClassic = viewMode === 'classic';
  const isOverlayMode = !isClassic;
  const displayIndex =
    viewMode === 'grid' && isHoveringPreview && firstVideoIndexForDisplay >= 0
      ? firstVideoIndexForDisplay
      : firstImageIndexForDisplay >= 0
      ? firstImageIndexForDisplay
      : validIndex;
  const optimizedImageWidth = useMemo(() => {
    switch (viewMode) {
      case 'thumbnail':
        return 540;
      case 'grid':
        return 480;
      case 'classic':
      default:
        return 640;
    }
  }, [viewMode]);

  const currentSource = galleryUrls[displayIndex];
  const currentIsVideo = currentSource ? isVideoUrl(currentSource) : false;
  const optimizedImageUrl = currentSource && !currentIsVideo
    ? getOptimizedImageUrl(currentSource, optimizedImageWidth)
    : '';
  const currentUrl = currentSource
    ? currentIsVideo
      ? getClientAssetUrl(currentSource)
      : optimizedImageUrl
    : '';
  const previewAspectClass =
    viewMode === 'thumbnail' ? 'aspect-video' : viewMode === 'grid' ? 'aspect-square' : 'aspect-[4/3]';
  const previewBackgroundClass = viewMode === 'thumbnail' ? 'bg-black' : 'bg-muted';
  const mediaObjectClass = viewMode === 'grid' ? 'object-cover' : 'object-contain';
  const showNavigation = isClassic && galleryUrls.length > 1;
  const showIndicators = showNavigation;
  const rawTags = Array.isArray(asset.tags)
    ? asset.tags
    : typeof (asset as any).tags === 'string'
    ? (asset as any).tags
        .split(',')
        .map((t: string) => t.trim())
        .filter(Boolean)
    : [];
  const tagLimit = isClassic ? 3 : 2;
  const displayTags = rawTags.slice(0, tagLimit);
  const remainingTagCount = Math.max(0, rawTags.length - displayTags.length);
  const secondaryText = [asset.type, ...displayTags].filter(Boolean).join(' · ');
  const overlayActionButtonClass =
    'h-8 w-8 rounded-full bg-black/60 text-white transition hover:bg-black/80';
  const selectionButtonTitle = isSelected ? '从清单移除' : '加入清单';

  const handleSelectionButtonClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      onToggleSelection?.();
    },
    [onToggleSelection]
  );

  const handleCopyNasClick = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const locationName = officeLocation === 'guangzhou' ? '广州' : '深圳';
      const nasPath = officeLocation === 'guangzhou' ? asset.guangzhouNas : asset.shenzhenNas;
      const nasPathTrimmed = nasPath ? nasPath.trim() : '';
      if (!nasPathTrimmed) {
        alert(`该资产未填写${locationName}NAS路径`);
        return;
      }
      try {
        await navigator.clipboard.writeText(nasPathTrimmed);
        alert(`已复制 NAS 路径到剪贴板：\n${nasPathTrimmed}`);
      } catch (err) {
        try {
          const textArea = document.createElement('textarea');
          textArea.value = nasPathTrimmed;
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          alert(`已复制 NAS 路径到剪贴板：\n${nasPathTrimmed}`);
        } catch (fallbackErr) {
          console.error('复制失败:', fallbackErr);
          alert('复制失败，请手动复制');
        }
      }
    },
    [asset.guangzhouNas, asset.shenzhenNas, officeLocation]
  );

  const handleDetailButtonClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      router.push(`/assets/${asset.id}`);
    },
    [asset.id, router]
  );

  const renderActionButtons = () => {
    return (
      <>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title={selectionButtonTitle}
          aria-pressed={isSelected}
          onClick={handleSelectionButtonClick}
          className={cn(overlayActionButtonClass, isSelected && 'bg-primary text-primary-foreground hover:bg-primary/90')}
        >
          {isSelected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          <span className="sr-only">{selectionButtonTitle}</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="复制 NAS 路径"
          onClick={handleCopyNasClick}
          className={overlayActionButtonClass}
        >
          <FolderOpen className="h-4 w-4" />
          <span className="sr-only">复制 NAS 路径</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="查看详情"
          onClick={handleDetailButtonClick}
          className={overlayActionButtonClass}
        >
          <Eye className="h-4 w-4" />
          <span className="sr-only">查看详情</span>
        </Button>
      </>
    );
  };

  const gridConfig = useMemo(() => {
    const length = imageUrls.length;
    if (length <= 1) {
      return { rows: 1, cols: 1, cells: 1 };
    }
    if (length === 2) {
      return { rows: 1, cols: 2, cells: 2 };
    }
    if (length <= 4) {
      return { rows: 2, cols: 2, cells: 4 };
    }
    return { rows: 3, cols: 3, cells: 9 };
  }, [imageUrls.length]);

  const maxCells = gridConfig.cells;
  const thumbnailsPerPage = maxCells;
  const totalPages = imageUrls.length <= thumbnailsPerPage ? 1 : Math.ceil(imageUrls.length / thumbnailsPerPage);
  const pagedThumbnails = useMemo(() => {
    if (totalPages <= 1) {
      return imageUrls.slice(0, maxCells);
    }
    const start = thumbnailPage * thumbnailsPerPage;
    return imageUrls.slice(start, start + thumbnailsPerPage);
  }, [imageUrls, maxCells, thumbnailPage, thumbnailsPerPage, totalPages]);

  useEffect(() => {
    if (thumbnailPage > totalPages - 1) {
      setThumbnailPage(totalPages - 1);
    }
  }, [thumbnailPage, totalPages]);

  // 悬停时才播放视频，离开后暂停
  useEffect(() => {
    const activeIndex = displayIndex;

    galleryUrls.forEach((url, index) => {
      const video = videoRefs.current[index];
      if (!video) return;

      if (index === activeIndex && isHoveringPreview && isVideoUrl(url)) {
        video.muted = true;
        video.play().catch((err) => {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('视频播放失败:', err);
          }
        });
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [displayIndex, galleryUrls, isHoveringPreview, isVideoUrl]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
    };
  }, []);

  // 自动滚动播放超长名称
  useEffect(() => {
    const nameElement = nameRef.current;
    if (!nameElement) return;

    // 检查是否需要滚动（内容宽度 > 容器宽度）
    const needsScroll = nameElement.scrollWidth > nameElement.clientWidth;
    
    if (!needsScroll) {
      // 如果不需要滚动，重置到起始位置
      nameElement.scrollLeft = 0;
      return;
    }

    // 清除之前的动画
    if (scrollAnimationRef.current) {
      cancelAnimationFrame(scrollAnimationRef.current);
      scrollAnimationRef.current = null;
    }

    let scrollPosition = nameElement.scrollLeft || 0;
    let direction = 1; // 1: 向右, -1: 向左
    const scrollSpeed = 0.5; // 滚动速度（像素/帧）
    const pauseDuration = 2000; // 在两端暂停的时间（毫秒）
    let pauseTime = Date.now() + pauseDuration;
    let isPaused = false;

    const animate = () => {
      if (isPaused) {
        scrollAnimationRef.current = requestAnimationFrame(animate);
        return;
      }

      const now = Date.now();
      
      // 如果还在暂停期间，不滚动
      if (now < pauseTime) {
        scrollAnimationRef.current = requestAnimationFrame(animate);
        return;
      }

      scrollPosition += scrollSpeed * direction;
      const maxScroll = nameElement.scrollWidth - nameElement.clientWidth;

      // 到达右端，改变方向并暂停
      if (scrollPosition >= maxScroll) {
        scrollPosition = maxScroll;
        direction = -1;
        pauseTime = now + pauseDuration;
      }
      // 到达左端，改变方向并暂停
      else if (scrollPosition <= 0) {
        scrollPosition = 0;
        direction = 1;
        pauseTime = now + pauseDuration;
      }

      nameElement.scrollLeft = scrollPosition;
      scrollAnimationRef.current = requestAnimationFrame(animate);
    };

    // 延迟启动动画，让用户先看到开头
    const startDelay = setTimeout(() => {
      if (!isPaused) {
        scrollAnimationRef.current = requestAnimationFrame(animate);
      }
    }, 1000);

    // 监听鼠标事件来控制暂停/恢复
    const handleMouseEnter = () => {
      isPaused = true;
    };

    const handleMouseLeave = () => {
      isPaused = false;
      pauseTime = Date.now() + pauseDuration; // 重新开始暂停计时
    };

    nameElement.addEventListener('mouseenter', handleMouseEnter);
    nameElement.addEventListener('mouseleave', handleMouseLeave);

    // 清理函数
    return () => {
      clearTimeout(startDelay);
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current);
      }
      nameElement.removeEventListener('mouseenter', handleMouseEnter);
      nameElement.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [asset.name, highlightedName]);

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

  // 处理双击事件
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 清除单击延迟
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    setIsHoveringPreview(false);
    setIsEnlarged(true);
  };

  const cardWidth = 320;
  const classicHeight = 360;
  const compactHeight = 180;
  const primaryTags = Array.isArray(asset.tags) ? asset.tags : [];
  const combinedTags = primaryTags;
  const secondaryRowText = [asset.type, ...combinedTags].filter(Boolean).join(' · ');
  const secondaryRowHtml = highlightText(secondaryRowText, keyword || '');

  return (
    <>
      <div
        className={isClassic ? 'space-y-2' : undefined}
        style={{ width: cardWidth }}
      >
        <Card
          className="group relative flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] shadow-sm transition hover:shadow-lg dark:border-white/[0.08] dark:bg-white/[0.04]"
          style={{ width: '100%', height: isClassic ? classicHeight : compactHeight }}
        >
          <div
            className={cn(
              'relative flex w-full items-center justify-center overflow-hidden cursor-pointer',
              previewBackgroundClass,
              isClassic ? 'h-[180px]' : previewAspectClass
            )}
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
                  className={`absolute inset-0 h-full w-full ${mediaObjectClass} transition-opacity duration-200 ${
                    index === displayIndex ? 'z-10 opacity-100' : 'pointer-events-none opacity-0'
                  }`}
                  muted
                  loop
                  playsInline
                />
              );
            })}

            {!currentIsVideo && currentUrl && (
              <Image
                src={currentUrl}
                alt={`${asset.name} - ${displayIndex + 1}`}
                fill
                className="z-10 object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                loading={priority ? 'eager' : 'lazy'}
                priority={priority}
                unoptimized={currentUrl.startsWith('http')}
                onError={(e) => {
                  console.error('图片加载失败:', currentUrl);
                  if ((currentUrl.startsWith('/assets/') || galleryUrls[displayIndex]?.startsWith('/assets/')) && galleryUrls[displayIndex]) {
                    const ossConfig = typeof window !== 'undefined' ? window.__OSS_CONFIG__ : null;
                    if (ossConfig && ossConfig.bucket && ossConfig.region) {
                      const ossPath = galleryUrls[displayIndex].startsWith('/')
                        ? galleryUrls[displayIndex].substring(1)
                        : galleryUrls[displayIndex];
                      const region = ossConfig.region.replace(/^oss-/, '');
                      const fullUrl = `https://${ossConfig.bucket}.oss-${region}.aliyuncs.com/${ossPath}`;
                      console.warn('尝试使用完整 OSS URL:', fullUrl);
                      (e.target as HTMLImageElement).src = fullUrl;
                    } else {
                      console.warn('OSS 路径加载失败，请检查配置');
                    }
                  }
                }}
              />
            )}

            {!currentUrl && (
              <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                无预览
              </div>
            )}

            {isOverlayMode && (
              <>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-3">
                  <div className="truncate text-sm font-semibold text-white">{asset.name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-white/80">
                    <span className="font-medium text-white/90">{asset.type}</span>
                    {displayTags.map((tag: string) => (
                      <span
                        key={tag}
                        className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] leading-none text-white"
                      >
                        {tag}
                      </span>
                    ))}
                    {remainingTagCount > 0 && (
                      <span className="text-[10px] text-white/70">+{remainingTagCount}</span>
                    )}
                  </div>
                </div>
                <div className="pointer-events-auto absolute right-2 top-2 flex gap-1">
                  {renderActionButtons()}
                </div>
              </>
            )}

            {currentIsVideo && (
              <div className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                视频
              </div>
            )}

            {showNavigation && (
              <>
                <div
                  className="absolute left-0 top-0 bottom-0 z-20 flex w-1/3 cursor-pointer items-center justify-start pl-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handlePrev(e);
                  }}
                >
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full border-white/60 bg-background/80 hover:bg-background"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handlePrev(e);
                    }}
                    aria-label="上一张预览"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
                <div
                  className="absolute right-0 top-0 bottom-0 z-20 flex w-1/3 cursor-pointer items-center justify-end pr-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleNext(e);
                  }}
                >
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full border-white/60 bg-background/80 hover:bg-background"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleNext(e);
                    }}
                    aria-label="下一张预览"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}

            {showIndicators && (
              <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1">
                {galleryUrls.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1.5 rounded-full transition-all ${
                      index === validIndex ? 'w-4 bg-primary' : 'w-1.5 bg-background/50'
                    }`}
                  />
                ))}
              </div>
            )}

            <Link
              href={`/assets/${asset.id}`}
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
                  router.push(`/assets/${asset.id}`);
                  clickTimeoutRef.current = null;
                }, 300);
              }}
            />
          </div>

          {isClassic && (
            <div style={{ height: compactHeight }}>
              <div
                className="grid h-full"
                style={{
                  gridTemplateColumns: `repeat(${gridConfig.cols}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${gridConfig.rows}, minmax(0, 1fr))`,
                  gap: 0,
                }}
              >
                {Array.from({ length: gridConfig.cells }).map((_, idx) => {
                  const imageUrl = pagedThumbnails[idx];
                  return (
                    <div
                      key={`thumb-${thumbnailPage}-${idx}`}
                      className="relative h-full w-full overflow-hidden"
                    >
                      {imageUrl ? (
                        <Image
                          src={getOptimizedImageUrl(imageUrl, 480)}
                          alt={`${asset.name} 预览 ${thumbnailPage * thumbnailsPerPage + idx + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          loading="lazy"
                          unoptimized={imageUrl.startsWith('http') || imageUrl.startsWith('/assets/')}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <div className="pointer-events-auto absolute bottom-4 right-4 z-30 flex gap-1">
                {renderActionButtons()}
              </div>
              {totalPages > 1 && (
                <div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full border border-transparent bg-muted/50 text-muted-foreground hover:bg-muted"
                    onClick={() => setThumbnailPage((prev) => Math.max(prev - 1, 0))}
                    disabled={thumbnailPage === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span>{thumbnailPage + 1} / {totalPages}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full border border-transparent bg-muted/50 text-muted-foreground hover:bg-muted"
                    onClick={() => setThumbnailPage((prev) => Math.min(prev + 1, totalPages - 1))}
                    disabled={thumbnailPage === totalPages - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {isClassic && (
            <div className="pointer-events-none absolute bottom-2 left-3 flex items-center gap-3 text-[10px] text-white/90">
              {asset.style && (
                <span>{Array.isArray(asset.style) ? asset.style.join('、') : asset.style}</span>
              )}
              {asset.engineVersion && <span>{asset.engineVersion}</span>}
              {asset.source && <span>{asset.source}</span>}
            </div>
          )}
        </Card>

        {isClassic && (
          <div className="space-y-1 px-1">
            <Link href={`/assets/${asset.id}`} className="block">
              <h3
                ref={nameRef}
                className="text-sm font-semibold leading-tight text-foreground transition-colors hover:text-primary truncate"
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                dangerouslySetInnerHTML={{ __html: highlightedName }}
              />
            </Link>
            <p
              className="text-xs text-muted-foreground truncate"
              dangerouslySetInnerHTML={{ __html: secondaryRowHtml }}
            />
          </div>
        )}
      </div>

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
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 z-50 text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              setIsEnlarged(false);
            }}
          >
            <X className="h-6 w-6" />
          </Button>
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
              <div className="relative h-full w-full">
                <video
                  src={currentUrl}
                  controls
                  autoPlay
                  className="h-full w-full object-contain"
                  muted={false}
                />
              </div>
            ) : (
              <Image
                src={currentSource ? getOptimizedImageUrl(currentSource, 1280) : ''}
                alt={`${asset.name} - ${displayIndex + 1}`}
                fill
                className="object-contain"
                sizes="100vw"
                unoptimized={currentUrl.startsWith('http')}
              />
            )}
            {galleryUrls.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full border-white/30 bg-white/20 text-white hover:bg-white/30"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : galleryUrls.length - 1));
                  }}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full border-white/30 bg-white/20 text-white hover:bg-white/30"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex((prev) => (prev < galleryUrls.length - 1 ? prev + 1 : 0));
                  }}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
                <div className="absolute bottom-4 left-1/2 z-40 flex -translate-x-1/2 gap-2">
                  {galleryUrls.map((_, index) => (
                    <button
                      key={index}
                      className={`h-2 rounded-full transition-all ${
                        index === validIndex ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/70'
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