'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Film, ImageIcon, Loader2, X } from 'lucide-react';
import type { PromptCase } from '@/lib/prompt-library/types';
import { CopyPromptButton } from './copy-prompt-button';
import { HardNavLink } from './hard-nav-link';
import { UseInStudioButton } from './use-in-studio-button';

const tagStyles = [
  'border-cyan-400 text-cyan-200 bg-cyan-400/10',
  'border-violet-400 text-violet-200 bg-violet-400/10',
  'border-blue-400 text-blue-200 bg-blue-400/10',
  'border-emerald-400 text-emerald-200 bg-emerald-400/10',
  'border-amber-400 text-amber-100 bg-amber-400/10',
];

function uniqueTags(item: PromptCase) {
  return [item.tool, item.category, item.mediaType === 'image' ? '图片案例' : '视频案例', ...item.tags]
    .filter((tag): tag is string => Boolean(tag))
    .filter((tag, index, tags) => tags.indexOf(tag) === index);
}

function MediaFallback({ mediaType }: { mediaType: PromptCase['mediaType'] }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-slate-950">
      {mediaType === 'image' ? (
        <ImageIcon className="h-14 w-14 text-white/65" />
      ) : (
        <Film className="h-14 w-14 text-white/65" />
      )}
    </div>
  );
}

export function PromptCaseDetailClient({ id }: { id: string }) {
  const [item, setItem] = useState<PromptCase | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
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
  }, [id]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black text-white">
        <Loader2 className="h-7 w-7 animate-spin text-cyan-300" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-sm font-medium">未找到案例</p>
          <HardNavLink href="/prompt-library" className="mt-3 inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-200">
            <ArrowLeft className="h-4 w-4" />
            返回 AI 提示库
          </HardNavLink>
        </div>
      </div>
    );
  }

  const mediaSrc = `/api/prompt-library/media/${encodeURIComponent(item.id)}`;
  const tags = uniqueTags(item);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 text-white">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      {item.mediaUrl && (
        <>
          <div className="pointer-events-none absolute left-10 top-2 hidden h-4/5 w-72 overflow-hidden rounded-sm opacity-20 blur-[1px] lg:block">
            {item.mediaType === 'video' ? (
              <video src={mediaSrc} aria-hidden="true" muted loop autoPlay playsInline className="h-full w-full object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.coverUrl || item.mediaUrl} alt="" aria-hidden="true" className="h-full w-full object-cover" />
            )}
            <div className="absolute inset-0 bg-black/55" />
          </div>
          <div className="pointer-events-none absolute right-10 top-24 hidden h-3/5 w-72 overflow-hidden rounded-sm opacity-20 blur-[1px] lg:block">
            {item.mediaType === 'video' ? (
              <video src={mediaSrc} aria-hidden="true" muted loop autoPlay playsInline className="h-full w-full object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.coverUrl || item.mediaUrl} alt="" aria-hidden="true" className="h-full w-full object-cover" />
            )}
            <div className="absolute inset-0 bg-black/60" />
          </div>
        </>
      )}

      <main className="relative z-10 flex h-screen items-center justify-center p-4 lg:p-6">
        <article
          className="w-full overflow-hidden rounded-2xl border border-white/10 bg-[#080808] shadow-2xl shadow-black/80"
          style={{
            display: 'grid',
            gridTemplateColumns: '58% 42%',
            height: 'calc((100vh - 48px) * 0.8)',
            maxWidth: '1152px',
          }}
        >
          <section className="flex min-h-0 min-w-0 items-center justify-center bg-[#282828] p-5 lg:p-8">
            <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-md bg-black/20">
              {item.mediaUrl ? (
                item.mediaType === 'video' ? (
                  <video
                    src={mediaSrc}
                    poster={item.coverUrl}
                    controls
                    muted
                    autoPlay
                    loop
                    playsInline
                    preload="metadata"
                    className="block h-full w-full rounded-md object-contain"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.coverUrl || item.mediaUrl}
                    alt={item.title}
                    className="block h-full w-full rounded-md object-contain"
                  />
                )
              ) : (
                <MediaFallback mediaType={item.mediaType} />
              )}
            </div>
          </section>

          <aside className="flex min-h-0 min-w-0 flex-col bg-[#080808]">
            <header className="shrink-0 border-b border-white/10 px-5 py-5 lg:px-6">
              <div className="mb-5 flex items-center justify-between gap-4 text-sm text-zinc-400">
                <HardNavLink href="/prompt-library" className="inline-flex items-center gap-2 transition hover:text-white">
                  <ArrowLeft className="h-4 w-4" />
                  返回画廊
                </HardNavLink>
                <HardNavLink href="/prompt-library" aria-label="关闭详情" className="rounded-full p-1 text-zinc-400 transition hover:bg-white/10 hover:text-white">
                  <X className="h-5 w-5" />
                </HardNavLink>
              </div>
              <div className="text-sm text-indigo-300">
                {[item.tool, item.category].filter(Boolean).join(' / ') || 'AI 视频案例'}
              </div>
              <h1 className="mt-2 text-2xl font-semibold leading-tight tracking-normal text-white">{item.title}</h1>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 lg:px-6">
              <section>
                <h2 className="text-sm font-medium text-zinc-300">提示词</h2>
                <div className="mt-3 rounded-xl bg-white/[0.055] p-4 text-sm font-medium leading-7 text-zinc-200 shadow-inner shadow-black/30">
                  <p className="whitespace-pre-wrap">{item.prompt}</p>
                </div>
              </section>

              {item.negativePrompt && (
                <section className="mt-6">
                  <h2 className="text-sm font-medium text-zinc-300">负面提示词</h2>
                  <div className="mt-3 rounded-xl bg-white/[0.045] p-4 text-sm leading-7 text-zinc-300">
                    <p className="whitespace-pre-wrap">{item.negativePrompt}</p>
                  </div>
                </section>
              )}

              <section className="mt-6 pb-6">
                <h2 className="text-sm font-medium text-zinc-300">标签</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <span
                      key={tag}
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${tagStyles[index % tagStyles.length]}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </section>
            </div>

            <footer className="grid shrink-0 gap-3 border-t border-white/10 bg-[#0a0a0a] px-5 py-4 sm:grid-cols-2 lg:px-6">
              <CopyPromptButton
                prompt={item.prompt}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/40 bg-transparent px-4 text-sm font-medium text-white transition hover:border-white hover:bg-white/10"
              />
              <UseInStudioButton
                prompt={item.prompt}
                caseId={item.id}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cyan-400 px-4 text-sm font-semibold text-black transition hover:bg-cyan-300"
              />
            </footer>
          </aside>
        </article>
      </main>
    </div>
  );
}
