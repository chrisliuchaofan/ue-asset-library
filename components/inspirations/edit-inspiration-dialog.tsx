'use client';

/**
 * 编辑灵感弹窗
 */

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { Inspiration } from '@/data/inspiration.schema';

const S = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    position: 'absolute' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(8px)',
  },
  dialog: {
    position: 'relative' as const,
    width: '100%',
    maxWidth: 520,
    margin: '0 16px',
    background: '#111',
    borderWidth: 1,
    borderStyle: 'solid' as const,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  title: {
    fontSize: 15,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.88)',
  },
  closeBtn: {
    padding: 4,
    borderRadius: 6,
    border: 'none',
    background: 'transparent',
    color: 'rgba(255,255,255,0.4)',
    cursor: 'pointer',
  },
  body: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: 20,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 16,
  },
  input: {
    width: '100%',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    fontSize: 16,
    fontWeight: 500,
    color: 'rgba(255,255,255,0.88)',
    padding: 0,
  },
  textarea: {
    width: '100%',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 1.6,
    resize: 'none' as const,
    padding: 0,
    minHeight: 120,
  },
  tagSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
  },
  tagList: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 6,
  },
  tagChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 10px',
    borderRadius: 100,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    background: 'rgba(255,255,255,0.06)',
    border: 'none',
  },
  tagRemoveBtn: {
    padding: 0,
    border: 'none',
    background: 'transparent',
    color: 'rgba(255,255,255,0.3)',
    cursor: 'pointer',
    display: 'flex',
  },
  tagInputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  tagInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    padding: 0,
  },
  tagAddBtn: {
    fontSize: 12,
    fontWeight: 500,
    color: '#F97316',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    padding: '12px 20px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  btnCancel: {
    padding: '8px 16px',
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    background: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderStyle: 'solid' as const,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    cursor: 'pointer',
  },
  btnSave: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 18px',
    fontSize: 13,
    fontWeight: 600,
    color: '#000',
    background: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
} as const;

interface EditInspirationDialogProps {
  open: boolean;
  inspiration: Inspiration | null;
  onClose: () => void;
  onUpdated: () => void;
}

export function EditInspirationDialog({
  open,
  inspiration,
  onClose,
  onUpdated,
}: EditInspirationDialogProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [status, setStatus] = useState<string>('new');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && inspiration) {
      setTitle(inspiration.title || '');
      setContent(inspiration.content || '');
      setTags(inspiration.tags || []);
      setReferenceUrl((inspiration as any).reference_url || '');
      setStatus((inspiration as any).status || 'new');
      setTagInput('');
    }
  }, [open, inspiration]);

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag) && tags.length < 10) {
      setTags(prev => [...prev, tag]);
      setTagInput('');
    }
  };

  const handleSave = async () => {
    if (saving || !inspiration) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/inspirations/${inspiration.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || null,
          content: content.trim() || null,
          tags,
          reference_url: referenceUrl.trim() || null,
          status,
        }),
      });

      if (res.ok) {
        onUpdated();
        onClose();
      }
    } catch (err) {
      console.error('Failed to update inspiration:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!open || !inspiration) return null;

  return (
    <div style={S.overlay}>
      <div style={S.backdrop} onClick={onClose} />
      <div style={S.dialog}>
        <div style={S.header}>
          <span style={S.title}>编辑灵感</span>
          <button style={S.closeBtn} onClick={onClose}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div style={S.body}>
          <input
            type="text"
            placeholder="标题（可选）"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={200}
            style={S.input}
          />

          <textarea
            placeholder="灵感内容..."
            value={content}
            onChange={e => setContent(e.target.value)}
            maxLength={5000}
            rows={5}
            style={S.textarea}
          />

          {/* 参考链接 */}
          <input
            type="url"
            placeholder="参考链接（可选）"
            value={referenceUrl}
            onChange={e => setReferenceUrl(e.target.value)}
            style={{ ...S.input, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}
          />

          {/* 状态 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>状态</span>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6,
                padding: '4px 8px',
                fontSize: 12,
                color: 'rgba(255,255,255,0.7)',
                outline: 'none',
              }}
            >
              <option value="new">新</option>
              <option value="used">已用</option>
              <option value="archived">归档</option>
            </select>
          </div>

          <div style={S.tagSection}>
            {tags.length > 0 && (
              <div style={S.tagList}>
                {tags.map(tag => (
                  <span key={tag} style={S.tagChip}>
                    {tag}
                    <button
                      onClick={() => setTags(prev => prev.filter(t => t !== tag))}
                      style={S.tagRemoveBtn}
                    >
                      <X style={{ width: 12, height: 12 }} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div style={S.tagInputRow}>
              <input
                type="text"
                placeholder="添加标签..."
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); addTag(); }
                }}
                style={S.tagInput}
              />
              {tagInput.trim() && (
                <button onClick={addTag} style={S.tagAddBtn}>添加</button>
              )}
            </div>
          </div>
        </div>

        <div style={S.footer}>
          <button style={S.btnCancel} onClick={onClose}>取消</button>
          <button
            style={{ ...S.btnSave, opacity: saving ? 0.6 : 1 }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving && <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />}
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
