'use client';

import { useState } from 'react';

const OSS_BASE = 'https://guangzhougamead.oss-cn-guangzhou.aliyuncs.com';

/* ───── Tab 数据 ───── */

interface ShowcaseTab {
  label: string;
  desc: string;
  image: string;
}

const tabs: ShowcaseTab[] = [
  {
    label: '爆款分析',
    desc: '拆解竞品广告结构，提取可复用的爆款公式',
    image: `${OSS_BASE}/assets/1769695199911-30694cdfe06321ed.mp4`,
  },
  {
    label: 'AI 创作台',
    desc: '一键生成脚本与分镜，从灵感到画面只需一步',
    image: `${OSS_BASE}/assets/1763470703877-877dcd122bda63de.mp4`,
  },
  {
    label: '智能审核',
    desc: '素材质量自动评分，确保每一帧达标',
    image: `${OSS_BASE}/assets/1769695019900-3f235c7fbecf9cea.mp4`,
  },
  {
    label: '灵感广场',
    desc: '浏览高转化广告案例，激发创意灵感',
    image: `${OSS_BASE}/assets/1769695199911-30694cdfe06321ed.mp4`,
  },
  {
    label: '素材库',
    desc: '管理全部广告素材资产，高效协作',
    image: `${OSS_BASE}/assets/1763470703877-877dcd122bda63de.mp4`,
  },
];

/* ───── 响应式 CSS ───── */

const SHOWCASE_CSS = `
.login-showcase{display:none}
@media(min-width:768px){
  .login-showcase{display:flex}
}`;

/* ───── 主组件 ───── */

export function LoginShowcase() {
  const [active, setActive] = useState(0);

  return (
    <div
      className="login-showcase"
      style={{
        width: '50%',
        background: '#000',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 'clamp(32px, 4vw, 64px)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>{SHOWCASE_CSS}</style>

      {/* Tab 导航 */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          marginBottom: 32,
        }}
      >
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActive(i)}
            style={{
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 500,
              color: i === active ? '#fff' : 'rgba(255,255,255,0.4)',
              background: 'none',
              border: 'none',
              borderBottom: i === active ? '2px solid #fff' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 视频展示区 */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 10',
          borderRadius: 12,
          overflow: 'hidden',
          background: '#0a0a0a',
        }}
      >
        {tabs.map((tab, i) => (
          <video
            key={tab.label}
            src={tab.image}
            muted
            loop
            playsInline
            autoPlay={i === active}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: i === active ? 1 : 0,
              transition: 'opacity 0.5s ease',
            }}
          />
        ))}
      </div>

      {/* 功能描述 */}
      <div style={{ marginTop: 24, minHeight: 40 }}>
        <h3
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: '#fff',
            margin: 0,
          }}
        >
          {tabs[active].label}
        </h3>
        <p
          style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.4)',
            marginTop: 8,
            lineHeight: 1.5,
          }}
        >
          {tabs[active].desc}
        </p>
      </div>
    </div>
  );
}
