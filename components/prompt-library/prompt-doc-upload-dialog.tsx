'use client';

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { Bold, FileUp, ImagePlus, Italic, List, ListOrdered, Loader2, Type, Underline, Video, X } from 'lucide-react';
import { uploadFileDirect } from '@/lib/client/direct-upload';
import type { PromptDoc } from '@/lib/prompt-library/types';

type PromptDocUploadDialogProps = {
  onCreated: (doc: PromptDoc) => void;
  categoryOptions?: string[];
  onCategoryCreated?: (category: string) => void;
};

function fileTitle(file: File) {
  return file.name.replace(/\.[^.]+$/, '').trim() || file.name;
}

function isEmptyRichText(value: string) {
  return value
    .replace(/<img[^>]*>/gi, '')
    .replace(/<video[\s\S]*?<\/video>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim().length === 0;
}

function escapeAttribute(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function unwrapRichTextContent(value: string) {
  if (!value) return '';
  if (!value.includes('data-doc-richtext')) return value;

  const match = value.match(/<div[^>]*data-doc-richtext=["']true["'][^>]*>([\s\S]*)<\/div>\s*$/i);
  return match?.[1] ?? value;
}

export function PromptDocUploadDialog({ onCreated, categoryOptions = [], onCategoryCreated }: PromptDocUploadDialogProps) {
  const defaultCategory = categoryOptions[0] || 'general';
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(defaultCategory);
  const [categories, setCategories] = useState(() => Array.from(new Set([defaultCategory, ...categoryOptions].filter(Boolean))));
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCategories((current) => Array.from(new Set([...current, ...categoryOptions].filter(Boolean))));
  }, [categoryOptions]);

  function reset() {
    setTitle('');
    setCategory(categories[0] || 'general');
    setAddingCategory(false);
    setNewCategoryName('');
    setContent('');
    setFile(null);
    setProgress(0);
    setError(null);
  }

  function addCategory() {
    const value = newCategoryName.trim();
    if (!value) {
      setError('请填写目录名称');
      return;
    }

    setCategories((current) => Array.from(new Set([...current, value])));
    setCategory(value);
    setNewCategoryName('');
    setAddingCategory(false);
    setError(null);
    onCategoryCreated?.(value);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      setError('请填写文档标题');
      return;
    }
    if ((!content.trim() || isEmptyRichText(content)) && !file) {
      setError('请填写文档正文，或选择一个附件');
      return;
    }

    setSubmitting(true);
    setError(null);
    setProgress(0);

    try {
      let attachmentUrl: string | undefined;
      let attachmentName: string | undefined;

      if (file) {
        const uploadResult = await uploadFileDirect(file, {
          onProgress: setProgress,
        });
        attachmentUrl = uploadResult.fileUrl;
        attachmentName = file.name;
      }

      const response = await fetch('/api/prompt-library/docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim() || undefined,
          category: category.trim() || undefined,
          tags: [],
          attachmentUrl,
          attachmentName,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || '创建文档失败');
      }

      const created = await response.json();
      onCreated(created.doc);
      reset();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败，请重试');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-cyan-400 px-4 text-sm font-semibold text-black transition hover:bg-cyan-300"
      >
        <FileUp className="h-4 w-4" />
        上传文档
      </button>

      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 text-white backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            className="flex max-h-[calc(100vh-32px)] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-white/12 bg-[#090909] shadow-2xl shadow-black"
          >
            <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">上传提示库文档</h2>
                <p className="mt-1 text-xs text-white/50">正文保存到 knowledge_entries，正文图片和视频上传到 OSS。</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!submitting) setOpen(false);
                }}
                className="rounded-full p-1.5 text-white/55 transition hover:bg-white/10 hover:text-white"
                aria-label="关闭"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="grid gap-4 overflow-y-auto px-5 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm">
                  <span className="text-white/75">标题</span>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    disabled={submitting}
                    className="h-10 rounded-lg border border-white/15 bg-white/[0.06] px-3 outline-none focus:border-cyan-300"
                  />
                </label>
                <div className="grid gap-2 text-sm">
                  <span className="text-white/75">分类</span>
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    disabled={submitting}
                    className="h-10 rounded-lg border border-white/15 bg-[#111] px-3 outline-none focus:border-cyan-300"
                  >
                    {categories.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      setAddingCategory(true);
                      setError(null);
                    }}
                    className="w-fit text-xs text-cyan-300 transition hover:text-cyan-200 disabled:opacity-50"
                  >
                    新增目录
                  </button>
                  {addingCategory && (
                    <div className="grid gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-3">
                      <input
                        value={newCategoryName}
                        onChange={(event) => setNewCategoryName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            addCategory();
                          }
                          if (event.key === 'Escape') {
                            event.preventDefault();
                            setAddingCategory(false);
                            setNewCategoryName('');
                          }
                        }}
                        disabled={submitting}
                        autoFocus
                        placeholder="输入新目录名称"
                        className="h-9 rounded-lg border border-white/15 bg-[#111] px-3 text-sm outline-none focus:border-cyan-300"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={addCategory}
                          className="h-8 rounded-lg bg-cyan-400 px-3 text-xs font-semibold text-black transition hover:bg-cyan-300 disabled:opacity-50"
                        >
                          添加
                        </button>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => {
                            setAddingCategory(false);
                            setNewCategoryName('');
                          }}
                          className="h-8 rounded-lg border border-white/15 px-3 text-xs text-white/70 transition hover:bg-white/10 disabled:opacity-50"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <RichTextEditor value={content} disabled={submitting} onChange={setContent} onUploadProgress={setProgress} />

              <label className="grid gap-2 text-sm">
                <span className="text-white/75">附件（可选）</span>
                <input
                  type="file"
                  accept=".md,.txt,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*,video/*"
                  disabled={submitting}
                  onChange={(event) => {
                    const nextFile = event.target.files?.[0] ?? null;
                    setFile(nextFile);
                    if (nextFile && !title.trim()) setTitle(fileTitle(nextFile));
                  }}
                  className="rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-black"
                />
              </label>

              {progress > 0 && progress < 100 && (
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-cyan-300 transition-all" style={{ width: `${progress}%` }} />
                </div>
              )}

              {error && <p className="rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
            </div>

            <footer className="flex justify-end gap-3 border-t border-white/10 px-5 py-4">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setOpen(false)}
                className="h-10 rounded-lg border border-white/18 px-4 text-sm text-white/75 transition hover:bg-white/10 disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-cyan-400 px-4 text-sm font-semibold text-black transition hover:bg-cyan-300 disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? '保存中' : '保存文档'}
              </button>
            </footer>
          </form>
        </div>
      )}
    </>
  );
}

