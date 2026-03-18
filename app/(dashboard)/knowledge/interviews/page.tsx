'use client';

/**
 * W3.1: 访谈管理页 — 创建/管理访谈，复制链接，提取知识
 */

import { useState, useEffect, useCallback } from 'react';
import {
  MessageCircle, Plus, Copy, Archive, Sparkles, Loader2,
  Clock, CheckCircle2, ExternalLink, X,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';

interface Interview {
  id: string;
  topic: string;
  guide_questions: string[];
  token: string;
  contributor_name: string | null;
  contributor_role: string | null;
  status: string;
  chat_history: any[];
  extracted_knowledge_id: string | null;
  created_by: string;
  created_at: string;
  completed_at: string | null;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: '待开始', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  in_progress: { label: '进行中', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
  completed: { label: '已完成', color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
  archived: { label: '已归档', color: 'hsl(var(--muted-foreground) / 0.5)', bg: 'hsl(var(--muted))' },
};

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // 创建表单
  const [topic, setTopic] = useState('');
  const [guideQuestions, setGuideQuestions] = useState<string[]>(['']);
  const [extractingId, setExtractingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchInterviews = useCallback(async () => {
    try {
      const res = await fetch('/api/knowledge/interviews');
      if (res.ok) {
        const data = await res.json();
        setInterviews(data.interviews || []);
      }
    } catch (err) {
      console.error('获取访谈列表失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInterviews(); }, [fetchInterviews]);

  // 创建访谈
  const handleCreate = async () => {
    if (!topic.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch('/api/knowledge/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          guide_questions: guideQuestions.filter(q => q.trim()),
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setTopic('');
        setGuideQuestions(['']);
        fetchInterviews();
      }
    } catch (err) {
      console.error('创建访谈失败:', err);
    } finally {
      setCreating(false);
    }
  };

  // 复制链接
  const handleCopy = (token: string, id: string) => {
    const url = `${window.location.origin}/interview/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 归档
  const handleArchive = async (id: string) => {
    if (!confirm('确定要归档此访谈？')) return;
    try {
      await fetch('/api/knowledge/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive', id }),
      });
      fetchInterviews();
    } catch {
      // ignore
    }
  };

  // 提取知识
  const handleExtract = async (id: string) => {
    setExtractingId(id);
    try {
      const res = await fetch('/api/knowledge/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extract', id }),
      });
      if (res.ok) {
        fetchInterviews();
      }
    } catch (err) {
      console.error('知识提取失败:', err);
    } finally {
      setExtractingId(null);
    }
  };

  // 引导问题管理
  const addQuestion = () => setGuideQuestions(prev => [...prev, '']);
  const removeQuestion = (idx: number) => setGuideQuestions(prev => prev.filter((_, i) => i !== idx));
  const updateQuestion = (idx: number, val: string) => setGuideQuestions(prev => prev.map((q, i) => i === idx ? val : q));

  return (
    <>
      <PageHeader
        title="知识访谈"
        description="创建访谈话题，邀请专家分享知识，AI 自动提取结构化知识"
        icon={MessageCircle}
        actions={
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            创建访谈
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">

          {/* 创建表单 */}
          {showCreate && (
            <div className="border border-border rounded-xl p-5 bg-card shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium">创建知识访谈</h2>
                <button className="text-muted-foreground hover:text-foreground" onClick={() => setShowCreate(false)}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">访谈话题 *</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    placeholder="例如：游戏广告创意方法论"
                    className="w-full h-10 px-3 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">引导问题（可选）</label>
                  {guideQuestions.map((q, i) => (
                    <div key={i} className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                      <input
                        type="text"
                        value={q}
                        onChange={e => updateQuestion(i, e.target.value)}
                        placeholder="输入引导问题..."
                        className="flex-1 h-9 px-3 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      {guideQuestions.length > 1 && (
                        <button className="text-muted-foreground hover:text-destructive" onClick={() => removeQuestion(i)}>
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {guideQuestions.length < 10 && (
                    <button className="text-xs text-primary hover:underline mt-1" onClick={addQuestion}>
                      + 添加问题
                    </button>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>取消</Button>
                  <Button size="sm" onClick={handleCreate} disabled={creating || !topic.trim()}>
                    {creating && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                    创建
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* 访谈列表 */}
          {!loading && interviews.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MessageCircle className="w-10 h-10 text-muted-foreground/30 mb-4" />
              <h3 className="text-sm font-medium text-muted-foreground mb-1">暂无访谈</h3>
              <p className="text-xs text-muted-foreground/70 max-w-sm">
                创建访谈话题，生成分享链接，邀请专家参与 AI 访谈
              </p>
            </div>
          )}

          {!loading && interviews.length > 0 && (
            <div className="space-y-3">
              {interviews.map(interview => {
                const statusInfo = STATUS_MAP[interview.status] || STATUS_MAP.pending;
                const msgCount = (interview.chat_history || []).filter(
                  (m: any) => m.role === 'user' || m.role === 'assistant'
                ).length;

                return (
                  <div
                    key={interview.id}
                    className="border border-border rounded-xl p-4 bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-medium text-foreground truncate">{interview.topic}</h3>
                          <span
                            className="text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0"
                            style={{ color: statusInfo.color, background: statusInfo.bg }}
                          >
                            {statusInfo.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {interview.contributor_name && (
                            <span>贡献者: {interview.contributor_name}{interview.contributor_role ? ` (${interview.contributor_role})` : ''}</span>
                          )}
                          {msgCount > 0 && <span>{msgCount} 条消息</span>}
                          <span>{new Date(interview.created_at).toLocaleDateString('zh-CN')}</span>
                        </div>
                        {interview.guide_questions.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {interview.guide_questions.slice(0, 3).map((q, i) => (
                              <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground truncate max-w-[200px]">
                                {q}
                              </span>
                            ))}
                            {interview.guide_questions.length > 3 && (
                              <span className="text-[11px] text-muted-foreground">+{interview.guide_questions.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => handleCopy(interview.token, interview.id)}
                          title="复制访谈链接"
                        >
                          {copiedId === interview.id ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedId === interview.id ? '已复制' : '链接'}
                        </Button>

                        {interview.status === 'in_progress' && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={`/interview/${interview.token}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3.5 h-3.5" /> 查看
                            </a>
                          </Button>
                        )}

                        {interview.status === 'completed' && !interview.extracted_knowledge_id && (
                          <Button
                            variant="outline" size="sm"
                            onClick={() => handleExtract(interview.id)}
                            disabled={extractingId === interview.id}
                          >
                            {extractingId === interview.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                            提取知识
                          </Button>
                        )}

                        {interview.extracted_knowledge_id && (
                          <span className="text-[11px] text-green-500 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> 已提取
                          </span>
                        )}

                        {interview.status !== 'archived' && (
                          <Button variant="ghost" size="sm" onClick={() => handleArchive(interview.id)} title="归档">
                            <Archive className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
