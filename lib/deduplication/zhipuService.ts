import { AnalysisReport } from './types';

// 智谱AI API 配置
const ZHIPU_API_BASE = 'https://open.bigmodel.cn/api/paas/v4';
const ZHIPU_CHAT_ENDPOINT = `${ZHIPU_API_BASE}/chat/completions`;

// 获取 API Key
const getApiKey = () => {
  const apiKey = (process.env as any).ZHIPU_API_KEY;
  if (!apiKey) {
    console.error('❌ 智谱AI API Key 缺失！');
    throw new Error("智谱AI API Key is missing. Please set ZHIPU_API_KEY in .env.local and restart the dev server");
  }
  const maskedKey = apiKey.length > 10 ? apiKey.substring(0, 10) + '...' : '***';
  console.log('✅ 智谱AI API Key 已加载:', maskedKey);
  return apiKey;
};

// 获取请求头
const getHeaders = () => {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${getApiKey()}`,
    'Content-Type': 'application/json',
  };
  return headers;
};

// 错误消息提取
export const extractErrorMessage = (err: any): string => {
  if (err === null || err === undefined) return "未知错误 (Empty)";
  
  if (typeof err === 'string') {
    if (err.includes('[object Object]')) return "操作失败 (Unexpected Object Response)";
    return err.trim() || "未知空错误";
  }

  if (typeof err === 'object') {
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

    if (err.details && typeof err.details === 'string') return err.details;
    if (err.hint && typeof err.hint === 'string') return `${err.message || 'Error'}: ${err.hint}`;
    if (err.statusText && typeof err.statusText === 'string') return err.statusText;

    try {
      const json = JSON.stringify(err);
      if (json && json !== '{}' && json !== '[]') return json;
    } catch {
      // JSON stringify might fail on circular structures
    }
  }

  const final = String(err);
  if (final.includes('[object Object]') || final.includes('[object Error]')) {
    return "系统内部异常 (Opaque System Error)";
  }
  return final;
};

// JSON 提取工具
const extractJson = (text: string): string => {
  if (!text || typeof text !== 'string') {
    throw new Error('输入文本无效');
  }
  
  const trimmed = text.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      JSON.parse(trimmed);
      return trimmed;
    } catch {
      // 继续尝试其他方法
    }
  }
  
  let cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const candidate = jsonMatch[0];
    try {
      JSON.parse(candidate);
      return candidate;
    } catch {
      // 继续尝试
    }
  }
  
  cleaned = cleaned
    .replace(/\\n/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  const finalMatch = cleaned.match(/\{[\s\S]*\}/);
  if (finalMatch) {
    return finalMatch[0];
  }
  
  throw new Error('无法从响应中提取有效的 JSON 数据');
};

// 将文件转换为 base64（优化大文件处理）
const fileToBase64 = async (file: File): Promise<string> => {
  const FILE_SIZE_THRESHOLD = 5 * 1024 * 1024; // 5MB
  
  // 对于大文件，优先提取缩略图（视频）或压缩（图片）
  if (file.size > FILE_SIZE_THRESHOLD) {
    // 视频文件：只提取第一帧
    if (file.type.startsWith('video/')) {
      try {
        // 动态导入 openRouterService 以避免循环依赖
        const { extractKeyFramesFromVideo } = await import('./openRouterService');
        const frames = await extractKeyFramesFromVideo(file, 1);
        if (frames.length > 0) {
          return frames[0].split(',')[1]; // 返回第一帧的 base64（去掉 data:image/jpeg;base64, 前缀）
        }
      } catch (e) {
        console.warn('提取视频第一帧失败，降级为完整编码:', e);
        // 降级为完整编码
      }
    }
    
    // 图片文件：压缩处理
    if (file.type.startsWith('image/')) {
      try {
        const compressed = await compressImage(file, 0.7, 1920); // 70% 质量，最大宽度 1920px
        return compressed;
      } catch (e) {
        console.warn('图片压缩失败，降级为完整编码:', e);
        // 降级为完整编码
      }
    }
  }
  
  // 小文件或降级情况：完整编码
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// 压缩图片（用于大图片文件）
const compressImage = (file: File, quality: number = 0.7, maxWidth: number = 1920): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // 按比例缩放
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('无法创建canvas上下文'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL(`image/${file.type.split('/')[1] || 'jpeg'}`, quality);
        resolve(compressedBase64.split(',')[1]);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// 智谱AI 聊天完成（带重试机制）
async function safeChatCompletion(params: {
  model: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }>;
  temperature?: number;
  response_format?: { type: string };
}): Promise<string> {
  const maxRetries = 3;
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // 转换消息格式以适配智谱AI API
      const formattedMessages = params.messages.map(msg => {
        if (typeof msg.content === 'string') {
          return { role: msg.role, content: msg.content };
        } else {
          // 智谱AI多模态格式处理
          const contentArray = Array.isArray(msg.content) ? msg.content : [msg.content];
          const textParts: string[] = [];
          const imageParts: any[] = [];
          
          for (const item of contentArray) {
            if (typeof item === 'string') {
              textParts.push(item);
            } else if (item && typeof item === 'object') {
              if (item.type === 'image_url' && item.image_url) {
                imageParts.push({
                  type: 'image_url',
                  image_url: { url: item.image_url.url }
                });
              } else if (item.type === 'text' && item.text) {
                textParts.push(item.text);
              }
            }
          }
          
          // 智谱AI需要将文本和图片分开处理
          if (imageParts.length > 0) {
            return {
              role: msg.role,
              content: textParts.join('\n') || '',
              image_urls: imageParts.map(img => img.image_url.url)
            };
          } else {
            return {
              role: msg.role,
              content: textParts.join('\n')
            };
          }
        }
      });

      const requestBody: any = {
        model: params.model,
        messages: formattedMessages,
        temperature: params.temperature ?? 0.7,
      };

      if (params.response_format) {
        requestBody.response_format = params.response_format;
      }

      const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
      const apiUrl = isDev 
        ? '/api/zhipu/chat/completions'  // 使用 Vite 代理
        : ZHIPU_CHAT_ENDPOINT;  // 生产环境直接调用

      console.log('📤 发送智谱AI API 请求:', {
        model: params.model,
        messagesCount: formattedMessages.length,
        url: apiUrl,
        attempt: attempt + 1
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(requestBody),
      });

      console.log('📥 智谱AI API 响应状态:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: { message: errorText || `HTTP ${response.status}` } };
        }
        
        console.error('❌ 智谱AI API 请求失败:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        
        let errorMessage = errorData.error?.message || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        
        // 如果是临时错误，重试
        if (response.status === 429 || response.status === 503 || response.status >= 500) {
          if (attempt < maxRetries - 1) {
            const delay = Math.pow(2, attempt) * 1000; // 指数退避
            console.log(`⏳ 等待 ${delay}ms 后重试...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        throw new Error(errorMessage);
      }

      const completion = await response.json();
      console.log('✅ 智谱AI API 响应成功:', {
        model: params.model,
        hasChoices: !!completion.choices,
        choicesCount: completion.choices?.length || 0
      });
      
      if (!completion || !completion.choices || completion.choices.length === 0) {
        console.error('❌ 智谱AI API 响应格式错误:', completion);
        throw new Error("AI 引擎未返回有效响应。响应数据: " + JSON.stringify(completion).substring(0, 200));
      }
      
      const content = completion.choices[0].message.content;
      if (!content) {
        console.error('❌ 智谱AI API 响应内容为空:', completion);
        throw new Error("AI 响应内容为空。");
      }
      
      console.log('✅ 获取到响应内容，长度:', typeof content === 'string' ? content.length : '非字符串');
      return typeof content === 'string' ? content : JSON.stringify(content);
    } catch (error: any) {
      lastError = error;
      const errorMsg = extractErrorMessage(error);
      
      // 如果是临时错误且还有重试机会，继续重试
      if ((errorMsg.includes("429") || errorMsg.includes("503") || errorMsg.includes("quota") || errorMsg.includes("rate limit")) && attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`⏳ 等待 ${delay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // 最后一次尝试失败，抛出错误
      if (attempt === maxRetries - 1) {
        throw error;
      }
    }
  }

  throw lastError || new Error('智谱AI API 调用失败');
}

// 默认系统提示词
export const DEFAULT_SYSTEM_PROMPT = `你是一位世界顶级、极其挑剔且言辞犀利的游戏广告创意总监。你的唯一目标是：通过审核剔除平庸素材，只留下具有爆款潜质的艺术品。

### 评分红线（绝对严苛，禁止给平庸素材高分）：
- **90+ (S级)**: 极度罕见。前3秒具备核爆级吸引力，视觉无瑕疵，逻辑自洽且极具爽感。
- **80-89 (A级)**: 优秀。有亮点但不够极致，节奏偶尔有微小瑕疵。
- **50-79 (B级)**: 平庸平庸。大多数平庸、缺乏亮点的素材必须落在此区间。**如果只是"还行"，绝对不允许超过65分。**
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

// 分析视频
export const analyzeVideo = async (file: File, systemPrompt: string, model?: string): Promise<AnalysisReport> => {
  const base64Data = await fileToBase64(file);
  const mimeType = file.type;
  const imageUrl = `data:${mimeType};base64,${base64Data}`;

  // 使用传入的模型或默认模型
  const selectedModel = model || 'glm-4-flash'; // 智谱AI默认模型

  const enhancedSystemPrompt = `${systemPrompt}

## 输出格式要求（严格遵守）
1. **必须且只能输出纯 JSON 格式**，不能包含任何 Markdown 代码块标记（如 \`\`\`json）
2. **不能包含任何解释性文字**，输出内容必须是有效的 JSON 对象
3. **所有字段必须完整**，不能缺失 required 字段
4. **时间戳格式**：必须使用 "MM:SS" 格式（如 "00:03", "01:25"）
5. **数字类型**：total_score 和所有评分必须是数字类型，不能是字符串

## JSON 结构示例
{
  "total_score": 75,
  "is_s_tier": false,
  "critique_summary": "点评内容",
  "dimensions": {
    "composition_score": 80,
    "lighting_score": 70,
    "pacing_score": 75,
    "creative_score": 70,
    "art_score": 75
  },
  "detailed_analysis": [
    {
      "time_stamp": "00:03",
      "issue": "问题描述",
      "creative_dimension": "创意层面分析",
      "art_dimension": "美术层面分析",
      "fix_suggestion": "修改建议"
    }
  ],
  "aesthetic_verdict": "美学评估",
  "creative_verdict": "创意建议",
  "hook_strength": "极强/强/中/弱/极差",
  "visual_style": "艺术流派"
}`;

  const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [
    {
      role: 'system',
      content: enhancedSystemPrompt
    },
    {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: imageUrl }
        },
        {
          type: 'text',
          text: '请基于以上严苛审美标准进行神经网络审核。绝对禁止给平庸素材高分。对于每一个发现的问题，必须给出具体的时间戳。\n\n重要：直接输出纯 JSON 对象，不要包含任何 Markdown 标记、代码块或解释性文字。'
        }
      ]
    }
  ];
  
  console.log('📎 素材分析消息已构建:', {
    model: selectedModel,
    fileType: file.type,
    fileSize: file.size,
    hasImage: !!imageUrl,
    imageUrlLength: imageUrl.length,
    messagesCount: messages.length
  });

  console.log('🚀 开始分析素材 (智谱AI):', {
    model: selectedModel,
    fileType: file.type,
    fileSize: file.size,
    hasSystemPrompt: !!systemPrompt
  });

  const text = await safeChatCompletion({
    model: selectedModel,
    messages,
    temperature: 0.3,
    response_format: { type: 'json_object' }
  });

  console.log('📝 收到分析结果，长度:', text?.length || 0);

  if (!text) {
    throw new Error("AI 引擎未返回分析文本。");
  }

  try {
    let jsonStr = text.trim();
    
    jsonStr = jsonStr.replace(/^```json\s*/i, '');
    jsonStr = jsonStr.replace(/^```\s*/i, '');
    jsonStr = jsonStr.replace(/\s*```$/i, '');
    jsonStr = jsonStr.trim();
    
    if (!jsonStr.startsWith('{')) {
      jsonStr = extractJson(text);
    }
    
    const parsed = JSON.parse(jsonStr) as AnalysisReport;
    
    if (typeof parsed.total_score !== 'number') {
      throw new Error(`total_score 必须是数字类型，当前为: ${typeof parsed.total_score}`);
    }
    if (!Array.isArray(parsed.detailed_analysis)) {
      throw new Error('detailed_analysis 必须是数组类型');
    }
    if (!parsed.dimensions) {
      throw new Error('缺少 dimensions 字段');
    }
    
    return parsed;
  } catch (e: any) {
    console.error("JSON Parsing Error:", e);
    console.error("Raw response:", text);
    throw new Error(`报告生成失败：AI 返回的数据格式无法解析。错误信息: ${e.message || '未知错误'}`);
  }
};

// 与报告对话
export const chatWithReport = async (
  report: AnalysisReport, 
  history: { role: 'user' | 'model', text: string }[], 
  message: string
): Promise<string> => {
  const reportContext = JSON.stringify({
    total_score: report.total_score,
    summary: report.critique_summary,
    verdict: report.aesthetic_verdict,
    issues: report.detailed_analysis.map(item => ({
       time: item.time_stamp,
       issue: item.issue,
       fix: item.fix_suggestion
    }))
  });

  const messages = [
    {
      role: 'system' as const,
      content: `你是一位言辞犀利、追求极致的资深买量素材总监。你正在协助用户解读一份神经网络生成的审核报告。
      
      你的沟通原则：
      1. **绝对客观**：平庸素材必须被痛批，严禁任何形式的安慰或客套话。
      2. **理解评分**：70分代表"平庸"，80分代表"优秀"，90分以上代表"爆款潜质"。如果分数低，请直接指出其致命死穴。
      3. **专业深度**：从视觉语言（构图、色彩、光影）和创意逻辑（黄金3s、情绪钩子、转化埋点）进行全方位解析。
      4. **导演指令**：给出的建议必须具有可执行性，像是直接对剪辑师下达的修改军令。
      
      当前报告上下文：${reportContext}`
    },
    ...history.map(h => ({
      role: h.role === 'model' ? 'assistant' as const : 'user' as const,
      content: h.text
    })),
    {
      role: 'user' as const,
      content: message
    }
  ];

  return await safeChatCompletion({
    model: 'glm-4-flash',
    messages,
    temperature: 0.7
  });
};

// 爆款策略拆解
export const breakdownContent = async (input: { text?: string; file?: File; url?: string; model?: string; onChunk?: (chunk: string) => void }): Promise<string> => {
  // 输入验证：检查是否有有效输入
  const hasFile = !!input.file;
  const hasUrl = !!input.url;
  const text = input.text?.trim() || '';
  const hasText = text.length > 0;
  
  // 如果没有文件、URL，且文本为空，拒绝调用
  if (!hasFile && !hasUrl && !hasText) {
    throw new Error('请提供素材（图片、视频或文本描述）');
  }
  
  // 纯文本：无文件、无 URL 时的提示词分支（仅支持本地上传）
  const isPureText = hasText && !hasFile && !hasUrl;
  
  // 视频/图片素材的系统提示词
  const videoImageSystemPrompt = `你是一位世界顶级的游戏广告创意策略专家，专门负责将爆款素材拆解为可复用的 AI 审核标准。

## 你的任务
将用户提供的素材（图片、视频或文本描述）深度分析，提取出能够用于 AI 审核的关键标准和规则。

## 输出要求
你必须输出结构化的 Markdown 格式内容，包含以下部分：

### 1. 素材核心特征
- **视觉风格**：描述素材的视觉特征（色彩、构图、特效风格等）
- **创意逻辑**：分析素材的创意策略（钩子、节奏、情绪设计等）
- **目标受众**：推断素材针对的用户群体

### 2. 爆款要素拆解
- **黄金3秒设计**：前3秒如何抓住注意力
- **情绪触发点**：哪些元素触发了用户情绪
- **转化埋点**：如何引导用户完成转化动作
- **视觉亮点**：哪些视觉元素是核心卖点

### 3. AI 审核标准（核心输出）
将以上分析转化为具体的审核标准，格式如下：

\`\`\`
## 审核标准

### 评分维度
- **构图评分** (0-100): [具体标准]
- **光影评分** (0-100): [具体标准]
- **节奏评分** (0-100): [具体标准]
- **创意评分** (0-100): [具体标准]
- **美术评分** (0-100): [具体标准]

### 扣分规则
1. [具体扣分项1] - 扣XX分
2. [具体扣分项2] - 扣XX分
...

### 必检项
- [ ] [检查项1]
- [ ] [检查项2]
...

### 系统提示词模板
[生成可直接用于 AI 审核的系统提示词]
\`\`\`

## 注意事项
- 分析必须犀利、专业，拒绝客套话
- 标准必须具体、可执行，不能是空泛的描述
- 输出必须是 Markdown 格式，便于后续使用`;

  // 纯文本输入的系统提示词（自然聊天模式）
  const textOnlySystemPrompt = `你是一位拥有15年以上经验的资深视频广告专家，专注于游戏广告创意和素材审核。你以严谨、专业、务实的态度与用户交流。

## 你的身份和风格
- **专业严谨**：基于丰富的实战经验，给出专业且可执行的建议
- **自然对话**：用自然、流畅的语言与用户交流，就像一位经验丰富的导师在指导
- **拒绝模板**：不要使用固定的模板格式，根据用户的具体问题灵活回答
- **深入洞察**：能够从用户的问题中挖掘深层需求，提供有价值的见解

## 对话原则
1. **直接回答**：用户问什么，就回答什么，不要套用固定格式
2. **专业但易懂**：使用专业术语但要解释清楚，让用户理解
3. **结合实际**：结合真实的广告案例和行业经验来回答
4. **鼓励互动**：可以反问、追问，引导用户更深入地思考问题
5. **诚实客观**：如果信息不足，直接说明需要更多信息才能给出准确建议

## 重要提醒
- 用户现在只是文字交流，没有提供视频或图片素材
- 如果用户的问题需要看素材才能回答，可以建议用户上传素材
- 但不要因为缺少素材就拒绝回答，可以基于经验给出通用建议或思路
- 用自然语言回复，不要生成结构化的报告格式`;

  // 根据输入类型选择系统提示词
  const systemPrompt = isPureText ? textOnlySystemPrompt : videoImageSystemPrompt;

  const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [
    {
      role: 'system',
      content: systemPrompt
    }
  ];

  if (input.file) {
    const base64Data = await fileToBase64(input.file);
    const mimeType = input.file.type;
    const imageUrl = `data:${mimeType};base64,${base64Data}`;
    
    messages.push({
      role: 'user',
      content: [
        {
          type: 'text',
          text: '请深度分析这个素材，按照系统提示词的要求，拆解为结构化的 AI 审核标准。输出必须是 Markdown 格式。'
        },
        {
          type: 'image_url',
          image_url: { 
            url: imageUrl
          }
        }
      ]
    });
  } else if (input.url) {
    messages.push({
      role: 'user',
      content: `请分析这个链接的素材：${input.url}\n\n按照系统提示词的要求，拆解为结构化的 AI 审核标准。输出必须是 Markdown 格式。`
    });
  } else if (text.match(/https?:\/\/[^\s]+/)) {
    // 文本中包含视频链接
    messages.push({
      role: 'user',
      content: `请分析这个视频链接：${text}\n\n按照系统提示词的要求，拆解为结构化的 AI 审核标准。输出必须是 Markdown 格式。`
    });
  } else if (hasText) {
    // 纯文本输入 - 自然聊天模式
    messages.push({
      role: 'user',
      content: text
    });
  }

  let selectedModel = input.model || 'glm-4-flash';

  console.log('🚀 开始爆款拆解 (智谱AI):', {
    hasFile: !!input.file,
    hasUrl: !!input.url,
    hasText: !!input.text,
    fileType: input.file?.type,
    model: selectedModel,
    isPureText
  });

  // 纯文本对话使用稍高的温度，让回复更自然；素材分析使用较低温度，保证准确性
  const temperature = isPureText ? 0.7 : 0.2;

  const result = await safeChatCompletion({
    model: selectedModel,
    messages,
    temperature
  });

  console.log('✅ 爆款拆解完成，结果长度:', result?.length || 0);
  
  // 如果有onChunk回调，模拟流式输出效果
  if (input.onChunk) {
    // 将结果分块，模拟打字效果（每5-10个字符显示一次，根据内容长度调整速度）
    const chunkSize = result.length > 1000 ? 10 : 5;
    for (let i = 0; i < result.length; i += chunkSize) {
      const chunk = result.slice(i, i + chunkSize);
      input.onChunk(chunk);
      // 根据内容长度调整延迟：短内容慢一点，长内容快一点
      const delay = result.length > 2000 ? 15 : result.length > 500 ? 20 : 30;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return result;
};

// 描述视频意图
export const describeVideoIntent = async (file: File): Promise<string> => {
  const base64Data = await fileToBase64(file);
  const mimeType = file.type;
  const imageUrl = `data:${mimeType};base64,${base64Data}`;

  const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [
    {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: imageUrl }
        },
        {
          type: 'text',
          text: '描述素材的3个关键词。'
        }
      ]
    }
  ];

  console.log('🔍 描述视频意图 (智谱AI):', {
    fileType: file.type,
    fileSize: file.size,
    hasImage: !!imageUrl,
    imageUrlLength: imageUrl.length
  });

  return await safeChatCompletion({
    model: 'glm-4-flash',
    messages,
    temperature: 0.5
  });
};

// 生成 Embedding（占位符，智谱AI可能需要使用其他方式）
export const generateEmbedding = async (text: string, taskType: 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT'): Promise<{ values: number[], isFallback: boolean }> => {
  console.warn('智谱AI embedding 功能待实现，使用占位符');
  return { values: new Array(768).fill(0), isFallback: true };
};

// 智谱AI可用模型
export const ZHIPU_MODELS = [
  {
    id: 'glm-4-flash',
    name: 'GLM-4 Flash',
    provider: '智谱AI',
    cost: '付费',
    description: '智谱AI快速模型，适合大多数任务'
  },
  {
    id: 'glm-4',
    name: 'GLM-4',
    provider: '智谱AI',
    cost: '付费',
    description: '智谱AI高质量模型，适合复杂分析'
  },
  {
    id: 'glm-4-plus',
    name: 'GLM-4 Plus',
    provider: '智谱AI',
    cost: '付费',
    description: '智谱AI增强版模型，最高质量'
  }
] as const;
