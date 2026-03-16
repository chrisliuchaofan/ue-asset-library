'use client';

import React from 'react';
import { LandingNav } from './LandingNav';
import { HeroShowcase } from './HeroShowcase';
import { CTASection } from './CTASection';
import { LandingFooter } from './LandingFooter';

/**
 * Landing Page V4 — Runway 风格改造
 * 纯黑背景，全屏沉浸式 hero，极简导航
 */
export function LandingPageContent() {
  return (
    <div className="flex min-h-screen flex-col relative" style={{ background: '#000' }}>
      {/* 导航栏 */}
      <LandingNav />

      {/* Hero 全屏视频 */}
      <HeroShowcase />

      {/* CTA 区域 */}
      <CTASection />

      {/* 页脚 */}
      <LandingFooter />
    </div>
  );
}
