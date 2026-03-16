'use client';

/**
 * AnimatedHero — 首页 Hero 区域
 * 标题 + 副标题 + 明显的向下滚动提示
 */
export function AnimatedHero() {
  return (
    <>
      <style>{`
        @keyframes hero-fadein {
          from { opacity: 0; transform: translateY(30px); filter: blur(10px); }
          to   { opacity: 1; transform: translateY(0);    filter: blur(0); }
        }
        .hero-t { animation: hero-fadein 1s ease-out forwards; opacity: 0; }
        .hero-s { animation: hero-fadein 0.8s ease-out 0.3s forwards; opacity: 0; }
      `}</style>

      <section
        id="section-home"
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          minHeight: '100svh',
          width: '100%',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none',
          padding: '0 24px',
        }}
      >
        <h1
          className="hero-t"
          style={{
            fontSize: 'clamp(3rem, 8vw, 5rem)',
            fontWeight: 200,
            letterSpacing: '0.08em',
            color: 'rgba(255,255,255,0.85)',
            marginBottom: 16,
          }}
        >
          爆款工坊
        </h1>
        <p
          className="hero-s"
          style={{
            fontSize: 'clamp(13px, 1.5vw, 16px)',
            color: 'rgba(255,255,255,0.3)',
            fontWeight: 300,
            letterSpacing: '0.15em',
          }}
        >
          AI 驱动的素材管理与制作平台
        </p>


      </section>
    </>
  );
}
