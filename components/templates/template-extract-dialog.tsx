'use client';

import React, { useState } from 'react';
import type { MaterialTemplate } from '@/data/template.schema';
import { TemplateStructureTimeline } from './template-structure-timeline';
import { Loader2, Sparkles, Check } from 'lucide-react';

interface TemplateExtractDialogProps {
  /** 选中的素材 ID 列表 */
  materialIds: string[];
  /** 关闭回调 */
  onClose: () => void;
  /** 提取成功回调 */
  onSuccess?: (template: MaterialTemplate) => void;
}

type ExtractStep = 'confirm' | 'extracting' | 'preview';

/**
 * AI 提取模版对话框
 * 步骤：确认素材 → AI 分析中 → 预览结果
 */
export function TemplateExtractDialog({
  materialIds,
  onClose,
  onSuccess,
}: TemplateExtractDialogProps) {
  const [step, setStep] = useState<ExtractStep>('confirm');
  const [template, setTemplate] = useState<MaterialTemplate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [style, setStyle] = useState<string>('');

  const handleExtract = async () => {
    setStep('extracting');
    setError(null);

    try {
      const res = await fetch('/api/templates/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialIds,
          style: style || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || '提取失败');
      }

      const result = await res.json();
      setTemplate(result);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : '提取模版失败');
      setStep('confirm');
    }
  };

  const handleActivate = async () => {
    if (!template) return;

    try {
      await fetch(`/api/templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });
      onSuccess?.(template);
      onClose();
    } catch {
      // 即使激活失败，模版也已创建
      onSuccess?.(template);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-2xl shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            AI 提取爆款模版
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* 内容 */}
        <div className="p-4">
          {step === 'confirm' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                将从 <strong>{materialIds.length}</strong> 个素材中提取共性特征，
                生成一个可复用的爆款模版。
              </p>

              {/* 风格选择 */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">风格偏好（可选）</label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">自动识别</option>
                  <option value="剧情">剧情</option>
                  <option value="口播">口播</option>
                  <option value="混剪">混剪</option>
                  <option value="实拍">实拍</option>
                </select>
              </div>

              {error && (
                <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-accent"
                >
                  取消
                </button>
                <button
                  onClick={handleExtract}
                  className="px-4 py-2 text-sm rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium"
                >
                  开始提取
                </button>
              </div>
            </div>
          )}

          {step === 'extracting' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4" />
              <p className="text-sm font-medium">AI 正在分析素材共性...</p>
              <p className="text-xs text-muted-foreground mt-1">这可能需要 10-30 秒</p>
            </div>
          )}

          {step === 'preview' && template && (
            <div className="space-y-4">
              {/* 基本信息 */}
              <div>
                <h3 className="font-semibold text-base">{template.name}</h3>
                {template.description && (
                  <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                )}
              </div>

              {/* 标签 */}
              <div className="flex flex-wrap gap-1.5">
                {template.hookPattern && (
                  <span className="inline-flex items-center rounded-md bg-purple-100 dark:bg-purple-900 px-2 py-0.5 text-xs font-medium text-purple-800 dark:text-purple-200">
                    {template.hookPattern}
                  </span>
                )}
                {template.targetEmotion && (
                  <span className="inline-flex items-center rounded-md bg-orange-100 dark:bg-orange-900 px-2 py-0.5 text-xs font-medium text-orange-800 dark:text-orange-200">
                    {template.targetEmotion}
                  </span>
                )}
                {template.tags?.map((tag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs text-gray-700 dark:text-gray-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* 结构时间线 */}
              <div>
                <h4 className="text-sm font-medium mb-2">结构骨架</h4>
                <TemplateStructureTimeline scenes={template.structure} />
              </div>

              {/* 操作 */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-accent"
                >
                  保存为草稿
                </button>
                <button
                  onClick={handleActivate}
                  className="px-4 py-2 text-sm rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  启用模版
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
