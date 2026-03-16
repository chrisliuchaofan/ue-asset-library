
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { randomBytes } from 'crypto';
import { createLRUCache } from '@/lib/lru-cache';
import {
  MaterialSchema,
  MaterialsManifestSchema,
  type Material,
} from '@/data/material.schema';
import { getOSSClient, getStorageMode } from '@/lib/storage';

// ==================== Supabase DB 导入（动态检测） ====================
let dbModule: typeof import('@/lib/materials-db') | null = null;
let dbAvailable: boolean | null = null; // null = 未检测

async function getDbModule() {
  if (dbModule !== null) return dbModule;
  try {
    dbModule = await import('@/lib/materials-db');
    return dbModule;
  } catch {
    dbModule = null;
    return null;
  }
}

/** 检测 Supabase materials 表是否可用（带缓存） */
async function isDbAvailable(): Promise<boolean> {
  if (dbAvailable !== null) return dbAvailable;

  // 检查环境变量是否配置
  const hasConfig = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  if (!hasConfig) {
    dbAvailable = false;
    return false;
  }

  try {
    const db = await getDbModule();
    if (!db) {
      dbAvailable = false;
      return false;
    }
    dbAvailable = await db.isMaterialsTableAvailable();
    if (dbAvailable) {
      console.log('[Materials] Supabase materials 表可用，使用数据库模式');
    } else {
      console.log('[Materials] Supabase materials 表不可用，回退到文件模式');
    }
    return dbAvailable;
  } catch {
    dbAvailable = false;
    return false;
  }
}

// ==================== 文件模式（原有逻辑，作为 fallback） ====================

type StorageMode = 'local' | 'oss';

const materialsPath = join(process.cwd(), 'data', 'materials.json');
const MATERIALS_MANIFEST_FILE = 'materials.json';
const STORAGE_MODE: StorageMode = getStorageMode();
const MATERIALS_CACHE_KEY = 'all';
const MATERIALS_CACHE = createLRUCache<string, { timestamp: number; materials: Material[] }>(8);
const MATERIALS_CACHE_TTL_MS = (() => {
  const rawTTL =
    process.env.MATERIALS_CACHE_TTL ??
    process.env.MANIFEST_CACHE_TTL ??
    (STORAGE_MODE === 'local' ? '3600000' : '60000');
  const parsed = Number.parseInt(rawTTL, 10);
  if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
    return 60000;
  }
  return Math.max(0, parsed);
})();

// 全局 watcher 状态
declare global {
  var __materialsWatcher: import('fs').FSWatcher | undefined;
}

function setupLocalMaterialsWatcher() {
  if (STORAGE_MODE !== 'local') return;
  if (globalThis.__materialsWatcher) return; // 已存在

  try {
    const fs = require('fs');
    if (!fs.existsSync(materialsPath)) return;

    console.log('[Materials] Setting up materials watcher');
    globalThis.__materialsWatcher = fs.watch(materialsPath, { persistent: false }, (eventType: string) => {
      console.log(`[Materials] File ${eventType}, invalidating cache`);
      invalidateMaterialsCache();
    });

    if (globalThis.__materialsWatcher) {
      globalThis.__materialsWatcher.on('error', (error: Error) => {
        console.error('[Materials] Watcher error:', error);
        if (globalThis.__materialsWatcher) {
          try {
            globalThis.__materialsWatcher.close();
          } catch { }
          globalThis.__materialsWatcher = undefined;
        }
      });
    }
  } catch (e) {
    console.warn('[Materials] Failed to setup watcher:', e);
  }
}

// 优化：空结果的缓存时间更长（5分钟），因为空结果通常不会很快变化
const EMPTY_RESULT_CACHE_TTL_MS = 300_000; // 5分钟

