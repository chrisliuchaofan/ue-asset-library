// 视频去重服务
/**
 * 视频去重服务
 * 支持多维度视频相似度检测
 */
import { safeChatCompletionForDedup, getDefaultModel as getAIDefaultModel } from './aiService';
import { extractErrorMessage } from './aiService';

// 创量本地视频库缓存
let localMaterialsCache: Array<{ name: string; local_path: string }> | null = null;
let localMaterialsPromise: Promise<Array<{ name: string; local_path: string }> | null> | null = null;

/**
 * 获取本地视频 URL（如果存在）
 * 方案C：优先查找本地创量视频库；materials 只请求一次，多卡片并发调用也只会发一次请求
 */
export async function getLocalVideoUrl(title: string): Promise<string | null> {
  if (!title) return null;
  
  try {
    // 1. 加载本地库索引（单例：多卡片同时解析时只发一次请求）
    if (!localMaterialsPromise) {
      localMaterialsPromise = fetch('/api/local-video/chuangliao/materials')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          localMaterialsCache = data;
          return data;
        })
        .catch((e) => {
          console.warn('无法加载本地视频库索引:', e);
          return null;
        });
    }
    const materials = await localMaterialsPromise;
    localMaterialsCache = materials;

    // 2. 查找匹配的视频
    if (materials) {
      // 精确匹配或包含匹配
      const match = materials.find(m => m.name === title || (title.length > 5 && m.name.includes(title)));
      if (match) {
        return `/api/local-video/chuangliao/stream?path=${encodeURIComponent(match.local_path)}`;
      }
    }
  } catch (e) {
    console.warn('查找本地视频失败:', e);
  }
  
  return null;
}

/** 方案A：通过 Supabase Edge Function 代理视频/图片 URL，解决 CORS 无法读像素问题 */
export function getVideoProxyUrl(originalUrl: string): string {
  if (!originalUrl || originalUrl.startsWith('blob:') || originalUrl.startsWith('data:')) {
    return originalUrl;
  }
  // 本地创量流：不经过代理，直接由 Vite 代理到本地后端
  if (originalUrl.startsWith('/api/local-video')) {
    return originalUrl;
  }
  // 本地占位（local:标题）：不能作为代理目标，避免向 Supabase 发请求导致 ERR_CONNECTION_RESET
  if (originalUrl.startsWith('local:')) {
    return originalUrl;
  }
  // 与 vite.config define 一致：SUPABASE_URL / NEXT_PUBLIC / VITE_ 均可用于代理 base
  const supabaseUrl =
    (typeof process !== 'undefined' && process.env?.SUPABASE_URL) ||
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
    '';
  const proxyDisabled =
    typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_VIDEO_PROXY_ENABLED === 'false';
  if (!supabaseUrl || proxyDisabled) {
    return originalUrl;
  }
  const base = String(supabaseUrl).replace(/\/$/, '');
  return `${base}/functions/v1/video-proxy?url=${encodeURIComponent(originalUrl)}`;
}

// 视频库中的视频项
export interface VideoLibraryItem {
  id: string;
  title?: string; // 素材名称（Excel中的"素材名称"）
  previewUrl: string; // 视频预览链接
  coverUrl?: string; // 封面链接
  totalCost?: number; // 总消耗（相同素材名称的消耗求和）
  promotionTypes?: Array<{
    type: string; // 推广类型（如：微信小游戏、抖音小游戏）
    cost: number; // 该类型的消耗
  }>;
  metadata?: {
    duration?: number;
    resolution?: string;
    format?: string;
  };
  /** 方案A：已算好的特征（建库/更新时只算一次），查重时直接使用，不再请求代理 */
  features?: VideoFeatures;
  /** 封面 8x8 二值指纹 64 字符，用于第一步相似检索（不调 AI），dHash */
  coverFingerprint?: string;
  /** 关键帧指纹数组（与首帧一起参与多帧相似检索），dHash */
  keyFrameFingerprints?: string[];
  /** 封面 aHash 64 字符（双指纹召回，同一片段不同编码更稳），可选 */
  coverFingerprintSecondary?: string;
  /** 关键帧 aHash 数组，可选 */
  keyFrameFingerprintsSecondary?: string[];
}

// 视频特征（用于对比）
export interface VideoFeatures {
  coverImage?: string; // base64 封面图
  keyFrames?: string[]; // base64 关键帧数组
  contentDescription?: string; // AI生成的内容描述
  metadata?: {
    duration?: number;
    resolution?: string;
    format?: string;
  };
}

// 相似度对比结果
export interface SimilarityResult {
  videoId: string;
  videoTitle?: string;
  coverUrl?: string;
  similarityScore: number; // 0-1
  verdict: 'Plagiarism' | 'Inspired' | 'Original';
  details: {
    visualSimilarity?: number;
    contentSimilarity?: number;
    metadataSimilarity?: number;
    analysis?: string; // AI分析说明
  };
}

/** 是否有可用于对比的有效特征（有封面或关键帧）；无则说明加载失败，对比无意义 */
export function hasMeaningfulVideoFeatures(features: VideoFeatures): boolean {
  return !!(features.coverImage || (features.keyFrames && features.keyFrames.length > 0));
}

/** 解析时间字符串为秒数，支持 "0:05"、"0:05-0:18"、"1:30" 等格式，取区间起始时间 */
export function parseTimeRangeToSeconds(rangeStr: string): number {
  if (!rangeStr || typeof rangeStr !== 'string') return 0;
  const trimmed = rangeStr.trim();
  // 取 "-" 前的部分，或整个字符串
  const part = trimmed.includes('-') ? trimmed.split('-')[0].trim() : trimmed;
  const match = part.match(/^(?:(\d+):)?(\d+)(?:\.(\d+))?$/);
  if (!match) return 0;
  const minutes = match[1] ? parseInt(match[1], 10) : 0;
  const seconds = parseInt(match[2], 10) || 0;
  const frac = match[3] ? parseInt(match[3].slice(0, 2).padEnd(2, '0'), 10) / 100 : 0;
  return minutes * 60 + seconds + frac;
}

/** 从视频 File 在指定时间（秒）提取一帧，返回 base64 图片 */
export async function extractFrameAtTime(file: File, timeSeconds: number): Promise<string> {
  return extractVideoFrameAtTime(file, Math.max(0, timeSeconds));
}

/** 两视频关系类型（含混剪场景） */
export type RelationshipType = '全片雷同' | '片段复用' | '创意借鉴' | '无关';

/** 复用片段的时间段对应（用于混剪场景） */
export interface SharedSegment {
  videoARange: string;   // 视频 A 时间段，如 "0:05-0:18"
  videoBRange: string;   // 视频 B 时间段，如 "0:22-0:35"
  description: string;   // 该片段描述
}

