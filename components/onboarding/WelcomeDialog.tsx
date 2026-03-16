'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClapperboardIcon,
  FolderIcon,
  SearchIcon,
  VideoIcon,
  CheckCircle2Icon,
  Sparkles,
  Upload,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface WelcomeDialogProps {
  onComplete: () => void;
}

const steps = [
  {
    id: 'welcome',
    title: '欢迎来到爆款工坊',
    subtitle: '游戏广告素材 AI 工作台',
    description: '从创意灵感到数据洞察，AI 驱动你的广告素材全生命周期',
  },
  {
    id: 'features',
    title: '核心能力一览',
    subtitle: '四大核心工作流',
    description: '了解你的创意工具箱',
  },
  {
    id: 'start',
    title: '开始创作',
    subtitle: '选择你的第一步',
    description: '从以下任一入口开始你的创作之旅',
  },
];

export function WelcomeDialog({ onComplete }: WelcomeDialogProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={handleSkip}
      />

      {/* 对话框 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', duration: 0.5, bounce: 0.3 }}
        className="relative w-full max-w-lg mx-4 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* 进度条 */}
        <div className="flex gap-1.5 px-6 pt-5">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                index <= currentStep ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* 内容区域 */}
        <div className="px-6 pt-6 pb-4" style={{ minHeight: 320 }}>
          <AnimatePresence mode="wait">
            {currentStep === 0 && (
              <StepWelcome key="welcome" />
            )}
            {currentStep === 1 && (
              <StepFeatures key="features" />
            )}
            {currentStep === 2 && (
              <StepStart key="start" onComplete={onComplete} />
            )}
          </AnimatePresence>
        </div>

        {/* 底部操作栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
          <button
            onClick={handleSkip}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            跳过引导
          </button>

          {currentStep < steps.length - 1 ? (
            <Button onClick={handleNext} size="sm" className="gap-1.5">
              下一步
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={onComplete} size="sm" variant="outline" className="gap-1.5">
              进入工作台
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ---- Step 1: 欢迎 ----
function StepWelcome() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
        <ClapperboardIcon className="w-8 h-8 text-primary" />
      </div>

      <h2 className="text-2xl font-bold text-foreground mb-2">
        欢迎来到爆款工坊
      </h2>
      <p className="text-base text-primary/80 font-medium mb-4">
        游戏广告素材 AI 工作台
      </p>
      <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
        从创意灵感到数据洞察，AI 驱动你的广告素材全生命周期管理。
        无论是脚本生成、素材审核还是爆款分析，我们都能帮你搞定。
      </p>

      <div className="flex items-center gap-2 mt-6 text-xs text-muted-foreground">
        <Sparkles className="w-3.5 h-3.5 text-primary/60" />
        <span>首帧定生死，爆款有工坊</span>
      </div>
    </motion.div>
  );
}

// ---- Step 2: 功能介绍 ----
const features = [
  {
    icon: FolderIcon,
    label: '素材库',
    desc: '集中管理广告素材',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: SearchIcon,
    label: '爆款分析',
    desc: 'AI 拆解竞品结构',
    color: 'text-success',
    bg: 'bg-success/10',
  },
  {
    icon: VideoIcon,
    label: 'AI 创作',
    desc: '一键生成脚本文案',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
  {
    icon: CheckCircle2Icon,
    label: '智能审核',
    desc: '质量把关与优化建议',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
  },
];

function StepFeatures() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-xl font-bold text-foreground mb-1">
        核心能力一览
      </h2>
      <p className="text-sm text-muted-foreground mb-5">
        四大核心工作流，覆盖素材全生命周期
      </p>

      <div className="grid grid-cols-2 gap-3">
        {features.map((feature, index) => (
          <motion.div
            key={feature.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start gap-3 p-3 rounded-xl border border-border bg-background/50 hover:bg-accent/30 transition-colors"
          >
            <div className={`w-9 h-9 rounded-lg ${feature.bg} flex items-center justify-center flex-shrink-0`}>
              <feature.icon className={`w-4.5 h-4.5 ${feature.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{feature.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{feature.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center mt-4">
        还有资产库、数据洞察等更多功能等你探索
      </p>
    </motion.div>
  );
}

// ---- Step 3: 快速开始 ----
const quickStartOptions = [
  {
    icon: Upload,
    label: '上传素材',
    desc: '上传你的第一个广告素材',
    href: '/materials',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: VideoIcon,
    label: '体验 AI 创作',
    desc: '让 AI 帮你生成脚本',
    href: '/studio',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
  {
    icon: SearchIcon,
    label: '浏览爆款分析',
    desc: '看看别人的爆款素材',
    href: '/analysis',
    color: 'text-success',
    bg: 'bg-success/10',
  },
];

function StepStart({ onComplete }: { onComplete: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-xl font-bold text-foreground mb-1">
        开始创作
      </h2>
      <p className="text-sm text-muted-foreground mb-5">
        选择你的第一步，随时可以在侧边栏切换模块
      </p>

      <div className="space-y-2.5">
        {quickStartOptions.map((option, index) => (
          <motion.div
            key={option.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link
              href={option.href}
              onClick={onComplete}
              className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-background/50 hover:bg-accent/50 hover:bg-white/[0.03] transition-all group"
            >
              <div className={`w-10 h-10 rounded-lg ${option.bg} flex items-center justify-center flex-shrink-0`}>
                <option.icon className={`w-5 h-5 ${option.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{option.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{option.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
