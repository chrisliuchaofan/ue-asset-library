'use client';

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { type Asset } from '@/data/manifest.schema';
import { highlightText, cn, getClientAssetUrl, getOptimizedImageUrl } from '@/lib/utils';
import { ChevronLeft, ChevronRight, X, FolderOpen, Plus, Eye, Check, Maximize2, Minimize2 } from 'lucide-react';
import { type OfficeLocation } from '@/lib/nas-utils';
import { createPortal } from 'react-dom';

interface AssetCardGalleryProps {
  asset: Asset;
  keyword?: string;
  isSelected?: boolean;
  onToggleSelection?: () => void;
  priority?: boolean; // 是否为优先加载的图片（首屏图片）
  officeLocation?: OfficeLocation; // 办公地点，用于选择对应的 NAS 路径
  viewMode: 'classic' | 'thumbnail' | 'grid';
  cardWidth?: number; // 卡片宽度（从父组件传入，用于响应式布局）
  compactMode?: boolean; // 紧凑模式
  onCompactModeToggle?: () => void; // 切换紧凑模式
}

interface ThumbnailPreviewPopoverProps {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  thumbnailUrl: string;
  assetName: string;
  index: number;
  elementRef: HTMLDivElement | null;
}

const ThumbnailPreviewPopover = memo(function ThumbnailPreviewPopover({ position, thumbnailUrl, assetName, index, elementRef }: ThumbnailPreviewPopoverProps) {
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!elementRef || !mounted) return;

    // 使用 useCallback 缓存 updatePosition 函数，避免每次渲染都重新创建
    const updatePosition = () => {
      const rect = elementRef.getBoundingClientRect();
      const viewportCenterX = window.innerWidth / 2;
      const viewportCenterY = window.innerHeight / 2;
      const popoverWidth = 400;
      const popoverHeight = 400;
      const gap = 8;

      let style: React.CSSProperties = {
        position: 'fixed',
        zIndex: 9999,
        pointerEvents: 'none',
        maxWidth: 'min(400px, calc(100vw - 2rem))',
        maxHeight: 'min(400px, calc(100vh - 2rem))',
      };

      // position 表示弹出框相对于选项卡的位置
      // top-left: 弹出框在选项卡左侧，顶部对齐
      // top-right: 弹出框在选项卡右侧，顶部对齐
      // bottom-left: 弹出框在选项卡左侧，底部对齐
      // bottom-right: 弹出框在选项卡右侧，底部对齐
      switch (position) {
        case 'top-left':
          // 弹出框在选项卡左侧，顶部对齐（朝向中心）
          style.right = `${window.innerWidth - rect.left + gap}px`;
          style.top = `${rect.top}px`;
          break;
        case 'top-right':
          // 弹出框在选项卡右侧，顶部对齐（朝向中心）
          style.left = `${rect.right + gap}px`;
          style.top = `${rect.top}px`;
          break;
        case 'bottom-left':
          // 弹出框在选项卡左侧，底部对齐（朝向中心）
          style.right = `${window.innerWidth - rect.left + gap}px`;
          style.bottom = `${window.innerHeight - rect.bottom}px`;
          break;
        case 'bottom-right':
          // 弹出框在选项卡右侧，底部对齐（朝向中心）
          style.left = `${rect.right + gap}px`;
          style.bottom = `${window.innerHeight - rect.bottom}px`;
          break;
      }

      // 确保不超出视口，动态调整位置
      const padding = 16;
      
      // 检查水平方向
      if (style.left !== undefined) {
        const left = typeof style.left === 'string' ? parseFloat(style.left) : style.left;
        if (left + popoverWidth + padding > window.innerWidth) {
          // 右侧超出，改为左侧显示
          delete style.left;
          style.right = `${window.innerWidth - rect.left + gap}px`;
        } else if (left < padding) {
          // 左侧超出，调整到安全位置
          style.left = `${padding}px`;
        }
      }
      if (style.right !== undefined) {
        const right = typeof style.right === 'string' ? parseFloat(style.right) : style.right;
        if (right + popoverWidth + padding > window.innerWidth) {
          // 左侧超出，改为右侧显示
          delete style.right;
          style.left = `${rect.right + gap}px`;
        } else if (right < padding) {
          // 右侧超出，调整到安全位置
          style.right = `${padding}px`;
        }
      }
      
      // 检查垂直方向
      if (style.top !== undefined) {
        const top = typeof style.top === 'string' ? parseFloat(style.top) : style.top;
        if (top + popoverHeight + padding > window.innerHeight) {
          // 下方超出，改为上方显示
          delete style.top;
          style.bottom = `${window.innerHeight - rect.bottom + gap}px`;
        } else if (top < padding) {
          // 上方超出，调整到安全位置
          style.top = `${padding}px`;
        }
      }
      if (style.bottom !== undefined) {
        const bottom = typeof style.bottom === 'string' ? parseFloat(style.bottom) : style.bottom;
        if (bottom + popoverHeight + padding > window.innerHeight) {
          // 上方超出，改为下方显示
          delete style.bottom;
          style.top = `${rect.bottom + gap}px`;
        } else if (bottom < padding) {
          // 下方超出，调整到安全位置
          style.bottom = `${padding}px`;
        }
      }

      setPopoverStyle(style);
    };

    updatePosition();
    
    // 使用 passive 选项优化滚动性能
    const scrollOptions = { passive: true, capture: true } as AddEventListenerOptions;
    const resizeOptions = { passive: true } as AddEventListenerOptions;
    
    window.addEventListener('scroll', updatePosition, scrollOptions);
    window.addEventListener('resize', updatePosition, resizeOptions);

    return () => {
      window.removeEventListener('scroll', updatePosition, scrollOptions);
      window.removeEventListener('resize', updatePosition, resizeOptions);
    };
  }, [elementRef, position, mounted]);

  if (!mounted) return null;

  const popoverContent = (
    <div style={popoverStyle}>
      <div className="bg-background border border-border rounded-lg shadow-2xl inline-block" style={{ padding: '3px' }}>
        <Image
          src={getOptimizedImageUrl(thumbnailUrl, 600)}
          alt={`${assetName} 完整预览 ${index}`}
          width={400}
          height={400}
          className="object-contain max-h-[400px] max-w-[400px] w-auto h-auto block"
          unoptimized={getOptimizedImageUrl(thumbnailUrl, 600).includes('x-oss-process=image')}
        />
      </div>
    </div>
  );

  return createPortal(popoverContent, document.body);
});

