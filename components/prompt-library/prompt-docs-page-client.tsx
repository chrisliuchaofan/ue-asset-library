'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { PromptDocsClient } from './prompt-docs-view-client';

export function PromptDocsPageClient() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <main className="min-h-0 flex-1 overflow-y-auto bg-black text-white">
        <div className="flex min-h-screen items-center justify-center text-white/50">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </main>
    );
  }

  return <PromptDocsClient />;
}
