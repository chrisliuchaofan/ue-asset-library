'use client';

import { useCallback, useMemo, useState, useRef, useEffect, type ChangeEvent } from 'react';
import type { Asset } from '@/data/manifest.schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, X, ChevronLeft, ChevronRight, Trash2, Star, FileArchive } from 'lucide-react';
import { BatchUploadDialog } from './batch-upload-dialog';
import { uploadFileDirect } from '@/lib/client/direct-upload';
import { useAdminRefresh } from './admin-refresh-context';
import { PROJECTS, getAllProjects, getProjectDisplayName } from '@/lib/constants';

type StorageMode = 'local' | 'oss';

interface AssetsNewProps {
  initialAssets: Asset[];
  storageMode: StorageMode;
  cdnBase: string;
  onAssetCreated?: () => void;
}

const DEFAULT_ASSET_TYPES = ['角色', '场景', '动画', '特效', '材质', '蓝图', 'UI', '合成', '音频', '其他'] as const;
const STYLE_SUGGESTIONS = ['写实', '二次元', '卡通', '国风', '欧式', '科幻', '写意', '低多边形', '像素', '日系', '欧美', '写实PBR'];
const SOURCE_SUGGESTIONS = ['内部', '外部', '网络'];
const VERSION_SUGGESTIONS = ['UE5.6', 'UE5.5', 'UE5.4', 'UE5.3', 'UE4.3'];

interface FormState {
  name: string;
  type: string;
  project: string;
  style: string;
  tags: string;
  source: string;
  engineVersion: string;
  guangzhouNas: string;
  shenzhenNas: string;
  thumbnail: string;
  src: string;
  gallery: string;
  width: string;
  height: string;
  duration: string;
  filesize: string;
}

const initialFormState: FormState = {
  name: '',
  type: '角色',
  project: '',
  style: '',
  tags: '',
  source: '',
  engineVersion: '',
  guangzhouNas: '',
  shenzhenNas: '',
  thumbnail: '',
  src: '',
  gallery: '',
  width: '',
  height: '',
  duration: '',
  filesize: '',
};

