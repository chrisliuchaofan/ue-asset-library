
import { GoogleGenAI, Type, GenerateContentParameters } from "@google/genai";
import { AnalysisReport } from "./types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing.");
  return new GoogleGenAI({ apiKey });
}

export const extractErrorMessage = (err: any): string => {
  if (err === null || err === undefined) return "未知错误 (Empty)";

  // 1. If it's already a string, check if it's the generic object string
  if (typeof err === 'string') {
    if (err.includes('[object Object]')) return "操作失败 (Unexpected Object Response)";
    return err.trim() || "未知空错误";
  }

  // 2. Handle known object types and common structures
  if (typeof err === 'object') {
    // Check for standard error message properties
    const message = err.message || err.msg || err.error_description || err.error?.message || err.error;

    if (message && typeof message === 'string' && !message.includes('[object Object]')) {
      return message;
    }

    if (message && typeof message === 'object') {
      try {
        const str = JSON.stringify(message);
        if (str && str !== '{}') return str;
      } catch (e) {
        // ignore
      }
    }

    // Check for Supabase / Postgrest style errors
    if (err.details && typeof err.details === 'string') return err.details;
    if (err.hint && typeof err.hint === 'string') return `${err.message || 'Error'}: ${err.hint}`;
    if (err.statusText && typeof err.statusText === 'string') return err.statusText;

    // 3. Last resort: Try JSON stringify on the root object
    try {
      const json = JSON.stringify(err);
      if (json && json !== '{}' && json !== '[]') return json;
    } catch {
      // JSON stringify might fail on circular structures
    }
  }

  // 4. Final fallback using String() with a check
  const final = String(err);
  if (final.includes('[object Object]') || final.includes('[object Error]')) {
    return "系统内部异常 (Opaque System Error)";
  }
  return final;
};

const extractJson = (text: string): string => {
  // 更加鲁棒的 JSON 提取逻辑
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];

  // Fallback: cleaning common markdown pollution
  return text
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .replace(/\\n/g, ' ')
    .trim();
}

async function safeGenerateContent(params: GenerateContentParameters) {
  const ai = getClient();
  try {
    const result = await ai.models.generateContent(params);
    if (!result || !result.candidates || result.candidates.length === 0) {
      throw new Error("AI 引擎未返回有效响应。");
    }
    return result;
  } catch (error: any) {
    const errorMsg = extractErrorMessage(error);
    // Auto-retry with lighter model for non-quota errors if it looks like a transient failure
    if (errorMsg.includes("429") || errorMsg.includes("503") || errorMsg.includes("quota")) {
      try {
        return await ai.models.generateContent({
          ...params,
          model: 'gemini-3-flash-preview',
        });
      } catch (retryError) {
        throw retryError;
      }
    }
    throw error;
  }
}

export const enrichReportWithFrames = async (file: File, report: AnalysisReport): Promise<AnalysisReport> => {
  if (!file || !file.type.startsWith('video/')) return report;

  const parseTime = (timeStr: string) => {
    try {
      const parts = timeStr.split(':');
      if (parts.length === 2) return parseInt(parts[0]) * 60 + parseInt(parts[1]);
      if (parts.length === 3) return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    } catch (e) { }
    return 0;
  };

  const video = document.createElement('video');
  const videoUrl = URL.createObjectURL(file);
  video.src = videoUrl;
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = 'anonymous';

  try {
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = () => resolve(true);
      video.onerror = () => reject(new Error("视频元数据读取失败"));
      // Safety timeout
      setTimeout(() => resolve(false), 5000);
    });
  } catch (e) {
    URL.revokeObjectURL(videoUrl);
    return report;
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const newDetailedAnalysis = [...report.detailed_analysis];

  for (let i = 0; i < newDetailedAnalysis.length; i++) {
    const item = newDetailedAnalysis[i];
    const time = parseTime(item.time_stamp);
    if (time > video.duration) continue;

    video.currentTime = time;
    await new Promise(resolve => {
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        resolve(true);
      };
      video.addEventListener('seeked', onSeeked);
      // Safety timeout
      setTimeout(resolve, 1000);
    });

    if (ctx) {
      const scale = 480 / video.videoWidth;
      canvas.width = 480;
      canvas.height = video.videoHeight * scale;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      item.thumbnail_base64 = canvas.toDataURL('image/jpeg', 0.6);
    }
  }

  video.remove();
  URL.revokeObjectURL(videoUrl);
  return { ...report, detailed_analysis: newDetailedAnalysis };
};

export const chatWithReport = async (
  report: AnalysisReport,
  history: { role: 'user' | 'model', text: string }[],
  message: string
): Promise<string> => {
  const ai = getClient();
  const reportContext = JSON.stringify({
    total_score: report.total_score,
    summary: report.critique_summary,
    verdict: report.aesthetic_verdict,
    issues: report.detailed_analysis.map((item: any) => ({
      time: item.time_stamp,
      issue: item.issue,
      fix: item.fix_suggestion
    }))
  });

  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `你是一位言辞犀利、追求极致的资深买量素材总监。你正在协助用户解读一份神经网络生成的审核报告。
      
      你的沟通原则：
      1. **绝对客观**：平庸素材必须被痛批，严禁任何形式的安慰或客套话。
      2. **理解评分**：70分代表“平庸”，80分代表“优秀”，90分以上代表“爆款潜质”。如果分数低，请直接指出其致命死穴。
      3. **专业深度**：从视觉语言（构图、色彩、光影）和创意逻辑（黄金3s、情绪钩子、转化埋点）进行全方位解析。
      4. **导演指令**：给出的建议必须具有可执行性，像是直接对剪辑师下达的修改军令。
      
      当前报告上下文：${reportContext}`,
    },
    history: history.map(h => ({ role: h.role, parts: [{ text: h.text }] }))
  });

  const result = await chat.sendMessage({ message });
  return result.text || "正在组织致命评论...";
};

