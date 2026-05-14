import { getOSSClient } from '@/lib/oss-client';

const DEFAULT_SIGNED_URL_EXPIRES_SECONDS = 60 * 60;

export function getOssObjectKey(input?: string | null): string | null {
  if (!input) return null;

  const value = input.trim();
  if (!value) return null;

  if (value.startsWith('/assets/')) {
    return decodeURIComponent(value.replace(/^\/+/, '').split(/[?#]/, 1)[0]);
  }
  if (value.startsWith('assets/')) {
    return decodeURIComponent(value.split(/[?#]/, 1)[0]);
  }

  try {
    const parsed = new URL(value);
    const key = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
    return key.startsWith('assets/') ? key : null;
  } catch {
    return null;
  }
}

export function createSignedOssUrl(
  input?: string | null,
  expiresSeconds = DEFAULT_SIGNED_URL_EXPIRES_SECONDS
): string | null {
  const key = getOssObjectKey(input);
  if (!key) return null;

  return (getOSSClient() as any).signatureUrl(key, {
    expires: expiresSeconds,
  });
}

export function resolveReadableMediaUrl(
  input: string,
  expiresSeconds = DEFAULT_SIGNED_URL_EXPIRES_SECONDS
): string {
  return createSignedOssUrl(input, expiresSeconds) || input;
}