// 1v1对比结果
export interface ComparisonResult {
  similarityScore: number;
  verdict: 'Plagiarism' | 'Inspired' | 'Original';
  details: {
    visualSimilarity: number;
    contentSimilarity: number;
    metadataSimilarity: number;
    analysis: string;
    similarities: string[];
    differences: string[];
    /** 关系类型：全片雷同/片段复用（混剪）/创意借鉴/无关 */
    relationshipType?: RelationshipType;
    /** 复用片段对应（当 relationshipType 为 片段复用 时） */
    sharedSegments?: SharedSegment[];
  };
}

/**
 * 从封面图 base64 计算 64 位二值指纹，用于不调 AI 的相似检索。
 * 使用差异哈希（dHash）：9x8 灰度 → 每行相邻像素比较得 0/1，对亮度/对比度变化更稳、区分度更高。
 * 替换原 aHash（均值二值化）以减少“不相关却被判相似”的误报；需重新为库内素材生成指纹。
 */
export async function computeCoverFingerprint(coverImageBase64: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const w = 9;
        const h = 8;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法创建 canvas'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        const gray = (i: number) =>
          (data[i] + data[i + 1] + data[i + 2]) / 3;
        let bits = '';
        for (let row = 0; row < h; row++) {
          for (let col = 0; col < w - 1; col++) {
            const idx = (row * w + col) * 4;
            const nextIdx = (row * w + col + 1) * 4;
            bits += gray(idx) < gray(nextIdx) ? '1' : '0';
          }
        }
        resolve(bits);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('封面图加载失败'));
    img.src = coverImageBase64;
  });
}

/** 从多张图（base64）依次计算指纹，返回指纹数组。用于关键帧多帧相似检索。 */
export async function computeFingerprintsFromImages(imagesBase64: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const img of imagesBase64) {
    const fp = await computeCoverFingerprint(img);
    out.push(fp);
  }
  return out;
}

/**
 * aHash（均值二值化）64 位指纹：8x8 灰度 → 与整图均值比较得 0/1。
 * 双指纹召回用，对缩放/压缩比 dHash 更稳，同一片段不同编码易过线。
 */
export async function computeAHashCoverFingerprint(coverImageBase64: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 8;
        canvas.height = 8;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法创建 canvas'));
          return;
        }
        ctx.drawImage(img, 0, 0, 8, 8);
        const data = ctx.getImageData(0, 0, 8, 8).data;
        let sum = 0;
        for (let i = 0; i < data.length; i += 4) {
          sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
        }
        const mean = sum / (data.length / 4);
        let bits = '';
        for (let i = 0; i < data.length; i += 4) {
          const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
          bits += gray >= mean ? '1' : '0';
        }
        resolve(bits);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('封面图加载失败'));
    img.src = coverImageBase64;
  });
}

/** 从多张图依次计算 aHash，用于双指纹关键帧。 */
export async function computeAHashFromImages(imagesBase64: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const img of imagesBase64) {
    const fp = await computeAHashCoverFingerprint(img);
    out.push(fp);
  }
  return out;
}

/** 汉明距离（两串 0/1 长度需相同） */
function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) return 64;
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}

/** 单指纹相似度 0-1 */
function fingerprintSimilarity(a: string, b: string): number {
  if (a.length !== b.length) return 0;
  return 1 - hammingDistance(a, b) / a.length;
}

/** 相似检索最低相似度阈值；0.58 与滑动窗口匹配配合做平衡 */
const FINGERPRINT_SIMILARITY_MIN = 0.58;

/** 对一组逐帧相似度算混合分：0.3*min + 0.7*avg */
function hybridScore(perFrameSim: number[]): number {
  if (perFrameSim.length === 0) return 0;
  const minV = Math.min(...perFrameSim);
  const avgV = perFrameSim.reduce((a, b) => a + b, 0) / perFrameSim.length;
  return 0.3 * minV + 0.7 * avgV;
}

/**
 * 多帧时用滑动窗口：目标连续 K 帧与库条连续 K 帧对齐，取所有可能起点下的最佳混合分。
 * 同一 B 段在时间轴错位（中间相同、头尾不同）时仍能得高分。
 */
function similarityBySlidingWindow(
  targetFps: string[],
  itemFps: string[],
  simFn: (a: string, b: string) => number
): number {
  const Kt = targetFps.length;
  const Km = itemFps.length;
  if (Kt === 0 || Km === 0) return 0;
  if (Kt === 1 || Km === 1) {
    const bestPerTarget = targetFps.map((t) =>
      Math.max(...itemFps.map((f) => simFn(t, f)))
    );
    return hybridScore(bestPerTarget);
  }
  let best = 0;
  if (Km >= Kt) {
    for (let s = 0; s <= Km - Kt; s++) {
      const perFrame: number[] = [];
      for (let i = 0; i < Kt; i++) perFrame.push(simFn(targetFps[i], itemFps[s + i]));
      const score = hybridScore(perFrame);
      if (score > best) best = score;
    }
  } else {
    for (let s = 0; s <= Kt - Km; s++) {
      const perFrame: number[] = [];
      for (let i = 0; i < Km; i++) perFrame.push(simFn(targetFps[s + i], itemFps[i]));
      const score = hybridScore(perFrame);
      if (score > best) best = score;
    }
  }
  return best;
}

/** 双指纹入围：dHash 分过线即入围 */
const DUAL_FP_ENTER_MIN_A = 0.55;
/** 双指纹入围：aHash 分过线即入围（同一片段不同编码易过） */
const DUAL_FP_ENTER_MIN_B = 0.65;

/**
 * 第一步相似检索（不调 AI）：用封面/多帧指纹在库内按相似度排序，取 topK。
 * - 主指纹 dHash；可选双指纹 aHash（targetSecondary / 库条 secondary）：任一过线即入围，排序用 0.6*scoreA + 0.4*scoreB。
 * - 多帧时用「序列滑动窗口」对齐；单帧保持原逻辑。
 */
