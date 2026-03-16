import { NextResponse } from 'next/server';
import { createServerSupabaseClient as createClient } from '@/lib/supabase/server';
import { requireTeamAccess, isErrorResponse } from '@/lib/team/require-team';

export async function GET(req: Request) {
    try {
        const ctx = await requireTeamAccess('content:read');
        if (isErrorResponse(ctx)) return ctx;

        const { searchParams } = new URL(req.url);
        const materialId = searchParams.get('materialId');

        const supabase = (await createClient()) as any;

        if (materialId) {
            // Fetch single review
            const { data, error } = await supabase
                .from('material_reviews')
                .select('*')
                .eq('material_id', materialId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return NextResponse.json(data || null);
        } else {
            // Fetch batch / recent reviews
            const { data, error } = await supabase
                .from('material_reviews')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            return NextResponse.json(data);
        }

    } catch (error: any) {
        console.error('查询审查记录失败:', error);
        return NextResponse.json({ error: error.message || '内部服务错误' }, { status: 500 });
    }
}
