'use client';

import { useCallback, useMemo, useState, useRef, useEffect, type ChangeEvent } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import type { Asset } from '@/data/manifest.schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Upload, X, ChevronLeft, ChevronRight, Trash2, Star, Search, FileArchive, Tags, CheckSquare, ImageIcon, MoreVertical, Edit, Copy, Check } from 'lucide-react';
import { BatchUploadDialog } from './batch-upload-dialog';
import { TagsManagementDialog } from './tags-management-dialog';
import { BatchEditDialog } from './batch-edit-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { uploadFileDirect } from '@/lib/client/direct-upload';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { getOptimizedImageUrl, getClientAssetUrl } from '@/lib/utils';
import { PROJECTS } from '@/lib/constants';

type StorageMode = 'local' | 'oss';

interface AdminDashboardProps {
  initialAssets: Asset[];
  storageMode: StorageMode;
  cdnBase: string;
  showOnlyList?: boolean;
  refreshKey?: number;
}

// 资产类型选项（默认值，实际使用时会从API动态获取）
const DEFAULT_ASSET_TYPES = ['角色', '场景', '动画', '特效', '材质', '蓝图', 'UI', '合成', '音频', '其他'] as const;

// 风格建议值
const STYLE_SUGGESTIONS = ['写实', '二次元', '卡通', '国风', '欧式', '科幻', '写意', '低多边形', '像素', '日系', '欧美', '写实PBR'];

// 来源建议值
const SOURCE_SUGGESTIONS = ['内部', '外部', '网络'];

// 版本建议值
const VERSION_SUGGESTIONS = ['UE5.6', 'UE5.5', 'UE5.4', 'UE5.3', 'UE4.3'];

const PREVIEW_SIZE = 56;
const ROW_HEIGHT = 56; // 更紧凑的行高
const SELECTION_COL_WIDTH = 48;

// 计算最小宽度：表头文字宽度（每个中文字符约12px）+ padding（16px）
const ASSET_COLUMNS = [
  { id: 'preview', label: '预览图', defaultWidth: 128, minWidth: 52 }, // 3字 * 12 + 16 = 52
  { id: 'name', label: '名称', defaultWidth: 240, minWidth: 40 }, // 2字 * 12 + 16 = 40
  { id: 'type', label: '类型', defaultWidth: 120, minWidth: 40 }, // 2字 * 12 + 16 = 40
  { id: 'tags', label: '标签', defaultWidth: 220, minWidth: 40 }, // 2字 * 12 + 16 = 40
  { id: 'paths', label: '资源路径', defaultWidth: 420, minWidth: 64 }, // 4字 * 12 + 16 = 64
  { id: 'updatedAt', label: '更新时间', defaultWidth: 160, minWidth: 64 }, // 4字 * 12 + 16 = 64
  { id: 'actions', label: '操作', defaultWidth: 160, minWidth: 40 }, // 2字 * 12 + 16 = 40
] as const;

interface FormState {
  name: string;
  type: string; // 资产类型：角色、场景等
  project: string; // 项目
  style: string; // 风格：逗号分隔的字符串
  tags: string; // 标签：逗号分隔的字符串
  source: string; // 来源
  engineVersion: string; // 版本
  guangzhouNas: string; // 广州NAS路径
  shenzhenNas: string; // 深圳NAS路径
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

export function AdminDashboard({ initialAssets, storageMode, cdnBase, showOnlyList, refreshKey }: AdminDashboardProps) {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [originalAsset, setOriginalAsset] = useState<Asset | null>(null);
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
  const [filterType, setFilterType] = useState<string>('');
  const [filterTag, setFilterTag] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [batchUploadOpen, setBatchUploadOpen] = useState(false);
  const ITEMS_PER_PAGE = 12;
  const [tagsManagementOpen, setTagsManagementOpen] = useState(false);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [batchEditOpen, setBatchEditOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAssetInDialog, setEditingAssetInDialog] = useState<Asset | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const rowRefsRef = useRef<Map<string, HTMLTableRowElement>>(new Map());
  
  // 框选功能状态
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectStart, setSelectStart] = useState<{ x: number; y: number } | null>(null);
  const [selectEnd, setSelectEnd] = useState<{ x: number; y: number } | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [allowedTypes, setAllowedTypes] = useState<string[]>([...DEFAULT_ASSET_TYPES]); // 允许的资产类型列表（动态获取）
  const [showPaths, setShowPaths] = useState(false);
  const [columnWidths, setColumnWidths] = useState<Record<(typeof ASSET_COLUMNS)[number]['id'], number>>(() =>
    ASSET_COLUMNS.reduce((acc, column) => {
      acc[column.id] = column.defaultWidth;
      return acc;
    }, {} as Record<(typeof ASSET_COLUMNS)[number]['id'], number>)
  );
  const visibleAssetColumns = useMemo(
    () => ASSET_COLUMNS.filter((column) => showPaths || column.id !== 'paths'),
    [showPaths]
  );
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const nameCollator = useMemo(
    () => new Intl.Collator('zh-Hans-u-co-pinyin', { sensitivity: 'base', numeric: true }),
    []
  );

  // OSS 模式已支持读写，不再设为只读
  const isReadOnly = false;

