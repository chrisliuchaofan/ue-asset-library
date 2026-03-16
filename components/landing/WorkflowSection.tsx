'use client';

import { Search, FileText, Video, CheckCircle } from 'lucide-react';

const steps = [
  {
    icon: Search,
    label: '灵感收集',
    description: '发现竞品爆款',
  },
  {
    icon: FileText,
    label: '模版匹配',
    description: 'AI 结构化拆解',
  },
  {
    icon: Video,
    label: 'AI 创作',
    description: '脚本 + 分镜 + 视频',
  },
  {
    icon: CheckCircle,
    label: '审核发布',
    description: '质检通过即上线',
  },
];

const RESPONSIVE_CSS = `
.wf-grid{display:grid;grid-template-columns:1fr;gap:16px}
.wf-connector{display:none}
@media(min-width:640px){
  .wf-grid{grid-template-columns:repeat(4,1fr);gap:12px}
  .wf-connector{display:block}
}`;

export function WorkflowSection() {
  return (
    <section
      id="workflow"
      className="relative z-10 py-24 sm:py-32"
      style={{ background: '#0b0b12' }}
    >
      <style>{RESPONSIVE_CSS}</style>
      <div className="max-w-5xl mx-auto px-6 sm:px-8">
        {/* Section Header */}
        <div className="mb-14 sm:mb-16">
          <p className="text-[11px] font-medium tracking-[0.15em] uppercase text-white/25 mb-3">
            工作流
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white/90 tracking-tight">
            四步完成高质量素材
          </h2>
          <p className="mt-2 text-sm text-white/35 max-w-md">
            从灵感到成品，闭环自动化
          </p>
        </div>

        {/* 步骤卡片网格 */}
        <div className="wf-grid">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.label}
                className="relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6"
              >
                {/* 序号 */}
                <span className="text-[10px] text-white/20 font-mono tracking-wider">
                  {String(index + 1).padStart(2, '0')}
                </span>

                {/* 图标 */}
                <div className="mt-4 w-10 h-10 rounded-lg bg-white/[0.05] border border-white/[0.07] flex items-center justify-center">
                  <Icon className="h-4 w-4 text-white/40" />
                </div>

                {/* 文字 */}
                <h3 className="mt-4 text-sm font-semibold text-white/80">
                  {step.label}
                </h3>
                <p className="mt-1.5 text-xs text-white/30 leading-relaxed">
                  {step.description}
                </p>

                {/* 桌面端连接箭头 */}
                {index < steps.length - 1 && (
                  <div
                    className="wf-connector absolute top-1/2 -right-[9px] -translate-y-1/2 text-white/10 text-xs"
                  >
                    →
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
