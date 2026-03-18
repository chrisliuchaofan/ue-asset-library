'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FileUpload } from '@/components/weekly-report/file-upload';
import { ReportSummary } from '@/components/weekly-report/report-summary';
import { ReportTable } from '@/components/weekly-report/report-table';
import { ReportStructureView } from '@/components/weekly-report/report-structure-view';
import { NaturalLanguageFilter } from '@/components/weekly-report/natural-language-filter';
import { RuleLibraryDialog } from '@/components/weekly-report/rule-library-dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle, Sparkles, Settings, BarChart3, SearchIcon, ArrowRight, LinkIcon } from 'lucide-react';
import Link from 'next/link';
import { PageLoading } from '@/components/page-loading';
import { PageHeader } from '@/components/page-header';
import type { WeeklyReport, ReportMaterial } from '@/types/weekly-report';
import { parseExcelFile } from '@/lib/weekly-report/material-analyzer';
import { cleanMaterials } from '@/lib/weekly-report/data-cleaner';
import { analyzeMaterials } from '@/lib/weekly-report/material-analyzer';
import { applyNaturalLanguageFilter } from '@/lib/weekly-report/data-filter';
import type { FilterRule } from '@/lib/weekly-report/rule-library';

// 移除星系背景组件，采用纯色背景