export function AssetsNew({ initialAssets, storageMode, cdnBase, onAssetCreated }: AssetsNewProps) {
  const { refreshAssets } = useAdminRefresh();
  const [form, setForm] = useState<FormState>(initialFormState);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [uploadProgressPercent, setUploadProgressPercent] = useState<number>(0);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    url: string;
    originalName: string;
    type: 'image' | 'video';
    size: number;
    fileSize?: number; // 统一命名：文件大小（字节数）
    width?: number;
    height?: number;
    hash?: string;
  }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [batchUploadOpen, setBatchUploadOpen] = useState(false);
  const [allowedTypes, setAllowedTypes] = useState<string[]>([...DEFAULT_ASSET_TYPES]);

  const normalizedCdnBase = useMemo(() => cdnBase.replace(/\/+$/, ''), [cdnBase]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      fetch('/api/assets/types')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.allowedTypes) && data.allowedTypes.length > 0) {
            setAllowedTypes(data.allowedTypes);
          }
        })
        .catch(() => {
          setAllowedTypes([...DEFAULT_ASSET_TYPES]);
        });
    }
  }, []);

  const resetForm = useCallback(() => {
    setForm(initialFormState);
    setPreviewUrls([]);
    setCurrentPreviewIndex(0);
    setUploadedFiles([]);
  }, []);

  const calculateFileHash = useCallback(async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }, []);

  /**
   * 检查文件是否重复（基于 hash）
   * 先检查当前会话中已上传的文件，再调用后端 API 检查数据库中是否存在
   */
  const checkFileExists = useCallback(async (file: File): Promise<{ url: string; isDuplicate: boolean; existingAssetName?: string } | null> => {
    // 1. 先检查当前会话中已上传的文件（快速检查）
    const fileHash = await calculateFileHash(file);
    const existingFile = uploadedFiles.find((f) => f.hash === fileHash);
    if (existingFile) {
      return { url: existingFile.url, isDuplicate: true };
    }

    // 2. 调用后端 API 检查数据库中是否存在相同 hash 的文件
    try {
      const response = await fetch('/api/assets/check-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hash: fileHash,
          fileSize: file.size,
          fileName: file.name,
        }),
      });

      if (!response.ok) {
        // API 调用失败，继续上传流程（不阻塞）
        console.warn('检查重复文件失败，继续上传流程');
        return null;
      }

      const result = await response.json();
      if (result.isDuplicate && result.existingUrl) {
        // 找到重复文件，返回已有文件的 URL
        return {
          url: result.existingUrl,
          isDuplicate: true,
          existingAssetName: result.existingAssetName,
        };
      }

      // 没有找到重复文件
      return null;
    } catch (error) {
      // 网络错误或其他错误，继续上传流程（不阻塞）
      console.warn('检查重复文件时出错，继续上传流程:', error);
      return null;
    }
  }, [uploadedFiles, calculateFileHash]);

  const updateFormFromUploadedFiles = useCallback((files: typeof uploadedFiles) => {
    if (files.length === 0) return;
    
    const firstFile = files[0];
    const galleryUrls = files.map((f) => f.url);
    
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
    
    setForm((prev) => {
      const finalThumbnail = firstFile.type === 'image' ? firstFile.url : (firstFile.url || prev.thumbnail);
      const finalSrc = firstFile.url || finalThumbnail;
      
      return {
        ...prev,
        name: prev.name || firstFile.originalName.replace(/\.[^/.]+$/, ''),
        src: finalSrc,
        thumbnail: finalThumbnail,
        gallery: galleryUrls.join(','),
        width: firstFile.width ? String(firstFile.width) : prev.width,
        height: firstFile.height ? String(firstFile.height) : prev.height,
        filesize: firstFile.size ? String(firstFile.size) : prev.filesize,
      };
    });
  }, [storageMode, normalizedCdnBase]);

  const handleRemoveUploadedFile = useCallback((index: number) => {
    setUploadedFiles((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      updateFormFromUploadedFiles(updated);
      return updated;
    });
  }, [updateFormFromUploadedFiles]);

  const handleSetAsThumbnail = useCallback((fileUrl: string) => {
    setForm((prev) => ({
      ...prev,
      thumbnail: fileUrl,
    }));
    setMessage('已设置为预览图');
  }, []);

  const extractVideoThumbnail = useCallback(
    async (videoFile: File): Promise<string | null> => {
      return new Promise((resolve) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          video.currentTime = 0.1;
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

  const handleInputChange = (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleFileUpload = useCallback(async (file: File) => {
    setUploading(true);
    setUploadProgress('正在检查文件是否重复...');
    setMessage(null);

    try {
      // 检查文件是否重复（基于 hash）
      const duplicateCheck = await checkFileExists(file);
      if (duplicateCheck) {
        setUploadProgress(null);
        // 显示重复文件提示信息
        const duplicateMessage = duplicateCheck.existingAssetName
          ? `已检测到相同内容文件（与资产"${duplicateCheck.existingAssetName}"相同），已复用历史上传记录，未重复占用 OSS 存储。`
          : `已检测到相同内容文件，已复用历史上传记录，未重复占用 OSS 存储。`;
        setMessage(duplicateMessage);
        
        // 计算文件 hash，用于检查是否已经在已上传列表中
        const fileHash = await calculateFileHash(file);
        
        // 检查是否已经在已上传列表中
        const existingFile = uploadedFiles.find((f) => f.hash && f.hash === fileHash);
        if (existingFile) {
          // 文件已在列表中，不重复添加
          return;
        }
        
        // 使用已有文件的 URL，不实际上传
        const fileInfo = {
          url: duplicateCheck.url,
          originalName: file.name,
          type: file.type.startsWith('image/') ? 'image' as const : 'video' as const,
          size: file.size,
          hash: fileHash,
        };
        
        setUploadedFiles((prev) => {
          const updated = [...prev, fileInfo];
          updateFormFromUploadedFiles(updated);
          return updated;
        });
        return;
      }

      setUploadProgress('正在上传...');
      setUploadProgressPercent(0);

      let data: {
        url: string;
        originalName: string;
        type: 'image' | 'video';
        size: number;
        fileSize?: number; // 统一命名：文件大小（字节数）
        width?: number;
        height?: number;
        hash?: string;
        isDuplicate?: boolean; // 是否重复文件
        existingAssetName?: string; // 已有资产名称
      };

      if (storageMode === 'oss') {
        const directResult = await uploadFileDirect(file, {
          onProgress: (percent) => {
            setUploadProgressPercent(percent);
            setUploadProgress(`正在上传... ${percent}%`);
          },
        });

        data = {
          url: directResult.fileUrl,
          originalName: file.name,
          type: file.type.startsWith('image/') ? 'image' : 'video',
          size: file.size,
          fileSize: file.size, // 统一命名：文件大小（字节数）
        };
      } else {
        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();
        const uploadPromise = new Promise<any>((resolve, reject) => {
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const percent = Math.round((e.loaded / e.total) * 100);
              setUploadProgressPercent(percent);
              setUploadProgress(`正在上传... ${percent}%`);
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const responseData = JSON.parse(xhr.responseText);
                resolve(responseData);
              } catch (err) {
                reject(new Error('服务器响应格式错误'));
              }
            } else {
              try {
                const error = JSON.parse(xhr.responseText);
                reject(new Error(error.message || '上传失败'));
              } catch {
                reject(new Error(`上传失败: HTTP ${xhr.status}`));
              }
            }
          });

          xhr.addEventListener('error', () => {
            reject(new Error('网络错误，请检查网络连接'));
          });

          xhr.addEventListener('abort', () => {
            reject(new Error('上传已取消'));
          });

          xhr.open('POST', '/api/upload');
          xhr.send(formData);
        });

        const responseData = await uploadPromise;
        data = {
          url: responseData.url,
          originalName: responseData.originalName,
          type: responseData.type,
          size: responseData.size,
          fileSize: responseData.fileSize || responseData.size, // 统一使用 fileSize
          width: responseData.width,
          height: responseData.height,
          hash: responseData.hash,
        };
        
        // 如果上传接口返回了重复文件标记，显示提示信息
        if (responseData.isDuplicate) {
          const duplicateMessage = responseData.existingAssetName
            ? `已检测到相同内容文件（与资产"${responseData.existingAssetName}"相同），已复用历史上传记录，未重复占用 OSS 存储。`
            : `已检测到相同内容文件，已复用历史上传记录，未重复占用 OSS 存储。`;
          setMessage(duplicateMessage);
        }
      }

      setUploadProgress(null);
      setUploadProgressPercent(0);

      let previewUrl = data.url;
      if (!previewUrl.startsWith('http')) {
        if (storageMode === 'oss' && normalizedCdnBase && normalizedCdnBase !== '/') {
          previewUrl = `${normalizedCdnBase.replace(/\/+$/, '')}${previewUrl}`;
        }
      }
      
      let thumbnailUrl = previewUrl;
      if (data.type === 'video') {
        const thumb = await extractVideoThumbnail(file);
        if (thumb) {
          thumbnailUrl = thumb;
        }
      }

      // 确保保存 hash 和 fileSize（用于后续重复检测）
      const fileHash = data.hash || await calculateFileHash(file);
      const newFile = {
        url: data.url,
        originalName: data.originalName,
        type: data.type,
        size: data.size,
        fileSize: data.fileSize || data.size, // 统一使用 fileSize
        width: data.width,
        height: data.height,
        hash: fileHash, // 保存 hash，用于重复检测
      };
      
      setUploadedFiles((prev) => {
        const updated = [...prev, newFile];
        updateFormFromUploadedFiles(updated);
        return updated;
      });

      setMessage(`文件上传成功: ${data.originalName}`);
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : '上传失败';
      setMessage(errorMessage);
      setUploadProgress(null);
      setUploadProgressPercent(0);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [storageMode, normalizedCdnBase, uploadedFiles, checkFileExists, calculateFileHash, updateFormFromUploadedFiles, extractVideoThumbnail]);

  const handleFileSelect = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      if (files.length === 0) return;
      for (const file of files) {
        await handleFileUpload(file);
      }
    },
    [handleFileUpload]
  );

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const files = Array.from(event.dataTransfer.files);
      if (files.length === 0) return;
      for (const file of files) {
        await handleFileUpload(file);
      }
    },
    [handleFileUpload]
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const handleCreate = async () => {
    setMessage(null);
    setLoading(true);
    try {
      if (!form.name.trim()) {
        throw new Error('名称不能为空');
      }
      if (!form.type) {
        throw new Error('类型不能为空');
      }
      if (!form.tags.trim()) {
        throw new Error('至少需要一个标签');
      }
      if (!form.source.trim()) {
        throw new Error('来源不能为空');
      }
      if (!form.engineVersion.trim()) {
        throw new Error('版本不能为空');
      }
      if (!form.project) {
        throw new Error('项目不能为空');
      }
      if (!form.guangzhouNas.trim() && !form.shenzhenNas.trim()) {
        throw new Error('广州NAS和深圳NAS至少需要填写一个');
      }

      const styleValues = form.style
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const style =
        styleValues.length === 0
          ? undefined
          : styleValues.length === 1
          ? styleValues[0]
          : styleValues;

      // 获取主文件的 hash 和 fileSize（用于重复检测）
      const mainFile = uploadedFiles[0];
      const mainFileHash = mainFile?.hash;
      const mainFileSize = mainFile?.fileSize || mainFile?.size;

      const payload = {
        name: form.name.trim(),
        type: form.type,
        project: form.project,
        style: style,
        tags: form.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        source: form.source.trim(),
        engineVersion: form.engineVersion.trim(),
        guangzhouNas: form.guangzhouNas.trim() || undefined,
        shenzhenNas: form.shenzhenNas.trim() || undefined,
        thumbnail: form.thumbnail || undefined,
        src: form.src || undefined,
        gallery: form.gallery
          ? form.gallery
              .split(',')
              .map((url) => url.trim())
              .filter(Boolean)
          : undefined,
        // 添加 hash 和 fileSize 字段，用于重复检测
        hash: mainFileHash || undefined,
        fileSize: mainFileSize || undefined,
        filesize: mainFileSize || undefined, // 保留兼容性
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

      resetForm();
      setMessage('资产已创建');
      // 触发资产列表刷新
      refreshAssets();
      if (onAssetCreated) {
        onAssetCreated();
      }
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : '创建资产失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="border border-gray-200 bg-white">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold text-gray-900">新增资产</h3>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBatchUploadOpen(true)}
              >
                <FileArchive className="h-4 w-4 mr-2" />
                批量上传
              </Button>
            </div>
          </div>
        </div>
        <div className="space-y-5 px-4 py-4">
          {/* 文件上传区域 */}
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center transition-colors hover:border-blue-400"
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
              <Upload className="h-8 w-8 text-gray-400" />
              <div className="text-sm text-gray-700 w-full">
                {uploading ? (
                  <div className="space-y-2 w-full">
                    <div className="text-center">{uploadProgress || '上传中...'}</div>
                    {uploadProgressPercent > 0 && (
                      <div className="w-full rounded-full h-2 bg-gray-200">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgressPercent}%` }}
                        />
                      </div>
                    )}
                  </div>
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
            <div className="relative border border-gray-300 rounded-lg p-4 bg-gray-50">
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
              <div className="relative aspect-video w-full max-w-md mx-auto rounded overflow-hidden bg-gray-100">
                {previewUrls[currentPreviewIndex] && (
                  <>
                    {(() => {
                      const currentFile = uploadedFiles[currentPreviewIndex];
                      const isImage = currentFile?.type === 'image' || 
                        previewUrls[currentPreviewIndex].match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i);
                      return isImage ? (
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
                      );
                    })()}
                  </>
                )}
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
                      className="relative group border border-gray-300 rounded-lg overflow-hidden bg-gray-50"
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
                        <p className="text-xs text-gray-600">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="default"
                          size="icon"
                          className="h-6 w-6 bg-blue-600 hover:bg-blue-700"
                          onClick={() => handleSetAsThumbnail(file.url)}
                          title="设置为预览图"
                        >
                          <Star className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleRemoveUploadedFile(index)}
                          title="删除"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      {form.thumbnail === file.url && (
                        <div className="absolute top-1 left-1 bg-blue-600 text-white px-1.5 py-0.5 rounded text-xs">
                          预览图
                        </div>
                      )}
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
              <label className="text-sm font-medium">类型（可新增）<span className="text-red-500">*</span></label>
              <div className="space-y-1">
                <Input
                  placeholder="选择或输入新类型"
                  value={form.type}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, type: event.target.value }))
                  }
                  disabled={loading}
                  required
                  list="type-suggestions-new"
                />
                <datalist id="type-suggestions-new">
                  {allowedTypes.map((type) => (
                    <option key={type} value={type} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">项目<span className="text-red-500">*</span></label>
              <select
                value={form.project}
                onChange={(e) => setForm((prev) => ({ ...prev, project: e.target.value }))}
                disabled={loading}
                required
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">请选择项目</option>
                {getAllProjects().map((project) => (
                  <option key={project} value={project}>
                    {getProjectDisplayName(project)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">风格（逗号分隔，可新增）</label>
              <div className="space-y-1">
                <Input
                  placeholder="写实, 二次元"
                  value={form.style}
                  onChange={handleInputChange('style')}
                  disabled={loading}
                  list="style-suggestions-new"
                />
                <datalist id="style-suggestions-new">
                  {STYLE_SUGGESTIONS.map((style) => (
                    <option key={style} value={style} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">标签（逗号分隔，至少1个）<span className="text-red-500">*</span></label>
              <Input
                placeholder="自然, 风景, 建筑"
                value={form.tags}
                onChange={handleInputChange('tags')}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">来源（可新增）<span className="text-red-500">*</span></label>
              <div className="space-y-1">
                <Input
                  placeholder="内部"
                  value={form.source}
                  onChange={handleInputChange('source')}
                  disabled={loading}
                  list="source-suggestions-new"
                  required
                />
                <datalist id="source-suggestions-new">
                  {SOURCE_SUGGESTIONS.map((source) => (
                    <option key={source} value={source} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">版本（可新增）<span className="text-red-500">*</span></label>
              <div className="space-y-1">
                <Input
                  placeholder="UE5.5"
                  value={form.engineVersion}
                  onChange={handleInputChange('engineVersion')}
                  disabled={loading}
                  list="version-suggestions-new"
                  required
                />
                <datalist id="version-suggestions-new">
                  {VERSION_SUGGESTIONS.map((version) => (
                    <option key={version} value={version} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">广州NAS路径 <span className="text-red-500">*</span></label>
              <Input
                placeholder="例如：/nas/guangzhou/assets/xxx.jpg"
                value={form.guangzhouNas}
                onChange={handleInputChange('guangzhouNas')}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">深圳NAS路径 <span className="text-red-500">*</span></label>
              <Input
                placeholder="例如：/nas/shenzhen/assets/xxx.jpg"
                value={form.shenzhenNas}
                onChange={handleInputChange('shenzhenNas')}
                disabled={loading}
              />
              <p className="text-xs text-gray-600">注意：广州NAS和深圳NAS至少需要填写一个</p>
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
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? '提交中...' : '创建资产'}
            </Button>
            <Button variant="ghost" onClick={resetForm} disabled={loading}>
              重置
            </Button>
            {message && <span className="text-sm text-gray-700">{message}</span>}
          </div>
        </div>
      </div>

      {/* 批量上传弹窗 */}
      <BatchUploadDialog
        open={batchUploadOpen}
        onOpenChange={setBatchUploadOpen}
        onSuccess={() => {
          setBatchUploadOpen(false);
          // 触发资产列表刷新
          refreshAssets();
          if (onAssetCreated) {
            onAssetCreated();
          }
        }}
      />
    </div>
  );
}

