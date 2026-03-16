'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useLocale } from 'next-intl';
import { setLocale } from '@/actions/locale';
import { useTeam } from '@/lib/team/use-team';
import {
    PowerIcon,
    MoonIcon,
    SunIcon,
    MonitorIcon,
    GlobeIcon,
    ChevronDownIcon,
    CheckIcon,
    UsersIcon,
    PlusIcon,
    ChevronRightIcon,
} from 'lucide-react';

/* ── 样式常量 ── */

const S = {
    trigger: (expanded: boolean) => ({
        display: 'flex',
        alignItems: 'center',
        gap: expanded ? 10 : 0,
        padding: expanded ? '8px 10px' : 0,
        width: expanded ? '100%' : 36,
        height: expanded ? 'auto' : 36,
        borderRadius: expanded ? 8 : '50%',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        transition: 'background 0.15s ease',
        justifyContent: expanded ? 'flex-start' : 'center',
    }),
    avatar: {
        width: 28,
        height: 28,
        borderRadius: '50%',
        flexShrink: 0,
        background: 'rgba(249,115,22,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 11,
        fontWeight: 700 as const,
        color: '#a78bfa',
    },
    userInfo: {
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column' as const,
        gap: 1,
    },
    userName: {
        fontSize: 12,
        fontWeight: 500 as const,
        color: 'rgba(255,255,255,0.7)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap' as const,
    },
    dropdown: {
        position: 'fixed' as const,
        zIndex: 9999,
        minWidth: 220,
        background: '#1a1a1a',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        padding: '4px 0',
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: 500 as const,
        color: 'rgba(255,255,255,0.25)',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.08em',
        padding: '8px 12px 4px',
        margin: 0,
    },
    menuItem: (hovered: boolean) => ({
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 12px',
        border: 'none',
        borderRadius: 0,
        background: hovered ? 'rgba(255,255,255,0.06)' : 'transparent',
        color: hovered ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.55)',
        cursor: 'pointer',
        fontSize: 12,
        transition: 'all 0.12s ease',
        textAlign: 'left' as const,
    }),
    menuIcon: {
        width: 16,
        height: 16,
        flexShrink: 0,
    },
    divider: {
        height: 1,
        background: 'rgba(255,255,255,0.06)',
        margin: '4px 0',
    },
    teamItem: (active: boolean, hovered: boolean) => ({
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        border: 'none',
        borderRadius: 0,
        background: hovered ? 'rgba(255,255,255,0.06)' : 'transparent',
        color: active ? 'rgba(255,255,255,0.9)' : hovered ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.45)',
        cursor: 'pointer',
        fontSize: 12,
        transition: 'all 0.12s ease',
        textAlign: 'left' as const,
    }),
} as const;

interface UserAvatarDropdownProps {
    session: any;
    expanded: boolean; // sidebar expanded or collapsed
}

