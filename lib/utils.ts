import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getCdnBase(): string {
  return process.env.NEXT_PUBLIC_CDN_BASE || '/';
}

export function getAssetUrl(path: string): string {
  if (!path) return '';
  
  // 如果已经是完整 URL，直接返回
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  const base = getCdnBase();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // 如果 base 是 /，返回相对路径
  if (base === '/' || !base || base.trim() === '') {
    return normalizedPath;
  }
  
  // 构建完整 URL，使用 WHATWG URL API 确保格式正确
  try {
    // 如果 base 是完整 URL，使用 URL 构造函数
    if (base.startsWith('http://') || base.startsWith('https://')) {
      return new URL(normalizedPath, base).toString();
    }
    // 否则直接拼接
    return `${base.replace(/\/+$/, '')}${normalizedPath}`;
  } catch {
    // 如果 URL 构造失败，回退到字符串拼接
    return `${base.replace(/\/+$/, '')}${normalizedPath}`;
  }
}

// 客户端处理 CDN/OSS 资源地址（适用于浏览器环境）
export function getClientAssetUrl(path: string): string {
  if (!path) return '';

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const base = getCdnBase();
  const normalized = path.startsWith('/') ? path : `/${path}`;

  if (base === '/' || !base || base.trim() === '') {
    if (normalized.startsWith('/assets/')) {
      if (typeof window !== 'undefined') {
        const ossConfig = window.__OSS_CONFIG__;
        if (ossConfig && ossConfig.bucket && ossConfig.region) {
          const ossPath = normalized.substring(1);
          const region = ossConfig.region.replace(/^oss-/, '');
          return `https://${ossConfig.bucket}.oss-${region}.aliyuncs.com/${ossPath}`;
        }
      }
    }
    return normalized;
  }

  return `${base.replace(/\/+$/, '')}${normalized}`;
}

export function getOptimizedImageUrl(path: string, width = 640, quality = 80): string {
  const resolved = getClientAssetUrl(path);
  if (!resolved) return resolved;

  const lower = resolved.toLowerCase();
  const isOssImage = lower.includes('.aliyuncs.com/') && !lower.includes('.mp4') && !lower.includes('.webm');
  if (!isOssImage) {
    return resolved;
  }

  const separator = resolved.includes('?') ? '&' : '?';
  if (resolved.includes('x-oss-process=image')) {
    return resolved;
  }
  
  // 使用 OSS 图片处理：调整尺寸、质量压缩、格式优化（自动选择 webp）
  // 优化质量策略：根据图片尺寸动态调整质量，在保证清晰度的同时减少网络流量
  // - 小图（< 360px）：质量75，减少约15-20%流量
  // - 中图（360-600px）：质量80，平衡清晰度和流量
  // - 大图（> 600px）：质量80，保持清晰度
  const maxWidth = Math.min(width, 1200);
  let optimizedQuality = quality;
  if (maxWidth < 360) {
    optimizedQuality = Math.max(quality - 5, 75); // 小图降低质量
  } else if (maxWidth < 600) {
    optimizedQuality = quality; // 中图保持默认质量
  } else {
    optimizedQuality = quality; // 大图保持默认质量
  }
  return `${resolved}${separator}x-oss-process=image/resize,w_${maxWidth},limit_0/quality,q_${optimizedQuality}/format,webp`;
}

export function highlightText(text: string, keyword: string): string {
  if (!keyword) return text;
  // 转义 HTML 特殊字符，防止 XSS
  const escapeHtml = (str: string) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return str.replace(/[&<>"']/g, (m) => map[m]);
  };
  
  // 转义文本和关键词
  const escapedText = escapeHtml(text);
  const escapedKeyword = escapeHtml(keyword);
  
  // 创建正则表达式，转义特殊字符
  const escapedKeywordForRegex = escapedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedKeywordForRegex})`, 'gi');
  
  return escapedText.replace(regex, '<mark>$1</mark>');
}

export function formatFileSize(bytes?: number): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDuration(seconds?: number): string {
  if (!seconds) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}



