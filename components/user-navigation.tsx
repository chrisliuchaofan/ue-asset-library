'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, CreditCard, Gift, Settings, Shield } from 'lucide-react';
import { isAdmin } from '@/lib/auth/is-admin';
import { cn } from '@/lib/utils';

interface UserNavigationProps {
  className?: string;
}

export function UserNavigation({ className }: UserNavigationProps) {
  const { data: session } = useSession();
  const pathname = usePathname();

  if (!session?.user?.email) {
    return null;
  }

  const userIsAdmin = isAdmin(session.user.email);

  // 普通用户导航
  const userNavItems: Array<{ href: string; label: string; icon: any; hash?: string }> = [
    { href: '/dream-factory', label: '梦工厂', icon: Sparkles },
    { href: '/settings', label: '我的积分', icon: CreditCard },
    { href: '/settings', label: '兑换码兑换', icon: Gift, hash: '#redeem' },
  ];

  // 管理员导航
  const adminNavItems: Array<{ href: string; label: string; icon: any; hash?: string }> = [
    { href: '/admin', label: '资产管理', icon: Settings },
    { href: '/admin/users', label: '用户管理', icon: Shield },
    { href: '/admin/redeem-codes', label: '兑换码管理', icon: Gift },
    { href: '/admin/credits', label: '积分管理', icon: CreditCard },
  ];

  const navItems = userIsAdmin ? adminNavItems : userNavItems;

  return (
    <nav className={cn('flex items-center gap-2', className)}>
      {navItems.map((item) => {
        const Icon = item.icon;
        // 简化 active 判断，只检查 pathname
        const isActive = pathname === item.href;
        
        return (
          <Link
            key={item.href + (item.hash || '')}
            href={item.href + (item.hash || '')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            )}
          >
            <Icon className="w-4 h-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

