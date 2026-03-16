'use client';

import { useState, useEffect, useCallback } from 'react';
import { BookOpenIcon, Plus, Upload, Loader2, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KnowledgeEntryCard } from '@/components/knowledge/knowledge-entry-card';
import { KnowledgeEntryForm } from '@/components/knowledge/knowledge-entry-form';
import { KnowledgeImportDialog } from '@/components/knowledge/knowledge-import-dialog';
import { FeedbackReviewList } from '@/components/knowledge/feedback-review-list';
import type { KnowledgeEntry } from '@/data/knowledge.schema';
import { useTranslations } from 'next-intl';

type TabValue = 'all' | 'dimensions' | 'feedback';

export default function KnowledgePage() {
    const t = useTranslations('knowledge');

    const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
    const [feedbackEntries, setFeedbackEntries] = useState<KnowledgeEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabValue>('all');

    // 表单状态
    const [showForm, setShowForm] = useState(false);
    const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);
    const [showImport, setShowImport] = useState(false);

    // 加载数据
    const fetchEntries = useCallback(async () => {
        setLoading(true);
        try {
            const [allRes, fbRes] = await Promise.all([
                fetch('/api/knowledge'),
                fetch('/api/knowledge/feedback'),
            ]);
            const allData = await allRes.json();
            const fbData = await fbRes.json();

            setEntries(allData.entries || []);
            setFeedbackEntries((fbData.entries || []).filter((e: KnowledgeEntry) => e.status === 'draft'));
        } catch (err) {
            console.error('加载知识库失败:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEntries();
    }, [fetchEntries]);

    // 过滤数据
    const displayEntries = activeTab === 'dimensions'
        ? entries.filter(e => e.category === 'dimension')
        : activeTab === 'feedback'
            ? feedbackEntries
            : entries;

    // 创建条目
    const handleCreate = async (data: any) => {
        const res = await fetch('/api/knowledge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (res.ok) {
            setShowForm(false);
            fetchEntries();
        }
    };

    // 更新条目
    const handleUpdate = async (data: any) => {
        if (!editingEntry) return;
        const res = await fetch(`/api/knowledge/${editingEntry.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (res.ok) {
            setEditingEntry(null);
            setShowForm(false);
            fetchEntries();
        }
    };

    // 删除条目
    const handleDelete = async (entry: KnowledgeEntry) => {
        if (!window.confirm(t('deleteConfirm'))) return;
        const res = await fetch(`/api/knowledge/${entry.id}`, { method: 'DELETE' });
        if (res.ok) {
            fetchEntries();
        }
    };

    // 反馈审批
    const handleFeedbackAction = async (id: string, action: 'approve' | 'archive') => {
        const res = await fetch('/api/knowledge/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, action }),
        });
        if (res.ok) {
            fetchEntries();
        }
    };

    // 编辑条目
    const handleEdit = (entry: KnowledgeEntry) => {
        setEditingEntry(entry);
        setShowForm(true);
    };

    // 打开新建表单
    const handleOpenCreate = () => {
        setEditingEntry(null);
        setShowForm(true);
    };

    return (
        <>
            <PageHeader
                title={t('pageTitle')}
                description={t('pageDescription')}
                icon={BookOpenIcon}
                actions={
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/knowledge/interviews" className="inline-flex items-center whitespace-nowrap">
                                <MessageCircle className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                                知识访谈
                            </Link>
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
                            <Upload className="w-3.5 h-3.5 mr-1.5" />
                            {t('importMarkdown')}
                        </Button>
                        <Button size="sm" onClick={handleOpenCreate}>
                            <Plus className="w-3.5 h-3.5 mr-1.5" />
                            {t('addEntry')}
                        </Button>
                    </div>
                }
            />

            <div className="flex-1 overflow-y-auto">
                <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
                    {/* Tabs */}
                    <Tabs value={activeTab} onValueChange={v => setActiveTab(v as TabValue)}>
                        <TabsList>
                            <TabsTrigger value="all">
                                {t('tabAll')}
                                {entries.length > 0 && (
                                    <span className="ml-1.5 text-[10px] opacity-60">{entries.length}</span>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="dimensions">
                                {t('tabDimensions')}
                                <span className="ml-1.5 text-[10px] opacity-60">
                                    {entries.filter(e => e.category === 'dimension').length}
                                </span>
                            </TabsTrigger>
                            <TabsTrigger value="feedback">
                                {t('tabFeedback')}
                                {feedbackEntries.length > 0 && (
                                    <span className="ml-1.5 px-1 py-0.5 text-[10px] rounded-full bg-amber-500/20 text-amber-600">
                                        {feedbackEntries.length}
                                    </span>
                                )}
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {/* 表单（创建/编辑） */}
                    {showForm && (
                        <div className="border border-border rounded-xl p-5 bg-card shadow-sm">
                            <h2 className="text-sm font-medium mb-4">
                                {editingEntry ? '编辑知识条目' : '新建知识条目'}
                            </h2>
                            <KnowledgeEntryForm
                                entry={editingEntry}
                                onSubmit={editingEntry ? handleUpdate : handleCreate}
                                onCancel={() => { setShowForm(false); setEditingEntry(null); }}
                            />
                        </div>
                    )}

                    {/* Loading */}
                    {loading && (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                    )}

                    {/* 内容区域 */}
                    {!loading && activeTab === 'feedback' && (
                        feedbackEntries.length > 0 ? (
                            <FeedbackReviewList
                                entries={feedbackEntries}
                                onAction={handleFeedbackAction}
                            />
                        ) : (
                            <EmptyState
                                title={t('noFeedback')}
                                description={t('noFeedbackDescription')}
                            />
                        )
                    )}

                    {!loading && activeTab !== 'feedback' && (
                        displayEntries.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {displayEntries.map(entry => (
                                    <KnowledgeEntryCard
                                        key={entry.id}
                                        entry={entry}
                                        onEdit={handleEdit}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </div>
                        ) : (
                            <EmptyState
                                title={activeTab === 'dimensions' ? t('noDimensions') : t('noEntries')}
                                description={activeTab === 'dimensions' ? t('noDimensionsDescription') : t('noEntriesDescription')}
                            />
                        )
                    )}
                </div>
            </div>

            {/* 导入弹窗 */}
            <KnowledgeImportDialog
                open={showImport}
                onClose={() => setShowImport(false)}
                onImportComplete={fetchEntries}
            />
        </>
    );
}

function EmptyState({ title, description }: { title: string; description: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpenIcon className="w-10 h-10 text-muted-foreground/30 mb-4" />
            <h3 className="text-sm font-medium text-muted-foreground mb-1">{title}</h3>
            <p className="text-xs text-muted-foreground/70 max-w-sm">{description}</p>
        </div>
    );
}
