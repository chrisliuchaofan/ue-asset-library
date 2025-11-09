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



