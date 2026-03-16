'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  FolderIcon,
  SearchIcon,
  VideoIcon,
  CheckCircle2Icon,
  BarChartIcon,
  LayersIcon,
  LightbulbIcon,
  SettingsIcon,
  ArrowRightIcon,
} from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  href: string;
  keywords: string[];
}

const allCommands: CommandItem[] = [
  {
    id: 'materials',
    label: '素材库',
    description: '浏览和管理广告素材',
    icon: FolderIcon,
    href: '/materials',
    keywords: ['素材', '材料', 'materials', 'library'],
  },
  {
    id: 'analysis',
    label: '爆款分析',
    description: '拆解竞品爆款结构',
    icon: SearchIcon,
    href: '/analysis',
    keywords: ['分析', '爆款', '拆解', 'analysis', 'trending'],
  },
  {
    id: 'studio',
    label: 'AI 创作',
    description: 'AI 生成脚本和文案',
    icon: VideoIcon,
    href: '/studio',
    keywords: ['创作', '生成', '脚本', 'AI', 'studio', 'create'],
  },
  {
    id: 'review',
    label: '智能审核',
    description: 'AI 审核素材质量',
    icon: CheckCircle2Icon,
    href: '/review',
    keywords: ['审核', '检查', '质量', 'review', 'check'],
  },
  {
    id: 'inspirations',
    label: '灵感收集',
    description: '记录和管理创意灵感',
    icon: LightbulbIcon,
    href: '/inspirations',
    keywords: ['灵感', '创意', '想法', 'inspiration', 'idea'],
  },
  {
    id: 'weekly-reports',
    label: '数据洞察',
    description: '周报数据分析',
    icon: BarChartIcon,
    href: '/weekly-reports',
    keywords: ['数据', '周报', '洞察', '消耗', 'data', 'report', 'insight'],
  },
  {
    id: 'assets',
    label: '资产库',
    description: 'UE 场景资产索引',
    icon: LayersIcon,
    href: '/assets',
    keywords: ['资产', 'UE', '3D', '模型', 'assets'],
  },
  {
    id: 'settings',
    label: '设置',
    description: '账户和团队设置',
    icon: SettingsIcon,
    href: '/settings',
    keywords: ['设置', '配置', '账户', 'settings'],
  },
];

/**
 * Cmd+K 命令面板
 * 快速导航 + 搜索 + 最近访问
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // 过滤命令
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return allCommands;
    const q = query.toLowerCase();
    return allCommands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.description?.toLowerCase().includes(q) ||
        cmd.keywords.some((kw) => kw.includes(q))
    );
  }, [query]);

  // 快捷键注册
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // 打开时聚焦输入框
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      // requestAnimationFrame 确保 DOM 已渲染
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open]);

  // 重置选中项
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // 键盘导航
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredCommands[selectedIndex];
        if (selected) {
          router.push(selected.href);
          setOpen(false);
        }
      }
    },
    [filteredCommands, selectedIndex, router]
  );

  const navigate = useCallback(
    (href: string) => {
      router.push(href);
      setOpen(false);
    },
    [router]
  );

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Panel */}
      <div className="fixed inset-0 z-[101] flex items-start justify-center pt-[15vh] px-4">
        <div
          className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
          onKeyDown={handleKeyDown}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 border-b border-border">
            <SearchIcon className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索模块或功能..."
              className="flex-1 py-3.5 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
            />
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono text-muted-foreground/60 bg-muted/50 border border-border/50">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[320px] overflow-y-auto py-2">
            {filteredCommands.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                未找到匹配结果
              </div>
            ) : (
              filteredCommands.map((cmd, index) => {
                const Icon = cmd.icon;
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={cmd.id}
                    onClick={() => navigate(cmd.href)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      isSelected ? 'bg-accent/50' : 'hover:bg-accent/30'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-primary/10' : 'bg-muted/50'
                    }`}>
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{cmd.label}</p>
                      {cmd.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {cmd.description}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <ArrowRightIcon className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-border text-[10px] text-muted-foreground/50">
            <span>↑↓ 导航 · Enter 确认 · Esc 关闭</span>
            <span>⌘K 打开</span>
          </div>
        </div>
      </div>
    </>
  );
}
