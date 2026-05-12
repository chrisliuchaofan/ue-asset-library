'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Film, ImageIcon, Loader2, X } from 'lucide-react';
import type { PromptCase } from '@/lib/prompt-library/types';
import { CopyPromptButton } from './copy-prompt-button';
import { HardNavLink } from './hard-nav-link';
import { PromptLibraryBackLink } from './prompt-library-back-link';
import { UseInStudioButton } from './use-in-studio-button';

const tagStyles = [
  'border-cyan-400 text-cyan-200 bg-cyan-400/10',
  'border-violet-400 text-violet-200 bg-violet-400/10',
  'border-blue-400 text-blue-200 bg-blue-400/10',
  'border-emerald-400 text-emerald-200 bg-emerald-400/10',
];

function collectTags(item: PromptCase) {
  return item.tags
    .filter((tag): tag is string => Boolean(tag))
    .filter((tag, index, tags) => tags.indexOf(tag) === index);
}

function EmptyMedia({ mediaType }: { mediaType: PromptCase['mediaType'] }) {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-md bg-black/30 text-white/60">
      {mediaType === 'video' ? <Film className="h-12 w-12" /> : <ImageIcon className="h-12 w-12" />}
    </div>
  );
}

export function PromptCaseDetailView({ id, initialItem }: { id: string; initialItem?: PromptCase }) {
  const [item, setItem] = useState<PromptCase | null>(initialItem ?? null);
  const [loading, setLoading] = useState(!initialItem);

  useEffect(() => {
    if (initialItem?.id === id) {
      setItem(initialItem);
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);
    fetch(`/api/prompt-library/cases/${id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (mounted) setItem(data.case || null);
      })
      .catch(() => {
        if (mounted) setItem(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [id, initialItem]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black text-white">
        <Loader2 className="h-7 w-7 animate-spin text-cyan-300" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-sm font-medium">未找到案例</p>
          <HardNavLink href="/prompt-library" className="mt-3 inline-flex items-center gap-2 text-sm text-cyan-300">
            <ArrowLeft className="h-4 w-4" />
            返回 AI 提示库
          </HardNavLink>
        </div>
      </div>
    );
  }

  const mediaSrc = `/api/prompt-library/media/${encodeURIComponent(item.id)}`;
  const tags = collectTags(item);

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-black/70 text-white">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />

      <main className="relative z-10 flex h-screen items-center justify-center p-6">
        <article
          className="overflow-hidden rounded-2xl border border-white/10 bg-[#080808] shadow-2xl shadow-black/80"
          style={{
            display: 'grid',
            gridTemplateColumns: '60% 40%',
            width: 'min(1022px, calc(100vw - 48px))',
            minWidth: 0,
            height: 'calc((100vh - 48px) * 0.72)',
          }}
        >
          <section className="min-h-0 min-w-0 bg-[#292929] p-8">
            <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-md bg-black/20">
              {item.mediaUrl ? (
                item.mediaType === 'video' ? (
                  <video
                    src={mediaSrc}
                    poster={item.coverUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className="h-full w-full rounded-md object-contain"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.coverUrl || item.mediaUrl} alt={item.title} className="h-full w-full rounded-md object-contain" />
                )
              ) : (
                <EmptyMedia mediaType={item.mediaType} />
              )}
            </div>
          </section>

          <aside className="flex min-h-0 min-w-0 flex-col bg-[#080808]">
            <header className="shrink-0 border-b border-white/10 px-6 py-5">
              <div className="mb-5 flex items-center justify-between text-sm text-zinc-400">
                <PromptLibraryBackLink className="inline-flex items-center gap-2 hover:text-white">
                  <ArrowLeft className="h-4 w-4" />
                  返回画廊
                </PromptLibraryBackLink>
                <PromptLibraryBackLink aria-label="关闭详情" className="rounded-full p-1 text-zinc-400 hover:bg-white/10 hover:text-white">
                  <X className="h-5 w-5" />
                </PromptLibraryBackLink>
              </div>
              <div className="text-sm text-indigo-300">{[item.tool, item.category].filter(Boolean).join(' / ')}</div>
              <h1 className="mt-2 text-2xl font-semibold leading-tight text-white">{item.title}</h1>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <h2 className="text-sm font-medium text-zinc-300">提示词</h2>
              <div className="mt-3 rounded-xl bg-white/[0.055] p-4 text-sm font-medium leading-7 text-zinc-200">
                <p className="whitespace-pre-wrap">{item.prompt}</p>
              </div>

              <h2 className="mt-6 text-sm font-medium text-zinc-300">标签</h2>
              <div className="mt-4 flex flex-wrap gap-2 pb-6">
                {tags.map((tag, index) => (
                  <span key={tag} className={`rounded-full border px-3 py-1 text-xs font-medium ${tagStyles[index % tagStyles.length]}`}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <footer className="grid shrink-0 grid-cols-2 gap-3 border-t border-white/10 bg-[#0a0a0a] px-6 py-4">
              <CopyPromptButton
                prompt={item.prompt}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/40 bg-transparent px-4 text-sm font-medium text-white hover:border-white hover:bg-white/10"
              />
              <UseInStudioButton
                prompt={item.prompt}
                caseId={item.id}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cyan-400 px-4 text-sm font-semibold text-black hover:bg-cyan-300"
              />
            </footer>
          </aside>
        </article>
      </main>
    </div>
  );
}
