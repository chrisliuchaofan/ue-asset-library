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

    const allAssets = await listAssets();
    const filtered = filterAssetsByOptions(allAssets, filters);
    const limited = typeof limit === 'number' ? filtered.slice(0, limit) : filtered;

    return NextResponse.json({
      assets: limited,
      total: filtered.length,
      returned: limited.length,
    });
  } catch (error) {
    console.error('资产筛选请求失败', error);
    const message = error instanceof Error ? error.message : '资产筛选失败';
    return NextResponse.json({ message, assets: [], total: 0, returned: 0 }, { status: 500 });
  }
}


