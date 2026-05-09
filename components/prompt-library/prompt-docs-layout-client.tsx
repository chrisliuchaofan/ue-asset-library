'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, ChevronDown, ChevronRight, FileText, Loader2, Search } from 'lucide-react';
import type { PromptDoc } from '@/lib/prompt-library/types';

function groupDocs(docs: PromptDoc[]) {
  return docs.reduce<Record<string, PromptDoc[]>>((groups, doc) => {
    const category = doc.category || '未分类';
    groups[category] = groups[category] || [];
    groups[category].push(doc);
    return groups;
  }, {});
}

function markdownBlocks(content: string) {
  return content
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function MarkdownView({ content }: { content: string }) {
  return (
    <div className="max-w-[760px] pb-24 text-[15px] font-light leading-8 tracking-[0.02em] text-zinc-300">
      {markdownBlocks(content).map((block, index) => {
        if (block.startsWith('### ')) {
          return (
            <h3 key={index} className="mt-10 text-lg font-normal tracking-[0.04em] text-white">
              {block.slice(4)}
            </h3>
          );
        }

        if (block.startsWith('## ')) {
          return (
            <h2 key={index} className="mt-12 text-2xl font-normal tracking-[0.04em] text-white">
              {block.slice(3)}
            </h2>
          );
        }

        if (block.startsWith('# ')) {
          return (
            <h1 key={index} className="mb-8 text-4xl font-light leading-tight tracking-[0.04em] text-white">
              {block.slice(2)}
            </h1>
          );
        }

        if (/^[-*]\s/m.test(block)) {
          return (
            <ul key={index} className="my-6 space-y-3 pl-4">
              {block.split('\n').map((line) => (
                <li key={line} className="list-disc pl-2 marker:text-zinc-600">
                  {line.replace(/^[-*]\s+/, '')}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={index} className="my-6 whitespace-pre-wrap">
            {block}
          </p>
        );
      })}
    </div>
  );
}

export function PromptDocsClient() {
  const [docs, setDocs] = useState<PromptDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;

    fetch('/api/prompt-library/docs')
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;

        const nextDocs: PromptDoc[] = data.docs || [];
        setDocs(nextDocs);
        setSelectedId((current) => current || nextDocs[0]?.id || null);
        setOpenGroups(Object.fromEntries(Object.keys(groupDocs(nextDocs)).map((category) => [category, true])));
      })
      .catch(() => {
        if (mounted) setDocs([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredDocs = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return docs;

    return docs.filter((doc) =>
      `${doc.title} ${doc.content} ${doc.category} ${doc.tags.join(' ')}`.toLowerCase().includes(keyword),
    );
  }, [docs, query]);

  const grouped = useMemo(() => groupDocs(filteredDocs), [filteredDocs]);
  const selected = docs.find((doc) => doc.id === selectedId) || filteredDocs[0] || null;

  function toggleGroup(category: string) {
    setOpenGroups((current) => ({ ...current, [category]: !current[category] }));
  }

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-black text-white">
      <header className="relative border-b border-white/10 px-8 py-7">
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-5">
          <div>
            <div className="flex items-center gap-3">
              <BookOpen className="h-7 w-7 text-white" />
              <h1 className="text-3xl font-bold tracking-normal text-white">AI知识库文档</h1>
            </div>
            <p className="mt-3 max-w-[390px] text-sm font-light leading-6 tracking-[0.04em] text-zinc-500">
              沉淀 Prompt 写法、镜头语言、光影风格、工具和创作经验。
            </p>
          </div>

          <div className="relative w-full" style={{ order: 3, flexBasis: '100%' }}>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索标题、摘要、正文..."
              className="h-11 w-full rounded-lg border border-white/[0.18] bg-white/[0.08] pl-10 pr-4 text-sm font-light tracking-[0.03em] text-white outline-none transition placeholder:text-white/35 focus:border-white/35"
            />
          </div>

          <nav className="absolute right-8 top-7 flex justify-end gap-3 text-sm text-white/70">
            <Link href="/prompt-library" className="rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white">
              案例库
            </Link>
            <Link href="/prompt-library/docs" className="rounded-full bg-white px-4 py-2 font-semibold text-black">
              文档库
            </Link>
          </nav>
        </div>
      </header>

      <section
        className="min-h-[calc(100vh-137px)] border-b border-white/10"
        style={{
          display: 'grid',
          gridTemplateColumns: 'clamp(190px, 24vw, 320px) minmax(0, 1fr)',
        }}
      >
        <aside className="min-w-0 border-r border-white/10 px-5 py-8 md:px-8">
          <div className="mb-7 text-xs font-light tracking-[0.24em] text-zinc-600">目录</div>
          {loading ? (
            <div className="flex items-center gap-3 text-sm font-light tracking-[0.12em] text-zinc-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              加载中
            </div>
          ) : (
            <nav className="space-y-6">
              {Object.entries(grouped).map(([category, items]) => {
                const open = openGroups[category] ?? true;
                return (
                  <section key={category}>
                    <button
                      type="button"
                      onClick={() => toggleGroup(category)}
                      className="flex w-full items-center gap-2 text-left text-sm font-light tracking-[0.05em] text-zinc-400 transition hover:text-white"
                    >
                      {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      <span className="truncate">{category}</span>
                    </button>
                    {open && (
                      <div className="mt-4 space-y-3 pl-4 md:pl-5">
                        {items.map((doc) => {
                          const active = selected?.id === doc.id;
                          return (
                            <button
                              key={doc.id}
                              type="button"
                              onClick={() => setSelectedId(doc.id)}
                              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-light leading-6 tracking-[0.02em] transition ${
                                active ? 'bg-white/10 text-white' : 'text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200'
                              }`}
                            >
                              <FileText className="h-3.5 w-3.5 shrink-0" />
                              <span className="min-w-0 truncate">{doc.title}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })}
              {filteredDocs.length === 0 && (
                <p className="text-sm font-light tracking-[0.08em] text-zinc-600">没有匹配的文档</p>
              )}
            </nav>
          )}
        </aside>

        <article className="min-w-0 px-6 py-10 md:px-12 xl:px-24">
          {selected ? (
            <>
              <div className="mb-10">
                <div className="mb-5 text-xs font-light tracking-[0.08em] text-zinc-600">
                  {selected.category} / 更新于 {selected.updatedAt.slice(0, 10)}
                </div>
                <h2 className="max-w-[820px] text-3xl font-bold leading-tight tracking-normal text-white">
                  {selected.title}
                </h2>
                {selected.tags.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-light tracking-[0.16em] text-zinc-600">
                    {selected.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              <MarkdownView content={selected.content} />
            </>
          ) : (
            <div className="flex min-h-[50vh] items-center text-sm font-light tracking-[0.12em] text-zinc-600">
              请选择一篇文档
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
