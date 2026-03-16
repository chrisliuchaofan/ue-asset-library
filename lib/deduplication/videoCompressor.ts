/**
 * 浏览器端视频压缩
 * 使用 Canvas + MediaRecorder，无需 FFmpeg，兼容性好
 * 将大视频压缩至目标大小以内，便于 1v1 对比时发完整视频给 AI
 */

const DEFAULT_MAX_SIZE_BYTES = 4 * 1024 * 1024; // 4MB，双视频总请求体<10MB 避免 API 400

/** 获取视频时长（秒），用于估算压缩等待时间 */
export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const d = video.duration;
      URL.revokeObjectURL(video.src);
      resolve(isFinite(d) && d > 0 ? d : 0);
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('无法读取视频时长'));
    };
    video.src = URL.createObjectURL(file);
  });
}
const MAX_WIDTH = 1280;
const MAX_HEIGHT = 720;
const TARGET_FPS = 15; // 对比用 15fps 足够，减小体积

export interface CompressOptions {
  /** 目标最大体积（字节），默认 24MB */
  maxSizeBytes?: number;
  /** 压缩进度回调 0-1 */
  onProgress?: (progress: number) => void;
  /** 是否中止 */
  signal?: AbortSignal;
}

/**
 * 将视频文件压缩至目标大小以内
 * @returns 压缩后的 File（webm 格式），若已符合则返回原文件
 */
export async function compressVideoForComparison(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  if (!file.type.startsWith('video/')) {
    throw new Error('仅支持视频文件');
  }
  const maxSize = options.maxSizeBytes ?? DEFAULT_MAX_SIZE_BYTES;
  if (file.size <= maxSize) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    const url = URL.createObjectURL(file);
    video.src = url;

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('视频加载失败'));
    };

    video.onloadedmetadata = async () => {
      try {
        const duration = video.duration;
        if (duration <= 0 || !isFinite(duration)) {
          throw new Error('无法获取视频时长');
        }

        // 目标码率：使 duration 秒的视频约等于 maxSize
        const targetBitsPerSecond = Math.floor((maxSize * 8 * 0.85) / duration);
        const videoBitsPerSecond = Math.min(2_500_000, Math.max(400_000, targetBitsPerSecond));

        const w = video.videoWidth;
        const h = video.videoHeight;
        let outW = w;
        let outH = h;
        if (w > MAX_WIDTH || h > MAX_HEIGHT) {
          const scale = Math.min(MAX_WIDTH / w, MAX_HEIGHT / h);
          outW = Math.round(w * scale);
          outH = Math.round(h * scale);
        }

        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('无法创建画布');
        }

        const stream = canvas.captureStream(TARGET_FPS);
        const recorder = new MediaRecorder(stream, {
          mimeType: getSupportedMimeType(),
          videoBitsPerSecond,
          audioBitsPerSecond: 0
        });

        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          URL.revokeObjectURL(url);
          const blob = new Blob(chunks, { type: recorder.mimeType });
          const ext = recorder.mimeType.includes('webm') ? 'webm' : 'mp4';
          const outFile = new File([blob], file.name.replace(/\.[^.]+$/, `_compressed.${ext}`), {
            type: recorder.mimeType
          });
          options.onProgress?.(1);
          resolve(outFile);
        };

        recorder.onerror = (e) => {
          URL.revokeObjectURL(url);
          reject(new Error('压缩失败: ' + (e instanceof ErrorEvent ? e.message : '未知错误')));
        };

        video.onended = () => recorder.stop();
        recorder.start(500);

        const frameInterval = 1 / TARGET_FPS;
        let lastDrawTime = 0;

        const drawFrame = () => {
          if (options.signal?.aborted) {
            recorder.stop();
            return;
          }
          const now = performance.now() / 1000;
          if (now - lastDrawTime >= frameInterval) {
            ctx.drawImage(video, 0, 0, outW, outH);
            lastDrawTime = now;
            const progress = duration > 0 ? Math.min(0.95, video.currentTime / duration) : 0;
            options.onProgress?.(progress);
          }
          if (!video.ended && !video.paused) {
            requestAnimationFrame(drawFrame);
          }
        };

        video.play().then(() => {
          requestAnimationFrame(drawFrame);
        }).catch((e) => {
          URL.revokeObjectURL(url);
          reject(new Error('视频播放失败: ' + String(e)));
        });
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    };
  });
}

function getSupportedMimeType(): string {
  const types = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return 'video/webm';
}
