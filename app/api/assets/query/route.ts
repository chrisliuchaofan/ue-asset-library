import { NextResponse } from 'next/server';
import { z } from 'zod';
import { listAssets, getAssetsSummary } from '@/lib/storage';
import { filterAssetsByOptions } from '@/lib/asset-filters';
import { getAssetsIndex } from '@/lib/asset-index';
import { createHash } from 'crypto';
import { createLRUCache } from '@/lib/lru-cache';
import { handleApiError } from '@/lib/error-handler';
import type { Asset } from '@/data/manifest.schema';

interface CachedResult {
  timestamp: number;
  assets: Asset[];
  total: number;
}

const assetsQueryCache = createLRUCache<string, CachedResult>(50);
const CACHE_TTL_MS = 30_000;

const AssetQuerySchema = z.object({
  keyword: z.string().optional(),
  tags: z.array(z.string()).optional(),
  types: z.array(z.string()).optional(),
  styles: z.array(z.string()).optional(),
  sources: z.array(z.string()).optional(),
  versions: z.array(z.string()).optional(),
  projects: z.array(z.string()).optional(),
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
          assets: [],
          total: 0,
          returned: 0,
          summary: { total: 0, types: {}, styles: {}, tags: {}, sources: {}, versions: {}, projects: {} },
          cache: 'aborted',
        });
      }
      throw error;
    }

    const parsed = AssetQuerySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: '查询参数格式错误', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { limit, ...filters } = parsed.data;

    // 项目过滤是必填的，如果没有提供项目参数，默认使用项目A（三冰）
    if (!filters.projects || filters.projects.length === 0) {
      filters.projects = ['项目A'];
    }

    const cacheKey = createHash('sha1')
      .update(JSON.stringify(filters))
      .digest('hex');

    const cached = assetsQueryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      const limited = typeof limit === 'number' ? cached.assets.slice(0, limit) : cached.assets;
      const response = NextResponse.json({
        assets: limited,
        total: cached.total,
        returned: limited.length,
        summary: getAssetsSummary(cached.assets),
        cache: 'hit',
      });
      response.headers.set('X-Asset-Query-Cache', 'hit');
      response.headers.set('X-Asset-Query-Total', (Date.now() - requestStart).toString());
      return response;
    }

    const manifestStart = Date.now();
    const allAssets = await listAssets();
    const manifestDuration = Date.now() - manifestStart;

    const filterStart = Date.now();
    const index = getAssetsIndex(allAssets);
    const filtered = index.filter(filters);
    const filterDuration = Date.now() - filterStart;

    assetsQueryCache.set(cacheKey, {
      timestamp: Date.now(),
      assets: filtered,
      total: filtered.length,
    });

    const limited = typeof limit === 'number' ? filtered.slice(0, limit) : filtered;

    const totalDuration = Date.now() - requestStart;

    console.info('[AssetsQuery]', {
      filters,
      totalMs: totalDuration,
      manifestMs: manifestDuration,
      filterMs: filterDuration,
      total: filtered.length,
      returned: limited.length,
    });

    const response = NextResponse.json({
      assets: limited,
      total: filtered.length,
      returned: limited.length,
      summary: getAssetsSummary(filtered),
    });

    response.headers.set('X-Asset-Query-Total', totalDuration.toString());
    response.headers.set('X-Asset-Query-Manifest', manifestDuration.toString());
    response.headers.set('X-Asset-Query-Filter', filterDuration.toString());
    response.headers.set('X-Asset-Query-Cache', 'miss');

    return response;
  } catch (error) {
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
      console.warn('资产筛选接口网络错误，返回空结果:', err?.message || err?.code);
      return NextResponse.json({
        assets: [],
        total: 0,
        returned: 0,
        summary: { total: 0, types: {}, styles: {}, tags: {}, sources: {}, versions: {}, projects: {} },
        cache: 'error',
        message: '网络连接超时，请稍后重试',
      }, { status: 200 }); // 返回 200 而不是 500，避免前端显示错误页面
    }
    
    // 使用统一的错误处理
    return handleApiError(error, '资产筛选失败');
  }
}

