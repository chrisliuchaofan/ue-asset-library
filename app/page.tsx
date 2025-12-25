'use client';

import dynamic from 'next/dynamic';
import React, { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { Settings } from 'lucide-react';
import { AnimatedHero } from '@/components/AnimatedHero';
import { BottomNavigation } from '@/components/BottomNavigation';

// 动态导入星系组件，禁用 SSR
const GalaxyBackground = dynamic(
  () => import('@/components/galaxy-background').then((mod) => ({ default: mod.GalaxyBackground })),
  { 
    ssr: false,
    loading: () => <div className="absolute inset-0 bg-black" />
  }
) as React.ComponentType<{
  focal?: [number, number];
  rotation?: [number, number];
  starSpeed?: number;
  density?: number;
  hueShift?: number;
  disableAnimation?: boolean;
  speed?: number;
  mouseInteraction?: boolean;
  glowIntensity?: number;
  saturation?: number;
  mouseRepulsion?: boolean;
  twinkleIntensity?: number;
  rotationSpeed?: number;
  repulsionStrength?: number;
  autoCenterRepulsion?: number;
  transparent?: boolean;
  className?: string;
  targetFPS?: number;
}>;

export default function HomePage() {
  const [cardVisible, setCardVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // 性能优化：卡片显示时降低背景帧率至30fps，否则保持60fps
  const backgroundFPS = cardVisible ? 30 : 60;

  // 确保客户端挂载后才渲染管理按钮，避免 hydration 错误
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex min-h-screen flex-col relative">
      {/* 星系背景 - fixed定位，确保在底层，z-index 为 0 */}
      <div className="fixed inset-0 z-0">
        <GalaxyBackground
          focal={[0.5, 0.5]}
          rotation={[1.0, 0.0]}
          starSpeed={0.5}
          density={1}
          hueShift={140}
          disableAnimation={false}
          speed={1.0}
          mouseInteraction={true}
          glowIntensity={0.3}
          saturation={0.0}
          mouseRepulsion={true}
          twinkleIntensity={0.3}
          rotationSpeed={0.1}
          repulsionStrength={2}
          autoCenterRepulsion={0}
          transparent={true}
          targetFPS={backgroundFPS}
        />
      </div>
      
      {/* 内容层 - 使用新的 AnimatedHero 组件，包裹在 Suspense 中以满足 Next.js 15 的要求 */}
      <Suspense fallback={<div className="flex-1" />}>
        <AnimatedHero onCardVisible={setCardVisible} />
      </Suspense>

      {/* 底部导航 */}
      <BottomNavigation />

      {/* 右下角管理按钮 - 只在客户端挂载后渲染，避免 hydration 错误 */}
      {mounted && (
        <Link
          href="/admin"
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-black/20 backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:bg-white/5 hover:shadow-[0_6px_16px_rgba(0,0,0,0.2)] transition-all duration-300 group active:scale-95"
          aria-label="管理后台"
          title="管理后台"
        >
          <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-zinc-100 group-hover:text-white group-hover:rotate-90 transition-all duration-300" />
        </Link>
      )}
    </div>
  );
}


