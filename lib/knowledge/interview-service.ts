/**
 * W3.1: 访谈服务 — 管理 + AI 对话 + 知识提取
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { aiService } from '@/lib/ai/ai-service';

// ==================== 类型 ====================

export interface Interview {
  id: string;
  team_id: string | null;
  topic: string;
  guide_questions: string[];
  token: string;
  contributor_name: string | null;
  contributor_role: string | null;
  status: string; // 'pending' | 'in_progress' | 'completed' | 'archived'
  chat_history: ChatMessage[];
  extracted_knowledge_id: string | null;
  created_by: string;
  created_at: string;
  completed_at: string | null;
}

export interface ChatMessage {
  role: 'system' | 'assistant' | 'user';
  content: string;
  timestamp: string;
}

export interface CreateInterviewInput {
  topic: string;
  guide_questions?: string[];
  team_id?: string;
  created_by: string;
}

// ==================== CRUD ====================

/** 生成短 token */
function generateToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/** 创建访谈 */
export async function createInterview(input: CreateInterviewInput): Promise<Interview> {
  const token = generateToken();
  const { data, error } = await (supabaseAdmin.from('knowledge_interviews') as any)
    .insert({
      topic: input.topic,
      guide_questions: input.guide_questions || [],
      token,
      team_id: input.team_id || null,
      created_by: input.created_by,
      status: 'pending',
      chat_history: [],
    })
    .select()
    .single();

  if (error) throw new Error(`创建访谈失败: ${error.message}`);
  return data as Interview;
}

