import { randomBytes } from 'crypto';
import OSS from 'ali-oss';
import {
  AssetSchema,
  ManifestSchema,
  DEFAULT_ASSET_TYPES,
  type Asset,
  type AssetCreateInput,
  type AssetUpdateInput,
  type Manifest,
} from '@/data/manifest.schema';

export type StorageMode = 'oss';

const STORAGE_MODE: StorageMode = 'oss';
const MANIFEST_FILE_NAME = 'manifest.json';

// 生成 UUID v4（兼容所有 Node.js 版本）
function generateUUID(): string {
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10
  return [
    bytes.toString('hex', 0, 4),
    bytes.toString('hex', 4, 6),
    bytes.toString('hex', 6, 8),
    bytes.toString('hex', 8, 10),
    bytes.toString('hex', 10, 16),
  ].join('-');
}

// 初始化 OSS 客户端（仅在 OSS 模式下使用）
let ossClient: OSS | null = null;

export function getOSSClient(): OSS {
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

async function readOSSManifest(): Promise<{ assets: Asset[]; allowedTypes: string[] }> {
  try {
    // 尝试获取OSS客户端，如果配置不完整则返回空数组
    let client: OSS;
    try {
      client = getOSSClient();
    } catch (configError: any) {
      console.warn('OSS 配置不完整，返回空数组:', configError.message);
      return { assets: [], allowedTypes: [...DEFAULT_ASSET_TYPES] };
    }
    
    const result = await client.get(MANIFEST_FILE_NAME);
    const data = JSON.parse(result.content.toString('utf-8'));
    
    // 先获取 allowedTypes（如果存在）
    const allowedTypes = data.allowedTypes && Array.isArray(data.allowedTypes) 
      ? data.allowedTypes 
      : [...DEFAULT_ASSET_TYPES];
    
    // 保存原始资产数据（用于恢复类型）
    const originalAssets = data.assets && Array.isArray(data.assets) ? JSON.parse(JSON.stringify(data.assets)) : [];
    
    // 在解析前转换旧数据：将 image/video 类型转换为"其他"，确保 tags 是数组，添加时间戳
    // 同时处理不在 DEFAULT_ASSET_TYPES 中但在 allowedTypes 中的类型
    if (data.assets && Array.isArray(data.assets)) {
      const now = Date.now();
      data.assets = data.assets.map((asset: any) => {
        const assetTags = asset.tags;
        let assetType = asset.type;
        
        // 转换 image/video 类型
        if (assetType === 'image' || assetType === 'video') {
          assetType = '其他';
        }
        // 如果类型在 allowedTypes 中但不在 DEFAULT_ASSET_TYPES 中，临时替换为"其他"以通过验证
        else if (!DEFAULT_ASSET_TYPES.includes(assetType) && allowedTypes.includes(assetType)) {
          assetType = '其他'; // 临时替换
        }
        
        return {
          ...asset,
          type: assetType,
          tags: Array.isArray(assetTags)
            ? assetTags
            : typeof assetTags === 'string'
            ? assetTags.split(',').map((t: string) => t.trim()).filter(Boolean)
            : [],
          // 为旧数据添加时间戳（使用当前时间作为默认值）
          createdAt: asset.createdAt || now,
          updatedAt: asset.updatedAt || asset.createdAt || now,
        };
      });
    }
    
    // 如果没有allowedTypes，使用默认值
    if (!data.allowedTypes || !Array.isArray(data.allowedTypes)) {
      data.allowedTypes = [...DEFAULT_ASSET_TYPES];
    }
    
    try {
      const manifest = ManifestSchema.parse(data);
      const parsedAssets = manifest.assets;
      
      // 恢复原始类型（如果之前临时替换了）
      const finalAssets = parsedAssets.map((asset: any, index: number) => {
        const originalAsset = originalAssets[index];
        if (originalAsset && originalAsset.type !== asset.type && allowedTypes.includes(originalAsset.type)) {
          return { ...asset, type: originalAsset.type };
        }
        return asset;
      });
      
      return { assets: finalAssets, allowedTypes: manifest.allowedTypes || [...DEFAULT_ASSET_TYPES] };
    } catch (parseError: any) {
      // 如果解析失败，可能是类型不在允许列表中，尝试更宽松的处理
      console.warn('Manifest解析失败，尝试修复类型:', parseError);
      
      // 如果错误是类型相关的，尝试将所有不在DEFAULT_ASSET_TYPES中的类型都临时替换
      if (parseError.issues && parseError.issues.some((issue: any) => issue.code === 'invalid_enum_value')) {
        // 重新处理：将所有不在DEFAULT_ASSET_TYPES中的类型都替换为"其他"
        if (data.assets && Array.isArray(data.assets)) {
          data.assets = data.assets.map((asset: any) => {
            if (!DEFAULT_ASSET_TYPES.includes(asset.type)) {
              return { ...asset, type: '其他' };
            }
            return asset;
          });
        }
        
        // 再次尝试解析
        try {
          const manifest = ManifestSchema.parse(data);
          const parsedAssets = manifest.assets;
          
          // 恢复原始类型（如果之前临时替换了）
          const finalAssets = parsedAssets.map((asset: any, index: number) => {
            const originalAsset = originalAssets[index];
            if (originalAsset && originalAsset.type !== asset.type && allowedTypes.includes(originalAsset.type)) {
              return { ...asset, type: originalAsset.type };
            }
            return asset;
          });
          
          return { assets: finalAssets, allowedTypes: manifest.allowedTypes || [...DEFAULT_ASSET_TYPES] };
        } catch (retryError) {
          console.error('重试解析仍然失败，返回空数组:', retryError);
          return { assets: [], allowedTypes: [...DEFAULT_ASSET_TYPES] };
        }
      }
      
      // 如果验证失败，尝试返回空数组或过滤有效数据
      console.error('Manifest数据格式验证失败，返回空数组:', parseError);
      if (data && Array.isArray(data.assets)) {
        // 如果数据结构基本正确，尝试过滤有效数据
        const validAssets = data.assets.filter((a: any) => {
          try {
            AssetSchema.parse(a);
            return true;
          } catch {
            return false;
          }
        });
        return { assets: validAssets, allowedTypes: allowedTypes };
      }
      
      // 如果完全无法解析，返回空数组
      return { assets: [], allowedTypes: [...DEFAULT_ASSET_TYPES] };
    }
  } catch (error: any) {
    // 如果文件不存在，返回空数组和默认类型
    if (error.code === 'NoSuchKey' || error.status === 404) {
      console.warn('OSS manifest 文件不存在，返回空数组');
      return { assets: [], allowedTypes: [...DEFAULT_ASSET_TYPES] };
    }
    // DNS 解析失败或网络连接问题，或 OSS 服务被禁用
    if (error.code === 'ENOTFOUND' || 
        error.message?.includes('ENOTFOUND') || 
        error.message?.includes('getaddrinfo') ||
        error.message?.includes('UserDisable') ||
        error.code === 'UserDisable') {
      console.warn('OSS 连接失败或服务被禁用，返回空数组:', error.message);
      return { assets: [], allowedTypes: [...DEFAULT_ASSET_TYPES] };
    }
    // 其他错误也返回空数组，避免服务器崩溃
    console.error('读取 OSS manifest 失败，返回空数组:', error.message);
    return { assets: [], allowedTypes: [...DEFAULT_ASSET_TYPES] };
  }
}

async function readOSSManifestFull(): Promise<Manifest> {
  try {
    // 尝试获取OSS客户端，如果配置不完整则返回空manifest
    let client: OSS;
    try {
      client = getOSSClient();
    } catch (configError: any) {
      console.warn('OSS 配置不完整，返回空manifest:', configError.message);
      return { assets: [], allowedTypes: [...DEFAULT_ASSET_TYPES] } as Manifest;
    }
    
    const result = await client.get(MANIFEST_FILE_NAME);
    const data = JSON.parse(result.content.toString('utf-8'));
    
    // 先获取 allowedTypes（如果存在）
    const allowedTypes = data.allowedTypes && Array.isArray(data.allowedTypes) 
      ? data.allowedTypes 
      : [...DEFAULT_ASSET_TYPES];
    
    // 保存原始资产数据（用于恢复类型）
    const originalAssets = data.assets && Array.isArray(data.assets) ? JSON.parse(JSON.stringify(data.assets)) : [];
    
    // 在解析前转换旧数据：将 image/video 类型转换为"其他"，确保 tags 是数组，添加时间戳
    // 同时处理不在 DEFAULT_ASSET_TYPES 中但在 allowedTypes 中的类型
    if (data.assets && Array.isArray(data.assets)) {
      const now = Date.now();
      data.assets = data.assets.map((asset: any) => {
        const assetTags = asset.tags;
        let assetType = asset.type;
        
        // 转换 image/video 类型
        if (assetType === 'image' || assetType === 'video') {
          assetType = '其他';
        }
        // 如果类型在 allowedTypes 中但不在 DEFAULT_ASSET_TYPES 中，临时替换为"其他"以通过验证
        else if (!DEFAULT_ASSET_TYPES.includes(assetType) && allowedTypes.includes(assetType)) {
          assetType = '其他'; // 临时替换
        }
        
        return {
          ...asset,
          type: assetType,
          tags: Array.isArray(assetTags)
            ? assetTags
            : typeof assetTags === 'string'
            ? assetTags.split(',').map((t: string) => t.trim()).filter(Boolean)
            : [],
          // 为旧数据添加时间戳（使用当前时间作为默认值）
          createdAt: asset.createdAt || now,
          updatedAt: asset.updatedAt || asset.createdAt || now,
        };
      });
    }
    
    // 如果没有allowedTypes，使用默认值
    if (!data.allowedTypes || !Array.isArray(data.allowedTypes)) {
      data.allowedTypes = [...DEFAULT_ASSET_TYPES];
    }
    
    const manifest = ManifestSchema.parse(data);
    const parsedAssets = manifest.assets;
    
    // 恢复原始类型（如果之前临时替换了）
    const finalAssets = parsedAssets.map((asset: any, index: number) => {
      const originalAsset = originalAssets[index];
      if (originalAsset && originalAsset.type !== asset.type && allowedTypes.includes(originalAsset.type)) {
        return { ...asset, type: originalAsset.type };
      }
      return asset;
    });
    
    return { assets: finalAssets, allowedTypes: manifest.allowedTypes || [...DEFAULT_ASSET_TYPES] } as Manifest;
  } catch (error: any) {
    // 如果文件不存在，返回空manifest和默认类型
    if (error.code === 'NoSuchKey' || error.status === 404) {
      console.warn('OSS manifest 文件不存在，返回空数组');
      return { assets: [], allowedTypes: [...DEFAULT_ASSET_TYPES] } as Manifest;
    }
    // DNS 解析失败或网络连接问题，或 OSS 服务被禁用
    if (error.code === 'ENOTFOUND' || 
        error.message?.includes('ENOTFOUND') || 
        error.message?.includes('getaddrinfo') ||
        error.message?.includes('UserDisable') ||
        error.code === 'UserDisable') {
      console.warn('OSS 连接失败或服务被禁用，返回空数组:', error.message);
      return { assets: [], allowedTypes: [...DEFAULT_ASSET_TYPES] } as Manifest;
    }
    // 其他错误也返回空数组，避免服务器崩溃
    console.error('读取 OSS manifest 失败，返回空数组:', error.message);
    return { assets: [], allowedTypes: [...DEFAULT_ASSET_TYPES] } as Manifest;
  }
}

async function writeOSSManifest(assets: Asset[], allowedTypes?: string[]): Promise<void> {
  const client = getOSSClient();
  // 读取完整manifest以保留allowedTypes
  let manifest: Manifest;
  try {
    manifest = await readOSSManifestFull();
    manifest.assets = assets;
    if (allowedTypes !== undefined) {
      manifest.allowedTypes = allowedTypes;
    }
  } catch {
    // 如果读取失败，创建新的
    manifest = {
      assets,
      allowedTypes: allowedTypes || [...DEFAULT_ASSET_TYPES],
    };
  }
  const content = JSON.stringify(manifest, null, 2);
  await client.put(MANIFEST_FILE_NAME, Buffer.from(content, 'utf-8'), {
    contentType: 'application/json',
  });
}


export async function listAssets(): Promise<Asset[]> {
  const result = await readOSSManifest();
  return result.assets;
}

// 获取允许的类型列表
export async function getAllowedTypes(): Promise<string[]> {
  const result = await readOSSManifest();
  return result.allowedTypes;
}

// 更新允许的类型列表
export async function updateAllowedTypes(allowedTypes: string[]): Promise<void> {
  const assets = await listAssets();
  await writeOSSManifest(assets, allowedTypes);
}

export async function getAsset(id: string): Promise<Asset | null> {
  const assets = await listAssets();
  return assets.find((asset) => asset.id === id) ?? null;
}

export async function createAsset(input: AssetCreateInput): Promise<Asset> {
  const assetsResult = await readOSSManifest();
  const assets = assetsResult.assets;
  const allowedTypes = assetsResult.allowedTypes;

  // 检查名称和类型是否同时重复
  const nameTrimmed = input.name.trim();
  const duplicateAsset = assets.find((asset) => 
    asset.name.trim() === nameTrimmed && asset.type === input.type
  );
  if (duplicateAsset) {
    throw new Error(`资产名称 "${nameTrimmed}" 和类型 "${input.type}" 的组合已存在。请先检查是否已上传过该资产，确认没有后请更改命名或类型。`);
  }

  // 验证类型是否在允许列表中
  if (input.type && !allowedTypes.includes(input.type)) {
    throw new Error(`类型 "${input.type}" 不在允许列表中。允许的类型：${allowedTypes.join('、')}`);
  }

  // 确保必需字段有值
  const now = Date.now();
  
  // 如果类型在 allowedTypes 中但不在 DEFAULT_ASSET_TYPES 中，临时替换为"其他"以通过 AssetSchema.parse()
  const originalType = input.type;
  const needsTypeFix = allowedTypes.includes(originalType) && 
    !['角色', '场景', '动画', '特效', '材质', '蓝图', 'UI', '合成', '音频', '其他'].includes(originalType);
  
  const assetDataForSchema = {
    ...input,
    id: input.id ?? generateUUID(),
    tags: input.tags ?? [],
    thumbnail: input.thumbnail || input.src || '',
    src: input.src || input.thumbnail || '',
    gallery: input.gallery,
    createdAt: now,
    updatedAt: now,
    type: needsTypeFix ? '其他' : originalType, // 临时替换以通过枚举验证
  };
  
  const newAsset: Asset = AssetSchema.parse(assetDataForSchema);
  
  // 如果临时替换了类型，恢复原始类型
  if (needsTypeFix) {
    (newAsset as any).type = originalType;
  }

  const exists = assets.some((asset) => asset.id === newAsset.id);
  if (exists) {
    throw new Error(`ID 为 ${newAsset.id} 的资产已存在`);
  }

  const updated = [...assets, newAsset];
  await writeOSSManifest(updated);
  return newAsset;
}

export async function updateAsset(id: string, input: AssetUpdateInput): Promise<Asset> {
  const assetsResult = await readOSSManifest();
  const assets = assetsResult.assets;
  const allowedTypes = assetsResult.allowedTypes;

  const index = assets.findIndex((asset) => asset.id === id);
  if (index === -1) {
    throw new Error(`未找到 ID 为 ${id} 的资产`);
  }

  // 如果提供了类型，验证是否在允许列表中
  if (input.type !== undefined && input.type !== null && !allowedTypes.includes(input.type)) {
    throw new Error(`类型 "${input.type}" 不在允许列表中。允许的类型：${allowedTypes.join('、')}`);
  }

  const now = Date.now();
  
  // 如果类型在 allowedTypes 中但不在 DEFAULT_ASSET_TYPES 中，临时替换为"其他"以通过 AssetSchema.parse()
  const originalType = input.type ?? assets[index].type;
  const needsTypeFix = originalType && 
    allowedTypes.includes(originalType) && 
    !['角色', '场景', '动画', '特效', '材质', '蓝图', 'UI', '合成', '音频', '其他'].includes(originalType);
  
  const assetDataForSchema = {
    ...assets[index],
    ...input,
    id,
    tags: input.tags ?? assets[index].tags,
    // 确保必需字段有值，如果更新时没有提供，使用原有值
    thumbnail: input.thumbnail ?? assets[index].thumbnail,
    src: input.src ?? assets[index].src,
    gallery: input.gallery ?? assets[index].gallery,
    // 保留创建时间，更新修改时间
    createdAt: assets[index].createdAt ?? now,
    updatedAt: now,
    type: needsTypeFix ? '其他' : originalType, // 临时替换以通过枚举验证
  };
  
  const updatedAsset = AssetSchema.parse(assetDataForSchema);
  
  // 如果临时替换了类型，恢复原始类型
  if (needsTypeFix) {
    (updatedAsset as any).type = originalType;
  }

  const updatedAssets = [...assets];
  updatedAssets[index] = updatedAsset;
  await writeOSSManifest(updatedAssets);
  return updatedAsset;
}

export async function deleteAsset(id: string): Promise<void> {
  const assetsResult = await readOSSManifest();
  const assets = assetsResult.assets;
  const nextAssets = assets.filter((asset) => asset.id !== id);
  if (nextAssets.length === assets.length) {
    throw new Error(`未找到 ID 为 ${id} 的资产`);
  }
  await writeOSSManifest(nextAssets);
}

export function getStorageMode(): StorageMode {
  return STORAGE_MODE;
}


