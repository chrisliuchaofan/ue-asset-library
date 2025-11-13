'use client';

import { useCallback, useMemo, useState, useRef, useEffect, type ChangeEvent } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { createPortal } from 'react-dom';
import type { Material } from '@/data/material.schema';
import { MaterialTypeEnum, MaterialTagEnum, MaterialQualityEnum } from '@/data/material.schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Upload, X, ChevronLeft, ChevronRight, Trash2, Star, Search, Tags, CheckSquare, Edit } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { PROJECTS } from '@/lib/constants';
import { MaterialsTagsManagementDialog } from './materials-tags-management-dialog';
import { MaterialsBatchEditDialog } from './materials-batch-edit-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { uploadFileDirect } from '@/lib/client/direct-upload';
import { useAdminRefresh } from './admin-refresh-context';

type StorageMode = 'local' | 'oss';

interface AdminMaterialsDashboardProps {
  initialMaterials: Material[];
  storageMode: StorageMode;
  cdnBase: string;
  showOnlyForm?: boolean;
  showOnlyList?: boolean;
  refreshKey?: number;
}

const MATERIAL_TYPES = MaterialTypeEnum.options;
const MATERIAL_TAGS = MaterialTagEnum.options;
const MATERIAL_QUALITIES = MaterialQualityEnum.options;

const PREVIEW_SIZE = 56;
const ROW_HEIGHT = 56; // 更紧凑的行高
const SELECTION_COL_WIDTH = 48;

// 计算最小宽度：表头文字宽度（每个中文字符约12px）+ padding（16px）
const MATERIAL_COLUMNS = [
  { id: 'preview', label: '预览图', defaultWidth: 128, minWidth: 52 }, // 3字 * 12 + 16 = 52
  { id: 'name', label: '名称', defaultWidth: 240, minWidth: 40 }, // 2字 * 12 + 16 = 40
  { id: 'type', label: '类型', defaultWidth: 140, minWidth: 40 }, // 2字 * 12 + 16 = 40
  { id: 'tag', label: '标签', defaultWidth: 140, minWidth: 40 }, // 2字 * 12 + 16 = 40
  { id: 'quality', label: '质量', defaultWidth: 220, minWidth: 40 }, // 2字 * 12 + 16 = 40
  { id: 'updatedAt', label: '更新时间', defaultWidth: 160, minWidth: 64 }, // 4字 * 12 + 16 = 64
  { id: 'actions', label: '操作', defaultWidth: 160, minWidth: 40 }, // 2字 * 12 + 16 = 40
] as const;

interface FormState {
  name: string;
  type: 'UE视频' | 'AE视频' | '混剪' | 'AI视频' | '图片';
  project: '项目A' | '项目B' | '项目C' | '';
  tag: '爆款' | '优质' | '达标';
  quality: ('高品质' | '常规' | '迭代')[];
  thumbnail: string;
  src: string;
  gallery: string;
  filesize: string;
  width: string;
  height: string;
  duration: string;
}

const initialFormState: FormState = {
  name: '',
  type: 'UE视频',
  project: '',
  tag: '达标',
  quality: ['常规'],
  thumbnail: '',
  src: '',
  gallery: '',
  filesize: '',
  width: '',
  height: '',
  duration: '',
};

