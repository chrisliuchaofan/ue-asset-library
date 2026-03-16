'use client';

import Link from 'next/link';

const features = [
  {
    tag: '01',
    title: 'AI 拆解竞品素材结构',
    description:
      '自动识别 Hook、转场、CTA 等关键节点，提取可复用的爆款公式，让你的创作有据可依。',
    mockUI: 'analysis',
  },
  {
    tag: '02',
    title: '一键生成脚本与视觉分镜',
    description:
      '基于爆款模版匹配，AI 自动生成完整脚本与逐帧分镜图，从文字到画面无缝衔接。',
    mockUI: 'script',
  },
  {
    tag: '03',
    title: '分镜图直接生成视频片段',
    description:
      '对接可灵、即梦等多家 AI 视频引擎，分镜图一键转视频，大幅缩短制作周期。',
    mockUI: 'video',
  },
  {
    tag: '04',
    title: '上线前 AI 全方位质检',
    description:
      '自动检测首帧吸引力、Hook 有效性、CTA 清晰度，审核通过率提升到 95% 以上。',
    mockUI: 'review',
  },
];

/* 响应式布局 CSS — 避免 Tailwind md:/lg: 在 dynamic import 下失效 */
const RESPONSIVE_CSS = `
.feat-grid {
  display: flex;
  flex-direction: column;
  gap: 48px;
}
.feat-row {
  display: flex;
  flex-direction: column;
  gap: 32px;
}
.feat-text { order: 1; }
.feat-mock { order: 2; }
.feat-row-reverse .feat-text { order: 1; }
.feat-row-reverse .feat-mock { order: 2; }

@media (min-width: 768px) {
  .feat-grid { gap: 80px; }
  .feat-row {
    flex-direction: row;
    align-items: center;
    gap: 64px;
  }
  .feat-text { flex: 5; min-width: 0; order: 1; }
  .feat-mock { flex: 6; min-width: 0; order: 2; }
  .feat-row-reverse .feat-text { order: 2; }
  .feat-row-reverse .feat-mock { order: 1; }
}

@media (min-width: 1024px) {
  .feat-grid { gap: 100px; }
  .feat-row { gap: 80px; }
}
`;

/** Mock UI — 线条色块暗示功能 */
function MockUI({ type }: { type: string }) {
  const shared = 'rounded-xl bg-white/[0.04] border border-white/[0.08] p-5';

  const elements: Record<string, React.ReactNode> = {
    analysis: (
      <div className={shared}>
        <div className="h-2 bg-white/[0.08] rounded-full w-full mb-4" />
        <div className="flex gap-1.5 mb-4">
          <div className="h-1.5 w-10 bg-white/[0.10] rounded-full" />
          <div className="h-1.5 w-16 bg-white/[0.15] rounded-full" />
          <div className="h-1.5 w-8 bg-white/[0.08] rounded-full" />
          <div className="h-1.5 w-14 bg-white/[0.12] rounded-full" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="aspect-video bg-white/[0.06] rounded-lg border border-white/[0.06]" />
          ))}
        </div>
        <div className="mt-3 space-y-1.5">
          <div className="h-1.5 bg-white/[0.07] rounded-full w-3/4" />
          <div className="h-1.5 bg-white/[0.05] rounded-full w-1/2" />
        </div>
      </div>
    ),
    script: (
      <div className={shared}>
        <div className="flex gap-2 mb-4">
          <div className="h-6 px-3 bg-white/[0.10] rounded-md text-[10px] text-white/35 flex items-center">脚本</div>
          <div className="h-6 px-3 bg-white/[0.04] rounded-md text-[10px] text-white/20 flex items-center">分镜</div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-2.5 items-start">
              <div className="w-5 h-5 rounded bg-white/[0.07] text-[9px] text-white/25 flex items-center justify-center flex-shrink-0">{i}</div>
              <div className="flex-1 space-y-1.5">
                <div className="h-1.5 bg-white/[0.08] rounded-full" style={{ width: `${65 + i * 7}%` }} />
                <div className="h-1.5 bg-white/[0.04] rounded-full" style={{ width: `${35 + i * 12}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    video: (
      <div className={shared}>
        <div className="aspect-video bg-white/[0.05] rounded-lg border border-white/[0.06] mb-3 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-white/[0.08] flex items-center justify-center">
            <div className="w-0 h-0 border-l-[7px] border-l-white/35 border-y-[5px] border-y-transparent ml-0.5" />
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <div className="h-1.5 bg-white/[0.12] rounded-full flex-1" />
          <span className="text-[10px] text-white/25 tabular-nums">0:00</span>
        </div>
        <div className="mt-3 flex gap-1.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-1 aspect-video bg-white/[0.05] rounded border border-white/[0.06]" />
          ))}
        </div>
      </div>
    ),
    review: (
      <div className={shared}>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full border-2 border-white/[0.12] flex items-center justify-center text-sm text-white/50 font-semibold tabular-nums">95</div>
          <div className="flex-1 space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="h-1.5 bg-white/[0.15] rounded-full flex-1" />
              <span className="text-[10px] text-white/25 w-6">首帧</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 bg-white/[0.12] rounded-full w-4/5" />
              <span className="text-[10px] text-white/25 w-6">Hook</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 bg-white/[0.08] rounded-full w-3/5" />
              <span className="text-[10px] text-white/25 w-6">CTA</span>
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="h-1.5 bg-white/[0.05] rounded-full w-full" />
          <div className="h-1.5 bg-white/[0.04] rounded-full w-2/3" />
        </div>
      </div>
    ),
  };

  return <>{elements[type]}</>;
}

export function FeatureSection() {
  return (
    <section
      id="features"
      className="relative z-10 py-24 sm:py-32"
      style={{ background: '#0e0e16' }}
    >
      <style>{RESPONSIVE_CSS}</style>
      <div className="max-w-5xl mx-auto px-6 sm:px-8">
        {/* Section Header */}
        <div className="mb-16 sm:mb-20">
          <p className="text-[11px] font-medium tracking-[0.15em] uppercase text-white/25 mb-3">
            核心功能
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white/90 tracking-tight">
            覆盖素材全生命周期
          </h2>
          <p className="mt-2 text-sm text-white/35 max-w-lg">
            从灵感到投放，每一步都有 AI 加速
          </p>
        </div>

        {/* Feature Blocks — flexbox 控制间距和排列 */}
        <div className="feat-grid">
          {features.map((feature, index) => (
            <div
              key={feature.tag}
              className={`feat-row ${index % 2 !== 0 ? 'feat-row-reverse' : ''}`}
            >
              {/* 文字侧 */}
              <div className="feat-text">
                <span className="text-[11px] text-white/20 font-mono tracking-wider">{feature.tag}</span>
                <h3 className="text-xl sm:text-2xl font-bold text-white/90 mt-2 tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-white/35 mt-3 leading-relaxed text-sm max-w-sm">
                  {feature.description}
                </p>
                <Link
                  href="/auth/register"
                  className="mt-5 inline-block text-sm text-white/25 hover:text-white/55 transition-colors duration-200"
                >
                  了解更多 →
                </Link>
              </div>

              {/* 演示侧 */}
              <div className="feat-mock">
                <MockUI type={feature.mockUI} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
