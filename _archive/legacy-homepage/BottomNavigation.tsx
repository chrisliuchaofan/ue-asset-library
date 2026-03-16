'use client';

import { useEffect, useState, useCallback } from 'react';

const NAV_ITEMS = ['首页', '素材', '资产', '拆解', '审核', '工作台'];

export function BottomNavigation() {
  const [activeIdx, setActiveIdx] = useState(0);

  const handleClick = useCallback((idx: number) => {
    setActiveIdx(idx); // Optimistic update
    let targetEl: Element | null = null;
    if (idx === 0) {
      targetEl = document.getElementById('section-home');
    } else {
      const parts = document.querySelectorAll('.ls-section');
      targetEl = parts[idx - 1] || null;
    }

    // Fallback to ID if querySelector fails (e.g. strict hydration)
    if (!targetEl && idx > 0) {
      const ids = ['section-materials', 'section-assets', 'section-analysis', 'section-review', 'section-studio'];
      targetEl = document.getElementById(ids[idx - 1]);
    }

    targetEl?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    let observers: IntersectionObserver[] = [];

    const setup = () => {
      observers.forEach(o => o.disconnect());
      observers = [];

      NAV_ITEMS.forEach((_, idx) => {
        let el: Element | null = null;
        if (idx === 0) {
          el = document.getElementById('section-home');
        } else {
          const parts = document.querySelectorAll('.ls-section');
          el = parts[idx - 1] || null;
        }

        if (!el && idx > 0) {
          const ids = ['section-materials', 'section-assets', 'section-analysis', 'section-review', 'section-studio'];
          el = document.getElementById(ids[idx - 1]);
        }

        if (!el) return;

        const obs = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) {
              setActiveIdx(idx);
            }
          },
          { threshold: 0.3 }
        );
        obs.observe(el);
        observers.push(obs);
      });
    };

    setup();
    const t1 = setTimeout(setup, 1000);
    const t2 = setTimeout(setup, 3000);

    // MutationObserver to catch late hydration or Fast Refresh
    const mut = new MutationObserver(setup);
    mut.observe(document.body, { childList: true, subtree: true });
    const t3 = setTimeout(() => mut.disconnect(), 8000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      mut.disconnect();
      observers.forEach(o => o.disconnect());
    };
  }, []);

  return (
    <>
      <style>{`
        /* ── Flowing Glow Wrapper ── */
        .bn-wrapper {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 40;
          padding: 1px; /* border thickness */
          border-radius: 999px;
          background: linear-gradient(
            90deg, 
            rgba(255,255,255,0.05) 0%, 
            rgba(255,255,255,0.4) 50%, 
            rgba(255,255,255,0.05) 100%
          );
          background-size: 200% 100%;
          animation: border-flow 3s linear infinite;
          box-shadow: 0 4px 24px rgba(0,0,0,0.5);
        }
        @keyframes border-flow {
          0% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }

        .bn-bar {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 16px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
        }
        .bn-item {
          position: relative;
          padding: 6px 16px;
          font-size: 13px;
          letter-spacing: 0.12em;
          font-weight: 300;
          color: rgba(255,255,255,0.4);
          cursor: pointer;
          transition: color 0.3s;
          user-select: none;
          white-space: nowrap;
          border: none;
          background: none;
          outline: none;
        }
        .bn-item:hover { color: rgba(255,255,255,0.7); }
        .bn-item.bn-active { color: rgba(255,255,255,0.9); }
        .bn-dot {
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: rgba(255,255,255,0.7);
          transition: opacity 0.3s;
        }
      `}</style>

      <div className="bn-wrapper">
        <nav className="bn-bar">
          {NAV_ITEMS.map((label, i) => (
            <button
              key={label}
              className={`bn-item ${activeIdx === i ? 'bn-active' : ''}`}
              onClick={() => handleClick(i)}
            >
              {label}
              {activeIdx === i && <span className="bn-dot" />}
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}
