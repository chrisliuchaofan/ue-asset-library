"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  VideoLibraryItem,
  SimilarityResult,
  ComparisonResult,
  extractVideoFeatures,
  extractVideoFeaturesFromUrl,
  checkVideoDuplication,
  compareVideos,
  compareTwoVideosDirectly,
  getVideoProxyUrl,
  getLocalVideoUrl, // 新增
  hasMeaningfulVideoFeatures,
  computeCoverFingerprint,
  computeFingerprintsFromImages,
  computeAHashCoverFingerprint,
  computeAHashFromImages,
  querySimilarByFingerprint,
  extractFrameAtTime,
  parseTimeRangeToSeconds,
  type VideoFeatures
} from '@/lib/deduplication/videoDeduplicationService';
import { parseVideoLibraryExcel, exportVideoLibraryToExcel } from '@/lib/deduplication/excelService';
import {
  listDeduplicationProjects,
  getDeduplicationLibrary,
  upsertDeduplicationLibrary,
  clearDeduplicationLibrary as clearDeduplicationLibraryApi,
  createDeduplicationProject,
  updateDeduplicationProject,
  type DeduplicationProject,
} from '@/lib/deduplication/deduplicationSupabaseService';
import {
  Search, Loader2, Upload, FileSpreadsheet,
  AlertCircle, CheckCircle2, Info, X,
  Play, Trash2, Plus, Download, Video as VideoIcon,
  Eye, EyeOff, Square, RefreshCw, ChevronDown, ChevronUp, Sparkles
} from 'lucide-react';
import { extractErrorMessage } from '@/lib/deduplication/aiService';
import { Dropzone } from '@/components/Dropzone';
import { BreakdownBoard } from './components/BreakdownBoard';
import { PageHeader } from '@/components/page-header';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CompetitorVideoAnalysis } from '@/components/analysis/CompetitorVideoAnalysis';

const LOCAL_PROJECT_ID = '__local__';
/** 同步到数据组时只保存消耗前 N 条 */
const DATA_GROUP_TOP_COUNT = 100;
/** 深度对比「发两段视频给 AI」时单文件大小上限；4MB/文件使双视频总请求体<10MB，避免 API 400 */
const MAX_VIDEO_SIZE_FOR_DIRECT = 4 * 1024 * 1024;

/** 按项目缓存的库数据（模块级，组件卸载/重新进入去重页后仍保留，避免每次点击或进入都请求数据库） */
const libraryCache: Record<string, VideoLibraryItem[]> = {};

/** 将可播视频 URL 转为 File（用于深度对比发两段视频给 AI） */
async function fetchUrlToVideoFile(url: string, filename: string): Promise<File | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type || 'video/mp4' });
  } catch {
    return null;
  }
}

