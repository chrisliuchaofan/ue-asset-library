'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export function CTASection() {
  return (
    <section style={{ background: '#000', paddingTop: 80, paddingBottom: 80 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 clamp(24px, 5vw, 80px)' }}>
        <h2
          style={{
            fontSize: 'clamp(28px, 4vw, 48px)',
            fontWeight: 700,
            color: '#fff',
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
          }}
        >
          让每一个素材
          <br />
          都有爆款潜力
        </h2>

        <p
          style={{
            marginTop: 20,
            fontSize: 16,
            color: 'rgba(255,255,255,0.35)',
            maxWidth: 420,
            lineHeight: 1.6,
          }}
        >
          AI 驱动的游戏广告素材全链路工作台
        </p>

        <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link
            href="/auth/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 15,
              fontWeight: 600,
              color: '#000',
              padding: '12px 28px',
              borderRadius: 8,
              background: '#fff',
              textDecoration: 'none',
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
            <ChevronRight size={16} />
          </Link>
          <Link
            href="/auth/login"
            style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.35)',
              textDecoration: 'none',
              padding: '12px 16px',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)';
            }}
          >
            已有账号？登录
          </Link>
        </div>
      </div>
    </section>
  );
}
