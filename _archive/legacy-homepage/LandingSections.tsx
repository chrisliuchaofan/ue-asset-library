'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import Link from 'next/link';

/* ------------------------------------------------------------------ */
/*  IntersectionObserver fade-in wrapper                               */
/* ------------------------------------------------------------------ */
function RevealSection({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('ls-visible');
          obs.unobserve(el);
        }
      },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} className={`ls-section ${className}`}>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Tag badge                                                           */
/* ------------------------------------------------------------------ */
function TagBadge({ tag }: { tag: string }) {
  const cls =
    tag === '爆款' ? 'ls-tag-hot' : tag === '优质' ? 'ls-tag-good' : 'ls-tag-ok';
  return <span className={`ls-tag ${cls}`}>{tag}</span>;
}

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
interface MaterialCard {
  id: string;
  name: string;
  thumbnail: string;
  tag: string;
  type: string;
}

interface LandingSectionsProps {
  materials: MaterialCard[];
  assetCount: number;
}

/* ================================================================== */
/*  Main Component                                                     */
/* ================================================================== */
export function LandingSections({ materials, assetCount }: LandingSectionsProps) {
  return (
    <>
      <style>{`
        /* ── Section base ── */
        .ls-section {
          opacity: 0;
          transform: translateY(50px);
          transition: opacity 0.9s cubic-bezier(0.25,0.46,0.45,0.94),
                      transform 0.9s cubic-bezier(0.25,0.46,0.45,0.94);
          min-height: 100svh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: clamp(60px, 10vh, 120px) clamp(16px, 5vw, 80px);
          position: relative;
          z-index: 10;
          width: 100%;
          box-sizing: border-box;
        }
        .ls-section.ls-visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* ── Headings ── */
        .ls-heading {
          font-size: clamp(2.2rem, 6vw, 3.6rem);
          font-weight: 200;
          letter-spacing: 0.06em;
          color: rgba(255,255,255,0.85);
          margin-bottom: 12px;
          text-align: center;
        }
        .ls-desc {
          font-size: clamp(13px, 1.4vw, 16px);
          color: rgba(255,255,255,0.35);
          font-weight: 300;
          letter-spacing: 0.1em;
          margin-bottom: clamp(32px, 5vh, 64px);
          text-align: center;
        }

        /* ── CTA Button ── */
        .ls-cta {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: clamp(10px, 1.2vw, 14px) clamp(24px, 3vw, 40px);
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.6);
          font-size: clamp(13px, 1.2vw, 15px);
          font-weight: 300;
          letter-spacing: 0.08em;
          text-decoration: none;
          transition: all 0.3s;
          margin-top: clamp(28px, 4vh, 56px);
        }
        .ls-cta:hover {
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.85);
          border-color: rgba(255,255,255,0.2);
          transform: translateY(-1px);
        }

        /* ── Material grid ── */
        .ls-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: clamp(12px, 1.5vw, 24px);
          width: 100%;
          max-width: min(1200px, 90vw);
        }
        @media (max-width: 768px) {
          .ls-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 480px) {
          .ls-grid {
            grid-template-columns: 1fr;
          }
        }
        .ls-card {
          position: relative;
          border-radius: clamp(10px, 1.2vw, 18px);
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.03);
          aspect-ratio: 16/9;
          text-decoration: none;
          display: block;
          transition: border-color 0.3s, transform 0.3s, box-shadow 0.3s;
        }
        .ls-card:hover {
          border-color: rgba(255,255,255,0.15);
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.3);
        }
        .ls-card video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.5;
          transition: opacity 0.5s;
          pointer-events: none;
        }
        .ls-card:hover video { opacity: 0.8; }
        .ls-card-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.15) 45%, transparent 100%);
        }
        .ls-card-meta {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: clamp(10px, 1.2vw, 16px) clamp(12px, 1.5vw, 20px);
        }
        .ls-card-name {
          font-size: clamp(12px, 1.1vw, 15px);
          color: rgba(255,255,255,0.8);
          font-weight: 300;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 6px;
        }
        .ls-card-tags { display: flex; align-items: center; gap: 8px; }
        .ls-tag {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 5px;
          font-size: clamp(10px, 0.9vw, 12px);
          font-weight: 500;
          letter-spacing: 0.5px;
        }
        .ls-tag-hot  { background: rgba(249,115,22,0.2); color: rgba(253,186,116,0.9); }
        .ls-tag-good { background: rgba(16,185,129,0.2); color: rgba(110,231,183,0.9); }
        .ls-tag-ok   { background: rgba(113,113,122,0.2); color: rgba(161,161,170,0.9); }
        .ls-card-type { font-size: clamp(10px, 0.9vw, 12px); color: rgba(255,255,255,0.35); font-weight: 300; }

        /* ── Stats grid ── */
        .ls-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: clamp(16px, 2vw, 32px);
          width: 100%;
          max-width: min(900px, 85vw);
        }
        .ls-stat {
          text-align: center;
          padding: clamp(24px, 3vw, 48px) clamp(16px, 2vw, 32px);
          border-radius: clamp(12px, 1.5vw, 24px);
          border: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.02);
          transition: border-color 0.3s, background 0.3s;
        }
        .ls-stat:hover {
          border-color: rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.04);
        }
        .ls-stat-num {
          font-size: clamp(2.5rem, 5vw, 4.5rem);
          font-weight: 200;
          color: rgba(255,255,255,0.75);
          margin-bottom: 8px;
          line-height: 1;
        }
        .ls-stat-label {
          font-size: clamp(12px, 1.1vw, 15px);
          color: rgba(255,255,255,0.3);
          font-weight: 300;
          letter-spacing: 0.1em;
        }

        /* ── Coming soon badge ── */
        .ls-coming {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 20px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.02);
          margin-top: 16px;
        }
        .ls-coming-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: rgba(251,191,36,0.6);
          animation: ls-pulse 2s ease-in-out infinite;
        }
        @keyframes ls-pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .ls-coming-text {
          font-size: clamp(12px, 1vw, 14px);
          color: rgba(255,255,255,0.35);
          font-weight: 300;
        }

        /* ── Feature tags for upcoming modules ── */
        .ls-features {
          display: flex;
          flex-wrap: wrap;
          gap: clamp(10px, 1.2vw, 18px);
          justify-content: center;
          margin-bottom: 12px;
          max-width: min(800px, 90vw);
        }
        .ls-feature {
          padding: clamp(10px, 1.2vw, 16px) clamp(18px, 2.5vw, 36px);
          border-radius: clamp(10px, 1vw, 14px);
          border: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.02);
          color: rgba(255,255,255,0.4);
          font-size: clamp(13px, 1.2vw, 16px);
          font-weight: 300;
          letter-spacing: 0.05em;
          transition: border-color 0.3s, color 0.3s;
        }
        .ls-feature:hover {
          border-color: rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.55);
        }

        /* ── Section divider line ── */
        .ls-divider {
          width: 60px;
          height: 1px;
          background: linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent);
          margin: 0 auto;
        }
      `}</style>

      {/* ── Section 1: 素材库 ── */}
      <RevealSection>
        <h2 className="ls-heading">素材库</h2>
        <p className="ls-desc">高品质视频素材管理 · 快速检索与预览</p>

        {materials.length > 0 ? (
          <div className="ls-grid">
            {materials.slice(0, 6).map((m) => (
              <Link key={m.id} href={`/materials/${m.id}`} className="ls-card">
                <video src={m.thumbnail} muted loop playsInline autoPlay />
                <div className="ls-card-overlay" />
                <div className="ls-card-meta">
                  <div className="ls-card-name">{m.name}</div>
                  <div className="ls-card-tags">
                    <TagBadge tag={m.tag} />
                    <span className="ls-card-type">{m.type}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14, fontWeight: 300 }}>
            素材库为空
          </p>
        )}

        <Link href="/materials" className="ls-cta">
          进入素材库
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </RevealSection>

      {/* ── Section 2: 资产库 ── */}
      <RevealSection>
        <h2 className="ls-heading">资产库</h2>
        <p className="ls-desc">UE / AE 资产全生命周期管理</p>

        <div className="ls-stats">
          <div className="ls-stat">
            <div className="ls-stat-num">{assetCount}</div>
            <div className="ls-stat-label">资产总数</div>
          </div>
          <div className="ls-stat">
            <div className="ls-stat-num">UE</div>
            <div className="ls-stat-label">虚幻引擎</div>
          </div>
          <div className="ls-stat">
            <div className="ls-stat-num">AE</div>
            <div className="ls-stat-label">After Effects</div>
          </div>
        </div>

        <Link href="/assets" className="ls-cta">
          进入资产库
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </RevealSection>

      {/* ── Section 3: 爆款拆解 ── */}
      <RevealSection>
        <h2 className="ls-heading">爆款拆解</h2>
        <p className="ls-desc">Gemini Pro 驱动的视频结构化分析</p>

        <div className="ls-features">
          <div className="ls-feature">视频结构分析</div>
          <div className="ls-feature">爆款元素提取</div>
          <div className="ls-feature">竞品对比</div>
          <div className="ls-feature">趋势洞察</div>
        </div>

        <div className="ls-coming">
          <div className="ls-coming-dot" />
          <span className="ls-coming-text">S2 · 开发中</span>
        </div>

        <Link href="/analysis" className="ls-cta">
          了解更多
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </RevealSection>

      {/* ── Section 4: 审核中心 ── */}
      <RevealSection>
        <h2 className="ls-heading">审核中心</h2>
        <p className="ls-desc">AI 智能评分 · 自动化反馈循环</p>

        <div className="ls-features">
          <div className="ls-feature">AI 质量评分</div>
          <div className="ls-feature">合规检测</div>
          <div className="ls-feature">自动标注</div>
          <div className="ls-feature">批量审核</div>
        </div>

        <div className="ls-coming">
          <div className="ls-coming-dot" />
          <span className="ls-coming-text">S3 · 开发中</span>
        </div>

        <Link href="/review" className="ls-cta">
          了解更多
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </RevealSection>

      {/* ── Section 5: 制作工作台 ── */}
      <RevealSection>
        <h2 className="ls-heading">制作工作台</h2>
        <p className="ls-desc">AI 脚本生成 · 智能分镜 · 片头制作</p>

        <div className="ls-features">
          <div className="ls-feature">AI 脚本撰写</div>
          <div className="ls-feature">智能分镜</div>
          <div className="ls-feature">AI 片头生成</div>
          <div className="ls-feature">Brief 包输出</div>
        </div>

        <div className="ls-coming">
          <div className="ls-coming-dot" />
          <span className="ls-coming-text">S4 · 开发中</span>
        </div>

        <Link href="/studio" className="ls-cta">
          了解更多
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </RevealSection>
    </>
  );
}
