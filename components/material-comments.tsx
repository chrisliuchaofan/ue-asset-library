'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { MessageCircle, Send, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CommentAuthor {
    username: string | null;
    email: string;
    avatar_url: string | null;
}

interface Comment {
    id: string;
    material_id: string;
    user_id: string;
    content: string;
    parent_id: string | null;
    created_at: string;
    author: CommentAuthor;
}

interface MaterialCommentsProps {
    materialId: string;
}

function getInitial(author: CommentAuthor): string {
    return (author.username || author.email || '?')[0].toUpperCase();
}

function getDisplayName(author: CommentAuthor): string {
    return author.username || author.email?.split('@')[0] || '未知用户';
}

function formatTime(dateStr: string): string {
    try {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        const diffHour = Math.floor(diffMs / 3600000);
        const diffDay = Math.floor(diffMs / 86400000);

        if (diffMin < 1) return '刚刚';
        if (diffMin < 60) return `${diffMin} 分钟前`;
        if (diffHour < 24) return `${diffHour} 小时前`;
        if (diffDay < 30) return `${diffDay} 天前`;
        return date.toLocaleDateString('zh-CN');
    } catch {
        return dateStr;
    }
}

export function MaterialComments({ materialId }: MaterialCommentsProps) {
    const { data: session } = useSession();
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchComments = useCallback(async () => {
        try {
            const res = await fetch(`/api/materials/${materialId}/comments`);
            if (res.ok) {
                const data = await res.json();
                setComments(data);
            }
        } catch (err) {
            console.error('加载评论失败:', err);
        } finally {
            setLoading(false);
        }
    }, [materialId]);

    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

    const handleSubmit = async () => {
        if (!newComment.trim() || submitting) return;

        setSubmitting(true);
        try {
            const res = await fetch(`/api/materials/${materialId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newComment.trim() }),
            });

            if (res.ok) {
                const comment = await res.json();
                setComments(prev => [...prev, comment]);
                setNewComment('');
            }
        } catch (err) {
            console.error('发送评论失败:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (commentId: string) => {
        setDeletingId(commentId);
        try {
            const res = await fetch(
                `/api/materials/${materialId}/comments?commentId=${commentId}`,
                { method: 'DELETE' }
            );
            if (res.ok) {
                setComments(prev => prev.filter(c => c.id !== commentId));
            }
        } catch (err) {
            console.error('删除评论失败:', err);
        } finally {
            setDeletingId(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
            <h3 className="text-base font-medium text-foreground flex items-center gap-2 mb-4">
                <MessageCircle className="w-4 h-4 text-primary" />
                团队评论
                {comments.length > 0 && (
                    <span className="text-xs text-muted-foreground font-normal">({comments.length})</span>
                )}
            </h3>

            {/* 评论列表 */}
            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
            ) : comments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                    暂无评论，成为第一个发表评论的人
                </p>
            ) : (
                <div className="space-y-3 mb-4">
                    {comments.map(comment => {
                        const isOwn = session?.user?.email === comment.author.email;
                        return (
                            <div key={comment.id} className="flex gap-3 group">
                                {/* Avatar */}
                                <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-[10px] font-medium text-primary">
                                        {getInitial(comment.author)}
                                    </span>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-foreground">
                                            {getDisplayName(comment.author)}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                            {formatTime(comment.created_at)}
                                        </span>
                                        {isOwn && (
                                            <button
                                                onClick={() => handleDelete(comment.id)}
                                                disabled={deletingId === comment.id}
                                                className="opacity-0 group-hover:opacity-100 ml-auto text-muted-foreground/50 hover:text-destructive transition-all"
                                                title="删除评论"
                                            >
                                                {deletingId === comment.id ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-3 h-3" />
                                                )}
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-sm text-foreground/90 mt-0.5 whitespace-pre-wrap break-words">
                                        {comment.content}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 评论输入 */}
            {session?.user ? (
                <div className="flex gap-2 pt-3 border-t border-border">
                    <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-[10px] font-medium text-primary">
                            {(session.user.name || session.user.email || '?')[0].toUpperCase()}
                        </span>
                    </div>
                    <div className="flex-1">
                        <textarea
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="写下你的评论..."
                            rows={2}
                            maxLength={2000}
                            className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/40 resize-none"
                        />
                        <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[10px] text-muted-foreground">
                                ⌘+Enter 发送
                            </span>
                            <Button
                                size="sm"
                                onClick={handleSubmit}
                                disabled={!newComment.trim() || submitting}
                            >
                                {submitting ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                    <Send className="w-3 h-3" />
                                )}
                                发送
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (
                <p className="text-xs text-muted-foreground text-center pt-3 border-t border-border">
                    登录后即可发表评论
                </p>
            )}
        </div>
    );
}
