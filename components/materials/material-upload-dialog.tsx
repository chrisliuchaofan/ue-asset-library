'use client';

import { useState, useCallback, useRef } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, FileVideo, ImageIcon, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { uploadFileDirect } from '@/lib/client/direct-upload';
import { PROJECTS, PROJECT_DISPLAY_NAMES, type Project } from '@/lib/constants';

/* ---------- 类型 ---------- */

type UploadStep = 'select' | 'metadata' | 'uploading' | 'done' | 'error';

interface FileInfo {
  file: File;
  previewUrl: string;
  isVideo: boolean;
  width?: number;
  height?: number;
  duration?: number;
}

type MaterialSource = 'internal' | 'competitor';

interface MaterialUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  source?: MaterialSource;
}

/* ---------- 常量 ---------- */

const MATERIAL_TYPES = ['UE视频', 'AE视频', '混剪', 'AI视频', '图片'] as const;
const MATERIAL_TAGS = ['爆款', '优质', '达标'] as const;
const MATERIAL_QUALITIES = ['高品质', '常规', '迭代'] as const;

const ACCEPT_TYPES = 'video/mp4,video/webm,video/quicktime,image/jpeg,image/png,image/webp,image/gif';

/* ---------- 工具函数 ---------- */

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getMediaInfo(file: File): Promise<{ width: number; height: number; duration?: number }> {
  return new Promise((resolve, reject) => {
    const isVideo = file.type.startsWith('video/');
    const url = URL.createObjectURL(file);

    if (isVideo) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        resolve({
          width: video.videoWidth,
          height: video.videoHeight,
          duration: Math.round(video.duration * 10) / 10,
        });
        URL.revokeObjectURL(url);
      };
      video.onerror = () => {
        resolve({ width: 0, height: 0, duration: 0 });
        URL.revokeObjectURL(url);
      };
      video.src = url;
    } else {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        resolve({ width: 0, height: 0 });
        URL.revokeObjectURL(url);
      };
      img.src = url;
    }
  });
}

async function computeSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* ---------- 组件 ---------- */

