'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Library, Box, Sparkles, Palette, Wand2, Crown } from 'lucide-react';
import clsx from 'clsx';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/toast-provider';
import { getClientAssetUrl, getOptimizedImageUrl } from '@/lib/utils';
import type { Asset } from '@/data/manifest.schema';

/**
 * AnimatedHero - 首页 Hero 组件 (hen-ry.com 风格)
 * - 极简去容器化设计
 * - 极细体标题，增加呼吸感
 * - 胶囊按钮设计
 * - 滚动视差效果
 * - Bento Grid 布局
 */
export function AnimatedHero({ onCardVisible }: { onCardVisible?: (visible: boolean) => void }) {
  const [showDreamFactoryDialog, setShowDreamFactoryDialog] = useState(false);
  const [latestAssets, setLatestAssets] = useState<Asset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const { info } = useToast();
  
  // 滚动视差
  const { scrollY } = useScroll();
  const titleY = useTransform(scrollY, [0, 300], [0, -20]);
  const titleOpacity = useTransform(scrollY, [0, 300], [1, 0]);

  // 获取最新资产用于"最新探索"区域
  useEffect(() => {
    const fetchLatestAssets = async () => {
      try {
        setIsLoadingAssets(true);
        const response = await fetch('/api/assets/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            limit: 5,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          setLatestAssets(data.assets || []);
        }
      } catch (error) {
        console.error('Failed to fetch latest assets:', error);
      } finally {
        setIsLoadingAssets(false);
      }
    };
    
    fetchLatestAssets();
  }, []);

  // 通知父组件可见性变化（用于控制背景帧率）
  useEffect(() => {
    onCardVisible?.(true);
  }, [onCardVisible]);

  // 获取资产预览图URL
  const getAssetPreviewUrl = (asset: Asset): string => {
    const thumbnailUrl = asset.thumbnail ? getClientAssetUrl(asset.thumbnail) : '';
    if (thumbnailUrl) {
      return getOptimizedImageUrl(thumbnailUrl, 800);
    }
    return '';
  };

  // Bento Grid布局配置（3-5个不同尺寸的卡片）
  const getBentoGridClasses = (index: number, total: number): string => {
    // 移动端：单列布局，所有卡片相同尺寸
    // 桌面端：不同尺寸的卡片
    const mobileLayout = 'col-span-1 row-span-1';
    const desktopLayouts = [
      'md:col-span-2 md:row-span-2', // 大卡片
      'md:col-span-1 md:row-span-1', // 小卡片
      'md:col-span-1 md:row-span-2', // 高卡片
      'md:col-span-2 md:row-span-1', // 宽卡片
      'md:col-span-1 md:row-span-1', // 小卡片
    ];
    return `${mobileLayout} ${desktopLayouts[index % desktopLayouts.length] || 'md:col-span-1 md:row-span-1'}`;
  };

  return (
    <section 
      className="relative z-10 flex min-h-[100svh] w-full flex-col"
      style={{ 
        pointerEvents: 'none'
      }}
    >
      {/* Hero Section - 首屏内容 */}
      <div className="flex flex-col items-center justify-center min-h-[100vh] px-4 py-12 sm:py-16 md:py-20">
        {/* 标题区 - 双层玻璃材质效果 */}
        <motion.div
          style={{ 
            y: titleY,
            opacity: titleOpacity,
            pointerEvents: 'auto'
          }}
          initial={{ filter: 'blur(15px)', y: 20, opacity: 0 }}
          animate={{ filter: 'blur(0px)', y: 0, opacity: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="text-center mb-16 md:mb-20 lg:mb-24"
        >
          <h1 className="hero-title-glass text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl relative inline-block">
            {/* 底层：模糊白雾 */}
            <span className="hero-title-glass-blur absolute inset-0">
              <span className="block md:inline">恒星</span>
              <span className="block md:inline md:ml-3 lg:ml-4">资产库</span>
            </span>
            {/* 顶层：半透明文字 */}
            <span className="hero-title-glass-sharp relative">
              <span className="block md:inline">恒星</span>
              <span className="block md:inline md:ml-3 lg:ml-4">资产库</span>
            </span>
          </h1>
        </motion.div>

        {/* 胶囊按钮区 */}
        <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4 sm:gap-5 md:gap-6">
          {/* 资产库入口 */}
          <motion.div
            initial={{ filter: 'blur(10px)', y: 20, opacity: 0 }}
            animate={{ filter: 'blur(0px)', y: 0, opacity: 1 }}
            transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
            style={{ pointerEvents: 'auto' }}
          >
            <Link
              href="/assets"
              prefetch
              className="inline-flex items-center rounded-xl border transition-all duration-500 ease-out text-white/70 hover:text-white/85 text-sm sm:text-base md:text-lg font-light tracking-wider"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                paddingTop: '0.5rem',
                paddingBottom: '0.5rem',
                paddingLeft: '1.25rem', // 0.5rem * 2.5 = 1.25rem
                paddingRight: '1.25rem', // 0.5rem * 2.5 = 1.25rem
              }}
            >
              资产库
            </Link>
          </motion.div>

          {/* 素材库入口 */}
          <motion.div
            initial={{ filter: 'blur(10px)', y: 20, opacity: 0 }}
            animate={{ filter: 'blur(0px)', y: 0, opacity: 1 }}
            transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
            style={{ pointerEvents: 'auto' }}
          >
            <Link
              href="/materials"
              prefetch
              className="inline-flex items-center rounded-xl border transition-all duration-500 ease-out text-white/70 hover:text-white/85 text-sm sm:text-base md:text-lg font-light tracking-wider"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                paddingTop: '0.5rem',
                paddingBottom: '0.5rem',
                paddingLeft: '1.25rem', // 0.5rem * 2.5 = 1.25rem
                paddingRight: '1.25rem', // 0.5rem * 2.5 = 1.25rem
              }}
            >
              素材库
            </Link>
          </motion.div>

          {/* 梦工厂入口 */}
          <motion.div
            initial={{ filter: 'blur(10px)', y: 20, opacity: 0 }}
            animate={{ filter: 'blur(0px)', y: 0, opacity: 1 }}
            transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
            style={{ pointerEvents: 'auto' }}
          >
            <button
              onClick={() => setShowDreamFactoryDialog(true)}
              className="inline-flex items-center rounded-xl border transition-all duration-500 ease-out text-white/70 hover:text-white/85 text-sm sm:text-base md:text-lg font-light tracking-wider relative"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                paddingTop: '0.5rem',
                paddingBottom: '0.5rem',
                paddingLeft: '1.25rem', // 0.5rem * 2.5 = 1.25rem
                paddingRight: '1.25rem', // 0.5rem * 2.5 = 1.25rem
              }}
            >
              梦工厂
              <span className="absolute -top-1 -right-1 text-[9px] sm:text-[10px] text-amber-400/70">开发中</span>
            </button>
          </motion.div>
        </div>
      </div>

      {/* Content Section - 最新探索区域（在100vh之后） */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
        className="w-full max-w-7xl mx-auto px-4 pb-32"
        style={{ pointerEvents: 'auto', minHeight: '100vh', paddingTop: '100vh' }}
      >
        <div className="mb-8 md:mb-12 lg:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light tracking-[0.15em] text-white/70 text-center">
            最新探索
          </h2>
        </div>

        {/* Bento Grid 布局 - 极简风格 */}
        {isLoadingAssets ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 auto-rows-[200px] md:auto-rows-[200px]">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/10 animate-pulse"
              />
            ))}
          </div>
        ) : latestAssets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 auto-rows-[200px] md:auto-rows-[200px]">
            {latestAssets.slice(0, 5).map((asset, index) => {
              const previewUrl = getAssetPreviewUrl(asset);
              const gridClasses = getBentoGridClasses(index, latestAssets.length);
              
              return (
                <motion.div
                  key={asset.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={clsx(
                    "group relative overflow-hidden rounded-2xl",
                    "border border-white/10",
                    "hover:border-white/20 transition-all duration-300",
                    "cursor-pointer",
                    gridClasses
                  )}
                >
                  <Link
                    href={`/assets/${asset.id}`}
                    prefetch
                    className="absolute inset-0 z-10"
                  >
                    {previewUrl ? (
                      <>
                        <div className="absolute inset-0">
                          <Image
                            src={previewUrl}
                            alt={asset.name}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
                          />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-black/0 pointer-events-none" />
                      </>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-transparent">
                        <Library className="h-12 w-12 text-white/10" />
                      </div>
                    )}
                    {/* 左下角极简文字标签 */}
                    <div className="absolute bottom-0 left-0 p-3 z-20 pointer-events-none">
                      <h3 className="text-white/90 font-light text-xs md:text-sm truncate drop-shadow-md">
                        {asset.name}
                      </h3>
                      {asset.type && (
                        <p className="text-white/50 text-[10px] md:text-xs mt-1 truncate font-light">
                          {asset.type}
                        </p>
                      )}
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-white/50 font-light">
            暂无资产
          </div>
        )}
      </motion.div>


      {/* 梦工厂选项对话框 */}
      <Dialog open={showDreamFactoryDialog} onOpenChange={setShowDreamFactoryDialog}>
        <DialogContent className="sm:max-w-md bg-black/90 backdrop-blur-md border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">选择梦工厂入口</DialogTitle>
            <DialogDescription className="text-zinc-400">
              请选择您要进入的功能模块
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            {/* 创意入口 - 开发中 */}
            <button
              onClick={() => {
                setShowDreamFactoryDialog(false);
                info('创意功能开发中', '敬请期待！');
              }}
              className="group relative flex items-center gap-4 rounded-lg border border-white/10 bg-white/5 p-4 transition-all hover:bg-white/10 hover:border-white/20 cursor-pointer"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300 group-hover:bg-purple-500/30 transition-colors">
                <Wand2 className="h-6 w-6" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-base font-semibold text-white">创意</h3>
                <p className="text-sm text-zinc-400">AI 创意生成工具</p>
              </div>
              <span className="text-xs text-amber-400 font-medium">开发中</span>
            </button>

            {/* 设计入口 - 开发中 */}
            <button
              onClick={() => {
                setShowDreamFactoryDialog(false);
                info('设计功能开发中', '敬请期待！');
              }}
              className="group relative flex items-center gap-4 rounded-lg border border-white/10 bg-white/5 p-4 transition-all hover:bg-white/10 hover:border-white/20 cursor-pointer"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/20 text-blue-300 group-hover:bg-blue-500/30 transition-colors">
                <Palette className="h-6 w-6" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-base font-semibold text-white">设计</h3>
                <p className="text-sm text-zinc-400">AI 驱动的视频设计工具</p>
              </div>
              <span className="text-xs text-amber-400 font-medium">开发中</span>
            </button>

            {/* 大师入口 - 开发中 */}
            <button
              onClick={() => {
                setShowDreamFactoryDialog(false);
                info('大师功能开发中', '敬请期待！');
              }}
              className="group relative flex items-center gap-4 rounded-lg border border-white/10 bg-white/5 p-4 transition-all hover:bg-white/10 hover:border-white/20 cursor-pointer"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300 group-hover:bg-amber-500/30 transition-colors">
                <Crown className="h-6 w-6" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-base font-semibold text-white">大师</h3>
                <p className="text-sm text-zinc-400">高级 AI 创作工具</p>
              </div>
              <span className="text-xs text-amber-400 font-medium">开发中</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
