'use client';

/* Scene cards — no external animation deps */
import Link from 'next/link';

const scenes = [
  {
    title: 'RPG 角色展示',
    description: '突出角色技能和画面表现力',
    emoji: '⚔️',
  },
  {
    title: 'SLG 策略推广',
    description: '展示建造、联盟、战争玩法',
    emoji: '🏰',
  },
  {
    title: '休闲游戏买量',
    description: '趣味玩法 + 强 CTA 转化',
    emoji: '🎮',
  },
  {
    title: '二次元手游',
    description: 'Live2D 角色 + 剧情向素材',
    emoji: '🌸',
  },
  {
    title: '竞技对战',
    description: '快节奏操作 + 排名激励',
    emoji: '🏆',
  },
];

export function SceneCards() {
  return (
    <section id="scenes" className="py-24 sm:py-32" style={{ background: '#0b0b12' }}>
      <div className="max-w-5xl mx-auto px-6 sm:px-8">
        {/* Section header */}
        <div className="mb-12 sm:mb-16">
          <p className="text-[11px] font-medium tracking-[0.15em] uppercase text-white/25 mb-3">
            适用场景
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white/90 tracking-tight">
            为游戏广告而生
          </h2>
          <p className="mt-2 text-sm text-white/35 max-w-md">
            无论什么品类、什么风格，AI 都能帮你找到爆款公式
          </p>
        </div>

        {/* 网格布局 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {scenes.map((scene) => (
            <Link
              key={scene.title}
              href="/auth/register"
              className="group block rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6 transition-colors duration-200 hover:bg-white/[0.05] hover:border-white/[0.10]"
            >
              <span className="text-2xl leading-none">{scene.emoji}</span>
              <h3 className="mt-3 text-sm font-semibold text-white/80">
                {scene.title}
              </h3>
              <p className="mt-1 text-xs text-white/30 leading-relaxed">
                {scene.description}
              </p>
              <span className="mt-3 inline-block text-xs text-white/20 group-hover:text-white/45 transition-colors duration-200">
                开始创作 →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
