import type { Material } from '@/data/material.schema';

export const LINK_MATERIAL_PLATFORM = '链接';

const IMAGE_URL_PATTERN = /\.(png|jpe?g|webp|gif|avif|bmp|svg)(?:[?#].*)?$/i;
const VIDEO_URL_PATTERN = /\.(mp4|webm|mov|avi|mkv)(?:[?#].*)?$/i;

export function isHttpUrl(value?: string | null): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isVideoUrl(value?: string | null): boolean {
  return Boolean(value && VIDEO_URL_PATTERN.test(value));
}

export function isImageUrl(value?: string | null): boolean {
  return Boolean(value && IMAGE_URL_PATTERN.test(value));
}

export function isLinkMaterial(
  material: Pick<Material, 'src' | 'thumbnail' | 'gallery' | 'platform'>
): boolean {
  if (material.platform === LINK_MATERIAL_PLATFORM) return true;

  const hasPreviewMedia =
    isImageUrl(material.thumbnail) ||
    isVideoUrl(material.thumbnail) ||
    isImageUrl(material.src) ||
    isVideoUrl(material.src) ||
    Boolean(material.gallery?.some((url) => isImageUrl(url) || isVideoUrl(url)));

  return isHttpUrl(material.src) && !hasPreviewMedia;
}

export function getLinkHostname(value?: string | null): string {
  if (!value) return '在线链接';
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return '在线链接';
  }
}
