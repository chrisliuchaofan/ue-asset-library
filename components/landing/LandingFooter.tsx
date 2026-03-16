import Link from 'next/link';

export function LandingFooter() {
  return (
    <footer style={{ background: '#000' }}>
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 clamp(24px, 5vw, 80px)',
        }}
      >
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            padding: '24px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          {/* 左侧：Logo + 版权 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 5,
                  background: 'linear-gradient(135deg, #7C3AED, #F97316)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="10" height="10" viewBox="0 0 100 100" fill="none">
                  <polygon points="35,20 35,80 80,50" fill="white" opacity="0.95" />
                </svg>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>
                爆款工坊
              </span>
            </div>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)' }}>
              &copy; {new Date().getFullYear()}
            </span>
          </div>

          {/* 右侧：链接 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {[
              { label: '登录', href: '/auth/login' },
              { label: '注册', href: '/auth/register' },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                style={{
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.25)',
                  textDecoration: 'none',
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)';
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
