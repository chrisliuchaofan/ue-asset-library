'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
    FolderIcon,
    LayersIcon,
    SearchIcon,
    VideoIcon,
    SettingsIcon,
    ClapperboardIcon,
    CheckCircle2Icon,
    BarChartIcon,
    LightbulbIcon,
    LayoutTemplateIcon,
    BookOpenIcon,
    UserIcon,
    MenuIcon,
    PanelLeftCloseIcon,
    PanelLeftOpenIcon,
} from 'lucide-react';
import { TeamProvider } from '@/lib/team/use-team';
import { CommandPalette } from '@/components/command-palette';
import { OnboardingProvider } from '@/components/onboarding/OnboardingProvider';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useTranslations } from 'next-intl';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { PostHogProvider } from '@/components/analytics/posthog-provider';
import { UserAvatarDropdown } from '@/components/user-avatar-dropdown';
import { TeamSelector } from '@/components/team-selector';
import T from '@/lib/theme';

/* ── 布局常量 ── */
const COLLAPSED_W = T.layout.sidebarCollapsed;
const EXPANDED_W = T.layout.sidebarExpanded;

/* 折叠态路由 — Studio / Review 创作型页面 */
const COLLAPSED_ROUTES = ['/studio', '/review'];

/* ── 导航分组 ── */
interface NavItem {
    href: string;
    label: string;
    short: string;
    icon: React.ComponentType<{ style?: React.CSSProperties }>;
}

interface NavGroup {
    key: string;
    label: string;
    items: NavItem[];
}

/* ── 样式常量 ── */

const NAV = {
    sidebar: (expanded: boolean) => ({
        width: expanded ? EXPANDED_W : COLLAPSED_W,
        background: 'hsl(var(--card))',
        borderRight: '1px solid hsl(var(--border))',
        display: 'flex',
        flexDirection: 'column' as const,
        flexShrink: 0,
        transition: T.transition.sidebarWidth,
        overflow: 'hidden' as const,
    }),
    logoWrap: (expanded: boolean) => ({
        height: 56,
        display: 'flex',
        alignItems: 'center',
        padding: expanded ? '0 12px' : '0',
        justifyContent: expanded ? 'flex-start' : 'center',
        flexShrink: 0,
        gap: 10,
        cursor: 'pointer',
        transition: 'padding 0.2s ease',
    }),
    logoBadge: {
        width: 32,
        height: 32,
        borderRadius: T.radius.lg,
        background: 'linear-gradient(135deg, #7C3AED, #F97316)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    logoText: {
        fontSize: T.fontSize.md,
        fontWeight: T.fontWeight.bold,
        color: 'hsl(var(--foreground))',
        letterSpacing: '-0.01em',
        whiteSpace: 'nowrap' as const,
        overflow: 'hidden' as const,
    },
    navScroll: {
        flex: 1,
        overflowY: 'auto' as const,
        overflowX: 'hidden' as const,
        padding: '4px 0',
        display: 'flex',
        flexDirection: 'column' as const,
    },
    groupLabel: {
        fontSize: T.fontSize['2xs'],
        fontWeight: T.fontWeight.medium,
        color: 'hsl(var(--muted-foreground))',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.08em',
        padding: '12px 16px 4px',
        whiteSpace: 'nowrap' as const,
        overflow: 'hidden' as const,
    },
    /* Collapsed: icon-only centered item */
    navItemCollapsed: (active: boolean) => ({
        width: 40,
        height: 40,
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        borderRadius: 10,
        cursor: 'pointer',
        transition: T.transition.fast,
        textDecoration: 'none' as const,
        background: active ? 'hsl(var(--muted))' : 'transparent',
        color: active ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
        margin: '1px auto',
    }),
    navIconSmall: { width: 18, height: 18 },
    navLabelSmall: {
        fontSize: 9,
        fontWeight: 500 as const,
        lineHeight: 1,
        letterSpacing: '0.01em',
    },
    /* Expanded: icon + text row item */
    navItemExpanded: (active: boolean) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '7px 12px',
        margin: '1px 8px',
        borderRadius: T.radius.lg,
        cursor: 'pointer',
        transition: T.transition.fast,
        textDecoration: 'none' as const,
        background: active ? 'hsl(var(--muted))' : 'transparent',
        color: active ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
        fontWeight: active ? T.fontWeight.semibold : T.fontWeight.normal,
        fontSize: T.fontSize.base,
        whiteSpace: 'nowrap' as const,
        overflow: 'hidden' as const,
    }),
    navIconExpanded: { width: 18, height: 18, flexShrink: 0 },
    bottomSection: (expanded: boolean) => ({
        padding: expanded ? '8px' : '8px 0',
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: expanded ? 'stretch' : 'center',
        gap: 4,
        flexShrink: 0,
        borderTop: '1px solid hsl(var(--border))',
    }),
    toggleBtn: {
        width: 28,
        height: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        borderRadius: T.radius.md,
        background: 'transparent',
        color: 'hsl(var(--muted-foreground))',
        cursor: 'pointer',
        transition: T.transition.fast,
        flexShrink: 0,
    },
    mobileBar: {
        display: 'flex',
        alignItems: 'center',
        height: T.layout.headerHeight,
        padding: '0 12px',
        borderBottom: '1px solid hsl(var(--border))',
        background: 'hsl(var(--card))',
        flexShrink: 0,
    },
    mobileMenuBtn: {
        width: 32,
        height: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: T.radius.md,
        border: 'none',
        background: 'transparent',
        color: 'hsl(var(--muted-foreground))',
        cursor: 'pointer',
    },
} as const;

