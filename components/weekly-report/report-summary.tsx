'use client';

import { Loader2 } from 'lucide-react';

interface ReportSummaryProps {
  summary: string | null;
  loading?: boolean;
}

export function ReportSummary({ summary, loading = false }: ReportSummaryProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>AI 正在生成总结...</span>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">AI 总结生成中，请稍候...</span>
        </div>
      </div>
    );
  }

  // 将总结文本按行分割，每行作为一个要点
  const lines = summary.split('\n').filter(line => line.trim());

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="text-lg font-medium text-foreground mb-4">AI 智能总结</h3>
      <div className="space-y-2">
        {lines.map((line, index) => (
          <p
            key={index}
            className="text-foreground leading-relaxed"
            style={{ whiteSpace: 'pre-wrap' }}
          >
            {line.trim()}
          </p>
        ))}
      </div>
    </div>
  );
}
