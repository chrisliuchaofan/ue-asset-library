'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

const OSS_BASE = 'https://guangzhougamead.oss-cn-guangzhou.aliyuncs.com';

/* ───── 视频背景（只渲染 active + 预加载 next） ───── */

function BgVideo({
  src,
  active,
  onCanPlay,
}: {
  src: string;
  active: boolean;
  onCanPlay?: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (active) {
      el.currentTime = 0;
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [active]);

  return (
    <video
      ref={ref}
      src={src}
      muted
      loop
      playsInline
      preload={active ? 'auto' : 'metadata'}
      onCanPlay={onCanPlay}
      className="absolute inset-0 w-full h-full object-cover"
    />
  );
}

/* ───── URL 解析 ───── */

function resolveVideoUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/assets/') || url.startsWith('assets/')) {
    const path = url.startsWith('/') ? url.slice(1) : url;
    return `${OSS_BASE}/${path}`;
  }
  return url;
}

/* ───── 默认数据 ───── */

interface SlideData {
  video: string;
}

const FALLBACK_VIDEOS = [
  `${OSS_BASE}/assets/1769695199911-30694cdfe06321ed.mp4`,
  `${OSS_BASE}/assets/1763470703877-877dcd122bda63de.mp4`,
  `${OSS_BASE}/assets/1769695019900-3f235c7fbecf9cea.mp4`,
];

/* ───── 功能分类链接 ───── */

const featureLinks = [
  { label: 'AI 创作台', href: '/studio' },
  { label: '爆款模版', href: '/templates' },
  { label: '智能审核', href: '/review' },
  { label: '灵感广场', href: '/inspirations' },
];

/* ───── 主组件 ───── */

export function HeroShowcase() {
  const [current, setCurrent] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [slides, setSlides] = useState<SlideData[]>(
    FALLBACK_VIDEOS.map((video) => ({ video })),
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // 动态加载视频（带超时保护）
  useEffect(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);

    fetch('/api/landing/hero-videos', { signal: ctrl.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data.videos && data.videos.length > 0) {
          const dynamicSlides: SlideData[] = data.videos.map(
            (v: { src: string; name: string }) => ({
              video: resolveVideoUrl(v.src),
            }),
          );
          setSlides(dynamicSlides);
        }
      })
      .catch(() => {})
      .finally(() => clearTimeout(timer));

    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, []);

  const next = useCallback(() => {
    setSlides((prev) => {
      setCurrent((c) => (c + 1) % prev.length);
      return prev;
    });
  }, []);

  useEffect(() => {
    const timer = setInterval(next, 8000);
    return () => clearInterval(timer);
  }, [next]);

  const safeIndex = slides.length > 0 ? current % slides.length : 0;
  const nextIndex = slides.length > 1 ? (safeIndex + 1) % slides.length : -1;

  return (
    <section
      style={{
        position: 'relative',
        height: '100vh',
        overflow: 'hidden',
        background: '#000',
      }}
    >
      {/* 只渲染当前 + 下一个视频（而不是全部） */}
      {slides.map((s, i) => {
        const isActive = i === safeIndex;
        const isNext = i === nextIndex;
        // 只渲染当前播放 + 下一个预加载的
        if (!isActive && !isNext) return null;

        return (
          <div
            key={`slide-${i}`}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: isActive ? 1 : 0,
              transition: 'opacity 2s ease-in-out',
            }}
          >
            <BgVideo
              src={s.video}
              active={isActive}
              onCanPlay={isActive && !videoReady ? () => setVideoReady(true) : undefined}
            />
          </div>
        );
      })}

      {/* 首帧加载骨架：黑底 + 微光呼吸 */}
      {!videoReady && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)',
            animation: 'pulse 2s ease-in-out infinite',
            zIndex: 5,
          }}
        />
      )}

      {/* 轻暗色覆盖 */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} />

      {/* 底部渐变 → 纯黑 */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '40vh',
          background: 'linear-gradient(to top, #000 0%, #000 5%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* ── 内容区（始终显示，不等视频） ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          height: '100%',
          padding: isMobile ? '0 20px' : '0 clamp(24px, 5vw, 80px)',
          paddingBottom: isMobile ? '100px' : 'clamp(80px, 12vh, 140px)',
        }}
      >
        {/* 主标题 */}
        <h1
          style={{
            margin: 0,
            fontSize: isMobile ? 36 : 'clamp(40px, 8vw, 80px)',
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            color: '#fff',
          }}
        >
          首帧定生死，
          <br />
          爆款有工坊
        </h1>

        {/* 功能分类链接 */}
        <div style={{ marginTop: isMobile ? 20 : 32, display: 'flex', flexWrap: 'wrap', gap: isMobile ? 12 : 24 }}>
          {featureLinks.map((item) => (
            <Link
              key={item.label}
              href={item.label === 'AI 创作台' ? '/auth/login' : item.href}
              style={{
                fontSize: isMobile ? 13 : 14,
                fontWeight: 500,
                color: 'rgba(255,255,255,0.45)',
                textDecoration: 'none',
                letterSpacing: '0.02em',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.85)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)';
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div style={{ marginTop: isMobile ? 24 : 36 }}>
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
        </div>
      </div>

      {/* 轮播指示线 */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          right: 'clamp(24px, 5vw, 80px)',
          display: 'flex',
          gap: 6,
          zIndex: 10,
        }}
      >
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            style={{
              width: i === safeIndex ? 28 : 12,
              height: 3,
              borderRadius: 2,
              border: 'none',
              background: i === safeIndex ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)',
              cursor: 'pointer',
              transition: 'all 0.4s ease',
              padding: 0,
            }}
            aria-label={`切换到第 ${i + 1} 张`}
          />
        ))}
      </div>
    </section>
  );
}
