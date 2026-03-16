/**
 * 周报数据库服务
 * 提供周报的 CRUD 操作
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth';
import type { WeeklyReport, CreateWeeklyReportRequest } from '@/types/weekly-report';
import type { Json, Database } from '@/lib/supabase/types';

/**
 * 创建周报
 * @param data 周报数据
 * @param teamId 团队 ID（可选，传入时会关联到团队）
 * @param userId 用户 ID（可选，传入时跳过 session 查询）
 */
export async function createWeeklyReport(
  data: CreateWeeklyReportRequest,
  teamId?: string,
  userId?: string
): Promise<WeeklyReport> {
  // 如果未传入 userId，使用 NextAuth session 获取用户信息（向后兼容）
  if (!userId) {
    const session = await getSession();
    if (!session?.user?.email) {
      throw new Error('未登录，无法创建周报');
    }
    userId = session.user.id || session.user.email;
  }

  const supabase = (await createServerSupabaseClient()) as any;

  // 优化：限制 report_data 的大小，避免 JSONB 过大导致超时
  // 如果数据量太大，可以考虑只保存前 N 条或压缩数据
  const reportDataToInsert: Database['public']['Tables']['weekly_reports']['Insert'] = {
    week_date_range: data.week_date_range,
    week_start_date: data.week_start_date,
    week_end_date: data.week_end_date,
    summary_text: data.summary_text || null,
    report_data: data.report_data as unknown as Json, // JSONB 类型
    excel_file_name: data.excel_file_name || null,
    total_materials: data.total_materials || data.report_data.length,
    total_consumption: data.total_consumption || 0,
    created_by: userId,
    ...(teamId ? { team_id: teamId } : {}),
  };

  // 计算数据大小（不序列化整个对象，只计算大小）
  const reportDataSize = Array.isArray(reportDataToInsert.report_data)
    ? reportDataToInsert.report_data.length
    : 0;

  console.log('[DB Service] 准备插入周报数据:', {
    week_date_range: reportDataToInsert.week_date_range,
    total_materials: reportDataToInsert.total_materials,
    report_data_items: reportDataSize,
  });

  const insertStartTime = Date.now();
  const { data: report, error } = await supabase
    .from('weekly_reports')
    .insert(reportDataToInsert)
    .select()
    .single();

  const insertDuration = Date.now() - insertStartTime;
  console.log(`[DB Service] 插入操作耗时: ${insertDuration}ms`);

  if (error) {
    console.error('[DB Service] 插入失败:', error);
    throw new Error(`创建周报失败: ${error.message}`);
  }

  return report;
}

/**
 * 获取周报列表
 * @param limit 每页数量
 * @param offset 偏移量
 * @param teamId 团队 ID（可选，传入时按团队过滤）
 */
export async function getWeeklyReports(
  limit: number = 20,
  offset: number = 0,
  teamId?: string
): Promise<WeeklyReport[]> {
  const supabase = (await createServerSupabaseClient()) as any;

  let query = supabase
    .from('weekly_reports')
    .select('*')
    .order('created_at', { ascending: false });

  if (teamId) {
    query = query.eq('team_id', teamId);
  }

  const { data, error } = await query.range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`查询周报失败: ${error.message}`);
  }

  return data || [];
}

/**
 * 根据 ID 获取周报
 * @param id 周报 ID
 * @param teamId 团队 ID（可选，传入时按团队过滤替代按用户过滤）
 */
export async function getWeeklyReportById(id: string, teamId?: string): Promise<WeeklyReport | null> {
  const supabase = (await createServerSupabaseClient()) as any;

  let query = supabase
    .from('weekly_reports')
    .select('*')
    .eq('id', id);

  if (teamId) {
    // 团队模式：按团队隔离
    query = query.eq('team_id', teamId);
  } else {
    // 向后兼容：按用户隔离
    const session = await getSession();
    if (!session?.user?.email) {
      throw new Error('未登录，无法查询周报');
    }
    const userId = session.user.id || session.user.email;
    query = query.eq('created_by', userId);
  }

  const { data, error } = await query.single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // 未找到
    }
    throw new Error(`查询周报失败: ${error.message}`);
  }

  return data;
}

/**
 * 更新周报
 * @param id 周报 ID
 * @param updates 更新数据
 * @param teamId 团队 ID（可选，传入时按团队隔离替代按用户隔离）
 */
export async function updateWeeklyReport(
  id: string,
  updates: Partial<CreateWeeklyReportRequest>,
  teamId?: string
): Promise<WeeklyReport> {
  const supabase = (await createServerSupabaseClient()) as any;

  let query = supabase
    .from('weekly_reports')
    .update({
      ...updates,
      report_data: updates.report_data as unknown as Json,
      updated_at: new Date().toISOString(),
    } as Database['public']['Tables']['weekly_reports']['Update'])
    .eq('id', id);

  if (teamId) {
    // 团队模式：按团队隔离
    query = query.eq('team_id', teamId);
  } else {
    // 向后兼容：按用户隔离
    const session = await getSession();
    if (!session?.user?.email) {
      throw new Error('未登录，无法更新周报');
    }
    const userId = session.user.id || session.user.email;
    query = query.eq('created_by', userId);
  }

  const { data, error } = await query.select().single();

  if (error) {
    throw new Error(`更新周报失败: ${error.message}`);
  }

  return data;
}

/**
 * 删除周报
 * @param id 周报 ID
 * @param teamId 团队 ID（可选，传入时按团队隔离替代按用户隔离）
 */
export async function deleteWeeklyReport(id: string, teamId?: string): Promise<void> {
  const supabase = (await createServerSupabaseClient()) as any;

  let query = supabase
    .from('weekly_reports')
    .delete()
    .eq('id', id);

  if (teamId) {
    // 团队模式：按团队隔离
    query = query.eq('team_id', teamId);
  } else {
    // 向后兼容：按用户隔离
    const session = await getSession();
    if (!session?.user?.email) {
      throw new Error('未登录，无法删除周报');
    }
    const userId = session.user.id || session.user.email;
    query = query.eq('created_by', userId);
  }

  const { error } = await query;

  if (error) {
    throw new Error(`删除周报失败: ${error.message}`);
  }
}
