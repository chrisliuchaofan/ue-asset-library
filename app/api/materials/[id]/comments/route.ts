import { NextRequest, NextResponse } from 'next/server';
import { requireTeamAccess, isErrorResponse } from '@/lib/team/require-team';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// 获取素材评论列表
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const ctx = await requireTeamAccess('content:read');
    if (isErrorResponse(ctx)) return ctx;

    const { id: materialId } = await params;

    const { data, error } = await (supabaseAdmin as any)
        .from('comments')
        .select('*')
        .eq('material_id', materialId)
        .eq('team_id', ctx.teamId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('[Comments GET] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data || []) as any[];

    // 获取评论者信息（user_id 是 email）
    const userEmails = [...new Set(rows.map(c => c.user_id))];
    let profiles: Record<string, { username: string | null; email: string; avatar_url: string | null }> = {};

    if (userEmails.length > 0) {
        const { data: profileData } = await supabaseAdmin
            .from('profiles')
            .select('id, username, email, avatar_url')
            .in('email', userEmails);

        if (profileData) {
            profileData.forEach((p: any) => {
                profiles[p.email] = { username: p.username, email: p.email, avatar_url: p.avatar_url };
            });
        }
    }

    // 合并评论和用户信息
    const comments = rows.map(c => ({
        ...c,
        author: profiles[c.user_id] || { username: null, email: c.user_id || 'unknown', avatar_url: null },
    }));

    return NextResponse.json(comments);
}

// 创建评论
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const ctx = await requireTeamAccess('content:create');
    if (isErrorResponse(ctx)) return ctx;

    const { id: materialId } = await params;
    const body = await request.json();

    if (!body.content || typeof body.content !== 'string' || body.content.trim().length === 0) {
        return NextResponse.json({ error: '评论内容不能为空' }, { status: 400 });
    }

    if (body.content.length > 2000) {
        return NextResponse.json({ error: '评论内容不能超过 2000 字' }, { status: 400 });
    }

    // user_id 直接使用 email（与 team_members 等表一致）
    const { data, error } = await (supabaseAdmin as any)
        .from('comments')
        .insert({
            material_id: materialId,
            user_id: ctx.email,
            team_id: ctx.teamId,
            content: body.content.trim(),
            parent_id: body.parent_id || null,
        })
        .select()
        .single();

    if (error) {
        console.error('[Comments POST] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 获取用户 profile 信息
    const { data: profileRow } = await supabaseAdmin
        .from('profiles')
        .select('username, email, avatar_url')
        .eq('email', ctx.email)
        .single();

    const profile = profileRow as any;

    return NextResponse.json({
        ...data,
        author: profile ? { username: profile.username, email: profile.email, avatar_url: profile.avatar_url } : { username: null, email: ctx.email, avatar_url: null },
    }, { status: 201 });
}

// 删除评论
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const ctx = await requireTeamAccess('content:delete');
    if (isErrorResponse(ctx)) return ctx;

    const url = new URL(request.url);
    const commentId = url.searchParams.get('commentId');

    if (!commentId) {
        return NextResponse.json({ error: '缺少 commentId' }, { status: 400 });
    }

    const { error } = await (supabaseAdmin as any)
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('team_id', ctx.teamId);

    if (error) {
        console.error('[Comments DELETE] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
