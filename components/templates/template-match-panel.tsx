'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { MaterialTemplate } from '@/data/template.schema';
import { TemplateStructureTimeline } from './template-structure-timeline';
import { Loader2, Search, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplateMatchResult {
  template: MaterialTemplate;
  similarity: number;
  matchLevel: 'high' | 'medium' | 'low';
}

interface TemplateMatchPanelProps {
  /** 初始查询文本（如从灵感传入） */
  initialText?: string;
  /** 选择模版回调 */
  onSelect?: (template: MaterialTemplate) => void;
  className?: string;
}

const MATCH_LEVEL_STYLES: Record<string, string> = {
  high: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  low: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

const MATCH_LEVEL_LABELS: Record<string, string> = {
  high: '高度匹配',
  medium: '中度匹配',
  low: '低度匹配',
};

/**
 * 模版匹配面板
 * 输入创意文本 → 向量搜索匹配模版
 */
export function TemplateMatchPanel({
  initialText = '',
  onSelect,
  className,
}: TemplateMatchPanelProps) {
  const [text, setText] = useState(initialText);
  const [results, setResults] = useState<TemplateMatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const autoSearched = useRef(false);

  const handleSearch = useCallback(async () => {
    if (!text.trim()) return;

    setLoading(true);
    setSearched(true);

    try {
      const res = await fetch('/api/templates/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      });

      if (!res.ok) {
        console.error('[MatchPanel] 搜索失败:', await res.text());
        setResults([]);
        return;
      }

      const data = await res.json();
      setResults(data.matches || []);
    } catch (error) {
      console.error('[MatchPanel] 搜索异常:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [text]);

  // 如果有 initialText，自动触发搜索
  useEffect(() => {
    if (initialText && !autoSearched.current) {
      autoSearched.current = true;
      handleSearch();
    }
  }, [initialText, handleSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* 搜索输入 */}
      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入你的创意描述，匹配最合适的爆款模版..."
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
          rows={2}
        />
        <button
          onClick={handleSearch}
          disabled={loading || !text.trim()}
          className="shrink-0 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center gap-1.5"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          匹配
        </button>
      </div>

      {/* 结果列表 */}
      {searched && !loading && results.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <p>未找到匹配的模版</p>
          <p className="text-xs mt-1">试试更详细的创意描述，或创建新模版</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            找到 {results.length} 个匹配模版
          </p>
          {results.map((result) => (
            <div
              key={result.template.id}
              className="rounded-lg border border-border p-3 space-y-2 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-medium">{result.template.name}</h4>
                  {result.template.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {result.template.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                    MATCH_LEVEL_STYLES[result.matchLevel]
                  )}>
                    {MATCH_LEVEL_LABELS[result.matchLevel]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(result.similarity * 100)}%
                  </span>
                </div>
              </div>

              {/* 紧凑时间线 */}
              <TemplateStructureTimeline scenes={result.template.structure} compact />

              {/* 使用按钮 */}
              {onSelect && (
                <div className="flex justify-end">
                  <button
                    onClick={() => onSelect(result.template)}
                    className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                  >
                    使用此模版
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
