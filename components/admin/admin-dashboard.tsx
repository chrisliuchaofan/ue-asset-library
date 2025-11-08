'use client';

import { useCallback, useMemo, useState, useRef, type ChangeEvent } from 'react';
import type { Asset } from '@/data/manifest.schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, X, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

type StorageMode = 'local' | 'oss';

interface AdminDashboardProps {
  initialAssets: Asset[];
  storageMode: StorageMode;
  cdnBase: string;
}

interface FormState {
  name: string;
  type: 'image' | 'video';
  tags: string;
  thumbnail: string;
  src: string;
  gallery: string; // 多图/视频，逗号分隔的 URL
  width: string;
  height: string;
  duration: string;
  filesize: string;
}

const initialFormState: FormState = {
  name: '',
  type: 'image',
  tags: '',
  thumbnail: '',
  src: '',
  gallery: '',
  width: '',
  height: '',
  duration: '',
  filesize: '',
};

export function AdminDashboard({ initialAssets, storageMode, cdnBase }: AdminDashboardProps) {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    url: string;
    originalName: string;
    type: 'image' | 'video';
    size: number;
    width?: number;
    height?: number;
    hash?: string;
  }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // OSS 模式已支持读写，不再设为只读
  const isReadOnly = false;

  const resetForm = useCallback(() => {
    setForm(initialFormState);
    setPreviewUrls([]);
    setCurrentPreviewIndex(0);
    setUploadedFiles([]);
  }, []);

  // 计算文件 hash（用于唯一性检查）
  const calculateFileHash = useCallback(async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }, []);

  const normalizedCdnBase = useMemo(() => cdnBase.replace(/\/+$/, ''), [cdnBase]);

  // 检查文件是否已上传
  const checkFileExists = useCallback(async (file: File): Promise<string | null> => {
    const fileHash = await calculateFileHash(file);
    const existingFile = uploadedFiles.find((f) => f.hash === fileHash);
    if (existingFile) {
      return existingFile.url;
    }
    return null;
  }, [uploadedFiles, calculateFileHash]);

  // 更新表单从已上传文件列表
  const updateFormFromUploadedFiles = useCallback((files: typeof uploadedFiles) => {
    if (files.length === 0) return;
    
    const firstFile = files[0];
    const galleryUrls = files.map((f) => f.url);
    
    // 处理预览 URL
    const previewUrls = files.map((f) => {
      let url = f.url;
      if (!url.startsWith('http')) {
        if (storageMode === 'oss' && normalizedCdnBase && normalizedCdnBase !== '/') {
          url = `${normalizedCdnBase.replace(/\/+$/, '')}${url}`;
        }
      }
      return url;
    });
    
    setPreviewUrls(previewUrls);
    setCurrentPreviewIndex(0);
    
    // 自动填充表单
    setForm((prev) => ({
      ...prev,
      name: prev.name || firstFile.originalName.replace(/\.[^/.]+$/, ''),
      type: firstFile.type,
      src: firstFile.url,
      thumbnail: firstFile.type === 'image' ? firstFile.url : prev.thumbnail,
      gallery: galleryUrls.join(','),
      width: firstFile.width ? String(firstFile.width) : prev.width,
      height: firstFile.height ? String(firstFile.height) : prev.height,
      filesize: firstFile.size ? String(firstFile.size) : prev.filesize,
    }));
  }, [storageMode, normalizedCdnBase]);

  // 删除已上传文件
  const handleRemoveUploadedFile = useCallback((index: number) => {
    setUploadedFiles((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      updateFormFromUploadedFiles(updated);
      return updated;
    });
  }, [updateFormFromUploadedFiles]);

  // 从视频中提取缩略图（客户端）
  const extractVideoThumbnail = useCallback(
    async (videoFile: File): Promise<string | null> => {
      return new Promise((resolve) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          video.currentTime = 0.1; // 取第 0.1 秒的帧
        };

        video.onseeked = () => {
          if (ctx) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  const url = URL.createObjectURL(blob);
                  resolve(url);
                } else {
                  resolve(null);
                }
              },
              'image/jpeg',
              0.8
            );
          } else {
            resolve(null);
          }
        };

        video.onerror = () => resolve(null);
        video.src = URL.createObjectURL(videoFile);
      });
    },
    []
  );

  const handleInputChange =
    (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const refreshAssets = useCallback(async () => {
    const response = await fetch('/api/assets', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('获取资产列表失败');
    }
    const data = await response.json();
    setAssets(data.assets);
  }, []);

  const handleCreate = async () => {
    setMessage(null);
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        type: form.type,
        tags: form.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        thumbnail: form.thumbnail || undefined,
        src: form.src || undefined,
        gallery: form.gallery
          ? form.gallery
              .split(',')
              .map((url) => url.trim())
              .filter(Boolean)
          : undefined,
        width: form.width ? Number(form.width) : undefined,
        height: form.height ? Number(form.height) : undefined,
        duration: form.duration ? Number(form.duration) : undefined,
        filesize: form.filesize ? Number(form.filesize) : undefined,
      };

      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '创建资产失败');
      }

      await refreshAssets();
      resetForm();
      setMessage('资产已创建');
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : '创建资产失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setMessage(null);
    setLoading(true);
    try {
      const response = await fetch(`/api/assets/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '删除资产失败');
      }

      await refreshAssets();
      setMessage('资产已删除');
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : '删除资产失败');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = useCallback(async (file: File) => {
    setUploading(true);
    setUploadProgress('正在检查文件...');
    setMessage(null);

    try {
      // 检查文件是否已上传
      const existingUrl = await checkFileExists(file);
      if (existingUrl) {
        setUploadProgress(null);
        setMessage(`文件已存在，使用已有文件: ${file.name}`);
        
        // 使用已有文件，添加到已上传列表
        const existingFile = uploadedFiles.find((f) => f.url === existingUrl);
        if (existingFile) {
          // 文件已存在，不重复添加
          return;
        }
        
        // 如果不在列表中，需要获取文件信息（这里简化处理，直接使用 URL）
        const fileInfo = {
          url: existingUrl,
          originalName: file.name,
          type: file.type.startsWith('image/') ? 'image' as const : 'video' as const,
          size: file.size,
          hash: await calculateFileHash(file),
        };
        
        setUploadedFiles((prev) => {
          const updated = [...prev, fileInfo];
          updateFormFromUploadedFiles(updated);
          return updated;
        });
        return;
      }

      setUploadProgress('正在上传...');
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '上传失败');
      }

      const data = await response.json();
      setUploadProgress(null);

      // 处理 URL
      let previewUrl = data.url;
      if (!previewUrl.startsWith('http')) {
        if (storageMode === 'oss' && normalizedCdnBase && normalizedCdnBase !== '/') {
          previewUrl = `${normalizedCdnBase.replace(/\/+$/, '')}${previewUrl}`;
        }
      }
      
      // 如果是视频，提取缩略图
      let thumbnailUrl = previewUrl;
      if (data.type === 'video') {
        const thumb = await extractVideoThumbnail(file);
        if (thumb) {
          thumbnailUrl = thumb;
        }
      }

      // 添加到已上传文件列表（累加）
      const fileHash = await calculateFileHash(file);
      const newFile = {
        url: data.url, // 使用原始 URL，不包含 CDN base
        originalName: data.originalName,
        type: data.type,
        size: data.size,
        width: data.width,
        height: data.height,
        hash: data.hash || fileHash,
      };
      
      setUploadedFiles((prev) => {
        const updated = [...prev, newFile];
        updateFormFromUploadedFiles(updated);
        return updated;
      });
      setMessage(`文件上传成功: ${data.originalName}`);

      // 如果是图片，自动创建资产
      if (data.type === 'image') {
        // 可以在这里自动创建，或者让用户手动点击创建按钮
        // 暂时只填充表单，让用户确认后再创建
      }
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : '上传失败');
      setUploadProgress(null);
    } finally {
      setUploading(false);
      // 清空文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [storageMode, normalizedCdnBase, uploadedFiles, checkFileExists, calculateFileHash, updateFormFromUploadedFiles, extractVideoThumbnail]);

  const handleFileSelect = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      if (files.length === 0) return;

      // 支持多文件上传
      if (files.length > 1) {
        await handleBatchUpload(files);
      } else {
        await handleFileUpload(files[0]);
      }
    },
    []
  );

  const handleBatchUpload = useCallback(async (files: File[]) => {
    setUploading(true);
    setUploadProgress(`正在检查 ${files.length} 个文件...`);
    setMessage(null);

    try {
      const newFiles: typeof uploadedFiles = [];
      const duplicateFiles: string[] = [];

      // 先检查所有文件
      for (const file of files) {
        const existingUrl = await checkFileExists(file);
        if (existingUrl) {
          duplicateFiles.push(file.name);
          // 使用已有文件
          const existingFile = uploadedFiles.find((f) => f.url === existingUrl);
          if (existingFile) {
            // 检查是否已在 newFiles 中
            if (!newFiles.find((f) => f.hash === existingFile.hash)) {
              newFiles.push(existingFile);
            }
          } else {
            // 如果不在列表中，创建文件信息
            const fileHash = await calculateFileHash(file);
            newFiles.push({
              url: existingUrl,
              originalName: file.name,
              type: file.type.startsWith('image/') ? 'image' as const : 'video' as const,
              size: file.size,
              hash: fileHash,
            });
          }
        } else {
          // 需要上传的文件
          setUploadProgress(`正在上传 ${file.name}...`);
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || `上传 ${file.name} 失败`);
          }

          const data = await response.json();
          const fileHash = await calculateFileHash(file);
          
          newFiles.push({
            url: data.url,
            originalName: data.originalName,
            type: data.type,
            size: data.size,
            width: data.width,
            height: data.height,
            hash: data.hash || fileHash,
          });
        }
      }

      // 累加到已上传文件列表
      setUploadedFiles((prev) => {
        const combined = [...prev];
        for (const newFile of newFiles) {
          // 检查是否已存在（通过 hash）
          if (!combined.find((f) => f.hash === newFile.hash)) {
            combined.push(newFile);
          }
        }
        updateFormFromUploadedFiles(combined);
        return combined;
      });

      setUploadProgress(null);
      if (duplicateFiles.length > 0) {
        setMessage(`成功处理 ${files.length} 个文件，其中 ${duplicateFiles.length} 个已存在（已跳过重复上传）`);
      } else {
        setMessage(`成功上传 ${files.length} 个文件`);
      }
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : '批量上传失败');
      setUploadProgress(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [uploadedFiles, checkFileExists, calculateFileHash, updateFormFromUploadedFiles]);

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const files = Array.from(event.dataTransfer.files);
      if (files.length === 0) return;

      if (files.length > 1) {
        await handleBatchUpload(files);
      } else {
        await handleFileUpload(files[0]);
      }
    },
    [handleFileUpload, handleBatchUpload]
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>存储状态</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div>
            当前存储模式：<Badge variant="outline">{storageMode}</Badge>
          </div>
          <div>CDN / 静态资源基路径：{normalizedCdnBase || '/'}</div>
          {storageMode === 'oss' ? (
            <p className="text-green-600">
              OSS 模式已启用，可以直接通过此页面管理资产，数据将保存到阿里云 OSS。
            </p>
          ) : (
            <p>本地模式允许通过此页面直接编辑 manifest.json，用于预览和调试。</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>资产列表</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">ID</th>
                  <th className="px-3 py-2 text-left font-medium">名称</th>
                  <th className="px-3 py-2 text-left font-medium">类型</th>
                  <th className="px-3 py-2 text-left font-medium">标签</th>
                  <th className="px-3 py-2 text-left font-medium">资源路径</th>
                  <th className="px-3 py-2 text-left font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {assets.map((asset) => (
                  <tr key={asset.id}>
                    <td className="px-3 py-2 font-mono text-xs">{asset.id}</td>
                    <td className="px-3 py-2">{asset.name}</td>
                    <td className="px-3 py-2 capitalize">{asset.type}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {asset.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="space-y-1 break-all text-xs">
                        {asset.thumbnail && <div>封面：{asset.thumbnail}</div>}
                        <div>资源：{asset.src}</div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`/assets/${asset.id}`, '_blank')}
                        >
                          预览
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(asset.id)}
                          disabled={loading}
                        >
                          删除
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>新增资产</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 文件上传区域 */}
          <div
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center transition-colors hover:border-primary/50"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
              disabled={uploading || loading}
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">
                {uploading ? (
                  <span>{uploadProgress || '上传中...'}</span>
                ) : (
                  <>
                    点击或拖拽文件到此处上传
                    <br />
                    <span className="text-xs">支持图片和视频文件（可多选）</span>
                  </>
                )}
              </div>
            </label>
          </div>

          {/* 预览区域 */}
          {previewUrls.length > 0 && (
            <div className="relative border rounded-lg p-4 bg-muted/50">
              <div className="flex items-start justify-between mb-2">
                <span className="text-sm font-medium">
                  预览 ({currentPreviewIndex + 1}/{previewUrls.length})
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => {
                    setPreviewUrls([]);
                    setCurrentPreviewIndex(0);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="relative aspect-video w-full max-w-md mx-auto rounded overflow-hidden bg-background">
                {previewUrls[currentPreviewIndex] && (
                  <>
                    {form.type === 'image' ? (
                      <img
                        src={previewUrls[currentPreviewIndex]}
                        alt={`预览 ${currentPreviewIndex + 1}`}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <video
                        src={previewUrls[currentPreviewIndex]}
                        controls
                        className="w-full h-full object-contain"
                      />
                    )}
                  </>
                )}
                {/* 切换按钮 */}
                {previewUrls.length > 1 && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() =>
                        setCurrentPreviewIndex((prev) =>
                          prev > 0 ? prev - 1 : previewUrls.length - 1
                        )
                      }
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() =>
                        setCurrentPreviewIndex((prev) =>
                          prev < previewUrls.length - 1 ? prev + 1 : 0
                        )
                      }
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 已上传文件列表 */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">已上传文件 ({uploadedFiles.length})</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {uploadedFiles.map((file, index) => {
                  const previewUrl = file.url.startsWith('http')
                    ? file.url
                    : storageMode === 'oss' && normalizedCdnBase && normalizedCdnBase !== '/'
                    ? `${normalizedCdnBase.replace(/\/+$/, '')}${file.url}`
                    : file.url;
                  
                  return (
                    <div
                      key={index}
                      className="relative group border rounded-lg overflow-hidden bg-muted/50"
                    >
                      <div className="aspect-video relative">
                        {file.type === 'image' ? (
                          <img
                            src={previewUrl}
                            alt={file.originalName}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <video
                            src={previewUrl}
                            className="w-full h-full object-contain"
                            muted
                            playsInline
                          />
                        )}
                      </div>
                      <div className="p-2">
                        <p className="text-xs truncate" title={file.originalName}>
                          {file.originalName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveUploadedFile(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">名称</label>
              <Input
                placeholder="资产名称"
                value={form.name}
                onChange={handleInputChange('name')}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">类型</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.type}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, type: event.target.value as 'image' | 'video' }))
                }
                disabled={loading}
              >
                <option value="image">图片</option>
                <option value="video">视频</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">标签（逗号分隔）</label>
              <Input
                placeholder="自然, 风景"
                value={form.tags}
                onChange={handleInputChange('tags')}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">封面路径</label>
              <Input
                placeholder="/demo/xxx.jpg 或完整 CDN 地址"
                value={form.thumbnail}
                onChange={handleInputChange('thumbnail')}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">资源路径</label>
              <Input
                placeholder="/demo/xxx.jpg 或完整 CDN 地址"
                value={form.src}
                onChange={handleInputChange('src')}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">宽度（px）</label>
              <Input
                type="number"
                value={form.width}
                onChange={handleInputChange('width')}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">高度（px）</label>
              <Input
                type="number"
                value={form.height}
                onChange={handleInputChange('height')}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">时长（秒，仅视频）</label>
              <Input
                type="number"
                value={form.duration}
                onChange={handleInputChange('duration')}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">文件大小（字节）</label>
              <Input
                type="number"
                value={form.filesize}
                onChange={handleInputChange('filesize')}
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? '提交中...' : '创建资产'}
            </Button>
            <Button variant="ghost" onClick={resetForm} disabled={loading}>
              重置
            </Button>
            {message && <span className="text-sm text-muted-foreground">{message}</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