function readMaterialsCache(key: string): Material[] | null {
  const cached = MATERIALS_CACHE.get(key);
  if (!cached) return null;

  // 优化：空结果使用更长的缓存时间
  const isEmpty = cached.materials.length === 0;
  const ttl = isEmpty ? EMPTY_RESULT_CACHE_TTL_MS : MATERIALS_CACHE_TTL_MS;

  if (Date.now() - cached.timestamp > ttl) {
    return null;
  }
  return cached.materials;
}

function writeMaterialsCache(key: string, materials: Material[]): void {
  MATERIALS_CACHE.set(key, {
    timestamp: Date.now(),
    materials,
  });
}

export function invalidateMaterialsCache(): void {
  MATERIALS_CACHE.clear();
}

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

async function ensureLocalDir() {
  await fs.mkdir(dirname(materialsPath), { recursive: true });
}

// 解析素材数据（共用于 local 和 oss 模式）
function parseMaterialsData(data: any): Material[] {
  try {
    // 先确保所有素材都有项目字段
    if (data && Array.isArray(data.materials)) {
      data.materials = data.materials.map((m: any) => {
        if (!m.project) {
          return { ...m, project: '项目A' };
        }
        return m;
      });
    }
    const validated = MaterialsManifestSchema.parse(data);
    return validated.materials;
  } catch (parseError) {
    console.error('素材数据格式验证失败:', parseError);
    if (data && Array.isArray(data.materials)) {
      const validMaterials = data.materials
        .map((m: any) => {
          if (!m.project) {
            return { ...m, project: '项目A' };
          }
          return m;
        })
        .filter((m: any) => {
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
}

// 本地模式：读取素材清单
async function readLocalMaterials(): Promise<Material[]> {
  const cacheKey = MATERIALS_CACHE_KEY;
  const cached = readMaterialsCache(cacheKey);
  if (cached) {
    return cached;
  }

  setupLocalMaterialsWatcher();

  try {
    const file = await fs.readFile(materialsPath, 'utf-8');
    const data = JSON.parse(file);
    const materials = parseMaterialsData(data);
    writeMaterialsCache(cacheKey, materials);
    return materials;
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      writeMaterialsCache(cacheKey, []);
      return [];
    }
    console.error('读取素材清单失败:', error);
    writeMaterialsCache(cacheKey, []);
    return [];
  }
}

// 本地模式：写入素材清单
async function writeLocalMaterials(materials: Material[]): Promise<void> {
  await ensureLocalDir();
  const payload = { materials };
  await fs.writeFile(materialsPath, JSON.stringify(payload, null, 2), 'utf-8');
  invalidateMaterialsCache();
}

// OSS 模式：读取素材清单
async function readOssMaterials(): Promise<Material[]> {
  const cacheKey = MATERIALS_CACHE_KEY;
  const cached = readMaterialsCache(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    let client: ReturnType<typeof getOSSClient>;
    try {
      client = getOSSClient();
    } catch (configError: any) {
      console.warn('OSS 配置不完整，返回空数组:', configError?.message || configError);
      writeMaterialsCache(cacheKey, []);
      return [];
    }

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('ETIMEDOUT: 连接 OSS 超时'));
      }, 2000);
    });

    const getPromise = client.get(MATERIALS_MANIFEST_FILE);
    const result = await Promise.race([getPromise, timeoutPromise]);
    const data = JSON.parse(result.content.toString('utf-8'));
    const materials = parseMaterialsData(data);
    writeMaterialsCache(cacheKey, materials);
    return materials;
  } catch (error) {
    const err = error as any;
    if (err?.code === 'NoSuchKey' || err?.status === 404) {
      console.warn('OSS 未找到 materials.json，返回空数组');
      writeMaterialsCache(cacheKey, []);
      return [];
    }
    if (
      err?.code === 'ENOTFOUND' ||
      err?.code === 'ETIMEDOUT' ||
      err?.code === 'ECONNRESET' ||
      err?.code === 'ECONNREFUSED' ||
      err?.code === 'UserDisable' ||
      err?.message?.includes?.('ENOTFOUND') ||
      err?.message?.includes?.('ETIMEDOUT') ||
      err?.message?.includes?.('getaddrinfo') ||
      err?.message?.includes?.('UserDisable') ||
      err?.message?.includes?.('connect ETIMEDOUT')
    ) {
      console.warn('连接 OSS 失败，返回空数组:', err?.message || err?.code);
      writeMaterialsCache(cacheKey, []);
      return [];
    }
    console.error('读取 OSS 素材清单失败:', error);
    writeMaterialsCache(cacheKey, []);
    return [];
  }
}

