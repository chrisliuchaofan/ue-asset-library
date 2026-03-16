'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Library } from 'lucide-react';
import clsx from 'clsx';
import { motion, useScroll, useTransform } from 'framer-motion';
import { getClientAssetUrl, getOptimizedImageUrl } from '@/lib/utils';
import type { Asset } from '@/data/manifest.schema';

/**
 * AnimatedHero - 首页 Hero 组件
 * - 清晰品牌标题 + 副标题
 * - 响应式胶囊按钮
 * - 滚动视差效果
 * - Bento Grid 布局
 * - 全面移动端适配
 */
export function AnimatedHero({ onCardVisible }: { onCardVisible?: (visible: boolean) => void }) {

  const [latestAssets, setLatestAssets] = useState<Asset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);


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
      <div className="flex flex-col items-center justify-center min-h-[100svh] px-4 py-8 sm:py-12 md:py-16">
        {/* 标题区 - 清晰渐变文字 */}
        <motion.div
          style={{
            y: titleY,
            opacity: titleOpacity,
            pointerEvents: 'auto'
          }}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-10 sm:mb-14 md:mb-16 lg:mb-20"
        >
          {/* 主标题 - 清晰可读 */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl xl:text-8xl font-bold tracking-tight">
            <span
              className="bg-gradient-to-b from-white via-white/90 to-white/50 bg-clip-text text-transparent"
              style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              爆款工坊
            </span>
          </h1>
          {/* 副标题 */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="mt-3 sm:mt-4 md:mt-5 text-sm sm:text-base md:text-lg lg:text-xl text-white/40 font-light tracking-widest"
          >
            游戏广告素材 AI 工作台
          </motion.p>
        </motion.div>

        {/* 胶囊按钮区 - 移动端水平滚动，桌面端居中 */}
        <div className="flex flex-row flex-wrap justify-center gap-3 sm:gap-4 md:gap-5">
          {/* 素材库入口 */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
            style={{ pointerEvents: 'auto' }}
          >
            <Link
              href="/materials"
              prefetch
              className="inline-flex items-center justify-center rounded-xl text-white/70 hover:text-white/90 text-xs sm:text-sm md:text-base font-light tracking-wider whitespace-nowrap min-h-[44px] px-4 sm:px-5 md:px-6 py-2.5 transition-all duration-300"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              素材库
            </Link>
          </motion.div>

          {/* 爆款分析入口 */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
            style={{ pointerEvents: 'auto' }}
          >
            <Link
              href="/analysis"
              prefetch
              className="inline-flex items-center justify-center rounded-xl text-white/70 hover:text-white/90 text-xs sm:text-sm md:text-base font-light tracking-wider whitespace-nowrap min-h-[44px] px-4 sm:px-5 md:px-6 py-2.5 transition-all duration-300"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              爆款分析
            </Link>
          </motion.div>

          {/* AI 创作入口 */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
            style={{ pointerEvents: 'auto' }}
          >
            <Link
              href="/studio"
              className="inline-flex items-center justify-center rounded-xl text-white/70 hover:text-white/90 text-xs sm:text-sm md:text-base font-light tracking-wider whitespace-nowrap min-h-[44px] px-4 sm:px-5 md:px-6 py-2.5 transition-all duration-300"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              AI 创作
            </Link>
          </motion.div>

          {/* 灵感收集入口 */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7, ease: "easeOut" }}
            style={{ pointerEvents: 'auto' }}
          >
            <Link
              href="/inspirations"
              prefetch
              className="inline-flex items-center justify-center rounded-xl text-white/70 hover:text-white/90 text-xs sm:text-sm md:text-base font-light tracking-wider whitespace-nowrap min-h-[44px] px-4 sm:px-5 md:px-6 py-2.5 transition-all duration-300"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              灵感收集
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Content Section - 最新探索区域（在100svh之后） */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
        className="w-full max-w-7xl mx-auto px-4 pb-32"
        style={{ pointerEvents: 'auto', minHeight: '100svh', paddingTop: '100svh' }}
      >
        <div className="mb-6 sm:mb-8 md:mb-12 lg:mb-16">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-light tracking-[0.1em] sm:tracking-[0.15em] text-white/70 text-center">
            最新探索
          </h2>
        </div>

        {/* Bento Grid 布局 - 响应式断点 */}
        {isLoadingAssets ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6 auto-rows-[160px] sm:auto-rows-[180px] md:auto-rows-[200px]">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/10 animate-pulse"
              />
            ))}
          </div>
        ) : latestAssets.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6 auto-rows-[160px] sm:auto-rows-[180px] md:auto-rows-[200px]">
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
                            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                          />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-black/0 pointer-events-none" />
                      </>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-transparent">
                        <Library className="h-10 w-10 sm:h-12 sm:w-12 text-white/10" />
                      </div>
                    )}
                    {/* 左下角极简文字标签 */}
                    <div className="absolute bottom-0 left-0 p-2.5 sm:p-3 z-20 pointer-events-none">
                      <h3 className="text-white/90 font-light text-xs sm:text-sm truncate drop-shadow-md">
                        {asset.name}
                      </h3>
                      {asset.type && (
                        <p className="text-white/50 text-[10px] sm:text-xs mt-0.5 sm:mt-1 truncate font-light">
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
          <div className="text-center py-8 sm:py-12 text-white/50 font-light text-sm sm:text-base">
            暂无资产
          </div>
        )}
      </motion.div>

    </section>
  );
}
