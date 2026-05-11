'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Filter, Grid2X2, ImageIcon, Loader2, Search, Video } from 'lucide-react';
import type { PromptCase, PromptCaseMediaType } from '@/lib/prompt-library/types';
import { HardNavLink } from './hard-nav-link';
import { PromptCaseCard } from './prompt-case-tile-client';
import { PromptCaseUploadDialog } from './prompt-case-upload-dialog';

type MediaFilter = 'all' | PromptCaseMediaType;

const typeOptions = ['全部', '剧情', '角色展示', '场景展示', '进阶展示', '第一人称'];
const styleOptions = ['全部', '3D', '三渲二', '动漫', 'Q版', '写实'];
const subjectOptions = ['全部', '末日', '修仙', '热梗'];
const toolOptions = ['全部', '即梦', '可灵', 'GPT', 'nano banana', '海螺'];

function matchesOption(item: PromptCase, option: string) {
  if (option === '全部') return true;
  const haystack = [item.title, item.description, item.prompt, item.negativePrompt, item.tool, item.category, ...item.tags]
    .filter(Boolean)
    .join(' ');
  return haystack.includes(option);
}

function filterPillClass(active: boolean) {
  return active
    ? 'border-cyan-300 bg-cyan-400/12 text-white'
    : 'border-white/12 bg-white/[0.055] text-white/72 hover:border-white/24 hover:bg-white/10 hover:text-white';
}

export function PromptGalleryClient() {
  const [cases, setCases] = useState<PromptCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all');
  const [query, setQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState('全部');
  const [styleFilter, setStyleFilter] = useState('全部');
  const [subjectFilter, setSubjectFilter] = useState('全部');
  const [toolFilter, setToolFilter] = useState('全部');
  const [galleryColumns, setGalleryColumns] = useState(5);

  const loadCases = useCallback(() => {
    let mounted = true;
    setLoading(true);
    fetch('/api/prompt-library/cases')
      .then((res) => res.json())
      .then((data) => {
        if (mounted) setCases(data.cases || []);
      })
      .catch(() => {
        if (mounted) setCases([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => loadCases(), [loadCases]);

  function handleCaseCreated(item: PromptCase) {
    setCases((current) => [item, ...current.filter((existing) => existing.id !== item.id)]);
  }

  useEffect(() => {
    function syncGalleryColumns() {
      const width = window.innerWidth;
      if (width >= 1536) setGalleryColumns(5);
      else if (width >= 1280) setGalleryColumns(4);
      else if (width >= 768) setGalleryColumns(3);
      else setGalleryColumns(2);
    }

    syncGalleryColumns();
    window.addEventListener('resize', syncGalleryColumns);
    return () => window.removeEventListener('resize', syncGalleryColumns);
  }, []);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return cases.filter((item) => {
      if (mediaFilter !== 'all' && item.mediaType !== mediaFilter) return false;
      if (!matchesOption(item, typeFilter)) return false;
      if (!matchesOption(item, styleFilter)) return false;
      if (!matchesOption(item, subjectFilter)) return false;
      if (!matchesOption(item, toolFilter)) return false;

      if (!keyword) return true;
      return [item.title, item.description, item.prompt, item.negativePrompt, item.tool, item.category, ...item.tags]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(keyword);
    });
  }, [cases, mediaFilter, query, styleFilter, subjectFilter, toolFilter, typeFilter]);

  function resetFilters() {
    setMediaFilter('all');
    setQuery('');
    setTypeFilter('全部');
    setStyleFilter('全部');
    setSubjectFilter('全部');
    setToolFilter('全部');
  }

  const mediaTabs = [
    { key: 'all' as const, label: '全部', icon: null },
    { key: 'image' as const, label: '图片', icon: ImageIcon },
    { key: 'video' as const, label: '视频', icon: Video },
  ];
  return (
    <main className="min-h-full flex-1 overflow-y-auto bg-black text-white">
      <div className="mx-auto w-full max-w-[1920px] px-6 py-5">
        <header className="sticky top-0 z-30 -mx-6 border-b border-white/10 bg-black/75 px-6 pb-4 pt-4 backdrop-blur-xl">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-3xl font-bold tracking-normal text-white">AI知识库</h1>
            <nav className="flex flex-wrap items-center justify-end gap-3 text-sm text-white/70">
              <HardNavLink href="/prompt-library" className="rounded-full bg-white px-4 py-2 font-semibold text-black">
                案例库
              </HardNavLink>
              <HardNavLink href="/prompt-library/docs" className="rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white">
                文档库
              </HardNavLink>
              <PromptCaseUploadDialog onCreated={handleCaseCreated} />
            </nav>
          </div>

          <div className="grid items-center gap-4 xl:grid-cols-[auto_minmax(320px,560px)_auto]">
            <div className="flex w-fit shrink-0 items-center gap-1 rounded-lg bg-white/[0.08] p-1">
              {mediaTabs.map((tab) => {
                const Icon = tab.icon;
                const active = mediaFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setMediaFilter(tab.key)}
                    className={`flex h-9 items-center gap-1.5 rounded-md px-3 text-sm transition ${
                      active ? 'bg-white text-black' : 'text-white/55 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {Icon && <Icon className="h-3.5 w-3.5" />}
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="relative w-full xl:mx-auto">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索标题、描述、提示词..."
                className="h-11 w-full rounded-lg border border-white/[0.18] bg-white/[0.08] pl-10 pr-20 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/35"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 whitespace-nowrap text-sm font-semibold text-white">
                搜索
              </span>
            </div>

            <div className="flex w-full shrink-0 items-center justify-end gap-3 xl:w-auto xl:justify-self-end">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setFilterOpen((open) => !open)}
                  className={`flex h-11 items-center gap-2 rounded-lg px-4 text-sm transition ${
                    filterOpen ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/15'
                  }`}
                >
                  <Filter className="h-4 w-4" />
                  筛选
                </button>
                {filterOpen && (
                  <div className="absolute right-0 top-12 z-[100] w-[min(1180px,calc(100vw-160px))] min-w-[720px] rounded-lg border border-slate-700 bg-[#070b16] px-5 py-5 text-sm shadow-2xl shadow-black/70 max-lg:min-w-0 max-lg:w-[calc(100vw-48px)]">
                    <FilterRow label="类型" options={typeOptions} value={typeFilter} onChange={setTypeFilter} />
                    <FilterRow label="风格" options={styleOptions} value={styleFilter} onChange={setStyleFilter} />
                    <FilterRow label="题材" options={subjectOptions} value={subjectFilter} onChange={setSubjectFilter} />
                    <FilterRow label="工具" options={toolOptions} value={toolFilter} onChange={setToolFilter} />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={resetFilters}
                className="flex h-11 items-center gap-2 rounded-lg bg-white/[0.08] px-4 text-sm font-semibold text-white ring-1 ring-white/10 transition hover:bg-white/15"
              >
                <Grid2X2 className="h-4 w-4" />
                默认
              </button>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-28 text-white/50">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex min-h-[50vh] items-center justify-center text-sm text-white/45">
            暂无匹配案例
          </div>
        ) : (
          <section className="prompt-library-gallery mt-4" style={{ columnCount: galleryColumns, columnGap: '1rem' }}>
            {filtered.map((item) => (
              <PromptCaseCard key={item.id} item={item} />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

function FilterRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mb-5 last:mb-0">
      <div className="mb-3 font-semibold text-white">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = option === value;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={`h-9 rounded-full border px-4 transition ${filterPillClass(active)}`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
