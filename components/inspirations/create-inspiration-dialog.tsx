'use client';

import { useState, useRef, useCallback } from 'react';
import { X, Mic, Camera, ImagePlus, Loader2 } from 'lucide-react';
import { useVoiceRecorder } from './use-voice-recorder';

interface CreateInspirationDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

/* ── 样式常量 ── */

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
    background: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 16,
    boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  dialogHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 20px',
    borderBottom: '1px solid hsl(var(--border))',
  },
  dialogTitle: {
    fontSize: 15,
    fontWeight: 600 as const,
    color: 'hsl(var(--foreground))',
    margin: 0,
  },
  closeBtn: {
    padding: 4,
    borderRadius: 6,
    border: 'none',
    background: 'transparent',
    color: 'hsl(var(--muted-foreground) / 0.6)',
    cursor: 'pointer',
    transition: 'color 0.15s ease',
  },
  body: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: 20,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 16,
  },
  titleInput: {
    width: '100%',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    fontSize: 16,
    fontWeight: 500 as const,
    color: 'hsl(var(--foreground))',
    padding: 0,
  },
  textarea: {
    width: '100%',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    fontSize: 14,
    color: 'hsl(var(--muted-foreground))',
    lineHeight: 1.6,
    resize: 'none' as const,
    padding: 0,
    minHeight: 100,
  },
  mediaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
  },
  mediaItem: {
    position: 'relative' as const,
    aspectRatio: '1',
    borderRadius: 8,
    overflow: 'hidden',
    background: 'hsl(var(--muted))',
  },
  mediaRemoveBtn: {
    position: 'absolute' as const,
    top: 4,
    right: 4,
    padding: 4,
    borderRadius: 100,
    border: 'none',
    background: 'rgba(0,0,0,0.6)',
    color: '#fff',
    cursor: 'pointer',
    opacity: 0,
    transition: 'opacity 0.15s ease',
  },
  recordingBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    borderRadius: 10,
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.2)',
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: '#ef4444',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  recordingText: {
    fontSize: 13,
    fontWeight: 500 as const,
    color: '#ef4444',
    flex: 1,
  },
  stopBtn: {
    padding: '4px 12px',
    fontSize: 12,
    fontWeight: 500 as const,
    color: '#fff',
    background: '#ef4444',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  audioBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 12px',
    borderRadius: 10,
    background: 'hsl(var(--muted))',
    border: '1px solid hsl(var(--border))',
  },
  tagWrap: {
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
    color: 'hsl(var(--muted-foreground))',
    background: 'hsl(var(--border))',
    border: 'none',
  },
  tagRemoveBtn: {
    padding: 0,
    border: 'none',
    background: 'transparent',
    color: 'hsl(var(--muted-foreground) / 0.4)',
    cursor: 'pointer',
    display: 'flex',
  },
  tagInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    fontSize: 13,
    color: 'hsl(var(--muted-foreground))',
    padding: 0,
  },
  tagAddBtn: {
    fontSize: 12,
    fontWeight: 500 as const,
    color: '#F97316',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    borderTop: '1px solid hsl(var(--border))',
  },
  toolBtnGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
  },
  toolBtn: {
    padding: 8,
    borderRadius: 8,
    border: 'none',
    background: 'transparent',
    color: 'hsl(var(--muted-foreground) / 0.5)',
    cursor: 'pointer',
    transition: 'color 0.15s ease, background 0.15s ease',
  },
  saveBtn: (disabled: boolean) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 18px',
    fontSize: 13,
    fontWeight: 600 as const,
    color: disabled ? 'rgba(0,0,0,0.4)' : '#000',
    background: disabled ? 'hsl(var(--muted-foreground) / 0.4)' : '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'opacity 0.15s ease',
  }),
} as const;

