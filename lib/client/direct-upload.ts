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

export async function uploadFileDirect(
  file: File,
  options: DirectUploadOptions = {}
): Promise<DirectUploadResult> {
  const config = await requestDirectUpload(file);
  const formData = new FormData();

  Object.entries(config.fields).forEach(([key, value]) => {
    formData.append(key, value);
  });

  formData.append('file', file);

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    if (options.signal) {
      options.signal.addEventListener(
        'abort',
        () => {
          xhr.abort();
          reject(new DOMException('上传已取消', 'AbortError'));
        },
        { once: true }
      );
    }

    if (options.onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          options.onProgress?.(percent);
        }
      });
    }

    xhr.onerror = () => reject(new Error('上传失败：网络错误'));
    xhr.onabort = () => reject(new DOMException('上传已取消', 'AbortError'));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`上传失败: HTTP ${xhr.status}`));
      }
    };

    xhr.open('POST', config.uploadUrl);
    xhr.send(formData);
  });

  return {
    fileUrl: config.fileUrl,
    key: config.key,
  };
}

