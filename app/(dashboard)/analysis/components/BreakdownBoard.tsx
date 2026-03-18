"use client";

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, ArrowRight, Wand2, FolderOpen } from 'lucide-react';
import { AnalysisReport, AnalysisTaskState } from './types';
import { MaterialPickerDialog } from './MaterialPickerDialog';

export function BreakdownBoard() {
  const router = useRouter();
  const [scriptText, setScriptText] = useState('');
  const [showMaterialPicker, setShowMaterialPicker] = useState(false);
  const [taskState, setTaskState] = useState<AnalysisTaskState>({
    status: 'idle',
    progress: 0,
    step: '',
    report: null,
    error: null,
  });

  const handleAnalyze = useCallback(async () => {
    if (!scriptText.trim()) return;

    setTaskState({
      status: 'analyzing',
      progress: 20,
      step: '正在初始化分析任务...',
      report: null,
      error: null,
    });

    try {
      const response = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `请分析以下创意脚本并生成审核报告（必须输出JSON格式）。\n\n脚本内容：\n${scriptText}`,
          systemPrompt: '你是一个专业的短视频结构拆解与审核专家。请梳理该脚本的结构、钩子和美术维度。'
        })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      setTaskState(prev => ({ ...prev, progress: 80, step: 'AI 响应已返回，正在解析...' }));
      const result = await response.json();

      let report: AnalysisReport;
      if (result.text) {
        // 用平衡括号提取第一个完整 JSON 对象
        const extractJson = (text: string): string => {
          const start = text.indexOf('{');
          if (start === -1) return text;
          let depth = 0;
          for (let i = start; i < text.length; i++) {
            if (text[i] === '{') depth++;
            else if (text[i] === '}') depth--;
            if (depth === 0) return text.slice(start, i + 1);
          }
          return text.slice(start); // fallback
        };
        report = JSON.parse(extractJson(result.text));
      } else {
        report = result;
      }

      setTaskState({
        status: 'completed',
        progress: 100,
        step: '分析完成',
        report,
        error: null,
      });
    } catch (err: any) {
      setTaskState({
        status: 'error',
        progress: 0,
        step: '分析失败',
        report: null,
        error: err.message || '未知错误',
      });
    }
  }, [scriptText]);

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 输入区 */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="bg-card border-border p-5">
            <div className="flex items-center justify-between mb-3">
              <label htmlFor="script-textarea" className="text-base font-medium text-foreground">输入素材脚本内容</label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMaterialPicker(true)}
                className="text-xs"
              >
                <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
                从素材库选择
              </Button>
            </div>
            <textarea
              id="script-textarea"
              value={scriptText}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setScriptText(e.target.value)}
              placeholder="请粘贴短视频文案或分镜画面描述..."
              className="min-h-[300px] w-full p-4 rounded-md bg-muted border border-border text-foreground placeholder:text-muted-foreground resize-y focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            />
            <Button
              onClick={handleAnalyze}
              disabled={!scriptText.trim() || taskState.status === 'analyzing'}
              className="w-full mt-4"
            >
              {taskState.status === 'analyzing' ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {taskState.step}</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> 开始深度拆解</>
              )}
            </Button>

            {taskState.error && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/50 rounded-md text-destructive text-sm">
                错误: {taskState.error}
              </div>
            )}
          </Card>
        </div>

        {/* 报告展示区 */}
        <div className="lg:col-span-7 space-y-4 flex flex-col">
          {taskState.report ? (
            <Card className="bg-card border-border p-6 flex-1 shadow-lg">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
                <h2 className="text-xl font-semibold text-foreground">拆解诊断报告</h2>
                <div className="flex items-center gap-3">
                  <Badge className={taskState.report.is_s_tier ? "bg-warning/20 text-warning" : "bg-muted text-muted-foreground"}>
                    {taskState.report.is_s_tier ? 'S级爆款潜力' : '常规内容'}
                  </Badge>
                  <div className="bg-muted px-3 py-1 rounded-md border border-border">
                    <span className="text-muted-foreground text-xs mr-2">综合评分</span>
                    <span className={`font-mono font-bold ${taskState.report.total_score >= 80 ? 'text-success' : 'text-warning'}`}>
                      {taskState.report.total_score}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">核心诊断意见</h4>
                  <p className="text-foreground text-sm leading-relaxed bg-muted p-4 rounded-md border border-border">
                    {taskState.report.critique_summary}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-muted p-4 rounded-md border border-border">
                    <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">执行建议</h4>
                    <p className="text-sm text-foreground">{taskState.report.aesthetic_verdict || "无额外执行建议"}</p>
                  </div>
                  <div className="bg-muted p-4 rounded-md border border-border">
                    <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">内容钩子</h4>
                    <p className="text-sm text-foreground">{taskState.report.hook_strength || "未提取出明显钩子"}</p>
                  </div>
                </div>

                {taskState.report.detailed_analysis && taskState.report.detailed_analysis.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">分镜拆解清单</h4>
                    <div className="space-y-3">
                      {taskState.report.detailed_analysis.map((item, idx) => (
                        <div key={idx} className="bg-muted border border-border rounded-md p-4 flex gap-4">
                          <div className="shrink-0 pt-0.5">
                            <Badge variant="outline" className="border-primary/30 text-primary font-mono">
                              {item.time_stamp || `00:0${idx}`}
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-foreground">{item.issue}</p>
                            <div className="flex items-start gap-2 text-xs text-muted-foreground">
                              <ArrowRight className="w-3 h-3 mt-0.5 shrink-0" />
                              <span><strong className="text-muted-foreground">指令:</strong> {item.fix_suggestion}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 跨模块流转：分析 → AI 创作 */}
              <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                <p className="text-xs text-muted-foreground">基于此分析生成 AI 脚本，自动提取核心卖点和内容钩子</p>
                <Button
                  size="sm"
                  onClick={() => {
                    // 将分析上下文存储到 localStorage 供 Studio 读取
                    const analysisContext = {
                      critique: taskState.report?.critique_summary || '',
                      hook: taskState.report?.hook_strength || '',
                      verdict: taskState.report?.aesthetic_verdict || '',
                      score: taskState.report?.total_score || 0,
                      scenes: taskState.report?.detailed_analysis?.map(d => d.fix_suggestion).filter(Boolean) || [],
                      sourceScript: scriptText,
                    };
                    localStorage.setItem('analysis_to_studio', JSON.stringify(analysisContext));
                    router.push('/studio?from=analysis');
                  }}
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  以此生成脚本
                </Button>
              </div>
            </Card>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-10 bg-card/50">
              <Sparkles className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center font-medium">
                输入左侧脚本后，点击分析进行深度拆解<br />报告将在这里生成
              </p>
            </div>
          )}
        </div>
      </div>
      <MaterialPickerDialog
        open={showMaterialPicker}
        onClose={() => setShowMaterialPicker(false)}
        onSelect={(material) => {
          setScriptText(prev => prev ? `${prev}\n\n素材：${material.name}` : `素材：${material.name}`);
        }}
      />
    </div>
  );
}
