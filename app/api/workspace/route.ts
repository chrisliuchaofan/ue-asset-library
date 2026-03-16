/**
 * GET /api/workspace — 个人工作区聚合查询
 * 查询当前用户的脚本、灵感、素材
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!session?.user) {
            return NextResponse.json({ message: '未登录' }, { status: 401 });
        }

        const userId = session.user.email;
        const { searchParams } = new URL(request.url);
        const tab = searchParams.get('tab') || 'all';
        const limit = Math.min(Number(searchParams.get('limit') || '50'), 100);

        const results: { scripts: any[]; inspirations: any[]; materials: any[] } = {
            scripts: [],
            inspirations: [],
            materials: [],
        };

        // 并行查询
        const queries: Promise<void>[] = [];

        if (tab === 'all' || tab === 'scripts') {
            queries.push(
                (supabaseAdmin as any)
                    .from('scripts')
                    .select('id, title, status, total_duration, scenes, template_id, created_at, updated_at')
                    .eq('user_id', userId)
                    .order('updated_at', { ascending: false })
                    .limit(tab === 'all' ? 10 : limit)
                    .then(({ data }: any) => {
                        results.scripts = (data || []).map((s: any) => ({
                            ...s,
                            sceneCount: Array.isArray(s.scenes) ? s.scenes.length : 0,
                            thumbnail: Array.isArray(s.scenes) ? s.scenes.find((sc: any) => sc.imageUrl)?.imageUrl : undefined,
                            scenes: undefined,
                        }));
                    })
            );
        }

        if (tab === 'all' || tab === 'inspirations') {
            queries.push(
                (supabaseAdmin as any)
                    .from('inspirations')
                    .select('id, title, content, media_urls, tags, source, created_at, updated_at')
                    .eq('user_id', userId)
                    .order('updated_at', { ascending: false })
                    .limit(tab === 'all' ? 10 : limit)
                    .then(({ data }: any) => {
                        results.inspirations = data || [];
                    })
            );
        }

        if (tab === 'all' || tab === 'materials') {
            queries.push(
                (supabaseAdmin as any)
                    .from('materials')
                    .select('id, title, material_type, thumbnail_url, status, created_at, updated_at')
                    .eq('user_id', userId)
                    .order('updated_at', { ascending: false })
                    .limit(tab === 'all' ? 10 : limit)
                    .then(({ data }: any) => {
                        results.materials = data || [];
                    })
            );
        }

        await Promise.all(queries);

        return NextResponse.json({
            stats: {
                scripts: results.scripts.length,
                inspirations: results.inspirations.length,
                materials: results.materials.length,
            },
            ...results,
        });
    } catch (error) {
        console.error('[WorkspaceAPI] 查询失败:', error);
        return NextResponse.json({ message: '获取工作区数据失败' }, { status: 500 });
    }
}
