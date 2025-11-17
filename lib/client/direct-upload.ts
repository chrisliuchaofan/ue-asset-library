'use client';

interface DirectUploadOptions {
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

interface DirectUploadResponse {
  uploadUrl: string;
  fileUrl: string;
  key: string;
  fields: Record<string, string>;
}

interface DirectUploadResult {
  fileUrl: string;
  key: string;
}

export async function requestDirectUpload(file: File): Promise<DirectUploadResponse> {
  const response = await fetch('/api/oss/direct-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || '获取上传凭证失败');
  }

  const data = (await response.json()) as DirectUploadResponse;
  return data;
}

function reportUploadMetric(payload: Record<string, unknown>) {
  try {
    const body = JSON.stringify({
      ...payload,
      timestamp: Date.now(),
    });

    if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/log', blob);
    } else {
      void fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      });
    }
  } catch (error) {
    console.warn('上报上传耗时失败', error);
  }
}

export async function uploadFileDirect(
  file: File,
  options: DirectUploadOptions = {}
): Promise<DirectUploadResult> {
  const label = `direct-upload:${file.name}`;
  const start = performance.now();
  console.time(label);

  try {
    const config = await requestDirectUpload(file);
    const formData = new FormData();

    Object.entries(config.fields).forEach(([key, value]) => {
      formData.append(key, value);
    });

    formData.append('file', file);

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      let uploadStartTime = Date.now();
      let lastProgressTime = Date.now();
      let hasProgress = false;
      
      // 根据文件大小动态计算超时时间
      // 假设最低上传速度为 100KB/s，至少保留 60 秒基础超时
      // 对于大文件，按 100KB/s 计算所需时间，再加上 60 秒缓冲
      const minTimeout = 60000; // 最小 60 秒
      const estimatedSpeed = 100 * 1024; // 100KB/s
      const estimatedTime = Math.ceil(file.size / estimatedSpeed);
      const timeout = Math.max(minTimeout, estimatedTime * 1000 + 60000); // 计算时间 + 60秒缓冲
      
      // 最大超时时间限制为 10 分钟（600秒），避免无限等待
      const maxTimeout = 600000; // 10 分钟
      const finalTimeout = Math.min(timeout, maxTimeout);
      
      // 检查是否有进度更新的超时（如果长时间没有进度更新，可能是网络问题）
      const progressTimeout = 120000; // 2 分钟无进度更新则超时
      let progressTimeoutId: NodeJS.Timeout | null = null;
      
      const timeoutId = setTimeout(() => {
        if (!hasProgress) {
          xhr.abort();
          reject(new Error(`上传失败：超时（${finalTimeout / 1000}秒内无响应）`));
        }
      }, finalTimeout);
      
      if (options.signal) {
        options.signal.addEventListener(
          'abort',
          () => {
            clearTimeout(timeoutId);
            xhr.abort();
            reject(new DOMException('上传已取消', 'AbortError'));
          },
          { once: true }
        );
      }

      if (options.onProgress) {
        // 初始化进度超时检查
        const resetProgressTimeout = () => {
          if (progressTimeoutId) {
            clearTimeout(progressTimeoutId);
          }
          // 如果 2 分钟内没有新的进度更新，认为上传卡住了
          progressTimeoutId = setTimeout(() => {
            xhr.abort();
            reject(new Error(`上传失败：上传进度停滞超过 ${progressTimeout / 1000} 秒`));
          }, progressTimeout);
        };
        
        // 初始设置进度超时检查
        resetProgressTimeout();
        
        xhr.upload.addEventListener('progress', (event) => {
          hasProgress = true;
          lastProgressTime = Date.now();
          
          // 重置进度超时检查（每次有进度更新时重置计时器）
          resetProgressTimeout();
          
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            options.onProgress?.(percent);
          }
        });
      }

      xhr.onerror = () => {
        clearTimeout(timeoutId);
        if (progressTimeoutId) clearTimeout(progressTimeoutId);
        const errorDetails = {
          status: xhr.status,
          statusText: xhr.statusText,
          readyState: xhr.readyState,
          uploadUrl: config.uploadUrl,
          fileSize: file.size,
          fileName: file.name,
        };
        console.error('[直接上传] 网络错误详情:', errorDetails);
        reject(new Error(`上传失败：网络错误 (状态: ${xhr.status}, 就绪状态: ${xhr.readyState})`));
      };
      
      xhr.onabort = () => {
        clearTimeout(timeoutId);
        if (progressTimeoutId) clearTimeout(progressTimeoutId);
        reject(new DOMException('上传已取消', 'AbortError'));
      };
      
      xhr.ontimeout = () => {
        clearTimeout(timeoutId);
        if (progressTimeoutId) clearTimeout(progressTimeoutId);
        reject(new Error(`上传失败：请求超时（${finalTimeout / 1000}秒）`));
      };
      
      xhr.onload = () => {
        clearTimeout(timeoutId);
        if (progressTimeoutId) clearTimeout(progressTimeoutId);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          const errorDetails = {
            status: xhr.status,
            statusText: xhr.statusText,
            responseText: xhr.responseText?.substring(0, 200),
            uploadUrl: config.uploadUrl,
          };
          console.error('[直接上传] HTTP错误详情:', errorDetails);
          reject(new Error(`上传失败: HTTP ${xhr.status} ${xhr.statusText}`));
        }
      };

      try {
        xhr.open('POST', config.uploadUrl);
        // 设置超时（使用动态计算的超时时间）
        xhr.timeout = finalTimeout;
        console.log('[直接上传] 开始上传到OSS:', {
          uploadUrl: config.uploadUrl,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          timeout: `${finalTimeout / 1000}秒`,
        });
        xhr.send(formData);
        uploadStartTime = Date.now();
      } catch (error) {
        clearTimeout(timeoutId);
        if (progressTimeoutId) clearTimeout(progressTimeoutId);
        console.error('[直接上传] 发送请求失败:', error);
        reject(new Error(`上传失败：发送请求时出错 - ${error instanceof Error ? error.message : String(error)}`));
      }
    });

    const duration = performance.now() - start;
    console.timeEnd(label);
    reportUploadMetric({
      event: 'direct-upload',
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      durationMs: Number(duration.toFixed(2)),
    });

    return {
      fileUrl: config.fileUrl,
      key: config.key,
    };
  } catch (error) {
    console.timeEnd(label);
    reportUploadMetric({
      event: 'direct-upload-error',
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