// OSS 模式：写入素材清单
async function writeOssMaterials(materials: Material[]): Promise<void> {
  const client = getOSSClient();
  const payload = JSON.stringify({ materials }, null, 2);
  await client.put(MATERIALS_MANIFEST_FILE, Buffer.from(payload, 'utf-8'), {
    contentType: 'application/json',
  });
  writeMaterialsCache(MATERIALS_CACHE_KEY, materials);
}

// 文件模式的读写（local 或 oss）
async function readFileMaterials(): Promise<Material[]> {
  if (STORAGE_MODE === 'oss') {
    return readOssMaterials();
  }
  return readLocalMaterials();
}

async function writeFileMaterials(materials: Material[]): Promise<void> {
  if (STORAGE_MODE === 'oss') {
    await writeOssMaterials(materials);
  } else {
    await writeLocalMaterials(materials);
  }
}

// ==================== 公共 API（自动选择存储模式） ====================

export async function getAllMaterials(): Promise<Material[]> {
  const start = Date.now();

  // 优先使用 Supabase
  if (await isDbAvailable()) {
    try {
      const db = await getDbModule();
      if (db) {
        const materials = await db.dbGetAllMaterials();
        const duration = Date.now() - start;
        console.info('[Materials]', { mode: 'supabase', count: materials.length, durationMs: duration });
        return materials;
      }
    } catch (error) {
      console.error('[Materials] Supabase 查询失败，回退到文件模式:', error);
    }
  }

  // 回退到文件模式
  const materials = await readFileMaterials();
  const duration = Date.now() - start;
  console.info('[Materials]', { mode: STORAGE_MODE, count: materials.length, durationMs: duration });
  return materials;
}

/**
 * Lightweight check: returns the total count of materials without loading full data.
 */
export async function getMaterialsCount(): Promise<number> {
  // 优先使用 Supabase
  if (await isDbAvailable()) {
    try {
      const db = await getDbModule();
      if (db) {
        return await db.dbGetMaterialsCount();
      }
    } catch (error) {
      console.error('[Materials] Supabase 计数失败，回退到文件模式:', error);
    }
  }

  // 回退：先查缓存
  const cached = readMaterialsCache(MATERIALS_CACHE_KEY);
  if (cached !== null) {
    return cached.length;
  }

  if (STORAGE_MODE === 'local') {
    try {
      const stats = await fs.stat(materialsPath).catch(() => null);
      if (!stats || stats.size < 20) {
        writeMaterialsCache(MATERIALS_CACHE_KEY, []);
        return 0;
      }
    } catch {
      writeMaterialsCache(MATERIALS_CACHE_KEY, []);
      return 0;
    }
  }

  const materials = await readFileMaterials();
  return materials.length;
}

export interface MaterialsSummary {
  total: number;
  types: Record<string, number>;
  tags: Record<string, number>;
  qualities: Record<string, number>;
  projects: Record<string, number>;
}

export function getMaterialsSummary(materials: Material[]): MaterialsSummary {
  const summary: MaterialsSummary = {
    total: materials.length,
    types: {},
    tags: {},
    qualities: {},
    projects: {},
  };

  for (const material of materials) {
    summary.types[material.type] = (summary.types[material.type] ?? 0) + 1;
    summary.tags[material.tag] = (summary.tags[material.tag] ?? 0) + 1;
    material.quality.forEach((quality) => {
      summary.qualities[quality] = (summary.qualities[quality] ?? 0) + 1;
    });
    if (material.project) {
      summary.projects[material.project] = (summary.projects[material.project] ?? 0) + 1;
    }
  }

  return summary;
}

