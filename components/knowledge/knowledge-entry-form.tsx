'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import type { KnowledgeEntry, KnowledgeCategory, KnowledgeCheckType, KnowledgeStatus } from '@/data/knowledge.schema';
import { CATEGORY_LABELS, CHECK_TYPE_LABELS, STATUS_LABELS } from '@/data/knowledge.schema';

interface KnowledgeEntryFormProps {
    entry?: KnowledgeEntry | null;
    onSubmit: (data: any) => Promise<void>;
    onCancel: () => void;
}

export function KnowledgeEntryForm({ entry, onSubmit, onCancel }: KnowledgeEntryFormProps) {
    const isEdit = !!entry;

    const [title, setTitle] = useState(entry?.title || '');
    const [content, setContent] = useState(entry?.content || '');
    const [category, setCategory] = useState<KnowledgeCategory>(entry?.category || 'general');
    const [status, setStatus] = useState<KnowledgeStatus>(entry?.status || 'draft');
    const [tags, setTags] = useState(entry?.tags?.join(', ') || '');
    const [checkType, setCheckType] = useState<KnowledgeCheckType | ''>(entry?.checkType || '');
    const [promptTemplate, setPromptTemplate] = useState(entry?.promptTemplate || '');
    const [criteriaJson, setCriteriaJson] = useState(
        entry?.criteria ? JSON.stringify(entry.criteria, null, 2) : ''
    );
    const [saving, setSaving] = useState(false);

    const isDimension = category === 'dimension';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;

        setSaving(true);
        try {
            const data: any = {
                title: title.trim(),
                content: content.trim(),
                category,
                status,
                tags: tags.split(',').map(t => t.trim()).filter(Boolean),
            };

            if (isDimension) {
                if (checkType) data.checkType = checkType;
                if (promptTemplate.trim()) data.promptTemplate = promptTemplate.trim();
                if (criteriaJson.trim()) {
                    try {
                        data.criteria = JSON.parse(criteriaJson);
                    } catch {
                        // 忽略无效 JSON
                    }
                }
            }

            await onSubmit(data);
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* 标题 */}
            <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs font-medium">标题</Label>
                <Input
                    id="title"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="知识条目标题"
                    required
                />
            </div>

            {/* 类别 + 状态 */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <Label className="text-xs font-medium">类别</Label>
                    <select
                        value={category}
                        onChange={e => setCategory(e.target.value as KnowledgeCategory)}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        {(Object.keys(CATEGORY_LABELS) as KnowledgeCategory[]).map(key => (
                            <option key={key} value={key}>{CATEGORY_LABELS[key]}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-medium">状态</Label>
                    <select
                        value={status}
                        onChange={e => setStatus(e.target.value as KnowledgeStatus)}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        {(Object.keys(STATUS_LABELS) as KnowledgeStatus[]).map(key => (
                            <option key={key} value={key}>{STATUS_LABELS[key]}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* 标签 */}
            <div className="space-y-1.5">
                <Label className="text-xs font-medium">标签（逗号分隔）</Label>
                <Input
                    value={tags}
                    onChange={e => setTags(e.target.value)}
                    placeholder="标签1, 标签2, ..."
                />
            </div>

            {/* 内容 */}
            <div className="space-y-1.5">
                <Label className="text-xs font-medium">内容 (Markdown)</Label>
                <textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="知识条目内容，支持 Markdown"
                    rows={8}
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y min-h-[120px]"
                />
            </div>

            {/* 维度专属字段 */}
            {isDimension && (
                <div className="space-y-4 p-3 rounded-lg border border-purple-500/20 bg-purple-500/5">
                    <p className="text-xs font-medium text-purple-600">维度专属配置</p>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium">检查方式</Label>
                        <select
                            value={checkType}
                            onChange={e => setCheckType(e.target.value as KnowledgeCheckType)}
                            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <option value="">请选择</option>
                            {(Object.keys(CHECK_TYPE_LABELS) as KnowledgeCheckType[]).map(key => (
                                <option key={key} value={key}>{CHECK_TYPE_LABELS[key]}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Prompt 模板</Label>
                        <textarea
                            value={promptTemplate}
                            onChange={e => setPromptTemplate(e.target.value)}
                            placeholder={'审核提示词，使用 {{context}} 占位符插入 RAG 上下文'}
                            rows={5}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                        />
                    </div>

                    {checkType === 'rule_based' && (
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">规则参数 (JSON)</Label>
                            <textarea
                                value={criteriaJson}
                                onChange={e => setCriteriaJson(e.target.value)}
                                placeholder={'{\n  "minSeconds": 15,\n  "maxSeconds": 60\n}'}
                                rows={4}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                            />
                        </div>
                    )}
                </div>
            )}

            {/* 操作按钮 */}
            <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                    取消
                </Button>
                <Button type="submit" size="sm" disabled={saving || !title.trim() || !content.trim()}>
                    {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                    {isEdit ? '保存修改' : '创建'}
                </Button>
            </div>
        </form>
    );
}
