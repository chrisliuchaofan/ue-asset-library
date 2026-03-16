/**
 * 团队命名配置 API
 * GET  /api/naming/config?teamId=xxx — 获取配置
 * POST /api/naming/config — 更新配置
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTeamNamingConfig, upsertTeamNamingConfig } from '@/lib/naming/naming-config';

export async function GET(request: NextRequest) {
  try {
    const teamId = request.nextUrl.searchParams.get('teamId');
    if (!teamId) {
      return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
    }

    const config = await getTeamNamingConfig(teamId);

    // 如果没有配置，返回默认值
    if (!config) {
      return NextResponse.json({
        products: ['造化', '三冰', '次神'],
        designers: [],
        vendors: [],
        namingTemplate: null,
      });
    }

    return NextResponse.json(config);
  } catch (error: any) {
    console.error('[naming/config] GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teamId, products, designers, vendors, namingTemplate } = body;

    if (!teamId) {
      return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
    }

    const config = await upsertTeamNamingConfig(teamId, {
      products,
      designers,
      vendors,
      namingTemplate,
    });

    return NextResponse.json(config);
  } catch (error: any) {
    console.error('[naming/config] POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
