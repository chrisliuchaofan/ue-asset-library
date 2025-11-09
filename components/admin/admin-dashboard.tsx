'use client';

import { useCallback, useMemo, useState, useRef, useEffect, type ChangeEvent } from 'react';
import Link from 'next/link';
import type { Asset } from '@/data/manifest.schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, X, ChevronLeft, ChevronRight, Trash2, Star, Edit, Search, Download, FileArchive, Tags, ArrowLeft, CheckSquare, ImageIcon, MoreVertical } from 'lucide-react';
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

type StorageMode = 'local' | 'oss';

interface AdminDashboardProps {
  initialAssets: Asset[];
  storageMode: StorageMode;
  cdnBase: string;
}

// 资产类型选项（默认值，实际使用时会从API动态获取）
const DEFAULT_ASSET_TYPES = ['角色', '场景', '动画', '特效', '材质', '蓝图', 'UI', '合成', '音频', '其他'] as const;

// 风格建议值
const STYLE_SUGGESTIONS = ['写实', '二次元', '卡通', '国风', '欧式', '科幻', '写意', '低多边形', '像素', '日系', '欧美', '写实PBR'];

// 来源建议值
const SOURCE_SUGGESTIONS = ['内部', '外部', '网络'];

// 版本建议值
const VERSION_SUGGESTIONS = ['UE5.6', 'UE5.5', 'UE5.4', 'UE5.3', 'UE4.3'];

