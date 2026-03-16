/**
 * W3.1: 访谈管理 API — CRUD
 * GET  — 获取团队访谈列表
 * POST — 创建新访谈
 */

import { NextResponse } from 'next/server';
import { requireTeamAccess } from '@/lib/team/require-team';
import {
  createInterview,
  listInterviews,
  updateInterviewStatus,
  extractKnowledge,
  getInterviewById,
} from '@/lib/knowledge/interview-service';

export async function GET() {
  const ctx = await requireTeamAccess('content:read');
  if (ctx instanceof NextResponse) return ctx;

  try {
    const interviews = await listInterviews(ctx.teamId);
    return NextResponse.json({ interviews });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ctx = await requireTeamAccess('content:create');
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = await request.json();
    const { action } = body;

    // 特殊操作：归档 / 提取知识
    if (action === 'archive') {
      await updateInterviewStatus(body.id, 'archived');
      return NextResponse.json({ success: true });
    }

    if (action === 'extract') {
      const knowledgeId = await extractKnowledge(body.id);
      return NextResponse.json({ knowledgeId });
    }

    // 创建新访谈
    if (!body.topic?.trim()) {
      return NextResponse.json({ error: '话题不能为空' }, { status: 400 });
    }

    const interview = await createInterview({
      topic: body.topic.trim(),
      guide_questions: body.guide_questions || [],
      team_id: ctx.teamId,
      created_by: ctx.userId,
    });

    return NextResponse.json(interview, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
