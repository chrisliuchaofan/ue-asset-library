/**
 * AI 脚本生成器 — 双模式
 *
 * - free 模式: AI 根据主题/卖点自由创作（Phase 1 原有逻辑）
 * - template 模式: AI 严格按模版场景结构生成（Phase 2 新增）
 */

import { aiService } from '@/lib/ai/ai-service';
import type { AIGenerateTextRequest } from '@/lib/ai/types';
import type { Script, SceneBlock, ScriptGenerateRequest } from './types';
import type { TemplateScene } from '@/data/template.schema';
import { SCENE_TYPE_LABELS } from '@/data/template.schema';

function generateId(): string {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ==================== 自由创作模式 ====================

const FREE_SYSTEM_PROMPT = `你是一位资深的游戏广告视频脚本策划师。你的任务是根据用户提供的主题、卖点和目标时长，生成一份结构化的分镜脚本。

**输出规则（必须严格遵守）：**
1. 返回一个纯 JSON 数组，每个元素代表一个分镜场景。
2. 每个场景包含：
   - "narration": 字幕/旁白文案（15-30字）
   - "visualPrompt": 画面描述（用于后续 AI 生图，50字以内，具体描述镜头画面）
   - "durationSec": 该场景预计时长（秒，整数）
3. **结构要求**：
   - 第 1 场（0-3秒）：必须是强烈的钩子（悬念/冲突/福利预告）
   - 中间场景：展示核心玩法/卖点，1场=1个卖点
   - 倒数第 2 场：情感高潮或对比反差
   - 最后 1 场：明确的 CTA（下载/试玩/关注），带紧迫感
4. 所有场景的 durationSec 之和应接近用户指定的目标时长。
5. 不要返回 JSON 以外的任何内容，不要用 markdown 代码块包裹。`;

function buildFreePrompt(req: ScriptGenerateRequest): string {
    const sellingPointsText = req.sellingPoints.length > 0
        ? req.sellingPoints.map((sp, i) => `${i + 1}. ${sp}`).join('\n')
        : '（用户未提供具体卖点，请根据主题自由发挥）';

    return `请为以下游戏广告素材生成分镜脚本：

**主题/产品**：${req.topic}
**核心卖点**：
${sellingPointsText}
**目标总时长**：${req.targetDuration} 秒
**风格偏好**：${req.style || '不限'}

请直接输出 JSON 数组。`;
}

// ==================== 模版驱动模式 ====================

const TEMPLATE_SYSTEM_PROMPT = `你是一位资深的游戏广告视频脚本策划师。你的任务是**严格按照给定的模版场景结构**，为每个场景生成具体的文案和画面描述。

**输出规则（必须严格遵守）：**
1. 返回一个纯 JSON 数组，场景数量必须与模版中的场景数量**完全一致**。
2. 每个场景包含：
   - "sceneType": 场景类型（原样保留模版中的类型：hook/selling_point/emotion/cta/transition）
   - "narration": 字幕/旁白文案（15-30字，契合该场景类型的表达方式）
   - "visualPrompt": 画面描述（用于 AI 生图，50字以内，具体描述镜头画面、构图、色调）
   - "durationSec": 该场景时长（秒，整数，参考模版建议时长）
3. **场景类型写作指南**：
   - hook（钩子）：用悬念、冲突或福利预告抓住注意力
   - selling_point（卖点）：聚焦展示一个核心卖点/玩法
   - emotion（情感）：制造情感高潮、对比反差或共鸣
   - cta（行动号召）：明确的下载/试玩引导，带紧迫感
   - transition（过渡）：承上启下的短镜头
4. 不要增加或减少场景数量，严格按模版结构输出。
5. 不要返回 JSON 以外的任何内容，不要用 markdown 代码块包裹。`;

function buildTemplatePrompt(req: ScriptGenerateRequest): string {
    const structure = req.templateStructure || [];

    const structureText = structure.map((scene, i) => {
        const typeLabel = SCENE_TYPE_LABELS[scene.type] || scene.type;
        return `场景 ${i + 1} [${scene.type}/${typeLabel}]: ${scene.description} (${scene.durationSec}秒)${scene.tips ? ` — 提示: ${scene.tips}` : ''}`;
    }).join('\n');

    const sellingPointsText = req.sellingPoints.length > 0
        ? req.sellingPoints.map((sp, i) => `${i + 1}. ${sp}`).join('\n')
        : '（请根据主题自由发挥卖点）';

    return `请严格按以下模版结构，为游戏广告素材生成分镜脚本：

**模版结构（共 ${structure.length} 个场景）：**
${structureText}

**主题/产品**：${req.topic}
**核心卖点**：
${sellingPointsText}
**风格偏好**：${req.style || '不限'}

请严格按模版的场景数量和类型输出 JSON 数组。`;
}

// ==================== 统一生成入口 ====================

export async function generateScript(req: ScriptGenerateRequest): Promise<Script> {
    const isTemplateMode = req.mode === 'template' && req.templateStructure && req.templateStructure.length > 0;

    const systemPrompt = isTemplateMode ? TEMPLATE_SYSTEM_PROMPT : FREE_SYSTEM_PROMPT;
    const userPrompt = isTemplateMode ? buildTemplatePrompt(req) : buildFreePrompt(req);

    const aiRequest: AIGenerateTextRequest = {
        prompt: userPrompt,
        systemPrompt,
        maxTokens: 2000,
        temperature: 0.7,
        responseFormat: 'text',
    };

    const response = await aiService.generateText(aiRequest);
    const rawText = response.text.trim();

    // 解析 AI 返回的 JSON
    let scenes: SceneBlock[];
    try {
        const jsonStr = rawText
            .replace(/^```json?\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();

        const parsed = JSON.parse(jsonStr);
        const arr = Array.isArray(parsed) ? parsed : (parsed.scenes || []);

        scenes = arr.map((s: any, i: number) => ({
            id: generateId(),
            order: i,
            narration: s.narration || s.text || '',
            visualPrompt: s.visualPrompt || s.visual || s.description || '',
            durationSec: Number(s.durationSec || s.duration || 3),
            sceneType: s.sceneType || undefined,
            imageStatus: 'idle' as const,
        }));
    } catch {
        // JSON 解析失败，生成单场景兜底
        scenes = [{
            id: generateId(),
            order: 0,
            narration: rawText.substring(0, 100),
            visualPrompt: '画面待补充',
            durationSec: req.targetDuration,
            imageStatus: 'idle' as const,
        }];
    }

    // 模版模式：强制对齐场景数 + 回填 sceneType
    if (isTemplateMode && req.templateStructure) {
        scenes = alignScenesWithTemplate(scenes, req.templateStructure);
    }

    const totalDuration = scenes.reduce((sum, s) => sum + s.durationSec, 0);
    const now = new Date().toISOString();

    const titleSuffix = isTemplateMode ? '模版脚本' : 'AI 脚本';

    return {
        id: generateId(),
        title: `${req.topic} — ${titleSuffix}`,
        scenes,
        totalDuration,
        templateId: req.templateId,
        generationMode: isTemplateMode ? 'template' : 'free',
        createdAt: now,
        updatedAt: now,
    };
}

// ==================== 模版对齐 ====================

/**
 * 强制将 AI 返回的场景与模版结构对齐：
 * - 场景数不够 → 用模版描述补全
 * - 场景数太多 → 截断
 * - 回填 sceneType
 */
function alignScenesWithTemplate(scenes: SceneBlock[], template: TemplateScene[]): SceneBlock[] {
    const aligned: SceneBlock[] = [];

    for (let i = 0; i < template.length; i++) {
        const tpl = template[i];
        const scene = scenes[i];

        if (scene) {
            // AI 返回了这个场景 → 回填 sceneType
            aligned.push({
                ...scene,
                order: i,
                sceneType: tpl.type,
                durationSec: scene.durationSec || tpl.durationSec,
            });
        } else {
            // AI 缺少这个场景 → 用模版描述生成占位
            aligned.push({
                id: generateId(),
                order: i,
                narration: `（${SCENE_TYPE_LABELS[tpl.type]}场景，待补充文案）`,
                visualPrompt: tpl.description || '画面待补充',
                durationSec: tpl.durationSec,
                sceneType: tpl.type,
                imageStatus: 'idle',
            });
        }
    }

    return aligned;
}
