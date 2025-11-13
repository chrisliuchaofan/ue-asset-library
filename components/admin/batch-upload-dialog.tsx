'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, FileArchive, Upload, X, Check, Trash2, Eye, Edit, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import JSZip from 'jszip';
import Papa from 'papaparse';
import type { Asset, AssetCreateInput } from '@/data/manifest.schema';
import { uploadFileDirect } from '@/lib/client/direct-upload';
import { PROJECTS } from '@/lib/constants';

interface BatchUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  assets?: Asset[]; // 资产列表，用于生成模板示例
}

// CSV模板列定义（中文表头，与新增资产表单字段一致）
// 注意：预览图、资源路径、画廊不需要用户填写，由上传的文件自动生成
const CSV_TEMPLATE_COLUMNS_CN = [
  '名称',
  '类型',
  '风格',
  '标签',
  '来源',
  '版本',
  '广州NAS路径',
  '深圳NAS路径',
  '预览图和视频',
];

// CSV模板列定义（英文字段名，用于解析）
const CSV_TEMPLATE_COLUMNS_EN = [
  'name',
  'type',
  'style',
  'tags',
  'source',
  'engineVersion',
  'guangzhouNas',
  'shenzhenNas',
  'previewFiles',
];

// CSV值转义函数（处理包含逗号、引号的值）
function escapeCSVValue(value: string): string {
  if (!value) return '';
  // 如果包含逗号、引号或换行符，需要用引号包裹，并转义内部引号
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// 生成CSV模板（使用第一个资产作为示例）
function generateCSVTemplate(exampleAsset?: Asset): string {
  const headers = CSV_TEMPLATE_COLUMNS_CN.join(',');
  
  let exampleRow: string[];
  
  if (exampleAsset) {
    // 使用实际资产数据作为示例
    const styleValue = exampleAsset.style
      ? Array.isArray(exampleAsset.style)
        ? exampleAsset.style.join(',')
        : exampleAsset.style
      : '';
    
    exampleRow = [
      exampleAsset.name || '示例资产',
      exampleAsset.type || '角色',
      styleValue || '写实,二次元',
      exampleAsset.tags?.join(',') || '标签1,标签2',
      exampleAsset.source || '内部',
      exampleAsset.engineVersion || 'UE5.5',
      exampleAsset.guangzhouNas || '/nas/guangzhou/assets/example.jpg',
      exampleAsset.shenzhenNas || '/nas/shenzhen/assets/example.jpg',
      '', // 预览图和视频列（可选）：填写ZIP中的文件名（逗号分隔）。如不填写，系统会根据资产名称自动搜索匹配的文件
    ];
  } else {
    // 如果没有资产，使用默认示例
    exampleRow = [
      '示例资产',
      '角色',
      '写实,二次元',
      '标签1,标签2',
      '内部',
      'UE5.5',
      '/nas/guangzhou/assets/example.jpg',
      '/nas/shenzhen/assets/example.jpg',
      'preview1.jpg,preview2.mp4', // 预览图和视频文件名
    ];
  }
  
  // 转义所有值，确保CSV格式正确
  const escapedRow = exampleRow.map(escapeCSVValue);
  return `${headers}\n${escapedRow.join(',')}`;
}

interface PendingAsset extends AssetCreateInput {
  _tempId?: string; // 临时ID，用于预览
  _previewImage?: string; // 预览图URL
  _error?: string; // 解析或前端验证失败的错误信息
  _createError?: string; // 创建失败的错误信息
  _invalidType?: string; // 无效的类型值（用于类型错误提示）
  _uploadedFiles?: Array<{ // 已上传的文件列表（用于选择预览图）
    url: string;
    originalName: string;
    type: 'image' | 'video';
  }>;
}

export function BatchUploadDialog({ open, onOpenChange, onSuccess, assets = [] }: BatchUploadDialogProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [uploadProgressPercent, setUploadProgressPercent] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Array<{ success: boolean; message: string; assetTempId?: string }>>([]);
  const [pendingAssets, setPendingAssets] = useState<PendingAsset[]>([]); // 待确认的资产
  const [showPreview, setShowPreview] = useState(false); // 是否显示预览界面
  const [creating, setCreating] = useState(false); // 是否正在创建资产
  const [editingAsset, setEditingAsset] = useState<PendingAsset | null>(null); // 正在编辑的资产
  const [allowedTypes, setAllowedTypes] = useState<string[]>([]); // 允许的资产类型列表（实时获取）
  const [selectedProject, setSelectedProject] = useState<string>(''); // 选中的项目

  // 获取CDN base（与admin-dashboard保持一致）
  const normalizedCdnBase = useMemo(() => {
    if (typeof window === 'undefined') return '/';
    const cdnBase = window.__CDN_BASE__ || process.env.NEXT_PUBLIC_CDN_BASE || '/';
    return cdnBase.replace(/\/+$/, '');
  }, []);

  const storageMode = useMemo<'local' | 'oss'>(() => {
    if (typeof window === 'undefined') return 'local';
    return window.__STORAGE_MODE__ ?? 'local';
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
            result.duration = Number.isFinite(video.duration) ? Math.round(video.duration) : undefined;
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
      console.warn('批量上传：读取本地媒体元数据失败', error);
    }

    return result;
  }, []);

  // 从API获取允许的类型列表
  useEffect(() => {
    if (open) {
      fetch('/api/assets/types')
        .then((res) => res.json())
        .then((data) => {
          if (data.allowedTypes && Array.isArray(data.allowedTypes)) {
            setAllowedTypes(data.allowedTypes);
          }
        })
        .catch((err) => {
          console.error('获取类型列表失败:', err);
          // 如果获取失败，使用默认类型
          setAllowedTypes(['角色', '场景', '动画', '特效', '材质', '蓝图', 'UI', '合成', '音频', '其他']);
        });
    }
  }, [open]);

  // 下载CSV模板（使用第一个资产作为示例）
  const downloadCSVTemplate = useCallback(() => {
    const exampleAsset = assets.length > 0 ? assets[0] : undefined;
    const csv = generateCSVTemplate(exampleAsset);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }); // 添加BOM以支持中文
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '资产批量上传模板.csv';
    link.click();
    URL.revokeObjectURL(url);
  }, [assets]);

  const handleZipUpload = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setError('请上传ZIP格式文件');
      return;
    }

    setUploading(true);
    setError(null);
    setProgress('正在读取ZIP文件...');
    setUploadProgressPercent(0);
    setResults([]);

    try {
      // 读取ZIP文件
      const zip = new JSZip();
      const zipData = await file.arrayBuffer();
      const zipContent = await zip.loadAsync(zipData);
      
      setProgress('正在解压缩ZIP文件...');

      // 查找CSV文件（排除目录、隐藏文件和macOS系统文件）
      const csvFiles = Object.keys(zipContent.files).filter((filename) => {
        const file = zipContent.files[filename];
        // 排除目录
        if (file.dir) return false;
        
        // 排除macOS系统生成的隐藏文件和目录
        // 排除 __MACOSX 文件夹中的文件
        if (filename.includes('__MACOSX/') || filename.includes('__MACOSX\\')) return false;
        // 排除 .DS_Store 文件
        if (filename.includes('.DS_Store')) return false;
        // 排除以 ._ 开头的macOS资源分叉文件
        const baseName = filename.replace(/^.*[\\/]/, '');
        if (baseName.startsWith('._')) return false;
        // 排除以 . 开头的隐藏文件（但保留正常的.csv文件）
        if (baseName.startsWith('.') && !baseName.endsWith('.csv')) return false;
        
        // 只查找以.csv结尾的实际文件
        return filename.toLowerCase().endsWith('.csv');
      });

      if (csvFiles.length === 0) {
        throw new Error('ZIP文件中未找到CSV文件');
      }

      // 去重：基于文件名（不含路径）来判断是否是同一个文件
      // 因为同一个文件可能以不同的路径形式出现（如 file.csv, /file.csv, ./file.csv）
      // 或者macOS系统可能在__MACOSX中创建了副本
      const csvFileMap = new Map<string, string>();
      for (const filePath of csvFiles) {
        // 提取文件名（不含路径）
        const fileName = filePath.replace(/^.*[\\/]/, '').toLowerCase();
        // 如果还没有这个文件名，或者当前路径更短且不在系统文件夹中（可能是更直接的路径），则使用当前路径
        const isSystemFile = filePath.includes('__MACOSX') || filePath.includes('.DS_Store') || filePath.includes('/._') || filePath.includes('\\._');
        const existingPath = csvFileMap.get(fileName);
        
        if (!existingPath) {
          // 优先选择非系统文件
          if (!isSystemFile) {
            csvFileMap.set(fileName, filePath);
          } else {
            // 如果只有系统文件，也先记录
            csvFileMap.set(fileName, filePath);
          }
        } else {
          // 如果已存在，优先选择非系统文件或更短的路径
          const existingIsSystem = existingPath.includes('__MACOSX') || existingPath.includes('.DS_Store') || existingPath.includes('/._') || existingPath.includes('\\._');
          if (isSystemFile && !existingIsSystem) {
            // 已存在的是非系统文件，当前是系统文件，保持现有的
            continue;
          } else if (!isSystemFile && existingIsSystem) {
            // 当前是非系统文件，已存在的是系统文件，替换
            csvFileMap.set(fileName, filePath);
          } else if (!isSystemFile && !existingIsSystem && filePath.length < existingPath.length) {
            // 都是非系统文件，选择更短的路径
            csvFileMap.set(fileName, filePath);
          }
        }
      }

      const uniqueCsvFiles = Array.from(csvFileMap.values());

      if (uniqueCsvFiles.length > 1) {
        // 显示找到的所有CSV文件（包含完整路径），帮助用户排查问题
        const fileNames = uniqueCsvFiles.map(f => {
          const name = f.replace(/^.*[\\/]/, '');
          const isSystem = f.includes('__MACOSX') || f.includes('.DS_Store') || f.includes('/._') || f.includes('\\._');
          return isSystem ? `${name} (系统文件，已自动忽略)` : name;
        }).join('、');
        throw new Error(`ZIP文件中包含多个不同的CSV文件：${fileNames}，请只保留一个`);
      }

      // 使用第一个（也是唯一的）CSV文件
      const csvFile = zipContent.files[uniqueCsvFiles[0]];
      const csvText = await csvFile.async('string');
      
      setProgress('正在解析CSV文件...');

      // 解析CSV（支持中文表头）
      const parseResult = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
      });

      if (parseResult.errors.length > 0) {
        console.warn('CSV解析警告:', parseResult.errors);
      }

      const csvData = parseResult.data as Array<Record<string, string>>;
      
      if (csvData.length === 0) {
        throw new Error('CSV文件中没有数据行');
      }

      // 创建中文表头到英文字段名的映射
      const headerMap: Record<string, string> = {
        '名称': 'name',
        '类型': 'type',
        '风格': 'style',
        '标签': 'tags',
        '来源': 'source',
        '版本': 'engineVersion',
        '广州NAS路径': 'guangzhouNas',
        '深圳NAS路径': 'shenzhenNas',
        '预览图': 'thumbnail',
        '资源路径': 'src',
        '画廊': 'gallery',
        '预览图和视频': 'previewFiles',
      };

      // 转换CSV数据：将中文表头映射为英文字段名
      const normalizedData = csvData.map((row) => {
        const normalized: Record<string, string> = {};
        Object.keys(row).forEach((key) => {
          const normalizedKey = headerMap[key] || key;
          normalized[normalizedKey] = row[key];
        });
        return normalized;
      });

      setProgress(`找到 ${normalizedData.length} 条资产记录，正在处理...`);

      const pendingAssetsList: PendingAsset[] = [];

      // 处理每条记录，收集待确认的资产
      for (let i = 0; i < normalizedData.length; i++) {
        const row = normalizedData[i];
        setProgress(`正在处理第 ${i + 1}/${normalizedData.length} 条记录...`);

        try {
          // 处理预览图和视频文件（从ZIP中提取并上传）
          // 注意：thumbnail、src、gallery 不再从CSV读取，完全由上传的文件自动生成
          let thumbnailUrl: string | undefined;
          let srcUrl: string | undefined;
          const galleryUrls: string[] = [];
          const uploadedFilesList: Array<{ url: string; originalName: string; type: 'image' | 'video' }> = []; // 保存所有上传的文件

          // 支持的图片和视频扩展名
          const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
          const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];

          // 处理预览图和视频列（previewFiles）
          // 如果用户填写了文件名，使用用户填写的；否则根据资产名称自动搜索匹配的文件
          let filesToProcess: string[] = [];
          
          if (row.previewFiles?.trim()) {
            // 用户显式填写了文件名
            filesToProcess = row.previewFiles.split(',').map((f) => f.trim()).filter(Boolean);
          } else {
            // 自动搜索：根据资产名称在ZIP中查找匹配的文件
            const assetName = row.name?.trim() || '';
            if (assetName) {
              // 在ZIP中搜索文件名包含资产名称的文件
              const allFileNames = Object.keys(zipContent.files);
              
              // ✅ 改进的匹配逻辑：支持多种命名规则
              // 规则1: 资产名称 = "251010_支_034卧龙凤雏_三冰_方"
              // 规则2: 文件名 = "3-251010_支_034卧龙凤雏_三冰_方-image.mp4" 或 "251010_支_034卧龙凤雏_三冰_方-image.png"
              // 规则3: 文件名 = "251010_支_034卧龙凤雏_三冰_方-image2.png"
              // 规则4: 文件名 = "251010_支_034卧龙凤雏_三冰_方.png" (直接匹配)
              
              // 提取资产名称的关键部分（去除可能的前缀数字和分隔符）
              // 例如："3-251010_支_034卧龙凤雏_三冰_方" -> "251010_支_034卧龙凤雏_三冰_方"
              const assetNameKey = assetName.replace(/^\d+[-_]?/, '').toLowerCase().trim();
              
              const matchedFiles = allFileNames.filter((fileName) => {
                if (zipContent.files[fileName].dir) return false;
                const baseName = fileName.replace(/^.*[\\/]/, '').toLowerCase(); // 获取文件名（不含路径）
                const baseNameWithoutExt = baseName.replace(/\.(jpg|jpeg|png|gif|webp|bmp|svg|mp4|webm|mov|avi|mkv)$/i, '');
                
                // 检查是否是图片或视频文件
                const isImage = imageExtensions.some(ext => baseName.endsWith(ext));
                const isVideo = videoExtensions.some(ext => baseName.endsWith(ext));
                if (!isImage && !isVideo) return false;
                
                // 提取文件名关键部分（去除前缀数字、后缀如-image、-image2等）
                // 例如："3-251010_支_034卧龙凤雏_三冰_方-image" -> "251010_支_034卧龙凤雏_三冰_方"
                // 例如："251010_支_034卧龙凤雏_三冰_方-image2" -> "251010_支_034卧龙凤雏_三冰_方"
                let baseNameKey = baseNameWithoutExt
                  .replace(/^\d+[-_]?/, '') // 去除前缀数字
                  .replace(/[-_]?image\d*$/i, '') // 去除 -image、-image2 等后缀
                  .replace(/[-_]?preview\d*$/i, '') // 去除 -preview、-preview2 等后缀
                  .replace(/[-_]?thumb\d*$/i, '') // 去除 -thumb、-thumb2 等后缀
                  .trim();
                
                // 多种匹配策略：
                // 1. 文件名关键部分完全匹配资产名称关键部分
                // 2. 文件名包含资产名称的关键部分
                // 3. 资产名称包含文件名的关键部分
                // 4. 文件名去除扩展名后直接包含资产名称
                const exactMatch = baseNameKey === assetNameKey;
                const nameInFile = baseNameKey.includes(assetNameKey) || baseName.includes(assetNameKey);
                const fileInName = assetNameKey.includes(baseNameKey);
                const directMatch = baseNameWithoutExt.includes(assetNameKey);
                
                return exactMatch || nameInFile || fileInName || directMatch;
              });
              
              if (matchedFiles.length > 0) {
                // 自定义排序：确保没有数字后缀的文件排在前面（如 image.jpg 优先于 image2.jpg）
                matchedFiles.sort((a, b) => {
                  const nameA = a.replace(/^.*[\\/]/, '').toLowerCase();
                  const nameB = b.replace(/^.*[\\/]/, '').toLowerCase();
                  
                  // 提取基础名称（去除扩展名和数字后缀）
                  const baseA = nameA.replace(/\.(jpg|jpeg|png|gif|webp|bmp|svg|mp4|webm|mov|avi|mkv)$/i, '');
                  const baseB = nameB.replace(/\.(jpg|jpeg|png|gif|webp|bmp|svg|mp4|webm|mov|avi|mkv)$/i, '');
                  
                  // 检查是否有数字后缀
                  const matchA = baseA.match(/^(.+?)(\d+)$/);
                  const matchB = baseB.match(/^(.+?)(\d+)$/);
                  
                  const baseNameA = matchA ? matchA[1] : baseA;
                  const baseNameB = matchB ? matchB[1] : baseB;
                  
                  // 如果基础名称相同，没有数字后缀的排在前面
                  if (baseNameA === baseNameB) {
                    if (!matchA && matchB) return -1; // A 没有数字后缀，排在前面
                    if (matchA && !matchB) return 1;  // B 没有数字后缀，排在前面
                    if (matchA && matchB) {
                      // 都有数字后缀，按数字大小排序
                      const numA = parseInt(matchA[2], 10);
                      const numB = parseInt(matchB[2], 10);
                      return numA - numB;
                    }
                  }
                  
                  // 基础名称不同，按字母顺序排序
                  return nameA.localeCompare(nameB, 'zh-CN');
                });
                filesToProcess = matchedFiles;
                setProgress(`为资产 "${assetName}" 自动找到 ${matchedFiles.length} 个匹配文件: ${matchedFiles.join(', ')}`);
              } else {
                // 如果没有找到匹配文件，输出调试信息
                console.warn(`[批量上传] 未找到匹配文件，资产名称: "${assetName}"，ZIP中的文件:`, 
                  allFileNames.filter(f => !zipContent.files[f].dir).slice(0, 10));
              }
            }
          }

          // 处理找到的文件
          if (filesToProcess.length > 0) {
            for (const fileName of filesToProcess) {
              // 在ZIP中查找文件（支持多种路径格式）
              let zipFile = zipContent.files[fileName];
              if (!zipFile) {
                // 尝试去掉前导斜杠
                zipFile = zipContent.files[fileName.replace(/^\/+/, '')];
              }
              if (!zipFile) {
                // 尝试添加前导斜杠
                zipFile = zipContent.files['/' + fileName.replace(/^\/+/, '')];
              }
              
              if (zipFile && !zipFile.dir) {
                setProgress(`正在上传文件: ${fileName}...`);
                setUploadProgressPercent(0);
                try {
                  // 将ZIP中的文件转换为Blob
                  const fileBlob = await zipFile.async('blob');
                  const fileExt = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
                  const isVideo = ['.mp4', '.webm', '.mov', '.avi', '.mkv'].includes(fileExt);
                  
                  // 根据文件扩展名设置正确的MIME类型
                  let mimeType: string;
                  if (isVideo) {
                    if (fileExt === '.webm') mimeType = 'video/webm';
                    else if (fileExt === '.mov') mimeType = 'video/quicktime';
                    else if (fileExt === '.avi') mimeType = 'video/x-msvideo';
                    else if (fileExt === '.mkv') mimeType = 'video/x-matroska';
                    else mimeType = 'video/mp4';
                  } else {
                    // 根据图片扩展名设置正确的MIME类型
                    if (fileExt === '.png') mimeType = 'image/png';
                    else if (fileExt === '.gif') mimeType = 'image/gif';
                    else if (fileExt === '.webp') mimeType = 'image/webp';
                    else if (fileExt === '.bmp') mimeType = 'image/bmp';
                    else if (fileExt === '.svg') mimeType = 'image/svg+xml';
                    else mimeType = 'image/jpeg'; // 默认使用jpeg
                  }
                  
                  const file = new File([fileBlob], fileName, { 
                    type: mimeType
                  });
                  
                  // 使用XMLHttpRequest来跟踪上传进度
                  const formData = new FormData();
                  formData.append('file', file);
                  
                  let uploadData: any;
                  
                  if (storageMode === 'oss') {
                    const metadata = await getLocalMediaMetadata(file);
                    const directResult = await uploadFileDirect(file, {
                      onProgress: (percent) => {
                        setUploadProgressPercent(percent);
                        setProgress(`正在上传文件: ${fileName}... ${percent}%`);
                      },
                    });
                    uploadData = {
                      url: directResult.fileUrl,
                      originalName: fileName,
                      type: isVideo ? 'video' : 'image',
                      size: file.size,
                      width: metadata.width,
                      height: metadata.height,
                      duration: metadata.duration,
                    };
                    setUploadProgressPercent(100);
                    setProgress(`正在上传文件: ${fileName}... 100%`);
                  } else {
                    uploadData = await new Promise<any>((resolve, reject) => {
                      const xhr = new XMLHttpRequest();
                      
                      xhr.upload.addEventListener('progress', (e) => {
                        if (e.lengthComputable) {
                          const percent = Math.round((e.loaded / e.total) * 100);
                          setUploadProgressPercent(percent);
                          setProgress(`正在上传文件: ${fileName}... ${percent}%`);
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
                            const errorData = JSON.parse(xhr.responseText);
                            reject(new Error(errorData.message || `上传失败: HTTP ${xhr.status}`));
                          } catch {
                            reject(new Error(`上传失败: HTTP ${xhr.status}`));
                          }
                        }
                      });
                      
                      xhr.addEventListener('error', () => {
                        reject(new Error('网络错误'));
                      });
                      
                      xhr.open('POST', '/api/upload');
                      xhr.send(formData);
                    });
                  }

                  if (uploadData && uploadData.url) {
                    setUploadProgressPercent(100);
                    const uploadedUrl = uploadData.url;
                    
                    // 调试信息：检查上传返回的URL
                    if (process.env.NODE_ENV === 'development') {
                      console.log(`[批量上传] 文件 ${fileName} 上传成功:`, {
                        uploadedUrl,
                        originalName: fileName,
                        type: isVideo ? 'video' : 'image',
                        uploadData,
                      });
                    }
                    
                    // ✅ 验证文件有效性（仅对图片进行验证，视频暂不验证）
                    if (!isVideo) {
                      // 验证图片是否有效
                      const isValidImage = await new Promise<boolean>((resolve) => {
                        const img = new Image();
                        img.onload = () => {
                          // 检查图片尺寸，如果为0则无效
                          const isValid = img.naturalWidth > 0 && img.naturalHeight > 0;
                          resolve(isValid);
                        };
                        img.onerror = () => {
                          resolve(false);
                        };
                        // 构建完整URL用于验证
                        const cdnBase = window.__CDN_BASE__ || process.env.NEXT_PUBLIC_CDN_BASE || '/';
                        const normalizedBase = cdnBase.replace(/\/+$/, '');
                        const fullUrl = uploadedUrl.startsWith('http')
                          ? uploadedUrl
                          : normalizedBase && normalizedBase !== '/'
                          ? `${normalizedBase}${uploadedUrl}`
                          : uploadedUrl;
                        img.src = fullUrl;
                        // 设置超时，5秒后认为无效
                        setTimeout(() => resolve(false), 5000);
                      });
                      
                      if (!isValidImage) {
                        console.warn(`[批量上传] 文件 ${fileName} 无效（图片损坏或格式不正确），已自动清除`);
                        continue; // 跳过无效文件
                      }
                    }
                    
                    // 保存到已上传文件列表
                    uploadedFilesList.push({
                      url: uploadedUrl,
                      originalName: fileName,
                      type: isVideo ? 'video' : 'image',
                    });
                    
                    if (isVideo) {
                      // 如果是视频，作为src或添加到gallery
                      if (!srcUrl) {
                        srcUrl = uploadedUrl;
                        // 如果没有thumbnail，使用视频URL作为thumbnail（与单个上传逻辑一致）
                        if (!thumbnailUrl) {
                          thumbnailUrl = uploadedUrl;
                        }
                      } else {
                        galleryUrls.push(uploadedUrl);
                      }
                    } else {
                      // 如果是图片，作为thumbnail或添加到gallery
                      if (!thumbnailUrl) {
                        thumbnailUrl = uploadedUrl;
                        // 如果没有src，使用图片URL作为src（与单个上传逻辑一致）
                        if (!srcUrl) {
                          srcUrl = uploadedUrl;
                        }
                      } else {
                        galleryUrls.push(uploadedUrl);
                      }
                    }
                  } else {
                    console.warn(`文件 ${fileName} 上传失败: 未返回 URL`);
                  }
                } catch (err) {
                  console.warn(`处理文件 ${fileName} 时出错:`, err);
                }
              } else {
                console.warn(`ZIP中未找到文件: ${fileName}`);
              }
            }
          }

          // 注意：不再处理gallery列，因为gallery列已从模板中移除
          // 所有文件都通过"预览图和视频"列处理，自动分配到thumbnail、src或gallery

          // 构建资产数据
          // 确保thumbnail和src至少有一个有值（与单个上传逻辑一致）
          // 如果只有视频，使用视频URL作为thumbnail；如果只有图片，使用图片URL作为src
          const finalThumbnail = thumbnailUrl || srcUrl;
          const finalSrc = srcUrl || thumbnailUrl;
          
          // 确保 gallery 包含所有上传的文件，按上传顺序排列
          const allUploadedUrls = uploadedFilesList.map(f => f.url).filter(Boolean);
          const gallerySources = Array.from(
            new Set(
              allUploadedUrls.length > 0 
                ? allUploadedUrls 
                : [finalThumbnail, finalSrc, ...galleryUrls].filter((value): value is string => Boolean(value))
            )
          );
          
          const assetData: any = {
            name: row.name?.trim() || '',
            type: row.type?.trim() || '角色',
            style: row.style?.trim() ? row.style.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
            tags: row.tags?.trim() ? row.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
            source: row.source?.trim() || '',
            engineVersion: row.engineVersion?.trim() || '',
            guangzhouNas: row.guangzhouNas?.trim() || undefined,
            shenzhenNas: row.shenzhenNas?.trim() || undefined,
            thumbnail: finalThumbnail || undefined,
            src: finalSrc || undefined,
            gallery: gallerySources.length > 0 ? gallerySources : undefined,
          };

          // 验证必填字段
          if (!assetData.name) {
            throw new Error('名称不能为空');
          }
          if (!assetData.tags || assetData.tags.length === 0) {
            throw new Error('至少需要一个标签');
          }
          if (!assetData.source) {
            throw new Error('来源不能为空');
          }
          if (!assetData.engineVersion) {
            throw new Error('版本不能为空');
          }
          if (!assetData.guangzhouNas && !assetData.shenzhenNas) {
            throw new Error('广州NAS和深圳NAS至少需要填写一个');
          }

          // 添加到待确认列表（不立即创建）
          pendingAssetsList.push({
            ...assetData,
            _tempId: `temp-${i}-${Date.now()}`,
            _previewImage: finalThumbnail || finalSrc, // 使用最终确定的thumbnail或src
            _uploadedFiles: uploadedFilesList.length > 0 ? uploadedFilesList : undefined, // 保存已上传的文件列表
          });
        } catch (err) {
          // 验证失败的记录也添加到列表，但标记为错误
          pendingAssetsList.push({
            name: row.name?.trim() || `第 ${i + 1} 条记录`,
            type: (row.type?.trim() as any) || '其他',
            tags: [],
            source: '',
            engineVersion: '',
            _tempId: `temp-error-${i}-${Date.now()}`,
            _error: err instanceof Error ? err.message : '未知错误',
          } as any);
        }
      }

      // 显示预览界面
      setPendingAssets(pendingAssetsList);
      setShowPreview(true);
      setProgress(`处理完成！共 ${pendingAssetsList.length} 条记录，请确认后创建资产`);
      setUploadProgressPercent(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : '批量上传失败');
      console.error('批量上传错误:', err);
      setUploadProgressPercent(0);
    } finally {
      setUploading(false);
    }
  }, [onSuccess, storageMode]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleZipUpload(file);
      }
    },
    [handleZipUpload]
  );

  // 删除待确认的资产
  const handleRemovePendingAsset = useCallback((tempId: string) => {
    setPendingAssets((prev) => prev.filter((asset) => asset._tempId !== tempId));
  }, []);

  // 确认创建资产
  const handleConfirmCreate = useCallback(async () => {
    if (pendingAssets.length === 0) {
      setError('没有待创建的资产');
      return;
    }

    // 验证项目是否已选择
    if (!selectedProject) {
      setError('请先选择项目');
      return;
    }

    setCreating(true);
    setError(null);
    setResults([]);
    setUploadProgressPercent(0);

    const uploadResults: Array<{ success: boolean; message: string; assetTempId?: string }> = [];
    let successCount = 0;
    let failCount = 0;

    // 过滤掉有错误的资产
    const validAssets = pendingAssets.filter((asset) => !(asset as any)._error);

    for (let i = 0; i < validAssets.length; i++) {
      const asset = validAssets[i];
      const progressPercent = Math.round(((i + 1) / validAssets.length) * 100);
      setUploadProgressPercent(progressPercent);
      setProgress(`正在创建第 ${i + 1}/${validAssets.length} 个资产: ${asset.name}...`);

      try {
        // 移除临时字段，但保留_previewImage作为thumbnail（如果thumbnail为空）
        const { _tempId, _previewImage, _error, ...assetData } = asset as any;
        
        // 添加项目字段
        assetData.project = selectedProject;
        
        // 确保thumbnail和src至少有一个有值（与单个上传逻辑一致）
        // 如果thumbnail为空，使用_previewImage或src
        if (!assetData.thumbnail) {
          assetData.thumbnail = _previewImage || assetData.src;
        }
        // 如果src为空，使用thumbnail
        if (!assetData.src) {
          assetData.src = assetData.thumbnail;
        }
        // 如果两者都为空，使用_previewImage
        if (!assetData.thumbnail && !assetData.src && _previewImage) {
          assetData.thumbnail = _previewImage;
          assetData.src = _previewImage;
        }
        
        // 调试信息（开发环境）
        if (process.env.NODE_ENV === 'development') {
          console.log(`[批量上传调试] 创建资产 "${asset.name}":`, {
            thumbnail: assetData.thumbnail,
            src: assetData.src,
            _previewImage,
            '原始asset.thumbnail': asset.thumbnail,
            '原始asset.src': asset.src,
            project: assetData.project,
          });
        }

        const response = await fetch('/api/assets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(assetData),
        });

        if (!response.ok) {
          let errorMessage = `创建资产失败 (HTTP ${response.status})`;
          try {
            const errorData = await response.json();
            // 提取详细的验证错误信息
            errorMessage = errorData.message || errorMessage;
            if (errorData.errors) {
              const fieldErrors: string[] = [];
              if (errorData.errors.fieldErrors) {
                Object.entries(errorData.errors.fieldErrors).forEach(([field, errors]) => {
                  const fieldName = field === 'guangzhouNas' ? '广州NAS路径' : 
                                   field === 'shenzhenNas' ? '深圳NAS路径' :
                                   field === 'engineVersion' ? '版本' :
                                   field === 'source' ? '来源' :
                                   field === 'tags' ? '标签' :
                                   field === 'name' ? '名称' :
                                   field === 'type' ? '类型' : field;
                  const errorList = Array.isArray(errors) ? errors : [errors];
                  let errorMsg = errorList.join(', ');
                  
                  // 如果是类型错误，添加允许的类型列表提示
                  if (field === 'type' && errorMsg.includes('Invalid enum value')) {
                    const typesList = allowedTypes.length > 0 ? allowedTypes : ['角色', '场景', '动画', '特效', '材质', '蓝图', 'UI', '合成', '音频', '其他'];
                    errorMsg = `类型不在允许列表中。允许的类型：${typesList.join('、')}`;
                  }
                  
                  fieldErrors.push(`${fieldName}: ${errorMsg}`);
                });
              }
              if (errorData.errors.formErrors && errorData.errors.formErrors.length > 0) {
                fieldErrors.push(...errorData.errors.formErrors);
              }
              if (fieldErrors.length > 0) {
                errorMessage = fieldErrors.join('; ');
              }
            }
          } catch (parseError) {
            // 如果无法解析错误响应，使用默认错误信息
            console.error('解析错误响应失败:', parseError);
            errorMessage = `服务器错误 (HTTP ${response.status})，请检查控制台获取详细信息`;
          }
          throw new Error(errorMessage);
        }

        uploadResults.push({
          success: true,
          message: `✓ 成功创建: ${asset.name}`,
        });
        successCount++;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '未知错误';
        
        // 检测是否是类型错误
        const isTypeError = errorMessage.includes('类型') && (
          errorMessage.includes('Invalid enum value') || 
          errorMessage.includes('不在允许列表中')
        );
        
        // 如果是类型错误，提取无效的类型值
        let invalidType: string | undefined;
        if (isTypeError && asset.type) {
          const typesList = allowedTypes.length > 0 ? allowedTypes : ['角色', '场景', '动画', '特效', '材质', '蓝图', 'UI', '合成', '音频', '其他'];
          if (!typesList.includes(asset.type)) {
            invalidType = asset.type;
          }
        }
        
        // 标记资产为失败，保存错误信息和无效类型
        const failedAsset = { 
          ...asset, 
          _createError: errorMessage,
          _invalidType: invalidType, // 保存无效的类型值
        };
        setPendingAssets((prev) => 
          prev.map((a) => a._tempId === asset._tempId ? failedAsset : a)
        );
        
        uploadResults.push({
          success: false,
          message: `✗ 失败: ${asset.name} - ${errorMessage}`,
          assetTempId: asset._tempId, // 保存临时ID，用于编辑
        });
        failCount++;
      }
    }

    // 添加有错误的资产到结果中
    pendingAssets.forEach((asset) => {
      if ((asset as any)._error) {
        uploadResults.push({
          success: false,
          message: `✗ 验证失败: ${asset.name} - ${(asset as any)._error}`,
        });
        failCount++;
      }
    });

    setResults(uploadResults);
    setProgress(`创建完成！成功: ${successCount}, 失败: ${failCount}`);
    setUploadProgressPercent(100);

    // 如果全部成功或部分成功，刷新资产列表
    if (successCount > 0) {
      if (onSuccess) {
        onSuccess();
      }
    }

        // 设置创建完成状态
        setCreating(false);
        
        // ✅ 修复：只有在全部成功时才自动关闭，否则保持对话框打开
        if (failCount > 0) {
          // 有失败的情况，显示错误提示并保持对话框打开
          setError(`创建完成，但有 ${failCount} 个资产创建失败（成功 ${successCount} 个）。请查看下方错误信息并编辑后重试。`);
          // 保持预览界面打开，让用户查看结果和编辑失败的资产
          return;
        }
        
        // 只有全部成功时才自动关闭
        if (successCount > 0 && failCount === 0) {
          // 全部成功，延迟关闭对话框，让用户看到成功消息
          setTimeout(() => {
            setShowPreview(false);
            setPendingAssets([]);
            setError(null);
            onOpenChange(false);
          }, 2000);
        } else if (successCount === 0) {
          // 如果所有资产都失败，显示错误并保持对话框打开
          setError('所有资产创建都失败了，请检查错误信息并编辑后重试。');
        }
  }, [pendingAssets, onSuccess, onOpenChange, allowedTypes]);

  // 重置状态
  const handleReset = useCallback(() => {
    setPendingAssets([]);
    setShowPreview(false);
    setResults([]);
    setError(null);
    setProgress('');
    setUploadProgressPercent(0);
    setEditingAsset(null);
    setSelectedProject('');
  }, []);

  // 保存编辑后的资产
  const handleSaveEdit = useCallback((editedAsset: PendingAsset) => {
    setPendingAssets((prev) =>
      prev.map((a) => 
        a._tempId === editedAsset._tempId 
          ? { ...editedAsset, _error: undefined, _createError: undefined }
          : a
      )
    );
    setEditingAsset(null);
  }, []);

  // 获取客户端URL（用于显示预览图）- 与admin-dashboard保持一致
  const getClientUrl = useCallback((url?: string) => {
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

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) {
        handleReset();
      }
      onOpenChange(newOpen);
    }}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>批量上传资产</DialogTitle>
          <DialogDescription>
            {showPreview 
              ? `预览待创建的资产（${pendingAssets.length} 条），确认后批量创建`
              : '上传包含CSV文件和资源文件的ZIP压缩包，系统将自动解析并创建资产'}
          </DialogDescription>
        </DialogHeader>

        {/* 显示全局错误信息 */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-700 dark:text-red-300">
            <strong>错误：</strong>{error}
          </div>
        )}

        {showPreview ? (
          // 预览确认界面
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                共 {pendingAssets.length} 条资产待创建
              </div>
              <Button variant="outline" size="sm" onClick={handleReset} disabled={creating}>
                <X className="h-4 w-4 mr-2" />
                返回
              </Button>
            </div>

            {/* 资产预览列表 */}
            <div className="max-h-[50vh] overflow-y-auto space-y-2 border rounded-lg p-4">
              {pendingAssets.map((asset) => {
                const hasError = !!(asset as any)._error;
                const hasCreateError = !!(asset as any)._createError;
                return (
                  <div
                    key={asset._tempId}
                    className={`p-3 border rounded-lg ${
                      hasError || hasCreateError
                        ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' 
                        : 'bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* 预览图 */}
                      {asset._previewImage && !hasError && !hasCreateError && (
                        <img
                          src={getClientUrl(asset._previewImage)}
                          alt={asset.name}
                          className="w-16 h-16 object-cover rounded border"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      
                      {/* 资产信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium truncate">{asset.name}</div>
                          <div className="flex gap-1">
                            {(hasError || hasCreateError) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingAsset(asset)}
                                disabled={creating}
                                className="h-6 w-6 p-0"
                                title="编辑"
                              >
                                <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              </Button>
                            )}
                            {!hasError && !hasCreateError && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemovePendingAsset(asset._tempId!)}
                                disabled={creating}
                                className="h-6 w-6 p-0"
                                title="删除"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 space-y-1">
                          <div>类型: {asset.type}</div>
                          <div>标签: {asset.tags?.join(', ') || '无'}</div>
                          {asset.source && <div>来源: {asset.source}</div>}
                          {asset.engineVersion && <div>版本: {asset.engineVersion}</div>}
                          {(hasError || hasCreateError) && (
                            <div className="text-red-600 dark:text-red-400 font-medium mt-2">
                              错误: {(asset as any)._error || (asset as any)._createError}
                            </div>
                          )}
                        </div>
                        
                        {/* ✅ 已上传文件列表（类似单个上传的界面） */}
                        {!hasError && !hasCreateError && asset._uploadedFiles && asset._uploadedFiles.length > 0 && (
                          <div className="mt-3 space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">
                              已上传文件 ({asset._uploadedFiles.length})
                            </label>
                            <div className="grid grid-cols-3 gap-1">
                              {asset._uploadedFiles.map((file, fileIndex) => {
                                const isSelected = asset.thumbnail === file.url || asset.src === file.url;
                                return (
                                  <div
                                    key={fileIndex}
                                    className={`relative group border rounded overflow-hidden cursor-pointer ${
                                      isSelected ? 'border-primary ring-2 ring-primary' : 'border-border'
                                    }`}
                                  >
                                    <div className="aspect-video relative bg-muted">
                                      {file.type === 'image' ? (
                                        <img
                                          src={getClientUrl(file.url)}
                                          alt={file.originalName}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                          }}
                                        />
                                      ) : (
                                        <video
                                          src={getClientUrl(file.url)}
                                          className="w-full h-full object-cover"
                                          muted
                                          playsInline
                                        />
                                      )}
                                      {isSelected && (
                                        <div className="absolute top-0 left-0 bg-primary text-primary-foreground px-1 py-0.5 text-xs">
                                          预览图
                                        </div>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        // 设置为预览图
                                        setPendingAssets((prev) =>
                                          prev.map((a) =>
                                            a._tempId === asset._tempId
                                              ? {
                                                  ...a,
                                                  thumbnail: file.url,
                                                  _previewImage: file.url,
                                                }
                                              : a
                                          )
                                        );
                                      }}
                                      className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
                                      title="设为预览图"
                                    >
                                      <Star className="h-4 w-4 text-white" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 创建结果 */}
            {results.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">创建结果</h3>
                <div className="max-h-40 overflow-y-auto space-y-1 border rounded-lg p-3">
                  {results.map((result, index) => (
                    <div
                      key={index}
                      className={`text-xs p-2 rounded ${
                        result.success
                          ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300'
                          : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300'
                      }`}
                    >
                      {result.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 操作按钮 */}
            {/* 项目选择 */}
            <div className="space-y-2 border-t pt-4">
              <Label htmlFor="batch-project-select" className="text-sm font-medium">
                选择项目 <span className="text-red-500">*</span>
              </Label>
              <select
                id="batch-project-select"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                disabled={creating}
                required
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">请选择项目</option>
                {PROJECTS.map((project) => (
                  <option key={project} value={project}>
                    {project}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleReset} disabled={creating}>
                取消
              </Button>
              <Button 
                onClick={handleConfirmCreate} 
                disabled={creating || pendingAssets.length === 0 || pendingAssets.every(a => !!(a as any)._error) || !selectedProject}
                className="relative"
              >
                {creating ? (
                  <>
                    <Upload className="h-4 w-4 mr-2 animate-spin" />
                    <span className="mr-2">{progress || '创建中...'}</span>
                    {uploadProgressPercent > 0 && (
                      <span className="text-xs opacity-75">{uploadProgressPercent}%</span>
                    )}
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    确认创建 ({pendingAssets.filter(a => !(a as any)._error).length} 个)
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          // 上传界面
          <div className="space-y-4">
          {/* 下载模板 */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="text-sm font-semibold mb-1">CSV模板</h3>
              <p className="text-sm text-muted-foreground">
                下载CSV模板，填写资产信息后与资源文件一起打包成ZIP上传。
                <br />
                <span className="text-xs">提示：如果文件名与资产名称匹配，可不在CSV中填写"预览图和视频"列，系统会自动搜索匹配的文件。</span>
              </p>
            </div>
            <Button variant="outline" onClick={downloadCSVTemplate}>
              <Download className="h-4 w-4 mr-2" />
              下载模板
            </Button>
          </div>

          {/* 上传区域 */}
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".zip"
              onChange={handleFileSelect}
              className="hidden"
              id="batch-upload-zip"
              disabled={uploading}
            />
            <label
              htmlFor="batch-upload-zip"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <FileArchive className="h-8 w-8 text-muted-foreground" />
              <div className="text-sm text-muted-foreground w-full">
                {uploading ? (
                  <div className="space-y-2 w-full">
                    <div className="text-center">{progress || '上传中...'}</div>
                    {uploadProgressPercent > 0 && (
                      <div className="w-full rounded-full h-2 bg-muted">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgressPercent}%` }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    点击或拖拽ZIP文件到此处上传
                    <br />
                    <span className="text-xs">ZIP文件应包含一个CSV文件和相关资源文件</span>
                  </>
                )}
              </div>
            </label>
          </div>

          {/* 错误信息 */}
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              {error}
            </div>
          )}

          {/* 处理结果 */}
          {results.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">处理结果</h3>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`p-2 rounded text-xs ${
                      result.success
                        ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300'
                        : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300'
                    }`}
                  >
                    {result.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
              关闭
            </Button>
          </div>
          </div>
        )}
      </DialogContent>

      {/* 编辑资产对话框 */}
      {editingAsset && (
        <EditAssetDialog
          asset={editingAsset}
          allowedTypes={allowedTypes.length > 0 ? allowedTypes : ['角色', '场景', '动画', '特效', '材质', '蓝图', 'UI', '合成', '音频', '其他']}
          onSave={handleSaveEdit}
          onCancel={() => setEditingAsset(null)}
        />
      )}
    </Dialog>
  );
}

// 编辑资产对话框组件
function EditAssetDialog({
  asset,
  allowedTypes,
  onSave,
  onCancel,
}: {
  asset: PendingAsset;
  allowedTypes: string[];
  onSave: (asset: PendingAsset) => void;
  onCancel: () => void;
}) {
  const ASSET_TYPES = allowedTypes as readonly string[];
  const STYLE_SUGGESTIONS = ['写实', '二次元', '卡通', '国风', '欧式', '科幻', '写意', '低多边形', '像素', '日系', '欧美', '写实PBR'];
  const SOURCE_SUGGESTIONS = ['内部', '外部', '网络'];
  const VERSION_SUGGESTIONS = ['UE5.6', 'UE5.5', 'UE5.4', 'UE5.3', 'UE4.3'];

  // 如果类型无效，默认设置为"其他"
  const initialType = (asset as any)._invalidType 
    ? '其他' 
    : (asset.type && ASSET_TYPES.includes(asset.type as any))
      ? asset.type
      : '其他';

  const [formData, setFormData] = useState({
    name: asset.name || '',
    type: initialType,
    style: Array.isArray(asset.style) ? asset.style.join(',') : asset.style || '',
    tags: asset.tags?.join(',') || '',
    source: asset.source || '',
    engineVersion: asset.engineVersion || '',
    guangzhouNas: asset.guangzhouNas || '',
    shenzhenNas: asset.shenzhenNas || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const styleValue = formData.style.trim() 
      ? formData.style.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;
    const style = styleValue && styleValue.length === 1 
      ? styleValue[0] 
      : styleValue && styleValue.length > 1 
        ? styleValue 
        : undefined;

    const editedAsset: PendingAsset = {
      ...asset,
      name: formData.name.trim(),
      type: formData.type as any,
      style: style,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      source: formData.source.trim(),
      engineVersion: formData.engineVersion.trim(),
      guangzhouNas: formData.guangzhouNas.trim() || undefined,
      shenzhenNas: formData.shenzhenNas.trim() || undefined,
    };

    onSave(editedAsset);
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>编辑资产: {asset.name}</DialogTitle>
          <DialogDescription>
            修改资产信息后保存，可以重新尝试创建
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>名称 <span className="text-red-500">*</span></Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>类型 <span className="text-red-500">*</span></Label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className={`w-full px-3 py-2 border rounded-md ${
                  (asset as any)._invalidType ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950' : ''
                }`}
                required
              >
                {ASSET_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {(asset as any)._invalidType && (
                <div className="text-xs text-yellow-700 dark:text-yellow-300">
                  原类型 "{(asset as any)._invalidType}" 无效，已自动设置为"其他"。请选择正确的类型。
                </div>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>风格（逗号分隔）</Label>
              <Input
                value={formData.style}
                onChange={(e) => setFormData({ ...formData, style: e.target.value })}
                placeholder="写实,二次元"
                list="style-suggestions"
              />
              <datalist id="style-suggestions">
                {STYLE_SUGGESTIONS.map((style) => (
                  <option key={style} value={style} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>标签（逗号分隔，至少1个）<span className="text-red-500">*</span></Label>
              <Input
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="自然, 风景, 建筑"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>来源 <span className="text-red-500">*</span></Label>
              <Input
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                placeholder="内部"
                list="source-suggestions"
                required
              />
              <datalist id="source-suggestions">
                {SOURCE_SUGGESTIONS.map((source) => (
                  <option key={source} value={source} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2">
              <Label>版本 <span className="text-red-500">*</span></Label>
              <Input
                value={formData.engineVersion}
                onChange={(e) => setFormData({ ...formData, engineVersion: e.target.value })}
                placeholder="UE5.5"
                list="version-suggestions"
                required
              />
              <datalist id="version-suggestions">
                {VERSION_SUGGESTIONS.map((version) => (
                  <option key={version} value={version} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2">
              <Label>广州NAS路径</Label>
              <Input
                value={formData.guangzhouNas}
                onChange={(e) => setFormData({ ...formData, guangzhouNas: e.target.value })}
                placeholder="/nas/guangzhou/..."
              />
            </div>

            <div className="space-y-2">
              <Label>深圳NAS路径</Label>
              <Input
                value={formData.shenzhenNas}
                onChange={(e) => setFormData({ ...formData, shenzhenNas: e.target.value })}
                placeholder="/nas/shenzhen/..."
              />
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            <span className="text-red-500">*</span> 广州NAS和深圳NAS至少需要填写一个
          </div>

          {(asset as any)._error || (asset as any)._createError ? (
            <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
              <div className="font-medium mb-1">错误信息：</div>
              <div className="mb-2">{(asset as any)._error || (asset as any)._createError}</div>
              {(asset as any)._invalidType && (
                <div className="mt-2 pt-2 border-t border-red-300 dark:border-red-700">
                  <div className="font-medium mb-1">类型提示：</div>
                  <div className="text-xs mb-2">
                    检测到无效类型 "<span className="font-mono">{(asset as any)._invalidType}</span>"。
                    <br />
                    允许的类型：角色、场景、动画、特效、材质、蓝图、UI、合成、音频、其他
                    <br />
                    <span className="text-yellow-700 dark:text-yellow-300">
                      提示：请在下方选择正确的类型，或联系管理员添加新类型。
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              取消
            </Button>
            <Button type="submit">
              保存
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