function RichTextEditor({
  value,
  disabled,
  onChange,
  onUploadProgress,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onUploadProgress: (progress: number) => void;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);
  const [fontSize, setFontSize] = useState('16');
  const [letterSpacing, setLetterSpacing] = useState('0');
  const [lineHeight, setLineHeight] = useState('1.7');
  const [uploadingMedia, setUploadingMedia] = useState(false);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (!value) {
      editor.innerHTML = '';
      return;
    }
    if (!editor.innerHTML.trim()) {
      editor.innerHTML = unwrapRichTextContent(value);
    }
  }, [value]);

  function serializeContent(nextFontSize = fontSize, nextLetterSpacing = letterSpacing, nextLineHeight = lineHeight) {
    const editor = editorRef.current;
    const html = editor?.innerHTML.trim() ?? '';
    if (!html) {
      onChange('');
      return;
    }
    onChange(
      `<div data-doc-richtext="true" style="font-size:${nextFontSize}px;letter-spacing:${nextLetterSpacing}px;line-height:${nextLineHeight};">${html}</div>`,
    );
  }

  function focusEditor() {
    editorRef.current?.focus();
  }

  function runCommand(command: string) {
    if (disabled) return;
    focusEditor();
    document.execCommand(command, false);
    serializeContent();
  }

  function applyFontSize(nextSize: string) {
    setFontSize(nextSize);
    const editor = editorRef.current;
    if (!editor) return;
    editor.style.fontSize = `${nextSize}px`;
    serializeContent(nextSize, letterSpacing, lineHeight);
  }

  function applyLetterSpacing(nextSpacing: string) {
    setLetterSpacing(nextSpacing);
    const editor = editorRef.current;
    if (!editor) return;
    editor.style.letterSpacing = `${nextSpacing}px`;
    serializeContent(fontSize, nextSpacing, lineHeight);
  }

  function applyLineHeight(nextLineHeight: string) {
    setLineHeight(nextLineHeight);
    const editor = editorRef.current;
    if (!editor) return;
    editor.style.lineHeight = nextLineHeight;
    serializeContent(fontSize, letterSpacing, nextLineHeight);
  }

  function insertHtml(html: string) {
    focusEditor();
    document.execCommand('insertHTML', false, html);
    serializeContent();
  }

  async function handleMediaChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    event.target.value = '';
    if (!selected) return;

    setUploadingMedia(true);
    onUploadProgress(0);

    try {
      const uploadResult = await uploadFileDirect(selected, { onProgress: onUploadProgress });
      const url = escapeAttribute(uploadResult.fileUrl);
      const name = escapeAttribute(selected.name);

      if (selected.type.startsWith('video/')) {
        insertHtml(
          `<p><video src="${url}" controls playsinline style="max-width:100%;border-radius:8px;background:#000;margin:12px 0;"></video></p>`,
        );
      } else {
        insertHtml(`<p><img src="${url}" alt="${name}" style="max-width:100%;border-radius:8px;margin:12px 0;" /></p>`);
      }
    } finally {
      setUploadingMedia(false);
      onUploadProgress(100);
    }
  }

  return (
    <div className="grid gap-2 text-sm">
      <span className="text-white/75">正文</span>
      <div className="rounded-lg border border-white/15 bg-white/[0.04]">
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 p-2">
          <label className="flex items-center gap-1 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs text-white/65">
            <Type className="h-3.5 w-3.5" />
            <select
              value={fontSize}
              disabled={disabled}
              onChange={(event) => applyFontSize(event.target.value)}
              className="bg-transparent outline-none"
            >
              {['14', '16', '18', '20', '24', '28', '32'].map((size) => (
                <option key={size} value={size} className="bg-[#111]">
                  {size}px
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-1 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs text-white/65">
            字距
            <input
              type="number"
              min="0"
              max="8"
              step="0.5"
              value={letterSpacing}
              disabled={disabled}
              onChange={(event) => applyLetterSpacing(event.target.value)}
              className="w-12 bg-transparent outline-none"
            />
          </label>

          <label className="flex items-center gap-1 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs text-white/65">
            行距
            <input
              type="number"
              min="1"
              max="3"
              step="0.1"
              value={lineHeight}
              disabled={disabled}
              onChange={(event) => applyLineHeight(event.target.value)}
              className="w-12 bg-transparent outline-none"
            />
          </label>

          <ToolbarButton label="加粗" disabled={disabled} onClick={() => runCommand('bold')}>
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="斜体" disabled={disabled} onClick={() => runCommand('italic')}>
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="下划线" disabled={disabled} onClick={() => runCommand('underline')}>
            <Underline className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="无序列表" disabled={disabled} onClick={() => runCommand('insertUnorderedList')}>
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="有序列表" disabled={disabled} onClick={() => runCommand('insertOrderedList')}>
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="插入图片或视频" disabled={disabled || uploadingMedia} onClick={() => mediaInputRef.current?.click()}>
            {uploadingMedia ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          </ToolbarButton>
          <Video className="h-4 w-4 text-white/35" />
          <input ref={mediaInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleMediaChange} />
        </div>

        <div
          ref={editorRef}
          contentEditable={!disabled}
          suppressContentEditableWarning
          onInput={() => serializeContent()}
          onBlur={() => serializeContent()}
          className="rich-doc-editor min-h-72 resize-y overflow-auto rounded-b-lg px-4 py-3 text-white outline-none empty:before:text-white/30 focus:ring-1 focus:ring-cyan-300"
          style={{ fontSize: `${fontSize}px`, letterSpacing: `${letterSpacing}px`, lineHeight }}
        />
      </div>
    </div>
  );
}

function ToolbarButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={label}
      aria-label={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-black/30 text-white/70 transition hover:border-cyan-300/50 hover:text-white disabled:opacity-40"
    >
      {children}
    </button>
  );
}
