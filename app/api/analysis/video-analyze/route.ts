/**
 * POST /api/analysis/video-analyze — 竞品视频 AI 多模态分析
 * 接收视频 URL（已上传到 OSS），调用 Qwen VL 分析
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

const QWEN_ENDPOINT = process.env.AI_IMAGE_API_ENDPOINT || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const QWEN_API_KEY = process.env.AI_IMAGE_API_KEY;
const VISION_MODEL = process.env.AI_VISION_MODEL || 'qwen-vl-plus-latest';

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

        if (!QWEN_API_KEY) {
            return NextResponse.json({ message: 'AI 视觉分析服务未配置' }, { status: 500 });
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

        const res = await fetch(`${QWEN_ENDPOINT}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${QWEN_API_KEY}`,
            },
            body: JSON.stringify({
                model: VISION_MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    {
                        role: 'user',
                        content: [
                            { type: 'video', video: videoUrl },
                            { type: 'text', text: '请分析这个广告视频。' },
                        ],
                    },
                ],
                max_tokens: 4096,
            }),
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error('[VideoAnalyze] Qwen VL 调用失败:', res.status, errText);
            return NextResponse.json({ message: `AI 分析失败: ${res.status}` }, { status: 502 });
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || '';

        // 尝试提取 JSON
        let analysis;
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: content };
        } catch {
            analysis = { raw: content };
        }

        return NextResponse.json({ analysis, videoUrl });
    } catch (error) {
        console.error('[VideoAnalyze] 分析失败:', error);
        const message = error instanceof Error ? error.message : '分析失败';
        return NextResponse.json({ message }, { status: 500 });
    }
}
