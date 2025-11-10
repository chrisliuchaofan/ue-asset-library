"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Library, Box, BookOpen } from "lucide-react";
import clsx from "clsx";
import Link from "next/link";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { 
      duration: 0.36, 
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number], 
      delay: 0.06 * i 
    }
  })
};

export function HeroSection() {
  const reduce = useReducedMotion();

  return (
    <section className="relative z-10 mx-auto flex h-[100svh] max-w-[960px] flex-col items-center justify-center px-6 text-center -translate-y-6">
      <motion.h1
        initial={reduce ? undefined : "hidden"}
        animate={reduce ? undefined : "show"}
        custom={0}
        variants={fadeUp}
        className={clsx(
          "text-5xl md:text-7xl font-extrabold tracking-[-0.02em] leading-[1.08]",
          "bg-gradient-to-r from-zinc-100 via-zinc-200 to-slate-200 bg-clip-text text-transparent",
          "drop-shadow-[0_0_6px_rgba(180,200,255,0.05)]"
        )}
      >
        恒星资产库
      </motion.h1>

      {/* 去掉副标题 */}

      <motion.div
        initial={reduce ? undefined : "hidden"}
        animate={reduce ? undefined : "show"}
        custom={1}
        variants={fadeUp}
        className="mt-8 flex items-center gap-4"
      >
        <Link
          href="/assets"
          prefetch
          aria-label="进入资产"
          className="inline-flex"
        >
          <motion.span
            whileHover={reduce ? undefined : { y: -2, boxShadow: "0 8px 20px rgba(140,170,255,0.10)" }}
            whileTap={{ y: 0 }}
            className={clsx(
              "inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm md:text-base font-semibold",
              "text-zinc-100 ring-1 ring-[#CFE0FF]/60 hover:ring-[#CFE0FF]/80 hover:bg-white/5",
              "transition-all duration-200"
            )}
          >
            <Library className="h-5 w-5 text-zinc-100" />
            资产
          </motion.span>
        </Link>

        <Link
          href="/materials"
          prefetch
          aria-label="进入素材"
          className="inline-flex"
        >
          <motion.span
            whileHover={reduce ? undefined : { y: -2, boxShadow: "0 8px 20px rgba(140,170,255,0.10)" }}
            whileTap={{ y: 0 }}
            className={clsx(
              "inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm md:text-base font-semibold",
              "text-zinc-100 ring-1 ring-[#CFE0FF]/60 hover:ring-[#CFE0FF]/80 hover:bg-white/5",
              "transition-all duration-200"
            )}
          >
            <Box className="h-5 w-5 text-zinc-100" />
            素材
          </motion.span>
        </Link>
      </motion.div>

      {/* 可选：下方一个文档按钮，小而不抢戏 */}
      <motion.a
        href="/docs"
        target="_blank"
        rel="noopener noreferrer"
        initial={reduce ? undefined : "hidden"}
        animate={reduce ? undefined : "show"}
        custom={2}
        variants={fadeUp}
        className="mt-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200/90"
      >
        <BookOpen className="h-4 w-4" />
        使用手册
      </motion.a>
    </section>
  );
}