export default function WeeklyReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [weekStartDate, setWeekStartDate] = useState('');
  const [weekEndDate, setWeekEndDate] = useState('');
  const [weekDateRange, setWeekDateRange] = useState('');
  const [uploading, setUploading] = useState(false);
  const [currentReport, setCurrentReport] = useState<WeeklyReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 新增：本地数据处理状态
  const [cleanedMaterials, setCleanedMaterials] = useState<ReportMaterial[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<ReportMaterial[]>([]);
  const [filterRuleText, setFilterRuleText] = useState('');
  const [showRuleLibrary, setShowRuleLibrary] = useState(false);
  const [cleanStats, setCleanStats] = useState<{
    originalCount: number;
    cleanedCount: number;
    removed: { emptyName: number; zeroConsumption: number; duplicates: number; total: number };
  } | null>(null);
  const [processingFile, setProcessingFile] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);

  // 检查登录状态，未登录则重定向到登录页面
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login?callbackUrl=/weekly-reports');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      loadReports();
    }
  }, [session]);

  // 组件卸载时清理轮询 interval
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const response = await fetch('/api/weekly-reports?limit=10');
      const data = await response.json();
      if (data.success) {
        setReports(data.data || []);
      }
    } catch (err) {
      console.error('加载报告列表失败:', err);
    } finally {
      setLoadingReports(false);
    }
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);
    setError(null);
    setCleanedMaterials([]);
    setCleanStats(null);
    setProcessingFile(true);

    try {
      // 1. 在本地解析 Excel
      const materials = await parseExcelFile(file);

      // 2. 清理数据
      const cleanResult = cleanMaterials(materials);

      // 3. 更新状态
      if (cleanResult.cleaned.length === 0) {
        setError('清理后没有有效素材数据，请检查 Excel 文件内容和筛选条件。');
        setCleanedMaterials([]);
        setCleanStats(null);
      } else {
        setCleanedMaterials(cleanResult.cleaned);
        setCleanStats({
          originalCount: cleanResult.stats.originalCount,
          cleanedCount: cleanResult.stats.cleanedCount,
          removed: cleanResult.removed,
        });
      }
    } catch (err: any) {
      console.error('处理文件失败:', err);
      setError(`处理文件失败: ${err.message}`);
      setSelectedFile(null);
    } finally {
      setProcessingFile(false);
    }
  }, []);

  const handleDateRangeChange = useCallback((start: string, end: string, range: string) => {
    setWeekStartDate(start);
    setWeekEndDate(end);
    setWeekDateRange(range);
    setError(null);
  }, []);

  // 保存报告（不生成 AI 总结）
  const handleSaveReport = useCallback(async () => {
    // 使用筛选后的数据（如果有筛选规则），否则使用清理后的数据
    const materialsToSave = filterRuleText.trim() ? filteredMaterials : cleanedMaterials;

    if (!materialsToSave || materialsToSave.length === 0) {
      setError('请先处理 Excel 文件');
      return;
    }

    if (!weekStartDate || !weekEndDate) {
      setError('请选择日期范围');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // 发送清理后的数据到服务器
      const response = await fetch('/api/weekly-reports/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          materials: materialsToSave,
          weekDateRange,
          weekStartDate,
          weekEndDate,
          excelFileName: selectedFile?.name || 'unknown.xlsx',
          skipAI: true, // 不生成 AI 总结
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '保存失败');
      }

      if (data.success) {
        setCurrentReport(data.data);
        setSelectedFile(null);
        setCleanedMaterials([]);
        setCleanStats(null);
        await loadReports();
      } else {
        throw new Error(data.message || '保存失败');
      }
    } catch (err: any) {
      console.error('保存失败:', err);
      setError(err.message || '保存失败，请重试');
    } finally {
      setUploading(false);
    }
  }, [cleanedMaterials, filteredMaterials, filterRuleText, weekStartDate, weekEndDate, weekDateRange, selectedFile, loadReports]);

  // 生成 AI 总结
  const handleGenerateAI = useCallback(async () => {
    // 使用筛选后的数据（如果有筛选规则），否则使用清理后的数据
    const materialsToSave = filterRuleText.trim() ? filteredMaterials : cleanedMaterials;

    if (!materialsToSave || materialsToSave.length === 0) {
      setError('请先处理 Excel 文件');
      return;
    }

    if (!weekStartDate || !weekEndDate) {
      setError('请选择日期范围');
      return;
    }

    setGeneratingAI(true);
    setError(null);

    try {
      // 分析数据
      // 使用筛选后的数据（如果有筛选规则），否则使用清理后的数据
      const materialsToAnalyze = filterRuleText.trim() ? filteredMaterials : cleanedMaterials;
      const stats = analyzeMaterials(materialsToAnalyze);

      // 发送清理后的数据到服务器，并生成 AI 总结
      const response = await fetch('/api/weekly-reports/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          materials: materialsToAnalyze,
          weekDateRange,
          weekStartDate,
          weekEndDate,
          excelFileName: selectedFile?.name || 'unknown.xlsx',
          skipAI: false, // 生成 AI 总结
          stats, // 传递分析结果
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '生成失败');
      }

      if (data.success) {
        setCurrentReport(data.data);
        setSelectedFile(null);
        setCleanedMaterials([]);
        setCleanStats(null);
        await loadReports();

        // 如果 AI 总结还在生成中，轮询检查更新
        if (data.message?.includes('正在生成')) {
          // 清理之前的轮询
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          let attempts = 0;
          const maxAttempts = 10;
          const checkInterval = setInterval(async () => {
            attempts++;
            try {
              const checkResponse = await fetch(`/api/weekly-reports/${data.data.id}`);
              const checkData = await checkResponse.json();
              if (checkData.success && checkData.data.summary_text) {
                const currentSummary = currentReport?.summary_text || '';
                const newSummary = checkData.data.summary_text;
                if (newSummary !== currentSummary && newSummary.length > currentSummary.length) {
                  setCurrentReport(checkData.data);
                  clearInterval(checkInterval);
                  pollingIntervalRef.current = null;
                } else if (attempts >= maxAttempts) {
                  clearInterval(checkInterval);
                  pollingIntervalRef.current = null;
                }
              } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                pollingIntervalRef.current = null;
              }
            } catch (err) {
              console.error('检查 AI 总结失败:', err);
              if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                pollingIntervalRef.current = null;
              }
            }
          }, 3000);
          pollingIntervalRef.current = checkInterval;
        }
      } else {
        throw new Error(data.message || '生成失败');
      }
    } catch (err: any) {
      console.error('生成失败:', err);
      setError(err.message || '生成失败，请重试');
    } finally {
      setGeneratingAI(false);
    }
  }, [cleanedMaterials, filteredMaterials, filterRuleText, weekStartDate, weekEndDate, weekDateRange, selectedFile, loadReports, currentReport]);

  // 处理自然语言规则变化
  const handleRuleChange = useCallback((ruleText: string) => {
    setFilterRuleText(ruleText);
    if (ruleText.trim() && cleanedMaterials.length > 0) {
      try {
        const filtered = applyNaturalLanguageFilter(cleanedMaterials, ruleText);
        setFilteredMaterials(filtered);
      } catch (error) {
        console.error('[WeeklyReportsPage] 应用筛选规则失败:', error);
        setError('筛选规则应用失败，请检查规则格式');
      }
    } else {
      setFilteredMaterials([]);
    }
  }, [cleanedMaterials]);

  // 处理规则库选择
  const handleRuleSelect = useCallback((rule: FilterRule) => {
    setFilterRuleText(rule.ruleText);
    handleRuleChange(rule.ruleText);
  }, [handleRuleChange]);

  // 当清理后的数据变化时，重新应用筛选规则
  useEffect(() => {
    if (filterRuleText.trim() && cleanedMaterials.length > 0) {
      handleRuleChange(filterRuleText);
    } else {
      setFilteredMaterials([]);
    }
  }, [cleanedMaterials, filterRuleText, handleRuleChange]);

  const handleViewReport = useCallback(async (reportId: string) => {
    try {
      const response = await fetch(`/api/weekly-reports/${reportId}`);
      const data = await response.json();
      if (data.success) {
        setCurrentReport(data.data);
      }
    } catch (err) {
      console.error('加载报告失败:', err);
      setError('加载报告失败');
    }
  }, []);

  return (
    <div className="flex h-full flex-col relative bg-background text-foreground overflow-auto">
      {/* 如果正在加载或未登录，显示加载状态 */}
      {status === 'loading' || !session?.user ? (
        <PageLoading />
      ) : null}

      {/* 页面内容 - 只在已登录时显示 */}
      {status !== 'loading' && session?.user && (
        <>
        <PageHeader title="数据洞察" badge="S5" description="Excel 转周报 · AI 智能总结" />

        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">

            {/* 错误提示 */}
            {error && (
              <div className="mb-6 rounded-xl border border-destructive/50 bg-destructive/10 backdrop-blur-md p-4 flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}

            {/* 上传区域 */}
            <div className="mb-8 rounded-xl border border-border bg-card p-6 sm:p-8">
              <h2 className="text-xl font-medium text-foreground mb-4">上传 Excel 文件</h2>
              <FileUpload
                onFileSelect={handleFileSelect}
                onDateRangeChange={handleDateRangeChange}
                disabled={uploading || processingFile}
                uploading={uploading || processingFile}
              />

              {/* 数据处理状态 */}
              {processingFile && (
                <div className="mt-4 flex items-center gap-3 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>正在处理文件...</span>
                </div>
              )}

              {/* 清理统计 */}
              {cleanStats && (
                <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4">
                  <h3 className="text-sm font-medium text-foreground mb-2">数据清理结果</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">原始数据：</span>
                      <span className="text-foreground ml-2">{cleanStats.originalCount} 条</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">清理后：</span>
                      <span className="text-foreground ml-2">{cleanStats.cleanedCount} 条</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">已移除：</span>
                      <span className="text-foreground ml-2">{cleanStats.removed.total} 条</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      （空名称: {cleanStats.removed.emptyName} |
                      消耗≤1w: {cleanStats.removed.zeroConsumption} |
                      重复: {cleanStats.removed.duplicates}）
                    </div>
                  </div>
                </div>
              )}


              {/* 操作按钮 */}
              <div className="mt-6 flex justify-end gap-3">
                {cleanedMaterials.length > 0 && (
                  <>
                    <Button
                      onClick={handleSaveReport}
                      disabled={!weekStartDate || !weekEndDate || uploading}
                      variant="outline"
                      className="border-border bg-transparent text-foreground hover:bg-muted disabled:opacity-50"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          <span>保存</span>
                        </>
                      ) : (
                        <span>保存</span>
                      )}
                    </Button>
                    <Button
                      onClick={handleGenerateAI}
                      disabled={!weekStartDate || !weekEndDate || uploading || generatingAI}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generatingAI ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          <span>分析</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          <span>分析</span>
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* 清理后的数据预览（保存前后都显示） */}
            {cleanedMaterials.length > 0 && (
              <div className="mb-8 space-y-6">
                <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-medium text-foreground">
                      {currentReport ? '数据预览（已保存）' : '数据预览'}
                    </h2>
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-muted-foreground">
                        {filterRuleText.trim() ? (
                          <>
                            筛选后：{filteredMaterials.length} / 原始：{cleanedMaterials.length} 个素材
                          </>
                        ) : (
                          <>共 {cleanedMaterials.length} 个素材</>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowRuleLibrary(true)}
                        className="border-border bg-transparent text-foreground hover:bg-muted"
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        <span>规则库</span>
                      </Button>
                    </div>
                  </div>

                  {/* 自然语言筛选 */}
                  <div className="mb-6">
                    <NaturalLanguageFilter
                      onRuleChange={handleRuleChange}
                      disabled={uploading || processingFile}
                    />
                  </div>

                  {/* 数据展示 */}
                  <ReportStructureView
                    materials={filterRuleText.trim() ? filteredMaterials : cleanedMaterials}
                  />
                </div>
              </div>
            )}

            {/* 规则库管理对话框 */}
            <RuleLibraryDialog
              open={showRuleLibrary}
              onOpenChange={setShowRuleLibrary}
              onRuleSelect={handleRuleSelect}
            />

            {/* 当前报告展示 */}
            {currentReport && (
              <div className="mb-8 space-y-6">
                {/* AI 总结 */}
                <ReportSummary
                  summary={currentReport.summary_text}
                  loading={false}
                />

                {/* 素材关联统计 */}
                {(() => {
                  const reportData = currentReport.report_data as ReportMaterial[];
                  const matchedCount = reportData.filter(m => m.material_id).length;
                  const exactCount = reportData.filter(m => m.match_type === 'exact').length;
                  const fuzzyCount = reportData.filter(m => m.match_type === 'fuzzy').length;
                  if (matchedCount > 0) {
                    return (
                      <div className="rounded-xl border border-success/20 bg-success/5 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <LinkIcon className="w-5 h-5 text-success" />
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              已关联 {matchedCount}/{reportData.length} 个素材到素材库
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              精确匹配 {exactCount} · 模糊匹配 {fuzzyCount} · 未匹配 {reportData.length - matchedCount}
                            </p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" asChild>
                          <Link href="/materials">
                            查看素材库
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </Button>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* 跨模块流转：数据洞察 → 爆款分析 */}
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SearchIcon className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">深度分析高消耗素材</p>
                      <p className="text-xs text-muted-foreground mt-0.5">使用爆款分析拆解 Top 素材的 Hook、结构和创意手法</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/analysis">
                      爆款分析
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </Button>
                </div>

                {/* 结构化数据展示 */}
                <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-medium text-foreground">数据详情</h2>
                    <div className="text-sm text-muted-foreground">
                      {currentReport.week_date_range} · 共 {currentReport.total_materials} 个素材
                    </div>
                  </div>
                  <ReportStructureView materials={currentReport.report_data as ReportMaterial[]} />
                </div>
              </div>
            )}

            {/* 历史报告列表 */}
            <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
              <h2 className="text-xl font-medium text-foreground mb-4">历史报告</h2>
              {loadingReports ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : reports.length === 0 ? (
                <div className="py-10 text-center space-y-4">
                  <BarChart3 className="w-10 h-10 mx-auto text-muted-foreground/40" />
                  <div>
                    <p className="text-base font-medium text-foreground">上传第一份消耗数据</p>
                    <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                      上传广告平台导出的 Excel 文件，AI 自动清洗数据、关联素材库并生成消耗洞察
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground pt-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</span>
                      上传 Excel
                    </div>
                    <ArrowRight className="w-3 h-3" />
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">2</span>
                      AI 清洗匹配
                    </div>
                    <ArrowRight className="w-3 h-3" />
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">3</span>
                      生成洞察报告
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground/60 pt-1">
                    支持格式：.xlsx / .xls · 需包含素材名称和消耗金额列
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {reports.map((report) => (
                    <button
                      key={report.id}
                      onClick={() => handleViewReport(report.id)}
                      className="w-full text-left p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-foreground font-medium">{report.week_date_range}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {report.total_materials} 个素材 · 总消耗 {report.total_consumption?.toLocaleString('zh-CN') || 0}
                          </p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(report.created_at).toLocaleDateString('zh-CN')}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
        </>
      )}

      {/* 底部导航 */}
      {/* Removed BottomNavigation */}
    </div>
  );
}
