import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { DeduplicationProject } from '@/lib/deduplication/deduplicationSupabaseService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

function isMissingTableError(error: unknown, table: string): boolean {
  if (!error || typeof error !== 'object') return false;

  const code = 'code' in error ? String(error.code ?? '') : '';
  const message = 'message' in error ? String(error.message ?? '') : '';

  return (
    code === 'PGRST205' ||
    (message.includes(table) && message.includes('schema cache')) ||
    (message.includes(table) && message.includes('Could not find the table'))
  );
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json(
        { message: '未登录，请先登录' },
        { status: 401 }
      );
    }

    const { data, error } = await (supabaseAdmin
      .from('deduplication_projects') as any)
      .select('id, name, cost_threshold, created_at, updated_at')
      .order('created_at', { ascending: true });

    if (error) {
      if (isMissingTableError(error, 'deduplication_projects')) {
        console.warn('[API /analysis/projects] deduplication_projects 不存在，返回空列表');
        return NextResponse.json({ projects: [] as DeduplicationProject[] });
      }

      console.error('[API /analysis/projects] 查询失败:', error);
      return NextResponse.json(
        { message: '加载项目列表失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      projects: (data ?? []) as DeduplicationProject[],
    });
  } catch (error) {
    console.error('[API /analysis/projects] 错误:', error);
    return NextResponse.json(
      { message: '加载项目列表失败' },
      { status: 500 }
    );
  }
}
