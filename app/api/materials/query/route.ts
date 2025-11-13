import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAllMaterials, getMaterialsSummary } from '@/lib/materials-data';
import { getMaterialsIndex, type MaterialFilterOptions } from '@/lib/material-index';
import { createLRUCache } from '@/lib/lru-cache';
import { createHash } from 'crypto';
import type { Material } from '@/data/material.schema';

interface CachedResult {
  timestamp: number;
  materials: Material[];
  total: number;
}

const materialsQueryCache = createLRUCache<string, CachedResult>(50);
const CACHE_TTL_MS = 30_000;

const MaterialQuerySchema = z.object({
  keyword: z.string().optional(),
  type: z.string().optional(),
  tag: z.string().optional(),
  qualities: z.array(z.string()).optional(),
  project: z.string().optional(),
  limit: z.number().int().positive().optional(),
});

export async function POST(request: Request) {
  const requestStart = Date.now();
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      if (error instanceof SyntaxError) {
        return NextResponse.json({
          materials: [],
          total: 0,
          returned: 0,
          summary: { total: 0, types: {}, tags: {}, qualities: {}, projects: {} },
          cache: 'aborted',
        });
      }
      throw error;
    }

    const parsed = MaterialQuerySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: '查询参数格式错误', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { limit, ...filters } = parsed.data;
    
    // 项目过滤是必填的，如果没有提供项目参数，默认使用项目A（三冰）
    if (!filters.project) {
      filters.project = '项目A';
    }
    
    const normalizedFilters: MaterialFilterOptions = {
      keyword: filters.keyword,
      type: filters.type ?? undefined,
      tag: filters.tag ?? undefined,
      qualities: filters.qualities ?? undefined,
      project: filters.project ?? undefined,
    };

    const cacheKey = createHash('sha1').update(JSON.stringify(normalizedFilters)).digest('hex');
    const cached = materialsQueryCache.get(cacheKey);
    // 优化：检查缓存时，如果结果为空且缓存时间较短，延长缓存时间（空结果通常不会很快变化）
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      const limited = typeof limit === 'number' ? cached.materials.slice(0, limit) : cached.materials;
      // 优化：如果结果为空，直接返回空summary，不需要遍历计算
      const summary = cached.materials.length === 0
        ? { total: 0, types: {}, tags: {}, qualities: {}, projects: {} }
        : getMaterialsSummary(cached.materials);
      const response = NextResponse.json({
        materials: limited,
        total: cached.total,
        returned: limited.length,
        summary,
        cache: 'hit',
      });
      response.headers.set('X-Materials-Query-Cache', 'hit');
      response.headers.set('X-Materials-Query-Total', (Date.now() - requestStart).toString());
      return response;
    }

    const manifestStart = Date.now();
    const materials = await getAllMaterials();
    const manifestDuration = Date.now() - manifestStart;

    // 优化：如果数据为空，直接返回空结果，不需要构建索引和筛选
    if (materials.length === 0) {
      const emptyResult = {
        materials: [],
        total: 0,
        returned: 0,
        summary: { total: 0, types: {}, tags: {}, qualities: {}, projects: {} },
        cache: 'miss',
      };
      materialsQueryCache.set(cacheKey, {
        timestamp: Date.now(),
        materials: [],
        total: 0,
      });
      const response = NextResponse.json(emptyResult);
      response.headers.set('X-Materials-Query-Total', (Date.now() - requestStart).toString());
      response.headers.set('X-Materials-Query-Manifest', manifestDuration.toString());
      response.headers.set('X-Materials-Query-Filter', '0');
      response.headers.set('X-Materials-Query-Cache', 'miss');
      return response;
    }

    const index = getMaterialsIndex(materials);

    const filterStart = Date.now();
    const filtered = index.filter(normalizedFilters);
    const filterDuration = Date.now() - filterStart;

    materialsQueryCache.set(cacheKey, {
      timestamp: Date.now(),
      materials: filtered,
      total: filtered.length,
    });

    const limited = typeof limit === 'number' ? filtered.slice(0, limit) : filtered;
    const totalDuration = Date.now() - requestStart;

    console.info('[MaterialsQuery]', {
      filters: normalizedFilters,
      totalMs: totalDuration,
      manifestMs: manifestDuration,
      filterMs: filterDuration,
      total: filtered.length,
      returned: limited.length,
    });

    // 优化：如果结果为空，直接返回空summary，不需要遍历计算
    const summary = filtered.length === 0
      ? { total: 0, types: {}, tags: {}, qualities: {}, projects: {} }
      : getMaterialsSummary(filtered);

    const response = NextResponse.json({
      materials: limited,
      total: filtered.length,
      returned: limited.length,
      summary,
      cache: 'miss',
    });
    response.headers.set('X-Materials-Query-Total', totalDuration.toString());
    response.headers.set('X-Materials-Query-Manifest', manifestDuration.toString());
    response.headers.set('X-Materials-Query-Filter', filterDuration.toString());
    response.headers.set('X-Materials-Query-Cache', 'miss');

    return response;
  } catch (error) {
    console.error('素材筛选请求失败', error);

    const err = error as any;
    
    // 对于网络错误和超时，返回空结果而不是 500 错误
    // 这样前端可以正常显示空状态，而不是显示错误页面
    if (
      err?.code === 'ETIMEDOUT' ||
      err?.code === 'ENOTFOUND' ||
      err?.code === 'ECONNRESET' ||
      err?.code === 'ECONNREFUSED' ||
      err?.message?.includes?.('ETIMEDOUT') ||
      err?.message?.includes?.('connect ETIMEDOUT')
    ) {
      console.warn('素材筛选接口网络错误，返回空结果:', err?.message || err?.code);
        return NextResponse.json({
          materials: [],
          total: 0,
          returned: 0,
          summary: { total: 0, types: {}, tags: {}, qualities: {}, projects: {} },
          cache: 'error',
          message: '网络连接超时，请稍后重试',
        }, { status: 200 }); // 返回 200 而不是 500，避免前端显示错误页面
    }
    
    const message = error instanceof Error ? error.message : '素材筛选失败';
    return NextResponse.json({ 
      message, 
      materials: [], 
      total: 0, 
      returned: 0,
      summary: { total: 0, types: {}, tags: {}, qualities: {}, projects: {} },
      cache: 'error',
    }, { status: 200 }); // 返回 200，让前端处理空状态
  }
}


