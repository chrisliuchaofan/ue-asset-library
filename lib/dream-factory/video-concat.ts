/**
 * 视频拼接工具（客户端）
 * 使用 MediaRecorder API 拼接多个视频片段
 */

import type { Scene } from '@/types/dream-factory/types';

/**
 * 下载视频并转换为 Blob
 */
async function fetchVideoAsBlob(url: string): Promise<Blob> {
  // 如果是代理 URL，直接使用；否则通过代理获取
  const fetchUrl = url.startsWith('/api/video-proxy') ? url : `/api/video-proxy?url=${encodeURIComponent(url)}`;
  
  const response = await fetch(fetchUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch video: ${response.statusText}`);
  }
  return await response.blob();
}

/**
 * 拼接多个视频片段
 * 注意：这个方法会重新编码视频，可能会降低质量
 * 但对于快速实现功能已经足够
 */
export async function concatVideos(scenes: Scene[]): Promise<Blob> {
  console.log('[视频拼接] 开始拼接视频，场景数量:', scenes.length);

  // 创建 canvas 和 video 元素用于录制
  const canvas = document.createElement('canvas');
  canvas.width = 1920; // 720P 宽度
  canvas.height = 1080; // 720P 高度
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('无法创建 canvas context');
  }

  const videoElements: HTMLVideoElement[] = [];
  const chunks: Blob[] = [];

  try {
    // 1. 下载所有视频并创建 video 元素
    console.log('[视频拼接] 下载视频片段...');
    for (const scene of scenes) {
      if (!scene.videoUrl) {
        console.warn('[视频拼接] 场景缺少视频URL，跳过:', scene.id);
        continue;
      }

      const blob = await fetchVideoAsBlob(scene.videoUrl);
      const videoUrl = URL.createObjectURL(blob);
      
      const video = document.createElement('video');
      video.src = videoUrl;
      video.crossOrigin = 'anonymous';
      video.preload = 'auto';
      
      // 等待视频加载完成
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => {
          // 确保视频尺寸与 canvas 匹配
          video.width = canvas.width;
          video.height = canvas.height;
          resolve();
        };
        video.onerror = () => reject(new Error(`Failed to load video: ${scene.videoUrl}`));
        video.load();
      });

      videoElements.push(video);
    }

    if (videoElements.length === 0) {
      throw new Error('没有可拼接的视频');
    }

    // 2. 使用 MediaRecorder 录制
    console.log('[视频拼接] 开始录制合并视频...');
    const stream = canvas.captureStream(30); // 30 FPS
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9', // 使用 webm 格式
      videoBitsPerSecond: 5000000, // 5 Mbps
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    await new Promise<void>((resolve, reject) => {
      mediaRecorder.onstop = () => {
        console.log('[视频拼接] 录制完成');
        resolve();
      };
      mediaRecorder.onerror = (error) => {
        console.error('[视频拼接] 录制错误:', error);
        reject(error);
      };

      mediaRecorder.start();

      // 依次播放每个视频并绘制到 canvas
      let currentIndex = 0;
      const playNext = async () => {
        if (currentIndex >= videoElements.length) {
          mediaRecorder.stop();
          return;
        }

        const video = videoElements[currentIndex];
        video.currentTime = 0;

        await new Promise<void>((resolve) => {
          video.onended = () => {
            currentIndex++;
            setTimeout(playNext, 100); // 短暂间隔
            resolve();
          };

          // 绘制循环
          const drawFrame = () => {
            if (!video.ended && !video.paused) {
              // 填充黑色背景
              ctx.fillStyle = 'black';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              
              // 计算居中绘制位置
              const videoAspect = video.videoWidth / video.videoHeight;
              const canvasAspect = canvas.width / canvas.height;
              
              let drawWidth = canvas.width;
              let drawHeight = canvas.height;
              let drawX = 0;
              let drawY = 0;
              
              if (videoAspect > canvasAspect) {
                // 视频更宽，以宽度为准
                drawHeight = canvas.width / videoAspect;
                drawY = (canvas.height - drawHeight) / 2;
              } else {
                // 视频更高，以高度为准
                drawWidth = canvas.height * videoAspect;
                drawX = (canvas.width - drawWidth) / 2;
              }
              
              ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight);
              requestAnimationFrame(drawFrame);
            }
          };

          video.play();
          drawFrame();
        });
      };

      // 延迟一点开始，确保 MediaRecorder 已准备好
      setTimeout(playNext, 100);
    });

    // 3. 合并所有 chunks
    const finalBlob = new Blob(chunks, { type: 'video/webm' });
    console.log('[视频拼接] 拼接完成，最终大小:', (finalBlob.size / 1024 / 1024).toFixed(2), 'MB');

    // 清理
    videoElements.forEach(video => {
      URL.revokeObjectURL(video.src);
      video.remove();
    });
    canvas.remove();

    return finalBlob;
  } catch (error) {
    // 清理资源
    videoElements.forEach(video => {
      URL.revokeObjectURL(video.src);
      video.remove();
    });
    canvas.remove();
    
    console.error('[视频拼接] 拼接失败:', error);
    throw error;
  }
}









