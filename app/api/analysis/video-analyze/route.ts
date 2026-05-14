/**
 * POST /api/analysis/video-analyze — 竞品视频 AI 多模态分析
 * 接收视频 URL（已上传到 OSS），通过太石 LLM 网关调用多模态模型分析
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { aiService } from '@/lib/ai/ai-service';

const VISION_MODEL = process.env.TUYOO_LLM_VIDEO_MODEL || process.env.TAISHI_QC_MODEL || 'gemini-3-flash-preview';

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session?.user) {
            return NextResponse.json({ message: '未登录' }, { status: 401 });
        }

        const { videoUrl } = await request.json();
        if (!videoUrl) {
            return NextResponse.json({ message: '缺少视频 URL' }, { status: 400 });
        }

        if (!process.env.LLM_TOKEN && !process.env.TAISHI_API_KEY) {
            return NextResponse.json({ message: '太石 LLM 网关未配置（缺少 LLM_TOKEN 或 TAISHI_API_KEY）' }, { status: 500 });
        }

        const systemPrompt = `你是一位资深的游戏广告创意分析师。分析用户提供的广告视频，输出结构化的竞品分析报告。

请按以下 JSON 格式输出分析结果：
{
  "summary": "一句话总结视频核心创意",
  "duration_estimate": "估计视频时长（秒）",
  "scenes": [
    {
      "order": 1,
      "time_range": "0-3s",
      "description": "画面描述",
      "technique": "使用的创意技法",
      "purpose": "这个镜头的作用"
    }
  ],
  "hook_analysis": {
    "hook_type": "开头钩子类型（悬念/冲突/利益/情感/etc）",
    "hook_description": "钩子具体描述",
    "effectiveness": "1-10 分"
  },
  "style": {
    "visual_style": "视觉风格",
    "editing_pace": "剪辑节奏（快/中/慢）",
    "color_tone": "色调",
    "text_overlay": "是否有文字叠加及内容"
  },
  "target_audience": "推测目标受众",
  "key_techniques": ["关键创意技法列表"],
  "strengths": ["优势列表"],
  "weaknesses": ["不足之处"],
  "template_suggestion": {
    "name": "建议模版名称",
    "structure": "建议模版结构描述"
  }
}

只输出 JSON，不要额外解释。`;

        const result = await aiService.generateText({
            prompt: '请分析这个广告视频。',
            systemPrompt,
            model: VISION_MODEL,
            maxTokens: 4096,
            temperature: 0.2,
            messages: [
                { role: 'system', content: systemPrompt },
                {
                    role: 'user',
                    content: [
                        { type: 'video_url', video_url: { url: videoUrl } },
                        { type: 'text', text: '请分析这个广告视频。' },
                    ],
                },
            ],
        }, 'tuyoo');

        const content = result.text || '';

        // 尝试提取 JSON
        let analysis;
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: content };
        } catch {
            analysis = { raw: content };
        }

        return NextResponse.json({ analysis, videoUrl, provider: 'tuyoo', model: VISION_MODEL });
    } catch (error) {
        console.error('[VideoAnalyze] 分析失败:', error);
        const message = error instanceof Error ? error.message : '分析失败';
        const status = /限额|额度|quota|rate limit/i.test(message) ? 429 : 500;
        return NextResponse.json({ message }, { status });
    }
}
