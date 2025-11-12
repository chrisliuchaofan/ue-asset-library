import { useEffect, useRef, useState } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  rootMargin?: string;
  enabled?: boolean;
}

/**
 * 使用 Intersection Observer 实现懒加载
 * 当元素进入视口时，返回 true
 */
export function useIntersectionObserver<T extends HTMLElement = HTMLDivElement>(
  options: UseIntersectionObserverOptions = {}
): [React.RefObject<T | null>, boolean] {
  const { threshold = 0.1, rootMargin = '50px', enabled = true } = options;
  const elementRef = useRef<T | null>(null);
  // 如果不需要懒加载（enabled=false），默认返回 true，允许立即加载
  // 如果需要懒加载（enabled=true），初始为 false，等待进入视口
  const [isIntersecting, setIsIntersecting] = useState(!enabled);

  useEffect(() => {
    // 如果不需要懒加载，直接返回 true
    if (!enabled) {
      setIsIntersecting(true);
      return;
    }

    if (!elementRef.current) {
      return;
    }

    const element = elementRef.current;
    
    // 如果浏览器不支持 Intersection Observer，直接返回 true
    if (typeof IntersectionObserver === 'undefined') {
      setIsIntersecting(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [enabled, threshold, rootMargin]);

  return [elementRef, isIntersecting];
}

