'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import dynamic from 'next/dynamic';
import { BlurText } from '@/components/blur-text';
import { motion } from 'framer-motion';

// 动态导入星系组件，禁用 SSR
const GalaxyBackground = dynamic(
  () => import('@/components/galaxy-background').then((mod) => ({ default: mod.GalaxyBackground })),
  { ssr: false }
);

export default function HomePage() {
  const [showButtons, setShowButtons] = useState(false);

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
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="mb-8 text-4xl font-bold tracking-tight sm:text-6xl">
            <BlurText
              text="恒星资产库"
              className="text-white"
              animateBy="letters"
              direction="top"
              delay={50}
              stepDuration={0.4}
              initialDelay={500}
              loop={2}
              onAnimationComplete={() => setShowButtons(true)}
            />
          </h1>
          {showButtons && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="flex gap-4 justify-center items-center"
            >
              <Link href="/assets">
                <Button size="lg" className="gap-2 bg-white text-black hover:bg-white/90">
                  浏览资产
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/materials">
                <Button size="lg" variant="outline" className="gap-2 bg-white/10 text-white border-white/20 hover:bg-white/20">
                  浏览素材
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}


