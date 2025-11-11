import { NextResponse } from 'next/server';
import { z } from 'zod';
import { listAssets } from '@/lib/storage';
import { filterAssetsByOptions } from '@/lib/asset-filters';

const AssetQuerySchema = z.object({
  keyword: z.string().optional(),
  tags: z.array(z.string()).optional(),
  types: z.array(z.string()).optional(),
  styles: z.array(z.string()).optional(),
  sources: z.array(z.string()).optional(),
  versions: z.array(z.string()).optional(),
  limit: z.number().int().positive().optional(),
});

export async function POST(request: Request) {
  const requestStart = Date.now();
  try {
    const json = await request.json();
    const parsed = AssetQuerySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { message: '查询参数格式错误', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { limit, ...filters } = parsed.data;

    const manifestStart = Date.now();
    const allAssets = await listAssets();
    const manifestDuration = Date.now() - manifestStart;

    const filterStart = Date.now();
    const filtered = filterAssetsByOptions(allAssets, filters);
    const filterDuration = Date.now() - filterStart;

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
    });

    response.headers.set('X-Asset-Query-Total', totalDuration.toString());
    response.headers.set('X-Asset-Query-Manifest', manifestDuration.toString());
    response.headers.set('X-Asset-Query-Filter', filterDuration.toString());

    return response;
  } catch (error) {
    console.error('资产筛选请求失败', error);
    const message = error instanceof Error ? error.message : '资产筛选失败';
    const response = NextResponse.json({ message, assets: [], total: 0, returned: 0 }, { status: 500 });
    response.headers.set('X-Asset-Query-Error', Date.now().toString());
    return response;
  }
}

