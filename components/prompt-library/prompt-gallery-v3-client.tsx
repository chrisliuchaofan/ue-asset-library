'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

export const PromptGalleryV3Client = dynamic(
  () => import('./prompt-gallery-client').then((mod) => mod.PromptGalleryClient),
  {
    ssr: false,
    loading: () => (
      <main className="min-h-full flex-1 bg-black text-white">
        <div className="flex min-h-screen items-center justify-center text-white/50">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </main>
    ),
  },
);
