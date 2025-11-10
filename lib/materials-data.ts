import { randomBytes } from 'crypto';
import { MaterialSchema, MaterialsManifestSchema, type Material } from '@/data/material.schema';
import { getOSSClient } from '@/lib/storage';

const MATERIALS_MANIFEST_FILE = 'materials.json';

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

// 读取 OSS 中的素材清单
async function readMaterialsManifest(): Promise<Material[]> {
  try {
    const client = getOSSClient();
    const result = await client.get(MATERIALS_MANIFEST_FILE);
    const data = JSON.parse(result.content.toString('utf-8'));
    
    try {
      const validated = MaterialsManifestSchema.parse(data);
      return validated.materials;
    } catch (parseError) {
      console.error('素材数据格式验证失败:', parseError);
      if (data && Array.isArray(data.materials)) {
        const validMaterials = data.materials.filter((m: any) => {
          try {
            MaterialSchema.parse(m);
            return true;
          } catch {
            return false;
          }
        });
        return validMaterials;
      }
      return [];
    }
  } catch (error) {
    if ((error as any).code === 'NoSuchKey' || (error as any).status === 404) {
      console.warn('OSS 未找到 materials.json，返回空列表');
      return [];
    }
    if (
      (error as any).code === 'ENOTFOUND' ||
      (error as any).message?.includes('ENOTFOUND') ||
      (error as any).message?.includes('getaddrinfo') ||
      (error as any).message?.includes('UserDisable') ||
      (error as any).code === 'UserDisable'
    ) {
      console.warn('无法连接 OSS，返回空列表:', (error as any).message);
      return [];
    }
    console.error('读取素材清单失败:', error);
    return [];
  }
}

// 写入 OSS 素材清单
async function writeMaterialsManifest(materials: Material[]): Promise<void> {
  const client = getOSSClient();
  const data = JSON.stringify({ materials }, null, 2);
  await client.put(MATERIALS_MANIFEST_FILE, Buffer.from(data, 'utf-8'), {
    contentType: 'application/json',
  });
}

export async function getAllMaterials(): Promise<Material[]> {
  return readMaterialsManifest();
}

export async function getMaterialById(id: string): Promise<Material | null> {
  const materials = await readMaterialsManifest();
  return materials.find((m) => m.id === id) || null;
}

export async function createMaterial(input: {
  name: string;
  type: 'UE视频' | 'AE视频' | '混剪' | 'AI视频' | '图片';
  tag: '爆款' | '优质' | '达标';
  quality: ('高品质' | '常规' | '迭代')[];
  thumbnail?: string;
  src?: string;
  gallery?: string[];
  filesize?: number;
  width?: number;
  height?: number;
  duration?: number;
}): Promise<Material> {
  const materials = await readMaterialsManifest();
  
  // 检查名称和类型是否同时重复
  const nameTrimmed = input.name.trim();
  const duplicateMaterial = materials.find((m) => 
    m.name.trim() === nameTrimmed && m.type === input.type
  );
  if (duplicateMaterial) {
    throw new Error(`素材名称 "${nameTrimmed}" 和类型 "${input.type}" 的组合已存在。请先检查是否已上传过该素材，确认没有后请更改命名或类型。`);
  }
  
  const now = Date.now();
  const material: Material = {
    id: generateUUID(),
    name: nameTrimmed,
    type: input.type,
    tag: input.tag,
    quality: input.quality,
    thumbnail: input.thumbnail || input.src || '',
    src: input.src || input.thumbnail || '',
    gallery: input.gallery,
    filesize: input.filesize,
    width: input.width,
    height: input.height,
    duration: input.duration,
    createdAt: now,
    updatedAt: now,
  };
  
  materials.push(material);
  await writeMaterialsManifest(materials);
  return material;
}

export async function updateMaterial(id: string, updates: Partial<Material>): Promise<Material> {
  const materials = await readMaterialsManifest();
  const index = materials.findIndex((m) => m.id === id);
  if (index === -1) {
    throw new Error(`素材 ${id} 不存在`);
  }
  materials[index] = {
    ...materials[index],
    ...updates,
    updatedAt: Date.now(),
  };
  await writeMaterialsManifest(materials);
  return materials[index];
}

export async function deleteMaterial(id: string): Promise<void> {
  const materials = await readMaterialsManifest();
  const filtered = materials.filter((m) => m.id !== id);
  await writeMaterialsManifest(filtered);
}

