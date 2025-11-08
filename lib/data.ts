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