  // 从API获取允许的类型列表
  const fetchAllowedTypes = useCallback(async () => {
    // 只在客户端执行
    if (typeof window === 'undefined') {
      setAllowedTypes([...DEFAULT_ASSET_TYPES]);
      return;
    }
    
    try {
      const res = await fetch('/api/assets/types', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.allowedTypes) && data.allowedTypes.length > 0) {
          setAllowedTypes(data.allowedTypes);
          return;
        }
      }
      // 如果响应不OK或数据无效，使用默认值
      setAllowedTypes([...DEFAULT_ASSET_TYPES]);
    } catch (err) {
      // 网络错误或其他错误，使用默认值
      console.warn('获取类型列表失败，使用默认类型:', err);
      setAllowedTypes([...DEFAULT_ASSET_TYPES]);
    }
  }, []);

  useEffect(() => {
    // 只在客户端执行
    if (typeof window !== 'undefined') {
      fetchAllowedTypes();
    } else {
      // 服务器端渲染时使用默认值
      setAllowedTypes([...DEFAULT_ASSET_TYPES]);
    }
  }, [fetchAllowedTypes]);

  const resetForm = useCallback(() => {
    setForm(initialFormState);
    setEditingAssetId(null);
    setOriginalAsset(null);
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
    
    // 自动填充表单（注意：不自动设置 type，type 必须由用户选择业务类型）
    // ✅ 统一逻辑：与批量上传一致，确保thumbnail和src至少有一个有值
    setForm((prev) => {
      // 图片使用图片URL，视频也使用视频URL（与批量上传一致）
      const finalThumbnail = firstFile.type === 'image' ? firstFile.url : (firstFile.url || prev.thumbnail);
      const finalSrc = firstFile.url || finalThumbnail;
      
      return {
        ...prev,
        name: prev.name || firstFile.originalName.replace(/\.[^/.]+$/, ''),
        // type 不自动设置，必须由用户选择业务类型（角色、场景等）
        src: finalSrc,
        thumbnail: finalThumbnail, // 图片使用图片URL，视频也使用视频URL（与批量上传一致）
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

  // 设置为预览图（thumbnail）
  const handleSetAsThumbnail = useCallback((fileUrl: string) => {
    setForm((prev) => ({
      ...prev,
      thumbnail: fileUrl,
    }));
    setMessage('已设置为预览图');
  }, []);

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

  // 当 refreshKey 变化时，刷新资产列表
  useEffect(() => {
    if (refreshKey !== undefined && refreshKey > 0) {
      refreshAssets();
    }
  }, [refreshKey, refreshAssets]);

  // 处理批量添加标签
  const handleBatchAddTags = useCallback(async (newTags: string[]) => {
    if (selectedAssetIds.size === 0) {
      throw new Error('请先选择至少一个资产');
    }

    const count = selectedAssetIds.size;

    const response = await fetch('/api/assets/batch-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assetIds: Array.from(selectedAssetIds),
        action: 'add-tags',
        payload: { tags: newTags },
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || '批量添加标签失败');
    }

    await refreshAssets();
    setSelectedAssetIds(new Set());
    setMessage(result.message || `已为 ${count} 个资产添加标签`);
  }, [selectedAssetIds, refreshAssets]);

  const handleColumnResizeStart = useCallback(
    (event: ReactMouseEvent<HTMLSpanElement>, columnId: (typeof ASSET_COLUMNS)[number]['id']) => {
      event.preventDefault();
      event.stopPropagation();
      const column = ASSET_COLUMNS.find((col) => col.id === columnId);
      if (!column) return;

      const startX = event.clientX;
      const startWidth = columnWidths[columnId];

      const handleMouseMove = (moveEvent: MouseEvent) => {
        moveEvent.preventDefault();
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
        document.body.style.cursor = '';
      };

      document.body.classList.add('select-none');
      document.body.style.cursor = 'col-resize';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [columnWidths]
  );

  // 处理标签管理保存
  const handleTagsSave = useCallback(async (tagMappings: { oldTag: string; newTag: string | null }[]) => {
    const response = await fetch('/api/assets/tags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mappings: tagMappings }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '更新标签失败');
    }

    // 刷新资产列表
    await refreshAssets();
    setMessage('标签已更新。前端页面需要刷新才能看到新标签。');
  }, [refreshAssets]);

  // 处理类型管理保存
  const handleTypesSave = useCallback(async () => {
    await fetchAllowedTypes();
        await refreshAssets();
        setMessage('类型已更新');
  }, [fetchAllowedTypes, refreshAssets]);

  const handleCreate = async () => {
    setMessage(null);
    setLoading(true);
    try {
      // 验证必填字段
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

      // 处理风格：支持多个值（逗号分隔）
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
      
      // 如果创建成功，检查类型是否是新类型，如果是则刷新类型列表
      try {
        const typeResponse = await fetch('/api/assets/types');
        if (typeResponse.ok) {
          const typeData = await typeResponse.json();
          if (typeData.allowedTypes && Array.isArray(typeData.allowedTypes)) {
            setAllowedTypes(typeData.allowedTypes);
          }
        }
      } catch (err) {
        console.error('刷新类型列表失败:', err);
      }
      
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
    // 获取资产信息用于确认对话框
    const asset = assets.find((a) => a.id === id);
    const assetName = asset?.name || '该资产';
    
    // 二次确认
    if (!confirm(`确定要删除资产 "${assetName}" 吗？此操作不可恢复。`)) {
      return;
    }
    
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
      // 如果删除的是正在编辑的资产，重置表单
      if (editingAssetId === id) {
        resetForm();
      }
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : '删除资产失败');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = useCallback((asset: Asset) => {
    // 如果正在进行批量操作，先清空选择
    if (selectedAssetIds.size > 0) {
      setSelectedAssetIds(new Set());
    }
    setEditingAssetId(asset.id);
    // 保存原始资产数据用于比较
    setOriginalAsset(JSON.parse(JSON.stringify(asset)));
    
    // 处理风格：如果是数组则用逗号连接，否则直接使用
    const styleValue = asset.style
      ? Array.isArray(asset.style)
        ? asset.style.join(', ')
        : asset.style
      : '';

    setForm({
      name: asset.name,
      type: asset.type,
      project: asset.project || '',
      style: styleValue,
      tags: asset.tags.join(', '),
      source: asset.source || '',
      engineVersion: asset.engineVersion || '',
      guangzhouNas: asset.guangzhouNas || '',
      shenzhenNas: asset.shenzhenNas || '',
      thumbnail: asset.thumbnail || '',
      src: asset.src || '',
      gallery: asset.gallery?.join(', ') || '',
      width: asset.width ? String(asset.width) : '',
      height: asset.height ? String(asset.height) : '',
      duration: asset.duration ? String(asset.duration) : '',
      filesize: asset.filesize ? String(asset.filesize) : '',
    });
    
    // ✅ 收集资产的所有媒体文件，用于"已上传文件"列表
    const allMediaFiles: Array<{
      url: string;
      originalName: string;
      type: 'image' | 'video';
      size: number;
    }> = [];
    
    // 判断是否为视频URL
    const isVideoUrl = (url: string) => {
      if (!url) return false;
      const lower = url.toLowerCase();
      return lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.mov') || lower.includes('.avi') || lower.includes('.mkv');
    };
    
    // 添加thumbnail
    if (asset.thumbnail) {
      allMediaFiles.push({
        url: asset.thumbnail,
        originalName: asset.thumbnail.split('/').pop() || 'thumbnail',
        type: isVideoUrl(asset.thumbnail) ? 'video' : 'image',
        size: 0, // 编辑时无法获取文件大小
      });
    }
    
    // 添加src（如果与thumbnail不同）
    if (asset.src && asset.src !== asset.thumbnail) {
      allMediaFiles.push({
        url: asset.src,
        originalName: asset.src.split('/').pop() || 'src',
        type: isVideoUrl(asset.src) ? 'video' : 'image',
        size: 0,
      });
    }
    
    // 添加gallery中的文件
    if (asset.gallery && asset.gallery.length > 0) {
      asset.gallery.forEach((url) => {
        if (url && url !== asset.thumbnail && url !== asset.src) {
          allMediaFiles.push({
            url: url,
            originalName: url.split('/').pop() || `gallery-${allMediaFiles.length}`,
            type: isVideoUrl(url) ? 'video' : 'image',
            size: 0,
          });
        }
      });
    }
    
    // 设置已上传文件列表（用于编辑时显示）
    setUploadedFiles(allMediaFiles);
    
    // 如果有 gallery，设置预览 URL
    if (asset.gallery && asset.gallery.length > 0) {
      const previewUrls = asset.gallery.map((url) => {
        if (!url.startsWith('http')) {
          if (storageMode === 'oss' && normalizedCdnBase && normalizedCdnBase !== '/') {
            return `${normalizedCdnBase.replace(/\/+$/, '')}${url}`;
          }
        }
        return url;
      });
      setPreviewUrls(previewUrls);
      setCurrentPreviewIndex(0);
    } else if (asset.thumbnail || asset.src) {
      const url = asset.thumbnail || asset.src;
      const previewUrl = url.startsWith('http')
        ? url
        : storageMode === 'oss' && normalizedCdnBase && normalizedCdnBase !== '/'
        ? `${normalizedCdnBase.replace(/\/+$/, '')}${url}`
        : url;
      setPreviewUrls([previewUrl]);
      setCurrentPreviewIndex(0);
    }
    
    // 滚动到表单区域
    setTimeout(() => {
      const formCard = document.getElementById('asset-form-card');
      if (formCard) {
        formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }, [storageMode, normalizedCdnBase]);

  // 检查表单是否有更改
  const hasFormChanged = useMemo(() => {
    if (!editingAssetId || !originalAsset) return false;

    // 处理风格比较
    const formStyleValues = form.style
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const formStyle = formStyleValues.length === 1 
      ? formStyleValues[0] 
      : formStyleValues.length > 1 
      ? formStyleValues 
      : undefined;
    
    const originalStyle = originalAsset.style
      ? Array.isArray(originalAsset.style)
        ? originalAsset.style
        : [originalAsset.style]
      : [];
    
    const formStyleArray = Array.isArray(formStyle) ? formStyle : formStyle ? [formStyle] : [];
    const styleChanged = JSON.stringify([...formStyleArray].sort()) !== JSON.stringify([...originalStyle].sort());

    // 处理标签比较
    const formTags = form.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
      .sort();
    const originalTags = [...originalAsset.tags].sort();
    const tagsChanged = JSON.stringify(formTags) !== JSON.stringify(originalTags);

    // 比较其他字段
    return (
      form.name.trim() !== originalAsset.name ||
      form.type !== originalAsset.type ||
      styleChanged ||
      tagsChanged ||
      form.source.trim() !== (originalAsset.source || '') ||
      form.engineVersion.trim() !== (originalAsset.engineVersion || '') ||
      form.guangzhouNas.trim() !== (originalAsset.guangzhouNas || '') ||
      form.shenzhenNas.trim() !== (originalAsset.shenzhenNas || '') ||
      form.thumbnail.trim() !== (originalAsset.thumbnail || '') ||
      form.src.trim() !== (originalAsset.src || '') ||
      form.gallery.trim() !== (originalAsset.gallery?.join(', ') || '') ||
      form.width !== (originalAsset.width ? String(originalAsset.width) : '') ||
      form.height !== (originalAsset.height ? String(originalAsset.height) : '') ||
      form.duration !== (originalAsset.duration ? String(originalAsset.duration) : '') ||
      form.filesize !== (originalAsset.filesize ? String(originalAsset.filesize) : '')
    );
  }, [form, editingAssetId, originalAsset]);

  const handleUpdate = async () => {
    if (!editingAssetId) return;
    
    setMessage(null);
    setLoading(true);
    try {
      // 验证必填字段
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
      if (!form.guangzhouNas.trim() && !form.shenzhenNas.trim()) {
        throw new Error('广州NAS和深圳NAS至少需要填写一个');
      }

      // 处理风格：支持多个值（逗号分隔）
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

      // 确保类型已trim
      const assetType = form.type.trim();

      const payload = {
        id: editingAssetId,
        name: form.name.trim(),
        type: assetType,
        project: form.project || undefined,
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
      };

      const response = await fetch(`/api/assets/${editingAssetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '更新资产失败');
      }

      await refreshAssets();
      
      // 如果更新成功，检查类型是否是新类型，如果是则刷新类型列表
      try {
        const typeResponse = await fetch('/api/assets/types');
        if (typeResponse.ok) {
          const typeData = await typeResponse.json();
          if (typeData.allowedTypes && Array.isArray(typeData.allowedTypes)) {
            setAllowedTypes(typeData.allowedTypes);
          }
        }
      } catch (err) {
        console.error('刷新类型列表失败:', err);
      }
      
      // 更新后重新设置原始资产，以便继续检测更改
      const updatedResponse = await fetch(`/api/assets/${editingAssetId}`);
      if (updatedResponse.ok) {
        const updatedAsset = await updatedResponse.json();
        setOriginalAsset(updatedAsset);
      }
      setMessage('资产已更新');
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : '更新资产失败');
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
      setUploadProgressPercent(0);

      let data: {
        url: string;
        originalName: string;
        type: 'image' | 'video';
        size: number;
        width?: number;
        height?: number;
        hash?: string;
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
          width: undefined,
          height: undefined,
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
          width: responseData.width,
          height: responseData.height,
          hash: responseData.hash,
        };
      }

      setUploadProgress(null);
      setUploadProgressPercent(0);

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

      const successMessage = `文件上传成功: ${data.originalName}`;
      setMessage(successMessage);
      if (typeof window !== 'undefined') {
        window.alert(successMessage);
      }

      // 如果是图片，自动创建资产
      if (data.type === 'image') {
        // 可以在这里自动创建，或者让用户手动点击创建按钮
        // 暂时只填充表单，让用户确认后再创建
      }
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : '上传失败';
      // 确保错误信息是中文
      const chineseError = errorMessage.includes('网络错误') 
        ? '网络错误，请检查网络连接'
        : errorMessage.includes('已取消')
        ? '上传已取消'
        : errorMessage.includes('格式错误')
        ? '服务器响应格式错误'
        : errorMessage.includes('HTTP')
        ? `上传失败: ${errorMessage}`
        : errorMessage || '上传失败，请重试';
      setMessage(chineseError);
      setUploadProgress(null);
      setUploadProgressPercent(0);
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
          const fileIndex = files.indexOf(file) + 1;
          setUploadProgress(`正在上传 ${fileIndex}/${files.length}: ${file.name}...`);
          setUploadProgressPercent(0);
          
          let data: {
            url: string;
            originalName: string;
            type: 'image' | 'video';
            size: number;
            width?: number;
            height?: number;
            hash?: string;
          };

          if (storageMode === 'oss') {
            const directResult = await uploadFileDirect(file, {
              onProgress: (percent) => {
                setUploadProgressPercent(percent);
                setUploadProgress(`正在上传 ${fileIndex}/${files.length}: ${file.name}... ${percent}%`);
              },
            });

            data = {
              url: directResult.fileUrl,
              originalName: file.name,
              type: file.type.startsWith('image/') ? 'image' : 'video',
              size: file.size,
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
                setUploadProgress(`正在上传 ${fileIndex}/${files.length}: ${file.name}... ${percent}%`);
              }
            });

            xhr.addEventListener('load', () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const responseData = JSON.parse(xhr.responseText);
                    resolve(responseData);
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
            data = {
              url: responseData.url,
              originalName: responseData.originalName,
              type: responseData.type,
              size: responseData.size,
              width: responseData.width,
              height: responseData.height,
              hash: responseData.hash,
            };
          }

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
      setUploadProgressPercent(0);
      if (duplicateFiles.length > 0) {
        const successMessage = `成功处理 ${files.length} 个文件，其中 ${duplicateFiles.length} 个已存在（已跳过重复上传）`;
        setMessage(successMessage);
        if (typeof window !== 'undefined') {
          window.alert(successMessage);
        }
      } else {
        const successMessage = `成功上传 ${files.length} 个文件`;
        setMessage(successMessage);
        if (typeof window !== 'undefined') {
          window.alert(successMessage);
        }
      }
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : '批量上传失败';
      // 确保错误信息是中文
      const chineseError = errorMessage.includes('网络错误')
        ? '网络错误，请检查网络连接'
        : errorMessage.includes('已取消')
        ? '上传已取消'
        : errorMessage.includes('解析')
        ? errorMessage
        : errorMessage.includes('HTTP')
        ? errorMessage
        : errorMessage || '批量上传失败，请重试';
      setMessage(chineseError);
      setUploadProgress(null);
      setUploadProgressPercent(0);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [uploadedFiles, checkFileExists, calculateFileHash, updateFormFromUploadedFiles, storageMode]);

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

  // 获取所有标签用于筛选
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    assets.forEach((asset) => {
      asset.tags.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [assets]);

  // 筛选资产
  const filteredAssets = useMemo(() => {
    let filtered = assets;

    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter(
        (asset) =>
          asset.name.toLowerCase().includes(keyword) ||
          asset.tags.some((tag) => tag.toLowerCase().includes(keyword))
      );
    }

    if (filterType) {
      filtered = filtered.filter((asset) => asset.type === filterType);
    }

    if (filterTag) {
      filtered = filtered.filter((asset) => asset.tags.includes(filterTag));
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
  }, [assets, searchKeyword, filterType, filterTag, sortKey, sortDirection, nameCollator]);

  // 分页显示（每页显示12条）
  const totalPages = useMemo(() => {
    return Math.ceil(filteredAssets.length / ITEMS_PER_PAGE);
  }, [filteredAssets.length]);

  const displayedAssets = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredAssets.slice(startIndex, endIndex);
  }, [filteredAssets, currentPage]);

  // 当筛选条件变化时，重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [searchKeyword, filterType, filterTag]);

  // 预览图悬停状态
  const [hoveredPreview, setHoveredPreview] = useState<{
    assetId: string;
    elementRef: HTMLDivElement | null;
    mediaFiles: Array<{ url: string; label: string; type: 'image' | 'video' }>;
  } | null>(null);
  const previewRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // 复制状态：记录哪个路径被复制了
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  // 复制到剪贴板
  const copyToClipboard = useCallback(async (text: string, pathKey: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPath(pathKey);
      setTimeout(() => {
        setCopiedPath(null);
      }, 2000);
    } catch (err) {
      console.error('复制失败:', err);
      setMessage('复制失败');
      setTimeout(() => setMessage(null), 2000);
    }
  }, []);

  // 获取预览图URL（客户端）- 与前端保持一致的处理逻辑
  const getPreviewUrl = useCallback((url: string) => {
    if (!url) return '';
    
    // 如果已经是完整 URL，直接返回
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    const base = normalizedCdnBase;
    const normalizedPath = url.startsWith('/') ? url : `/${url}`;
    
    // 如果 base 是 /，直接返回路径（本地模式）
    if (base === '/' || !base || base.trim() === '') {
      // 如果路径是 OSS 路径，尝试构建完整 URL
      if (normalizedPath.startsWith('/assets/')) {
        if (typeof window !== 'undefined') {
          const ossConfig = window.__OSS_CONFIG__;
          if (ossConfig && ossConfig.bucket && ossConfig.region) {
            const ossPath = normalizedPath.substring(1);
            const region = ossConfig.region.replace(/^oss-/, '');
            return `https://${ossConfig.bucket}.oss-${region}.aliyuncs.com/${ossPath}`;
          }
        }
      }
      return normalizedPath;
    }
    
    // 如果路径以 /assets/ 开头（OSS 模式），需要特殊处理
    if (normalizedPath.startsWith('/assets/')) {
      // 移除开头的 /，因为 CDN base 通常已经包含路径分隔符
      const ossPath = normalizedPath.substring(1);
      return `${base.replace(/\/+$/, '')}/${ossPath}`;
    }
    
    // 其他情况：拼接 CDN base
    return `${base.replace(/\/+$/, '')}${normalizedPath}`;
  }, [normalizedCdnBase]);

  const renderAssetCell = (
    columnId: (typeof ASSET_COLUMNS)[number]['id'],
    asset: Asset
  ) => {
    switch (columnId) {
      case 'preview': {
        const allMediaFiles: Array<{ url: string; label: string; type: 'image' | 'video' }> = [];
                  const isVideoUrl = (url: string) => {
                    if (!url) return false;
                    const lower = url.toLowerCase();
                    return lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.mov') || lower.includes('.avi') || lower.includes('.mkv');
                  };

                          if (asset.thumbnail) {
                            allMediaFiles.push({
                              url: asset.thumbnail,
                              label: '封面图',
                              type: isVideoUrl(asset.thumbnail) ? 'video' : 'image',
                            });
                          }
                          
                          if (asset.src && asset.src !== asset.thumbnail) {
                            allMediaFiles.push({
                              url: asset.src,
                              label: '资源文件',
                              type: isVideoUrl(asset.src) ? 'video' : 'image',
                            });
                          }
                          
                          if (asset.gallery && asset.gallery.length > 0) {
                            asset.gallery.forEach((url, index) => {
                              if (url && url !== asset.thumbnail && url !== asset.src) {
                                allMediaFiles.push({
                url,
                                  label: `画廊 ${index + 1}`,
                                  type: isVideoUrl(url) ? 'video' : 'image',
                                });
                              }
                            });
                          }
                          
                          if (allMediaFiles.length === 0 && asset.src) {
                            allMediaFiles.push({
                              url: asset.src,
                              label: '资源文件',
                              type: isVideoUrl(asset.src) ? 'video' : 'image',
                            });
                          }
                          
                          const currentThumbnail = asset.thumbnail || '';
                          const currentPreviewUrl = getPreviewUrl(currentThumbnail);
                          
                          const handleSelectThumbnail = async (selectedUrl: string | null) => {
                            try {
                              setLoading(true);
                              const response = await fetch(`/api/assets/${asset.id}`, {
                                method: 'PUT',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                  id: asset.id,
                thumbnail: selectedUrl || undefined,
                                }),
                              });
                              
                              if (!response.ok) {
                                const error = await response.json();
                                throw new Error(error.message || '更新预览图失败');
                              }
                              
                              await refreshAssets();
                              setMessage('预览图已更新');
                            } catch (error) {
                              console.error(error);
                              setMessage(error instanceof Error ? error.message : '更新预览图失败');
                            } finally {
                              setLoading(false);
                            }
                          };
                          
                          return (
          <div className="flex h-[56px] items-center">
                            <div 
                              className="relative group"
                              ref={(el) => {
                                if (el) {
                                  previewRefs.current.set(asset.id, el);
                                } else {
                                  previewRefs.current.delete(asset.id);
                                }
                              }}
                              onMouseEnter={() => {
                                if (allMediaFiles.length > 0) {
                                  setHoveredPreview({
                                    assetId: asset.id,
                                    elementRef: previewRefs.current.get(asset.id) || null,
                                    mediaFiles: allMediaFiles,
                                  });
                                }
                              }}
                              onMouseLeave={() => {
                                setHoveredPreview(null);
                              }}
                            >
                              {currentPreviewUrl ? (
                <div className="relative h-[48px] w-[48px] overflow-hidden border border-gray-300 bg-gray-100 cursor-pointer">
                                  {isVideoUrl(currentThumbnail) ? (
                    <video src={currentPreviewUrl} className="h-full w-full object-cover" muted playsInline />
                                  ) : (
                                    <img
                                      src={currentPreviewUrl}
                                      alt={asset.name}
                      className="h-full w-full object-cover"
                                      onError={(e) => {
                                        const img = e.target as HTMLImageElement;
                                        console.warn(`[预览图加载失败] 资产 "${asset.name}" (ID: ${asset.id}):`, {
                                          previewUrl: currentPreviewUrl,
                                          thumbnail: asset.thumbnail,
                                          src: asset.src,
                                          '尝试的URL': img.src,
                                        });
                        img.src =
                          'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="56" height="56"%3E%3Crect fill="%23ccc" width="56" height="56"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="10"%3E无预览%3C/text%3E%3C/svg%3E';
                                      }}
                                    />
                                  )}
                                  {allMediaFiles.length > 0 && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                          className="absolute right-1 top-1 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                                        >
                                          <MoreVertical className="h-3 w-3" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-48">
                        <div className="px-2 py-1.5 text-xs font-medium text-gray-700">选择预览图</div>
                                        <DropdownMenuSeparator />
                                        {allMediaFiles.map((file, index) => {
                                          const filePreviewUrl = getPreviewUrl(file.url);
                          const active = currentThumbnail === file.url;
                                          return (
                                            <DropdownMenuItem
                                              key={index}
                                              onClick={() => handleSelectThumbnail(file.url)}
                              className="flex items-center gap-2"
                                            >
                              <div className="h-8 w-8 overflow-hidden rounded bg-gray-100">
                                                {file.type === 'video' ? (
                                  <video src={filePreviewUrl} className="h-full w-full object-cover" muted playsInline />
                                                ) : (
                                                  <img
                                                    src={filePreviewUrl}
                                                    alt={file.label}
                                    className="h-full w-full object-cover"
                                                    onError={(e) => {
                                                      (e.target as HTMLImageElement).style.display = 'none';
                                                    }}
                                                  />
                                                )}
                                              </div>
                              <span className="flex-1 truncate text-xs">{file.label}</span>
                              {active && <Star className="h-3 w-3 text-primary" />}
                                            </DropdownMenuItem>
                                          );
                                        })}
                                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleSelectThumbnail(null)} className="text-destructive">
                                          取消预览图
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                              ) : (
                <div className="relative group">
                  <div className="flex h-[48px] w-[48px] items-center justify-center border border-dashed border-gray-300 bg-gray-50 text-[10px] text-gray-500">
                                    无预览
                                  </div>
                                  {allMediaFiles.length > 0 && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                          className="absolute right-1 top-1 h-6 w-6 opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100"
                                        >
                                          <ImageIcon className="h-3 w-3" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-48">
                        <div className="px-2 py-1.5 text-xs font-medium text-gray-700">选择预览图</div>
                                        <DropdownMenuSeparator />
                                        {allMediaFiles.map((file, index) => {
                                          const filePreviewUrl = getPreviewUrl(file.url);
                                          return (
                                            <DropdownMenuItem
                                              key={index}
                                              onClick={() => handleSelectThumbnail(file.url)}
                              className="flex items-center gap-2"
                                            >
                              <div className="h-8 w-8 overflow-hidden rounded bg-gray-100">
                                                {file.type === 'video' ? (
                                  <video src={filePreviewUrl} className="h-full w-full object-cover" muted playsInline />
                                                ) : (
                                                  <img
                                                    src={filePreviewUrl}
                                                    alt={file.label}
                                    className="h-full w-full object-cover"
                                                    onError={(e) => {
                                                      (e.target as HTMLImageElement).style.display = 'none';
                                                    }}
                                                  />
                                                )}
                                              </div>
                              <span className="flex-1 truncate text-xs">{file.label}</span>
                                            </DropdownMenuItem>
                                          );
                                        })}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                              )}
            </div>
                            </div>
                          );
      }
      case 'name':
        return (
          <div className="flex h-[56px] items-center text-xs text-gray-700 overflow-hidden" title={asset.name}>
            <span className="truncate block w-full">{asset.name}</span>
          </div>
        );
      case 'type':
        return (
          <div className="flex h-[56px] items-center whitespace-nowrap text-xs text-gray-700">
                        {asset.type}
          </div>
        );
      case 'tags': {
                            const tagsArray = Array.isArray(asset.tags)
                              ? asset.tags
                              : typeof (asset as any).tags === 'string'
            ? (asset as any).tags
                .split(',')
                .map((t: string) => t.trim())
                .filter(Boolean)
                              : [];
        return (
          <div className="flex h-[56px] flex-wrap items-center gap-1">
            {tagsArray.map((tag: string) => (
              <span key={tag} className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-700">
                                {tag}
                              </span>
            ))}
                        </div>
        );
      }
      case 'paths': {
        const guangzhouPathKey = `${asset.id}-guangzhouNas`;
        const shenzhenPathKey = `${asset.id}-shenzhenNas`;
        const isGuangzhouCopied = copiedPath === guangzhouPathKey;
        const isShenzhenCopied = copiedPath === shenzhenPathKey;
        
        return (
          <div className="flex h-[56px] items-center">
            <div className="space-y-0.5 w-full break-all text-[10px] leading-relaxed text-gray-600">
              {asset.guangzhouNas && (
                <div className="flex items-center gap-1 group">
                  <span className="flex-1">广州NAS：{asset.guangzhouNas}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className={cn(
                      "h-5 w-5 transition-opacity text-gray-500 hover:text-gray-900",
                      isGuangzhouCopied ? "opacity-100 text-green-600" : "opacity-0 group-hover:opacity-100"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (asset.guangzhouNas) {
                        copyToClipboard(asset.guangzhouNas, guangzhouPathKey);
                      }
                    }}
                    title={isGuangzhouCopied ? "已复制" : "复制路径"}
                  >
                    {isGuangzhouCopied ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              )}
              {asset.shenzhenNas && (
                <div className="flex items-center gap-1 group">
                  <span className="flex-1">深圳NAS：{asset.shenzhenNas}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className={cn(
                      "h-5 w-5 transition-opacity text-gray-500 hover:text-gray-900",
                      isShenzhenCopied ? "opacity-100 text-green-600" : "opacity-0 group-hover:opacity-100"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (asset.shenzhenNas) {
                        copyToClipboard(asset.shenzhenNas, shenzhenPathKey);
                      }
                    }}
                    title={isShenzhenCopied ? "已复制" : "复制路径"}
                  >
                    {isShenzhenCopied ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              )}
              {!asset.guangzhouNas && !asset.shenzhenNas && (
                <div className="text-gray-400">暂无NAS路径</div>
              )}
            </div>
          </div>
        );
      }
      case 'updatedAt': {
                          const updateTime = asset.updatedAt || asset.createdAt;
        const display = updateTime
          ? new Date(updateTime).toLocaleString('zh-CN', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
            })
          : '-';
        return <div className="flex h-[56px] items-center text-[10px] text-gray-600 whitespace-nowrap">{display}</div>;
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
                setEditingAssetInDialog(asset);
                setEditDialogOpen(true);
              }}
                            disabled={loading}
              title="编辑资产"
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
                setAssetToDelete(asset);
                setDeleteDialogOpen(true);
              }}
                            disabled={loading}
              title="删除资产"
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
    if (selectedAssetIds.size === 0) {
      throw new Error('请先选择至少一个资产');
    }

    const count = selectedAssetIds.size;

    const response = await fetch('/api/assets/batch-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assetIds: Array.from(selectedAssetIds),
        action: 'update-type',
        payload: { type: nextType },
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || '批量更新类型失败');
    }

    await refreshAssets();
    await fetchAllowedTypes();
    setSelectedAssetIds(new Set());
    setMessage(result.message || `已更新 ${result.processed ?? count} 个资产的类型`);
  }, [selectedAssetIds, refreshAssets, fetchAllowedTypes]);

  const handleBatchUpdateVersion = useCallback(async (nextVersion: string) => {
    if (selectedAssetIds.size === 0) {
      throw new Error('请先选择至少一个资产');
    }

    const count = selectedAssetIds.size;

    const response = await fetch('/api/assets/batch-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assetIds: Array.from(selectedAssetIds),
        action: 'update-version',
        payload: { engineVersion: nextVersion },
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || '批量更新版本失败');
    }

    await refreshAssets();
    setSelectedAssetIds(new Set());
    setMessage(result.message || `已更新 ${result.processed ?? count} 个资产的版本`);
  }, [selectedAssetIds, refreshAssets]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedAssetIds.size === 0) {
      throw new Error('请先选择至少一个资产');
    }

    const count = selectedAssetIds.size;

    const response = await fetch('/api/assets/batch-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assetIds: Array.from(selectedAssetIds),
        action: 'delete',
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || '批量删除失败');
    }

    await refreshAssets();
    await fetchAllowedTypes();
    setSelectedAssetIds(new Set());
    setMessage(result.message || `已删除 ${result.processed ?? count} 个资产`);
  }, [selectedAssetIds, refreshAssets, fetchAllowedTypes]);

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
    const initialSelection = new Set(selectedAssetIds);

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
      displayedAssets.forEach((asset) => {
        const rowElement = rowRefsRef.current.get(asset.id);
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
            newSelection.add(asset.id);
          } else {
            // 如果不在选择框内，从初始选择中移除（如果原本不在初始选择中）
            if (!initialSelection.has(asset.id)) {
              newSelection.delete(asset.id);
            }
          }
        }
      });
      setSelectedAssetIds(newSelection);
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
  }, [selectedAssetIds, displayedAssets]);

  // 处理多选：shift连续多选
  const handleRowMouseDown = useCallback((assetId: string, index: number, event: React.MouseEvent) => {
    // 如果按住shift，进行连续多选
    if (event.shiftKey && lastSelectedIndex !== null) {
      event.preventDefault();
      const startIndex = Math.min(lastSelectedIndex, index);
      const endIndex = Math.max(lastSelectedIndex, index);
      const newSelection = new Set(selectedAssetIds);
      for (let i = startIndex; i <= endIndex; i++) {
        if (displayedAssets[i]) {
          newSelection.add(displayedAssets[i].id);
        }
      }
      setSelectedAssetIds(newSelection);
      setLastSelectedIndex(index);
      return;
    }
  }, [selectedAssetIds, lastSelectedIndex, displayedAssets]);

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
      <div className="border border-gray-200 bg-white">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold text-gray-900">资产列表</h3>
            <div className="flex flex-wrap items-center gap-2">
              {selectedAssetIds.size > 0 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    // 如果有正在编辑的资产，先取消编辑
                    if (editingAssetId) {
                      resetForm();
                    }
                    setBatchEditOpen(true);
                  }}
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  批量操作 ({selectedAssetIds.size})
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTagsManagementOpen(true)}
              >
                <Tags className="h-4 w-4 mr-2" />
                标签管理
              </Button>
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
        <div className="space-y-4 px-4 py-4">
          {/* 搜索和筛选栏 */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="搜索资产名称或标签..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="pl-10 border-gray-300 bg-white text-gray-900"
                />
              </div>
              <select
                className="h-9 rounded border border-gray-300 bg-white px-3 text-sm text-gray-900"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="">全部类型</option>
                {(allowedTypes.length > 0 ? allowedTypes : [...DEFAULT_ASSET_TYPES]).map((type) => (
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
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-gray-600">
                共找到 {filteredAssets.length} 个资产
                {filteredAssets.length !== assets.length && `（共 ${assets.length} 个）`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPaths((prev) => !prev)}
                  className={`h-7 rounded border px-3 text-xs transition ${
                    showPaths
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {showPaths ? '隐藏路径' : '显示路径'}
                </button>
              </div>
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
              <table className="min-w-full table-fixed text-xs">
                <colgroup>
                  <col style={{ width: `${SELECTION_COL_WIDTH}px` }} />
                  {visibleAssetColumns.map((column) => (
                    <col key={column.id} style={{ width: `${columnWidths[column.id]}px` }} />
                  ))}
                </colgroup>
                <thead className="bg-gray-50 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">
                  <tr>
                    <th className="px-2 py-2">
                      <div className="flex h-[32px] items-center justify-center">
                        <Checkbox
                          checked={
                            displayedAssets.length > 0 &&
                            displayedAssets.every((asset) => selectedAssetIds.has(asset.id))
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              const newSelected = new Set(selectedAssetIds);
                              displayedAssets.forEach((asset) => newSelected.add(asset.id));
                              setSelectedAssetIds(newSelected);
                            } else {
                              const newSelected = new Set(selectedAssetIds);
                              displayedAssets.forEach((asset) => newSelected.delete(asset.id));
                              setSelectedAssetIds(newSelected);
                            }
                          }}
                        />
                      </div>
                    </th>
                    {visibleAssetColumns.map((column) => {
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
                  {displayedAssets.map((asset, index) => {
                    const isSelected = selectedAssetIds.has(asset.id);
                    return (
                      <tr
                        key={asset.id}
                        ref={(el) => {
                          if (el) rowRefsRef.current.set(asset.id, el);
                          else rowRefsRef.current.delete(asset.id);
                        }}
                        className={`align-middle transition-colors cursor-pointer select-none ${isSelected ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-gray-50'}`}
                        onMouseDown={(e) => {
                          // 如果正在框选，不处理行点击
                          if (isSelecting) {
                            return;
                          }
                          // 如果点击的是checkbox或按钮，不触发行选择
                          const target = e.target as HTMLElement;
                          if (target.closest('input[type="checkbox"]') || target.closest('button')) {
                            return;
                          }
                          handleRowMouseDown(asset.id, index, e);
                        }}
                        onClick={(e) => {
                          // 如果正在框选，不处理行点击
                          if (isSelecting) {
                            return;
                          }
                          // 如果点击的是checkbox、按钮或列宽调整区域，不触发行选择
                          const target = e.target as HTMLElement;
                          if (target.closest('input[type="checkbox"]') || target.closest('button') || target.closest('[class*="cursor-col-resize"]')) {
                            return;
                          }
                          
                          // Shift+点击：连续多选
                          if (e.shiftKey && lastSelectedIndex !== null) {
                            e.preventDefault();
                            const startIndex = Math.min(lastSelectedIndex, index);
                            const endIndex = Math.max(lastSelectedIndex, index);
                            const newSelection = new Set(selectedAssetIds);
                            for (let i = startIndex; i <= endIndex; i++) {
                              if (displayedAssets[i]) {
                                newSelection.add(displayedAssets[i].id);
                              }
                            }
                            setSelectedAssetIds(newSelection);
                            setLastSelectedIndex(index);
                            return;
                          }
                          
                          // 普通点击切换选择
                          const nextSelection = new Set(selectedAssetIds);
                          if (nextSelection.has(asset.id)) {
                            nextSelection.delete(asset.id);
                          } else {
                            nextSelection.add(asset.id);
                          }
                          setSelectedAssetIds(nextSelection);
                          setLastSelectedIndex(index);
                        }}
                      >
                        <td className="px-2 py-1.5">
                          <div className="flex h-[56px] items-center justify-center">
                            <Checkbox
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                const nextSelection = new Set(selectedAssetIds);
                                if (e.target.checked) {
                                  nextSelection.add(asset.id);
                                } else {
                                  nextSelection.delete(asset.id);
                                }
                                setSelectedAssetIds(nextSelection);
                                setLastSelectedIndex(index);
                              }}
                            />
                        </div>
                      </td>
                        {visibleAssetColumns.map((column) => (
                          <td key={column.id} className="px-2 py-1.5 relative">
                            {renderAssetCell(column.id, asset)}
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
                第 {currentPage} / {totalPages} 页，共 {filteredAssets.length} 条
              </span>
            </div>
          )}
        </div>
      </div>

      {!showOnlyList && (
      <div id="asset-form-card" className="border border-gray-200 bg-white">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">{editingAssetId ? '编辑资产' : '新增资产'}</h3>
        </div>
        <div className="space-y-5 px-4 py-4">
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
                      // 根据当前预览的文件类型判断（从 uploadedFiles 中获取）
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

          {/* ✅ 已上传文件列表（新增和编辑时都显示） */}
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
                        <p className="text-xs text-muted-foreground">
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
                  list={`type-suggestions-${editingAssetId || 'new'}`}
                />
                <datalist id={`type-suggestions-${editingAssetId || 'new'}`}>
                  {(allowedTypes.length > 0 ? allowedTypes : [...DEFAULT_ASSET_TYPES]).map((type) => (
                    <option key={type} value={type} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">风格（逗号分隔，可新增）</label>
              <div className="space-y-1">
                <Input
                  placeholder="写实, 二次元"
                  value={form.style}
                  onChange={handleInputChange('style')}
                  disabled={loading}
                  list={`style-suggestions-${editingAssetId || 'new'}`}
                />
                <datalist id={`style-suggestions-${editingAssetId || 'new'}`}>
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
                  list={`source-suggestions-${editingAssetId || 'new'}`}
                  required
                />
                <datalist id={`source-suggestions-${editingAssetId || 'new'}`}>
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
                  list={`version-suggestions-${editingAssetId || 'new'}`}
                  required
                />
                <datalist id={`version-suggestions-${editingAssetId || 'new'}`}>
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
                {editingAssetId ? (
                  <>
                    <Button onClick={handleUpdate} disabled={loading || !hasFormChanged}>
                      {loading ? '更新中...' : hasFormChanged ? '更新资产' : '保存资产'}
                    </Button>
                    <Button variant="outline" onClick={resetForm} disabled={loading}>
                      取消编辑
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={handleCreate} disabled={loading}>
                      {loading ? '提交中...' : '创建资产'}
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

      {/* 批量上传弹窗 */}
      <BatchUploadDialog
        open={batchUploadOpen}
        onOpenChange={setBatchUploadOpen}
        onSuccess={() => {
          refreshAssets();
          setBatchUploadOpen(false);
        }}
      />

      {/* 标签管理弹窗 */}
      <TagsManagementDialog
        open={tagsManagementOpen}
        onOpenChange={setTagsManagementOpen}
        assets={assets}
        onSave={handleTagsSave}
        onTypesSave={handleTypesSave}
      />

      {/* 批量操作弹窗 */}
      <BatchEditDialog
        open={batchEditOpen}
        onOpenChange={setBatchEditOpen}
        selectedCount={selectedAssetIds.size}
        allowedTypes={allowedTypes.length > 0 ? allowedTypes : [...DEFAULT_ASSET_TYPES]}
        onAddTags={handleBatchAddTags}
        onUpdateType={handleBatchUpdateType}
        onUpdateVersion={handleBatchUpdateVersion}
        onDelete={handleBatchDelete}
      />

      {/* 编辑资产弹窗 */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open);
        if (!open) {
          setEditingAssetInDialog(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑资产</DialogTitle>
          </DialogHeader>
          {editingAssetInDialog && (
            <div className="space-y-4 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">名称 <span className="text-red-500">*</span></label>
                  <Input
                    placeholder="资产名称"
                    value={editingAssetInDialog.name}
                    onChange={(e) => setEditingAssetInDialog({ ...editingAssetInDialog, name: e.target.value })}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">类型（可新增）<span className="text-red-500">*</span></label>
                  <div className="space-y-1">
                    <Input
                      placeholder="选择或输入新类型"
                      value={editingAssetInDialog.type}
                      onChange={(e) => setEditingAssetInDialog({ ...editingAssetInDialog, type: e.target.value as typeof editingAssetInDialog.type })}
                      disabled={loading}
                      required
                      list="type-suggestions-dialog"
                    />
                    <datalist id="type-suggestions-dialog">
                      {(allowedTypes.length > 0 ? allowedTypes : [...DEFAULT_ASSET_TYPES]).map((type) => (
                        <option key={type} value={type} />
                      ))}
                    </datalist>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">项目<span className="text-red-500">*</span></label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={editingAssetInDialog.project || ''}
                    onChange={(e) => setEditingAssetInDialog({ ...editingAssetInDialog, project: e.target.value as any })}
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
                  <label className="text-sm font-medium">风格（逗号分隔，可新增）</label>
                  <Input
                    placeholder="写实, 二次元"
                    value={Array.isArray(editingAssetInDialog.style) ? editingAssetInDialog.style.join(', ') : (editingAssetInDialog.style || '')}
                    onChange={(e) => setEditingAssetInDialog({ ...editingAssetInDialog, style: e.target.value })}
                    disabled={loading}
                    list="style-suggestions-dialog"
                  />
                  <datalist id="style-suggestions-dialog">
                    {STYLE_SUGGESTIONS.map((style) => (
                      <option key={style} value={style} />
                    ))}
                  </datalist>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">标签（逗号分隔，至少1个）<span className="text-red-500">*</span></label>
                  <Input
                    placeholder="自然, 风景, 建筑"
                    value={Array.isArray(editingAssetInDialog.tags) ? editingAssetInDialog.tags.join(', ') : editingAssetInDialog.tags}
                    onChange={(e) => setEditingAssetInDialog({ ...editingAssetInDialog, tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean) })}
                    disabled={loading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">来源（可新增）<span className="text-red-500">*</span></label>
                  <div className="space-y-1">
                    <Input
                      placeholder="内部"
                      value={editingAssetInDialog.source || ''}
                      onChange={(e) => setEditingAssetInDialog({ ...editingAssetInDialog, source: e.target.value })}
                      disabled={loading}
                      list="source-suggestions-dialog"
                      required
                    />
                    <datalist id="source-suggestions-dialog">
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
                      value={editingAssetInDialog.engineVersion || ''}
                      onChange={(e) => setEditingAssetInDialog({ ...editingAssetInDialog, engineVersion: e.target.value })}
                      disabled={loading}
                      list="version-suggestions-dialog"
                      required
                    />
                    <datalist id="version-suggestions-dialog">
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
                    value={editingAssetInDialog.guangzhouNas || ''}
                    onChange={(e) => setEditingAssetInDialog({ ...editingAssetInDialog, guangzhouNas: e.target.value })}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">深圳NAS路径 <span className="text-red-500">*</span></label>
                  <Input
                    placeholder="例如：/nas/shenzhen/assets/xxx.jpg"
                    value={editingAssetInDialog.shenzhenNas || ''}
                    onChange={(e) => setEditingAssetInDialog({ ...editingAssetInDialog, shenzhenNas: e.target.value })}
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-600">注意：广州NAS和深圳NAS至少需要填写一个</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">封面路径</label>
                  <Input
                    placeholder="/demo/xxx.jpg 或完整 CDN 地址"
                    value={editingAssetInDialog.thumbnail || ''}
                    onChange={(e) => setEditingAssetInDialog({ ...editingAssetInDialog, thumbnail: e.target.value })}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">资源路径</label>
                  <Input
                    placeholder="/demo/xxx.jpg 或完整 CDN 地址"
                    value={editingAssetInDialog.src || ''}
                    onChange={(e) => setEditingAssetInDialog({ ...editingAssetInDialog, src: e.target.value })}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setEditingAssetInDialog(null);
              }}
              disabled={loading}
            >
              取消
            </Button>
            <Button
              onClick={async () => {
                if (!editingAssetInDialog) return;
                setLoading(true);
                try {
                  // 验证必填字段
                  if (!editingAssetInDialog.name?.trim()) {
                    throw new Error('名称不能为空');
                  }
                  if (!editingAssetInDialog.type) {
                    throw new Error('类型不能为空');
                  }
                  if (!editingAssetInDialog.tags || (Array.isArray(editingAssetInDialog.tags) && editingAssetInDialog.tags.length === 0)) {
                    throw new Error('至少需要一个标签');
                  }
                  if (!editingAssetInDialog.source?.trim()) {
                    throw new Error('来源不能为空');
                  }
                  if (!editingAssetInDialog.engineVersion?.trim()) {
                    throw new Error('版本不能为空');
                  }
                  if (!editingAssetInDialog.guangzhouNas?.trim() && !editingAssetInDialog.shenzhenNas?.trim()) {
                    throw new Error('广州NAS和深圳NAS至少需要填写一个');
                  }

                  // 处理风格
                  const styleValue = editingAssetInDialog.style
                    ? Array.isArray(editingAssetInDialog.style)
                      ? editingAssetInDialog.style
                      : typeof editingAssetInDialog.style === 'string' && editingAssetInDialog.style.includes(',')
                      ? editingAssetInDialog.style.split(',').map((s: string) => s.trim()).filter(Boolean)
                      : editingAssetInDialog.style
                    : undefined;
                  const style = Array.isArray(styleValue) && styleValue.length === 1 ? styleValue[0] : styleValue;

                  // 处理标签
                  const tags = Array.isArray(editingAssetInDialog.tags)
                    ? editingAssetInDialog.tags
                    : [];

                  const payload = {
                    id: editingAssetInDialog.id,
                    name: editingAssetInDialog.name.trim(),
                    type: editingAssetInDialog.type.trim(),
                    project: editingAssetInDialog.project || undefined,
                    style: style,
                    tags: tags,
                    source: editingAssetInDialog.source.trim(),
                    engineVersion: editingAssetInDialog.engineVersion.trim(),
                    guangzhouNas: editingAssetInDialog.guangzhouNas?.trim() || undefined,
                    shenzhenNas: editingAssetInDialog.shenzhenNas?.trim() || undefined,
                    thumbnail: editingAssetInDialog.thumbnail?.trim() || undefined,
                    src: editingAssetInDialog.src?.trim() || undefined,
                    gallery: editingAssetInDialog.gallery,
                  };

                  const response = await fetch(`/api/assets/${editingAssetInDialog.id}`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                  });

                  if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || '更新资产失败');
                  }

                  await refreshAssets();
                  setEditDialogOpen(false);
                  setEditingAssetInDialog(null);
                  setMessage('资产已更新');
                } catch (error) {
                  console.error(error);
                  setMessage(error instanceof Error ? error.message : '更新资产失败');
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
          setAssetToDelete(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-700">
              确定要删除资产 <span className="font-semibold">"{assetToDelete?.name}"</span> 吗？
            </p>
            <p className="text-xs text-gray-500 mt-2">此操作不可恢复。</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setAssetToDelete(null);
              }}
              disabled={loading}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!assetToDelete) return;
                setLoading(true);
                try {
                  const response = await fetch(`/api/assets/${assetToDelete.id}`, {
                    method: 'DELETE',
                  });

                  if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || '删除资产失败');
                  }

                  await refreshAssets();
                  setDeleteDialogOpen(false);
                  setAssetToDelete(null);
                  setMessage('资产已删除');
                  
                  // 如果删除的是正在编辑的资产，重置表单
                  if (editingAssetId === assetToDelete.id) {
                    resetForm();
                  }
                  
                  // 如果删除的是弹窗中正在编辑的资产，关闭弹窗
                  if (editingAssetInDialog?.id === assetToDelete.id) {
                    setEditDialogOpen(false);
                    setEditingAssetInDialog(null);
                  }
                } catch (error) {
                  console.error(error);
                  setMessage(error instanceof Error ? error.message : '删除资产失败');
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
            >
              {loading ? '删除中...' : '确认删除'}
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
    </div>
  );
}