export function querySimilarByFingerprint(
  library: VideoLibraryItem[],
  targetFingerprintOrFingerprints: string | string[],
  topK = 50,
  options?: { minSimilarity?: number; targetSecondary?: string | string[] }
): Array<{ item: VideoLibraryItem; similarity: number }> {
  const targetFps = Array.isArray(targetFingerprintOrFingerprints)
    ? targetFingerprintOrFingerprints.filter((s) => s && s.length === 64)
    : [targetFingerprintOrFingerprints].filter((s) => s && s.length === 64);
  if (targetFps.length === 0) return [];

  const targetSecondary = options?.targetSecondary != null
    ? (Array.isArray(options.targetSecondary)
        ? options.targetSecondary.filter((s) => s && s.length === 64)
        : [options.targetSecondary].filter((s) => s && s.length === 64))
    : [];

  const minSim = options?.minSimilarity ?? FINGERPRINT_SIMILARITY_MIN;

  const withSim = library
    .filter((v) => v.coverFingerprint && v.coverFingerprint.length === 64)
    .map((item) => {
      const itemFps: string[] = [item.coverFingerprint!, ...(item.keyFrameFingerprints ?? [])].filter(Boolean);
      if (itemFps.length === 0) return { item, similarity: 0, scoreA: 0, scoreB: undefined as number | undefined };
      const scoreA = similarityBySlidingWindow(targetFps, itemFps, fingerprintSimilarity);
      let scoreB: number | undefined;
      if (targetSecondary.length > 0 && item.coverFingerprintSecondary && item.coverFingerprintSecondary.length === 64) {
        const itemSec: string[] = [item.coverFingerprintSecondary, ...(item.keyFrameFingerprintsSecondary ?? [])].filter(Boolean);
        if (itemSec.length > 0) scoreB = similarityBySlidingWindow(targetSecondary, itemSec, fingerprintSimilarity);
      }
      const enter = scoreA >= DUAL_FP_ENTER_MIN_A || (scoreB != null && scoreB >= DUAL_FP_ENTER_MIN_B);
      const similarity = scoreB != null ? 0.6 * scoreA + 0.4 * scoreB : scoreA;
      return { item, similarity, scoreA, scoreB, enter };
    })
    .filter((x) => x.enter && x.similarity >= minSim)
    .sort((a, b) => b.similarity - a.similarity)
    .map(({ item, similarity }) => ({ item, similarity }));
  return withSim.slice(0, topK);
}

/** 延迟撤销 blob URL，避免提取未完成时被撤销导致 ERR_FILE_NOT_FOUND */
function revokeObjectURLLater(url: string, delayMs = 200): void {
  setTimeout(() => {
    try {
      URL.revokeObjectURL(url);
    } catch {}
  }, delayMs);
}

/** 单文件超过此大小时不直接发完整视频，改用首帧+关键帧（避免请求过大） */
const MAX_VIDEO_SIZE_FOR_DIRECT = 4 * 1024 * 1024; // 4MB per file，双视频总请求体<10MB 避免 API 400

/** 将视频 File 转为 data URL（与素材审核同格式，供 video_url 使用） */
async function fileToVideoDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 直接发两个视频给 AI 做对比（与素材审核一样用 video_url，一次请求）。
 * 默认仅当单文件 ≤ MAX_VIDEO_SIZE_FOR_DIRECT 时允许；传 allowOverSize: true 时可跳过大小校验（先试不压缩，失败再压缩）。
 * 可选 onProgress 回调，用于界面展示真实步骤。
 */
export async function compareTwoVideosDirectly(
  file1: File,
  file2: File,
  options?: { allowOverSize?: boolean; onProgress?: (message: string) => void }
): Promise<ComparisonResult> {
  if (!file1.type.startsWith('video/') || !file2.type.startsWith('video/')) {
    throw new Error('仅支持视频文件');
  }
  const allowOverSize = options?.allowOverSize === true;
  if (
    !allowOverSize &&
    (file1.size > MAX_VIDEO_SIZE_FOR_DIRECT || file2.size > MAX_VIDEO_SIZE_FOR_DIRECT)
  ) {
    throw new Error(
      `单文件超过 ${MAX_VIDEO_SIZE_FOR_DIRECT / 1024 / 1024}MB 时请使用「首帧+关键帧」对比，或压缩后再试`
    );
  }

  const onProgress = options?.onProgress;
  const model = getAIDefaultModel({ forDedup: true, forVideo: true });
  const mime1 = file1.type || 'video/mp4';
  const mime2 = file2.type || 'video/mp4';

  onProgress?.('正在读取视频 A…');
  const url1 = await fileToVideoDataUrl(file1);
  onProgress?.('正在读取视频 B…');
  const url2 = await fileToVideoDataUrl(file2);

  const systemPrompt = `你是一位专业的视频对比专家。你会看到【视频A】和【视频B】两段完整视频。请：
1. 分别用一两句话描述视频A、视频B的整体内容（description1, description2）；
2. 评估视觉相似度 0-1（visualSimilarity）：画面、构图、色彩、节奏、运镜等；
3. 评估内容/语义相似度 0-1（contentSimilarity）：主题、场景、人物、剧情走向等；
4. 判定 relationshipType：
   - "全片雷同"：两视频整体画面、分镜、节奏几乎一致；
   - "片段复用"：两视频中部分时间段使用同一素材（混剪、同一素材不同剪辑）；
   - "创意借鉴"：主题/玩法相似但画面/实现不同；
   - "无关"：无实质性相似。
5. 若 relationshipType 为 "片段复用"，必须填写 sharedSegments，描述哪些时间段是同一素材：
   - videoARange：视频A的时间段，格式如 "0:05-0:18"；
   - videoBRange：视频B的时间段；
   - description：该片段的简短描述。
   若无法精确到秒，可用"开头""1/3处""结尾"等相对描述。
6. 写一段综合分析（analysis），明确说明关系类型及理由；
7. 列出相似点数组（similarities）和差异点数组（differences）。

只返回 JSON，不要其他文字：
{"description1":"...","description2":"...","visualSimilarity":0.0-1.0,"contentSimilarity":0.0-1.0,"relationshipType":"全片雷同|片段复用|创意借鉴|无关","sharedSegments":[{"videoARange":"...","videoBRange":"...","description":"..."}],"analysis":"...","similarities":["..."],"differences":["..."]}
其中 sharedSegments 仅在 relationshipType 为 "片段复用" 时填写，否则为 []。`;

  // 与爆款拆解共用同一网关入口（tuyooGatewayService.safeChatCompletion），不传 provider，便于网关稳定
  onProgress?.('正在调用 AI 分析两段视频…');
  const dedupPayload = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: '【视频A】如下：' },
          { type: 'video_url', video_url: { url: url1 } },
          { type: 'text', text: '【视频B】如下：' },
          { type: 'video_url', video_url: { url: url2 } },
          {
            type: 'text',
            text: '请对比以上两段完整视频的整体相似度，返回上述 JSON。'
          }
        ]
      }
    ] as any,
    temperature: 0.3
  };
  let response: string;
  try {
    response = await safeChatCompletionForDedup(dedupPayload);
  } catch (firstErr) {
    const msg = extractErrorMessage(firstErr);
    if (/503|502|504|unavailable|暂时不可用/i.test(msg)) {
      onProgress?.('网关暂时不可用，3 秒后重试…');
      await new Promise((r) => setTimeout(r, 3000));
      response = await safeChatCompletionForDedup(dedupPayload);
    } else {
      throw firstErr;
    }
  }

  onProgress?.('正在解析对比结果…');
  try {
    const cleaned = response.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const result = JSON.parse(cleaned);
    const visualSimilarity = Math.max(0, Math.min(1, Number(result.visualSimilarity) || 0));
    const contentSimilarity = Math.max(0, Math.min(1, Number(result.contentSimilarity) || 0));
    const metadataSimilarity = 0; // 直接发视频时未单独算元数据，可后续从 file 取 duration 等再算
    const weightSum = 0.4 + 0.3 + 0.2;
    const similarityScore =
      (visualSimilarity * 0.4 + contentSimilarity * 0.3 + metadataSimilarity * 0.2) / weightSum;
    let verdict: 'Plagiarism' | 'Inspired' | 'Original';
    if (similarityScore >= 0.8) verdict = 'Plagiarism';
    else if (similarityScore >= 0.5) verdict = 'Inspired';
    else verdict = 'Original';

    const relationshipType = ['全片雷同', '片段复用', '创意借鉴', '无关'].includes(result.relationshipType)
      ? (result.relationshipType as RelationshipType)
      : undefined;
    const sharedSegmentsRaw = Array.isArray(result.sharedSegments) ? result.sharedSegments : [];
    const sharedSegments: SharedSegment[] = sharedSegmentsRaw
      .filter((s: any) => s && typeof s.videoARange === 'string' && typeof s.videoBRange === 'string' && typeof s.description === 'string')
      .map((s: any) => ({ videoARange: s.videoARange, videoBRange: s.videoBRange, description: s.description || '' }));

    return {
      similarityScore,
      verdict,
      details: {
        visualSimilarity,
        contentSimilarity,
        metadataSimilarity,
        analysis: result.analysis || '分析完成',
        similarities: Array.isArray(result.similarities) ? result.similarities : [],
        differences: Array.isArray(result.differences) ? result.differences : [],
        relationshipType,
        sharedSegments: sharedSegments.length > 0 ? sharedSegments : undefined
      }
    };
  } catch (e) {
    console.warn('直接发视频对比返回解析失败:', e);
    throw new Error(`视频对比结果解析失败: ${extractErrorMessage(e)}`);
  }
}

