/**
 * AI 模版提取服务
 *
 * 从一组高消耗爆款素材中，利用 AI 提取可复用的"公式"（模版）。
 * 复用 aiService（DeepSeek/Qwen）进行分析，embeddingService 生成向量。
 */

import { aiService } from '@/lib/ai/ai-service';
import type { AIGenerateTextRequest } from '@/lib/ai/types';
import { generateEmbedding } from '@/lib/vector-search';
import { dbCreateTemplate, dbStoreTemplateEmbedding, dbUpsertTemplateMaterialRelation } from './templates-db';
import type { MaterialTemplate, TemplateScene, TemplateCreateInput } from '@/data/template.schema';
import type { Material } from '@/data/material.schema';

// ==================== Prompt 设计 ====================

const EXTRACTION_SYSTEM_PROMPT = `你是一位资深的游戏广告创意分析专家。你的任务是分析一组高消耗/爆款广告素材的共性特征，提炼出一个可复用的"爆款模版"。

**分析维度：**
1. **开头公式（hook_pattern）**：这些爆款素材是如何在前3秒抓住用户注意力的？
   - 悬念型：抛出问题/悬念
   - 对比型：before/after 对比
   - 福利型：直接亮出福利/奖励
   - 情感型：引发情感共鸣
   - 直击痛点型：戳中用户痛点

2. **结构骨架（structure）**：这些素材的叙事结构是什么？拆解为场景序列：
   - hook：开头钩子（0-3秒）
   - selling_point：卖点展示（每个卖点一段）
   - emotion：情感高潮/对比反差
   - cta：行动号召（最后）
   - transition：过渡/转场

3. **目标情绪（target_emotion）**：整体想要激发用户什么情绪？
   - 好奇、紧迫、共鸣、兴奋、恐惧、满足等

4. **推荐时长（recommended_duration）**：这类素材最佳时长是多少秒？

**输出规则（必须严格遵守）：**
1. 返回一个纯 JSON 对象，包含以下字段：
   - "name": 模版名称（简短、有辨识度，如"悬念反转型""福利轰炸型"）
   - "description": 一句话描述这个模版的核心套路
   - "hook_pattern": 开头公式类型
   - "structure": 场景骨架数组，每个元素包含 { "order": 序号, "type": 场景类型, "description": 场景指引, "durationSec": 建议时长, "tips": 制作提示 }
   - "target_emotion": 目标情绪
   - "recommended_duration": 推荐总时长（秒）
   - "tags": 关键词标签数组
2. 不要返回 JSON 以外的任何内容，不要用 markdown 代码块包裹。`;

// ==================== 核心函数 ====================

/**
 * 从一组素材中 AI 提取爆款模版
 *
 * @param materials - 一组高消耗素材
 * @param options - 可选参数（团队ID、用户ID、风格偏好）
 * @returns 创建好的 MaterialTemplate
 */
