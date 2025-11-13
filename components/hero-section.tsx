"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Library, Box, BookOpen } from "lucide-react";
import clsx from "clsx";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";

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

// 标题淡入缩放动画（只在首次加载执行一次）
const titleFadeIn = {
  hidden: { 
    opacity: 0, 
    scale: 0.96 
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    }
  }
};

// 字符逐个出现的动画
const letterAnimation = {
  hidden: { 
    opacity: 0, 
    y: 20,
    scale: 0.8,
    filter: 'blur(10px)'
  },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.5,
      delay: i * 0.1,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    }
  })
};

export function HeroSection() {
  const reduce = useReducedMotion();
  const [gradientPosition, setGradientPosition] = useState(0);
  const [mounted, setMounted] = useState(false);
  const hasAnimatedRef = useRef(false);
  const title = "恒星资产库";
  const letters = title.split("");

  // 确保客户端挂载后才显示动画，避免 hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // 渐变动画循环
  useEffect(() => {
    if (reduce || !mounted) return;
    const interval = setInterval(() => {
      setGradientPosition((prev) => (prev + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, [reduce, mounted]);

  return (
    <section className="relative z-10 mx-auto flex h-[100svh] max-w-[960px] flex-col items-center justify-center px-6 text-center -translate-y-6">
      <motion.h1
        initial={reduce || !mounted ? undefined : "hidden"}
        animate={
          reduce || !mounted
            ? undefined
            : mounted
            ? "visible"
            : "hidden"
        }
        onAnimationComplete={() => {
          if (mounted && !reduce) {
            hasAnimatedRef.current = true;
          }
        }}
        custom={0}
        variants={reduce || !mounted ? fadeUp : titleFadeIn}
        className={clsx(
          "text-5xl md:text-7xl font-extrabold tracking-[-0.02em] leading-[1.08]",
          "relative inline-block"
        )}
      >
        {/* 背景光晕效果 - 只在客户端挂载后显示（淡蓝色） */}
        {mounted && !reduce && (
          <motion.span
            className="absolute inset-0 blur-2xl opacity-30"
            animate={{
              background: [
                "radial-gradient(circle at 0% 50%, rgba(135, 206, 250, 0.4), transparent 70%)",
                "radial-gradient(circle at 100% 50%, rgba(173, 216, 230, 0.4), transparent 70%)",
                "radial-gradient(circle at 0% 50%, rgba(135, 206, 250, 0.4), transparent 70%)",
              ],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}
        
        {/* 文字内容 */}
        <span className="relative flex items-center justify-center">
          {reduce || !mounted ? (
            // 简化模式：直接显示文字（服务器端和减少动画模式）
            <span
              className={clsx(
                "bg-gradient-to-r from-sky-100 via-blue-100 to-cyan-100 bg-clip-text text-transparent",
                "drop-shadow-[0_0_6px_rgba(135,206,250,0.3)]"
              )}
            >
              {title}
            </span>
          ) : (
            // 动画模式：带缓慢星光渐变效果
            <span className="relative inline-block">
              {/* 基础文字（淡蓝色） */}
              <span className="bg-gradient-to-r from-sky-100 via-blue-100 to-cyan-100 bg-clip-text text-transparent drop-shadow-[0_0_6px_rgba(135,206,250,0.3)]">
                {title}
              </span>
              
              {/* 星光渐变遮罩层（非常缓慢移动，淡蓝色） */}
              <motion.span
                className="absolute inset-0 bg-clip-text text-transparent pointer-events-none"
                style={{
                  backgroundImage: `linear-gradient(90deg, 
                    transparent 0%,
                    rgba(135, 206, 250, 0.15) 25%,
                    rgba(173, 216, 230, 0.25) 50%,
                    rgba(135, 206, 250, 0.15) 75%,
                    transparent 100%)`,
                  backgroundSize: '200% 100%',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
                animate={{
                  backgroundPosition: ['0% 0%', '100% 0%'],
                }}
                transition={{
                  duration: 30,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              >
                {title}
              </motion.span>
            </span>
          )}
          {/* 移除原来的字符逐个出现动画，改用整体淡入 + 星光渐变 */}
          {false && (
            // 动画模式：字符逐个出现，带流动渐变
            letters.map((letter, index) => {
              const gradientOffset = (gradientPosition + index * 15) % 100;
              const hue = 220 + Math.sin(gradientOffset * 0.1) * 10;
              const lightness = 80 + Math.sin(gradientOffset * 0.15) * 15;
              
              return (
                <motion.span
                  key={index}
                  custom={index}
                  initial="hidden"
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    filter: 'blur(0px)',
                    backgroundImage: `linear-gradient(135deg, 
                      hsl(${hue}, 40%, ${lightness}%), 
                      hsl(${hue + 20}, 30%, ${lightness - 10}%),
                      hsl(${hue}, 40%, ${lightness}%))`,
                    backgroundPosition: [
                      `${gradientOffset}% ${gradientOffset}%`,
                      `${(gradientOffset + 50) % 100}% ${(gradientOffset + 50) % 100}%`,
                      `${gradientOffset}% ${gradientOffset}%`,
                    ],
                  }}
                  variants={letterAnimation}
                  className="inline-block relative"
                  style={{
                    backgroundSize: '200% 200%',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    filter: `drop-shadow(0 0 ${4 + Math.sin(gradientOffset * 0.1) * 2}px rgba(180, 200, 255, 0.4))`,
                  }}
                  transition={{
                    opacity: {
                      duration: 0.5,
                      delay: index * 0.1,
                      ease: [0.22, 1, 0.36, 1],
                    },
                    y: {
                      duration: 0.5,
                      delay: index * 0.1,
                      ease: [0.22, 1, 0.36, 1],
                    },
                    scale: {
                      duration: 0.5,
                      delay: index * 0.1,
                      ease: [0.22, 1, 0.36, 1],
                    },
                    filter: {
                      duration: 0.5,
                      delay: index * 0.1,
                      ease: [0.22, 1, 0.36, 1],
                    },
                    backgroundImage: {
                      duration: 0.1,
                      ease: "linear",
                    },
                    backgroundPosition: {
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear",
                    },
                  }}
                >
                  {letter === " " ? "\u00A0" : letter}
                </motion.span>
              );
            })
          )}
        </span>
        
        {/* 顶部高光效果 - 只在客户端挂载后显示（淡蓝色高光） */}
        {mounted && !reduce && (
          <motion.span
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(to bottom, 
                rgba(173, 216, 230, ${0.2 + Math.sin(gradientPosition * 0.1) * 0.1}), 
                transparent 30%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
            animate={{
              opacity: [0.4, 0.7, 0.4],
              backgroundImage: [
                `linear-gradient(to bottom, rgba(173, 216, 230, 0.2), transparent 30%)`,
                `linear-gradient(to bottom, rgba(135, 206, 250, 0.3), transparent 30%)`,
                `linear-gradient(to bottom, rgba(173, 216, 230, 0.2), transparent 30%)`,
              ],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}
      </motion.h1>

      {/* 去掉副标题 */}

      <motion.div
        initial={reduce ? undefined : "hidden"}
        animate={reduce ? undefined : "show"}
        custom={1}
        variants={fadeUp}
        className="mt-8 flex items-center gap-4"
      >
        <motion.div
          whileHover={reduce ? undefined : { y: -2 }}
          whileTap={reduce ? undefined : { scale: 0.96 }}
          transition={{
            y: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
            scale: { duration: 0.12, ease: [0.22, 1, 0.36, 1] },
          }}
          className="group relative"
        >
          <Link
            href="/assets"
            prefetch
            aria-label="进入资产"
            className={clsx(
              "inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm md:text-base font-semibold",
              "text-zinc-100 cursor-pointer relative",
              // 玻璃拟态基础样式
              "bg-black/20 backdrop-blur-md",
              "ring-1 ring-[#CFE0FF]/40",
              "shadow-[0_4px_12px_rgba(0,0,0,0.15),0_0_1px_rgba(207,224,255,0.2)]",
              // Hover状态
              "hover:bg-white/5 hover:ring-[#CFE0FF]/60",
              "hover:shadow-[0_6px_16px_rgba(0,0,0,0.2),0_0_2px_rgba(207,224,255,0.3)]",
              "transition-all duration-300 ease-out"
            )}
          >
            <motion.span
              className="inline-flex items-center gap-2"
              whileHover={reduce ? undefined : { scale: 1.03 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.span
                whileHover={reduce ? undefined : { rotate: 3 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <Library className="h-5 w-5 text-zinc-100" />
              </motion.span>
              资产
            </motion.span>
          </Link>
        </motion.div>

        <motion.div
          whileHover={reduce ? undefined : { y: -2 }}
          whileTap={reduce ? undefined : { scale: 0.96 }}
          transition={{
            y: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
            scale: { duration: 0.12, ease: [0.22, 1, 0.36, 1] },
          }}
          className="group relative"
        >
          <Link
            href="/materials"
            prefetch
            aria-label="进入素材"
            className={clsx(
              "inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm md:text-base font-semibold",
              "text-zinc-100 cursor-pointer relative",
              // 玻璃拟态基础样式
              "bg-black/20 backdrop-blur-md",
              "ring-1 ring-[#CFE0FF]/40",
              "shadow-[0_4px_12px_rgba(0,0,0,0.15),0_0_1px_rgba(207,224,255,0.2)]",
              // Hover状态
              "hover:bg-white/5 hover:ring-[#CFE0FF]/60",
              "hover:shadow-[0_6px_16px_rgba(0,0,0,0.2),0_0_2px_rgba(207,224,255,0.3)]",
              "transition-all duration-300 ease-out"
            )}
          >
            <motion.span
              className="inline-flex items-center gap-2"
              whileHover={reduce ? undefined : { scale: 1.03 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.span
                whileHover={reduce ? undefined : { rotate: 3 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <Box className="h-5 w-5 text-zinc-100" />
              </motion.span>
              素材
            </motion.span>
          </Link>
        </motion.div>
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
        className={clsx(
          "mt-6 inline-flex items-center gap-2 text-sm",
          "text-slate-400 hover:text-slate-200",
          "transition-colors duration-200 group"
        )}
      >
        <BookOpen className="h-4 w-4" />
        <span
          className={clsx(
            "relative inline-block",
            "after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0",
            "after:h-[1px] after:bg-slate-200 after:origin-center",
            "after:scale-x-0 after:transition-transform after:duration-200",
            "group-hover:after:scale-x-100"
          )}
        >
          使用手册
        </span>
      </motion.a>
    </section>
  );
}