export const AssetCardGallery = memo(function AssetCardGallery({ asset, keyword, isSelected, onToggleSelection, priority = false, officeLocation = 'guangzhou', viewMode, cardWidth: propCardWidth, compactMode = false, onCompactModeToggle }: AssetCardGalleryProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isEnlarged, setIsEnlarged] = useState(false);
  const [isHoveringPreview, setIsHoveringPreview] = useState(false);
  const [isHoveringThumbnails, setIsHoveringThumbnails] = useState(false);
  const [hoveredThumbnailIndex, setHoveredThumbnailIndex] = useState<number | null>(null);
  const [hoveredThumbnailPreview, setHoveredThumbnailPreview] = useState<{ 
    index: number; 
    url: string; 
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    offsetX?: number;
    offsetY?: number;
  } | null>(null);
  const [thumbnailPage, setThumbnailPage] = useState(0);
  const thumbnailRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [videoThumbnails, setVideoThumbnails] = useState<string[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const thumbnailVideoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const nameRef = useRef<HTMLHeadingElement>(null);
  const scrollAnimationRef = useRef<number | null>(null);
  const extractingFramesRef = useRef(false);
  const lastVideoUrlRef = useRef<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  
  // 获取所有预览图/视频 URL
  // 优先使用 gallery，如果没有则使用 thumbnail 和 src
  // 注意：如果 thumbnail 和 src 相同，只使用一个
  // 使用 useMemo 缓存计算结果，避免每次渲染都重新计算
  const galleryUrls = useMemo(() => {
    const rawGallery = asset.gallery && asset.gallery.length > 0 ? asset.gallery.filter(Boolean) : [];
    const fallbackImages = [asset.thumbnail, asset.src].filter(Boolean);
    return rawGallery.length > 0 ? rawGallery : fallbackImages;
  }, [asset.gallery, asset.thumbnail, asset.src]);
  
  // 使用 useMemo 缓存高亮文本，避免每次渲染都重新计算
  const highlightedName = useMemo(
    () => highlightText(asset.name, keyword || ''),
    [asset.name, keyword]
  );

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

  const videoUrls = useMemo(
    () => galleryUrls.filter((url) => isVideoUrl(url)),
    [galleryUrls, isVideoUrl]
  );

  // 稳定第一个视频 URL 的引用
  const firstVideoUrl = useMemo(() => videoUrls[0] || null, [videoUrls]);

  // 当只有视频时，从第一个视频中提取6帧作为缩略图（经典预览和宫格图预览都需要）
  // 使用 requestIdleCallback 延迟执行，避免阻塞主线程和影响 LCP
  useEffect(() => {
    // 如果不需要提取帧，清空并返回
    const shouldExtract = (viewMode === 'classic' || viewMode === 'grid') && imageUrls.length === 0 && firstVideoUrl !== null;
    
    if (!shouldExtract) {
      // 只在确实需要清空时才调用 setState，避免不必要的更新
      if (lastVideoUrlRef.current !== null) {
        setVideoThumbnails([]);
        lastVideoUrlRef.current = null;
        extractingFramesRef.current = false;
      }
      return;
    }

    // 如果正在提取或已经提取过这个视频，跳过
    if (extractingFramesRef.current || lastVideoUrlRef.current === firstVideoUrl) {
      return;
    }

    extractingFramesRef.current = true;
    lastVideoUrlRef.current = firstVideoUrl;

    const extractFrames = async () => {
      try {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          extractingFramesRef.current = false;
          return;
        }

        // 尝试设置 crossOrigin 以支持跨域视频帧提取
        // 如果 OSS 不支持 CORS，会在 toBlob 时捕获错误
        const videoUrl = getClientAssetUrl(firstVideoUrl);
        const isCrossOrigin = videoUrl.startsWith('http://') || videoUrl.startsWith('https://');
        
        if (isCrossOrigin) {
          // 跨域视频需要设置 crossOrigin，但需要服务器支持 CORS
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
          
          // 超时处理（10秒）
          timeoutId = setTimeout(() => {
            if (!resolved && video.readyState < 2) {
              handleError('视频加载超时');
            }
          }, 10000);
        });

        const duration = video.duration;
        if (!duration || !isFinite(duration)) {
          extractingFramesRef.current = false;
          return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const frames: string[] = [];
        const frameCount = 6;
        const interval = duration / (frameCount + 1); // 均匀分布，不包括开始和结束

        // 使用 requestIdleCallback 分批提取帧，避免阻塞主线程
        const extractFrame = (index: number): Promise<void> => {
          return new Promise((resolve) => {
            const time = interval * index;
            video.currentTime = time;
            video.onseeked = () => {
              // 在空闲时执行绘制操作
              const drawFrame = () => {
                try {
                  ctx.drawImage(video, 0, 0);
                  
                  // 尝试提取帧，如果 CORS 失败则跳过
                  // 注意：toBlob 是异步的，CORS 错误会在回调中表现为 blob 为 null
                  // 但 SecurityError 会在调用时同步抛出
                  try {
                    canvas.toBlob(
                      (blob) => {
                        if (blob) {
                          const url = URL.createObjectURL(blob);
                          frames.push(url);
                        } else {
                          // blob 为 null 可能是 CORS 限制
                          if (process.env.NODE_ENV !== 'production') {
                            console.warn('无法提取视频帧：blob 为 null（可能是 CORS 限制）');
                          }
                        }
                        resolve();
                      },
                      'image/jpeg',
                      0.8
                    );
                  } catch (blobError: any) {
                    // CORS 错误：canvas 被污染，无法导出
                    // SecurityError 会在同步调用时抛出
                    if (blobError.name === 'SecurityError' || blobError.message?.includes('Tainted')) {
                      if (process.env.NODE_ENV !== 'production') {
                        console.warn('无法提取视频帧（CORS 限制）:', blobError.message);
                      }
                    } else {
                      if (process.env.NODE_ENV !== 'production') {
                        console.warn('提取视频帧时发生错误:', blobError);
                      }
                    }
                    resolve(); // 继续处理下一帧
                  }
                } catch (drawError) {
                  // 绘制错误，跳过这一帧
                  if (process.env.NODE_ENV !== 'production') {
                    console.warn('绘制视频帧失败:', drawError);
                  }
                  resolve();
                }
              };

              // 使用 requestIdleCallback 延迟绘制，如果浏览器不支持则立即执行
              if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
                requestIdleCallback(drawFrame, { timeout: 100 });
              } else {
                // 降级方案：使用 setTimeout 延迟执行
                setTimeout(drawFrame, 0);
              }
            };
          });
        };

        // 分批提取帧，避免一次性阻塞
        for (let i = 1; i <= frameCount; i++) {
          await extractFrame(i);
        }

        // 如果成功提取了至少一帧，才设置缩略图
        // 如果因为 CORS 问题没有提取到任何帧，保持空数组（不显示缩略图）
        if (frames.length > 0) {
          setVideoThumbnails(frames);
        } else {
          // 没有提取到任何帧（可能是 CORS 问题），静默失败
          if (process.env.NODE_ENV !== 'production') {
            console.warn('视频帧提取失败：可能是 CORS 限制，视频需要配置 CORS 头才能提取帧');
          }
        }
        extractingFramesRef.current = false;
      } catch (error) {
        // 捕获所有错误，包括 CORS 错误
        if (process.env.NODE_ENV !== 'production') {
          console.warn('提取视频帧失败:', error);
        }
        setVideoThumbnails([]);
        extractingFramesRef.current = false;
        lastVideoUrlRef.current = null;
      }
    };

    // 延迟执行视频帧提取，优先保证首屏渲染
    // 使用 requestIdleCallback 在浏览器空闲时执行，避免影响 LCP
    // 进一步延迟到 5 秒，确保首屏完全渲染后再执行
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      requestIdleCallback(() => {
        // 再次延迟，确保首屏渲染完成
        setTimeout(() => {
          extractFrames();
        }, 3000); // 额外延迟 3 秒
      }, { timeout: 5000 }); // 最多等待 5 秒才开始
    } else {
      // 降级方案：延迟 5 秒执行
      setTimeout(() => {
        extractFrames();
      }, 5000);
    }
  }, [viewMode, imageUrls.length, firstVideoUrl]);

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

  // 使用 useMemo 缓存索引计算，避免每次渲染都重新计算
  const validIndex = useMemo(
    () => galleryUrls.length > 0 ? Math.min(currentIndex, galleryUrls.length - 1) : 0,
    [galleryUrls.length, currentIndex]
  );
  
  const firstVideoIndexForDisplay = useMemo(
    () => galleryUrls.findIndex((url) => isVideoUrl(url)),
    [galleryUrls, isVideoUrl]
  );
  
  const firstImageIndexForDisplay = useMemo(
    () => galleryUrls.findIndex((url) => !isVideoUrl(url)),
    [galleryUrls, isVideoUrl]
  );
  
  const isClassic = viewMode === 'classic';
  const isGrid = viewMode === 'grid';
  const isOverlayMode = !isClassic && !isGrid;
  
  const displayIndex = useMemo(
    () =>
      viewMode === 'grid' && isHoveringPreview && firstVideoIndexForDisplay >= 0
        ? firstVideoIndexForDisplay
        : firstImageIndexForDisplay >= 0
        ? firstImageIndexForDisplay
        : validIndex,
    [viewMode, isHoveringPreview, firstVideoIndexForDisplay, firstImageIndexForDisplay, validIndex]
  );
  // 优化图片宽度：根据视图模式和优先级使用更小的尺寸以减少网络流量
  // 首屏图片使用更小的尺寸以提升 LCP，非首屏图片可以使用稍大尺寸
  const optimizedImageWidth = useMemo(() => {
    // 首屏优先加载的图片使用更小尺寸，提升加载速度
    if (priority) {
      switch (viewMode) {
        case 'thumbnail':
          return 240; // 首屏缩略图模式：更小尺寸以提升 LCP（从360缩小到240）
        case 'grid':
          return 240; // 首屏宫格模式：更小尺寸以提升 LCP（从320缩小到240）
        case 'classic':
        default:
          return 320; // 首屏经典模式：更小尺寸以提升 LCP（从400缩小到320）
      }
    }
    // 非首屏图片可以使用稍大尺寸
    switch (viewMode) {
      case 'thumbnail':
        return 300; // 从450缩小到300，适配更小的卡片
      case 'grid':
        return 300; // 从400缩小到300，适配更小的卡片
      case 'classic':
      default:
        return 400; // 从560缩小到400，适配更小的卡片
    }
  }, [viewMode, priority]);

  // 使用 useMemo 缓存当前源和 URL 计算
  const currentSource = useMemo(
    () => galleryUrls[displayIndex],
    [galleryUrls, displayIndex]
  );
  
  const currentIsVideo = useMemo(
    () => currentSource ? isVideoUrl(currentSource) : false,
    [currentSource, isVideoUrl]
  );
  
  const optimizedImageUrl = useMemo(
    () => currentSource && !currentIsVideo
      ? getOptimizedImageUrl(currentSource, optimizedImageWidth)
      : '',
    [currentSource, currentIsVideo, optimizedImageWidth]
  );
  
  const currentUrl = useMemo(
    () => currentSource
      ? currentIsVideo
        ? getClientAssetUrl(currentSource)
        : optimizedImageUrl
      : '',
    [currentSource, currentIsVideo, optimizedImageUrl]
  );
  
  // 使用 useMemo 缓存样式类名计算
  const previewAspectClass = useMemo(
    () => viewMode === 'thumbnail' ? 'aspect-video' : viewMode === 'grid' ? 'aspect-square' : 'aspect-[4/3]',
    [viewMode]
  );
  
  const previewBackgroundClass = useMemo(
    () => viewMode === 'thumbnail' ? 'bg-black' : 'bg-muted',
    [viewMode]
  );
  
  const mediaObjectClass = useMemo(
    () => viewMode === 'grid' ? 'object-cover' : 'object-contain',
    [viewMode]
  );
  
  const showNavigation = useMemo(
    () => (isClassic || isGrid) && galleryUrls.length > 1,
    [isClassic, isGrid, galleryUrls.length]
  );
  
  const showIndicators = showNavigation;
  
  // 使用 useMemo 缓存标签处理
  const rawTags = useMemo(
    () => Array.isArray(asset.tags)
      ? asset.tags
      : typeof (asset as any).tags === 'string'
      ? (asset as any).tags
          .split(',')
          .map((t: string) => t.trim())
          .filter(Boolean)
      : [],
    [asset.tags]
  );
  
  const tagLimit = isClassic ? 3 : 2;
  const displayTags = useMemo(
    () => rawTags.slice(0, tagLimit),
    [rawTags, tagLimit]
  );
  
  const remainingTagCount = useMemo(
    () => Math.max(0, rawTags.length - displayTags.length),
    [rawTags.length, displayTags.length]
  );
  
  const secondaryText = useMemo(
    () => [asset.type, ...displayTags].filter(Boolean).join(' · '),
    [asset.type, displayTags]
  );
  const overlayActionButtonClass = isOverlayMode
    ? 'h-6 w-6 rounded-full bg-black/60 text-white transition hover:bg-black/80 flex-shrink-0 flex items-center justify-center relative z-50'
    : 'h-8 w-8 rounded-full bg-black/60 text-white transition hover:bg-black/80 flex-shrink-0 flex items-center justify-center relative z-50';
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
          className={cn(overlayActionButtonClass, isSelected && 'bg-primary text-primary-foreground hover:bg-primary/90', 'pointer-events-auto')}
        >
          {isSelected ? <Check className={isOverlayMode ? "h-3 w-3" : "h-4 w-4"} /> : <Plus className={isOverlayMode ? "h-3 w-3" : "h-4 w-4"} />}
          <span className="sr-only">{selectionButtonTitle}</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="复制 NAS 路径"
          onClick={handleCopyNasClick}
          className={cn(overlayActionButtonClass, 'pointer-events-auto')}
        >
          <FolderOpen className={isOverlayMode ? "h-3 w-3" : "h-4 w-4"} />
          <span className="sr-only">复制 NAS 路径</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="查看详情"
          onClick={handleDetailButtonClick}
          className={cn(overlayActionButtonClass, 'pointer-events-auto')}
        >
          <Eye className={isOverlayMode ? "h-3 w-3" : "h-4 w-4"} />
          <span className="sr-only">查看详情</span>
        </Button>
      </>
    );
  };

  const gridConfig = useMemo(() => {
    // 如果只有视频，使用视频缩略图（6帧）
    const length = imageUrls.length > 0 ? imageUrls.length : (videoThumbnails.length > 0 ? videoThumbnails.length : 0);
    if (length <= 1) {
      return { rows: 1, cols: 1, cells: 1 };
    }
    if (length === 2) {
      return { rows: 1, cols: 2, cells: 2 };
    }
    if (length <= 4) {
      return { rows: 2, cols: 2, cells: 4 };
    }
    if (length <= 6) {
      return { rows: 2, cols: 3, cells: 6 };
    }
    return { rows: 3, cols: 3, cells: 9 };
  }, [imageUrls.length, videoThumbnails.length]);

  const maxCells = gridConfig.cells;
  const thumbnailsPerPage = maxCells;
  // 优先使用图片，如果没有图片则使用视频缩略图
  const allThumbnails = imageUrls.length > 0 ? imageUrls : videoThumbnails;
  const totalPages = allThumbnails.length <= thumbnailsPerPage ? 1 : Math.ceil(allThumbnails.length / thumbnailsPerPage);
  const pagedThumbnails = useMemo(() => {
    if (totalPages <= 1) {
      return allThumbnails.slice(0, maxCells);
    }
    const start = thumbnailPage * thumbnailsPerPage;
    return allThumbnails.slice(start, start + thumbnailsPerPage);
  }, [allThumbnails, maxCells, thumbnailPage, thumbnailsPerPage, totalPages]);

  useEffect(() => {
    if (thumbnailPage > totalPages - 1) {
      setThumbnailPage(totalPages - 1);
    }
  }, [thumbnailPage, totalPages]);

  // 悬停时才播放视频，离开后暂停（预览图区域）
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

  // 悬停时才播放视频，离开后暂停（缩略图区域）
  useEffect(() => {
    if (viewMode !== 'classic' && viewMode !== 'grid') return;

    thumbnailVideoRefs.current.forEach((video, index) => {
      if (!video) return;

      if (hoveredThumbnailIndex === index && isHoveringThumbnails) {
        video.muted = true;
        video.play().catch((err) => {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('缩略图视频播放失败:', err);
          }
        });
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [viewMode, hoveredThumbnailIndex, isHoveringThumbnails]);

  // 清理定时器和视频缩略图 blob URL
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      // 释放视频缩略图的 blob URL
      videoThumbnails.forEach((url) => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [videoThumbnails]);

  // 自动滚动播放超长名称
  // 使用 requestIdleCallback 延迟初始化，避免阻塞首屏渲染
  useEffect(() => {
    const nameElement = nameRef.current;
    if (!nameElement) return;

    let startDelay: NodeJS.Timeout | null = null;
    let idleCallbackId: number | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    let handleMouseEnter: (() => void) | null = null;
    let handleMouseLeave: (() => void) | null = null;
    let isPaused = false;
    let pauseTime = Date.now();

    // 延迟检查滚动需求，优先保证首屏渲染
    const initScroll = () => {
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
      pauseTime = Date.now() + pauseDuration;
      isPaused = false;

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

      // 监听鼠标事件来控制暂停/恢复
      handleMouseEnter = () => {
        isPaused = true;
      };

      handleMouseLeave = () => {
        isPaused = false;
        pauseTime = Date.now() + pauseDuration; // 重新开始暂停计时
      };

      nameElement.addEventListener('mouseenter', handleMouseEnter);
      nameElement.addEventListener('mouseleave', handleMouseLeave);

      // 延迟启动动画，让用户先看到开头
      startDelay = setTimeout(() => {
        if (!isPaused) {
          scrollAnimationRef.current = requestAnimationFrame(animate);
        }
      }, 1000);
    };

    // 使用 requestIdleCallback 延迟初始化滚动，避免阻塞首屏渲染
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleCallbackId = requestIdleCallback(initScroll, { timeout: 2000 });
    } else {
      // 降级方案：延迟 500ms 执行
      timeoutId = setTimeout(initScroll, 500);
    }

    // 清理函数
    return () => {
      if (idleCallbackId !== null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        cancelIdleCallback(idleCallbackId);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (startDelay) {
        clearTimeout(startDelay);
      }
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current);
      }
      if (handleMouseEnter && nameElement) {
        nameElement.removeEventListener('mouseenter', handleMouseEnter);
      }
      if (handleMouseLeave && nameElement) {
        nameElement.removeEventListener('mouseleave', handleMouseLeave);
      }
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

  // 使用传入的卡片宽度，如果没有则使用默认值
  const cardWidth = propCardWidth || 240;
  
  // 根据紧凑模式调整卡片尺寸
  const sizeMultiplier = compactMode ? 0.75 : 1; // 紧凑模式缩小25%
  
  // 智能缩放：根据卡片宽度动态计算高度，保持比例
  // 基准宽度240px对应的基准高度
  const baseCardWidth = 240;
  const baseClassicHeight = 240; // 经典模式基准高度（4:5比例）
  const baseGridHeight = 240; // 宫格模式基准高度（1:1比例）
  const baseCompactHeight = 150; // 缩略图模式基准高度（16:9比例）
  
  // 根据实际卡片宽度按比例缩放高度
  const widthRatio = cardWidth / baseCardWidth;
  const classicHeight = Math.floor(baseClassicHeight * widthRatio * sizeMultiplier); // 经典模式高度
  const gridHeight = Math.floor(baseGridHeight * widthRatio * sizeMultiplier); // 1:1 方形
  const compactHeight = Math.floor(baseCompactHeight * widthRatio * sizeMultiplier); // 缩略图模式高度
  
  // 智能缩放预览区域高度
  // 注意：这里需要先判断视图模式，所以使用 viewMode 而不是 isClassic/isGrid
  // 经典模式：预览区域和缩略图区域各占一半高度（减去间距）
  const spacing = 8; // 两个区域之间的间距
  const previewAreaHeight = viewMode === 'classic'
    ? Math.floor((classicHeight - spacing) / 2) // 预览区域占一半
    : viewMode === 'grid'
    ? gridHeight // 宫格模式使用整个卡片高度
    : Math.floor(cardWidth * 0.5625 * sizeMultiplier); // 缩略图模式：16:9比例 (9/16 = 0.5625)
  
  // 经典模式的缩略图区域高度（与预览区域相同）
  const classicThumbnailHeight = viewMode === 'classic'
    ? Math.floor((classicHeight - spacing) / 2) // 缩略图区域占一半
    : compactHeight; // 非经典模式使用原来的 compactHeight
  
  const primaryTags = Array.isArray(asset.tags) ? asset.tags : [];
  const combinedTags = primaryTags;
  const secondaryRowText = [asset.type, ...combinedTags].filter(Boolean).join(' · ');
  const secondaryRowHtml = highlightText(secondaryRowText, keyword || '');

  return (
    <>
      <div
        className={(isClassic || isGrid) ? 'space-y-2' : undefined}
        style={{ width: cardWidth }}
      >
        <Card
          className={cn(
            "group relative flex flex-col rounded-xl border border-white/10 bg-white/[0.03] shadow-sm transition hover:shadow-lg dark:border-white/[0.08] dark:bg-white/[0.04]",
            isClassic ? "overflow-hidden" : "overflow-visible"
          )}
          style={{ 
            width: '100%', 
            height: isGrid ? gridHeight : (isClassic ? classicHeight : compactHeight),
            // 经典模式：确保两个区域之间有间距
            ...(isClassic ? { gap: `${spacing}px` } : {})
          }}
        >
          {isGrid ? (
            // 宫格图预览：直接显示缩略图网格，不显示预览图区域，1:1方形
            <div 
              className="overflow-hidden rounded-t-xl rounded-b-xl"
              style={{ height: gridHeight }}
              onMouseEnter={() => setIsHoveringThumbnails(true)}
              onMouseLeave={() => {
                setIsHoveringThumbnails(false);
                setHoveredThumbnailIndex(null);
                setHoveredThumbnailPreview(null);
              }}
            >
              <div
                className="grid h-full"
                style={{
                  gridTemplateColumns: `repeat(${gridConfig.cols}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${gridConfig.rows}, minmax(0, 1fr))`,
                  gap: 0,
                }}
              >
                {Array.from({ length: gridConfig.cells }).map((_, idx) => {
                  const thumbnailUrl = pagedThumbnails[idx];
                  const isVideoThumbnail = imageUrls.length === 0 && idx < videoThumbnails.length;
                  const correspondingVideoUrl = isVideoThumbnail && videoUrls.length > 0 ? videoUrls[0] : null;
                  
                  return (
                    <div
                      key={`thumb-grid-${thumbnailPage}-${idx}`}
                      ref={(el) => {
                        thumbnailRefs.current[idx] = el;
                      }}
                      className="relative h-full w-full overflow-hidden"
                      onMouseEnter={() => {
                        if (hoveredThumbnailIndex !== idx) {
                          setHoveredThumbnailIndex(idx);
                          if (thumbnailUrl && !isVideoThumbnail) {
                            // 计算弹出位置：朝向画面中心，但不脱离原选项卡
                            const element = thumbnailRefs.current[idx];
                            if (element) {
                              const rect = element.getBoundingClientRect();
                              const viewportCenterX = window.innerWidth / 2;
                              const viewportCenterY = window.innerHeight / 2;
                              const elementCenterX = rect.left + rect.width / 2;
                              const elementCenterY = rect.top + rect.height / 2;
                              
                              // 判断元素相对于视口中心的位置
                              const isLeftOfCenter = elementCenterX < viewportCenterX;
                              const isTopOfCenter = elementCenterY < viewportCenterY;
                              
                              // 判断是否在最上一行（距离顶部较近，小于视口高度的30%）
                              const isTopRow = rect.top < window.innerHeight * 0.3;
                              // 判断是否在最下一行（距离底部较近）
                              const isBottomRow = rect.bottom > window.innerHeight * 0.7;
                              
                              // 确定弹出位置：朝向画面中心
                              let position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
                              
                              if (isTopRow) {
                                // 最上一行：向下弹出，根据左右位置选择
                                position = isLeftOfCenter ? 'bottom-left' : 'bottom-right';
                              } else if (isBottomRow) {
                                // 最下一行：向上弹出，根据左右位置选择
                                position = isLeftOfCenter ? 'top-left' : 'top-right';
                              } else {
                                // 中间区域：朝向中心
                                // 左侧元素：弹出框在右侧（朝向中心）
                                // 右侧元素：弹出框在左侧（朝向中心）
                                if (isLeftOfCenter) {
                                  // 左侧：弹出框在右侧，根据上下位置选择
                                  position = isTopOfCenter ? 'bottom-left' : 'top-left';
                                } else {
                                  // 右侧：弹出框在左侧，根据上下位置选择
                                  position = isTopOfCenter ? 'bottom-right' : 'top-right';
                                }
                              }
                              
                              setHoveredThumbnailPreview({ 
                                index: idx, 
                                url: thumbnailUrl, 
                                position,
                                offsetX: rect.left,
                                offsetY: rect.top,
                              });
                            } else {
                              setHoveredThumbnailPreview({ index: idx, url: thumbnailUrl, position: 'top-left' });
                            }
                          }
                        }
                      }}
                      onMouseLeave={() => {
                        if (hoveredThumbnailIndex !== null) {
                          setHoveredThumbnailIndex(null);
                          setHoveredThumbnailPreview(null);
                        }
                      }}
                    >
                      {thumbnailUrl ? (
                        <>
                          {isVideoThumbnail && correspondingVideoUrl ? (
                            <>
                              <Image
                                src={thumbnailUrl}
                                alt={`${asset.name} 预览 ${thumbnailPage * thumbnailsPerPage + idx + 1}`}
                                fill
                                className="object-cover transition-opacity duration-200"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                loading="lazy"
                                style={{
                                  opacity: hoveredThumbnailIndex === idx ? 0 : 1,
                                }}
                              />
                              <video
                                ref={(el) => {
                                  thumbnailVideoRefs.current[idx] = el;
                                }}
                                src={getClientAssetUrl(correspondingVideoUrl)}
                                className="absolute inset-0 h-full w-full object-cover transition-opacity duration-200"
                                style={{
                                  opacity: hoveredThumbnailIndex === idx ? 1 : 0,
                                }}
                                muted
                                loop
                                playsInline
                                preload="none"
                                onMouseEnter={(e) => {
                                  // 只在用户悬停时才开始加载视频，减少不必要的流量
                                  if (e.currentTarget.readyState === 0) {
                                    e.currentTarget.load();
                                  }
                                }}
                              />
                            </>
                          ) : (
                            <>
                              <Image
                                  src={getOptimizedImageUrl(thumbnailUrl, 240)}
                                  alt={`${asset.name} 预览 ${thumbnailPage * thumbnailsPerPage + idx + 1}`}
                                  fill
                                  className="object-cover"
                                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                  loading="lazy"
                                  unoptimized={getOptimizedImageUrl(thumbnailUrl, 240).includes('x-oss-process=image')}
                                />
                              {/* 悬停预览弹出框 - 智能定位，朝向画面中心 */}
                              {hoveredThumbnailPreview?.index === idx && (
                                <ThumbnailPreviewPopover
                                  position={hoveredThumbnailPreview.position}
                                  thumbnailUrl={thumbnailUrl}
                                  assetName={asset.name}
                                  index={thumbnailPage * thumbnailsPerPage + idx + 1}
                                  elementRef={thumbnailRefs.current[idx]}
                                />
                              )}
                            </>
                          )}
                        </>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <div className="pointer-events-none absolute bottom-4 right-4 z-50 flex gap-1">
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
          ) : (
            <div
              className={cn(
                'relative flex w-full items-center justify-center overflow-hidden cursor-pointer',
                isOverlayMode ? 'rounded-xl' : 'rounded-t-xl', // 缩略图模式：全部圆角；经典模式：只圆顶部
                previewBackgroundClass,
                !isClassic && previewAspectClass // 非经典模式使用aspect类
              )}
              style={isClassic ? { height: previewAreaHeight } : undefined} // 经典模式使用动态计算的高度
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
                  preload="none"
                  className={`absolute inset-0 h-full w-full ${mediaObjectClass} transition-opacity duration-200 ${
                    isOverlayMode ? 'rounded-xl' : 'rounded-t-xl'
                  } ${
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
                className={`z-10 object-cover transition-transform duration-300 group-hover:scale-[1.02] ${
                  isOverlayMode ? 'rounded-xl' : 'rounded-t-xl'
                }`}
                sizes={priority ? "(max-width: 768px) 100vw, 400px" : "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"}
                loading={priority ? 'eager' : 'lazy'}
                priority={priority}
                fetchPriority={priority ? 'high' : 'auto'}
                unoptimized={currentUrl.includes('x-oss-process=image')}
                onError={(e) => {
                  if (process.env.NODE_ENV !== 'production') {
                    console.error('图片加载失败:', currentUrl);
                  }
                  if ((currentUrl.startsWith('/assets/') || galleryUrls[displayIndex]?.startsWith('/assets/')) && galleryUrls[displayIndex]) {
                    const ossConfig = typeof window !== 'undefined' ? window.__OSS_CONFIG__ : null;
                    if (ossConfig && ossConfig.bucket && ossConfig.region) {
                      const ossPath = galleryUrls[displayIndex].startsWith('/')
                        ? galleryUrls[displayIndex].substring(1)
                        : galleryUrls[displayIndex];
                      const region = ossConfig.region.replace(/^oss-/, '');
                      const fullUrl = `https://${ossConfig.bucket}.oss-${region}.aliyuncs.com/${ossPath}`;
                      if (process.env.NODE_ENV !== 'production') {
                        console.warn('尝试使用完整 OSS URL:', fullUrl);
                      }
                      (e.target as HTMLImageElement).src = fullUrl;
                    } else {
                      if (process.env.NODE_ENV !== 'production') {
                        console.warn('OSS 路径加载失败，请检查配置');
                      }
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
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-2">
                  <div className="truncate text-xs font-semibold text-white">{asset.name}</div>
                  {!compactMode && (
                    <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-white/80">
                      <span className="font-medium text-white/90">{asset.type}</span>
                      {displayTags.map((tag: string) => (
                        <span
                          key={tag}
                          className="rounded-full bg-white/15 px-1.5 py-0.5 text-[9px] leading-none text-white"
                        >
                          {tag}
                        </span>
                      ))}
                      {remainingTagCount > 0 && (
                        <span className="text-[9px] text-white/70">+{remainingTagCount}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="pointer-events-none absolute right-1.5 top-1.5 z-50 flex gap-0.5">
                  {renderActionButtons()}
                </div>
                {/* 紧凑/完整显示切换按钮 */}
                {onCompactModeToggle && (
                  <div className="pointer-events-none absolute left-1.5 top-1.5 z-50">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onCompactModeToggle();
                      }}
                      className="pointer-events-auto h-6 w-6 rounded-full bg-black/60 text-white transition hover:bg-black/80 flex-shrink-0 flex items-center justify-center"
                      title={compactMode ? '切换到完整显示' : '切换到紧凑显示'}
                    >
                      {compactMode ? (
                        <Maximize2 className="h-3 w-3" />
                      ) : (
                        <Minimize2 className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}

            {currentIsVideo && (
              <div className={`absolute ${isOverlayMode ? 'left-1.5 top-1.5' : 'left-2 top-2'} z-20 rounded-full bg-black/70 ${isOverlayMode ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'} font-semibold uppercase tracking-wide text-white`}>
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

            {/* 点击区域：排除按钮区域 */}
            <div
              className="absolute inset-0 z-0 cursor-pointer"
              onClick={(e) => {
                const target = e.target as HTMLElement;
                
                // 检查点击的元素是否是按钮或按钮内的元素
                // 使用更严格的检查，确保按钮点击不会被拦截
                const clickedButton = target.closest('button');
                if (clickedButton) {
                  // 如果点击的是按钮，不处理，让按钮自己的事件处理
                  // 按钮已经有 stopPropagation()，所以这里直接返回即可
                  return;
                }
                
                // 检查是否点击了按钮容器内的元素
                // 按钮容器是 pointer-events-none，但按钮本身是 pointer-events-auto
                // 如果点击穿透到了按钮容器，说明点击的不是按钮本身
                // 但我们需要检查点击的元素是否在按钮的视觉区域内
                const buttonContainer = target.closest('[class*="z-50"]');
                if (buttonContainer) {
                  // 检查按钮容器内是否有按钮，并且点击的元素是否是按钮或按钮的子元素
                  const buttonsInContainer = buttonContainer.querySelectorAll('button');
                  for (const button of Array.from(buttonsInContainer)) {
                    // 检查点击的元素是否在按钮内
                    if (button.contains(target) || button === target) {
                      return;
                    }
                  }
                }

                // 检查父元素链中是否有按钮（排除图片和视频元素）
                let currentElement: HTMLElement | null = target;
                while (currentElement && currentElement !== e.currentTarget) {
                  // 如果当前元素是按钮，不处理
                  if (currentElement.tagName === 'BUTTON' || currentElement.getAttribute('role') === 'button') {
                    return;
                  }
                  
                  // 跳过图片和视频元素，继续向上查找
                  if (currentElement.tagName === 'IMG' || currentElement.tagName === 'VIDEO') {
                    currentElement = currentElement.parentElement;
                    continue;
                  }
                  
                  currentElement = currentElement.parentElement;
                }

                // 只有确认不是点击按钮时，才处理卡片点击
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
          )}

          {isClassic && (
            <div 
              className="overflow-hidden rounded-b-xl"
              style={{ height: classicThumbnailHeight }}
              onMouseEnter={() => setIsHoveringThumbnails(true)}
              onMouseLeave={() => {
                setIsHoveringThumbnails(false);
                setHoveredThumbnailIndex(null);
              }}
            >
              <div
                className="grid h-full"
                style={{
                  gridTemplateColumns: `repeat(${gridConfig.cols}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${gridConfig.rows}, minmax(0, 1fr))`,
                  gap: 0,
                }}
              >
                {Array.from({ length: gridConfig.cells }).map((_, idx) => {
                  const thumbnailUrl = pagedThumbnails[idx];
                  const isVideoThumbnail = imageUrls.length === 0 && idx < videoThumbnails.length;
                  const correspondingVideoUrl = isVideoThumbnail && videoUrls.length > 0 ? videoUrls[0] : null;
                  
                  return (
                    <div
                      key={`thumb-${thumbnailPage}-${idx}`}
                      className="relative h-full w-full overflow-hidden"
                      onMouseEnter={() => {
                        if (hoveredThumbnailIndex !== idx) {
                          setHoveredThumbnailIndex(idx);
                        }
                      }}
                      onMouseLeave={() => {
                        if (hoveredThumbnailIndex !== null) {
                          setHoveredThumbnailIndex(null);
                        }
                      }}
                    >
                      {thumbnailUrl ? (
                        <>
                          {isVideoThumbnail && correspondingVideoUrl ? (
                            <>
                              <Image
                                src={thumbnailUrl}
                                alt={`${asset.name} 预览 ${thumbnailPage * thumbnailsPerPage + idx + 1}`}
                                fill
                                className="object-cover transition-opacity duration-200"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                loading="lazy"
                                style={{
                                  opacity: hoveredThumbnailIndex === idx ? 0 : 1,
                                }}
                              />
                              <video
                                ref={(el) => {
                                  thumbnailVideoRefs.current[idx] = el;
                                }}
                                src={getClientAssetUrl(correspondingVideoUrl)}
                                className="absolute inset-0 h-full w-full object-cover transition-opacity duration-200"
                                style={{
                                  opacity: hoveredThumbnailIndex === idx ? 1 : 0,
                                }}
                                muted
                                loop
                                playsInline
                                preload="none"
                                onMouseEnter={(e) => {
                                  // 只在用户悬停时才开始加载视频，减少不必要的流量
                                  if (e.currentTarget.readyState === 0) {
                                    e.currentTarget.load();
                                  }
                                }}
                              />
                            </>
                          ) : (
                            <Image
                              src={getOptimizedImageUrl(thumbnailUrl, 240)}
                              alt={`${asset.name} 预览 ${thumbnailPage * thumbnailsPerPage + idx + 1}`}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              loading="lazy"
                              unoptimized={thumbnailUrl.startsWith('http') || thumbnailUrl.startsWith('/assets/')}
                            />
                          )}
                        </>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <div className="pointer-events-none absolute bottom-4 right-4 z-50 flex gap-1">
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

          {(isClassic || isGrid) && !compactMode && (
            <div className="pointer-events-none absolute bottom-2 left-3 flex items-center gap-3 text-[10px] text-white/90">
              {asset.style && (
                <span>{Array.isArray(asset.style) ? asset.style.join('、') : asset.style}</span>
              )}
              {asset.engineVersion && <span>{asset.engineVersion}</span>}
              {asset.source && <span>{asset.source}</span>}
            </div>
          )}
          {/* 紧凑/完整显示切换按钮（经典和宫格模式） */}
          {(isClassic || isGrid) && onCompactModeToggle && (
            <div className="pointer-events-none absolute top-2 right-2 z-50">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onCompactModeToggle();
                }}
                className="pointer-events-auto h-7 w-7 rounded-full bg-black/60 text-white transition hover:bg-black/80 flex-shrink-0 flex items-center justify-center"
                title={compactMode ? '切换到完整显示' : '切换到紧凑显示'}
              >
                {compactMode ? (
                  <Maximize2 className="h-3.5 w-3.5" />
                ) : (
                  <Minimize2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          )}
        </Card>

        {(isClassic || isGrid) && (
          <div className={cn("space-y-1 px-1", compactMode && "space-y-0.5")}>
            <Link href={`/assets/${asset.id}`} className="block">
              <h3
                ref={nameRef}
                className={cn(
                  "font-semibold leading-tight text-foreground transition-colors hover:text-primary truncate",
                  compactMode ? "text-xs" : "text-sm"
                )}
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                dangerouslySetInnerHTML={{ __html: highlightedName }}
              />
            </Link>
            {!compactMode && (
              <p
                className="text-xs text-muted-foreground truncate"
                dangerouslySetInnerHTML={{ __html: secondaryRowHtml }}
              />
            )}
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
                src={currentSource ? getOptimizedImageUrl(currentSource, 1080) : ''}
                alt={`${asset.name} - ${displayIndex + 1}`}
                fill
                className="object-contain"
                sizes="100vw"
                unoptimized={currentSource ? getOptimizedImageUrl(currentSource, 1080).includes('x-oss-process=image') : false}
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
}, (prevProps, nextProps) => {
  // 自定义比较函数，只在关键属性变化时重新渲染
  return (
    prevProps.asset.id === nextProps.asset.id &&
    prevProps.asset.thumbnail === nextProps.asset.thumbnail &&
    prevProps.asset.src === nextProps.asset.src &&
    prevProps.asset.gallery?.length === nextProps.asset.gallery?.length &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.priority === nextProps.priority &&
    prevProps.viewMode === nextProps.viewMode &&
    prevProps.officeLocation === nextProps.officeLocation &&
    prevProps.keyword === nextProps.keyword
  );
});