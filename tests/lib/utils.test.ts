import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  cn,
  getAssetUrl,
  getOptimizedImageUrl,
  highlightText,
  formatFileSize,
  formatDuration,
} from '@/lib/utils';

// ---------- cn ----------
describe('cn', () => {
  it('merges class names', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
  });

  it('resolves tailwind conflicts (last wins)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'extra')).toBe('base extra');
  });

  it('handles undefined / null / empty', () => {
    expect(cn(undefined, null, '', 'valid')).toBe('valid');
  });
});

// ---------- getAssetUrl ----------
describe('getAssetUrl', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_CDN_BASE;
  });

  it('returns empty string for empty path', () => {
    expect(getAssetUrl('')).toBe('');
  });

  it('returns full URL unchanged', () => {
    expect(getAssetUrl('https://cdn.example.com/img.png')).toBe('https://cdn.example.com/img.png');
    expect(getAssetUrl('http://cdn.example.com/img.png')).toBe('http://cdn.example.com/img.png');
  });

  it('normalizes path with leading slash when no CDN', () => {
    expect(getAssetUrl('assets/img.png')).toBe('/assets/img.png');
    expect(getAssetUrl('/assets/img.png')).toBe('/assets/img.png');
  });

  it('prepends CDN base', () => {
    process.env.NEXT_PUBLIC_CDN_BASE = 'https://cdn.example.com';
    expect(getAssetUrl('/assets/img.png')).toBe('https://cdn.example.com/assets/img.png');
  });

  it('handles CDN base with trailing slash', () => {
    process.env.NEXT_PUBLIC_CDN_BASE = 'https://cdn.example.com/';
    expect(getAssetUrl('/assets/img.png')).toBe('https://cdn.example.com/assets/img.png');
  });
});

// ---------- getOptimizedImageUrl ----------
describe('getOptimizedImageUrl', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_CDN_BASE;
  });

  it('returns empty for empty path', () => {
    expect(getOptimizedImageUrl('')).toBe('');
  });

  it('does not add OSS process params for non-OSS URLs', () => {
    const url = 'https://other-cdn.com/img.png';
    process.env.NEXT_PUBLIC_CDN_BASE = 'https://other-cdn.com';
    expect(getOptimizedImageUrl(url)).toBe(url);
  });

  it('adds OSS image processing params for OSS URLs', () => {
    const url = 'https://bucket.oss-cn-shenzhen.aliyuncs.com/assets/img.png';
    const result = getOptimizedImageUrl(url, 640, 80);
    expect(result).toContain('x-oss-process=image/resize,w_640');
    expect(result).toContain('quality,q_80');
    expect(result).toContain('format,webp');
  });

  it('caps width at 1200', () => {
    const url = 'https://bucket.oss-cn-shenzhen.aliyuncs.com/img.jpg';
    const result = getOptimizedImageUrl(url, 2000, 80);
    expect(result).toContain('w_1200');
  });

  it('lowers quality for small images', () => {
    const url = 'https://bucket.oss-cn-shenzhen.aliyuncs.com/thumb.jpg';
    const result = getOptimizedImageUrl(url, 200, 80);
    expect(result).toContain('q_75');
  });

  it('skips video files', () => {
    const url = 'https://bucket.oss-cn-shenzhen.aliyuncs.com/video.mp4';
    expect(getOptimizedImageUrl(url)).toBe(url);
  });

  it('skips if already has OSS process', () => {
    const url = 'https://bucket.oss-cn-shenzhen.aliyuncs.com/img.jpg?x-oss-process=image/resize,w_200';
    expect(getOptimizedImageUrl(url)).toBe(url);
  });
});

// ---------- highlightText ----------
describe('highlightText', () => {
  it('returns original text when keyword is empty', () => {
    expect(highlightText('hello world', '')).toBe('hello world');
  });

  it('wraps matched text in <mark>', () => {
    expect(highlightText('hello world', 'world')).toBe('hello <mark>world</mark>');
  });

  it('is case-insensitive', () => {
    expect(highlightText('Hello World', 'hello')).toBe('<mark>Hello</mark> World');
  });

  it('escapes HTML to prevent XSS', () => {
    const result = highlightText('<script>alert(1)</script>', 'script');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;<mark>script</mark>&gt;');
  });

  it('handles special regex characters in keyword', () => {
    const result = highlightText('price is $100.00', '$100');
    expect(result).toContain('<mark>$100</mark>');
  });
});

// ---------- formatFileSize ----------
describe('formatFileSize', () => {
  it('returns "-" for undefined', () => {
    expect(formatFileSize(undefined)).toBe('-');
  });

  it('returns "-" for 0', () => {
    expect(formatFileSize(0)).toBe('-');
  });

  it('formats bytes', () => {
    expect(formatFileSize(512)).toBe('512 B');
  });

  it('formats kilobytes', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });

  it('formats megabytes', () => {
    expect(formatFileSize(2 * 1024 * 1024)).toBe('2.0 MB');
  });
});

// ---------- formatDuration ----------
describe('formatDuration', () => {
  it('returns "-" for undefined', () => {
    expect(formatDuration(undefined)).toBe('-');
  });

  it('returns "-" for 0', () => {
    expect(formatDuration(0)).toBe('-');
  });

  it('formats seconds only', () => {
    expect(formatDuration(45)).toBe('0:45');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(125)).toBe('2:05');
  });

  it('pads single-digit seconds', () => {
    expect(formatDuration(61)).toBe('1:01');
  });
});