export function MaterialUploadDialog({ open, onOpenChange, onSuccess, source = 'internal' }: MaterialUploadDialogProps) {
  // 状态
  const [step, setStep] = useState<UploadStep>('select');
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  // 表单
  const [name, setName] = useState('');
  const [materialType, setMaterialType] = useState<string>('');
  const [project, setProject] = useState<string>(PROJECTS[0]);
  const [tag, setTag] = useState<string>('达标');
  const [selectedQualities, setSelectedQualities] = useState<string[]>(['常规']);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* --- 重置 --- */
  const resetState = useCallback(() => {
    if (fileInfo?.previewUrl) URL.revokeObjectURL(fileInfo.previewUrl);
    setStep('select');
    setFileInfo(null);
    setUploadProgress(0);
    setErrorMessage('');
    setIsDragOver(false);
    setName('');
    setMaterialType('');
    setProject(PROJECTS[0]);
    setTag('达标');
    setSelectedQualities(['常规']);
    abortRef.current?.abort();
    abortRef.current = null;
  }, [fileInfo?.previewUrl]);

  /* --- 文件选择 --- */
  const handleFileSelect = useCallback(async (file: File) => {
    // 校验大小 (2GB)
    if (file.size > 2 * 1024 * 1024 * 1024) {
      setErrorMessage('文件大小不能超过 2GB');
      setStep('error');
      return;
    }

    const isVideo = file.type.startsWith('video/');
    const previewUrl = URL.createObjectURL(file);

    // 探测媒体信息
    const mediaInfo = await getMediaInfo(file);

    // 自动推断类型
    const autoType = isVideo ? 'AI视频' : '图片';

    setFileInfo({
      file,
      previewUrl,
      isVideo,
      ...mediaInfo,
    });
    setMaterialType(autoType);

    // 自动填充名称（去掉扩展名）
    const baseName = file.name.replace(/\.[^.]+$/, '');
    setName(baseName);

    setStep('metadata');
  }, []);

  const onFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
      // 重置 input 以便再次选择同名文件
      e.target.value = '';
    },
    [handleFileSelect]
  );

  /* --- 拖拽 --- */
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  /* --- 质量多选 --- */
  const toggleQuality = useCallback((q: string) => {
    setSelectedQualities((prev) =>
      prev.includes(q) ? prev.filter((x) => x !== q) : [...prev, q]
    );
  }, []);

  /* --- 上传 + 创建素材 --- */
  const handleUpload = useCallback(async () => {
    if (!fileInfo || !name.trim()) return;

    setStep('uploading');
    setUploadProgress(0);
    abortRef.current = new AbortController();

    try {
      // 1. 计算 hash (用于去重)
      setUploadProgress(2);
      const hash = await computeSHA256(fileInfo.file);

      // 2. 上传到 OSS
      const { fileUrl } = await uploadFileDirect(fileInfo.file, {
        onProgress: (p) => setUploadProgress(Math.min(5 + Math.round(p * 0.85), 90)),
        signal: abortRef.current.signal,
      });

      setUploadProgress(92);

      // 3. 生成缩略图 URL（视频用第一帧截图，图片用原图缩略）
      // 对于视频：OSS 地址就是 src，thumbnail 使用 previewUrl 或同 src
      const thumbnailUrl = fileInfo.isVideo ? fileUrl : fileUrl;

      // 4. 创建素材记录
      const body = {
        name: name.trim(),
        type: materialType,
        project,
        tag,
        quality: selectedQualities.length > 0 ? selectedQualities : ['常规'],
        source,
        src: fileUrl,
        thumbnail: thumbnailUrl,
        hash,
        fileSize: fileInfo.file.size,
        width: fileInfo.width,
        height: fileInfo.height,
        duration: fileInfo.duration,
      };

      const res = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `创建素材失败 (${res.status})`);
      }

      setUploadProgress(100);
      setStep('done');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        resetState();
        return;
      }
      setErrorMessage(err instanceof Error ? err.message : '上传失败');
      setStep('error');
    }
  }, [fileInfo, name, materialType, project, tag, selectedQualities, onSuccess, resetState]);

  /* --- 关闭 --- */
  const handleClose = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        resetState();
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, resetState]
  );

  /* --- 渲染 --- */

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{source === 'competitor' ? '上传竞品素材' : '上传内部素材'}</DialogTitle>
          <DialogDescription>
            {step === 'select' && '选择视频或图片文件上传到素材库'}
            {step === 'metadata' && '填写素材信息'}
            {step === 'uploading' && '正在上传...'}
            {step === 'done' && '上传完成'}
            {step === 'error' && '上传失败'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: 选择文件 */}
        {step === 'select' && (
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isDragOver
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/20 hover:bg-white/[0.03]'
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              拖拽文件到此处，或点击选择
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              支持 MP4、MOV、WebM、JPG、PNG、WebP、GIF，最大 2GB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_TYPES}
              className="hidden"
              onChange={onFileInputChange}
            />
          </div>
        )}

        {/* Step 2: 元数据填写 */}
        {step === 'metadata' && fileInfo && (
          <div className="space-y-4">
            {/* 文件预览 */}
            <div className="relative rounded-lg overflow-hidden bg-muted/30 border border-border">
              <div className="flex items-center gap-3 p-3">
                {fileInfo.isVideo ? (
                  <FileVideo className="w-8 h-8 text-primary shrink-0" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-primary shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{fileInfo.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(fileInfo.file.size)}
                    {fileInfo.width && fileInfo.height
                      ? ` · ${fileInfo.width}×${fileInfo.height}`
                      : ''}
                    {fileInfo.duration ? ` · ${fileInfo.duration}s` : ''}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-7 w-7"
                  onClick={() => {
                    if (fileInfo.previewUrl) URL.revokeObjectURL(fileInfo.previewUrl);
                    setFileInfo(null);
                    setStep('select');
                  }}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
              {/* 小预览 */}
              {fileInfo.isVideo ? (
                <video
                  src={fileInfo.previewUrl}
                  className="w-full max-h-40 object-contain bg-black/5"
                  controls
                  muted
                />
              ) : (
                <img
                  src={fileInfo.previewUrl}
                  alt="预览"
                  className="w-full max-h-40 object-contain"
                />
              )}
            </div>

            {/* 名称 */}
            <div className="space-y-1.5">
              <Label htmlFor="material-name">素材名称 *</Label>
              <Input
                id="material-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="输入素材名称"
              />
            </div>

            {/* 类型 + 项目 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>素材类型 *</Label>
                <select
                  value={materialType}
                  onChange={(e) => setMaterialType(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="" disabled>选择类型</option>
                  {MATERIAL_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>项目 *</Label>
                <select
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {PROJECTS.map((p) => (
                    <option key={p} value={p}>{PROJECT_DISPLAY_NAMES[p as Project] || p}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 标签 */}
            <div className="space-y-1.5">
              <Label>标签</Label>
              <select
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {MATERIAL_TAGS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* 质量（多选） */}
            <div className="space-y-1.5">
              <Label>质量</Label>
              <div className="flex gap-2">
                {MATERIAL_QUALITIES.map((q) => (
                  <Button
                    key={q}
                    type="button"
                    variant={selectedQualities.includes(q) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleQuality(q)}
                    className="text-xs"
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: 上传中 */}
        {step === 'uploading' && (
          <div className="py-6 space-y-4">
            <div className="flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {uploadProgress < 5
                    ? '计算文件指纹...'
                    : uploadProgress < 90
                      ? '上传到云存储...'
                      : uploadProgress < 100
                        ? '创建素材记录...'
                        : '完成'}
                </span>
                <span className="font-medium">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: 完成 */}
        {step === 'done' && (
          <div className="py-6 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 mx-auto text-success" />
            <div>
              <p className="text-sm font-medium text-foreground">素材上传成功</p>
              <p className="text-xs text-muted-foreground mt-1">
                「{name}」已添加到素材库
              </p>
            </div>
          </div>
        )}

        {/* Step 5: 错误 */}
        {step === 'error' && (
          <div className="py-6 text-center space-y-3">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
            <div>
              <p className="text-sm font-medium text-foreground">上传失败</p>
              <p className="text-xs text-muted-foreground mt-1">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* 底部操作 */}
        <DialogFooter className="gap-2 sm:gap-0">
          {step === 'metadata' && (
            <>
              <Button variant="outline" size="sm" onClick={() => { setFileInfo(null); setStep('select'); }}>
                重新选择
              </Button>
              <Button
                size="sm"
                disabled={!name.trim() || !materialType || !project}
                onClick={handleUpload}
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                上传素材
              </Button>
            </>
          )}
          {step === 'uploading' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                abortRef.current?.abort();
              }}
            >
              取消上传
            </Button>
          )}
          {step === 'done' && (
            <Button size="sm" onClick={() => {
              onSuccess?.();
              handleClose(false);
            }}>
              完成
            </Button>
          )}
          {step === 'error' && (
            <>
              <Button variant="outline" size="sm" onClick={() => handleClose(false)}>
                关闭
              </Button>
              <Button size="sm" onClick={() => setStep(fileInfo ? 'metadata' : 'select')}>
                重试
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
