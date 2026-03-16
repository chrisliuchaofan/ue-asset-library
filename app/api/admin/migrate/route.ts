/**
 * 临时迁移 API — 执行 P4 知识库 Schema 迁移
 * 用完后删除此文件
 *
 * POST /api/admin/migrate
 */
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST() {
    const results: string[] = [];
    const errors: string[] = [];

    try {
        // ============ Step 1: 创建 knowledge_entries 表 ============
        const { error: createTableError } = await (supabaseAdmin as any).rpc('', {}).catch(() => ({}));

        // 使用 supabaseAdmin 直接操作 — 先检查表是否已存在
        const { error: checkError } = await supabaseAdmin
            .from('knowledge_entries')
            .select('id')
            .limit(1);

        if (checkError?.code === 'PGRST205') {
            // 表不存在，需要通过 SQL 创建
            // 由于 supabase-js 不支持直接执行 DDL SQL，
            // 我们需要通过 Supabase Dashboard SQL Editor 执行
            return NextResponse.json({
                status: 'manual_required',
                message: '请在 Supabase Dashboard SQL Editor 中执行以下 SQL 文件：',
                files: [
                    'supabase/migrations/20260311_create_knowledge_entries.sql',
                    'supabase/migrations/20260311_migrate_material_reviews.sql',
                ],
                dashboardUrl: `https://supabase.com/dashboard/project/mnkwtiettgeyoihdjlod/sql`,
            });
        }

        results.push('knowledge_entries 表已存在');

        // ============ Step 2: 检查 material_reviews 的 dimension_results 列 ============
        const { data: reviewSample, error: reviewError } = await (supabaseAdmin as any)
            .from('material_reviews')
            .select('id, dimension_results')
            .limit(1);

        if (reviewError) {
            errors.push(`检查 material_reviews 失败: ${reviewError.message}`);
        } else {
            results.push('material_reviews.dimension_results 列已存在');
        }

        // ============ Step 3: 检查种子维度数据 ============
        const { data: seedDims, error: seedError } = await supabaseAdmin
            .from('knowledge_entries')
            .select('id, title')
            .in('id', ['dim-duration', 'dim-hook', 'dim-cta']);

        if (seedError) {
            errors.push(`检查种子数据失败: ${seedError.message}`);
        } else {
            results.push(`种子维度数据: ${seedDims?.length || 0}/3 条`);
        }

        // ============ Step 4: 检查 RPC 函数 ============
        try {
            const { error: rpcError } = await (supabaseAdmin as any).rpc('match_knowledge_entries', {
                query_embedding: JSON.stringify(new Array(1024).fill(0)),
                match_threshold: 0.5,
                match_count: 1,
            });
            if (rpcError) {
                errors.push(`RPC match_knowledge_entries 不可用: ${rpcError.message}`);
            } else {
                results.push('RPC match_knowledge_entries 可用');
            }
        } catch (e: any) {
            errors.push(`RPC 检查异常: ${e.message}`);
        }

        return NextResponse.json({
            status: errors.length === 0 ? 'ok' : 'partial',
            results,
            errors,
        });
    } catch (error: any) {
        return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
    }
}