/** 判断 1v1 是否可用「直接发两段视频」：两个都是本地 File 且单文件未超限 */
export function canCompareTwoVideosDirectly(
  a: { file?: File; url?: string } | null,
  b: { file?: File; url?: string } | null
): boolean {
  if (!a?.file || !b?.file) return false;
  return (
    a.file.size <= MAX_VIDEO_SIZE_FOR_DIRECT && b.file.size <= MAX_VIDEO_SIZE_FOR_DIRECT
  );
}

/** 1v1 对比时可选：跳过单独描述，由 compareVideos 一次请求完成，减少 API 调用 */
export interface ExtractVideoFeaturesOptions {
  skipDescription?: boolean;
}

/**
 * 从视频文件提取特征
 */
export async function extractVideoFeatures(
  file: File,
  options?: ExtractVideoFeaturesOptions
): Promise<VideoFeatures> {
  const features: VideoFeatures = {};

  try {
    // 提取封面图（首帧）
    const coverImage = await extractVideoFrame(file, 0);
    features.coverImage = coverImage;

    // 提取关键帧（开头、1/3、2/3、结尾）
    const video = document.createElement('video');
    const videoUrl = URL.createObjectURL(file);
    video.src = videoUrl;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    await new Promise((resolve, reject) => {
      video.onloadedmetadata = () => resolve(true);
      video.onerror = () => reject(new Error('视频元数据读取失败'));
      setTimeout(() => resolve(false), 5000);
    });

    const duration = video.duration;
    const keyFrameTimes = [0, duration * 0.33, duration * 0.67, duration - 0.1];
    const keyFrames: string[] = [];

    for (const time of keyFrameTimes) {
      try {
        const frame = await extractVideoFrameAtTime(file, time);
        if (frame) keyFrames.push(frame);
      } catch (e) {
        console.warn(`提取关键帧失败 (${time}s):`, e);
      }
    }

    features.keyFrames = keyFrames;
    features.metadata = {
      duration,
      resolution: `${video.videoWidth}x${video.videoHeight}`,
      format: file.type
    };

    // 1v1 对比时可由 compareVideos 一次请求出描述+相似度，此处跳过以节省 API
    if (!options?.skipDescription) {
      try {
        features.contentDescription = await generateVideoDescription(file, coverImage);
      } catch (e) {
        console.warn('生成内容描述失败:', e);
      }
    }

    video.remove();
    revokeObjectURLLater(videoUrl);
  } catch (error: any) {
    console.error('提取视频特征失败:', error);
    throw new Error(`提取视频特征失败: ${extractErrorMessage(error)}`);
  }

  return features;
}

/**
 * 从视频URL提取特征
 * @param options.skipDescription 为 true 时不调用 AI 生成内容描述（仅用于生成指纹等场景，不调 AI）
 */