/* ── Dashboard 主布局 ── */

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const t = useTranslations('nav');
    const tc = useTranslations('common');
    const [mobileOpen, setMobileOpen] = useState(false);
    const [hoveredNav, setHoveredNav] = useState<string | null>(null);
    const [toggleHovered, setToggleHovered] = useState(false);

    /* ── 响应式 ── */
    const [isDesktop, setIsDesktop] = useState(true);
    useEffect(() => {
        const mq = window.matchMedia('(min-width: 768px)');
        setIsDesktop(mq.matches);
        const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    /* ── 侧栏展开/折叠 ── */
    const isCollapsedRoute = COLLAPSED_ROUTES.some(r => pathname.startsWith(r));
    const [manualOverride, setManualOverride] = useState<boolean | null>(null);

    const sidebarExpanded = manualOverride !== null ? manualOverride : !isCollapsedRoute;

    // Reset manual override when route changes between collapsed/expanded groups
    useEffect(() => {
        setManualOverride(null);
    }, [isCollapsedRoute]);

    const toggleSidebar = () => {
        setManualOverride(prev => prev !== null ? !prev : isCollapsedRoute);
    };

    /* ── 导航项 ── */
    const navGroups: NavGroup[] = [
        {
            key: 'creative',
            label: '创意',
            items: [
                { href: '/inspirations', label: t('inspirations'), short: '灵感', icon: LightbulbIcon },
                { href: '/templates', label: t('templates'), short: '模版', icon: LayoutTemplateIcon },
            ],
        },
        {
            key: 'workspace',
            label: '工作区',
            items: [
                { href: '/workspace', label: t('workspace'), short: '创作', icon: UserIcon },
            ],
        },
        {
            key: 'production',
            label: '制作',
            items: [
                { href: '/studio', label: t('studio'), short: '创作', icon: VideoIcon },
                { href: '/review', label: t('review'), short: '审核', icon: CheckCircle2Icon },
            ],
        },
        {
            key: 'manage',
            label: '管理',
            items: [
                { href: '/materials', label: t('materials'), short: '素材', icon: FolderIcon },
                { href: '/assets', label: t('assets'), short: '资产', icon: LayersIcon },
                { href: '/analysis', label: t('analysis'), short: '分析', icon: SearchIcon },
                { href: '/knowledge', label: t('knowledge'), short: '知识', icon: BookOpenIcon },
                { href: '/weekly-reports', label: t('insights'), short: '洞察', icon: BarChartIcon },
            ],
        },
        {
            key: 'system',
            label: '系统',
            items: [
                { href: '/settings', label: t('settings'), short: '设置', icon: SettingsIcon },
            ],
        },
    ];

    const allNavItems = navGroups.flatMap(g => g.items);

    const handleNavClick = useCallback(() => {
        setMobileOpen(false);
    }, []);

    /* ── 桌面端侧边栏 ── */
    const DesktopSidebar = (
        <>
            {/* Logo area — click to toggle */}
            <div
                style={NAV.logoWrap(sidebarExpanded)}
                onClick={toggleSidebar}
                title={sidebarExpanded ? '折叠侧栏' : '展开侧栏'}
            >
                <div style={NAV.logoBadge}>
                    <ClapperboardIcon style={{ width: 16, height: 16, color: '#fff' }} />
                </div>
                {sidebarExpanded && (
                    <span style={NAV.logoText}>{tc('appName')}</span>
                )}
            </div>

            {/* Navigation */}
            <div style={NAV.navScroll} className="scrollbar-hide">
                {sidebarExpanded ? (
                    /* ── 展开态：分组 + 图标 + 文字 ── */
                    navGroups.map((group) => (
                        <div key={group.key}>
                            <p style={NAV.groupLabel}>{group.label}</p>
                            {group.items.map((item) => {
                                const isActive = pathname.startsWith(item.href);
                                const isHovered = hoveredNav === item.href;
                                return (
                                    <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                                        <div
                                            style={{
                                                ...NAV.navItemExpanded(isActive),
                                                ...(isHovered && !isActive ? {
                                                    background: 'hsl(var(--muted))',
                                                    color: 'hsl(var(--foreground))',
                                                } : {}),
                                            }}
                                            onMouseEnter={() => setHoveredNav(item.href)}
                                            onMouseLeave={() => setHoveredNav(null)}
                                        >
                                            <item.icon style={NAV.navIconExpanded} />
                                            <span>{item.label}</span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    ))
                ) : (
                    /* ── 折叠态：纯图标 ── */
                    allNavItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        const isHovered = hoveredNav === item.href;
                        return (
                            <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                                <div
                                    style={{
                                        ...NAV.navItemCollapsed(isActive),
                                        ...(isHovered && !isActive ? {
                                            background: 'hsl(var(--muted))',
                                            color: 'hsl(var(--foreground))',
                                        } : {}),
                                    }}
                                    onMouseEnter={() => setHoveredNav(item.href)}
                                    onMouseLeave={() => setHoveredNav(null)}
                                    title={item.label}
                                >
                                    <item.icon style={NAV.navIconSmall} />
                                    <span style={NAV.navLabelSmall}>{item.short}</span>
                                </div>
                            </Link>
                        );
                    })
                )}
            </div>

            {/* Bottom: toggle + avatar */}
            <div style={NAV.bottomSection(sidebarExpanded)}>
                {/* Toggle button — only in expanded mode, sits on its own row */}
                {sidebarExpanded && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 4px 4px' }}>
                        <button
                            onClick={toggleSidebar}
                            onMouseEnter={() => setToggleHovered(true)}
                            onMouseLeave={() => setToggleHovered(false)}
                            style={{
                                ...NAV.toggleBtn,
                                color: toggleHovered ? 'hsl(var(--foreground) / 0.6)' : 'hsl(var(--muted-foreground) / 0.5)',
                            }}
                            title="折叠侧栏"
                        >
                            <PanelLeftCloseIcon style={{ width: 16, height: 16 }} />
                        </button>
                    </div>
                )}
                <UserAvatarDropdown session={session} expanded={sidebarExpanded} />
            </div>
        </>
    );

    /* ── 移动端侧边栏（始终展开态样式） ── */
    const MobileSidebar = (
        <>
            {/* Logo */}
            <div style={{ height: 56, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid hsl(var(--border))' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ ...NAV.logoBadge }}>
                        <ClapperboardIcon style={{ width: 16, height: 16, color: 'hsl(var(--foreground))' }} />
                    </div>
                    <span style={{ fontSize: 15, fontWeight: T.fontWeight.bold, color: 'hsl(var(--foreground))', letterSpacing: '-0.01em' }}>{tc('appName')}</span>
                </div>
            </div>

            {/* Team selector */}
            <div style={{ padding: '8px', borderBottom: '1px solid hsl(var(--border))' }}>
                <TeamSelector />
            </div>

            {/* Grouped navigation */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0', display: 'flex', flexDirection: 'column' }}>
                {navGroups.map((group) => (
                    <nav key={group.key} style={{ padding: '0 8px' }}>
                        <p style={{ ...NAV.groupLabel, padding: '12px 12px 4px' }}>{group.label}</p>
                        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                            {group.items.map((item) => {
                                const isActive = pathname.startsWith(item.href);
                                return (
                                    <li key={item.href}>
                                        <Link href={item.href} onClick={handleNavClick} style={{ textDecoration: 'none' }}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 10,
                                                padding: '8px 12px',
                                                borderRadius: T.radius.lg,
                                                fontSize: T.fontSize.base,
                                                cursor: 'pointer',
                                                transition: T.transition.fast,
                                                background: isActive ? 'hsl(var(--muted))' : 'transparent',
                                                color: isActive ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                                                fontWeight: isActive ? T.fontWeight.semibold : T.fontWeight.normal,
                                            }}>
                                                <item.icon style={{ width: 18, height: 18, flexShrink: 0, opacity: isActive ? 1 : 0.5 }} />
                                                <span>{item.label}</span>
                                            </div>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>
                ))}
            </div>

            {/* Bottom: user avatar dropdown */}
            <div style={{ borderTop: '1px solid hsl(var(--border))', padding: '8px' }}>
                <UserAvatarDropdown session={session} expanded={true} />
            </div>
        </>
    );

    return (
        <TeamProvider>
        <OnboardingProvider>
        <PostHogProvider>
        <div style={{ display: 'flex', height: '100vh', background: 'hsl(var(--background))', color: 'hsl(var(--foreground))', fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)', overflow: 'hidden' }}>
            {/* Desktop Sidebar */}
            {isDesktop && (
                <aside style={NAV.sidebar(sidebarExpanded)}>
                    {DesktopSidebar}
                </aside>
            )}

            {/* Mobile Sidebar Sheet */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetContent side="left" className="w-[260px] p-0 flex flex-col" style={{ background: 'hsl(var(--card))', borderRight: '1px solid hsl(var(--border))' }}>
                    <VisuallyHidden.Root>
                        <SheetTitle>{tc('appName')}</SheetTitle>
                    </VisuallyHidden.Root>
                    {MobileSidebar}
                </SheetContent>
            </Sheet>

            {/* Main Content Area */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'hsl(var(--background))', overflow: 'hidden', position: 'relative' }}>
                {/* Mobile Header Bar */}
                {!isDesktop && (
                    <div style={NAV.mobileBar}>
                        <button
                            onClick={() => setMobileOpen(true)}
                            style={NAV.mobileMenuBtn}
                            aria-label="打开菜单"
                        >
                            <MenuIcon style={{ width: 20, height: 20 }} />
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
                            <div style={{ width: 20, height: 20, borderRadius: 4, background: 'linear-gradient(135deg, #7C3AED, #F97316)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ClapperboardIcon style={{ width: 12, height: 12, color: '#fff' }} />
                            </div>
                            <span style={{ fontSize: 14, fontWeight: 600, color: 'hsl(var(--foreground))' }}>{tc('appName')}</span>
                        </div>
                    </div>
                )}

                {children}
            </main>

            {/* Cmd+K 命令面板 */}
            <CommandPalette />
        </div>
        </PostHogProvider>
        </OnboardingProvider>
        </TeamProvider>
    );
}
