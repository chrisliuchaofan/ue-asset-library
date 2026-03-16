'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

/* ───── 导航数据 ───── */

const navLinks = [
  { label: '创作台', href: '/studio' },
  { label: '模版', href: '/templates' },
  { label: '灵感', href: '/inspirations' },
];

/* ───── 响应式 CSS ───── */

const RESPONSIVE_CSS = `
.nav-desktop{display:none}
.nav-mobile-btn{display:flex}
.nav-mobile-overlay{display:block}
@media(min-width:768px){
  .nav-desktop{display:flex}
  .nav-mobile-btn{display:none}
  .nav-mobile-overlay{display:none}
}`;

/* ───── Runway 风格极简导航 ───── */

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: scrolled ? 'rgba(0,0,0,0.8)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px) saturate(1.4)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
        transition: 'background 0.35s ease, backdrop-filter 0.35s ease, border-color 0.35s ease',
      }}
    >
      <style>{RESPONSIVE_CSS}</style>
      <div
        style={{
          maxWidth: 1400,
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 56,
        }}
      >
        {/* ── 左侧：Logo ── */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: 'linear-gradient(135deg, #7C3AED, #F97316)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 100 100" fill="none">
              <polygon points="35,20 35,80 80,50" fill="white" opacity="0.95" />
            </svg>
          </div>
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.92)',
              letterSpacing: '-0.01em',
            }}
          >
            爆款工坊
          </span>
        </Link>

        {/* ── 中部：居中导航链接 ── */}
        <div
          className="nav-desktop"
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {navLinks.map((item) => (
            <a
              key={item.label}
              href={item.href}
              style={{
                padding: '6px 14px',
                fontSize: 13,
                fontWeight: 500,
                color: 'rgba(255,255,255,0.5)',
                textDecoration: 'none',
                letterSpacing: '0.04em',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.9)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)';
              }}
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* ── 右侧：登录 + CTA ── */}
        <div className="nav-desktop" style={{ alignItems: 'center', gap: 8 }}>
          <Link
            href="/auth/login"
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.5)',
              textDecoration: 'none',
              padding: '6px 14px',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.9)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)';
            }}
          >
            登录
          </Link>
          <Link
            href="/auth/login"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#000',
              textDecoration: 'none',
              padding: '8px 20px',
              borderRadius: 6,
              background: '#fff',
              transition: 'opacity 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = '0.85';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = '1';
            }}
          >
            开始创作
          </Link>
        </div>

        {/* ── Mobile 汉堡按钮 ── */}
        <button
          className="nav-mobile-btn"
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.6)',
            cursor: 'pointer',
          }}
          aria-label={mobileOpen ? '关闭菜单' : '打开菜单'}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* ── Mobile 全屏菜单 ── */}
      <div
        className="nav-mobile-overlay"
        style={{
          position: 'fixed',
          inset: 0,
          top: 56,
          background: 'rgba(0,0,0,0.96)',
          backdropFilter: 'blur(20px)',
          opacity: mobileOpen ? 1 : 0,
          pointerEvents: mobileOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {navLinks.map((item) => (
          <a
            key={item.label}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            style={{
              fontSize: 18,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.6)',
              textDecoration: 'none',
              padding: '12px 0',
            }}
          >
            {item.label}
          </a>
        ))}
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <Link
            href="/auth/login"
            onClick={() => setMobileOpen(false)}
            style={{
              fontSize: 15,
              color: 'rgba(255,255,255,0.5)',
              textDecoration: 'none',
              padding: '10px 0',
            }}
          >
            登录
          </Link>
          <Link
            href="/auth/login"
            onClick={() => setMobileOpen(false)}
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: '#000',
              textDecoration: 'none',
              padding: '12px 32px',
              borderRadius: 6,
              background: '#fff',
            }}
          >
            开始创作
          </Link>
        </div>
      </div>
    </nav>
  );
}
