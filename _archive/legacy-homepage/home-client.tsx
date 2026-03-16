'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Settings } from 'lucide-react';

export function HomeClient() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <Link
            href="/admin"
            className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-colors duration-150 active:scale-95"
            aria-label="管理后台"
            title="管理后台"
        >
            <Settings className="h-4 w-4 text-white/30 hover:text-white/50 transition-colors duration-150" />
        </Link>
    );
}