/** 候选行缩略图：优先可播放视频（本地流 / 远程代理），再封面图。相似检索区需视频可播放 */
function CandidateThumbnail({ item, fill }: { item: VideoLibraryItem; fill?: boolean }) {
  const [localStreamUrl, setLocalStreamUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState(false);
  const title = item.title ?? item.previewUrl?.replace(/^local:/, '') ?? '';
  useEffect(() => {
    if (!item.previewUrl?.startsWith('local:') || !title) return;
    getLocalVideoUrl(title).then((url) => url && setLocalStreamUrl(url));
  }, [item.previewUrl, title]);
  useEffect(() => {
    setVideoError(false);
  }, [item.id, item.previewUrl]);
  // 本地流用绝对 URL，避免基路径或 iframe 下相对路径失效
  const resolvedLocalSrc =
    localStreamUrl && localStreamUrl.startsWith('/') && typeof window !== 'undefined'
      ? `${window.location.origin}${localStreamUrl}`
      : localStreamUrl;
  const thumbClass = fill ? 'w-full h-full rounded object-cover bg-muted/50' : 'w-14 h-14 rounded object-cover shrink-0 bg-muted/50';
  // 优先可播放视频：本地流（带 controls 便于点击播放）
  if (resolvedLocalSrc && !videoError) {
    return (
      <video
        src={resolvedLocalSrc}
        preload="auto"
        muted
        playsInline
        controls
        className={thumbClass}
        onError={() => setVideoError(true)}
      />
    );
  }
  // 远程 URL：用代理 URL 播放
  if (
    item.previewUrl &&
    !item.previewUrl.startsWith('local:') &&
    !item.previewUrl.startsWith('blob:') &&
    !item.previewUrl.startsWith('data:') &&
    !videoError
  ) {
    return (
      <video
        src={getVideoProxyUrl(item.previewUrl)}
        preload="auto"
        muted
        playsInline
        controls
        crossOrigin="anonymous"
        className={thumbClass}
        onError={() => setVideoError(true)}
      />
    );
  }
  // 降级：封面图
  if (item.coverUrl) {
    return (
      <img
        src={item.coverUrl}
        alt=""
        className={thumbClass}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }
  if (item.features?.coverImage) {
    const src = item.features.coverImage.startsWith('data:') ? item.features.coverImage : `data:image/jpeg;base64,${item.features.coverImage}`;
    return <img src={src} alt="" className={thumbClass} />;
  }
  return (
    <div className={fill ? 'w-full h-full rounded bg-muted/50 flex items-center justify-center' : 'w-14 h-14 rounded bg-muted/50 shrink-0 flex items-center justify-center'}>
      <VideoIcon className={fill ? 'h-8 w-8 text-muted-foreground' : 'h-6 w-6 text-muted-foreground'} />
    </div>
  );
}

/** 本地创量缩略图：解析 local: 为流 URL 后显示视频预览 */
function LocalVideoThumbnail({ video }: { video: VideoLibraryItem }) {
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const title = video.title ?? video.previewUrl?.replace(/^local:/, '') ?? '';
  useEffect(() => {
    if (!title) return;
    getLocalVideoUrl(title).then((url) => url && setStreamUrl(url));
  }, [title]);
  if (!streamUrl) {
    return (
      <div className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none">
        <VideoIcon className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }
  return (
    <>
      <div className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none">
        <VideoIcon className="h-8 w-8 text-muted-foreground" />
      </div>
      <video
        src={streamUrl}
        preload="metadata"
        muted
        playsInline
        loop
        className="relative w-full h-full object-cover"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    </>
  );
}

interface DeduplicationPageProps {
  dbStatus?: 'online' | 'offline' | 'checking';
}

type TabType = 'breakdown' | 'check' | 'compare' | 'library' | 'competitor';

export default function DeduplicationPage({ dbStatus = 'online' }: DeduplicationPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>('breakdown');

  // 文件输入引用
  const excelInputRef2 = useRef<HTMLInputElement>(null);
  const addFolderInputRef = useRef<HTMLInputElement>(null);

  // 视频库
  const [videoLibrary, setVideoLibrary] = useState<VideoLibraryItem[]>([]);
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  // 方案A：项目选择（null/__local__ = 本地库，其他 = Supabase 项目 id）
  const [currentProjectId, setCurrentProjectId] = useState<string>(LOCAL_PROJECT_ID);
  const [supabaseProjects, setSupabaseProjects] = useState<DeduplicationProject[]>([]);

  // 查重功能
  const [checkVideoFile, setCheckVideoFile] = useState<File | null>(null);
  const [checkVideoPreviewUrl, setCheckVideoPreviewUrl] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [checkProgress, setCheckProgress] = useState({ current: 0, total: 0 });
  const [checkResults, setCheckResults] = useState<SimilarityResult[]>([]);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [checkAbortController, setCheckAbortController] = useState<AbortController | null>(null);
  const [checkSimilarCandidates, setCheckSimilarCandidates] = useState<Array<{ item: VideoLibraryItem; similarity: number }> | null>(null);
  const [checkSelectedIds, setCheckSelectedIds] = useState<Set<string>>(new Set());
  const [checkTargetFeatures, setCheckTargetFeatures] = useState<VideoFeatures | null>(null);
  const [isSimilarSearching, setIsSimilarSearching] = useState(false);

  // 1v1对比功能
  const [compareVideo1, setCompareVideo1] = useState<{ file?: File; url?: string; title?: string; features?: any } | null>(null);
  const [compareVideo2, setCompareVideo2] = useState<{ file?: File; url?: string; title?: string; features?: any } | null>(null);
  const [previewUrl1, setPreviewUrl1] = useState<string | null>(null);
  const [previewUrl2, setPreviewUrl2] = useState<string | null>(null);
  const [preCompressed1, setPreCompressed1] = useState<File | null>(null);
  const [preCompressed2, setPreCompressed2] = useState<File | null>(null);
  const [preCompressProgress1, setPreCompressProgress1] = useState<number | null>(null);
  const [preCompressProgress2, setPreCompressProgress2] = useState<number | null>(null);
  const [videoDuration1, setVideoDuration1] = useState<number | null>(null);
  const [videoDuration2, setVideoDuration2] = useState<number | null>(null);
  const preCompressPromise1Ref = useRef<Promise<File> | null>(null);
  const preCompressPromise2Ref = useRef<Promise<File> | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [compressProgress, setCompressProgress] = useState<number | null>(null);
  const [compareStep, setCompareStep] = useState<string | null>(null);
  const [compareResult, setCompareResult] = useState<ComparisonResult | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);
  /** 报告完成后视频选择区域是否展开，默认收起让报告完整展示 */
  const [showCompareVideosExpanded, setShowCompareVideosExpanded] = useState(true);
  /** 相同帧对比图（sharedSegments 对应提取的帧） */
  const [sharedSegmentFrames, setSharedSegmentFrames] = useState<Array<{ frameA: string; frameB: string; description: string } | { error: string } | null>>([]);

  // 视频库管理
  const [showAddVideoModal, setShowAddVideoModal] = useState(false);
  const [selectedFolderFiles, setSelectedFolderFiles] = useState<File[]>([]);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [editProjectName, setEditProjectName] = useState('');
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [isRefreshingFingerprints, setIsRefreshingFingerprints] = useState(false);
  /** 生成指纹进度：{ current, total }，仅在有进度时存在 */
  const [fingerprintProgress, setFingerprintProgress] = useState<{ current: number; total: number } | null>(null);
  /** 从服务器刷新库数据（分页拉取，更新缓存） */
  const [isRefreshingLibrary, setIsRefreshingLibrary] = useState(false);
  /** 是否展开「取样与对比逻辑」说明 */

  // 视频播放
  const [playingVideo, setPlayingVideo] = useState<VideoLibraryItem | null>(null);
  /** 播放弹窗中实际使用的视频 URL（local: 会解析为本地流） */
  const [playingVideoResolvedUrl, setPlayingVideoResolvedUrl] = useState<string | null>(null);

  // 播放弹窗打开时解析 local: 为本地流 URL
  useEffect(() => {
    if (!playingVideo) {
      setPlayingVideoResolvedUrl(null);
      return;
    }
    if (playingVideo.previewUrl?.startsWith('local:')) {
      const title = playingVideo.title ?? playingVideo.previewUrl.replace(/^local:/, '');
      getLocalVideoUrl(title).then((url) => setPlayingVideoResolvedUrl(url ?? ''));
    } else {
      setPlayingVideoResolvedUrl(getVideoProxyUrl(playingVideo.previewUrl));
    }
  }, [playingVideo?.id, playingVideo?.previewUrl, playingVideo?.title]);

  // 查重页：上传视频的预览 URL（blob），随 checkVideoFile 更新并清理；清空时重置相似检索
  useEffect(() => {
    if (!checkVideoFile) {
      if (checkVideoPreviewUrl) URL.revokeObjectURL(checkVideoPreviewUrl);
      setCheckVideoPreviewUrl(null);
      setCheckSimilarCandidates(null);
      setCheckSelectedIds(new Set());
      setCheckTargetFeatures(null);
      return;
    }
    const url = URL.createObjectURL(checkVideoFile);
    setCheckVideoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [checkVideoFile]);

  // 存储错误状态
  const [storageError, setStorageError] = useState<string | null>(null);

  // 拉取 Supabase 项目列表（表可能尚未创建，忽略错误）
  useEffect(() => {
    let cancelled = false;

    const loadProjects = async () => {
      try {
        const response = await fetch('/api/analysis/projects', { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const payload = await response.json();
        const projects = Array.isArray(payload.projects) ? payload.projects as DeduplicationProject[] : [];

        if (cancelled) return;

        setSupabaseProjects(projects);
        // 默认选中「三冰」；若无则选第一个数据组
        if (projects.length > 0 && currentProjectId === LOCAL_PROJECT_ID) {
          const sanbing = projects.find((p) => p.name === '三冰');
          setCurrentProjectId(sanbing ? sanbing.id : projects[0].id);
        }
      } catch {
        if (!cancelled) setSupabaseProjects([]);
      }
    };

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, []);

  // 根据当前项目加载视频库：本地库从 localStorage；Supabase 项目先读缓存再拉取（避免每次全量拉取）
  useEffect(() => {
    if (currentProjectId === LOCAL_PROJECT_ID) {
      libraryCache[LOCAL_PROJECT_ID] = [];
      try {
        const saved = localStorage.getItem('video_deduplication_library');
        if (saved) {
          const library = JSON.parse(saved);
          setVideoLibrary(library);
        } else {
          setVideoLibrary([]);
        }
        setStorageError(null);
      } catch (e: unknown) {
        console.error('加载本地视频库失败:', e);
        setVideoLibrary([]);
        setStorageError(e instanceof Error && e.name === 'QuotaExceededError' ? '存储空间不足' : '加载失败');
      }
      setLibraryLoaded(true);
      return;
    }
    // 有缓存则直接用，不再自动全量拉取（避免每次切换都超时）；需最新数据时点「刷新库」
    const cached = libraryCache[currentProjectId];
    if (currentProjectId in libraryCache) {
      setVideoLibrary(cached ?? []);
      setStorageError(null);
      setLibraryLoaded(true);
      return;
    }
    setVideoLibrary([]);
    setLibraryLoaded(true);
    getDeduplicationLibrary(currentProjectId)
      .then((data) => {
        setVideoLibrary(data);
        libraryCache[currentProjectId] = data;
        setStorageError(null);
      })
      .catch((e) => {
        console.error('加载项目视频库失败:', e);
        if (!libraryCache[currentProjectId]?.length) setVideoLibrary([]);
        setStorageError(extractErrorMessage(e));
      });
  }, [currentProjectId]);

  // 1v1 对比：视频 A/B 选择成功后生成预览 URL（上传用 blob，库内 local: 用 getLocalVideoUrl，远程用代理）
  useEffect(() => {
    if (compareVideo1?.file) {
      const url = URL.createObjectURL(compareVideo1.file);
      setPreviewUrl1(url);
      return () => URL.revokeObjectURL(url);
    }
    if (compareVideo1?.url) {
      if (compareVideo1.url.startsWith('local:')) {
        let cancelled = false;
        const title = compareVideo1.title ?? compareVideo1.url.replace(/^local:/, '');
        getLocalVideoUrl(title).then((resolved) => {
          if (!cancelled && resolved) setPreviewUrl1(resolved);
          else if (!cancelled) setPreviewUrl1(null);
        });
        return () => { cancelled = true; };
      }
      setPreviewUrl1(getVideoProxyUrl(compareVideo1.url));
      return () => { };
    }
    setPreviewUrl1(null);
    return () => { };
  }, [compareVideo1?.file, compareVideo1?.url, compareVideo1?.title]);

  useEffect(() => {
    if (compareVideo2?.file) {
      const url = URL.createObjectURL(compareVideo2.file);
      setPreviewUrl2(url);
      return () => URL.revokeObjectURL(url);
    }
    if (compareVideo2?.url) {
      if (compareVideo2.url.startsWith('local:')) {
        let cancelled = false;
        const title = compareVideo2.title ?? compareVideo2.url.replace(/^local:/, '');
        getLocalVideoUrl(title).then((resolved) => {
          if (!cancelled && resolved) setPreviewUrl2(resolved);
          else if (!cancelled) setPreviewUrl2(null);
        });
        return () => { cancelled = true; };
      }
      setPreviewUrl2(getVideoProxyUrl(compareVideo2.url));
      return () => { };
    }
    setPreviewUrl2(null);
    return () => { };
  }, [compareVideo2?.file, compareVideo2?.url, compareVideo2?.title]);

  // 视频清空或切换为库内选择时清理预压缩相关 state（1v1 已不压缩，仅保持 state 定义避免 HMR 报错）
  useEffect(() => {
    if (!compareVideo1 || !compareVideo1.file) {
      setPreCompressed1(null);
      setPreCompressProgress1(null);
      setVideoDuration1(null);
      preCompressPromise1Ref.current = null;
    }
  }, [compareVideo1]);
  useEffect(() => {
    if (!compareVideo2 || !compareVideo2.file) {
      setPreCompressed2(null);
      setPreCompressProgress2(null);
      setVideoDuration2(null);
      preCompressPromise2Ref.current = null;
    }
  }, [compareVideo2]);

  // 报告完成时收起视频选择区域，清空结果时展开；对比进行中时保持展开以显示进度
  useEffect(() => {
    if (isComparing) setShowCompareVideosExpanded(true);
    else setShowCompareVideosExpanded(!compareResult);
  }, [compareResult, isComparing]);

  // 相同帧提取：当有 sharedSegments 且双方都有 File 时，提取对应时间点的帧用于对比展示
  useEffect(() => {
    const segments = compareResult?.details?.sharedSegments;
    const file1 = compareVideo1?.file;
    const file2 = compareVideo2?.file;
    if (!segments?.length || !file1 || !file2) {
      setSharedSegmentFrames([]);
      return;
    }
    setSharedSegmentFrames(segments.map(() => null));
    let cancelled = false;
    (async () => {
      const results: Array<{ frameA: string; frameB: string; description: string } | { error: string } | null> = [];
      for (let i = 0; i < segments.length; i++) {
        if (cancelled) return;
        const seg = segments[i];
        try {
          const timeA = parseTimeRangeToSeconds(seg.videoARange);
          const timeB = parseTimeRangeToSeconds(seg.videoBRange);
          const [frameA, frameB] = await Promise.all([
            extractFrameAtTime(file1, timeA),
            extractFrameAtTime(file2, timeB)
          ]);
          results[i] = { frameA, frameB, description: seg.description || '' };
        } catch (e) {
          results[i] = { error: extractErrorMessage(e) };
        }
        if (cancelled) return;
        setSharedSegmentFrames([...results]);
      }
    })();
    return () => { cancelled = true; };
  }, [compareResult?.details?.sharedSegments, compareVideo1?.file, compareVideo2?.file]);

  /** 选择视频（1v1 仅发原片，不压缩） */
  const handleSelectCompareVideo1 = (file: File) => setCompareVideo1({ file });
  const handleSelectCompareVideo2 = (file: File) => setCompareVideo2({ file });

  // 保存视频库：本地库写 localStorage，Supabase 项目在导入/添加/删除/清空时单独调用接口
  useEffect(() => {
    if (!libraryLoaded || currentProjectId !== LOCAL_PROJECT_ID) return;

    try {
      const dataToSave = videoLibrary.map((video) => ({
        id: video.id,
        title: video.title,
        previewUrl: video.previewUrl,
        coverUrl: video.coverUrl,
      }));
      const jsonString = JSON.stringify(dataToSave);
      const MAX_SIZE = 4 * 1024 * 1024;
      if (jsonString.length > MAX_SIZE) {
        setStorageError(`视频库数据过大（${(jsonString.length / 1024 / 1024).toFixed(2)}MB），请减少视频数量或导出Excel备份`);
        return;
      }
      localStorage.setItem('video_deduplication_library', jsonString);
      setStorageError(null);
    } catch (e: unknown) {
      console.error('保存视频库失败:', e);
      if (e instanceof Error && e.name === 'QuotaExceededError') {
        setStorageError('存储空间不足，请清理浏览器数据或减少视频库数量');
      } else {
        setStorageError(`保存失败: ${e instanceof Error ? e.message : '未知错误'}`);
      }
    }
  }, [videoLibrary, libraryLoaded, currentProjectId]);

  // Excel导入
  const handleImportExcel = async (file: File) => {
    try {
      // 解析Excel（会自动处理：过滤无效数据，按消耗排序，只保留前1000名）
      const result = await parseVideoLibraryExcel(file);
      const { videos: imported, stats } = result;

      if (imported.length === 0) {
        alert('导入完成，但没有找到有效数据。\n\n请确保文件包含：\n1. 「预览链接」或「素材预览」列（必需）\n2. 链接格式正确（http:// 或 https:// 开头）\n3. 消耗字段（用于排名，可选）\n\n提示：创量导出的 CSV 表头为 素材名、素材预览、消耗。请打开浏览器控制台（F12）查看详细处理日志');
        return;
      }

      // 构建详细的提示信息
      let message = `✅ 导入完成\n\n`;
      message += `📊 处理统计：\n`;
      message += `  • Excel总行数: ${stats.totalRows}\n`;
      message += `  • 有效数据: ${stats.validCount} 条\n`;
      message += `  • 跳过无效数据: ${stats.skippedCount} 条\n`;
      if (stats.groupedCount !== undefined && stats.groupedCount < stats.validCount) {
        message += `  • 分组后数量: ${stats.groupedCount} 条（按素材名称合并）\n`;
      }
      message += `\n📋 数据处理流程：\n`;
      message += `  1️⃣ 按素材名称分组，相同名称的消耗求和\n`;
      message += `  2️⃣ 按总消耗降序排序\n`;

      if (stats.filteredCount > 0) {
        message += `\n⚠️ 排名筛选：\n`;
        message += `  • 已导入: ${stats.importedCount} 条（消耗排名前1000名）\n`;
        message += `  • 已过滤: ${stats.filteredCount} 条（排名1001及以后，未导入）\n`;
        message += `\n💡 说明：系统按素材名称分组并求和消耗后，按总消耗排序，只保留前1000名。`;
      } else {
        message += `\n✅ 已导入: ${stats.importedCount} 条\n`;
        message += `\n💡 说明：所有有效数据已导入（未超过1000条限制）。`;
      }

      // 检查导入后的总数据大小
      const newLibrary = [...videoLibrary, ...imported];
      const testData = newLibrary.map(v => ({
        id: v.id,
        title: v.title,
        previewUrl: v.previewUrl,
        coverUrl: v.coverUrl
      }));
      const testSize = JSON.stringify(testData).length;
      const MAX_SIZE = 4 * 1024 * 1024; // 4MB

      if (testSize > MAX_SIZE) {
        const currentCount = videoLibrary.length;
        const maxCount = Math.floor((MAX_SIZE / testSize) * newLibrary.length);
        alert(`${message}\n\n⚠️ 警告：导入后数据将超过存储限制（当前${currentCount}个，导入${imported.length}个，建议总数不超过${maxCount}个）。\n\n建议：\n1. 分批导入\n2. 删除部分旧视频\n3. 导出Excel备份后清理`);
        return;
      }

      // 去重检查：检查导入的视频是否与现有视频库重复
      // 去重检查

      // 快速去重：检查URL和素材名称
      const filteredImported: VideoLibraryItem[] = [];
      const duplicateUrls = new Set(videoLibrary.map(v => v.previewUrl));
      const duplicateTitles = new Set(videoLibrary.map(v => v.title).filter(Boolean));
      let duplicateCount = 0;

      for (const video of imported) {
        // 检查URL是否重复
        if (duplicateUrls.has(video.previewUrl)) {
          duplicateCount++;
          continue;
        }

        // 检查素材名称是否重复（如果已有相同名称的视频）
        if (video.title && duplicateTitles.has(video.title)) {
          // 素材名称重复，但URL不同，允许添加（可能是同一素材的不同链接）
          filteredImported.push(video);
          duplicateUrls.add(video.previewUrl); // 添加到已存在集合，避免后续重复
        } else {
          filteredImported.push(video);
          if (video.title) {
            duplicateTitles.add(video.title);
          }
          duplicateUrls.add(video.previewUrl);
        }
      }

      const finalLibrary = [...videoLibrary, ...filteredImported];

      if (duplicateCount > 0) {
        const duplicateMessage = `\n⚠️ 去重结果：\n  • 检测到 ${duplicateCount} 个重复视频（URL重复），已自动过滤\n  • 将导入 ${filteredImported.length} 个视频`;
        message += duplicateMessage;
      }

      // 显示确认对话框
      const userConfirmed = window.confirm(
        `${message}\n\n是否确认导入这 ${filteredImported.length} 条数据？`
      );

      if (!userConfirmed) {
        return;
      }

      if (currentProjectId !== LOCAL_PROJECT_ID) {
        const byCost = [...finalLibrary].sort((a, b) => (b.totalCost ?? 0) - (a.totalCost ?? 0));
        const toSave = byCost.slice(0, DATA_GROUP_TOP_COUNT);
        try {
          await upsertDeduplicationLibrary(currentProjectId, toSave, { skipLargeFields: true });
          setVideoLibrary(toSave);
          libraryCache[currentProjectId] = toSave;
          alert(
            `✅ 导入完成，已同步到数据组\n\n` +
            `数据库已保存：消耗前 ${DATA_GROUP_TOP_COUNT} 条（共 ${toSave.length} 条）\n` +
            `${finalLibrary.length > DATA_GROUP_TOP_COUNT ? `\n⚠️ 共 ${finalLibrary.length} 条，仅保存消耗前 ${DATA_GROUP_TOP_COUNT} 条到数据库。\n` : ''}\n数据库上传成功。`
          );
        } catch (e) {
          const msg = extractErrorMessage(e);
          setStorageError(msg);
          const hint =
            msg.includes('cover_fingerprint') || msg.includes('schema cache')
              ? '\n\n请先在 Supabase 控制台 → SQL 编辑器 中执行迁移：\n项目内文件 supabase/migrations/add_deduplication_cover_fingerprint.sql'
              : '';
          alert(`导入成功但同步到项目失败: ${msg}${hint}`);
        }
      } else {
        setVideoLibrary(finalLibrary);
        if (currentProjectId !== LOCAL_PROJECT_ID) libraryCache[currentProjectId] = finalLibrary;
      }

      // 本地库或已在上方提示过时，显示导入统计
      if (currentProjectId === LOCAL_PROJECT_ID) {
        alert(`✅ 成功导入 ${imported.length} 条视频\n\n${stats.filteredCount > 0 ? `⚠️ 注意：已自动过滤 ${stats.filteredCount} 条排名较低的数据（只保留消耗排名前1000名）\n\n` : ''}已自动处理：\n✓ 过滤无效数据\n✓ 按素材名称分组、消耗求和\n✓ 按总消耗降序排序\n${stats.filteredCount > 0 ? '✓ 只保留前1000名\n' : ''}\n提示：请打开浏览器控制台（F12）查看详细处理日志`);
      }

      setStorageError(null);
    } catch (error: any) {
      console.error('❌ Excel导入失败:', error);
      if (error.name === 'QuotaExceededError') {
        alert(`存储空间不足：${extractErrorMessage(error)}\n\n建议：\n1. 清理浏览器数据\n2. 减少视频库数量\n3. 导出Excel备份后删除部分视频`);
      } else {
        alert(`导入失败: ${extractErrorMessage(error)}\n\n提示：请打开浏览器控制台（F12）查看详细错误信息`);
      }
    }
  };

  // 导出Excel
  const handleExportExcel = () => {
    if (videoLibrary.length === 0) {
      alert('视频库为空，无法导出');
      return;
    }
    exportVideoLibraryToExcel(videoLibrary);
  };

  // 从本地文件夹批量添加视频（仅本地逻辑，不拉取链接）
  const handleAddFromFolder = async () => {
    if (selectedFolderFiles.length === 0) {
      alert('请先选择本地文件夹');
      return;
    }

    setIsAddingVideo(true);
    const existingTitles = new Set(videoLibrary.map((v) => v.title).filter(Boolean));
    const toAdd: VideoLibraryItem[] = [];
    const baseId = Date.now();

    for (let i = 0; i < selectedFolderFiles.length; i++) {
      const file = selectedFolderFiles[i];
      const title = file.name.replace(/\.mp4$/i, '').trim() || file.name;
      if (existingTitles.has(title)) continue;
      existingTitles.add(title);
      toAdd.push({
        id: `video_${baseId}_${i}`,
        title,
        previewUrl: `local:${title}`,
        coverUrl: undefined
      });
    }

    if (toAdd.length === 0) {
      alert('所选文件夹中的视频均已存在于库中，未新增。');
      setIsAddingVideo(false);
      return;
    }

    const nextLibrary = [...videoLibrary, ...toAdd];
    setVideoLibrary(nextLibrary);
    setSelectedFolderFiles([]);
    setShowAddVideoModal(false);
    setIsAddingVideo(false);

    if (currentProjectId !== LOCAL_PROJECT_ID) {
      const byCost = [...nextLibrary].sort((a, b) => (b.totalCost ?? 0) - (a.totalCost ?? 0));
      const toSave = byCost.slice(0, DATA_GROUP_TOP_COUNT);
      try {
        await upsertDeduplicationLibrary(currentProjectId, toSave, { skipLargeFields: true });
        setVideoLibrary(toSave);
        libraryCache[currentProjectId] = toSave;
        alert(`✅ 已从本地文件夹添加 ${toAdd.length} 个视频，已同步到数据组。\n\n请点击「为库内素材生成指纹」为新增条目生成封面指纹（仅从本地创量目录读取）。`);
      } catch (e) {
        setStorageError(extractErrorMessage(e));
        alert(`添加成功但同步失败: ${extractErrorMessage(e)}`);
      }
    } else {
      alert(`✅ 已从本地文件夹添加 ${toAdd.length} 个视频。`);
    }
  };

  // 为库内无指纹的素材批量生成封面指纹（Excel 导入的条目可由此参与相似检索）
  const handleRefreshFingerprints = async () => {
    if (currentProjectId === LOCAL_PROJECT_ID || videoLibrary.length === 0) return;
    const needFp = videoLibrary.filter((v) => !v.coverFingerprint && v.previewUrl);
    if (needFp.length === 0) {
      alert('当前库内素材均已具备封面指纹，无需生成。');
      return;
    }
    if (!confirm(`将为无指纹素材生成封面指纹（仅从本地创量目录读取，无本地文件的条目将跳过）。共 ${needFp.length} 条待处理。是否继续？`)) return;
    setIsRefreshingFingerprints(true);
    setFingerprintProgress({ current: 0, total: needFp.length });
    setStorageError(null);
    let ok = 0;
    let fail = 0;
    const updates = new Map<string, {
      features: VideoFeatures;
      coverFingerprint: string;
      keyFrameFingerprints?: string[];
      coverFingerprintSecondary?: string;
      keyFrameFingerprintsSecondary?: string[];
    }>();
    let processed = 0;
    for (const item of needFp) {
      setFingerprintProgress((p) => (p ? { ...p, current: processed + 1 } : null));
      try {
        const localUrl = item.title ? await getLocalVideoUrl(item.title) : null;
        if (!localUrl) {
          fail++;
          processed++;
          continue;
        }
        const features = await extractVideoFeaturesFromUrl(localUrl, { skipDescription: true });
        if (features.coverImage) {
          const fp = await computeCoverFingerprint(features.coverImage);
          let keyFrameFingerprints: string[] | undefined;
          if (features.keyFrames && features.keyFrames.length > 0) {
            try {
              keyFrameFingerprints = await computeFingerprintsFromImages(features.keyFrames);
            } catch {
              // 关键帧指纹可选
            }
          }
          let coverFingerprintSecondary: string | undefined;
          let keyFrameFingerprintsSecondary: string[] | undefined;
          try {
            coverFingerprintSecondary = await computeAHashCoverFingerprint(features.coverImage);
            if (features.keyFrames?.length) keyFrameFingerprintsSecondary = await computeAHashFromImages(features.keyFrames);
          } catch {
            // aHash 可选，双指纹召回用
          }
          updates.set(item.id, {
            features,
            coverFingerprint: fp,
            keyFrameFingerprints,
            coverFingerprintSecondary,
            keyFrameFingerprintsSecondary,
          });
          ok++;
        } else fail++;
      } catch (e) {
        fail++;
      }
      processed++;
    }
    setFingerprintProgress(null);
    const merged = videoLibrary.map((v) => {
      const u = updates.get(v.id);
      return u
        ? {
          ...v,
          features: u.features,
          coverFingerprint: u.coverFingerprint,
          keyFrameFingerprints: u.keyFrameFingerprints,
          coverFingerprintSecondary: u.coverFingerprintSecondary,
          keyFrameFingerprintsSecondary: u.keyFrameFingerprintsSecondary,
        }
        : v;
    });
    const byCost = [...merged].sort((a, b) => (b.totalCost ?? 0) - (a.totalCost ?? 0));
    const toSave = byCost.slice(0, DATA_GROUP_TOP_COUNT);
    try {
      await upsertDeduplicationLibrary(currentProjectId, toSave, { skipLargeFields: true });
      setVideoLibrary(toSave);
      libraryCache[currentProjectId] = toSave;
      alert(`已为库内素材生成指纹：成功 ${ok} 条，跳过 ${fail} 条（无本地文件或读取失败）。\n\n仅从本地创量目录读取，数据库已更新。`);
    } catch (e) {
      const msg = extractErrorMessage(e);
      setStorageError(msg);
      const hint = /failed to fetch|network/i.test(msg)
        ? '\n\n若为 Failed to fetch：请检查 .env.local 中 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 是否正确；Supabase 免费版长时间不用会暂停，需在控制台恢复。'
        : '';
      alert(`生成指纹完成但同步失败: ${msg}${hint}`);
    } finally {
      setFingerprintProgress(null);
    }
    setIsRefreshingFingerprints(false);
  };

  // 删除视频
  const handleDeleteVideo = async (id: string) => {
    if (!confirm('确定要删除这个视频吗？')) return;
    if (currentProjectId !== LOCAL_PROJECT_ID) {
      const { deleteDeduplicationLibraryItem } = await import('@/lib/deduplication/deduplicationSupabaseService');
      try {
        await deleteDeduplicationLibraryItem(currentProjectId, id);
      } catch (e) {
        setStorageError(extractErrorMessage(e));
        return;
      }
    }
    setVideoLibrary((prev) => prev.filter((v) => v.id !== id));
  };

  // 清空视频库
  const handleClearLibrary = async () => {
    if (!confirm('确定要清空整个视频库吗？此操作不可恢复，建议先导出Excel备份。')) return;
    if (currentProjectId !== LOCAL_PROJECT_ID) {
      try {
        await clearDeduplicationLibraryApi(currentProjectId);
      } catch (e) {
        setStorageError(extractErrorMessage(e));
        return;
      }
    }
    setVideoLibrary([]);
    libraryCache[currentProjectId] = [];
    setStorageError(null);
  };

  /** 从服务器重新拉取当前数据组库数据（分页逐批，更新缓存；有缓存时不会自动拉取，需点此刷新） */
  const handleRefreshLibrary = async () => {
    if (currentProjectId === LOCAL_PROJECT_ID) return;
    setIsRefreshingLibrary(true);
    setStorageError(null);
    try {
      const data = await getDeduplicationLibrary(currentProjectId);
      setVideoLibrary(data);
      libraryCache[currentProjectId] = data;
    } catch (e) {
      console.error('刷新视频库失败:', e);
      setStorageError(extractErrorMessage(e));
    } finally {
      setIsRefreshingLibrary(false);
    }
  };

  /** 添加视频时 AI 去重：最多对比的候选条数（指纹预筛或退化为前 N 条） */
  const ADD_VIDEO_AI_CHECK_TOP_K = 10;

  // 检查视频是否与视频库重复（优化：目标特征只算一次、使用库内已存特征、先指纹预筛再 AI）
  const checkVideoDuplicate = async (
    targetVideo: VideoLibraryItem,
    existingLibrary: VideoLibraryItem[]
  ): Promise<{ isDuplicate: boolean; similarity: number; matchedVideo?: VideoLibraryItem }> => {
    if (existingLibrary.length === 0) {
      return { isDuplicate: false, similarity: 0 };
    }

    // 第一步：快速检查 URL 和素材名称是否完全相同
    const exactMatch = existingLibrary.find(v =>
      v.previewUrl === targetVideo.previewUrl ||
      (v.title && targetVideo.title && v.title === targetVideo.title && v.previewUrl === targetVideo.previewUrl)
    );
    if (exactMatch) {
      return { isDuplicate: true, similarity: 1.0, matchedVideo: exactMatch };
    }

    // 第二步：素材名称相同但 URL 不同，允许添加
    if (targetVideo.title) {
      const sameNameVideos = existingLibrary.filter(v => v.title === targetVideo.title);
      if (sameNameVideos.length > 0) {
        return { isDuplicate: false, similarity: 0.5, matchedVideo: sameNameVideos[0] };
      }
    }

    // 第三步：AI 去重（目标特征只提取一次、使用库内已存特征、先指纹预筛 topK 再对比）
    try {
      // 目标特征：仅读本地。优先用已有，否则只从本地创量目录取，不拉取 previewUrl
      let targetFeatures: VideoFeatures | undefined = targetVideo.features && hasMeaningfulVideoFeatures(targetVideo.features)
        ? targetVideo.features
        : undefined;
      if (!targetFeatures) {
        const localUrl = targetVideo.title ? await getLocalVideoUrl(targetVideo.title) : null;
        if (!localUrl) return { isDuplicate: false, similarity: 0 };
        targetFeatures = await extractVideoFeaturesFromUrl(localUrl, { skipDescription: true });
      }
      if (!targetFeatures || !hasMeaningfulVideoFeatures(targetFeatures)) {
        return { isDuplicate: false, similarity: 0 };
      }

      // 库内已存特征 Map（避免重复拉 URL）
      const libraryFeaturesMap = new Map<string, VideoFeatures>(
        existingLibrary.filter(v => v.features && hasMeaningfulVideoFeatures(v.features)).map(v => [v.id, v.features!])
      );

      // 候选：先按封面/多帧指纹预筛 topK，无指纹则取前 topK 条（多帧可降低“开头相同、内容不同”的误报）
      let candidates: VideoLibraryItem[];
      let targetFingerprint = targetVideo.coverFingerprint;
      if (!targetFingerprint && targetFeatures.coverImage) {
        try {
          targetFingerprint = await computeCoverFingerprint(targetFeatures.coverImage);
        } catch {
          // ignore
        }
      }
      let targetKeyFrameFingerprints: string[] | undefined;
      if (targetFeatures.keyFrames && targetFeatures.keyFrames.length > 0) {
        try {
          targetKeyFrameFingerprints = await computeFingerprintsFromImages(targetFeatures.keyFrames);
        } catch {
          // 关键帧指纹可选
        }
      }
      const hasLibraryFingerprints = existingLibrary.some(v => v.coverFingerprint && v.coverFingerprint!.length > 0);
      if (targetFingerprint && hasLibraryFingerprints) {
        const targetFingerprints = targetKeyFrameFingerprints?.length
          ? [targetFingerprint, ...targetKeyFrameFingerprints]
          : targetFingerprint;
        let targetSecondary: string[] | undefined;
        try {
          if (targetFeatures.coverImage) {
            const coverAHash = await computeAHashCoverFingerprint(targetFeatures.coverImage);
            const keyAHash = targetFeatures.keyFrames?.length ? await computeAHashFromImages(targetFeatures.keyFrames) : [];
            targetSecondary = [coverAHash, ...keyAHash];
          }
        } catch {
          // aHash 可选
        }
        const similar = querySimilarByFingerprint(
          existingLibrary,
          targetFingerprints,
          ADD_VIDEO_AI_CHECK_TOP_K,
          targetSecondary?.length ? { targetSecondary } : undefined
        );
        candidates = similar.map(s => s.item);
      } else {
        candidates = existingLibrary.slice(0, ADD_VIDEO_AI_CHECK_TOP_K);
      }

      let maxSimilarity = 0;
      let matchedVideo: VideoLibraryItem | undefined;

      for (const existingVideo of candidates) {
        try {
          let libFeatures = libraryFeaturesMap.get(existingVideo.id);
          if (!libFeatures) {
            // 仅读本地：不拉取创量链接
            const localUrl = existingVideo.title ? await getLocalVideoUrl(existingVideo.title) : null;
            if (!localUrl) continue;
            libFeatures = await extractVideoFeaturesFromUrl(localUrl, { skipDescription: true });
          }
          if (!libFeatures || !hasMeaningfulVideoFeatures(libFeatures)) continue;

          const comparison = await compareVideos(targetFeatures, libFeatures);
          if (comparison.similarityScore > maxSimilarity) {
            maxSimilarity = comparison.similarityScore;
            matchedVideo = existingVideo;
          }
          if (comparison.similarityScore >= 0.8) {
            return { isDuplicate: true, similarity: comparison.similarityScore, matchedVideo };
          }
        } catch (e) {
          console.warn(`对比视频 ${existingVideo.id} 失败:`, e);
        }
      }

      return {
        isDuplicate: maxSimilarity >= 0.8,
        similarity: maxSimilarity,
        matchedVideo
      };
    } catch (error: any) {
      console.warn('AI去重检查失败:', error);
      return { isDuplicate: false, similarity: 0 };
    }
  };

  // 第一步：相似检索（不调 AI，用封面指纹）
  const handleSimilarSearch = async () => {
    if (!checkVideoFile) {
      setCheckError('请先上传要检查的视频');
      return;
    }
    if (currentProjectId === LOCAL_PROJECT_ID) {
      setCheckError('查重请选择数据组');
      return;
    }
    if (videoLibrary.length === 0) {
      setCheckError('当前数据组为空');
      return;
    }
    setIsSimilarSearching(true);
    setCheckError(null);
    setCheckSimilarCandidates(null);
    setCheckSelectedIds(new Set());
    setCheckTargetFeatures(null);
    try {
      const features = await extractVideoFeatures(checkVideoFile, { skipDescription: true });
      if (!features.coverImage) {
        setCheckError('无法提取封面图');
        return;
      }
      const fingerprint = await computeCoverFingerprint(features.coverImage);
      let keyFrameFingerprints: string[] | undefined;
      if (features.keyFrames && features.keyFrames.length > 0) {
        try {
          keyFrameFingerprints = await computeFingerprintsFromImages(features.keyFrames);
        } catch {
          // 关键帧指纹可选
        }
      }
      const targetFingerprints = keyFrameFingerprints?.length ? [fingerprint, ...keyFrameFingerprints] : fingerprint;
      let targetSecondary: string[] | undefined;
      try {
        const coverAHash = await computeAHashCoverFingerprint(features.coverImage);
        const keyAHash = features.keyFrames?.length ? await computeAHashFromImages(features.keyFrames) : [];
        targetSecondary = [coverAHash, ...keyAHash];
      } catch {
        // aHash 可选，双指纹召回
      }
      const candidates = querySimilarByFingerprint(videoLibrary, targetFingerprints, 50, targetSecondary?.length ? { targetSecondary } : undefined);
      setCheckSimilarCandidates(candidates);
      setCheckTargetFeatures(features);
    } catch (e) {
      setCheckError(extractErrorMessage(e));
    } finally {
      setIsSimilarSearching(false);
    }
  };

  // 深度对比：仅 1v1，与「1v1 对比」同一逻辑，原片直接发两段视频给 AI（不压缩、不首帧关键帧）
  const handleDeepCompare = async () => {
    if (!checkVideoFile) {
      setCheckError('请先上传要检查的视频并做相似检索');
      return;
    }
    if (checkSelectedIds.size !== 1) {
      setCheckError('请勾选 1 条素材进行深度对比（仅支持 1v1）');
      return;
    }
    const selectedId = Array.from(checkSelectedIds)[0];
    const item = videoLibrary.find((v) => v.id === selectedId);
    if (!item) {
      setCheckError('所选素材不存在，请重新勾选');
      return;
    }
    setIsChecking(true);
    setCheckError(null);
    setCheckResults([]);
    try {
      let libraryVideoUrl: string | null = null;
      if (item.previewUrl?.startsWith('local:')) {
        const title = item.title ?? item.previewUrl.replace(/^local:/, '');
        libraryVideoUrl = title ? (await getLocalVideoUrl(title)) ?? null : null;
      } else if (item.previewUrl && !item.previewUrl.startsWith('blob:') && !item.previewUrl.startsWith('data:')) {
        libraryVideoUrl = getVideoProxyUrl(item.previewUrl);
      }
      const libraryFile = libraryVideoUrl
        ? await fetchUrlToVideoFile(libraryVideoUrl, `${item.title || item.id}.mp4`)
        : null;
      if (!libraryFile) {
        setCheckError('无法获取库内视频文件，请检查网络或换一条素材');
        setIsChecking(false);
        return;
      }
      const comparison = await compareTwoVideosDirectly(checkVideoFile, libraryFile, {
        allowOverSize: true,
        onProgress: () => setCheckProgress({ current: 1, total: 1 })
      });
      setCheckResults([
        {
          videoId: item.id,
          videoTitle: item.title,
          coverUrl: item.coverUrl,
          similarityScore: comparison.similarityScore,
          verdict: comparison.verdict,
          details: {
            visualSimilarity: comparison.details.visualSimilarity,
            contentSimilarity: comparison.details.contentSimilarity,
            metadataSimilarity: comparison.details.metadataSimilarity,
            analysis: comparison.details.analysis
          }
        }
      ]);
    } catch (e) {
      setCheckError(`深度对比失败：${extractErrorMessage(e)}`);
    } finally {
      setIsChecking(false);
      setCheckProgress({ current: 0, total: 0 });
    }
  };

  // 中止查重检查
  const handleAbortCheck = () => {
    if (checkAbortController) {
      checkAbortController.abort();
      setCheckAbortController(null);
    }
    setIsChecking(false);
    setCheckProgress({ current: 0, total: 0 });
    setCheckError('检查已中止');
  };

  // 查重检查（仅允许数据组，本地库不能用来做库查询）
  const handleCheckDuplication = async () => {
    if (!checkVideoFile) {
      setCheckError('请先上传要检查的视频');
      return;
    }
    if (currentProjectId === LOCAL_PROJECT_ID) {
      setCheckError('查重请选择数据组，本地库仅用于管理/导入，不能用来做库查询');
      return;
    }
    if (videoLibrary.length === 0) {
      setCheckError('当前数据组为空，请先导入或添加视频');
      return;
    }

    // 创建AbortController用于中止操作
    const abortController = new AbortController();
    setCheckAbortController(abortController);

    setIsChecking(true);
    setCheckError(null);
    setCheckResults([]);
    setCheckProgress({ current: 0, total: videoLibrary.length });

    try {
      // 提取目标视频特征
      const targetFeatures = await extractVideoFeatures(checkVideoFile);
      setCheckTargetFeatures(targetFeatures);

      // 检查是否已中止
      if (abortController.signal.aborted) {
        return;
      }

      // 方案A：若库内已有持久化特征则直接使用，不再对每条请求代理
      const hasStoredFeatures = videoLibrary.some((v) => v.features);
      const libraryFeaturesMap = hasStoredFeatures
        ? new Map(videoLibrary.filter((v) => v.features).map((v) => [v.id, v.features!]))
        : undefined;

      // 与视频库对比（带错误处理和中止支持）；仅内部/调试用，UI 已移除全库检查入口
      const results = await checkVideoDuplication(
        targetFeatures,
        videoLibrary,
        abortController.signal,
        (current, total) => {
          // 检查是否已中止
          if (abortController.signal.aborted) {
            return;
          }
          setCheckProgress({ current, total });
        },
        libraryFeaturesMap,
        undefined
      );

      // 检查是否已中止
      if (abortController.signal.aborted) {
        return;
      }

      if (results.length === 0) {
        setCheckError('去重检查完成，但所有视频都因CORS限制无法加载。\n\n建议：\n1. 确保视频链接支持跨域访问\n2. 或使用本地视频文件进行查重');
      } else {
        setCheckResults(results);

        // 如果结果数量少于视频库数量，说明有些视频加载失败
        if (results.length < videoLibrary.length) {
          const failedCount = videoLibrary.length - results.length;
          console.warn(`⚠️ ${failedCount} 个视频因CORS限制无法检查`);
        }
      }
    } catch (error: any) {
      // 如果是中止错误，不显示错误信息
      if (error.name === 'AbortError' || abortController.signal.aborted) {
        setCheckError('检查已中止');
        return;
      }
      setCheckError(`去重检查失败: ${extractErrorMessage(error)}\n\n可能原因：\n1. 视频链接受CORS限制\n2. 网络连接问题\n3. 视频格式不支持\n\n建议：使用本地视频文件进行查重`);
    } finally {
      setIsChecking(false);
      setCheckProgress({ current: 0, total: 0 });
      setCheckAbortController(null);
    }
  };

  // 1v1对比：支持本地上传或从库选择；仅发送原片，不压缩
  const handleCompare = async () => {
    if (!compareVideo1 || !compareVideo2) {
      setCompareError('请选择两个视频进行对比');
      return;
    }

    setIsComparing(true);
    setCompareError(null);
    setCompareResult(null);
    setCompareStep('准备中（读取视频）');
    setCompressProgress(0);

    let completed = false;

    try {
      // 1) 解析得到 file1, file2（本地上传用 .file，从库选择用 url 拉取为 File）
      let file1: File | null = compareVideo1.file ?? null;
      let file2: File | null = compareVideo2.file ?? null;
      if (!file1 && compareVideo1.url) {
        let fetchUrl: string | null = null;
        if (compareVideo1.url.startsWith('local:')) {
          const title = compareVideo1.title ?? compareVideo1.url.replace(/^local:/, '');
          fetchUrl = title ? (await getLocalVideoUrl(title)) ?? null : null;
        } else {
          fetchUrl = getVideoProxyUrl(compareVideo1.url);
        }
        if (fetchUrl) file1 = await fetchUrlToVideoFile(fetchUrl, (compareVideo1.title || 'video1') + '.mp4');
      }
      if (!file2 && compareVideo2.url) {
        let fetchUrl: string | null = null;
        if (compareVideo2.url.startsWith('local:')) {
          const title = compareVideo2.title ?? compareVideo2.url.replace(/^local:/, '');
          fetchUrl = title ? (await getLocalVideoUrl(title)) ?? null : null;
        } else {
          fetchUrl = getVideoProxyUrl(compareVideo2.url);
        }
        if (fetchUrl) file2 = await fetchUrlToVideoFile(fetchUrl, (compareVideo2.title || 'video2') + '.mp4');
      }
      if (!file1 || !file2) {
        setCompareError('无法获取视频文件（库中视频请检查网络或改用本地上传）');
        setIsComparing(false);
        return;
      }

      // 2) 直接发原片给 AI，不压缩
      setCompareStep('AI 对比中（正在分析两段视频，请稍候）');
      setCompressProgress(null);
      try {
        const result = await compareTwoVideosDirectly(file1, file2, {
          allowOverSize: true,
          onProgress: (msg) => setCompareStep(msg)
        });
        completed = true;
        setCompressProgress(1);
        setCompareResult(result);
        setTimeout(() => { setCompressProgress(null); setCompareStep(null); setIsComparing(false); }, 400);
        return;
      } catch (directErr: unknown) {
        setCompareError(`直接发视频对比失败：${extractErrorMessage(directErr)}。可尝试更短或更小的视频。`);
        setIsComparing(false);
        return;
      }
    } catch (error: unknown) {
      setCompareError(extractErrorMessage(error));
    } finally {
      if (!completed) {
        setCompressProgress(null);
        setCompareStep(null);
        setIsComparing(false);
      }
    }
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'Plagiarism':
        return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'Inspired':
        return 'bg-warning/20 text-warning border-warning/30';
      case 'Original':
        return 'bg-success/20 text-success border-success/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getVerdictLabel = (verdict: string) => {
    switch (verdict) {
      case 'Plagiarism':
        return '疑似重复';
      case 'Inspired':
        return '有相似';
      case 'Original':
        return '原创';
      default:
        return verdict;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-destructive';
    if (score >= 0.5) return 'text-warning';
    return 'text-success';
  };

  const getProgressColor = (score: number) => {
    if (score >= 0.8) return 'bg-destructive';
    if (score >= 0.5) return 'bg-warning';
    return 'bg-success';
  };

  return (
    <div className="h-full bg-background text-foreground p-4 md:p-6 overflow-auto">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* 页面标题 + 右上角项目选择 */}
        <PageHeader
          title="爆款分析"
          description="深度拆解视频框架、分析钩子并提供结构化指令"
          actions={
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">库来源</span>
              <select
                value={currentProjectId}
                onChange={(e) => setCurrentProjectId(e.target.value)}
                className="h-8 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option key={LOCAL_PROJECT_ID} value={LOCAL_PROJECT_ID}>本地库</option>
                {supabaseProjects.map((p) => (
                  <option key={`proj-${p.id}`} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          }
        />

        {/* 标签页 */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
          <TabsList>
            <TabsTrigger value="breakdown" className="gap-2">
              <Sparkles className="h-4 w-4" />
              爆款拆解
            </TabsTrigger>
            <TabsTrigger value="check" className="gap-2">
              <Search className="h-4 w-4" />
              视频查重
            </TabsTrigger>
            <TabsTrigger value="compare" className="gap-2">
              <VideoIcon className="h-4 w-4" />
              1v1对比
            </TabsTrigger>
            <TabsTrigger value="library" className="gap-2">
              <Play className="h-4 w-4" />
              视频库
            </TabsTrigger>
            <TabsTrigger value="competitor" className="gap-2">
              <Eye className="h-4 w-4" />
              竞品分析
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* 爆款拆解标签页 */}
        {activeTab === 'breakdown' && (
          <BreakdownBoard />
        )}

        {/* 竞品视频分析标签页 */}
        {activeTab === 'competitor' && (
          <div className="mt-4">
            <CompetitorVideoAnalysis />
          </div>
        )}

        {/* 视频库标签页 */}
        {activeTab === 'library' && (
          <div className="space-y-4">
            <input
              ref={excelInputRef2}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportExcel(file);
                e.target.value = '';
              }}
            />
            {currentProjectId !== LOCAL_PROJECT_ID && (
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-foreground mb-2">上传数据（写入当前数据组）</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    导入 Excel/CSV 或<strong>选择本地文件夹</strong>添加视频后，会写入数据库。为参与「相似检索」需为素材生成封面指纹（仅从本地创量目录读取）。
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => excelInputRef2.current?.click()}
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      导入 Excel/CSV
                    </Button>
                    <Button size="sm" onClick={() => setShowAddVideoModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      选择本地文件夹
                    </Button>
                    {videoLibrary.length > 0 && videoLibrary.some((v) => !v.coverFingerprint) && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRefreshFingerprints}
                          disabled={isRefreshingFingerprints}
                        >
                          {isRefreshingFingerprints ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          为库内素材生成指纹
                        </Button>
                        {fingerprintProgress != null && (
                          <span className="text-sm text-muted-foreground">
                            正在生成指纹 {fingerprintProgress.current}/{fingerprintProgress.total}…
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">
                  共 {videoLibrary.length} 个视频
                </p>
                {videoLibrary.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-1 space-y-1">
                    <p>建议总数不超过 500 个视频；本页仅从本地创量目录读取，不拉取链接。</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {currentProjectId !== LOCAL_PROJECT_ID && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshLibrary}
                    disabled={isRefreshingLibrary}
                  >
                    {isRefreshingLibrary ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    刷新库
                  </Button>
                )}
                {videoLibrary.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearLibrary}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    清空
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => setShowAddVideoModal(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  选择本地文件夹
                </Button>
              </div>
            </div>

            {videoLibrary.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="p-12 text-center">
                  <VideoIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">视频库为空</p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => excelInputRef2.current?.click()}
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      导入 Excel/CSV
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setShowAddVideoModal(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      选择本地文件夹
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {videoLibrary.map((video, idx) => (
                  <Card
                    key={`lib-${idx}-${video.previewUrl}`}
                    className="bg-card border-border cursor-pointer hover:border-border transition-all group"
                    onClick={() => setPlayingVideo(video)}
                  >
                    <CardContent className="p-3">
                      {/* 竖版视频封面：有封面图用图，无则用视频预览（创量导出无封面时直接播视频） */}
                      <div className="aspect-[9/16] bg-muted/50 rounded-lg mb-2 overflow-hidden relative">
                        {video.coverUrl ? (
                          <img
                            src={video.coverUrl}
                            alt={video.title || video.id}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : video.previewUrl?.startsWith('local:') ? (
                          /* 本地创量：解析为流 URL 后显示有效预览 */
                          <LocalVideoThumbnail video={video} />
                        ) : (
                          <>
                            <div className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none">
                              <VideoIcon className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <video
                              src={getVideoProxyUrl(video.previewUrl)}
                              preload="metadata"
                              muted
                              playsInline
                              loop
                              className="relative w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </>
                        )}
                        {/* 播放按钮覆盖层 */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="w-12 h-12 bg-background rounded-full flex items-center justify-center">
                            <Play className="h-6 w-6 text-black ml-1" fill="black" />
                          </div>
                        </div>
                        {/* 删除按钮 */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteVideo(video.id);
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3 w-3 text-white" />
                        </button>
                        {/* 总消耗标签 */}
                        {video.totalCost !== undefined && video.totalCost > 0 && (
                          <div className="absolute bottom-2 left-2 px-2 py-1 bg-foreground/70 rounded text-xs text-white font-medium">
                            消耗: {video.totalCost.toLocaleString()}
                          </div>
                        )}
                      </div>
                      {/* 素材名称 - 悬停滚动显示 */}
                      <div className="relative overflow-hidden h-5">
                        <div
                          className="text-sm font-medium text-foreground whitespace-nowrap transition-transform duration-500 ease-in-out"
                          style={{
                            transform: 'translateX(0)',
                            display: 'inline-block'
                          }}
                          title={video.title || video.id}
                          onMouseEnter={(e) => {
                            const element = e.currentTarget;
                            const container = element.parentElement;
                            if (!container) return;

                            const textWidth = element.scrollWidth;
                            const containerWidth = container.offsetWidth;

                            if (textWidth > containerWidth) {
                              const scrollDistance = textWidth - containerWidth + 16; // 16px padding
                              element.style.transition = 'transform 0.6s ease-in-out';
                              element.style.transform = `translateX(-${scrollDistance}px)`;
                            }
                          }}
                          onMouseLeave={(e) => {
                            const element = e.currentTarget;
                            element.style.transition = 'transform 0.4s ease-in-out';
                            element.style.transform = 'translateX(0)';
                          }}
                        >
                          {video.title || video.id}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 查重标签页：首行选取视频 + 下行对比视频（左右滑动），首屏完整 */}
        {activeTab === 'check' && (
          <div className="flex flex-col gap-4 max-h-[calc(100vh-160px)] min-h-0 overflow-y-auto">
            {/* 操作栏：相似检索（不调 AI）+ 勾选后深度对比（调 AI），不提供全库检查避免误触耗 token */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Button
                size="sm"
                onClick={handleSimilarSearch}
                disabled={!checkVideoFile || videoLibrary.length === 0 || currentProjectId === LOCAL_PROJECT_ID || isSimilarSearching}
              >
                {isSimilarSearching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                相似检索（不调 AI）
              </Button>
              {checkSimilarCandidates != null && checkSimilarCandidates.length > 0 && (
                <Button
                  size="sm"
                  onClick={handleDeepCompare}
                  disabled={checkSelectedIds.size !== 1 || isChecking}
                >
                  {isChecking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  深度对比（勾选 1 条）
                </Button>
              )}
              {isChecking && (
                <span className="text-sm text-muted-foreground">深度对比中…</span>
              )}
            </div>

            {/* 首行：选取视频（目标视频） */}
            <Card className="bg-card border-border shrink-0">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-muted-foreground w-20 shrink-0">选取视频</span>
                  {checkVideoFile ? (
                    <>
                      {checkVideoPreviewUrl && (
                        <div className="w-32 aspect-[9/16] rounded-lg overflow-hidden border border-border bg-muted/50 shrink-0">
                          <video src={checkVideoPreviewUrl} className="w-full h-full object-cover" playsInline muted preload="metadata" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1 flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-foreground truncate" title={checkVideoFile.name}>{checkVideoFile.name}</p>
                        <span className="text-xs text-muted-foreground shrink-0">{(checkVideoFile.size / 1024 / 1024).toFixed(2)} MB</span>
                        <Button variant="ghost" size="sm" onClick={() => setCheckVideoFile(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <Dropzone
                      onFileSelect={(file) => {
                        if (file.type.startsWith('video/')) setCheckVideoFile(file);
                        else alert('请上传视频文件');
                      }}
                      accept="video/*"
                      label="上传要检查的视频"
                    />
                  )}
                </div>
                {currentProjectId === LOCAL_PROJECT_ID && (
                  <div className="flex items-center gap-2 mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded text-sm text-amber-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    查重请选择数据组，本地库仅用于管理/导入。
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
                  <p>相似检索：指纹匹配候选；深度对比：勾选 1 条后，将目标与库内视频原片直接发给 AI 对比。</p>
                </div>
              </CardContent>
            </Card>

            {/* 下行：对比视频（相似候选，左右滑动） */}
            <Card className="bg-card border-border flex-1 min-h-0 flex flex-col">
              <CardContent className="p-4 flex flex-col min-h-0 flex-1">
                <div className="flex items-center justify-between mb-2 shrink-0">
                  <span className="text-sm font-medium text-muted-foreground">对比视频 · 相似候选</span>
                  {checkSimilarCandidates != null && checkSimilarCandidates.length > 0 && (
                    <span className="text-xs text-muted-foreground">勾选 1 条后点「深度对比」</span>
                  )}
                </div>
                {checkSimilarCandidates == null ? (
                  <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground py-8">
                    上传视频后点击「相似检索」获取候选，勾选后点「深度对比」进行 AI 对比
                  </div>
                ) : checkSimilarCandidates.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-400 text-center">
                    <div>
                      <p className="font-medium mb-1">未找到相似候选</p>
                      <p className="text-amber-400/90 text-xs">请到「视频库」为数据组生成指纹后再做「相似检索」。</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden">
                    <div className="flex gap-4 pb-2" style={{ minWidth: 'min-content' }}>
                      {checkSimilarCandidates.map(({ item, similarity }, idx) => (
                        <label
                          key={`cand-${idx}-${item.previewUrl}`}
                          className={`flex flex-col w-28 shrink-0 cursor-pointer rounded-lg border p-2 transition-colors ${checkSelectedIds.has(item.id) ? 'border-blue-500 bg-blue-500/10' : 'border-border hover:border-border hover:bg-muted'
                            }`}
                        >
                          <input
                            type="checkbox"
                            checked={checkSelectedIds.has(item.id)}
                            onChange={(e) => {
                              setCheckSelectedIds((prev) => {
                                if (e.target.checked) return new Set([item.id]);
                                const next = new Set(prev);
                                next.delete(item.id);
                                return next;
                              });
                            }}
                            className="sr-only"
                            aria-label={`选中 ${item.title || item.id}`}
                          />
                          <div className="w-full aspect-[9/16] rounded overflow-hidden bg-muted mb-2 relative flex items-center justify-center">
                            <CandidateThumbnail item={item} fill />
                          </div>
                          <span className="text-xs text-foreground truncate block mb-1" title={item.title || item.id}>{item.title || item.id}</span>
                          <span className="text-xs font-medium text-blue-400">{(similarity * 100).toFixed(0)}% 相似</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {videoLibrary.length === 0 && (
              <div className="flex items-center gap-2 p-2 bg-warning/10 border border-warning/20 rounded-lg shrink-0 text-sm text-warning">
                <AlertCircle className="h-4 w-4" />
                {currentProjectId === LOCAL_PROJECT_ID ? '当前为本地库，查重请切换到数据组' : '当前数据组为空，请先导入或添加视频'}
              </div>
            )}

            {/* 错误提示 */}
            {checkError && (
              <Card className="bg-card border-destructive/30">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-destructive">检查失败</p>
                      <p className="text-sm text-foreground mt-1">{checkError}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 检查结果 */}
            {checkResults.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">
                    检查结果 ({checkResults.length})
                  </h3>
                  <Badge className={getVerdictColor(checkResults[0]?.verdict || 'Original')}>
                    {getVerdictLabel(checkResults[0]?.verdict || 'Original')}
                  </Badge>
                </div>

                {checkResults.map((result, idx) => (
                  <Card key={`result-${idx}-${result.videoId}`} className="bg-card border-border">
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        {/* 库内素材封面 */}
                        {result.coverUrl && (
                          <div className="w-32 h-20 bg-muted/50 rounded-lg overflow-hidden shrink-0">
                            <img
                              src={result.coverUrl}
                              alt={result.videoTitle || result.videoId}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}

                        {/* 结果信息 */}
                        <div className="flex-1 space-y-3 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {result.videoTitle || result.videoId}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">ID: {result.videoId}</p>
                            </div>
                            <div className="text-right">
                              <p className={`text-xl font-bold ${getScoreColor(result.similarityScore)}`}>
                                {(result.similarityScore * 100).toFixed(1)}%
                              </p>
                              <Badge className={`mt-1 ${getVerdictColor(result.verdict)}`}>
                                {getVerdictLabel(result.verdict)}
                              </Badge>
                            </div>
                          </div>

                          {/* 进度条 */}
                          <div className="w-full bg-muted/50 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${getProgressColor(result.similarityScore)}`}
                              style={{ width: `${result.similarityScore * 100}%` }}
                            />
                          </div>

                          {/* 详细分数（视觉/内容/元数据；综合=视觉40%+内容30%+元数据20%） */}
                          {result.details && (
                            <>
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div>
                                  <span className="text-muted-foreground">视觉:</span>
                                  <span className="text-foreground ml-1">
                                    {((result.details.visualSimilarity || 0) * 100).toFixed(0)}%
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">内容:</span>
                                  <span className="text-foreground ml-1">
                                    {((result.details.contentSimilarity || 0) * 100).toFixed(0)}%
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">元数据:</span>
                                  <span className="text-foreground ml-1">
                                    {((result.details.metadataSimilarity || 0) * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                综合 = 视觉40% + 内容30% + 元数据20%。若视觉低而内容高，会出现「分数高但看起来不很像」。
                              </p>
                            </>
                          )}

                          {/* 分析说明 */}
                          {result.details?.analysis && (
                            <div className="p-3 bg-muted/30 rounded-lg border border-border">
                              <p className="text-xs text-foreground leading-relaxed">
                                {result.details.analysis}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 1v1对比标签页 */}
        {activeTab === 'compare' && (
          <div className="space-y-6">
            {/* 报告完成后优先展示，视频选择区域可折叠 */}
            {compareResult && (
              <Card className="bg-card border-border">
                <CardContent className="p-6 space-y-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-foreground">对比结果</h3>
                    <Badge className={getVerdictColor(compareResult.verdict)}>
                      {getVerdictLabel(compareResult.verdict)}
                    </Badge>
                    {compareResult.details.relationshipType && (
                      <Badge variant="outline" className="border-amber-500/40 text-amber-400">
                        {compareResult.details.relationshipType}
                      </Badge>
                    )}
                  </div>

                  <div className="p-4 bg-muted border border-border rounded-lg">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-muted-foreground font-medium">综合相似度</span>
                      <span className={`text-2xl font-bold ${getScoreColor(compareResult.similarityScore)}`}>
                        {(compareResult.similarityScore * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${getProgressColor(compareResult.similarityScore)}`}
                        style={{ width: `${compareResult.similarityScore * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-muted/30 rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground mb-1">视觉相似度</p>
                      <p className="text-xl font-bold text-foreground">
                        {(compareResult.details.visualSimilarity * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground mb-1">内容相似度</p>
                      <p className="text-xl font-bold text-foreground">
                        {(compareResult.details.contentSimilarity * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground mb-1">元数据相似度</p>
                      <p className="text-xl font-bold text-foreground">
                        {(compareResult.details.metadataSimilarity * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-muted/30 rounded-lg border border-border">
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {compareResult.details.analysis}
                    </p>
                  </div>

                  {compareResult.details.sharedSegments && compareResult.details.sharedSegments.length > 0 && (
                    <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                      <h4 className="text-sm font-medium text-amber-400 mb-3">复用片段（同一素材）</h4>
                      <div className="space-y-3">
                        {compareResult.details.sharedSegments.map((seg, idx) => (
                          <div key={idx} className="flex flex-wrap items-baseline gap-2 text-xs">
                            <span className="text-foreground font-medium">视频 A</span>
                            <code className="px-1.5 py-0.5 bg-muted/60 rounded text-amber-300">{seg.videoARange}</code>
                            <span className="text-muted-foreground">⇄</span>
                            <span className="text-foreground font-medium">视频 B</span>
                            <code className="px-1.5 py-0.5 bg-muted/60 rounded text-amber-300">{seg.videoBRange}</code>
                            {seg.description && <span className="text-muted-foreground">：{seg.description}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {compareResult.details.similarities.length > 0 && (
                      <div className="p-4 bg-success/10 rounded-lg border border-success/20">
                        <h4 className="text-sm font-medium text-success mb-2">相似点</h4>
                        <ul className="space-y-1">
                          {compareResult.details.similarities.map((item, idx) => (
                            <li key={`sim-${idx}`} className="text-xs text-foreground flex items-start gap-2">
                              <span className="text-success mt-0.5">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {compareResult.details.differences.length > 0 && (
                      <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <h4 className="text-sm font-medium text-blue-400 mb-2">差异点</h4>
                        <ul className="space-y-1">
                          {compareResult.details.differences.map((item, idx) => (
                            <li key={`diff-${idx}`} className="text-xs text-foreground flex items-start gap-2">
                              <span className="text-blue-400 mt-0.5">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 对比错误 */}
            {compareError && (
              <Card className="bg-card border-destructive/30">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <p className="text-sm text-destructive">{compareError}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 视频选择区域（可折叠，报告完成后默认收起） */}
            <Card className="bg-card border-border">
              <CardContent className="p-0">
                <button
                  type="button"
                  onClick={() => setShowCompareVideosExpanded((v) => !v)}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors rounded-lg"
                >
                  <span className="text-sm font-medium text-muted-foreground">
                    视频选择 · 视频 A: {compareVideo1?.file?.name ?? (compareVideo1?.url ? '库内视频' : '—')} ｜ 视频 B: {compareVideo2?.file?.name ?? (compareVideo2?.url ? '库内视频' : '—')}
                  </span>
                  {showCompareVideosExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                {showCompareVideosExpanded && (
                  <div className="px-6 pb-6 pt-0 space-y-6 border-t border-border">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* 视频1 */}
                      <Card className="bg-card border-border">
                        <CardContent className="p-6 space-y-4">
                          <h3 className="text-sm font-medium text-muted-foreground">视频 A</h3>
                          {compareVideo1?.file || compareVideo1?.url ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                                <div className="flex items-center gap-2 min-w-0">
                                  <VideoIcon className="h-4 w-4 text-blue-400 shrink-0" />
                                  <p className="text-sm text-foreground truncate">
                                    {compareVideo1.file?.name ?? (compareVideo1.url ? '库内视频' : '')}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setCompareVideo1(null)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              {previewUrl1 && (
                                <div className="rounded-lg overflow-hidden border border-border bg-muted aspect-video">
                                  <video
                                    src={previewUrl1}
                                    controls
                                    playsInline
                                    muted
                                    crossOrigin={previewUrl1.startsWith('http') ? 'anonymous' : undefined}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                              )}
                              {compareVideo1?.file && compareVideo1.file.size > MAX_VIDEO_SIZE_FOR_DIRECT && (
                                <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 text-xs text-amber-200/90">
                                  <p>大文件，将直接发送原片尝试对比</p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Dropzone
                                onFileSelect={(file) => {
                                  if (file.type.startsWith('video/')) {
                                    handleSelectCompareVideo1(file);
                                  } else {
                                    alert('请上传视频文件');
                                  }
                                }}
                                accept="video/*"
                                label="上传视频A"
                              />
                              <div className="text-center text-xs text-muted-foreground">或</div>
                              <select
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
                                value={compareVideo1?.url || ''}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  if (!v) { setCompareVideo1(null); return; }
                                  const video = videoLibrary.find((x) => x.previewUrl === v || (x.title && x.title === v));
                                  setCompareVideo1(video ? { url: video.previewUrl, title: video.title } : { url: v });
                                }}
                              >
                                <option value="">从视频库选择</option>
                                {videoLibrary.map((video, idx) => (
                                  <option key={`opt1-${idx}-${video.previewUrl}`} value={video.previewUrl}>
                                    {video.title || video.id}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* 视频2 */}
                      <Card className="bg-card border-border">
                        <CardContent className="p-6 space-y-4">
                          <h3 className="text-sm font-medium text-muted-foreground">视频 B</h3>
                          {compareVideo2?.file || compareVideo2?.url ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                                <div className="flex items-center gap-2 min-w-0">
                                  <VideoIcon className="h-4 w-4 text-blue-400 shrink-0" />
                                  <p className="text-sm text-foreground truncate">
                                    {compareVideo2.file?.name ?? (compareVideo2.url ? '库内视频' : '')}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setCompareVideo2(null)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              {previewUrl2 && (
                                <div className="rounded-lg overflow-hidden border border-border bg-muted aspect-video">
                                  <video
                                    src={previewUrl2}
                                    controls
                                    playsInline
                                    muted
                                    crossOrigin={previewUrl2.startsWith('http') ? 'anonymous' : undefined}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                              )}
                              {compareVideo2?.file && compareVideo2.file.size > MAX_VIDEO_SIZE_FOR_DIRECT && (
                                <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 text-xs text-amber-200/90">
                                  <p>大文件，将直接发送原片尝试对比</p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Dropzone
                                onFileSelect={(file) => {
                                  if (file.type.startsWith('video/')) {
                                    handleSelectCompareVideo2(file);
                                  } else {
                                    alert('请上传视频文件');
                                  }
                                }}
                                accept="video/*"
                                label="上传视频B"
                              />
                              <div className="text-center text-xs text-muted-foreground">或</div>
                              <select
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
                                value={compareVideo2?.url || ''}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  if (!v) { setCompareVideo2(null); return; }
                                  const video = videoLibrary.find((x) => x.previewUrl === v || (x.title && x.title === v));
                                  setCompareVideo2(video ? { url: video.previewUrl, title: video.title } : { url: v });
                                }}
                              >
                                <option value="">从视频库选择</option>
                                {videoLibrary.map((video, idx) => (
                                  <option key={`opt2-${idx}-${video.previewUrl}`} value={video.previewUrl}>
                                    {video.title || video.id}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    <div className="space-y-3">
                      <Button
                        onClick={handleCompare}
                        disabled={isComparing || !compareVideo1 || !compareVideo2}
                        className="w-full"
                      >
                        {isComparing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {compareStep || '处理中'}
                          </>
                        ) : (
                          <>
                            <Search className="h-4 w-4 mr-2" />
                            开始对比
                          </>
                        )}
                      </Button>
                      {isComparing && (compareStep || compressProgress != null) && (
                        <div className="px-2">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>{compareStep}</span>
                            {compressProgress != null ? (
                              <span>{(compressProgress * 100).toFixed(0)}%</span>
                            ) : (
                              <span>请稍候…</span>
                            )}
                          </div>
                          <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                            {compressProgress != null ? (
                              <div
                                className="h-full bg-blue-500/80 rounded-full transition-all duration-300"
                                style={{ width: `${compressProgress * 100}%` }}
                              />
                            ) : (
                              <div
                                className="h-full bg-blue-500/80 rounded-full animate-pulse"
                                style={{ width: '100%' }}
                                title="进行中，无具体进度"
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* 视频播放模态框 */}
        {playingVideo && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 md:p-8">
            <Card className="w-full max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
              <CardContent className="p-6 space-y-6">
                {/* 头部 */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {playingVideo.title || playingVideo.id}
                    </h3>
                    {playingVideo.totalCost !== undefined && (
                      <p className="text-sm text-muted-foreground">
                        总消耗: <span className="text-foreground font-medium">{playingVideo.totalCost.toLocaleString()}</span>
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPlayingVideo(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* 视频播放器（local: 已解析为 playingVideoResolvedUrl） */}
                <div className="aspect-[9/16] bg-black rounded-lg overflow-hidden">
                  <video
                    src={playingVideoResolvedUrl ?? undefined}
                    controls
                    className="w-full h-full object-contain"
                    autoPlay
                  >
                    您的浏览器不支持视频播放
                  </video>
                </div>

                {/* 按推广类型统计消耗 */}
                {playingVideo.promotionTypes && playingVideo.promotionTypes.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-base font-semibold text-foreground">按推广类型统计</h4>
                    <div className="space-y-2">
                      {playingVideo.promotionTypes.map((item, idx) => {
                        // 判断是否为微信小游戏或抖音小游戏
                        const isWeChat = item.type.includes('微信') || item.type.includes('wechat') || item.type.includes('WeChat');
                        const isDouyin = item.type.includes('抖音') || item.type.includes('douyin') || item.type.includes('Douyin');
                        const bgColor = isWeChat
                          ? 'bg-success/20 border-success/30'
                          : isDouyin
                            ? 'bg-info/20 border-info/30'
                            : 'bg-muted/30 border-border';
                        const textColor = isWeChat
                          ? 'text-success'
                          : isDouyin
                            ? 'text-info'
                            : 'text-foreground';

                        return (
                          <div
                            key={`promo-${idx}-${item.type ?? ''}`}
                            className={`p-4 rounded-lg border ${bgColor}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-sm font-medium ${textColor}`}>
                                {item.type || '未分类'}
                              </span>
                              <span className="text-lg font-bold text-foreground">
                                {item.cost.toLocaleString()}
                              </span>
                            </div>
                            {playingVideo.totalCost && playingVideo.totalCost > 0 && (
                              <div className="mt-2">
                                <div className="w-full bg-muted/50 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="h-full bg-muted-foreground/30 transition-all"
                                    style={{ width: `${(item.cost / playingVideo.totalCost) * 100}%` }}
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  占比: {((item.cost / playingVideo.totalCost) * 100).toFixed(1)}%
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 视频信息 */}
                <div className="pt-4 border-t border-border">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">视频链接</span>
                      {playingVideo.previewUrl?.startsWith('local:') ? (
                        <span className="text-muted-foreground truncate ml-4 max-w-xs" title={playingVideo.title}>
                          本地创量 · {playingVideo.title ?? '—'}
                        </span>
                      ) : (
                        <a
                          href={playingVideo.previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 truncate ml-4 max-w-xs"
                        >
                          {playingVideo.previewUrl}
                        </a>
                      )}
                    </div>
                    {playingVideo.coverUrl && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">封面链接</span>
                        <a
                          href={playingVideo.coverUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 truncate ml-4 max-w-xs"
                        >
                          {playingVideo.coverUrl}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 添加视频：选择本地文件夹 */}
        <input
          ref={addFolderInputRef}
          type="file"
          {...({ webkitdirectory: '', directory: '', multiple: true } as any)}
          accept="video/mp4,.mp4,video/*"
          className="hidden"
          onChange={(e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
              const list = Array.from(files).filter((f) => f.name.toLowerCase().endsWith('.mp4'));
              setSelectedFolderFiles(list);
              if (list.length === 0) {
                alert('该文件夹内未找到 .mp4 视频文件。');
              }
            }
            e.target.value = '';
          }}
        />
        {showAddVideoModal && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
            <Card className="w-full max-w-md bg-card border-border">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">从本地文件夹添加</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAddVideoModal(false);
                      setSelectedFolderFiles([]);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  选择创量视频所在文件夹，将自动识别其中的 .mp4 并按文件名加入库（仅本地，不拉取链接）。
                </p>
                {selectedFolderFiles.length === 0 ? (
                  <Button
                    className="w-full"
                    onClick={() => addFolderInputRef.current?.click()}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    选择本地文件夹
                  </Button>
                ) : (
                  <>
                    <p className="text-sm text-success/90">
                      已选择 {selectedFolderFiles.length} 个视频
                    </p>
                    <div className="max-h-32 overflow-y-auto rounded-lg border border-border bg-muted/60 p-2 text-xs text-muted-foreground">
                      {selectedFolderFiles.slice(0, 20).map((f, i) => (
                        <div key={i} className="truncate">{f.name}</div>
                      ))}
                      {selectedFolderFiles.length > 20 && (
                        <div>... 等共 {selectedFolderFiles.length} 个</div>
                      )}
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addFolderInputRef.current?.click()}
                      >
                        重新选择
                      </Button>
                      <Button
                        variant="ghost"
                        className="flex-1"
                        onClick={() => {
                          setShowAddVideoModal(false);
                          setSelectedFolderFiles([]);
                        }}
                      >
                        取消
                      </Button>
                      <Button className="flex-1" onClick={handleAddFromFolder} disabled={isAddingVideo}>
                        {isAddingVideo ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        确认添加
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* 新建项目模态框 */}
        {showNewProjectModal && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
            <Card className="w-full max-w-md bg-card border-border">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">新建项目</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowNewProjectModal(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">项目名称</label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="例如：默认项目"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button variant="ghost" className="flex-1" onClick={() => setShowNewProjectModal(false)}>取消</Button>
                  <Button
                    className="flex-1"
                    onClick={async () => {
                      if (!newProjectName.trim()) return;
                      try {
                        const p = await createDeduplicationProject(newProjectName.trim());
                        const list = await listDeduplicationProjects();
                        setSupabaseProjects(list);
                        setCurrentProjectId(p.id);
                        setShowNewProjectModal(false);
                        setNewProjectName('');
                      } catch (e) {
                        setStorageError(extractErrorMessage(e));
                      }
                    }}
                    disabled={!newProjectName.trim()}
                  >
                    创建
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 编辑项目名模态框 */}
        {showEditProjectModal && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
            <Card className="w-full max-w-md bg-card border-border">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">编辑项目名</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowEditProjectModal(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">项目名称</label>
                  <input
                    type="text"
                    value={editProjectName}
                    onChange={(e) => setEditProjectName(e.target.value)}
                    placeholder="项目名称"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button variant="ghost" className="flex-1" onClick={() => setShowEditProjectModal(false)}>取消</Button>
                  <Button
                    className="flex-1"
                    onClick={async () => {
                      if (!editProjectName.trim() || currentProjectId === LOCAL_PROJECT_ID) return;
                      try {
                        await updateDeduplicationProject(currentProjectId, { name: editProjectName.trim() });
                        const list = await listDeduplicationProjects();
                        setSupabaseProjects(list);
                        setShowEditProjectModal(false);
                        setEditProjectName('');
                      } catch (e) {
                        setStorageError(extractErrorMessage(e));
                      }
                    }}
                    disabled={!editProjectName.trim()}
                  >
                    保存
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 存储空间警告：放在画面最下方 */}
        {storageError && (
          <Card className="bg-card border-warning/30 mt-4">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-warning mb-1">存储空间警告</p>
                  <p className="text-sm text-foreground leading-relaxed">{storageError}</p>
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm('确定要清理视频库吗？建议先导出Excel备份。')) {
                          setVideoLibrary([]);
                          libraryCache[currentProjectId] = [];
                          setStorageError(null);
                        }
                      }}
                    >
                      清理视频库
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportExcel}
                      disabled={videoLibrary.length === 0}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      导出备份
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setStorageError(null)}
                    >
                      忽略
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
