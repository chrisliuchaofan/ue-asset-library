'use client';

import React from 'react';
import type { TemplateScene } from '@/data/template.schema';
import { SCENE_TYPE_LABELS, SCENE_TYPE_COLORS } from '@/data/template.schema';
import { cn } from '@/lib/utils';

interface TemplateStructureTimelineProps {
  scenes: TemplateScene[];
  compact?: boolean;
}

/**
 * 模版结构时间线组件
 * 水平展示模版的场景骨架，节点颜色区分类型
 */
export function TemplateStructureTimeline({ scenes, compact = false }: TemplateStructureTimelineProps) {
  if (!scenes || scenes.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-2">
        暂无结构数据
      </div>
    );
  }

  const totalDuration = scenes.reduce((sum, s) => sum + s.durationSec, 0);

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {scenes.map((scene, i) => {
          const widthPercent = Math.max(10, (scene.durationSec / totalDuration) * 100);
          return (
            <div
              key={i}
              className={cn(
                'h-2 rounded-full transition-all',
                SCENE_TYPE_COLORS[scene.type] || 'bg-gray-400'
              )}
              style={{ width: `${widthPercent}%` }}
              title={`${SCENE_TYPE_LABELS[scene.type] || scene.type} · ${scene.durationSec}s`}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 色条预览 */}
      <div className="flex items-center gap-0.5 h-3 rounded-full overflow-hidden">
        {scenes.map((scene, i) => {
          const widthPercent = Math.max(5, (scene.durationSec / totalDuration) * 100);
          return (
            <div
              key={i}
              className={cn(
                'h-full transition-all',
                SCENE_TYPE_COLORS[scene.type] || 'bg-gray-400',
                i === 0 && 'rounded-l-full',
                i === scenes.length - 1 && 'rounded-r-full'
              )}
              style={{ width: `${widthPercent}%` }}
            />
          );
        })}
      </div>

      {/* 场景详情列表 */}
      <div className="space-y-2">
        {scenes.map((scene, i) => (
          <div key={i} className="flex items-start gap-3">
            {/* 序号圆点 */}
            <div className="flex flex-col items-center">
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0',
                SCENE_TYPE_COLORS[scene.type] || 'bg-gray-400'
              )}>
                {i + 1}
              </div>
              {i < scenes.length - 1 && (
                <div className="w-px h-full min-h-[16px] bg-border mt-1" />
              )}
            </div>

            {/* 内容 */}
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {SCENE_TYPE_LABELS[scene.type] || scene.type}
                </span>
                <span className="text-xs text-muted-foreground">
                  {scene.durationSec}s
                </span>
              </div>
              <p className="text-sm mt-0.5">{scene.description}</p>
              {scene.tips && (
                <p className="text-xs text-muted-foreground mt-1 italic">
                  💡 {scene.tips}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 总时长 */}
      <div className="text-xs text-muted-foreground text-right">
        总时长: {totalDuration}s
      </div>
    </div>
  );
}
