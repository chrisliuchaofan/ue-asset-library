'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Library, Box, BookOpen } from 'lucide-react';
import clsx from 'clsx';
import { SearchBox } from '@/components/search-box';
import { HomeProjectSelector } from '@/components/home-project-selector';

/**
 * AnimatedHero - 首页 Hero 组件
 * 使用纯 CSS 动画实现，不依赖第三方动画库
 */
export function AnimatedHero() {
  const [mounted, setMounted] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [stars, setStars] = useState<Array<{
    id: number;
    top: string;
    left: string;
    delay: string;
    duration: string;
  }>>([]);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    // 标记动画已执行，确保只执行一次
    if (!hasAnimatedRef.current) {
      hasAnimatedRef.current = true;
    }
    
    // 只在客户端生成随机星点数据，避免 hydration mismatch
    setStars(
      Array.from({ length: 20 }, (_, i) => ({
        id: i,
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 4}s`,
        duration: `${3 + Math.random() * 4}s`, // 3-7秒
      }))
    );
  }, []);

  return (
    <section className="relative z-10 mx-auto flex h-[100svh] max-w-[960px] flex-col items-center justify-center px-6 text-center -translate-y-6">
      {/* Hero 专用：背景星点 twinkle 效果 - 只在客户端渲染避免 hydration mismatch */}
      {mounted && stars.length > 0 && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {stars.map((star) => (
            <div
              key={star.id}
              className="hero-star absolute w-1 h-1 rounded-full bg-white"
              style={{
                top: star.top,
                left: star.left,
                animationDelay: star.delay,
                animationDuration: star.duration,
              }}
            />
          ))}
        </div>
      )}

      {/* Hero 专用：标题进场动画 */}
      <h1
        className={clsx(
          'hero-title text-5xl md:text-7xl font-extrabold tracking-[-0.02em] leading-[1.08]',
          'relative inline-block mb-6 whitespace-nowrap',
          mounted && 'hero-title-visible'
        )}
      >
        {/* Hero 专用：标题文字扫光效果 */}
        <span className="hero-title-text relative inline-block whitespace-nowrap">
          <span className="hero-title-base">恒星资产库</span>
          {/* 暂时禁用扫光动画，避免文字被截断 */}
          {/* <span className="hero-title-shine">恒星资产库</span> */}
        </span>
      </h1>

      {/* 搜索栏和项目选择 */}
      <div className={clsx(
        'w-full max-w-2xl mb-6 transition-opacity duration-500',
        mounted ? 'opacity-100' : 'opacity-0'
      )}>
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 min-w-0">
            <SearchBox project={selectedProject} />
          </div>
          <div className="flex-shrink-0">
            <HomeProjectSelector value={selectedProject || undefined} onChange={setSelectedProject} />
          </div>
        </div>
      </div>

      {/* 按钮组 */}
      <div className="mt-4 flex items-center gap-4">
        {/* 资产按钮 */}
        <Link
          href="/assets"
          prefetch
          aria-label="进入资产"
          className="hero-button inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm md:text-base font-semibold text-zinc-100 cursor-pointer relative group"
        >
          <Library className="h-5 w-5 hero-button-icon" />
          <span className="hero-button-text">资产</span>
        </Link>

        {/* 素材按钮 */}
        <Link
          href="/materials"
          prefetch
          aria-label="进入素材"
          className="hero-button inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm md:text-base font-semibold text-zinc-100 cursor-pointer relative group"
        >
          <Box className="h-5 w-5 hero-button-icon" />
          <span className="hero-button-text">素材</span>
        </Link>
      </div>

      {/* 使用手册链接 */}
      <Link
        href="/docs"
        target="_blank"
        rel="noopener noreferrer"
        className="hero-docs-link mt-4 inline-flex items-center gap-2 text-sm text-slate-400 transition-colors duration-200 relative group"
      >
        <BookOpen className="h-4 w-4" />
        <span className="hero-docs-text relative inline-block">
          使用手册
        </span>
      </Link>
    </section>
  );
}