interface FormState {
  name: string;
  type: string; // 资产类型：角色、场景等
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

export function AdminDashboard({ initialAssets, storageMode, cdnBase }: AdminDashboardProps) {
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
  const [showAllAssets, setShowAllAssets] = useState(false);
  const [batchUploadOpen, setBatchUploadOpen] = useState(false);
  const [tagsManagementOpen, setTagsManagementOpen] = useState(false);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [batchEditOpen, setBatchEditOpen] = useState(false);
  const [allowedTypes, setAllowedTypes] = useState<string[]>([]); // 允许的资产类型列表（动态获取）

  // OSS 模式已支持读写，不再设为只读
  const isReadOnly = false;

  // 从API获取允许的类型列表
  useEffect(() => {
    fetch('/api/assets/types')
      .then((res) => res.json())
      .then((data) => {
        if (data.allowedTypes && Array.isArray(data.allowedTypes)) {
          setAllowedTypes(data.allowedTypes);
        } else {
          // 如果获取失败，使用默认类型
          setAllowedTypes([...DEFAULT_ASSET_TYPES]);
        }
      })
      .catch((err) => {
        console.error('获取类型列表失败:', err);
        // 如果获取失败，使用默认类型
        setAllowedTypes([...DEFAULT_ASSET_TYPES]);
      });
  }, []);

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

  // 处理批量添加标签
  const handleBatchAddTags = useCallback(async (newTags: string[]) => {
    if (selectedAssetIds.size === 0) return;

    const response = await fetch('/api/assets/batch-tags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assetIds: Array.from(selectedAssetIds),
        tagsToAdd: newTags,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '批量添加标签失败');
    }

    const count = selectedAssetIds.size;
    // 刷新资产列表
    await refreshAssets();
    // 清空选择
    setSelectedAssetIds(new Set());
    setMessage(`已为 ${count} 个资产添加标签`);
  }, [selectedAssetIds, refreshAssets, setSelectedAssetIds, setMessage]);

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
    // 重新获取类型列表
    const response = await fetch('/api/assets/types');
    if (response.ok) {
      const data = await response.json();
      if (data.allowedTypes && Array.isArray(data.allowedTypes)) {
        setAllowedTypes(data.allowedTypes);
        // 刷新资产列表（因为类型可能被重命名）
        await refreshAssets();
        setMessage('类型已更新');
      }
    }
  }, [refreshAssets]);

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
      if (!form.guangzhouNas.trim() && !form.shenzhenNas.trim()) {
        throw new Error('广州NAS和深圳NAS至少需要填写一个');
      }

      // 处理风格：支持多个值（逗号分隔）
      const styleValues = form.style
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const style = styleValues.length === 1 ? styleValues[0] : styleValues.length > 1 ? styleValues : undefined;

      const payload = {
        name: form.name.trim(),
        type: form.type,
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
      const style = styleValues.length === 1 ? styleValues[0] : styleValues.length > 1 ? styleValues : undefined;

      // 确保类型已trim
      const assetType = form.type.trim();

      const payload = {
        name: form.name.trim(),
        type: assetType,
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
      const formData = new FormData();
      formData.append('file', file);

      // 使用XMLHttpRequest来跟踪上传进度
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
              const data = JSON.parse(xhr.responseText);
              resolve(data);
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

      const data = await uploadPromise;

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
      setMessage(`文件上传成功: ${data.originalName}`);

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
          
          const formData = new FormData();
          formData.append('file', file);

          // 使用XMLHttpRequest来跟踪上传进度
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

          const data = await uploadPromise;
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
        setMessage(`成功处理 ${files.length} 个文件，其中 ${duplicateFiles.length} 个已存在（已跳过重复上传）`);
      } else {
        setMessage(`成功上传 ${files.length} 个文件`);
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

    // 搜索关键词
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter(
        (asset) =>
          asset.name.toLowerCase().includes(keyword) ||
          asset.tags.some((tag) => tag.toLowerCase().includes(keyword))
      );
    }

    // 类型筛选
    if (filterType) {
      filtered = filtered.filter((asset) => asset.type === filterType);
    }

    // 标签筛选
    if (filterTag) {
      filtered = filtered.filter((asset) => asset.tags.includes(filterTag));
    }

    // 按上传时间排序（最新的在前）
    filtered = [...filtered].sort((a, b) => {
      const aTime = a.createdAt || 0;
      const bTime = b.createdAt || 0;
      return bTime - aTime; // 降序
    });

    return filtered;
  }, [assets, searchKeyword, filterType, filterTag]);

  // 分页显示（默认显示5条）
  const displayedAssets = useMemo(() => {
    if (showAllAssets) {
      return filteredAssets;
    }
    return filteredAssets.slice(0, 5);
  }, [filteredAssets, showAllAssets]);

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
          const ossConfig = (window as any).__OSS_CONFIG__;
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

  return (
    <div className="space-y-8">
      {/* 返回资产页按钮 */}
      <div className="flex items-center justify-between">
        <Link href="/assets">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回资产页
          </Button>
        </Link>
      </div>

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
          <div className="flex items-center justify-between">
            <CardTitle>资产列表</CardTitle>
            <div className="flex gap-2">
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
        </CardHeader>
        <CardContent>
          {/* 搜索和筛选栏 */}
          <div className="mb-4 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="搜索资产名称或标签..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
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
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
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
            <div className="text-sm text-muted-foreground">
              共找到 {filteredAssets.length} 个资产
              {filteredAssets.length !== assets.length && `（共 ${assets.length} 个）`}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium w-12">
                    <Checkbox
                      checked={displayedAssets.length > 0 && displayedAssets.every((asset) => selectedAssetIds.has(asset.id))}
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
                  </th>
                  <th className="px-3 py-2 text-left font-medium">预览图</th>
                  <th className="px-3 py-2 text-left font-medium">名称</th>
                  <th className="px-3 py-2 text-left font-medium">类型</th>
                  <th className="px-3 py-2 text-left font-medium">标签</th>
                  <th className="px-3 py-2 text-left font-medium">资源路径</th>
                  <th className="px-3 py-2 text-left font-medium">更新时间</th>
                  <th className="px-3 py-2 text-left font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayedAssets.map((asset) => {
                  // 获取预览图URL：优先使用thumbnail，如果没有则使用src
                  const thumbnailOrSrc = asset.thumbnail || asset.src;
                  const previewUrl = getPreviewUrl(thumbnailOrSrc);
                  
                  // 调试信息（开发环境）
                  if (process.env.NODE_ENV === 'development' && !previewUrl && (asset.thumbnail || asset.src)) {
                    console.warn(`[预览图调试] 资产 "${asset.name}" (ID: ${asset.id}):`, {
                      thumbnail: asset.thumbnail,
                      src: asset.src,
                      thumbnailOrSrc,
                      previewUrl,
                      'getPreviewUrl结果': previewUrl,
                    });
                  }
                  
                  const isVideoUrl = (url: string) => {
                    if (!url) return false;
                    const lower = url.toLowerCase();
                    return lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.mov') || lower.includes('.avi') || lower.includes('.mkv');
                  };
                  const isVideo = isVideoUrl(asset.src);
                  
                  const isSelected = selectedAssetIds.has(asset.id);
                  return (
                    <tr key={asset.id} className={isSelected ? 'bg-muted/30' : ''}>
                      <td className="px-3 py-2">
                        <Checkbox
                          checked={isSelected}
                          onChange={(e) => {
                            const newSelected = new Set(selectedAssetIds);
                            if (e.target.checked) {
                              newSelected.add(asset.id);
                            } else {
                              newSelected.delete(asset.id);
                            }
                            setSelectedAssetIds(newSelected);
                          }}
                        />
                      </td>
                      <td className="px-3 py-2">
                        {(() => {
                          // ✅ 收集资产的所有媒体文件（thumbnail, src, gallery）
                          const allMediaFiles: Array<{ url: string; label: string; type: 'image' | 'video' }> = [];
                          
                          // 添加thumbnail
                          if (asset.thumbnail) {
                            allMediaFiles.push({
                              url: asset.thumbnail,
                              label: '封面图',
                              type: isVideoUrl(asset.thumbnail) ? 'video' : 'image',
                            });
                          }
                          
                          // 添加src（如果与thumbnail不同）
                          if (asset.src && asset.src !== asset.thumbnail) {
                            allMediaFiles.push({
                              url: asset.src,
                              label: '资源文件',
                              type: isVideoUrl(asset.src) ? 'video' : 'image',
                            });
                          }
                          
                          // 添加gallery中的文件
                          if (asset.gallery && asset.gallery.length > 0) {
                            asset.gallery.forEach((url, index) => {
                              if (url && url !== asset.thumbnail && url !== asset.src) {
                                allMediaFiles.push({
                                  url: url,
                                  label: `画廊 ${index + 1}`,
                                  type: isVideoUrl(url) ? 'video' : 'image',
                                });
                              }
                            });
                          }
                          
                          // ✅ 如果没有媒体文件，但src存在，添加src作为默认选项
                          if (allMediaFiles.length === 0 && asset.src) {
                            allMediaFiles.push({
                              url: asset.src,
                              label: '资源文件',
                              type: isVideoUrl(asset.src) ? 'video' : 'image',
                            });
                          }
                          
                          // 当前选中的预览图URL
                          const currentThumbnail = asset.thumbnail || '';
                          const currentPreviewUrl = getPreviewUrl(currentThumbnail);
                          
                          // 处理选择预览图
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
                                  thumbnail: selectedUrl || undefined, // 如果为null，设置为undefined以清除预览图
                                }),
                              });
                              
                              if (!response.ok) {
                                const error = await response.json();
                                throw new Error(error.message || '更新预览图失败');
                              }
                              
                              // 刷新资产列表
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
                            <div className="relative group">
                              {currentPreviewUrl ? (
                                <div className="w-16 h-16 relative rounded overflow-hidden bg-muted">
                                  {isVideoUrl(currentThumbnail) ? (
                                    <video
                                      src={currentPreviewUrl}
                                      className="w-full h-full object-cover"
                                      muted
                                      playsInline
                                    />
                                  ) : (
                                    <img
                                      src={currentPreviewUrl}
                                      alt={asset.name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const img = e.target as HTMLImageElement;
                                        console.warn(`[预览图加载失败] 资产 "${asset.name}" (ID: ${asset.id}):`, {
                                          previewUrl: currentPreviewUrl,
                                          thumbnail: asset.thumbnail,
                                          src: asset.src,
                                          '尝试的URL': img.src,
                                        });
                                        img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect fill="%23ccc" width="64" height="64"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3E无预览%3C/text%3E%3C/svg%3E';
                                      }}
                                      onLoad={(e) => {
                                        const img = e.target as HTMLImageElement;
                                        const isValid = img.naturalWidth > 0 && img.naturalHeight > 0;
                                        
                                        if (process.env.NODE_ENV === 'development') {
                                          if (isValid) {
                                            console.log(`[预览图加载成功] 资产 "${asset.name}":`, {
                                              previewUrl: currentPreviewUrl,
                                              width: img.naturalWidth,
                                              height: img.naturalHeight,
                                            });
                                          } else {
                                            console.warn(`[预览图加载但无效] 资产 "${asset.name}":`, {
                                              previewUrl: currentPreviewUrl,
                                              'naturalWidth': img.naturalWidth,
                                              'naturalHeight': img.naturalHeight,
                                              '可能原因': '图片文件损坏或格式不正确，或返回的不是图片内容',
                                            });
                                            img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect fill="%23ccc" width="64" height="64"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3E无预览%3C/text%3E%3C/svg%3E';
                                          }
                                        } else {
                                          if (!isValid) {
                                            img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect fill="%23ccc" width="64" height="64"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3E无预览%3C/text%3E%3C/svg%3E';
                                          }
                                        }
                                      }}
                                    />
                                  )}
                                  {/* ✅ 选择预览图按钮（即使只有一个文件也可以选择） */}
                                  {allMediaFiles.length > 0 && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="absolute top-0 right-0 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <MoreVertical className="h-3 w-3" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-48">
                                        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                                          选择预览图
                                        </div>
                                        <DropdownMenuSeparator />
                                        {allMediaFiles.map((file, index) => {
                                          const filePreviewUrl = getPreviewUrl(file.url);
                                          const isSelected = currentThumbnail === file.url;
                                          return (
                                            <DropdownMenuItem
                                              key={index}
                                              onClick={() => handleSelectThumbnail(file.url)}
                                              className="flex items-center gap-2 cursor-pointer"
                                            >
                                              <div className="w-8 h-8 relative rounded overflow-hidden bg-muted flex-shrink-0">
                                                {file.type === 'video' ? (
                                                  <video
                                                    src={filePreviewUrl}
                                                    className="w-full h-full object-cover"
                                                    muted
                                                    playsInline
                                                  />
                                                ) : (
                                                  <img
                                                    src={filePreviewUrl}
                                                    alt={file.label}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                      (e.target as HTMLImageElement).style.display = 'none';
                                                    }}
                                                  />
                                                )}
                                              </div>
                                              <span className="flex-1 truncate">{file.label}</span>
                                              {isSelected && <Star className="h-3 w-3 text-primary flex-shrink-0" />}
                                            </DropdownMenuItem>
                                          );
                                        })}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={() => handleSelectThumbnail(null)}
                                          className="text-destructive cursor-pointer"
                                        >
                                          取消预览图
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                              ) : (
                                <div className="relative">
                                  <div className="w-16 h-16 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                                    无预览
                                  </div>
                                  {/* ✅ 如果有可用媒体文件，显示选择按钮 */}
                                  {allMediaFiles.length > 0 && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="absolute top-0 right-0 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <ImageIcon className="h-3 w-3" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-48">
                                        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                                          选择预览图
                                        </div>
                                        <DropdownMenuSeparator />
                                        {allMediaFiles.map((file, index) => {
                                          const filePreviewUrl = getPreviewUrl(file.url);
                                          return (
                                            <DropdownMenuItem
                                              key={index}
                                              onClick={() => handleSelectThumbnail(file.url)}
                                              className="flex items-center gap-2 cursor-pointer"
                                            >
                                              <div className="w-8 h-8 relative rounded overflow-hidden bg-muted flex-shrink-0">
                                                {file.type === 'video' ? (
                                                  <video
                                                    src={filePreviewUrl}
                                                    className="w-full h-full object-cover"
                                                    muted
                                                    playsInline
                                                  />
                                                ) : (
                                                  <img
                                                    src={filePreviewUrl}
                                                    alt={file.label}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                      (e.target as HTMLImageElement).style.display = 'none';
                                                    }}
                                                  />
                                                )}
                                              </div>
                                              <span className="flex-1 truncate">{file.label}</span>
                                            </DropdownMenuItem>
                                          );
                                        })}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-2">{asset.name}</td>
                      <td className="px-3 py-2">
                        {asset.type}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {(() => {
                            // 确保 tags 是数组，如果是字符串则拆分（兼容旧数据）
                            const tagsArray = Array.isArray(asset.tags)
                              ? asset.tags
                              : typeof (asset as any).tags === 'string'
                              ? (asset as any).tags.split(',').map((t: string) => t.trim()).filter(Boolean)
                              : [];
                            return tagsArray.map((tag: string) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ));
                          })()}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="space-y-1 break-all text-xs max-w-xs">
                          {asset.thumbnail && <div>封面：{asset.thumbnail}</div>}
                          <div>资源：{asset.src}</div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                        {(() => {
                          const updateTime = asset.updatedAt || asset.createdAt;
                          if (updateTime) {
                            const date = new Date(updateTime);
                            return date.toLocaleString('zh-CN', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            });
                          }
                          return '-';
                        })()}
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
                            variant="default"
                            onClick={() => handleEdit(asset)}
                            disabled={loading}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            修改
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
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 分页控制 */}
          {filteredAssets.length > 5 && (
            <div className="mt-4 flex justify-center">
              {!showAllAssets ? (
                <Button
                  variant="outline"
                  onClick={() => setShowAllAssets(true)}
                >
                  显示更多 ({filteredAssets.length - 5} 个)
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setShowAllAssets(false)}
                >
                  收起（仅显示前5条）
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card id="asset-form-card">
        <CardHeader>
          <CardTitle>{editingAssetId ? '编辑资产' : '新增资产'}</CardTitle>
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
              <div className="text-sm text-muted-foreground w-full">
                {uploading ? (
                  <div className="space-y-2 w-full">
                    <div className="text-center">{uploadProgress || '上传中...'}</div>
                    {uploadProgressPercent > 0 && (
                      <div className="w-full bg-muted rounded-full h-2">
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
              <p className="text-xs text-muted-foreground">注意：广州NAS和深圳NAS至少需要填写一个</p>
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
                {message && <span className="text-sm text-muted-foreground">{message}</span>}
              </div>
        </CardContent>
      </Card>

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
        onSave={handleBatchAddTags}
      />
    </div>
  );
}