export async function extractTemplate(
  materials: Material[],
  options?: {
    style?: string;
    teamId?: string;
    userId?: string;
  }
): Promise<MaterialTemplate> {
  if (materials.length === 0) {
    throw new Error('至少需要提供一个素材来提取模版');
  }

  // 1. 构建素材描述文本
  const materialsDescription = materials.map((m, i) => {
    const parts = [
      `素材 ${i + 1}: "${m.name}"`,
      `类型: ${m.type}`,
      `标签: ${m.tag}`,
    ];
    if (m.consumption) parts.push(`消耗: ${m.consumption}元`);
    if (m.roi) parts.push(`ROI: ${m.roi}`);
    if (m.duration) parts.push(`时长: ${m.duration}秒`);
    if (m.conversions) parts.push(`转化数: ${m.conversions}`);
    return parts.join(', ');
  }).join('\n');

  const userPrompt = `请分析以下 ${materials.length} 个爆款广告素材的共性特征，提取出一个可复用的爆款模版：

${materialsDescription}

${options?.style ? `**风格偏好**：${options.style}` : ''}

请直接输出 JSON 对象。`;

  // 2. 调用 AI 分析
  const aiRequest: AIGenerateTextRequest = {
    prompt: userPrompt,
    systemPrompt: EXTRACTION_SYSTEM_PROMPT,
    maxTokens: 2000,
    temperature: 0.7,
    responseFormat: 'text',
  };

  // 3. 解析 AI 输出（复用 script-generator 的 JSON 清理逻辑）
  let parsed: any = null;
  try {
    const response = await aiService.generateText(aiRequest);
    const rawText = response.text.trim();
    const jsonStr = rawText
      .replace(/^```json?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    parsed = JSON.parse(jsonStr);
  } catch (error) {
    console.error('[TemplateExtractor] AI 提取失败，使用基础模版兜底:', error);
    parsed = createFallbackTemplatePayload(materials);
  }

  // 4. 构建结构化数据
  const structure: TemplateScene[] = (parsed.structure || []).map((s: any, i: number) => ({
    order: s.order ?? i,
    type: s.type || 'selling_point',
    description: s.description || '',
    durationSec: Number(s.durationSec || s.duration || 5),
    tips: s.tips || undefined,
  }));

  // 5. 计算效果评分（消耗加权）
  const effectivenessScore = calculateEffectivenessScore(materials);

  // 6. 创建模版输入
  const templateInput: TemplateCreateInput = {
    name: parsed.name || `模版 - ${new Date().toLocaleDateString('zh-CN')}`,
    description: parsed.description,
    sourceMaterialIds: materials.map(m => m.id),
    hookPattern: parsed.hook_pattern,
    structure,
    targetEmotion: parsed.target_emotion,
    style: (options?.style as TemplateCreateInput['style']) || undefined,
    recommendedDuration: Number(parsed.recommended_duration) || undefined,
    tags: parsed.tags || [],
    effectivenessScore,
  };

  // 7. 存入数据库
  const template = await dbCreateTemplate(templateInput, {
    teamId: options?.teamId,
    userId: options?.userId,
  });

  await Promise.all(
    materials.map(material =>
      dbUpsertTemplateMaterialRelation(template.id, {
        materialId: material.id,
        relationType: material.source === 'competitor' ? 'competitor_reference' : 'source',
        createdBy: options?.userId,
      })
    )
  );

  // 8. 生成并存储 embedding（异步，不阻塞返回）
  generateAndStoreEmbedding(template).catch(err => {
    console.error('[TemplateExtractor] Embedding 存储失败:', err);
  });

  return template;
}

// ==================== 辅助函数 ====================

function createFallbackTemplatePayload(materials: Material[]) {
  const sourceNames = materials.map(m => m.name).filter(Boolean);
  const sourcePrefix = sourceNames[0] || '爆款素材';
  const hasCompetitor = materials.some(m => m.source === 'competitor');
  const avgDuration = Math.round(
    materials
      .map(m => m.duration || 0)
      .filter(Boolean)
      .reduce((sum, duration, _, arr) => sum + duration / arr.length, 0)
  );

  return {
    name: `兜底爆款模版 - ${sourcePrefix}`,
    description: `基于 ${sourceNames.length || materials.length} 条素材生成的基础可用模版，AI 服务不可用时保证拆解链路不断。`,
    hook_pattern: hasCompetitor ? '对比型' : '悬念型',
    structure: [
      { order: 0, type: 'hook', description: '前三秒直接抛出强刺激结果或反差问题', durationSec: 3, tips: '用结果、福利或失败反差抢注意力' },
      { order: 1, type: 'selling_point', description: '展示核心玩法/卖点带来的即时收益', durationSec: 6, tips: '一屏只讲一个卖点，避免信息过载' },
      { order: 2, type: 'emotion', description: '放大前后对比，制造爽感、紧迫感或代入感', durationSec: 5, tips: '让用户看到变化，而不只是听到描述' },
      { order: 3, type: 'cta', description: '给出明确行动理由和下载/试玩引导', durationSec: 4, tips: '收口要短，保留强动词' },
    ],
    target_emotion: hasCompetitor ? '紧迫' : '好奇',
    recommended_duration: avgDuration || 18,
    tags: ['兜底模版', hasCompetitor ? '竞品参考' : '内部爆款'],
  };
}

/**
 * 计算效果评分（0-100）
 * 基于来源素材的消耗数据加权计算
 */
function calculateEffectivenessScore(materials: Material[]): number {
  const consumptions = materials
    .map(m => m.consumption)
    .filter((c): c is number => c !== undefined && c > 0);

  if (consumptions.length === 0) return 50; // 无数据时给中等分

  // 平均消耗
  const avgConsumption = consumptions.reduce((a, b) => a + b, 0) / consumptions.length;

  // ROI 加权
  const rois = materials
    .map(m => m.roi)
    .filter((r): r is number => r !== undefined && r > 0);
  const avgRoi = rois.length > 0
    ? rois.reduce((a, b) => a + b, 0) / rois.length
    : 1;

  // 归一化到 0-100（简单 sigmoid 映射）
  // 消耗 > 10000 为高消耗，ROI > 2 为高回报
  const consumptionScore = Math.min(100, (avgConsumption / 10000) * 60);
  const roiBonus = Math.min(40, (avgRoi / 2) * 40);

  return Math.round(Math.min(100, consumptionScore + roiBonus));
}

/**
 * 为模版生成并存储 embedding
 */
async function generateAndStoreEmbedding(template: MaterialTemplate): Promise<void> {
  const text = [
    template.name,
    template.description,
    template.hookPattern,
    template.targetEmotion,
    ...(template.tags || []),
    ...template.structure.map(s => s.description),
  ].filter(Boolean).join(' ');

  const embedding = await generateEmbedding(text);
  if (!embedding) {
    console.warn('[TemplateExtractor] 无法生成 embedding');
    return;
  }

  await dbStoreTemplateEmbedding(template.id, embedding);
  console.log(`[TemplateExtractor] Embedding 已存储: ${template.id}`);
}