export async function getMaterialById(id: string): Promise<Material | null> {
  // 优先使用 Supabase
  if (await isDbAvailable()) {
    try {
      const db = await getDbModule();
      if (db) {
        return await db.dbGetMaterialById(id);
      }
    } catch (error) {
      console.error('[Materials] Supabase 查询单个素材失败，回退到文件模式:', error);
    }
  }

  const materials = await readFileMaterials();
  return materials.find((m) => m.id === id) || null;
}

export async function createMaterial(input: {
  name: string;
  type: 'UE视频' | 'AE视频' | '混剪' | 'AI视频' | '图片';
  project: '项目A' | '项目B' | '项目C';
  source?: 'internal' | 'competitor';
  tag: '爆款' | '优质' | '达标';
  quality: ('高品质' | '常规' | '迭代')[];
  thumbnail?: string;
  src?: string;
  gallery?: string[];
  fileSize?: number;
  hash?: string;
  width?: number;
  height?: number;
  duration?: number;
}): Promise<Material> {
  // 优先使用 Supabase
  if (await isDbAvailable()) {
    try {
      const db = await getDbModule();
      if (db) {
        const material = await db.dbCreateMaterial({
          name: input.name.trim(),
          type: input.type,
          project: input.project,
          source: input.source ?? 'internal',
          tag: input.tag,
          quality: input.quality,
          thumbnail: input.thumbnail,
          src: input.src,
          gallery: input.gallery,
          fileSize: input.fileSize,
          hash: input.hash,
          width: input.width,
          height: input.height,
          duration: input.duration,
        });
        invalidateMaterialsCache();
        return material;
      }
    } catch (error) {
      console.error('[Materials] Supabase 创建素材失败，回退到文件模式:', error);
    }
  }

  // 回退到文件模式
  const materials = await readFileMaterials();

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
    project: input.project,
    source: input.source || 'internal',
    tag: input.tag,
    quality: input.quality,
    thumbnail: input.thumbnail || input.src || '',
    src: input.src || input.thumbnail || '',
    gallery: input.gallery,
    fileSize: input.fileSize,
    hash: input.hash,
    width: input.width,
    height: input.height,
    duration: input.duration,
    createdAt: now,
    updatedAt: now,
  };

  materials.push(material);
  await writeFileMaterials(materials);
  return material;
}

export async function updateMaterial(id: string, updates: Partial<Material>): Promise<Material> {
  // 优先使用 Supabase
  if (await isDbAvailable()) {
    try {
      const db = await getDbModule();
      if (db) {
        const material = await db.dbUpdateMaterial(id, updates);
        invalidateMaterialsCache();
        return material;
      }
    } catch (error) {
      console.error('[Materials] Supabase 更新素材失败，回退到文件模式:', error);
    }
  }

  const materials = await readFileMaterials();
  const index = materials.findIndex((m) => m.id === id);
  if (index === -1) {
    throw new Error(`素材 ${id} 不存在`);
  }
  materials[index] = {
    ...materials[index],
    ...updates,
    updatedAt: Date.now(),
  };
  await writeFileMaterials(materials);
  return materials[index];
}

export async function deleteMaterial(id: string): Promise<void> {
  // 优先使用 Supabase
  if (await isDbAvailable()) {
    try {
      const db = await getDbModule();
      if (db) {
        await db.dbDeleteMaterial(id);
        invalidateMaterialsCache();
        return;
      }
    } catch (error) {
      console.error('[Materials] Supabase 删除素材失败，回退到文件模式:', error);
    }
  }

  const materials = await readFileMaterials();
  const filtered = materials.filter((m) => m.id !== id);
  await writeFileMaterials(filtered);
}