export function AdminMaterialsDashboard({ initialMaterials, storageMode, cdnBase, showOnlyForm, showOnlyList, refreshKey }: AdminMaterialsDashboardProps) {
  const { refreshMaterials: triggerRefresh } = useAdminRefresh();
  const [materials, setMaterials] = useState<Material[]>(initialMaterials);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [originalMaterial, setOriginalMaterial] = useState<Material | null>(null);
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
    width?: number;
    height?: number;
    hash?: string;
  }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 搜索和筛选状态
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterProject, setFilterProject] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('');
  const [filterTag, setFilterTag] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [tagsManagementOpen, setTagsManagementOpen] = useState(false);
  const ITEMS_PER_PAGE = 12;
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<string>>(new Set());
  const [batchEditOpen, setBatchEditOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMaterialInDialog, setEditingMaterialInDialog] = useState<Material | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const rowRefsRef = useRef<Map<string, HTMLTableRowElement>>(new Map());
  
  // 框选功能状态
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectStart, setSelectStart] = useState<{ x: number; y: number } | null>(null);
  const [selectEnd, setSelectEnd] = useState<{ x: number; y: number } | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  
  const [columnWidths, setColumnWidths] = useState<Record<(typeof MATERIAL_COLUMNS)[number]['id'], number>>(() =>
    MATERIAL_COLUMNS.reduce((acc, column) => {
      acc[column.id] = column.defaultWidth;
      return acc;
    }, {} as Record<(typeof MATERIAL_COLUMNS)[number]['id'], number>)
  );
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const nameCollator = useMemo(
    () => new Intl.Collator('zh-Hans-u-co-pinyin', { sensitivity: 'base', numeric: true }),
    []
  );

  const normalizedCdnBase = useMemo(() => cdnBase.replace(/\/+$/, ''), [cdnBase]);

  const resetForm = useCallback(() => {
    setForm(initialFormState);
    setEditingMaterialId(null);
    setOriginalMaterial(null);
    setPreviewUrls([]);
    setCurrentPreviewIndex(0);
    setUploadedFiles([]);
  }, []);

  // 计算文件 hash（用于唯一性检查）
  const calculateFileHash = useCallback(async (file: File): Promise<string> => {
    try {
      if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        const buffer = await file.arrayBuffer();
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (error) {
      console.warn('计算文件哈希失败，使用回退方案:', error);
    }
    const fallback = `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`;
    return fallback;
  }, []);

  // 检查文件是否已上传
  const checkFileExists = useCallback(async (file: File): Promise<string | null> => {
    const fileHash = await calculateFileHash(file);
    const existingFile = uploadedFiles.find((f) => f.hash === fileHash);
    if (existingFile) {
      return existingFile.url;
    }
    return null;
  }, [uploadedFiles, calculateFileHash]);

  const getMaterialMissingFields = useCallback((material: Material) => {
    const missing: string[] = [];
    if (!material.thumbnail) missing.push('预览图');
    if (!material.src) missing.push('资源路径');
    if (!material.gallery || material.gallery.length === 0) missing.push('画廊');
    if (!material.quality || material.quality.length === 0) missing.push('质量');
    if (!material.tag) missing.push('标签');
    if (material.type === 'UE视频') {
      if (material.duration == null) missing.push('时长');
    } else if (material.type === '图片') {
      if (material.width == null || material.height == null) missing.push('尺寸');
    }
    return missing;
  }, []);

  const getLocalMediaMetadata = useCallback(async (file: File) => {
    const result: { width?: number; height?: number; duration?: number } = {};

    const cleanup = (url: string) => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    };

    try {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        await new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            result.width = img.naturalWidth;
            result.height = img.naturalHeight;
            cleanup(url);
            resolve();
          };
          img.onerror = (err) => {
            cleanup(url);
            reject(err);
          };
          img.src = url;
        });
      } else if (file.type.startsWith('video/')) {
        const url = URL.createObjectURL(file);
        await new Promise<void>((resolve, reject) => {
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.onloadedmetadata = () => {
            result.width = video.videoWidth || undefined;
            result.height = video.videoHeight || undefined;
            result.duration = isFinite(video.duration) ? Math.round(video.duration) : undefined;
            cleanup(url);
            resolve();
          };
          video.onerror = (err) => {
            cleanup(url);
            reject(err);
          };
          video.src = url;
        });
      }
    } catch (error) {
      console.warn('获取本地素材尺寸信息失败:', error);
    }

    return result;
  }, []);

  const handleColumnResizeStart = useCallback(
    (event: ReactMouseEvent<HTMLSpanElement>, columnId: (typeof MATERIAL_COLUMNS)[number]['id']) => {
      event.preventDefault();
      event.stopPropagation();
      const column = MATERIAL_COLUMNS.find((col) => col.id === columnId);
      if (!column) return;

      const startX = event.clientX;
      const startWidth = columnWidths[columnId];

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX;
        const nextWidth = Math.max(column.minWidth, startWidth + delta);
        setColumnWidths((prev) => {
          if (prev[columnId] === nextWidth) {
            return prev;
          }
          return { ...prev, [columnId]: nextWidth };
        });
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.classList.remove('select-none');
      };

      document.body.classList.add('select-none');
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [columnWidths]
  );

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

  // 删除已上传文件
  const handleRemoveUploadedFile = useCallback((index: number) => {
    setUploadedFiles((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      updateFormFromUploadedFiles(updated);
      return updated;
    });
  }, [updateFormFromUploadedFiles]);

  // 设置为预览图
  const handleSetAsThumbnail = useCallback((fileUrl: string) => {
    setForm((prev) => ({
      ...prev,
      thumbnail: fileUrl,
    }));
    setMessage('已设置为预览图');
  }, []);

  // 从视频中提取缩略图
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

  const handleInputChange =
    (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const refreshMaterials = useCallback(async () => {
    const response = await fetch('/api/materials', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('获取素材列表失败');
    }
    const data = await response.json();
    setMaterials(data.materials);
  }, []);

  // 当 refreshKey 变化时，刷新素材列表
  useEffect(() => {
    if (refreshKey !== undefined && refreshKey > 0) {
      refreshMaterials();
    }
  }, [refreshKey, refreshMaterials]);

  // 处理标签管理保存
  const handleTagsSave = useCallback(async (tagMappings: { oldTag: string; newTag: string | null }[]) => {
    // 素材的标签是固定的枚举值，不需要映射，但可以更新使用该标签的素材
    await refreshMaterials();
    setMessage('标签已更新');
  }, [refreshMaterials]);

  // 处理类型管理保存
  const handleTypesSave = useCallback(async () => {
    await refreshMaterials();
    setMessage('类型已更新');
  }, [refreshMaterials]);

  // 多文件上传，分别创建素材
  const handleMultipleFilesUpload = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress(`正在处理 ${files.length} 个文件...`);
    setMessage(null);

    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];
    const createdMaterials: Material[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(`正在上传 ${i + 1}/${files.length}: ${file.name}...`);
      setUploadProgressPercent(0);

      try {
        // 检查文件是否已存在
        const existingUrl = await checkFileExists(file);
        if (existingUrl) {
          skippedCount++;
          setMessage(`文件 ${file.name} 已存在，跳过上传`);
          continue;
        }

        const localMetadata = await getLocalMediaMetadata(file);

        // 上传文件（根据存储模式选择直传或本地 API）
        let uploadData: {
          url: string;
          originalName: string;
          type: 'image' | 'video';
          size: number;
          width?: number;
          height?: number;
          duration?: number;
          hash?: string;
        };

        if (storageMode === 'oss') {
          const directResult = await uploadFileDirect(file, {
            onProgress: (percent) => {
              setUploadProgress(`正在上传 ${i + 1}/${files.length}: ${file.name}... ${percent}%`);
              setUploadProgressPercent(percent);
            },
          });

          uploadData = {
            url: directResult.fileUrl,
            originalName: file.name,
            type: file.type.startsWith('image/') ? 'image' : 'video',
            size: file.size,
            width: localMetadata.width,
            height: localMetadata.height,
            duration: localMetadata.duration,
          };
        } else {
          const formData = new FormData();
          formData.append('file', file);

          const xhr = new XMLHttpRequest();
          const uploadPromise = new Promise<any>((resolve, reject) => {
            xhr.upload.addEventListener('progress', (e) => {
              if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                setUploadProgress(`正在上传 ${i + 1}/${files.length}: ${file.name}... ${percent}%`);
                setUploadProgressPercent(percent);
              }
            });

            xhr.addEventListener('load', () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const data = JSON.parse(xhr.responseText);
                  resolve(data);
                } catch (err) {
                  reject(new Error(`解析 ${file.name} 的响应失败`));
                }
              } else {
                try {
                  const error = JSON.parse(xhr.responseText);
                  reject(new Error(error.message || `上传 ${file.name} 失败`));
                } catch {
                  reject(new Error(`上传 ${file.name} 失败: HTTP ${xhr.status}`));
                }
              }
            });

            xhr.addEventListener('error', () => {
              reject(new Error(`上传 ${file.name} 时发生网络错误`));
            });

            xhr.addEventListener('abort', () => {
              reject(new Error(`上传 ${file.name} 已取消`));
            });

            xhr.open('POST', '/api/upload');
            xhr.send(formData);
          });

          const responseData = await uploadPromise;
          uploadData = {
            url: responseData.url,
            originalName: responseData.originalName,
            type: responseData.type,
            size: responseData.size,
            width: responseData.width ?? localMetadata.width,
            height: responseData.height ?? localMetadata.height,
            duration: responseData.duration ?? localMetadata.duration,
            hash: responseData.hash,
          };
        }

        const fileHash = await calculateFileHash(file);

        // 为每个文件创建一个素材
        const materialName = file.name.replace(/\.[^/.]+$/, '');
        const fileType = uploadData.type === 'image' ? '图片' : 'UE视频'; // 默认类型，用户可以在列表中编辑

        // 判断文件类型
        let materialType: 'UE视频' | 'AE视频' | '混剪' | 'AI视频' | '图片' = '图片';
        if (uploadData.type === 'video') {
          materialType = 'UE视频'; // 默认，用户可以编辑
        } else {
          materialType = '图片';
        }

        const materialPayload = {
          name: materialName,
          type: materialType,
          tag: '达标' as const,
          quality: ['常规'] as ('高品质' | '常规' | '迭代')[],
          thumbnail: uploadData.url,
          src: uploadData.url,
          gallery: [uploadData.url],
          filesize: uploadData.size,
          width: uploadData.width ?? localMetadata.width,
          height: uploadData.height ?? localMetadata.height,
          duration: uploadData.duration ?? localMetadata.duration,
        };

        // 创建素材
        const createResponse = await fetch('/api/materials', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(materialPayload),
        });

        if (!createResponse.ok) {
          const error = await createResponse.json();
          throw new Error(error.message || `创建素材失败: ${materialName}`);
        }

        const createdMaterial: Material = await createResponse.json();
        createdMaterials.push(createdMaterial);
        successCount++;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '未知错误';
        console.error(`处理文件 ${file.name} 失败:`, message);

        // 如果是重复素材，提示并跳过
        if (message.includes('已存在') || message.includes('组合已存在')) {
          skippedCount++;
          continue;
        }

        failCount++;
        errors.push(`${file.name}: ${message}`);
      }
    }

    setUploading(false);
    setUploadProgress(null);
    setUploadProgressPercent(0);

    if (createdMaterials.length > 0) {
      setMaterials((prev) => [...createdMaterials, ...prev]);
      await refreshMaterials();
      // 如果是在 showOnlyForm 模式下，触发 Context 刷新以更新列表
      if (showOnlyForm) {
        triggerRefresh();
      }
      const successMessage = `成功创建 ${successCount} 个素材${failCount > 0 ? `，失败 ${failCount} 个` : ''}`;
      setMessage(successMessage);
      if (typeof window !== 'undefined') {
        window.alert(successMessage);
      }
    } else if (successCount === 0 && failCount === 0 && skippedCount > 0) {
      const skipMessage = `已跳过 ${skippedCount} 个重复素材`;
      setMessage(skipMessage);
      if (typeof window !== 'undefined') {
        window.alert(skipMessage);
      }
    } else if (failCount === files.length) {
      const failureMessage =
        errors.length > 0 ? `所有文件处理失败：${errors.join('；')}` : '所有文件处理失败';
      setMessage(failureMessage);
      if (typeof window !== 'undefined') {
        window.alert(failureMessage);
      }
    } else if (failCount > 0) {
      const partialMessage = `成功 ${successCount} 个，失败 ${failCount} 个${skippedCount > 0 ? `，跳过 ${skippedCount} 个重复素材` : ''}`;
      setMessage(partialMessage);
      if (typeof window !== 'undefined') {
        window.alert(`${partialMessage}\n失败详情：\n${errors.join('\n')}`);
      }
    }

    if (errors.length > 0) {
      console.error('处理错误:', errors);
    }

    // 清空文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [checkFileExists, calculateFileHash, refreshMaterials, getLocalMediaMetadata, storageMode, normalizedCdnBase]);

  // 单文件上传（用于编辑时添加文件）
  const handleFileUpload = useCallback(async (file: File) => {
    setUploading(true);
    setUploadProgress(`正在上传 ${file.name}...`);
    setMessage(null);

    try {
      const existingUrl = await checkFileExists(file);
      if (existingUrl) {
        setMessage(`文件已存在: ${file.name}`);
        setUploading(false);
        return;
      }

      const localMetadata = await getLocalMediaMetadata(file);

      let data: {
        url: string;
        originalName: string;
        type: 'image' | 'video';
        size: number;
        width?: number;
        height?: number;
        duration?: number;
        hash?: string;
      };

      if (storageMode === 'oss') {
        const directResult = await uploadFileDirect(file, {
          onProgress: (percent) => {
            setUploadProgressPercent(percent);
            setUploadProgress(`正在上传 ${file.name}... ${percent}%`);
          },
        });

        data = {
          url: directResult.fileUrl,
          originalName: file.name,
          type: file.type.startsWith('image/') ? 'image' : 'video',
          size: file.size,
          width: localMetadata.width,
          height: localMetadata.height,
          duration: localMetadata.duration,
          hash: undefined,
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
              setUploadProgress(`正在上传 ${file.name}... ${percent}%`);
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
          width: responseData.width ?? localMetadata.width,
          height: responseData.height ?? localMetadata.height,
          duration: responseData.duration ?? localMetadata.duration,
        };
      }

      setUploadProgress(null);
      setUploadProgressPercent(0);

      let previewUrl = data.url;
      if (!previewUrl.startsWith('http')) {
        if (storageMode === 'oss' && normalizedCdnBase && normalizedCdnBase !== '/') {
          previewUrl = `${normalizedCdnBase.replace(/\/+$/, '')}${previewUrl}`;
        }
      }

      const fileHash = await calculateFileHash(file);
      const newFile = {
        url: data.url,
        originalName: data.originalName,
        type: data.type,
        size: data.size,
        width: data.width ?? localMetadata.width,
        height: data.height ?? localMetadata.height,
        hash: data.hash || fileHash,
      };

      setUploadedFiles((prev) => {
        const updated = [...prev, newFile];
        updateFormFromUploadedFiles(updated);
        return updated;
      });
      const successMessage = `文件上传成功: ${data.originalName}`;
      setMessage(successMessage);
      if (typeof window !== 'undefined') {
        window.alert(successMessage);
      }

      // 如果是视频，自动创建资产
      if (data.type === 'video') {
        const thumbnailUrl = await extractVideoThumbnail(file);
        if (thumbnailUrl) {
          setForm((prev) => ({
            ...prev,
            thumbnail: thumbnailUrl,
          }));
          setMessage('已从视频中提取缩略图');
        }
      }
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
  }, [storageMode, normalizedCdnBase, uploadedFiles, checkFileExists, calculateFileHash, updateFormFromUploadedFiles, extractVideoThumbnail, getLocalMediaMetadata]);

  const handleFileSelect = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      if (files.length === 0) return;

      // 如果正在编辑，只添加文件到列表
      if (editingMaterialId) {
        for (const file of files) {
          await handleFileUpload(file);
        }
      } else {
        // 如果是新建，多文件上传分别创建
        await handleMultipleFilesUpload(files);
      }
    },
    [editingMaterialId, handleFileUpload, handleMultipleFilesUpload]
  );

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const files = Array.from(event.dataTransfer.files);
      if (files.length === 0) return;

      if (editingMaterialId) {
        for (const file of files) {
          await handleFileUpload(file);
        }
      } else {
        await handleMultipleFilesUpload(files);
      }
    },
    [editingMaterialId, handleFileUpload, handleMultipleFilesUpload]
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  // 筛选素材
  const filteredMaterials = useMemo(() => {
    // 先按项目过滤
    let filtered = filterProject 
      ? materials.filter((material) => material.project === filterProject)
      : materials;

    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter((material) =>
        material.name.toLowerCase().includes(keyword)
      );
    }

    if (filterType) {
      filtered = filtered.filter((material) => material.type === filterType);
    }

    if (filterTag) {
      filtered = filtered.filter((material) => material.tag === filterTag);
    }

    let sorted = [...filtered];
    if (sortKey) {
      sorted = sorted.sort((a, b) => {
        let comparison = 0;
        if (sortKey === 'name') {
          comparison = nameCollator.compare(a.name, b.name);
        } else if (sortKey === 'type') {
          comparison = a.type.localeCompare(b.type);
        } else if (sortKey === 'updatedAt') {
          const aTime = a.updatedAt ?? a.createdAt ?? 0;
          const bTime = b.updatedAt ?? b.createdAt ?? 0;
          comparison = aTime - bTime;
        }
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return sorted;
  }, [materials, filterProject, searchKeyword, filterType, filterTag, sortKey, sortDirection, nameCollator]);

  // 分页显示（每页显示12条）
  const totalPages = useMemo(() => {
    return Math.ceil(filteredMaterials.length / ITEMS_PER_PAGE);
  }, [filteredMaterials.length]);

  const displayedMaterials = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredMaterials.slice(startIndex, endIndex);
  }, [filteredMaterials, currentPage]);

  // 当筛选条件变化时，重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [searchKeyword, filterProject, filterType, filterTag]);

  // 预览图悬停状态
  const [hoveredPreview, setHoveredPreview] = useState<{
    materialId: string;
    elementRef: HTMLDivElement | null;
    mediaFiles: Array<{ url: string; label: string; type: 'image' | 'video' }>;
  } | null>(null);
  const previewRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const getPreviewUrl = useCallback((url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const base = normalizedCdnBase;
    const normalizedPath = url.startsWith('/') ? url : `/${url}`;
    if (base === '/' || !base || base.trim() === '') {
      return normalizedPath;
    }
    if (normalizedPath.startsWith('/assets/')) {
      const ossPath = normalizedPath.substring(1);
      return `${base.replace(/\/+$/, '')}/${ossPath}`;
    }
    return `${base.replace(/\/+$/, '')}${normalizedPath}`;
  }, [normalizedCdnBase]);

  const renderMaterialCell = (
    columnId: (typeof MATERIAL_COLUMNS)[number]['id'],
    material: Material
  ) => {
    const missingFields = getMaterialMissingFields(material);
    const needsReview = missingFields.length > 0;

    switch (columnId) {
      case 'preview': {
        const previewSource = getPreviewUrl(material.thumbnail || material.src);
        const isVideo = Boolean(
          material.thumbnail?.toLowerCase().match(/\.(mp4|webm|mov|avi|mkv)$/) ||
            material.src?.toLowerCase().match(/\.(mp4|webm|mov|avi|mkv)$/)
        );

        // 收集所有媒体文件
        const allMediaFiles: Array<{ url: string; label: string; type: 'image' | 'video' }> = [];
        const isVideoUrl = (url: string) => {
          if (!url) return false;
          const lower = url.toLowerCase();
          return lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.mov') || lower.includes('.avi') || lower.includes('.mkv');
        };

        if (material.thumbnail) {
          allMediaFiles.push({
            url: material.thumbnail,
            label: '封面图',
            type: isVideoUrl(material.thumbnail) ? 'video' : 'image',
          });
        }
        
        if (material.src && material.src !== material.thumbnail) {
          allMediaFiles.push({
            url: material.src,
            label: '资源文件',
            type: isVideoUrl(material.src) ? 'video' : 'image',
          });
        }
        
        if (material.gallery && material.gallery.length > 0) {
          material.gallery.forEach((url, index) => {
            if (url && url !== material.thumbnail && url !== material.src) {
              allMediaFiles.push({
                url,
                label: `画廊 ${index + 1}`,
                type: isVideoUrl(url) ? 'video' : 'image',
              });
            }
          });
        }
        
        if (allMediaFiles.length === 0 && material.src) {
          allMediaFiles.push({
            url: material.src,
            label: '资源文件',
            type: isVideoUrl(material.src) ? 'video' : 'image',
          });
        }

        return (
          <div className="flex h-[56px] items-center">
            <div 
              className="relative group cursor-pointer"
              ref={(el) => {
                if (el) {
                  previewRefs.current.set(material.id, el);
                } else {
                  previewRefs.current.delete(material.id);
                }
              }}
              onMouseEnter={() => {
                if (allMediaFiles.length > 0) {
                  setHoveredPreview({
                    materialId: material.id,
                    elementRef: previewRefs.current.get(material.id) || null,
                    mediaFiles: allMediaFiles,
                  });
                }
              }}
              onMouseLeave={() => {
                setHoveredPreview(null);
              }}
            >
              <div className="relative h-[48px] w-[48px] overflow-hidden border border-gray-300 bg-gray-100">
                {previewSource ? (
                  isVideo ? (
                    <video src={previewSource} className="h-full w-full object-cover" muted playsInline />
                  ) : (
                    <img
                      src={previewSource}
                      alt={material.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[11px] text-gray-500">
                    无预览
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }
      case 'name':
        return (
          <div className="flex h-[56px] items-center text-xs text-gray-700 gap-2" title={needsReview ? `待完善：${missingFields.join('、')}` : material.name}>
            <span className="truncate">{material.name}</span>
            {needsReview && (
              <span className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-800 border border-amber-300">
                待完善
              </span>
            )}
          </div>
        );
      case 'type':
        return (
          <div className="flex h-[56px] items-center whitespace-nowrap text-xs text-gray-700">
            {material.type}
          </div>
        );
      case 'tag':
        return (
          <div className="flex h-[56px] items-center">
            <span className="inline-flex items-center rounded border border-gray-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-700">{material.tag}</span>
          </div>
        );
      case 'quality':
        return (
          <div className="flex h-[56px] flex-wrap items-center gap-1">
            {material.quality.map((quality) => (
              <span key={quality} className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium text-gray-700">
                {quality}
              </span>
            ))}
          </div>
        );
      case 'updatedAt': {
        const timestamp = material.updatedAt ?? material.createdAt;
        const formatted = timestamp
          ? new Date(timestamp).toLocaleString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '-';

        return (
          <div className="flex h-[56px] items-center text-[10px] text-gray-600 whitespace-nowrap">
            {formatted}
          </div>
        );
      }
      case 'actions':
        return (
          <div className="flex h-[56px] items-center gap-1.5">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              onClick={(e) => {
                e.stopPropagation();
                setEditingMaterialInDialog(material);
                setEditDialogOpen(true);
              }}
              disabled={loading}
              title="编辑素材"
            >
              <Edit className="h-4 w-4" />
              <span className="sr-only">编辑</span>
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              onClick={(e) => {
                e.stopPropagation();
                setMaterialToDelete(material);
                setDeleteDialogOpen(true);
              }}
              disabled={loading}
              title="删除素材"
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">删除</span>
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  const handleBatchUpdateType = useCallback(async (nextType: string) => {
    const trimmed = nextType.trim();
    if (!trimmed) {
      throw new Error('类型不能为空');
    }
    if (selectedMaterialIds.size === 0) {
      throw new Error('请先选择至少一个素材');
    }

    const materialIds = Array.from(selectedMaterialIds);
    const response = await fetch('/api/materials/batch-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        materialIds,
        action: 'update-type',
        payload: { type: trimmed },
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || '批量更新类型失败');
    }

    await refreshMaterials();
    setSelectedMaterialIds(new Set());
    setMessage(result.message || `已更新 ${result.processed ?? materialIds.length} 个素材的类型`);
  }, [selectedMaterialIds, refreshMaterials]);

  const handleBatchUpdateTag = useCallback(async (nextTag: string) => {
    const trimmed = nextTag.trim();
    if (!trimmed) {
      throw new Error('标签不能为空');
    }
    if (selectedMaterialIds.size === 0) {
      throw new Error('请先选择至少一个素材');
    }

    const materialIds = Array.from(selectedMaterialIds);
    const response = await fetch('/api/materials/batch-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        materialIds,
        action: 'update-tag',
        payload: { tag: trimmed },
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || '批量更新标签失败');
    }

    await refreshMaterials();
    setSelectedMaterialIds(new Set());
    setMessage(result.message || `已更新 ${result.processed ?? materialIds.length} 个素材的标签`);
  }, [selectedMaterialIds, refreshMaterials]);

  const handleBatchUpdateQuality = useCallback(async (qualities: string[]) => {
    const filtered = Array.from(new Set(qualities.map((q) => q.trim()).filter(Boolean)));
    if (filtered.length === 0) {
      throw new Error('至少选择一个质量');
    }
    if (selectedMaterialIds.size === 0) {
      throw new Error('请先选择至少一个素材');
    }

    const materialIds = Array.from(selectedMaterialIds);
    const response = await fetch('/api/materials/batch-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        materialIds,
        action: 'update-quality',
        payload: { quality: filtered },
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || '批量更新质量失败');
    }

    await refreshMaterials();
    setSelectedMaterialIds(new Set());
    setMessage(result.message || `已更新 ${result.processed ?? materialIds.length} 个素材的质量`);
  }, [selectedMaterialIds, refreshMaterials]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedMaterialIds.size === 0) {
      throw new Error('请先选择至少一个素材');
    }

    const materialIds = Array.from(selectedMaterialIds);
    const response = await fetch('/api/materials/batch-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        materialIds,
        action: 'delete',
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || '批量删除失败');
    }

    await refreshMaterials();
    setSelectedMaterialIds(new Set());
    setMessage(result.message || `已删除 ${result.processed ?? materialIds.length} 个素材`);
  }, [selectedMaterialIds, refreshMaterials]);

  const handleCreate = async () => {
    setMessage(null);
    setLoading(true);
    try {
      if (!form.name.trim()) {
        throw new Error('名称不能为空');
      }
      if (form.quality.length === 0) {
        throw new Error('至少需要选择一个质量');
      }
      if (!form.project) {
        throw new Error('项目不能为空');
      }

      const payload = {
        name: form.name.trim(),
        type: form.type,
        project: form.project,
        tag: form.tag,
        quality: form.quality,
        thumbnail: form.thumbnail || undefined,
        src: form.src || undefined,
        gallery: form.gallery
          ? form.gallery.split(',').map((url) => url.trim()).filter(Boolean)
          : undefined,
        filesize: form.filesize ? Number(form.filesize) : undefined,
        width: form.width ? Number(form.width) : undefined,
        height: form.height ? Number(form.height) : undefined,
        duration: form.duration ? Number(form.duration) : undefined,
      };

      const response = await fetch('/api/materials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '创建素材失败');
      }

      await refreshMaterials();
      resetForm();
      setMessage('素材已创建');
      // 如果是在 showOnlyForm 模式下，触发 Context 刷新以更新列表
      if (showOnlyForm) {
        triggerRefresh();
      }
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : '创建素材失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const material = materials.find((m) => m.id === id);
    const materialName = material?.name || '该素材';
    
    if (!confirm(`确定要删除素材 "${materialName}" 吗？此操作不可恢复。`)) {
      return;
    }
    
    setMessage(null);
    setLoading(true);
    try {
      const response = await fetch(`/api/materials/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '删除素材失败');
      }

      setMaterials((prev) => prev.filter((material) => material.id !== id));
      await refreshMaterials();
      setMessage('素材已删除');
      if (typeof window !== 'undefined') {
        window.alert(`已删除素材：${materialName}`);
      }
      if (editingMaterialId === id) {
        resetForm();
      }
      setSelectedMaterialIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : '删除素材失败');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = useCallback((material: Material) => {
    setEditingMaterialId(material.id);
    setOriginalMaterial(JSON.parse(JSON.stringify(material)));
    
    setForm({
      name: material.name,
      type: material.type,
      project: material.project || '',
      tag: material.tag,
      quality: material.quality,
      thumbnail: material.thumbnail || '',
      src: material.src || '',
      gallery: material.gallery?.join(', ') || '',
      filesize: material.filesize ? String(material.filesize) : '',
      width: material.width ? String(material.width) : '',
      height: material.height ? String(material.height) : '',
      duration: material.duration ? String(material.duration) : '',
    });

    // 设置已上传文件列表
    const allMediaFiles: Array<{
      url: string;
      originalName: string;
      type: 'image' | 'video';
      size: number;
    }> = [];

    const isVideoUrl = (url: string) => {
      if (!url) return false;
      const lower = url.toLowerCase();
      return lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.mov') || lower.includes('.avi') || lower.includes('.mkv');
    };

    if (material.thumbnail) {
      allMediaFiles.push({
        url: material.thumbnail,
        originalName: material.thumbnail.split('/').pop() || 'thumbnail',
        type: isVideoUrl(material.thumbnail) ? 'video' : 'image',
        size: material.filesize || 0,
      });
    }

    if (material.src && material.src !== material.thumbnail) {
      allMediaFiles.push({
        url: material.src,
        originalName: material.src.split('/').pop() || 'src',
        type: isVideoUrl(material.src) ? 'video' : 'image',
        size: material.filesize || 0,
      });
    }

    if (material.gallery && material.gallery.length > 0) {
      material.gallery.forEach((url) => {
        if (url && url !== material.thumbnail && url !== material.src) {
          allMediaFiles.push({
            url: url,
            originalName: url.split('/').pop() || `gallery-${allMediaFiles.length}`,
            type: isVideoUrl(url) ? 'video' : 'image',
            size: 0,
          });
        }
      });
    }

    setUploadedFiles(allMediaFiles);

    if (material.gallery && material.gallery.length > 0) {
      const previewUrls = material.gallery.map((url) => {
        if (!url.startsWith('http')) {
          if (storageMode === 'oss' && normalizedCdnBase && normalizedCdnBase !== '/') {
            return `${normalizedCdnBase.replace(/\/+$/, '')}${url}`;
          }
        }
        return url;
      });
      setPreviewUrls(previewUrls);
      setCurrentPreviewIndex(0);
    } else if (material.thumbnail || material.src) {
      const url = material.thumbnail || material.src;
      const previewUrl = url.startsWith('http')
        ? url
        : storageMode === 'oss' && normalizedCdnBase && normalizedCdnBase !== '/'
        ? `${normalizedCdnBase.replace(/\/+$/, '')}${url}`
        : url;
      setPreviewUrls([previewUrl]);
      setCurrentPreviewIndex(0);
    }

    setTimeout(() => {
      const formCard = document.getElementById('material-form-card');
      if (formCard) {
        formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }, [storageMode, normalizedCdnBase]);

  const hasFormChanged = useMemo(() => {
    if (!editingMaterialId || !originalMaterial) return false;

    const formQuality = [...form.quality].sort();
    const originalQuality = [...originalMaterial.quality].sort();

    return (
      form.name.trim() !== originalMaterial.name ||
      form.type !== originalMaterial.type ||
      form.tag !== originalMaterial.tag ||
      JSON.stringify(formQuality) !== JSON.stringify(originalQuality) ||
      form.thumbnail.trim() !== (originalMaterial.thumbnail || '') ||
      form.src.trim() !== (originalMaterial.src || '') ||
      form.gallery.trim() !== (originalMaterial.gallery?.join(', ') || '') ||
      form.filesize !== (originalMaterial.filesize ? String(originalMaterial.filesize) : '') ||
      form.width !== (originalMaterial.width ? String(originalMaterial.width) : '') ||
      form.height !== (originalMaterial.height ? String(originalMaterial.height) : '') ||
      form.duration !== (originalMaterial.duration ? String(originalMaterial.duration) : '')
    );
  }, [form, editingMaterialId, originalMaterial]);

  const handleUpdate = async () => {
    if (!editingMaterialId) return;
    
    setMessage(null);
    setLoading(true);
    try {
      if (!form.name.trim()) {
        throw new Error('名称不能为空');
      }
      if (form.quality.length === 0) {
        throw new Error('至少需要选择一个质量');
      }

      const payload = {
        id: editingMaterialId,
        name: form.name.trim(),
        type: form.type,
        project: form.project || undefined,
        tag: form.tag,
        quality: form.quality,
        thumbnail: form.thumbnail || undefined,
        src: form.src || undefined,
        gallery: form.gallery
          ? form.gallery.split(',').map((url) => url.trim()).filter(Boolean)
          : undefined,
        filesize: form.filesize ? Number(form.filesize) : undefined,
        width: form.width ? Number(form.width) : undefined,
        height: form.height ? Number(form.height) : undefined,
        duration: form.duration ? Number(form.duration) : undefined,
      };

      const response = await fetch(`/api/materials/${editingMaterialId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '更新素材失败');
      }

      await refreshMaterials();
      resetForm();
      setMessage('素材已更新');
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : '更新素材失败');
    } finally {
      setLoading(false);
    }
  };

  const handleQualityToggle = (quality: '高品质' | '常规' | '迭代', checked: boolean) => {
    setForm((prev) => {
      const newQuality = checked
        ? [...prev.quality, quality]
        : prev.quality.filter((q) => q !== quality);
      return {
        ...prev,
        quality: newQuality.length > 0 ? newQuality : ['常规'], // 至少保留一个
      };
    });
  };

  useEffect(() => {
    setSelectedMaterialIds((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set<string>();
      for (const material of materials) {
        if (prev.has(material.id)) {
          next.add(material.id);
        }
      }
      if (next.size === prev.size) {
        return prev;
      }
      return next;
    });
  }, [materials]);

  useEffect(() => {
    if (batchEditOpen && selectedMaterialIds.size === 0) {
      setBatchEditOpen(false);
    }
  }, [batchEditOpen, selectedMaterialIds]);

  // 处理多选：长按和shift连续多选
  // 框选功能：在表格容器上按下鼠标开始框选
  const handleTableMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // 如果点击的是checkbox、按钮、列宽调整区域或表头，不启动框选
    if (
      target.closest('input[type="checkbox"]') ||
      target.closest('button') ||
      target.closest('[class*="cursor-col-resize"]') ||
      target.closest('thead') ||
      target.closest('th')
    ) {
      return;
    }

    // 如果按住Ctrl/Cmd，不启动框选（允许单独点击）
    if (e.ctrlKey || e.metaKey) {
      return;
    }

    const rect = tableContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;

    setIsSelecting(true);
    setSelectStart({ x: startX, y: startY });
    setSelectEnd({ x: startX, y: startY });

    // 保存初始选择状态，用于累加选择
    const initialSelection = new Set(selectedMaterialIds);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!tableContainerRef.current) return;
      const rect = tableContainerRef.current.getBoundingClientRect();
      const endX = moveEvent.clientX - rect.left;
      const endY = moveEvent.clientY - rect.top;
      setSelectEnd({ x: endX, y: startY }); // 使用startY作为固定起点

      // 实时选中框内的行
      const minX = Math.min(startX, endX);
      const maxX = Math.max(startX, endX);
      const minY = Math.min(startY, endY);
      const maxY = Math.max(startY, endY);

      const newSelection = new Set(initialSelection);
      displayedMaterials.forEach((material) => {
        const rowElement = rowRefsRef.current.get(material.id);
        if (rowElement) {
          const rowRect = rowElement.getBoundingClientRect();
          const containerRect = tableContainerRef.current!.getBoundingClientRect();
          const rowTop = rowRect.top - containerRect.top;
          const rowBottom = rowRect.bottom - containerRect.top;
          const rowLeft = rowRect.left - containerRect.left;
          const rowRight = rowRect.right - containerRect.left;

          // 检查行是否与选择框相交
          if (
            rowBottom > minY &&
            rowTop < maxY &&
            rowRight > minX &&
            rowLeft < maxX
          ) {
            newSelection.add(material.id);
          } else {
            // 如果不在选择框内，从初始选择中移除（如果原本不在初始选择中）
            if (!initialSelection.has(material.id)) {
              newSelection.delete(material.id);
            }
          }
        }
      });
      setSelectedMaterialIds(newSelection);
    };

    const handleMouseUp = () => {
      setIsSelecting(false);
      setSelectStart(null);
      setSelectEnd(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [selectedMaterialIds, displayedMaterials]);

  const handleRowMouseDown = useCallback((materialId: string, index: number, event: React.MouseEvent) => {
    // 如果按住shift，进行连续多选
    if (event.shiftKey && lastSelectedIndex !== null) {
      event.preventDefault();
      const startIndex = Math.min(lastSelectedIndex, index);
      const endIndex = Math.max(lastSelectedIndex, index);
      const newSelection = new Set(selectedMaterialIds);
      for (let i = startIndex; i <= endIndex; i++) {
        if (displayedMaterials[i]) {
          newSelection.add(displayedMaterials[i].id);
        }
      }
      setSelectedMaterialIds(newSelection);
      return;
    }

    // 长按多选
    const timer = setTimeout(() => {
      setIsLongPressing(true);
      const newSelection = new Set(selectedMaterialIds);
      if (!newSelection.has(materialId)) {
        newSelection.add(materialId);
        setSelectedMaterialIds(newSelection);
      }
    }, 500); // 500ms后触发长按

    longPressTimerRef.current = timer;

    const handleMouseUp = () => {
      clearTimeout(timer);
      longPressTimerRef.current = null;
      setIsLongPressing(false);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
    };

    const handleMouseMove = () => {
      clearTimeout(timer);
      longPressTimerRef.current = null;
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);
  }, [selectedMaterialIds, lastSelectedIndex, displayedMaterials]);

  // 清理长按定时器
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  // 处理列头点击排序
  const handleColumnSort = useCallback((columnId: string) => {
    if (sortKey === columnId) {
      // 如果已经是当前排序列，切换排序方向
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(columnId);
      setSortDirection('asc');
    }
  }, [sortKey]);

  return (
    <div className="space-y-4 h-full flex flex-col">
      {!showOnlyForm && (
      <div className="border border-gray-200 bg-white">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold text-gray-900">素材列表</h3>
            <div className="flex flex-wrap items-center gap-2">
              {selectedMaterialIds.size > 0 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setBatchEditOpen(true)}
                >
                  <CheckSquare className="mr-2 h-4 w-4" />
                  批量操作 ({selectedMaterialIds.size})
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTagsManagementOpen(true)}
              >
                <Tags className="mr-2 h-4 w-4" />
                标签和类型管理
              </Button>
            </div>
          </div>
        </div>
        <div className="space-y-4 px-4 py-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="搜索素材名称..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="pl-10 border-gray-300 bg-white text-gray-900"
                />
              </div>
              <select
                className="h-9 rounded border border-gray-300 bg-white px-3 text-sm text-gray-900"
                value={filterProject || ''}
                onChange={(e) => setFilterProject(e.target.value || null)}
              >
                <option value="">全部项目</option>
                {PROJECTS.map((project) => (
                  <option key={project} value={project}>
                    {project}
                  </option>
                ))}
              </select>
              <select
                className="h-9 rounded border border-gray-300 bg-white px-3 text-sm text-gray-900"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="">全部类型</option>
                {MATERIAL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <select
                className="h-9 rounded border border-gray-300 bg-white px-3 text-sm text-gray-900"
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
              >
                <option value="">全部标签</option>
                {MATERIAL_TAGS.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-gray-600">
                共找到 {filteredMaterials.length} 个素材
                {filteredMaterials.length !== materials.length && `（共 ${materials.length} 个）`}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-hidden border border-gray-200 bg-white">
            <div 
              ref={tableContainerRef}
              className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-400px)] relative"
              onMouseDown={handleTableMouseDown}
            >
              {/* 选择框视觉反馈 */}
              {isSelecting && selectStart && selectEnd && (
                <div
                  className="absolute border-2 border-blue-500 bg-blue-100/20 pointer-events-none z-30"
                  style={{
                    left: `${Math.min(selectStart.x, selectEnd.x)}px`,
                    top: `${Math.min(selectStart.y, selectEnd.y)}px`,
                    width: `${Math.abs(selectEnd.x - selectStart.x)}px`,
                    height: `${Math.abs(selectEnd.y - selectStart.y)}px`,
                  }}
                />
              )}
              <table className="min-w-full table-fixed text-xs sm:text-sm">
                <colgroup>
                  <col style={{ width: `${SELECTION_COL_WIDTH}px` }} />
                  {MATERIAL_COLUMNS.map((column) => (
                    <col key={column.id} style={{ width: `${columnWidths[column.id]}px` }} />
                  ))}
                </colgroup>
                <thead className="bg-gray-50 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">
                  <tr>
                    <th className="px-2 py-2">
                      <div className="flex h-[32px] items-center justify-center">
                        <Checkbox
                          checked={
                            displayedMaterials.length > 0 &&
                            displayedMaterials.every((material) => selectedMaterialIds.has(material.id))
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              const next = new Set(selectedMaterialIds);
                              displayedMaterials.forEach((material) => next.add(material.id));
                              setSelectedMaterialIds(next);
                            } else {
                              const next = new Set(selectedMaterialIds);
                              displayedMaterials.forEach((material) => next.delete(material.id));
                              setSelectedMaterialIds(next);
                            }
                          }}
                        />
                      </div>
                    </th>
                    {MATERIAL_COLUMNS.map((column) => {
                      const isActions = column.id === 'actions';
                      const isSortable = ['name', 'type', 'updatedAt'].includes(column.id);
                      const isSorted = sortKey === column.id;
                      return (
                        <th 
                          key={column.id} 
                          className="relative px-2 py-2 text-sm font-semibold text-gray-700"
                        >
                          <div 
                            className={cn(
                              "flex items-center gap-1",
                              isSortable && "cursor-pointer hover:text-gray-900 select-none"
                            )}
                            onClick={() => isSortable && handleColumnSort(column.id)}
                          >
                            <span>{column.label}</span>
                            {isSortable && (
                              <span className="text-[8px] text-gray-400">
                                {isSorted ? (sortDirection === 'asc' ? '↑' : '↓') : '⇅'}
                              </span>
                            )}
                          </div>
                          {!isActions && (
                            <span
                              onMouseDown={(event) => {
                                event.stopPropagation();
                                handleColumnResizeStart(event, column.id);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-0 h-full w-4 cursor-col-resize select-none hover:bg-blue-300 z-20 transition-colors"
                              style={{ marginRight: '-8px', paddingLeft: '4px', paddingRight: '4px' }}
                            />
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {displayedMaterials.map((material, index) => {
                    const missingFields = getMaterialMissingFields(material);
                    const isIncomplete = missingFields.length > 0;
                    const isSelected = selectedMaterialIds.has(material.id);
                    return (
                      <tr
                        key={material.id}
                        ref={(el) => {
                          if (el) rowRefsRef.current.set(material.id, el);
                          else rowRefsRef.current.delete(material.id);
                        }}
                        className={`align-middle transition-colors cursor-pointer select-none ${isSelected ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-gray-50'} ${isIncomplete ? 'border-r border-r-amber-400 bg-amber-50' : ''}`}
                        title={isIncomplete ? `待完善：${missingFields.join('、')}` : undefined}
                        onMouseDown={(e) => {
                          // 如果点击的是checkbox或按钮，不触发行选择
                          const target = e.target as HTMLElement;
                          if (target.closest('input[type="checkbox"]') || target.closest('button')) {
                            return;
                          }
                          handleRowMouseDown(material.id, index, e);
                        }}
                        onClick={(e) => {
                          // 如果点击的是checkbox或按钮，不触发行选择
                          const target = e.target as HTMLElement;
                          if (target.closest('input[type="checkbox"]') || target.closest('button')) {
                            return;
                          }
                          // 普通点击切换选择
                          if (!e.shiftKey && !isLongPressing) {
                            const nextSelection = new Set(selectedMaterialIds);
                            if (nextSelection.has(material.id)) {
                              nextSelection.delete(material.id);
                            } else {
                              nextSelection.add(material.id);
                            }
                            setSelectedMaterialIds(nextSelection);
                            setLastSelectedIndex(index);
                          }
                        }}
                      >
                        <td className="px-2 py-1.5">
                          <div className="flex h-[56px] items-center justify-center">
                            <Checkbox
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                const nextSelection = new Set(selectedMaterialIds);
                                if (e.target.checked) {
                                  nextSelection.add(material.id);
                                } else {
                                  nextSelection.delete(material.id);
                                }
                                setSelectedMaterialIds(nextSelection);
                                setLastSelectedIndex(index);
                              }}
                            />
                          </div>
                        </td>
                        {MATERIAL_COLUMNS.map((column) => (
                          <td key={column.id} className="px-2 py-1.5">
                            {renderMaterialCell(column.id, material)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 横向分页控制 */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="h-8 px-3"
              >
                <ChevronLeft className="h-4 w-4" />
                上一页
              </Button>
              <div className="flex items-center gap-1">
                {/* 显示页码按钮，最多显示7个页码 */}
                {(() => {
                  const pages: (number | string)[] = [];
                  const maxVisible = 7;
                  
                  if (totalPages <= maxVisible) {
                    // 如果总页数少于等于7，显示所有页码
                    for (let i = 1; i <= totalPages; i++) {
                      pages.push(i);
                    }
                  } else {
                    // 否则显示：1 ... 当前页附近 ... 最后一页
                    pages.push(1);
                    
                    if (currentPage > 3) {
                      pages.push('...');
                    }
                    
                    const start = Math.max(2, currentPage - 1);
                    const end = Math.min(totalPages - 1, currentPage + 1);
                    
                    for (let i = start; i <= end; i++) {
                      if (i !== 1 && i !== totalPages) {
                        pages.push(i);
                      }
                    }
                    
                    if (currentPage < totalPages - 2) {
                      pages.push('...');
                    }
                    
                    pages.push(totalPages);
                  }
                  
                  return pages.map((page, index) => {
                    if (page === '...') {
                      return (
                        <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
                          ...
                        </span>
                      );
                    }
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(page as number)}
                        className={`h-8 min-w-[32px] px-2 ${
                          currentPage === page ? 'bg-blue-600 text-white' : ''
                        }`}
                      >
                        {page}
                      </Button>
                    );
                  });
                })()}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="h-8 px-3"
              >
                下一页
                <ChevronRight className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-600 ml-2">
                第 {currentPage} / {totalPages} 页，共 {filteredMaterials.length} 条
              </span>
            </div>
          )}
        </div>
      </div>
      )}

      <MaterialsBatchEditDialog
        open={batchEditOpen}
        onOpenChange={setBatchEditOpen}
        selectedCount={selectedMaterialIds.size}
        types={MATERIAL_TYPES}
        tags={MATERIAL_TAGS}
        qualities={MATERIAL_QUALITIES}
        onUpdateType={handleBatchUpdateType}
        onUpdateTag={handleBatchUpdateTag}
        onUpdateQuality={handleBatchUpdateQuality}
        onDelete={handleBatchDelete}
      />

      {!showOnlyList && (
      <div
        id="material-form-card"
        className="border border-gray-200 bg-white"
      >
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">{editingMaterialId ? '编辑素材' : '新增素材'}</h3>
        </div>
        <div className="space-y-4 px-4 py-4">
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
              id="material-file-upload"
              disabled={uploading || loading}
            />
            <label
              htmlFor="material-file-upload"
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
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgressPercent}%` }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {editingMaterialId ? (
                      <>
                        点击或拖拽文件到此处添加文件
                        <br />
                        <span className="text-xs">支持图片和视频文件（可多选）</span>
                      </>
                    ) : (
                      <>
                        点击或拖拽文件到此处上传
                        <br />
                        <span className="text-xs">支持图片和视频文件（可多选），每个文件将分别创建素材</span>
                      </>
                    )}
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
          {uploadedFiles.length > 0 && editingMaterialId && (
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
                          className="h-6 w-6 bg-primary/80 hover:bg-primary"
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
                        <div className="absolute top-1 left-1 bg-primary text-primary-foreground px-1.5 py-0.5 rounded text-xs">
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
              <label className="text-sm font-medium">名称 <span className="text-red-500">*</span></label>
              <Input
                placeholder="素材名称"
                value={form.name}
                onChange={handleInputChange('name')}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">类型 <span className="text-red-500">*</span></label>
              <select
                className="h-10 w-full rounded border border-gray-300 bg-white px-3 text-sm text-gray-900"
                value={form.type}
                onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as any }))}
                disabled={loading}
              >
                {MATERIAL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">项目 <span className="text-red-500">*</span></label>
              <select
                className="h-10 w-full rounded border border-gray-300 bg-white px-3 text-sm text-gray-900"
                value={form.project}
                onChange={(e) => setForm((prev) => ({ ...prev, project: e.target.value as any }))}
                disabled={loading}
                required
              >
                <option value="">请选择项目</option>
                {PROJECTS.map((project) => (
                  <option key={project} value={project}>
                    {project}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">标签 <span className="text-red-500">*</span></label>
              <select
                className="h-10 w-full rounded border border-gray-300 bg-white px-3 text-sm text-gray-900"
                value={form.tag}
                onChange={(e) => setForm((prev) => ({ ...prev, tag: e.target.value as any }))}
                disabled={loading}
              >
                {MATERIAL_TAGS.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">质量 <span className="text-red-500">*</span></label>
              <div className="space-y-2">
                {MATERIAL_QUALITIES.map((quality) => (
                  <div key={quality} className="flex items-center space-x-2">
                    <Checkbox
                      id={`quality-${quality}`}
                      checked={form.quality.includes(quality)}
                      onChange={(e) => handleQualityToggle(quality, e.target.checked)}
                      disabled={loading}
                    />
                    <Label htmlFor={`quality-${quality}`} className="cursor-pointer">
                      {quality}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">预览图路径</label>
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
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">画廊（逗号分隔）</label>
              <Input
                placeholder="/demo/xxx1.jpg, /demo/xxx2.jpg"
                value={form.gallery}
                onChange={handleInputChange('gallery')}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">文件大小（字节）</label>
              <Input
                placeholder="1024000"
                value={form.filesize}
                onChange={handleInputChange('filesize')}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">宽度（像素）</label>
              <Input
                placeholder="1920"
                value={form.width}
                onChange={handleInputChange('width')}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">高度（像素）</label>
              <Input
                placeholder="1080"
                value={form.height}
                onChange={handleInputChange('height')}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">时长（秒）</label>
              <Input
                placeholder="30"
                value={form.duration}
                onChange={handleInputChange('duration')}
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {editingMaterialId ? (
              <>
                <Button onClick={handleUpdate} disabled={loading || !hasFormChanged}>
                  {loading ? '更新中...' : hasFormChanged ? '更新素材' : '保存素材'}
                </Button>
                <Button variant="outline" onClick={resetForm} disabled={loading}>
                  取消编辑
                </Button>
              </>
            ) : (
              <>
                <Button onClick={handleCreate} disabled={loading}>
                  {loading ? '提交中...' : '创建素材'}
                </Button>
                <Button variant="ghost" onClick={resetForm} disabled={loading}>
                  重置
                </Button>
              </>
            )}
            {message && <span className="text-sm text-gray-700">{message}</span>}
          </div>
        </div>
      </div>
      )}

      {/* 编辑素材弹窗 */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open);
        if (!open) {
          setEditingMaterialInDialog(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑素材</DialogTitle>
          </DialogHeader>
          {editingMaterialInDialog && (
            <div className="space-y-4 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">名称 <span className="text-red-500">*</span></label>
                  <Input
                    placeholder="素材名称"
                    value={editingMaterialInDialog.name}
                    onChange={(e) => setEditingMaterialInDialog({ ...editingMaterialInDialog, name: e.target.value })}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">类型 <span className="text-red-500">*</span></label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editingMaterialInDialog.type}
                    onChange={(e) => setEditingMaterialInDialog({ ...editingMaterialInDialog, type: e.target.value as any })}
                    disabled={loading}
                  >
                    {MATERIAL_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">项目 <span className="text-red-500">*</span></label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editingMaterialInDialog.project || ''}
                    onChange={(e) => setEditingMaterialInDialog({ ...editingMaterialInDialog, project: e.target.value as any })}
                    disabled={loading}
                    required
                  >
                    <option value="">请选择项目</option>
                    {PROJECTS.map((project) => (
                      <option key={project} value={project}>
                        {project}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">标签 <span className="text-red-500">*</span></label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editingMaterialInDialog.tag}
                    onChange={(e) => setEditingMaterialInDialog({ ...editingMaterialInDialog, tag: e.target.value as any })}
                    disabled={loading}
                  >
                    {MATERIAL_TAGS.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">质量（可多选）<span className="text-red-500">*</span></label>
                  <div className="flex flex-wrap gap-2">
                    {MATERIAL_QUALITIES.map((quality) => {
                      const isSelected = editingMaterialInDialog.quality?.includes(quality as any) || false;
                      return (
                        <Button
                          key={quality}
                          type="button"
                          variant={isSelected ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            const currentQuality = editingMaterialInDialog.quality || [];
                            const newQuality = isSelected
                              ? currentQuality.filter((q) => q !== quality)
                              : [...currentQuality, quality as any];
                            setEditingMaterialInDialog({ ...editingMaterialInDialog, quality: newQuality });
                          }}
                          disabled={loading}
                        >
                          {quality}
                        </Button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">预览图</label>
                  <Input
                    placeholder="/demo/xxx.jpg 或完整 CDN 地址"
                    value={editingMaterialInDialog.thumbnail || ''}
                    onChange={(e) => setEditingMaterialInDialog({ ...editingMaterialInDialog, thumbnail: e.target.value })}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">资源路径</label>
                  <Input
                    placeholder="/demo/xxx.jpg 或完整 CDN 地址"
                    value={editingMaterialInDialog.src || ''}
                    onChange={(e) => setEditingMaterialInDialog({ ...editingMaterialInDialog, src: e.target.value })}
                    disabled={loading}
                  />
                </div>
                {editingMaterialInDialog.type === 'UE视频' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">时长（秒）</label>
                    <Input
                      type="number"
                      placeholder="120"
                      value={editingMaterialInDialog.duration?.toString() || ''}
                      onChange={(e) => setEditingMaterialInDialog({ ...editingMaterialInDialog, duration: e.target.value ? parseInt(e.target.value) : undefined })}
                      disabled={loading}
                    />
                  </div>
                )}
                {editingMaterialInDialog.type === '图片' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">宽度</label>
                      <Input
                        type="number"
                        placeholder="1920"
                        value={editingMaterialInDialog.width?.toString() || ''}
                        onChange={(e) => setEditingMaterialInDialog({ ...editingMaterialInDialog, width: e.target.value ? parseInt(e.target.value) : undefined })}
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">高度</label>
                      <Input
                        type="number"
                        placeholder="1080"
                        value={editingMaterialInDialog.height?.toString() || ''}
                        onChange={(e) => setEditingMaterialInDialog({ ...editingMaterialInDialog, height: e.target.value ? parseInt(e.target.value) : undefined })}
                        disabled={loading}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setEditingMaterialInDialog(null);
              }}
              disabled={loading}
            >
              取消
            </Button>
            <Button
              onClick={async () => {
                if (!editingMaterialInDialog) return;
                setLoading(true);
                try {
                  // 验证必填字段
                  if (!editingMaterialInDialog.name?.trim()) {
                    throw new Error('名称不能为空');
                  }
                  if (!editingMaterialInDialog.type) {
                    throw new Error('类型不能为空');
                  }
                  if (!editingMaterialInDialog.tag) {
                    throw new Error('标签不能为空');
                  }
                  if (!editingMaterialInDialog.quality || editingMaterialInDialog.quality.length === 0) {
                    throw new Error('至少需要一个质量标签');
                  }

                  const payload: any = {
                    id: editingMaterialInDialog.id,
                    name: editingMaterialInDialog.name.trim(),
                    type: editingMaterialInDialog.type,
                    project: editingMaterialInDialog.project || undefined,
                    tag: editingMaterialInDialog.tag,
                    quality: editingMaterialInDialog.quality,
                    thumbnail: editingMaterialInDialog.thumbnail?.trim() || undefined,
                    src: editingMaterialInDialog.src?.trim() || undefined,
                    gallery: editingMaterialInDialog.gallery,
                  };

                  if (editingMaterialInDialog.type === 'UE视频' && editingMaterialInDialog.duration != null) {
                    payload.duration = editingMaterialInDialog.duration;
                  }
                  if (editingMaterialInDialog.type === '图片') {
                    if (editingMaterialInDialog.width != null) {
                      payload.width = editingMaterialInDialog.width;
                    }
                    if (editingMaterialInDialog.height != null) {
                      payload.height = editingMaterialInDialog.height;
                    }
                  }

                  const response = await fetch(`/api/materials/${editingMaterialInDialog.id}`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                  });

                  if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || '更新素材失败');
                  }

                  await refreshMaterials();
                  setEditDialogOpen(false);
                  setEditingMaterialInDialog(null);
                  setMessage('素材已更新');
                } catch (error) {
                  console.error(error);
                  setMessage(error instanceof Error ? error.message : '更新素材失败');
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
            >
              {loading ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
        setDeleteDialogOpen(open);
        if (!open) {
          setMaterialToDelete(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-700">
              确定要删除素材 <span className="font-semibold">"{materialToDelete?.name}"</span> 吗？
            </p>
            <p className="text-xs text-gray-500 mt-2">此操作不可恢复。</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setMaterialToDelete(null);
              }}
              disabled={loading}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!materialToDelete) return;
                setLoading(true);
                try {
                  const response = await fetch(`/api/materials/${materialToDelete.id}`, {
                    method: 'DELETE',
                  });

                  if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || '删除素材失败');
                  }

                  await refreshMaterials();
                  setDeleteDialogOpen(false);
                  setMaterialToDelete(null);
                  setMessage('素材已删除');
                  
                  // 如果删除的是正在编辑的素材，重置表单
                  if (editingMaterialId === materialToDelete.id) {
                    resetForm();
                  }
                  
                  // 如果删除的是弹窗中正在编辑的素材，关闭弹窗
                  if (editingMaterialInDialog?.id === materialToDelete.id) {
                    setEditDialogOpen(false);
                    setEditingMaterialInDialog(null);
                  }
                } catch (error) {
                  console.error(error);
                  setMessage(error instanceof Error ? error.message : '删除素材失败');
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
            >
              {loading ? '删除中...' : '删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 放大预览组件 */}
      {hoveredPreview && hoveredPreview.elementRef && typeof window !== 'undefined' && createPortal(
        (() => {
          const rect = hoveredPreview.elementRef.getBoundingClientRect();
          const isVideoUrl = (url: string) => {
            if (!url) return false;
            const lower = url.toLowerCase();
            return lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.mov') || lower.includes('.avi') || lower.includes('.mkv');
          };
          
          // 计算位置，确保不超出视窗
          const previewWidth = 400;
          const previewHeight = 400;
          const spacing = 10;
          let left = rect.right + spacing;
          let top = rect.top;
          
          // 如果右侧空间不足，显示在左侧
          if (left + previewWidth > window.innerWidth) {
            left = rect.left - previewWidth - spacing;
          }
          
          // 如果左侧空间也不足，居中显示
          if (left < 0) {
            left = (window.innerWidth - previewWidth) / 2;
          }
          
          // 确保不超出视窗顶部和底部
          if (top + previewHeight > window.innerHeight) {
            top = window.innerHeight - previewHeight - 10;
          }
          if (top < 10) {
            top = 10;
          }
          
          return (
            <div
              className="fixed z-50 pointer-events-auto"
              style={{
                left: `${left}px`,
                top: `${top}px`,
                maxWidth: `${previewWidth}px`,
                maxHeight: `${previewHeight}px`,
              }}
              onMouseEnter={() => {}} // 保持显示
              onMouseLeave={() => setHoveredPreview(null)}
            >
              <div className="bg-white border-2 border-gray-300 rounded-lg shadow-2xl p-2">
                {hoveredPreview.mediaFiles.length > 0 && (() => {
                  const firstMedia = hoveredPreview.mediaFiles[0];
                  const previewUrl = getPreviewUrl(firstMedia.url);
                  const isVideo = firstMedia.type === 'video' || isVideoUrl(firstMedia.url);
                  
                  return (
                    <div className="relative">
                      {isVideo ? (
                        <video
                          src={previewUrl}
                          className="max-w-full max-h-[400px] object-contain rounded"
                          controls
                          autoPlay
                          muted
                          playsInline
                        />
                      ) : (
                        <img
                          src={previewUrl}
                          alt={firstMedia.label}
                          className="max-w-full max-h-[400px] object-contain rounded"
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23ccc" width="400" height="400"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="16"%3E无预览%3C/text%3E%3C/svg%3E';
                          }}
                        />
                      )}
                      {hoveredPreview.mediaFiles.length > 1 && (
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                          +{hoveredPreview.mediaFiles.length - 1}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })(),
        document.body
      )}

      {/* 标签和类型管理弹窗 */}
      <MaterialsTagsManagementDialog
        open={tagsManagementOpen}
        onOpenChange={setTagsManagementOpen}
        materials={materials}
        onSave={handleTagsSave}
        onTypesSave={handleTypesSave}
      />
    </div>
  );
}
