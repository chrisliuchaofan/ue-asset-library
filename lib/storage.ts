import { promises as fs } from 'fs';
import { join } from 'path';
import OSS from 'ali-oss';
import {
  AssetSchema,
  ManifestSchema,
  type Asset,
  type AssetCreateInput,
  type AssetUpdateInput,
} from '@/data/manifest.schema';

export type StorageMode = 'local' | 'oss';

const STORAGE_MODE: StorageMode =
  (process.env.STORAGE_MODE as StorageMode | undefined) ??
  (process.env.NEXT_PUBLIC_STORAGE_MODE as StorageMode | undefined) ??
  'local';

const manifestPath = join(process.cwd(), 'data', 'manifest.json');
const MANIFEST_FILE_NAME = 'manifest.json';

// 初始化 OSS 客户端（仅在 OSS 模式下使用）
let ossClient: OSS | null = null;

function getOSSClient(): OSS {
  if (ossClient) {
    return ossClient;
  }

  const bucket = process.env.OSS_BUCKET;
  const region = process.env.OSS_REGION;
  const accessKeyId = process.env.OSS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;
  const endpoint = process.env.OSS_ENDPOINT;

  if (!bucket || !region || !accessKeyId || !accessKeySecret) {
    throw new Error(
      'OSS 配置不完整，请检查环境变量：OSS_BUCKET, OSS_REGION, OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET'
    );
  }

  ossClient = new OSS({
    region,
    bucket,
    accessKeyId,
    accessKeySecret,
    ...(endpoint && { endpoint }),
  });

  return ossClient;
}

async function readLocalManifest(): Promise<Asset[]> {
  const file = await fs.readFile(manifestPath, 'utf-8');
  const data = JSON.parse(file);
  const manifest = ManifestSchema.parse(data);
  return manifest.assets;
}

async function writeLocalManifest(assets: Asset[]): Promise<void> {
  const manifest = ManifestSchema.parse({ assets });
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
}

async function readOSSManifest(): Promise<Asset[]> {
  try {
    const client = getOSSClient();
    const result = await client.get(MANIFEST_FILE_NAME);
    const data = JSON.parse(result.content.toString('utf-8'));
    const manifest = ManifestSchema.parse(data);
    return manifest.assets;
  } catch (error: any) {
    // 如果文件不存在，返回空数组
    if (error.code === 'NoSuchKey' || error.status === 404) {
      return [];
    }
    throw new Error(`读取 OSS manifest 失败: ${error.message}`);
  }
}

async function writeOSSManifest(assets: Asset[]): Promise<void> {
  const client = getOSSClient();
  const manifest = ManifestSchema.parse({ assets });
  const content = JSON.stringify(manifest, null, 2);
  await client.put(MANIFEST_FILE_NAME, Buffer.from(content, 'utf-8'), {
    contentType: 'application/json',
  });
}


export async function listAssets(): Promise<Asset[]> {
  if (STORAGE_MODE === 'local') {
    return readLocalManifest();
  }

  return readOSSManifest();
}

export async function getAsset(id: string): Promise<Asset | null> {
  const assets = await listAssets();
  return assets.find((asset) => asset.id === id) ?? null;
}

export async function createAsset(input: AssetCreateInput): Promise<Asset> {
  const assets =
    STORAGE_MODE === 'local' ? await readLocalManifest() : await readOSSManifest();

  // 确保必需字段有值
  const newAsset: Asset = AssetSchema.parse({
    ...input,
    id: input.id ?? crypto.randomUUID(),
    tags: input.tags ?? [],
    thumbnail: input.thumbnail || input.src || '',
    src: input.src || input.thumbnail || '',
    gallery: input.gallery,
  });

  const exists = assets.some((asset) => asset.id === newAsset.id);
  if (exists) {
    throw new Error(`ID 为 ${newAsset.id} 的资产已存在`);
  }

  const updated = [...assets, newAsset];
  if (STORAGE_MODE === 'local') {
    await writeLocalManifest(updated);
  } else {
    await writeOSSManifest(updated);
  }
  return newAsset;
}

export async function updateAsset(id: string, input: AssetUpdateInput): Promise<Asset> {
  const assets =
    STORAGE_MODE === 'local' ? await readLocalManifest() : await readOSSManifest();

  const index = assets.findIndex((asset) => asset.id === id);
  if (index === -1) {
    throw new Error(`未找到 ID 为 ${id} 的资产`);
  }

  const updatedAsset = AssetSchema.parse({
    ...assets[index],
    ...input,
    id,
    tags: input.tags ?? assets[index].tags,
    // 确保必需字段有值，如果更新时没有提供，使用原有值
    thumbnail: input.thumbnail ?? assets[index].thumbnail,
    src: input.src ?? assets[index].src,
    gallery: input.gallery ?? assets[index].gallery,
  });

  const updatedAssets = [...assets];
  updatedAssets[index] = updatedAsset;
  if (STORAGE_MODE === 'local') {
    await writeLocalManifest(updatedAssets);
  } else {
    await writeOSSManifest(updatedAssets);
  }
  return updatedAsset;
}

export async function deleteAsset(id: string): Promise<void> {
  const assets =
    STORAGE_MODE === 'local' ? await readLocalManifest() : await readOSSManifest();
  const nextAssets = assets.filter((asset) => asset.id !== id);
  if (nextAssets.length === assets.length) {
    throw new Error(`未找到 ID 为 ${id} 的资产`);
  }
  if (STORAGE_MODE === 'local') {
    await writeLocalManifest(nextAssets);
  } else {
    await writeOSSManifest(nextAssets);
  }
}

export function getStorageMode(): StorageMode {
  return STORAGE_MODE;
}


