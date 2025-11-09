'use client';

import dynamic from 'next/dynamic';
import { HeroSection } from '@/components/hero-section';

// 动态导入星系组件，禁用 SSR
const GalaxyBackground = dynamic(
  () => import('@/components/galaxy-background').then((mod) => ({ default: mod.GalaxyBackground })),
  { ssr: false }
);

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col relative overflow-hidden">
      {/* 星系背景 */}
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
      />
      
      {/* 内容层 */}
      <HeroSection />
    </div>
  );
}


