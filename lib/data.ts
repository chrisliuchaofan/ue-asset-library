import { listAssets, getAsset } from '@/lib/storage';
import type { Asset } from '@/data/manifest.schema';

export async function getAllAssets(): Promise<Asset[]> {
  return listAssets();
}

export async function getAssetById(id: string): Promise<Asset | null> {
  return getAsset(id);
}

export async function getAllTags(): Promise<string[]> {
  const assets = await listAssets();
  const tagSet = new Set<string>();
  assets.forEach((asset) => {
    asset.tags.forEach((tag) => tagSet.add(tag));
  });
  return Array.from(tagSet).sort();
}

export async function getAllTypes(): Promise<string[]> {
  const assets = await listAssets();
  const typeSet = new Set<string>();
  assets.forEach((asset) => {
    typeSet.add(asset.type);
  });
  return Array.from(typeSet).sort();
}

export async function getAllStyles(): Promise<string[]> {
  const assets = await listAssets();
  const styleSet = new Set<string>();
  assets.forEach((asset) => {
    if (asset.style) {
      if (Array.isArray(asset.style)) {
        asset.style.forEach((s) => styleSet.add(s));
      } else {
        styleSet.add(asset.style);
      }
    }
  });
  return Array.from(styleSet).sort();
}

export async function getAllSources(): Promise<string[]> {
  const assets = await listAssets();
  const sourceSet = new Set<string>();
  assets.forEach((asset) => {
    if (asset.source) {
      sourceSet.add(asset.source);
    }
  });
  return Array.from(sourceSet).sort();
}

export async function getAllEngineVersions(): Promise<string[]> {
  const assets = await listAssets();
  const versionSet = new Set<string>();
  assets.forEach((asset) => {
    if (asset.engineVersion) {
      versionSet.add(asset.engineVersion);
    }
  });
  return Array.from(versionSet).sort();
}


