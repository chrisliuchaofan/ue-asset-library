'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';

export function LandingHero() {
  return (
    <section className="relative z-10 flex min-h-[100svh] w-full flex-col items-center justify-center px-4 py-20">
      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="mb-6 sm:mb-8"
      >
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-xs sm:text-sm text-white/50 tracking-wider">
          <Sparkles className="h-3.5 w-3.5 text-purple-400" />
          AI 驱动的游戏广告素材工作台
        </span>
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
        className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight text-center"
      >
        <span className="bg-gradient-to-b from-white via-white/90 to-white/50 bg-clip-text text-transparent">
          首帧定生死
        </span>
        <br />
        <span className="bg-gradient-to-r from-purple-400 via-purple-300 to-orange-400 bg-clip-text text-transparent">
          爆款有工坊
        </span>
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
        className="mt-5 sm:mt-6 md:mt-8 text-sm sm:text-base md:text-lg lg:text-xl text-white/40 font-light tracking-wider text-center max-w-2xl leading-relaxed"
      >
        从灵感到数据的闭环，AI 帮你拆解爆款、生成脚本、智能审核，
        <br className="hidden sm:block" />
        让每一个素材都有成为爆款的可能
      </motion.p>

      {/* CTA Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5, ease: 'easeOut' }}
        className="mt-8 sm:mt-10 md:mt-12 flex flex-col sm:flex-row items-center gap-3 sm:gap-4"
      >
        <Link
          href="/auth/register"
          className="group inline-flex items-center justify-center gap-2 text-sm sm:text-base font-medium text-white px-7 sm:px-8 py-3 sm:py-3.5 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 min-w-[180px]"
        >
          免费开始
          <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
        <a
          href="#features"
          className="inline-flex items-center justify-center text-sm sm:text-base text-white/50 hover:text-white/80 px-7 sm:px-8 py-3 sm:py-3.5 rounded-full border border-white/10 hover:border-white/20 hover:bg-white/[0.04] transition-all min-w-[180px]"
        >
          了解更多
        </a>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-8 sm:bottom-12 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-5 h-8 rounded-full border border-white/20 flex items-start justify-center p-1.5"
        >
          <div className="w-1 h-1.5 rounded-full bg-white/40" />
        </motion.div>
      </motion.div>
    </section>
  );
}