export async function extractVideoFeaturesFromUrl(
  url: string,
  options?: { skipDescription?: boolean }
): Promise<VideoFeatures> {
  const features: VideoFeatures = {};

  try {
    // 方案C：优先尝试获取本地视频 URL（创量本地库）
    let loadUrl = url;
    // 如果 URL 包含 title 信息（通常在 VideoLibraryItem 中作为参数传递，这里简化处理）
    // 实际调用时，extractVideoFeaturesFromUrl 应该接收 title 参数，或者我们先在外部解析好 URL
    // 这里我们假设 url 可能是 previewUrl，我们需要 title 来查找本地文件
    // 由于 extractVideoFeaturesFromUrl 签名只接受 url，我们增加一个可选参数 title
    
    // 方案A：对跨域 URL 使用代理，解决 CORS 无法读像素
    loadUrl = getVideoProxyUrl(url);

    // 如果是图片URL（封面），直接使用
    if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      const coverImage = await urlToBase64(loadUrl);
      features.coverImage = coverImage;
    } else {
      // 视频URL：本地流不经过代理，远程才走代理
      const isLocalStream = url.includes('/api/local-video/');
      const usingProxy = loadUrl !== url;
      if (usingProxy) {
        console.log('[视频代理] 使用代理拉取:', loadUrl.substring(0, 80) + (loadUrl.length > 80 ? '...' : ''));
      } else if (isLocalStream) {
        console.log('[本地视频] 使用本地流:', url);
      } else {
        console.warn('[视频代理] 未使用代理（VITE_SUPABASE_URL 未配置），跨域可能失败');
      }

      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = usingProxy ? 'anonymous' : 'anonymous';
      let videoLoaded = false;
      const LOAD_TIMEOUT_MS = 40000;

      try {
        video.src = loadUrl;
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            if (isLocalStream) {
              reject(new Error('本地流加载超时（已等 ' + LOAD_TIMEOUT_MS / 1000 + 's），请确认本地后端 server-local-express 已启动且创量目录配置正确'));
            } else if (usingProxy) {
              reject(new Error('视频加载超时（代理或上游较慢，已等 ' + LOAD_TIMEOUT_MS / 1000 + 's）'));
            } else {
              reject(new Error('视频加载超时（可能CORS限制）'));
            }
          }, LOAD_TIMEOUT_MS);

          video.onloadedmetadata = () => {
            clearTimeout(timeout);
            videoLoaded = true;
            resolve();
          };

          video.onerror = async () => {
            clearTimeout(timeout);
            if (isLocalStream) {
              reject(new Error('本地流加载失败，请确认本地后端已启动且文件路径正确'));
            } else if (usingProxy) {
              try {
                const r = await fetch(loadUrl, { method: 'HEAD', mode: 'cors' });
                if (!r.ok) {
                  reject(new Error(`视频加载失败：代理返回 ${r.status}，请检查视频链接是否有效或是否被源站拦截`));
                } else {
                  reject(new Error('视频加载失败：代理返回 200 但视频无法解码，可能格式或编码不支持'));
                }
              } catch (fetchErr: any) {
                reject(new Error(`视频加载失败：请求代理异常（${fetchErr?.message || '网络/跨域' }），请确认 video-proxy 已部署且前端能访问 Supabase 域名`));
              }
            } else {
              reject(new Error('视频加载失败（CORS限制，请配置 VITE_SUPABASE_URL 并部署 video-proxy）'));
            }
          };
        });

        if (videoLoaded) {
          const coverImage = await extractVideoFrameAtTimeFromElement(video, 0);
          features.coverImage = coverImage;

          const duration = video.duration;
          const keyFrameTimes = [duration * 0.33, duration * 0.67, duration - 0.1];
          const keyFrames: string[] = [];

          for (const time of keyFrameTimes) {
            try {
              const frame = await extractVideoFrameAtTimeFromElement(video, time);
              if (frame) keyFrames.push(frame);
            } catch (e) {
              console.warn(`提取关键帧失败 (${time}s):`, e);
            }
          }

          features.keyFrames = keyFrames;
          features.metadata = {
            duration,
            resolution: `${video.videoWidth}x${video.videoHeight}`
          };
        }
      } catch (videoError: any) {
        const label = url.includes('/api/local-video/') ? '本地流' : '视频';
        console.warn(`${label}加载失败:`, videoError.message);
        // 不抛出错误，返回空特征，让调用方决定如何处理
      } finally {
        video.remove();
      }
    }

    // 生成内容描述（如果有封面图且未要求跳过，才调 AI）
    if (features.coverImage && !options?.skipDescription) {
      try {
        features.contentDescription = await generateVideoDescriptionFromImage(features.coverImage);
      } catch (e) {
        console.warn('生成内容描述失败:', e);
      }
    } else if (!features.coverImage) {
      features.contentDescription = url.includes('/api/local-video/')
        ? '视频内容（无法提取封面图，请检查本地流或文件）'
        : '视频内容（无法提取封面图，可能受CORS限制）';
    }
  } catch (error: any) {
    console.error('从URL提取特征失败:', error);
    // 不抛出错误，返回空特征
    features.contentDescription = '视频内容（特征提取失败）';
  }

  return features;
}

/**
 * 提取视频帧（首帧）
 */
async function extractVideoFrame(file: File, time: number = 0): Promise<string> {
  return extractVideoFrameAtTime(file, time);
}

/**
 * 在指定时间提取视频帧
 */
async function extractVideoFrameAtTime(file: File, time: number): Promise<string> {
  const video = document.createElement('video');
  const videoUrl = URL.createObjectURL(file);
  video.src = videoUrl;
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = 'anonymous';

  return new Promise((resolve, reject) => {
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(time, video.duration - 0.1);
      
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('无法创建canvas上下文'));
          return;
        }
        
        ctx.drawImage(video, 0, 0);
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        video.remove();
        revokeObjectURLLater(videoUrl);
        resolve(base64);
      };
      
      video.onerror = () => {
        video.remove();
        revokeObjectURLLater(videoUrl);
        reject(new Error('视频加载失败'));
      };
    };
    
    video.onerror = () => {
      video.remove();
      revokeObjectURLLater(videoUrl);
      reject(new Error('视频加载失败'));
    };
    
    setTimeout(() => {
      video.remove();
      revokeObjectURLLater(videoUrl);
      reject(new Error('视频加载超时'));
    }, 10000);
  });
}

/**
 * 从video元素在指定时间提取帧
 */
async function extractVideoFrameAtTimeFromElement(video: HTMLVideoElement, time: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('无法创建canvas上下文'));
        return;
      }
      
      ctx.drawImage(video, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg', 0.8);
      resolve(base64);
    };
    
    video.addEventListener('seeked', onSeeked);
    video.currentTime = Math.min(time, video.duration - 0.1);
    
    setTimeout(() => {
      video.removeEventListener('seeked', onSeeked);
      reject(new Error('视频定位超时'));
    }, 5000);
  });
}

/**
 * URL转base64
 */
async function urlToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error: any) {
    throw new Error(`图片加载失败: ${extractErrorMessage(error)}`);
  }
}

/**
 * 生成视频内容描述
 */
async function generateVideoDescription(file: File, coverImage?: string): Promise<string> {
  try {
    let imageData = coverImage;
    if (!imageData) {
      // 如果没有封面，提取首帧
      imageData = await extractVideoFrame(file, 0);
    }

    const model = getAIDefaultModel({ forDedup: true });
    const response = await safeChatCompletionForDedup({
      model,
      messages: [
        {
          role: 'system',
          content: '你是一位专业的视频内容分析师。请简洁地描述视频的主要内容、场景、人物、动作等关键信息。'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '请描述这个视频的主要内容，包括场景、人物、动作、风格等关键信息。描述要简洁准确，用于视频去重对比。'
            },
            {
              type: 'image_url',
              image_url: { url: imageData }
            }
          ]
        }
      ],
      temperature: 0.3
    });

    return response.trim();
  } catch (error: any) {
    console.warn('生成视频描述失败:', error);
    return '无法生成描述';
  }
}

/**
 * 从图片生成视频描述
 */
async function generateVideoDescriptionFromImage(imageBase64: string): Promise<string> {
  try {
    const model = getAIDefaultModel({ forDedup: true });
    const response = await safeChatCompletionForDedup({
      model,
      messages: [
        {
          role: 'system',
          content: '你是一位专业的视频内容分析师。请简洁地描述视频的主要内容、场景、人物、动作等关键信息。'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '请描述这个视频的主要内容，包括场景、人物、动作、风格等关键信息。描述要简洁准确，用于视频去重对比。'
            },
            {
              type: 'image_url',
              image_url: { url: imageBase64 }
            }
          ]
        }
      ],
      temperature: 0.3
    });

    return response.trim();
  } catch (error: any) {
    console.warn('生成视频描述失败:', error);
    return '无法生成描述';
  }
}