export const DEFAULT_SYSTEM_PROMPT = `你是一位世界顶级、极其挑剔且言辞犀利的游戏广告创意总监。你的唯一目标是：通过审核剔除平庸素材，只留下具有爆款潜质的艺术品。

### 评分红线（绝对严苛，禁止给平庸素材高分）：
- **90+ (S级)**: 极度罕见。前3秒具备核爆级吸引力，视觉无瑕疵，逻辑自洽且极具爽感。
- **80-89 (A级)**: 优秀。有亮点但不够极致，节奏偶尔有微小瑕疵。
- **50-79 (B级)**: 平庸平庸。大多数平庸、缺乏亮点的素材必须落在此区间。**如果只是“还行”，绝对不允许超过65分。**
- **50以下 (不及格)**: 垃圾。浪费买量预算，必须原地重做。

### 核心扣分逻辑（必须在详细拆解中体现）：
1. **黄金3秒失效**: 如果前3秒没有立刻触发用户多巴胺，直接扣 30 分起步。
2. **视觉噪音**: UI 杂乱遮挡核心动作、色彩脏、特效廉价感，直接扣 20 分。
3. **反馈感缺失**: 玩家点击或操作后，画面没有夸张且及时的正向反馈（Screen Shake,特效等），直接扣 25 分。
4. **节奏断层**: 镜头转场生硬、无效留白超过 0.2 秒，扣 15 分。

请严格按照以下 JSON 输出，必须使用中文进行犀利分析：
{
  "total_score": number,
  "is_s_tier": boolean,
  "critique_summary": "极度尖锐、一针见血的点评，严禁客套。如果你认为它是垃圾，请直说。",
  "dimensions": { 
    "composition_score": number, 
    "lighting_score": number, 
    "pacing_score": number,
    "creative_score": number,
    "art_score": number
  },
  "detailed_analysis": [
    { "time_stamp": "MM:SS", "issue": "致命问题描述", "creative_dimension": "逻辑层面的平庸之处", "art_dimension": "视觉层面的硬伤", "fix_suggestion": "不容置疑的修改指令" }
  ],
  "aesthetic_verdict": "综合美学评估，必须预测该素材在真实的买量市场中是否会被用户秒关",
  "creative_verdict": "下一版本迭代的具体必杀技建议",
  "hook_strength": "极强/强/中/弱/极差",
  "visual_style": "具体的艺术流派"
}`;

export const breakdownContent = async (input: { text?: string; file?: File; url?: string }): Promise<string> => {
  let parts: any[] = [];
  if (input.file) {
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve) => {
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.readAsDataURL(input.file!);
    });
    const base64Data = await base64Promise;
    parts.push({ inlineData: { data: base64Data, mimeType: input.file.type } });
  } else if (input.url) {
    parts.push({ text: `Target URL: ${input.url}` });
  } else {
    parts.push({ text: input.text || "" });
  }

  const response = await safeGenerateContent({
    model: 'gemini-3-pro-preview',
    contents: { parts },
    config: {
      systemInstruction: `你是一个爆款策略专家，负责将素材拆解为严苛的 AI 审核标准。分析必须见血，拒绝客套.`,
      temperature: 0.2
    }
  });

  return response.text?.trim() || "分析任务受阻。";
};

export const generateEmbedding = async (text: string, taskType: 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT'): Promise<{ values: number[], isFallback: boolean }> => {
  try {
    const ai = getClient();
    const result = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: { parts: [{ text }] },
      config: { taskType }
    }) as any;
    return { values: result.embeddings?.[0]?.values || result.embedding?.values || new Array(768).fill(0), isFallback: false };
  } catch (error) {
    return { values: new Array(768).fill(0), isFallback: true };
  }
};

export const analyzeVideo = async (file: File, systemPrompt: string): Promise<AnalysisReport> => {
  const reader = new FileReader();
  const base64Promise = new Promise<string>((resolve) => {
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.readAsDataURL(file);
  });
  const base64Data = await base64Promise;

  const response = await safeGenerateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType: file.type } },
        { text: "请基于以上严苛审美标准进行神经网络审核。绝对禁止给平庸素材高分。对于每一个发现的问题，必须给出具体的时间戳。输出纯 JSON。" },
      ],
    },
    config: {
      systemInstruction: systemPrompt + "\n必须输出严格的 JSON。严禁 Markdown 标签或任何多余字符。",
      responseMimeType: "application/json",
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("AI 引擎未返回分析文本。");
  }

  try {
    const jsonStr = extractJson(text);
    return JSON.parse(jsonStr) as AnalysisReport;
  } catch (e) {
    console.error("JSON Parsing Error:", e, text);
    throw new Error("报告生成失败：AI 返回的数据格式无法解析。");
  }
};

export const describeVideoIntent = async (file: File): Promise<string> => {
  const reader = new FileReader();
  const base64Promise = new Promise<string>((resolve) => {
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.readAsDataURL(file);
  });
  const base64Data = await base64Promise;

  const response = await safeGenerateContent({
    model: 'gemini-flash-lite-latest',
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType: file.type } },
        { text: "描述素材的3个关键词。" }
      ]
    }
  });
  return response.text?.trim() || "通用素材";
};
