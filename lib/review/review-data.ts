import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * 获取所有素材的审核状态 map: { materialId: overallStatus }
 */
export async function getReviewStatusMap(): Promise<Record<string, string>> {
  try {
    const { data, error } = await (supabaseAdmin.from('material_reviews') as any)
      .select('material_id, overall_status');

    if (error) {
      console.error('[ReviewData] 获取审核状态失败:', error.message);
      return {};
    }

    const map: Record<string, string> = {};
    if (Array.isArray(data)) {
      for (const row of data) {
        if (row.material_id && row.overall_status) {
          map[row.material_id] = row.overall_status;
        }
      }
    }
    return map;
  } catch (err) {
    console.error('[ReviewData] 异常:', err);
    return {};
  }
}
