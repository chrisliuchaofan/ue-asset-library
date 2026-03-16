'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, X } from 'lucide-react';
import type { KnowledgeCategory } from '@/data/knowledge.schema';
import { CATEGORY_LABELS } from '@/data/knowledge.schema';

interface KnowledgeImportDialogProps {
    open: boolean;
    onClose: () => void;
    onImportComplete: () => void;
}

interface ParsedChunk {
    title: string;
    content: string;
}

export function KnowledgeImportDialog({ open, onClose, onImportComplete }: KnowledgeImportDialogProps) {
    const [markdown, setMarkdown] = useState('');
    const [category, setCategory] = useState<KnowledgeCategory>('general');
    const [chunks, setChunks] = useState<ParsedChunk[]>([]);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<{ success: number; total: number } | null>(null);

    if (!open) return null;

    const handlePreview = () => {
        const lines = markdown.split('\n');
        const parsed: ParsedChunk[] = [];
        let currentTitle = '';
        let currentLines: string[] = [];

        for (const line of lines) {
            if (line.startsWith('## ')) {
                if (currentTitle) {
                    const content = currentLines.join('\n').trim();
                    if (content) parsed.push({ title: currentTitle, content });
                }
                currentTitle = line.replace(/^## /, '').trim();
                currentLines = [];
            } else {
                currentLines.push(line);
            }
        }
        if (currentTitle) {
            const content = currentLines.join('\n').trim();
            if (content) parsed.push({ title: currentTitle, content });
        }

        setChunks(parsed);
    };

    const handleImport = async () => {
        setImporting(true);
        setResult(null);
        try {
            const res = await fetch('/api/knowledge/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ markdown, category }),
            });
            const data = await res.json();
            setResult({ success: data.success || 0, total: data.total || 0 });

            if (data.success > 0) {
                onImportComplete();
            }
        } catch (err: any) {
            console.error('导入失败:', err);
        } finally {
            setImporting(false);
        }
    };

    const handleClose = () => {
        setMarkdown('');
        setChunks([]);
        setResult(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <h2 className="text-sm font-medium">Markdown 导入</h2>
                    </div>
                    <button onClick={handleClose} className="p-1 rounded hover:bg-muted transition-colors">
                        <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    <p className="text-xs text-muted-foreground">
                        粘贴 Markdown 内容，按 <code className="px-1 py-0.5 bg-muted rounded text-[10px]">## </code> 标题自动分块创建知识条目
                    </p>

                    {/* 类别选择 */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium">导入类别</Label>
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

                    {/* Markdown 输入 */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Markdown 内容</Label>
                        <textarea
                            value={markdown}
                            onChange={e => { setMarkdown(e.target.value); setChunks([]); setResult(null); }}
                            placeholder={'## 标题1\n内容...\n\n## 标题2\n内容...'}
                            rows={10}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                        />
                    </div>

                    {/* 预览按钮 */}
                    <Button type="button" variant="outline" size="sm" onClick={handlePreview}>
                        预览分块
                    </Button>

                    {/* 分块预览 */}
                    {chunks.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">
                                将创建 <span className="font-medium text-foreground">{chunks.length}</span> 条知识条目：
                            </p>
                            <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-muted/30 rounded-lg border border-border/50">
                                {chunks.map((chunk, i) => (
                                    <div key={i} className="flex items-center gap-2 py-1">
                                        <Badge variant="secondary" className="text-[10px] shrink-0">{i + 1}</Badge>
                                        <span className="text-xs text-foreground truncate">{chunk.title}</span>
                                        <span className="text-[10px] text-muted-foreground shrink-0">
                                            {chunk.content.length} 字
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 结果反馈 */}
                    {result && (
                        <div className={`text-xs p-3 rounded-lg ${result.success === result.total ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                            成功导入 {result.success}/{result.total} 条知识条目
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border">
                    <Button variant="ghost" size="sm" onClick={handleClose}>
                        关闭
                    </Button>
                    <Button
                        size="sm"
                        disabled={importing || chunks.length === 0}
                        onClick={handleImport}
                    >
                        {importing && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                        导入 {chunks.length > 0 ? `(${chunks.length} 条)` : ''}
                    </Button>
                </div>
            </div>
        </div>
    );
}