export function CreateInspirationDialog({ open, onClose, onCreated }: CreateInspirationDialogProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [mediaFiles, setMediaFiles] = useState<{ file: File; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const voiceRecorder = useVoiceRecorder();

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/inspirations/upload', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || '上传失败');
    }
    const data = await res.json();
    return data.url;
  };

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 9 - mediaFiles.length).map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setMediaFiles(prev => [...prev, ...newFiles]);
  }, [mediaFiles.length]);

  const removeMedia = (index: number) => {
    setMediaFiles(prev => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].preview);
      next.splice(index, 1);
      return next;
    });
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag) && tags.length < 10) {
      setTags(prev => [...prev, tag]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  };

  const handleSave = async () => {
    if (saving || uploading) return;
    if (!title.trim() && !content.trim() && mediaFiles.length === 0 && !voiceRecorder.audioBlob) {
      return;
    }

    try {
      setSaving(true);
      setUploading(true);

      const mediaUrls: string[] = [];
      for (const { file } of mediaFiles) {
        const url = await uploadFile(file);
        mediaUrls.push(url);
      }

      let voiceUrl: string | undefined;
      if (voiceRecorder.audioBlob) {
        const ext = voiceRecorder.audioBlob.type.includes('mp4') ? 'm4a' :
                    voiceRecorder.audioBlob.type.includes('ogg') ? 'ogg' : 'webm';
        const voiceFile = new File([voiceRecorder.audioBlob], `voice.${ext}`, {
          type: voiceRecorder.audioBlob.type,
        });
        voiceUrl = await uploadFile(voiceFile);
      }

      setUploading(false);

      const source = voiceRecorder.audioBlob ? 'voice' :
                     mediaFiles.some(f => f.file.type.startsWith('image/')) ? 'camera' : 'manual';

      const res = await fetch('/api/inspirations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || undefined,
          content: content.trim() || undefined,
          media_urls: mediaUrls,
          voice_url: voiceUrl,
          tags,
          source,
          reference_url: referenceUrl.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || '保存失败');
      }

      resetForm();
      onCreated();
      onClose();
    } catch (error) {
      console.error('保存灵感失败:', error);
      setUploading(false);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setTags([]);
    setTagInput('');
    setReferenceUrl('');
    mediaFiles.forEach(f => URL.revokeObjectURL(f.preview));
    setMediaFiles([]);
    voiceRecorder.reset();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const canSave = !saving && (
    title.trim() || content.trim() || mediaFiles.length > 0 || voiceRecorder.audioBlob
  );

  if (!open) return null;

  return (
    <div style={S.overlay}>
      {/* 遮罩 */}
      <div style={S.backdrop} onClick={handleClose} />

      {/* 对话框 */}
      <div style={S.dialog}>
        {/* 头部 */}
        <div style={S.dialogHeader}>
          <h2 style={S.dialogTitle}>记录灵感</h2>
          <button
            onClick={handleClose}
            style={S.closeBtn}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'hsl(var(--muted-foreground))'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'hsl(var(--muted-foreground) / 0.6)'; }}
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* 内容区域 */}
        <div style={S.body}>
          {/* 标题 */}
          <input
            type="text"
            placeholder="标题（可选）"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            style={S.titleInput}
          />

          {/* 内容 */}
          <textarea
            placeholder="记录你的灵感..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={5000}
            rows={4}
            style={S.textarea}
          />

          {/* 媒体预览 */}
          {mediaFiles.length > 0 && (
            <div style={S.mediaGrid}>
              {mediaFiles.map((item, i) => (
                <div
                  key={i}
                  style={S.mediaItem}
                  onMouseEnter={(e) => {
                    const btn = e.currentTarget.querySelector('[data-remove]') as HTMLElement;
                    if (btn) btn.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    const btn = e.currentTarget.querySelector('[data-remove]') as HTMLElement;
                    if (btn) btn.style.opacity = '0';
                  }}
                >
                  {item.file.type.startsWith('video/') ? (
                    <video
                      src={item.preview}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.preview}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                  <button
                    data-remove
                    onClick={() => removeMedia(i)}
                    style={S.mediaRemoveBtn}
                  >
                    <X style={{ width: 12, height: 12 }} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 语音录制中 */}
          {voiceRecorder.state === 'recording' && (
            <div style={S.recordingBar}>
              <div style={S.recordingDot} />
              <span style={S.recordingText}>
                录音中 {Math.floor(voiceRecorder.duration / 60).toString().padStart(2, '0')}:
                {(voiceRecorder.duration % 60).toString().padStart(2, '0')}
              </span>
              <button onClick={voiceRecorder.stop} style={S.stopBtn}>
                停止
              </button>
            </div>
          )}

          {/* 语音预览 */}
          {voiceRecorder.state === 'stopped' && voiceRecorder.audioUrl && (
            <div style={S.audioBar}>
              <Mic style={{ width: 14, height: 14, color: 'hsl(var(--muted-foreground) / 0.6)', flexShrink: 0 }} />
              <audio src={voiceRecorder.audioUrl} controls style={{ flex: 1, height: 28 }} />
              <button
                onClick={voiceRecorder.reset}
                style={{ ...S.closeBtn, padding: 4 }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'hsl(var(--muted-foreground))'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'hsl(var(--muted-foreground) / 0.6)'; }}
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
          )}

          {/* 参考链接 */}
          <input
            type="url"
            placeholder="参考链接（可选，如竞品视频 URL）"
            value={referenceUrl}
            onChange={(e) => setReferenceUrl(e.target.value)}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 13,
              color: 'hsl(var(--muted-foreground))',
              padding: 0,
            }}
          />

          {/* 标签 */}
          <div style={S.tagWrap}>
            {tags.length > 0 && (
              <div style={S.tagList}>
                {tags.map(tag => (
                  <span key={tag} style={S.tagChip}>
                    {tag}
                    <button onClick={() => removeTag(tag)} style={S.tagRemoveBtn}>
                      <X style={{ width: 12, height: 12 }} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="text"
                placeholder="添加标签..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                style={S.tagInput}
              />
              {tagInput.trim() && (
                <button onClick={addTag} style={S.tagAddBtn}>
                  添加
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 底部工具栏 */}
        <div style={S.footer}>
          <div style={S.toolBtnGroup}>
            {voiceRecorder.isSupported && voiceRecorder.state === 'idle' && (
              <button
                onClick={voiceRecorder.start}
                style={S.toolBtn}
                title="语音录制"
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'hsl(var(--muted-foreground))';
                  e.currentTarget.style.background = 'hsl(var(--border))';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'hsl(var(--muted-foreground) / 0.5)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <Mic style={{ width: 20, height: 20 }} />
              </button>
            )}
            <button
              onClick={() => cameraInputRef.current?.click()}
              style={S.toolBtn}
              title="拍摄"
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'hsl(var(--muted-foreground))';
                e.currentTarget.style.background = 'hsl(var(--border))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'hsl(var(--muted-foreground) / 0.5)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <Camera style={{ width: 20, height: 20 }} />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={S.toolBtn}
              title="上传图片/视频"
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'hsl(var(--muted-foreground))';
                e.currentTarget.style.background = 'hsl(var(--border))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'hsl(var(--muted-foreground) / 0.5)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <ImagePlus style={{ width: 20, height: 20 }} />
            </button>
          </div>

          {/* 保存按钮 */}
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={S.saveBtn(!canSave)}
            onMouseEnter={(e) => { if (canSave) e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            {(saving || uploading) && (
              <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
            )}
            {uploading ? '上传中...' : saving ? '保存中...' : '保存'}
          </button>
        </div>

        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleFileSelect(e.target.files)}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*,video/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={(e) => handleFileSelect(e.target.files)}
        />
      </div>

      {/* Animations */}
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
      `}</style>
    </div>
  );
}
