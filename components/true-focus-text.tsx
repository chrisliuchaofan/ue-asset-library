'use client';

import { useEffect, useRef, useState } from 'react';

interface TrueFocusProps {
  sentence: string;
  manualMode?: boolean;
  blurAmount?: number;
  borderColor?: string;
  animationDuration?: number;
  pauseBetweenAnimations?: number;
  className?: string;
}

export function TrueFocusText({
  sentence,
  manualMode = false,
  blurAmount = 5,
  borderColor = 'red',
  animationDuration = 2,
  pauseBetweenAnimations = 1,
  className = '',
}: TrueFocusProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const charRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const animationStartTimeRef = useRef<number | null>(null);
  const currentCharIndexRef = useRef(0);

  // 自动动画模式
  useEffect(() => {
    if (manualMode || !containerRef.current) return;

    let isRunning = true;
    let currentIndex = 0;
    let animationStartTime = 0;
    let isAnimating = false;

    const animate = (currentTime: number) => {
      if (!isRunning) return;

      const totalCycleTime = animationDuration + pauseBetweenAnimations;
      const cycleTime = (currentTime / 1000) % totalCycleTime;

      if (cycleTime < animationDuration) {
        // 动画阶段
        if (!isAnimating) {
          isAnimating = true;
          animationStartTime = currentTime / 1000;
        }

        const progress = (cycleTime / animationDuration);
        // 使用缓动函数
        const easedProgress = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        // 计算当前聚焦的字符索引
        const targetIndex = Math.floor(easedProgress * sentence.length);
        setFocusedIndex(targetIndex);
      } else {
        // 暂停阶段
        if (isAnimating) {
          isAnimating = false;
          setFocusedIndex(null);
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      isRunning = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [manualMode, animationDuration, pauseBetweenAnimations, sentence.length]);

  // 鼠标交互模式
  useEffect(() => {
    if (manualMode) {
      const container = containerRef.current;
      if (!container) return;

      const handleMouseMove = (e: MouseEvent) => {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setMousePos({ x, y });
      };

      const handleMouseEnter = () => {
        setIsHovering(true);
      };

      const handleMouseLeave = () => {
        setIsHovering(false);
        setFocusedIndex(null);
      };

      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseenter', handleMouseEnter);
      container.addEventListener('mouseleave', handleMouseLeave);

      return () => {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseenter', handleMouseEnter);
        container.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, [manualMode]);

  // 更新字符样式
  useEffect(() => {
    if (!containerRef.current) return;

    const updateChars = () => {
      charRefs.current.forEach((charEl, index) => {
        if (!charEl) return;

        let distance = 0;
        let intensity = 0;

        if (manualMode && isHovering) {
          // 手动模式：基于鼠标位置
          const rect = charEl.getBoundingClientRect();
          const containerRect = containerRef.current?.getBoundingClientRect();
          if (!containerRect) return;

          const charCenterX = rect.left + rect.width / 2 - containerRect.left;
          const charCenterY = rect.top + rect.height / 2 - containerRect.top;

          const dx = mousePos.x - charCenterX;
          const dy = mousePos.y - charCenterY;
          distance = Math.sqrt(dx * dx + dy * dy);

          const maxDistance = 150;
          intensity = Math.max(0, 1 - distance / maxDistance);
        } else if (!manualMode && focusedIndex !== null) {
          // 自动模式：基于聚焦索引
          distance = Math.abs(index - focusedIndex);
          const maxDistance = sentence.length / 2;
          intensity = Math.max(0, 1 - distance / maxDistance);
        }

        // 计算样式
        const blur = distance * (blurAmount / 100);
        const scale = 1 + intensity * 0.2;
        const opacity = 1 - intensity * 0.3;

        // 使用 requestAnimationFrame 确保流畅
        charEl.style.transform = `scale(${scale})`;
        charEl.style.filter = `blur(${blur}px)`;
        charEl.style.opacity = String(Math.max(0.3, opacity));
        charEl.style.transition = 'none'; // 禁用 CSS transition，使用 JS 控制
      });

      if (manualMode && isHovering) {
        requestAnimationFrame(updateChars);
      }
    };

    updateChars();
  }, [mousePos, isHovering, focusedIndex, manualMode, blurAmount, sentence.length]);

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${className}`}
      style={{
        border: `2px solid ${borderColor}`,
        padding: '1rem 2rem',
        borderRadius: '8px',
      }}
    >
      <div className="relative inline-flex items-center justify-center">
        {sentence.split('').map((char, index) => {
          if (char === ' ') {
            return <span key={index} className="inline-block w-4">&nbsp;</span>;
          }

          return (
            <span
              key={index}
              ref={(el) => {
                charRefs.current[index] = el;
              }}
              className="inline-block"
              style={{
                transform: 'scale(1)',
                filter: 'blur(0px)',
                opacity: 1,
                willChange: 'transform, filter, opacity', // 优化性能
              }}
            >
              {char}
            </span>
          );
        })}
      </div>
    </div>
  );
}
