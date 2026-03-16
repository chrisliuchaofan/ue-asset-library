/**
 * W3.1: 访谈对话 API（公开路由 — 仅 token 验证）
 *
 * POST — 发送消息，获取 AI 回复
 * GET  — 获取访谈信息（token 验证）
 */

import { NextResponse } from 'next/server';
import {
  getInterviewByToken,
  appendChatMessage,
  generateInterviewReply,
  generateWelcomeMessage,
  updateInterviewStatus,
} from '@/lib/knowledge/interview-service';
import type { ChatMessage } from '@/lib/knowledge/interview-service';

type RouteParams = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { token } = await params;

  const interview = await getInterviewByToken(token);
  if (!interview) {
    return NextResponse.json({ error: '访谈不存在或已失效' }, { status: 404 });
  }

  // 返回公开信息（不含 team_id, created_by 等敏感字段）
  return NextResponse.json({
    id: interview.id,
    topic: interview.topic,
    guide_questions: interview.guide_questions,
    status: interview.status,
    contributor_name: interview.contributor_name,
    contributor_role: interview.contributor_role,
    chat_history: interview.chat_history,
  });
}

export async function POST(request: Request, { params }: RouteParams) {
  const { token } = await params;

  const interview = await getInterviewByToken(token);
  if (!interview) {
    return NextResponse.json({ error: '访谈不存在或已失效' }, { status: 404 });
  }

  if (interview.status === 'completed' || interview.status === 'archived') {
    return NextResponse.json({ error: '访谈已结束' }, { status: 400 });
  }

  const body = await request.json();
  const { action, message, contributor_name, contributor_role } = body;

  // 开始访谈（设置贡献者信息 + 生成欢迎消息）
  if (action === 'start') {
    if (!contributor_name?.trim()) {
      return NextResponse.json({ error: '请输入姓名' }, { status: 400 });
    }

    // 更新贡献者信息和状态
    await updateInterviewStatus(interview.id, 'in_progress', {
      contributor_name: contributor_name.trim(),
      contributor_role: contributor_role?.trim() || null,
    });

    // 生成欢迎消息
    const updatedInterview = { ...interview, contributor_name: contributor_name.trim() };
    const welcomeMsg = generateWelcomeMessage(updatedInterview);

    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: welcomeMsg,
      timestamp: new Date().toISOString(),
    };

    await appendChatMessage(interview.id, [assistantMessage]);

    return NextResponse.json({ reply: welcomeMsg });
  }

  // 发送消息
  if (action === 'message') {
    if (!message?.trim()) {
      return NextResponse.json({ error: '消息不能为空' }, { status: 400 });
    }

    const userMsg: ChatMessage = {
      role: 'user',
      content: message.trim(),
      timestamp: new Date().toISOString(),
    };

    // 先保存用户消息
    await appendChatMessage(interview.id, [userMsg]);

    // 获取最新的 interview（含刚追加的消息）
    const latestInterview = await getInterviewByToken(token);
    if (!latestInterview) {
      return NextResponse.json({ error: '访谈数据异常' }, { status: 500 });
    }

    // AI 生成回复
    const replyText = await generateInterviewReply(latestInterview, message.trim());

    const assistantMsg: ChatMessage = {
      role: 'assistant',
      content: replyText,
      timestamp: new Date().toISOString(),
    };

    await appendChatMessage(interview.id, [assistantMsg]);

    return NextResponse.json({ reply: replyText });
  }

  // 结束访谈
  if (action === 'end') {
    await updateInterviewStatus(interview.id, 'completed');
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: '未知操作' }, { status: 400 });
}
