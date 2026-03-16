'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, X, CheckCircle2, XCircle } from 'lucide-react';

interface DimensionOverrideDialogProps {
    open: boolean;
    materialId: string;
    dimensionId: string;
    dimensionTitle: string;
    currentPass: boolean;
    currentRationale: string;
    onClose: () => void;
    onOverride: (data: {
        materialId: string;
        dimensionId: string;
        dimensionTitle: string;
        newPass: boolean;
        rationale: string;
    }) => Promise<void>;
}

export function DimensionOverrideDialog({
    open,
    materialId,
    dimensionId,
    dimensionTitle,
    currentPass,
    currentRationale,
    onClose,
    onOverride,
}: DimensionOverrideDialogProps) {
    const [newPass, setNewPass] = useState(!currentPass);
    const [rationale, setRationale] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (!open) return null;

    const handleSubmit = async () => {
        if (!rationale.trim()) return;
        setSubmitting(true);
        try {
            await onOverride({
                materialId,
                dimensionId,
                dimensionTitle,
                newPass,
                rationale: rationale.trim(),
            });
            onClose();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <h2 className="text-sm font-medium">人工修正 - {dimensionTitle}</h2>
                    <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
                        <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4">
                    {/* 当前判定 */}
                    <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-xs font-medium text-muted-foreground">AI 当前判定：</span>
                            {currentPass ? (
                                <span className="text-xs text-emerald-600 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> 通过
                                </span>
                            ) : (
                                <span className="text-xs text-red-600 flex items-center gap-1">
                                    <XCircle className="w-3 h-3" /> 未通过
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">{currentRationale}</p>
                    </div>

                    {/* 修正后判定 */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium">修正为：</Label>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setNewPass(true)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                                    newPass
                                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
                                        : 'border-border text-muted-foreground hover:border-emerald-500/50'
                                }`}
                            >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                通过
                            </button>
                            <button
                                onClick={() => setNewPass(false)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                                    !newPass
                                        ? 'border-red-500 bg-red-500/10 text-red-600'
                                        : 'border-border text-muted-foreground hover:border-red-500/50'
                                }`}
                            >
                                <XCircle className="w-3.5 h-3.5" />
                                不通过
                            </button>
                        </div>
                    </div>

                    {/* 修正理由 */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium">修正理由</Label>
                        <textarea
                            value={rationale}
                            onChange={e => setRationale(e.target.value)}
                            placeholder="请说明修正理由，将作为知识反馈候选"
                            rows={3}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border">
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        取消
                    </Button>
                    <Button
                        size="sm"
                        disabled={submitting || !rationale.trim()}
                        onClick={handleSubmit}
                    >
                        {submitting && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                        确认修正
                    </Button>
                </div>
            </div>
        </div>
    );
}
