'use client';

import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { getOptimizedImageUrl } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  priority?: boolean;
  sizes?: string;
  unoptimized?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  onLoad?: () => void;
  lazy?: boolean; // 是否启用懒加载（Intersection Observer）
}

/**
 * 优化的图片组件
 * - 自动处理 OSS 图片优化
 * - 渐进式加载占位符
 * - Intersection Observer 懒加载支持
 * - 错误处理和重试
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill,
  className,
  priority = false,
  sizes,
  unoptimized,
  placeholder = 'empty',
  blurDataURL,
  onError,
  onLoad,
  lazy = !priority, // 非优先图片默认启用懒加载
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [shouldLoad, setShouldLoad] = useState(!lazy); // 是否应该加载图片
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer 用于懒加载
  useEffect(() => {
    if (!lazy || priority || shouldLoad) {
      return;
    }

    if (!containerRef.current) {
      return;
    }

    // 如果浏览器不支持 Intersection Observer，直接加载
    if (typeof IntersectionObserver === 'undefined') {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // 提前50px开始加载
        threshold: 0.1,
      }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [lazy, priority, shouldLoad]);

  useEffect(() => {
    if (src && shouldLoad) {
      // 自动优化 OSS 图片
      const optimized = getOptimizedImageUrl(src, width || 640);
      setImageSrc(optimized);
      setIsLoading(true);
      setHasError(false);
    }
  }, [src, width, shouldLoad]);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoading(false);
    setHasError(true);
    onError?.(e);
  };

  // 如果出错，显示占位符
  if (hasError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted text-muted-foreground',
          className
        )}
        style={fill ? undefined : { width, height }}
      >
        <span className="text-xs">图片加载失败</span>
      </div>
    );
  }

  // 使用 Next.js Image 组件
  return (
    <div ref={containerRef} className={cn('relative overflow-hidden', className)}>
      {/* 加载中的骨架屏 */}
      {isLoading && shouldLoad && (
        <Skeleton
          className="absolute inset-0"
          style={fill ? undefined : { width, height }}
        />
      )}

      {shouldLoad && (
        <Image
          src={imageSrc || src}
          alt={alt}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          fill={fill}
          className={cn(
            'transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100',
            className
          )}
          priority={priority}
          sizes={sizes}
          unoptimized={unoptimized || imageSrc.includes('x-oss-process=image')}
          placeholder={placeholder}
          blurDataURL={blurDataURL}
          loading={priority ? 'eager' : 'lazy'}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      )}
    </div>
  );
}