/** 组装「视频A + 视频B」的所有帧（首帧+关键帧），用于一次发给 AI 做整体对比；每侧最多 5 张避免超限 */
function buildTwoVideosFrameContent(
  features1: VideoFeatures,
  features2: VideoFeatures
): Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> {
  const maxFramesPerVideo = 5;
  const content: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = [];

  const frames1: string[] = [];
  if (features1.coverImage) frames1.push(features1.coverImage);
  if (features1.keyFrames?.length) {
    for (let i = 0; i < Math.min(features1.keyFrames.length, maxFramesPerVideo - frames1.length); i++) {
      frames1.push(features1.keyFrames[i]);
    }
  }
  const frames2: string[] = [];
  if (features2.coverImage) frames2.push(features2.coverImage);
  if (features2.keyFrames?.length) {
    for (let i = 0; i < Math.min(features2.keyFrames.length, maxFramesPerVideo - frames2.length); i++) {
      frames2.push(features2.keyFrames[i]);
    }
  }

  content.push({
    type: 'text',
    text: '下面按顺序给出【视频A】的帧（首帧 + 关键帧），然后是【视频B】的帧。请基于两段视频的完整画面序列（而非单张封面）评估整体相似度。'
  });
  content.push({ type: 'text', text: '【视频A】帧序列：' });
  frames1.forEach((url) => content.push({ type: 'image_url', image_url: { url } }));
  content.push({ type: 'text', text: '【视频B】帧序列：' });
  frames2.forEach((url) => content.push({ type: 'image_url', image_url: { url } }));
  content.push({
    type: 'text',
    text: '请对比以上两段视频（首帧+关键帧）的整体内容，返回 JSON。'
  });

  return content;
}

/**
 * 一次 API 调用完成：将两个视频的「首帧+关键帧」都发给 AI，做整体视觉+内容相似度与综合分析。
 * 若双方有关键帧则发多图；否则仅发两张封面图（兼容旧行为）。
 */
async function compareTwoVideosInOneCall(
  features1: VideoFeatures,
  features2: VideoFeatures
): Promise<{
  visualSimilarity: number;
  contentSimilarity: number;
  analysis: string;
  similarities: string[];
  differences: string[];
  relationshipType?: RelationshipType;
  sharedSegments?: SharedSegment[];
}> {
  const model = getAIDefaultModel({ forDedup: true });
  const hasMultipleFrames1 = !!(features1.coverImage && (features1.keyFrames?.length ?? 0) > 0);
  const hasMultipleFrames2 = !!(features2.coverImage && (features2.keyFrames?.length ?? 0) > 0);
  const useFullFrames = hasMultipleFrames1 || hasMultipleFrames2;

  const systemPrompt = useFullFrames
    ? `你是一位专业的视频对比专家。你会看到【视频A】和【视频B】各自的若干帧（首帧+关键帧，按时间顺序）。请基于两段视频的完整画面序列：
1. 分别用一两句话描述视频A、视频B的整体内容（description1, description2）；
2. 评估视觉相似度 0-1（visualSimilarity）：画面、构图、色彩、节奏感等；
3. 评估内容/语义相似度 0-1（contentSimilarity）：主题、场景、人物、剧情走向等；
4. 判定 relationshipType：全片雷同（整体几乎一致）/片段复用（部分时间段同一素材，混剪）/创意借鉴/无关。若为"片段复用"，必须填 sharedSegments，描述哪些帧区间对应同一素材：videoARange、videoBRange 格式如 "开头""1/3处""结尾" 或 "0:05-0:18"，description 为该片段描述；
5. 写一段综合分析（analysis），明确说明关系类型及理由；
6. 列出相似点数组（similarities）和差异点数组（differences）。

只返回 JSON，不要其他文字：
{"description1":"...","description2":"...","visualSimilarity":0.0-1.0,"contentSimilarity":0.0-1.0,"relationshipType":"全片雷同|片段复用|创意借鉴|无关","sharedSegments":[{"videoARange":"...","videoBRange":"...","description":"..."}],"analysis":"...","similarities":["..."],"differences":["..."]}
sharedSegments 仅当 relationshipType 为 "片段复用" 时填写，否则为 []。`
    : `你是一位专业的视频对比专家。给定两张视频封面图，请：
1. 分别用一句话描述每张图的内容（description1, description2）；
2. 评估视觉相似度 0-1（visualSimilarity）：画面、构图、色彩等；
3. 评估内容/语义相似度 0-1（contentSimilarity）：主题、场景、人物等；
4. 判定 relationshipType：全片雷同/片段复用/创意借鉴/无关。若为"片段复用"填 sharedSegments，否则为 []；
5. 写一段综合分析（analysis）：明确指出关系类型并说明理由；
6. 列出相似点数组（similarities）和差异点数组（differences）。

只返回 JSON，不要其他文字：
{"description1":"...","description2":"...","visualSimilarity":0.0-1.0,"contentSimilarity":0.0-1.0,"relationshipType":"全片雷同|片段复用|创意借鉴|无关","sharedSegments":[],"analysis":"...","similarities":["..."],"differences":["..."]}`;

  const userContent = useFullFrames
    ? buildTwoVideosFrameContent(features1, features2)
    : [
        { type: 'text' as const, text: '请对比以下两张视频封面图，返回上述 JSON。' },
        { type: 'image_url' as const, image_url: { url: features1.coverImage! } },
        { type: 'image_url' as const, image_url: { url: features2.coverImage! } }
      ];

  const response = await safeChatCompletionForDedup({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ],
    temperature: 0.3
  });

  try {
    const cleaned = response.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const result = JSON.parse(cleaned);
    const relationshipType = ['全片雷同', '片段复用', '创意借鉴', '无关'].includes(result.relationshipType)
      ? (result.relationshipType as RelationshipType)
      : undefined;
    const sharedSegmentsRaw = Array.isArray(result.sharedSegments) ? result.sharedSegments : [];
    const sharedSegments: SharedSegment[] = sharedSegmentsRaw
      .filter((s: any) => s && typeof s.videoARange === 'string' && typeof s.videoBRange === 'string')
      .map((s: any) => ({
        videoARange: s.videoARange,
        videoBRange: s.videoBRange,
        description: typeof s.description === 'string' ? s.description : ''
      }));
    return {
      visualSimilarity: Math.max(0, Math.min(1, Number(result.visualSimilarity) || 0)),
      contentSimilarity: Math.max(0, Math.min(1, Number(result.contentSimilarity) || 0)),
      analysis: result.analysis || '分析完成',
      similarities: Array.isArray(result.similarities) ? result.similarities : [],
      differences: Array.isArray(result.differences) ? result.differences : [],
      relationshipType,
      sharedSegments: sharedSegments.length > 0 ? sharedSegments : undefined
    };
  } catch {
    return {
      visualSimilarity: 0,
      contentSimilarity: 0,
      analysis: '解析失败',
      similarities: [],
      differences: []
    };
  }
}

