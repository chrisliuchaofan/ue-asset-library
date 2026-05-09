'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

export const PromptDocsClientOnly = dynamic(
  () => import('./prompt-docs-layout-client').then((mod) => mod.PromptDocsClient),
  {
    ssr: false,
    loading: () => (
      <main className="min-h-screen bg-black text-white">
        <div className="flex min-h-screen items-center justify-center text-white/50">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </main>
    ),
  },
);
