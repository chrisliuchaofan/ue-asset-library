import { NextResponse } from 'next/server';
import { requireTeamAccess, isErrorResponse } from '@/lib/team/require-team';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAllMaterials } from '@/lib/materials-data';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/summary
 * 工作台首页聚合数据：积分余额、今日 AI 调用、团队成员数、最近素材、最近审核
 */
export async function GET() {
  const ctx = await requireTeamAccess('content:read');
  if (isErrorResponse(ctx)) return ctx;

  try {
    // 并行查询所有数据
    const [
      profileResult,
      memberCountResult,
      generationCountResult,
      recentReviewsResult,
    ] = await Promise.all([
      // 1. 用户积分余额
      supabaseAdmin
        .from('profiles')
        .select('credits')
        .eq('email', ctx.email)
        .single(),

      // 2. 团队成员数
      supabaseAdmin
        .from('team_members')
        .select('id', { count: 'exact', head: true })
        .eq('team_id', ctx.teamId),

      // 3. 今日 AI 调用次数 (generations 表)
      supabaseAdmin
        .from('generations')
        .select('id', { count: 'exact', head: true })
        .eq('team_id', ctx.teamId)
        .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),

      // 4. 最近 5 条审核记录
      (supabaseAdmin as any)
        .from('material_reviews')
        .select('id, material_id, overall_status, created_at')
        .eq('team_id', ctx.teamId)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    // 5. 最近 5 条素材（从现有材料数据源获取）
    let recentMaterials: Array<{ id: string; name: string; type: string; project: string; createdAt: string }> = [];
    try {
      const allMaterials = await getAllMaterials();
      recentMaterials = allMaterials
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 5)
        .map(m => ({
          id: m.id,
          name: m.name,
          type: m.type,
          project: m.project,
          createdAt: String(m.createdAt || new Date().toISOString()),
        }));
    } catch (err) {
      console.error('[Dashboard Summary] 获取素材失败:', err);
    }

    // 组装响应
    const balance = (profileResult.data as any)?.credits ?? 0;
    const teamMemberCount = memberCountResult.count ?? 0;
    const todayGenerationCount = generationCountResult.count ?? 0;

    const recentReviews = ((recentReviewsResult.data as any[]) || []).map((r: any) => ({
      id: r.id,
      materialId: r.material_id,
      overallStatus: r.overall_status,
      createdAt: r.created_at,
    }));

    return NextResponse.json({
      balance,
      teamMemberCount,
      todayGenerationCount,
      recentMaterials,
      recentReviews,
    });
  } catch (error) {
    console.error('[Dashboard Summary] Error:', error);
    return NextResponse.json(
      { error: '获取工作台数据失败' },
      { status: 500 }
    );
  }
}
