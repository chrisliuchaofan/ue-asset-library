'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Loader2, UploadCloud, X } from 'lucide-react';
import { uploadFileDirect } from '@/lib/client/direct-upload';
import { PROJECTS } from '@/lib/constants';
import type { PromptCase } from '@/lib/prompt-library/types';

const MATERIAL_TYPE_IMAGE = '\u56fe\u7247';
const MATERIAL_TYPE_AI_VIDEO = 'AI\u89c6\u9891';
const MATERIAL_TAG_STANDARD = '\u8fbe\u6807';
const MATERIAL_QUALITY_NORMAL = '\u5e38\u89c4';

type PromptCaseUploadDialogProps = {
  onCreated: (item: PromptCase) => void;
};

function splitTags(value: string) {
  return value
    .split(/[,，\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function fileTitle(file: File) {
  return file.name.replace(/\.[^.]+$/, '').trim() || file.name;
}

export function PromptCaseUploadDialog({ onCreated }: PromptCaseUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [category, setCategory] = useState('');
  const [tool, setTool] = useState('');
  const [tags, setTags] = useState('');
  const [project, setProject] = useState<string>(PROJECTS[0]);
  const [progress, setProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaType = useMemo(() => {
    if (!file) return 'image';
    return file.type.startsWith('video/') ? 'video' : 'image';
  }, [file]);

  function reset() {
    setFile(null);
    setTitle('');
    setDescription('');
    setPrompt('');
    setNegativePrompt('');
    setCategory('');
    setTool('');
    setTags('');
    setProject(PROJECTS[0]);
    setProgress(0);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError('请选择图片或视频文件');
      return;
    }
    if (!title.trim() || !prompt.trim()) {
      setError('请填写标题和提示词');
      return;
    }

    setSubmitting(true);
    setError(null);
    setProgress(0);

    try {
      const uploadResult = await uploadFileDirect(file, {
        onProgress: setProgress,
      });

      const materialResponse = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: title.trim(),
          source: 'internal',
          type: mediaType === 'video' ? MATERIAL_TYPE_AI_VIDEO : MATERIAL_TYPE_IMAGE,
          project,
          tag: MATERIAL_TAG_STANDARD,
          quality: [MATERIAL_QUALITY_NORMAL],
          thumbnail: mediaType === 'image' ? uploadResult.fileUrl : '',
          src: uploadResult.fileUrl,
          fileSize: file.size,
        }),
      });

      if (!materialResponse.ok) {
        const body = await materialResponse.json().catch(() => ({}));
        throw new Error(body.message || '创建素材记录失败');
      }

      const material = await materialResponse.json();
      const caseResponse = await fetch('/api/prompt-library/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          prompt: prompt.trim(),
          negativePrompt: negativePrompt.trim() || undefined,
          tool: tool.trim() || undefined,
          category: category.trim() || undefined,
          tags: splitTags(tags),
          mediaType,
          sourceMaterialId: material.id,
        }),
      });

      if (!caseResponse.ok) {
        const body = await caseResponse.json().catch(() => ({}));
        throw new Error(body.message || '创建提示词案例失败');
      }

      const created = await caseResponse.json();
      onCreated(created.case);
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
        <UploadCloud className="h-4 w-4" />
        上传案例
      </button>

      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 text-white backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            className="flex max-h-[calc(100vh-32px)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-white/12 bg-[#090909] shadow-2xl shadow-black"
          >
            <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">上传提示词案例</h2>
                <p className="mt-1 text-xs text-white/50">文件进入 OSS，素材记录进入 materials，案例沉淀到 knowledge_entries。</p>
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
              <label className="grid gap-2 text-sm">
                <span className="text-white/75">图片或视频</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  disabled={submitting}
                  onChange={(event) => {
                    const nextFile = event.target.files?.[0] ?? null;
                    setFile(nextFile);
                    if (nextFile && !title.trim()) setTitle(fileTitle(nextFile));
                  }}
                  className="rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-black"
                />
              </label>

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
                <label className="grid gap-2 text-sm">
                  <span className="text-white/75">项目</span>
                  <select
                    value={project}
                    onChange={(event) => setProject(event.target.value)}
                    disabled={submitting}
                    className="h-10 rounded-lg border border-white/15 bg-[#111] px-3 outline-none focus:border-cyan-300"
                  >
                    {PROJECTS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="grid gap-2 text-sm">
                <span className="text-white/75">提示词</span>
                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  disabled={submitting}
                  rows={5}
                  className="resize-none rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 outline-none focus:border-cyan-300"
                />
              </label>

              <label className="grid gap-2 text-sm">
                <span className="text-white/75">说明</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={submitting}
                  rows={3}
                  className="resize-none rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 outline-none focus:border-cyan-300"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm">
                  <span className="text-white/75">分类</span>
                  <input
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    disabled={submitting}
                    placeholder="剧情 / 角色展示 / 场景展示"
                    className="h-10 rounded-lg border border-white/15 bg-white/[0.06] px-3 outline-none placeholder:text-white/30 focus:border-cyan-300"
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="text-white/75">工具</span>
                  <input
                    value={tool}
                    onChange={(event) => setTool(event.target.value)}
                    disabled={submitting}
                    placeholder="即梦 / 可灵 / Runway"
                    className="h-10 rounded-lg border border-white/15 bg-white/[0.06] px-3 outline-none placeholder:text-white/30 focus:border-cyan-300"
                  />
                </label>
              </div>

              <label className="grid gap-2 text-sm">
                <span className="text-white/75">负面提示词</span>
                <textarea
                  value={negativePrompt}
                  onChange={(event) => setNegativePrompt(event.target.value)}
                  disabled={submitting}
                  rows={2}
                  className="resize-none rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 outline-none focus:border-cyan-300"
                />
              </label>

              <label className="grid gap-2 text-sm">
                <span className="text-white/75">标签</span>
                <input
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  disabled={submitting}
                  placeholder="用逗号分隔"
                  className="h-10 rounded-lg border border-white/15 bg-white/[0.06] px-3 outline-none placeholder:text-white/30 focus:border-cyan-300"
                />
              </label>

              {submitting && (
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
                {submitting ? '上传中' : '保存案例'}
              </button>
            </footer>
          </form>
        </div>
      )}
    </>
  );
}