/**
 * 对比两个视频的相似度
 * 当两张都有封面图时，一次 API 完成视觉+内容+分析，最多 1 次请求；否则沿用分步请求。
 */
export async function compareVideos(
  features1: VideoFeatures,
  features2: VideoFeatures
): Promise<ComparisonResult> {
  try {
    let visualSimilarity = 0;
    let contentSimilarity = 0;
    let analysis = '';
    let similarities: string[] = [];
    let differences: string[] = [];
    let relationshipType: RelationshipType | undefined;
    let sharedSegments: SharedSegment[] | undefined;

    // 两张都有封面时：一次请求完成视觉+内容+分析（1v1 最多 1 次 API）
    if (features1.coverImage && features2.coverImage) {
      const one = await compareTwoVideosInOneCall(features1, features2);
      visualSimilarity = one.visualSimilarity;
      contentSimilarity = one.contentSimilarity;
      analysis = one.analysis;
      similarities = one.similarities;
      differences = one.differences;
      relationshipType = one.relationshipType;
      sharedSegments = one.sharedSegments;
    } else {
      // 无封面或仅一方有：沿用分步请求（兼容库内无图场景）
      if (features1.coverImage && features2.coverImage) {
        visualSimilarity = await compareImages(features1.coverImage, features2.coverImage);
      }
      if (features1.contentDescription && features2.contentDescription) {
        contentSimilarity = await compareTexts(
          features1.contentDescription,
          features2.contentDescription
        );
      }
      const metaSim = (features1.metadata && features2.metadata)
        ? compareMetadata(features1.metadata, features2.metadata)
        : 0;
      const ana = await analyzeSimilarity(
        features1,
        features2,
        visualSimilarity,
        contentSimilarity,
        metaSim
      );
      analysis = ana.analysis;
      similarities = ana.similarities;
      differences = ana.differences;
    }

    // 元数据相似度（本地计算，不占 API）
    const metadataSimilarity =
      features1.metadata && features2.metadata
        ? compareMetadata(features1.metadata, features2.metadata)
        : 0;

    // 权重 视觉40% + 内容30% + 元数据20%，归一化使三项全满时综合为 100%
    const weightSum = 0.4 + 0.3 + 0.2;
    const similarityScore =
      (visualSimilarity * 0.4 + contentSimilarity * 0.3 + metadataSimilarity * 0.2) / weightSum;

    // 判定标准：强化抄袭 vs 借鉴的界限
    // >= 80%: 高度相似，判定为疑似抄袭（Plagiarism）
    // 50% - 80%: 有相似元素，判定为借鉴/参考（Inspired）
    // < 50%: 差异较大，判定为原创（Original）
    let verdict: 'Plagiarism' | 'Inspired' | 'Original';
    if (similarityScore >= 0.8) verdict = 'Plagiarism';
    else if (similarityScore >= 0.5) verdict = 'Inspired';
    else verdict = 'Original';

    return {
      similarityScore,
      verdict,
      details: {
        visualSimilarity,
        contentSimilarity,
        metadataSimilarity,
        analysis,
        similarities,
        differences,
        relationshipType,
        sharedSegments
      }
    };
  } catch (error: any) {
    console.error('视频对比失败:', error);
    throw new Error(`视频对比失败: ${extractErrorMessage(error)}`);
  }
}

/**
 * 对比两张图片的相似度
 */