export function UserAvatarDropdown({ session, expanded }: UserAvatarDropdownProps) {
    const router = useRouter();
    const locale = useLocale();
    const [isPending, startTransition] = useTransition();
    const { currentTeam, teams, switchTeam } = useTeam();

    const [open, setOpen] = useState(false);
    const [hovered, setHovered] = useState<string | null>(null);
    const [triggerHovered, setTriggerHovered] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ top: 0, left: 0 });

    // Theme state
    const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('dark');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const stored = window.localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
        if (stored) setTheme(stored);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        const effective = theme === 'system'
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : theme;
        root.classList.add(effective);
        localStorage.setItem('theme', theme);
    }, [theme, mounted]);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (
                dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
                triggerRef.current && !triggerRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const toggleOpen = () => {
        if (!open && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            // Position dropdown above the trigger (bottom-up)
            setPos({
                left: expanded ? rect.left : rect.right + 8,
                top: rect.top, // will adjust after render
            });
        }
        setOpen(!open);
    };

    // Adjust dropdown position after render to be above trigger
    useEffect(() => {
        if (open && dropdownRef.current && triggerRef.current) {
            const triggerRect = triggerRef.current.getBoundingClientRect();
            const dropRect = dropdownRef.current.getBoundingClientRect();
            const newTop = triggerRect.top - dropRect.height - 8;
            setPos(prev => ({
                ...prev,
                top: newTop > 8 ? newTop : 8,
                left: expanded ? triggerRect.left + 4 : triggerRect.right + 8,
            }));
        }
    }, [open, expanded]);

    const cycleTheme = () => {
        const next = { light: 'dark' as const, dark: 'system' as const, system: 'light' as const };
        setTheme(next[theme]);
    };

    const themeIcon = theme === 'light' ? SunIcon : theme === 'dark' ? MoonIcon : MonitorIcon;
    const themeLabel = theme === 'light' ? '浅色模式' : theme === 'dark' ? '深色模式' : '跟随系统';

    const toggleLocale = () => {
        const newLocale = locale === 'zh' ? 'en' : 'zh';
        startTransition(async () => {
            try {
                await setLocale(newLocale);
                router.refresh();
            } catch (e) {
                console.error('[locale] switch failed:', e);
            }
        });
        setOpen(false);
    };

    const user = session?.user;
    const initial = (user?.name || user?.email || '?')[0].toUpperCase();

    return (
        <div style={{ position: 'relative' }}>
            {/* Trigger */}
            <button
                ref={triggerRef}
                onClick={toggleOpen}
                onMouseEnter={() => setTriggerHovered(true)}
                onMouseLeave={() => setTriggerHovered(false)}
                style={{
                    ...S.trigger(expanded),
                    background: triggerHovered ? 'rgba(255,255,255,0.05)' : 'transparent',
                }}
                title={user?.email || user?.name || ''}
            >
                <div style={S.avatar}>
                    <span style={S.avatarText}>{initial}</span>
                </div>
                {expanded && (
                    <div style={S.userInfo}>
                        <span style={S.userName}>
                            {user?.name || user?.email || '用户'}
                        </span>
                    </div>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div
                    ref={dropdownRef}
                    style={{ ...S.dropdown, top: pos.top, left: pos.left }}
                >
                    {/* User info header */}
                    <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={S.avatar}>
                            <span style={S.avatarText}>{initial}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {user?.name || '用户'}
                            </div>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {user?.email || ''}
                            </div>
                        </div>
                    </div>

                    <div style={S.divider} />

                    {/* Team section */}
                    {teams.length > 0 && (
                        <>
                            <p style={S.sectionLabel}>团队</p>
                            {teams.map((team) => {
                                const isActive = team.id === currentTeam?.id;
                                const isHover = hovered === `team-${team.id}`;
                                return (
                                    <button
                                        key={team.id}
                                        onClick={() => {
                                            if (!isActive) switchTeam(team.id);
                                            setOpen(false);
                                        }}
                                        onMouseEnter={() => setHovered(`team-${team.id}`)}
                                        onMouseLeave={() => setHovered(null)}
                                        style={S.teamItem(isActive, isHover)}
                                    >
                                        <UsersIcon style={{ width: 14, height: 14, flexShrink: 0 }} />
                                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {team.name}
                                        </span>
                                        {isActive && <CheckIcon style={{ width: 14, height: 14, color: '#22C55E' }} />}
                                    </button>
                                );
                            })}
                            <div style={S.divider} />
                        </>
                    )}

                    {/* Language */}
                    <button
                        onClick={toggleLocale}
                        onMouseEnter={() => setHovered('locale')}
                        onMouseLeave={() => setHovered(null)}
                        style={S.menuItem(hovered === 'locale')}
                    >
                        <GlobeIcon style={S.menuIcon} />
                        <span style={{ flex: 1 }}>{locale === 'zh' ? '切换到 English' : '切换到中文'}</span>
                    </button>

                    {/* Theme */}
                    <button
                        onClick={cycleTheme}
                        onMouseEnter={() => setHovered('theme')}
                        onMouseLeave={() => setHovered(null)}
                        style={S.menuItem(hovered === 'theme')}
                    >
                        {React.createElement(themeIcon, { style: S.menuIcon })}
                        <span style={{ flex: 1 }}>{themeLabel}</span>
                    </button>

                    <div style={S.divider} />

                    {/* Logout */}
                    <button
                        onClick={() => signOut({ callbackUrl: '/' })}
                        onMouseEnter={() => setHovered('logout')}
                        onMouseLeave={() => setHovered(null)}
                        style={{
                            ...S.menuItem(hovered === 'logout'),
                            color: hovered === 'logout' ? '#f87171' : 'rgba(255,255,255,0.45)',
                        }}
                    >
                        <PowerIcon style={S.menuIcon} />
                        <span>退出登录</span>
                    </button>
                </div>
            )}
        </div>
    );
}
