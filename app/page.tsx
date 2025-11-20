'use client';

import dynamic from 'next/dynamic';
import { Suspense, useState } from 'react';
import { AnimatedHero } from '@/components/AnimatedHero';

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
  
  // 性能优化：卡片显示时降低背景帧率至30fps，否则保持60fps
  const backgroundFPS = cardVisible ? 30 : 60;

  return (
    <div className="flex min-h-screen flex-col relative overflow-hidden">
      {/* 星系背景 - 确保在底层，z-index 为 0 */}
      <div className="absolute inset-0 z-0">
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
    </div>
  );
}