async function compareImages(image1: string, image2: string): Promise<number> {
  try {
    const model = getAIDefaultModel({ forDedup: true });
    const response = await safeChatCompletionForDedup({
      model,
      messages: [
        {
          role: 'system',
          content: '你是一位专业的图像对比专家。请对比两张图片的相似度，返回0-1之间的分数（0=完全不同，1=完全相同）。只返回数字，不要其他文字。'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '请对比这两张图片的相似度，考虑视觉元素、构图、色彩、内容等。返回0-1之间的相似度分数。'
            },
            {
              type: 'image_url',
              image_url: { url: image1 }
            },
            {
              type: 'image_url',
              image_url: { url: image2 }
            }
          ]
        }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    // 解析响应
    try {
      const cleaned = response.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      const result = JSON.parse(cleaned);
      return Math.max(0, Math.min(1, parseFloat(result.similarity || result.score || 0)));
    } catch {
      // 如果解析失败，尝试提取数字
      const match = response.match(/[\d.]+/);
      return match ? Math.max(0, Math.min(1, parseFloat(match[0]))) : 0;
    }
  } catch (error: any) {
    console.warn('图片对比失败:', error);
    return 0;
  }
}

/**
 * 对比两段文本的相似度
 */
async function compareTexts(text1: string, text2: string): Promise<number> {
  try {
    const model = getAIDefaultModel({ forDedup: true });
    const response = await safeChatCompletionForDedup({
      model,
      messages: [
        {
          role: 'system',
          content: '你是一位专业的文本相似度分析专家。请对比两段文本的语义相似度，返回0-1之间的分数（0=完全不同，1=完全相同）。只返回JSON格式：{"similarity": 0.0-1.0}'
        },
        {
          role: 'user',
          content: `请对比以下两段文本的语义相似度：

文本1：${text1}

文本2：${text2}

返回JSON格式：{"similarity": 0.0-1.0}`
        }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    try {
      const cleaned = response.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      const result = JSON.parse(cleaned);
      return Math.max(0, Math.min(1, parseFloat(result.similarity || result.score || 0)));
    } catch {
      return 0;
    }
  } catch (error: any) {
    console.warn('文本对比失败:', error);
    return 0;
  }
}

/**
 * 对比元数据相似度
 */
function compareMetadata(meta1: VideoFeatures['metadata'], meta2: VideoFeatures['metadata']): number {
  if (!meta1 || !meta2) return 0;

  let score = 0;
  let count = 0;

  // 时长相似度（差异在5%以内得1分，否则按比例扣分）
  if (meta1.duration && meta2.duration) {
    const diff = Math.abs(meta1.duration - meta2.duration);
    const avg = (meta1.duration + meta2.duration) / 2;
    const ratio = diff / avg;
    score += ratio <= 0.05 ? 1 : Math.max(0, 1 - (ratio - 0.05) * 2);
    count++;
  }

  // 分辨率相似度
  if (meta1.resolution && meta2.resolution) {
    score += meta1.resolution === meta2.resolution ? 1 : 0;
    count++;
  }

  // 格式相似度
  if (meta1.format && meta2.format) {
    score += meta1.format === meta2.format ? 1 : 0;
    count++;
  }

  return count > 0 ? score / count : 0;
}

/**
 * AI分析相似点和差异点
 */
async function analyzeSimilarity(
  features1: VideoFeatures,
  features2: VideoFeatures,
  visualSimilarity: number,
  contentSimilarity: number,
  metadataSimilarity: number
): Promise<{ analysis: string; similarities: string[]; differences: string[] }> {
  try {
    const model = getAIDefaultModel({ forDedup: true });
    const prompt = `请分析两个视频的相似点和差异点。

视频1描述：${features1.contentDescription || '无描述'}
视频2描述：${features2.contentDescription || '无描述'}

相似度分数：
- 视觉相似度：${(visualSimilarity * 100).toFixed(1)}%
- 内容相似度：${(contentSimilarity * 100).toFixed(1)}%
- 元数据相似度：${(metadataSimilarity * 100).toFixed(1)}%

请返回JSON格式：
{
  "analysis": "综合分析说明",
  "similarities": ["相似点1", "相似点2", ...],
  "differences": ["差异点1", "差异点2", ...]
}`;

    const response = await safeChatCompletionForDedup({
      model,
      messages: [
        {
          role: 'system',
          content: '你是一位专业的视频对比分析专家。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    try {
      const cleaned = response.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      const result = JSON.parse(cleaned);
      return {
        analysis: result.analysis || '分析完成',
        similarities: Array.isArray(result.similarities) ? result.similarities : [],
        differences: Array.isArray(result.differences) ? result.differences : []
      };
    } catch {
      return {
        analysis: '分析完成',
        similarities: [],
        differences: []
      };
    }
  } catch (error: any) {
    console.warn('相似度分析失败:', error);
    return {
      analysis: '分析失败',
      similarities: [],
      differences: []
    };
  }
}

/** 查重可选参数：条数限制，用于减少 API 调用（不做时长等元数据预筛） */
export interface CheckDuplicationOptions {
  /** 最多检查条数；不传或 0 表示检查全部 */
  maxItemsToCheck?: number;
}

/**
 * 检查视频与视频库的相似度（带错误处理和中止支持）
 *
 * 查询逻辑：与数据组内每条素材逐一做 1v1 相似度对比；N 条则最多 N 次 AI 对比（库内已存特征的不会重复提取封面/关键帧）。
 * 可通过 maxItemsToCheck 限制最多检查条数。
 *
 * @param libraryFeaturesMap 可选：库内视频 id -> 已算好的特征；有则不再请求代理提取，直接用于对比
 */
export async function checkVideoDuplication(
  targetFeatures: VideoFeatures,
  videoLibrary: VideoLibraryItem[],
  abortSignal?: AbortSignal,
  onProgress?: (current: number, total: number) => void,
  libraryFeaturesMap?: Map<string, VideoFeatures>,
  options?: CheckDuplicationOptions
): Promise<SimilarityResult[]> {
  const results: SimilarityResult[] = [];
  let successCount = 0;
  let errorCount = 0;
  const MAX_CONSECUTIVE_ERRORS = 5; // 连续错误阈值
  let consecutiveErrors = 0;
  const errorSet = new Set<string>(); // 记录已报错的错误类型，避免重复报错

  // 可选：最多检查前 N 条（不做时长等元数据预筛）
  let list = videoLibrary;
  if (options?.maxItemsToCheck != null && options.maxItemsToCheck > 0) {
    list = list.slice(0, options.maxItemsToCheck);
  }

  for (let i = 0; i < list.length; i++) {
    // 检查是否已中止
    if (abortSignal?.aborted) {
      console.log('去重检查已中止');
      break;
    }

    const video = list[i];
    onProgress?.(i + 1, list.length);

    try {
      // 仅读本地：优先使用已存特征，否则只从本地创量目录读取，不拉取 previewUrl
      let libraryFeatures: VideoFeatures | undefined = libraryFeaturesMap?.get(video.id);
      if (!libraryFeatures) {
        const localUrl = video.title ? await getLocalVideoUrl(video.title) : null;
        if (!localUrl) {
          errorCount++;
          consecutiveErrors++;
          if (!errorSet.has('NO_LOCAL')) {
            console.warn(`⚠️ 无本地文件已跳过（仅读本地，不拉取链接）: ${video.title || video.id}`);
            errorSet.add('NO_LOCAL');
          }
          if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) break;
          continue;
        }
        libraryFeatures = await extractVideoFeaturesFromUrl(localUrl);
      }

      // 检查是否已中止
      if (abortSignal?.aborted) {
        break;
      }

      // 如果特征提取失败（没有封面图），跳过这个视频
      if (!libraryFeatures.coverImage && !libraryFeatures.contentDescription) {
        errorCount++;
        consecutiveErrors++;
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) break;
        continue;
      }

      // 重置连续错误计数
      consecutiveErrors = 0;

      // 对比相似度
      const comparison = await compareVideos(targetFeatures, libraryFeatures);

      // 检查是否已中止
      if (abortSignal?.aborted) {
        break;
      }

      results.push({
        videoId: video.id,
        videoTitle: video.title,
        coverUrl: video.coverUrl,
        similarityScore: comparison.similarityScore,
        verdict: comparison.verdict,
        details: {
          visualSimilarity: comparison.details.visualSimilarity,
          contentSimilarity: comparison.details.contentSimilarity,
          metadataSimilarity: comparison.details.metadataSimilarity,
          analysis: comparison.details.analysis
        }
      });
      successCount++;
    } catch (error: any) {
      errorCount++;
      consecutiveErrors++;
      
      // 只记录不同类型的错误，避免重复报错
      const errorMessage = error.message || String(error);
      const errorType = errorMessage.includes('CORS') ? 'CORS_ERROR' : 
                       errorMessage.includes('500') ? 'SERVER_ERROR' : 
                       errorMessage.includes('timeout') ? 'TIMEOUT_ERROR' : 'OTHER_ERROR';
      
      if (!errorSet.has(errorType)) {
        console.warn(`⚠️ ${errorType === 'CORS_ERROR' ? 'CORS限制' : errorType === 'SERVER_ERROR' ? '服务器错误' : '网络错误'}：已跳过 ${errorCount} 个视频`);
        errorSet.add(errorType);
      }
      
      // 如果连续错误太多，停止检查
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        console.warn(`⚠️ 连续 ${MAX_CONSECUTIVE_ERRORS} 个错误，停止检查`);
        break;
      }
      
      // 继续处理下一个视频，不阻塞整个流程
    }
  }

  if (!abortSignal?.aborted) {
    console.log(`去重检查完成：成功 ${successCount} 个，失败 ${errorCount} 个`);
  }

  // 按相似度降序排列
  results.sort((a, b) => b.similarityScore - a.similarityScore);

  return results;
}
