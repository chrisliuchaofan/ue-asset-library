'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Library, Box, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';
import { SearchBox } from '@/components/search-box';
import { HomeProjectSelector } from '@/components/home-project-selector';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * AnimatedHero - 首页 Hero 组件 (方案 B: 磨砂控制台风格 - 优化版)
 * - 点击"恒星"按钮触发，从下方划入
 * - 保留搜索框和两个按钮区域
 * - 去掉多余文字
 * - 性能优化：GPU加速、backdrop-blur优化、背景帧率控制
 */
export function AnimatedHero({ onCardVisible }: { onCardVisible?: (visible: boolean) => void }) {
  const [mounted, setMounted] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true); // 默认显示卡片
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showExpandButton, setShowExpandButton] = useState(false); // 显示展开按钮
  const [viewportHeight, setViewportHeight] = useState(800);
  
  useEffect(() => {
    setMounted(true);
    // 获取视口高度用于收缩动画
    setViewportHeight(window.innerHeight);
    const handleResize = () => {
      setViewportHeight(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 通知父组件卡片可见性变化（用于控制背景帧率）
  useEffect(() => {
    onCardVisible?.(isVisible && !isCollapsed);
  }, [isVisible, isCollapsed, onCardVisible]);

  const handleCollapse = () => {
    setIsCollapsed(true);
    // 收缩后延迟隐藏，让动画完成，然后显示展开按钮
    setTimeout(() => {
      setIsVisible(false);
      setShowExpandButton(true); // 显示展开按钮
    }, 400);
  };

  const handleExpand = () => {
    setShowExpandButton(false); // 立即隐藏展开按钮
    setIsCollapsed(false);
    setIsVisible(true); // 显示卡片
  };

  // 确保卡片和按钮互斥：卡片显示时，按钮必须隐藏
  useEffect(() => {
    if (isVisible) {
      setShowExpandButton(false);
    }
  }, [isVisible]);

  // 卡片动画：从下方划入 / 收缩到底部
  const slideUpVariants = {
    hidden: { 
      opacity: 0, 
      y: 100,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: { 
        duration: 0.6,
        ease: "easeOut" as const
      }
    },
    collapsed: {
      opacity: 0,
      y: viewportHeight, // 收缩到页面底部
      scale: 0.8,
      transition: { 
        duration: 0.4,
        ease: "easeIn" as const
      }
    },
    exit: {
      opacity: 0,
      y: 100,
      scale: 0.95,
      transition: { duration: 0.3, ease: "easeIn" as const }
    }
  };


  return (
    <section 
      className="relative z-10 flex min-h-[100svh] w-full flex-col items-center justify-center px-4"
      style={{ 
        pointerEvents: 'none'
      }}
    >
      {/* 主卡片 - 默认显示 */}
      <AnimatePresence mode="wait">
        {isVisible && (
          <motion.div
            initial="hidden"
            animate={isCollapsed ? "collapsed" : "visible"}
            exit="exit"
            variants={slideUpVariants}
            style={{ 
              pointerEvents: 'auto',
              willChange: 'transform, opacity',
              transform: 'translate3d(0, 0, 0)' // GPU加速
            }}
            data-hero-card
            className={clsx(
              "relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10",
              // 性能优化：降低 backdrop-blur 强度（从 xl 改为 md）
              "bg-black/40 backdrop-blur-md shadow-2xl shadow-black/50",
              "p-5 sm:p-6 md:p-8"
            )}
          >
            {/* 收缩按钮 - 顶部下箭头 */}
            <button
              onClick={handleCollapse}
              className={clsx(
                "absolute top-3 right-3 z-20",
                "flex items-center justify-center",
                "w-8 h-8 rounded-full",
                "bg-white/10 hover:bg-white/20 border border-white/20",
                "text-white/70 hover:text-white",
                "transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              )}
              aria-label="收缩卡片"
            >
              <ChevronDown className="w-4 h-4" />
            </button>

            {/* 顶部光晕装饰 */}
            <div className="absolute -top-16 -left-16 h-32 w-32 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -right-16 h-32 w-32 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center text-center">
              
              {/* 标题区 - 简化版 */}
              <div className="mb-6 md:mb-8">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-sm">
                  <span className="block md:inline">恒星</span>
                  <span className="bg-gradient-to-r from-blue-200 via-white to-blue-200 bg-clip-text text-transparent bg-[length:200%_auto] animate-shine">
                    资产库
                  </span>
                </h1>
              </div>

              {/* 聚合搜索区 */}
              <div className="w-full max-w-xl mb-6 md:mb-8">
                <div className="group relative flex flex-col sm:flex-row items-stretch gap-2 p-2 rounded-xl bg-white/5 border border-white/10 transition-all hover:bg-white/10 hover:border-white/20 focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500/50">
                  
                  {/* 项目选择器集成 */}
                  <div className="flex-shrink-0 sm:border-r border-white/10 sm:pr-2">
                    <HomeProjectSelector 
                      value={selectedProject} 
                      onChange={setSelectedProject}
                      className="h-10 sm:h-12 w-full sm:w-auto bg-transparent border-0 hover:bg-white/5 text-white shadow-none focus-visible:ring-0 focus-visible:bg-white/10"
                    />
                  </div>

                  {/* 搜索框集成 */}
                  <div className="flex-1 min-w-0 relative">
                    <SearchBox 
                      project={selectedProject}
                      className="h-10 sm:h-12"
                      iconClassName="text-white/50"
                    />
                  </div>
                </div>
              </div>

              {/* 卡片式入口区 */}
              <div className="grid w-full grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 max-w-xl">
                
                {/* 资产入口卡片 */}
                <Link
                  href="/assets"
                  prefetch
                  className="group relative flex flex-col items-start overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-xl hover:shadow-blue-500/10"
                >
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 text-blue-300 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <Library className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1 group-hover:text-blue-200 transition-colors">资产库</h3>
                  <p className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">
                    浏览角色、场景、道具等 3D 资源模型
                  </p>
                  {/* 装饰性箭头 */}
                  <div className="absolute right-3 top-3 opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/50"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  </div>
                </Link>

                {/* 素材入口卡片 */}
                <Link
                  href="/materials"
                  prefetch
                  className="group relative flex flex-col items-start overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-xl hover:shadow-purple-500/10"
                >
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                    <Box className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1 group-hover:text-purple-200 transition-colors">素材库</h3>
                  <p className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">
                    探索纹理、材质球、特效与环境资产
                  </p>
                  {/* 装饰性箭头 */}
                  <div className="absolute right-3 top-3 opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/50"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  </div>
                </Link>

              </div>

              {/* 底部链接 */}
              <div className="mt-6 md:mt-8">
                <Link
                  href="/docs"
                  target="_blank"
                  className="inline-flex items-center gap-2 text-xs sm:text-sm text-zinc-500 transition-colors hover:text-zinc-300"
                >
                  <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>查看使用手册</span>
                </Link>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 展开按钮 - 卡片收缩后显示在底部，与卡片互斥 */}
      <AnimatePresence>
        {showExpandButton && !isVisible && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={handleExpand}
            style={{ 
              pointerEvents: 'auto',
              position: 'fixed',
              bottom: '2rem',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 30
            }}
            className={clsx(
              "flex items-center justify-center",
              "w-10 h-10 rounded-full",
              "bg-black/40 backdrop-blur-md border border-white/20",
              "text-white/80 hover:text-white",
              "hover:bg-black/60 hover:border-white/30",
              "shadow-lg shadow-black/50",
              "transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            )}
            aria-label="展开卡片"
          >
            <ChevronUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </section>
  );
}