/** 获取团队的所有访谈 */
export async function listInterviews(teamId?: string): Promise<Interview[]> {
  let query = (supabaseAdmin.from('knowledge_interviews') as any)
    .select('*')
    .order('created_at', { ascending: false });

  if (teamId) {
    query = query.eq('team_id', teamId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`获取访谈列表失败: ${error.message}`);
  return (data || []) as Interview[];
}

/** 通过 token 获取访谈 */
export async function getInterviewByToken(token: string): Promise<Interview | null> {
  const { data, error } = await (supabaseAdmin.from('knowledge_interviews') as any)
    .select('*')
    .eq('token', token)
    .single();

  if (error) return null;
  return data as Interview;
}

/** 通过 ID 获取访谈 */
export async function getInterviewById(id: string): Promise<Interview | null> {
  const { data, error } = await (supabaseAdmin.from('knowledge_interviews') as any)
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as Interview;
}

/** 更新访谈状态 */
export async function updateInterviewStatus(
  id: string,
  status: string,
  extra?: Record<string, any>
): Promise<void> {
  const updateData: any = { status, ...extra };
  if (status === 'completed') updateData.completed_at = new Date().toISOString();

  const { error } = await (supabaseAdmin.from('knowledge_interviews') as any)
    .update(updateData)
    .eq('id', id);

  if (error) throw new Error(`更新访谈状态失败: ${error.message}`);
}

/** 追加聊天消息并更新 chat_history */
export async function appendChatMessage(
  id: string,
  messages: ChatMessage[],
  newStatus?: string
): Promise<void> {
  // 先获取当前记录
  const interview = await getInterviewById(id);
  if (!interview) throw new Error('访谈不存在');

  const updatedHistory = [...(interview.chat_history || []), ...messages];
  const updateData: any = { chat_history: updatedHistory };
  if (newStatus) updateData.status = newStatus;

  const { error } = await (supabaseAdmin.from('knowledge_interviews') as any)
    .update(updateData)
    .eq('id', id);

  if (error) throw new Error(`更新聊天记录失败: ${error.message}`);
}

// ==================== AI 对话 ====================

/** 生成 AI 访谈回复 */
export async function generateInterviewReply(
  interview: Interview,
  userMessage: string
): Promise<string> {
  const systemPrompt = buildInterviewSystemPrompt(interview);

  // 构建多轮对话消息
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  // 添加历史对话（最多取最近 20 轮 = 40 条消息）
  const history = (interview.chat_history || []).slice(-40);
  for (const msg of history) {
    if (msg.role === 'assistant' || msg.role === 'user') {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  // 添加用户新消息
  messages.push({ role: 'user', content: userMessage });

  try {
    const response = await aiService.generateText({
      prompt: userMessage, // fallback（messages 优先）
      messages,
      maxTokens: 800,
      temperature: 0.7,
    });

    return response.text;
  } catch (err) {
    console.error('AI 访谈回复生成失败:', err);
    return '抱歉，我暂时无法回复。请稍后再试。';
  }
}

/** 构建访谈系统提示 */
function buildInterviewSystemPrompt(interview: Interview): string {
  const guideQuestionsText = interview.guide_questions.length > 0
    ? `\n\n你需要围绕以下引导问题逐步展开访谈：\n${interview.guide_questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
    : '';

  return `你是一位专业的知识访谈员，正在对游戏广告行业的专家进行知识采集访谈。

访谈话题：${interview.topic}${guideQuestionsText}

访谈要求：
1. 逐步引导，每次只问一个问题，不要一次性抛出多个问题
2. 根据对方的回答进行追问和深挖，挖掘具体案例和细节
3. 保持亲切、专业的语气
4. 如果对方回答太笼统，适当追问具体的方法论、数据、案例
5. 当核心问题都已覆盖时，做一个简短的总结，并表达感谢
6. 回复要简洁，每次不超过 200 字

请用中文进行访谈。`;
}

/** 生成首条欢迎消息 */
export function generateWelcomeMessage(interview: Interview): string {
  const name = interview.contributor_name || '专家';
  return `您好${name}！非常感谢您参与这次知识访谈。

今天我们的访谈主题是：**${interview.topic}**

${interview.guide_questions.length > 0
    ? `我会围绕 ${interview.guide_questions.length} 个方面来了解您的经验和见解。\n\n让我们开始吧 —— ${interview.guide_questions[0]}`
    : `我会通过几个问题来了解您在这方面的经验和见解。请问您能先简单介绍一下您的相关经验吗？`
  }`;
}

// ==================== 知识提取 ====================

/** 从访谈对话中提取结构化知识 */
export async function extractKnowledge(interviewId: string): Promise<string | null> {
  const interview = await getInterviewById(interviewId);
  if (!interview) throw new Error('访谈不存在');
  if (interview.chat_history.length < 2) throw new Error('对话内容不足，无法提取知识');

  // 构建对话文本
  const chatText = interview.chat_history
    .filter(m => m.role === 'assistant' || m.role === 'user')
    .map(m => `${m.role === 'assistant' ? '访谈员' : '专家'}：${m.content}`)
    .join('\n\n');

  const extractPrompt = `以下是一段关于「${interview.topic}」的知识访谈对话记录。请从中提取出有价值的结构化知识。

要求：
1. 总结出 3-8 条核心知识点
2. 每条知识点用标题+详细描述的格式
3. 标注适用场景和关键条件
4. 过滤掉闲聊和无关内容，只保留有价值的专业知识
5. 用 Markdown 格式输出

对话记录：
${chatText}`;

  try {
    const response = await aiService.generateText({
      prompt: extractPrompt,
      systemPrompt: '你是一位知识管理专家，擅长从对话中提取结构化知识。请用中文输出。',
      maxTokens: 2000,
      temperature: 0.3,
    });

    // 创建知识条目
    const { data: entry, error } = await (supabaseAdmin.from('knowledge_entries') as any)
      .insert({
        team_id: interview.team_id,
        user_id: interview.created_by,
        title: `[访谈] ${interview.topic}`,
        content: response.text,
        category: 'general',
        tags: ['访谈', '知识采集'],
        source_type: 'interview',
        status: 'draft',
      })
      .select('id')
      .single();

    if (error) throw new Error(`创建知识条目失败: ${error.message}`);

    // 更新访谈记录的 extracted_knowledge_id
    await (supabaseAdmin.from('knowledge_interviews') as any)
      .update({ extracted_knowledge_id: entry.id })
      .eq('id', interviewId);

    return entry.id;
  } catch (err) {
    console.error('知识提取失败:', err);
    throw err;
  }
}
