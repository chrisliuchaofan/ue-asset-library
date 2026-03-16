/**
 * Embedding 服务（Phase 1.1）
 * 支持多种 Embedding 服务：智谱AI（优先，免费/低成本）、OpenAI（备选）
 */

import { devLog, devWarn } from './utils/devLog';

// Embedding 服务配置
const ZHIPU_EMBEDDING_API_URL = 'https://open.bigmodel.cn/api/paas/v4/embeddings';
const ZHIPU_EMBEDDING_MODEL = 'embedding-3'; // 支持自定义维度：256, 512, 1024, 2048
const ZHIPU_EMBEDDING_DIMENSION = 1024; // 使用 1024 维（平衡性能和成本）

const OPENAI_EMBEDDING_API_URL = 'https://api.openai.com/v1/embeddings';
const OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small'; // 1536 维
const OPENAI_EMBEDDING_DIMENSION = 1536;

// 默认维度（根据使用的服务动态调整）
let EMBEDDING_DIMENSION = ZHIPU_EMBEDDING_DIMENSION;

/**
 * 检测可用的 Embedding 服务
 * 优先级：智谱AI > OpenAI > 降级方案
 */
const detectEmbeddingService = (): 'zhipu' | 'openai' | 'fallback' => {
  const inBrowser = typeof window !== 'undefined';
  
  if (inBrowser) {
    // 浏览器端：通过 Vite 代理，优先尝试智谱AI
    return 'zhipu'; // 由代理决定实际使用的服务
  }
  
  // Node/脚本环境：检查环境变量
  const zhipuKey = (process.env as any).ZHIPU_API_KEY;
  if (zhipuKey) {
    EMBEDDING_DIMENSION = ZHIPU_EMBEDDING_DIMENSION;
    return 'zhipu';
  }
  
  const openaiKey = (process.env as any).OPENAI_API_KEY;
  if (openaiKey) {
    EMBEDDING_DIMENSION = OPENAI_EMBEDDING_DIMENSION;
    return 'openai';
  }
  
  EMBEDDING_DIMENSION = ZHIPU_EMBEDDING_DIMENSION; // 降级时使用默认维度
  return 'fallback';
};

/**
 * 使用智谱AI生成 Embedding
 */
const generateZhipuEmbedding = async (text: string): Promise<{ values: number[]; isFallback: boolean }> => {
  const inBrowser = typeof window !== 'undefined';
  
  if (inBrowser) {
    // 浏览器端：通过 Vite 代理调用智谱AI
    const response = await fetch('/api/zhipu/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: ZHIPU_EMBEDDING_MODEL,
        input: text,
        dimensions: ZHIPU_EMBEDDING_DIMENSION,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      devWarn('⚠️ 智谱AI Embedding 代理调用失败:', response.status, errorText);
      return { values: new Array(ZHIPU_EMBEDDING_DIMENSION).fill(0), isFallback: true };
    }

    const data = await response.json();
    if (data.data && Array.isArray(data.data) && data.data[0]?.embedding) {
      const embedding = data.data[0].embedding;
      const dimension = embedding.length;
      
      // 检查维度是否匹配预期
      if (dimension !== ZHIPU_EMBEDDING_DIMENSION) {
        devWarn(`⚠️ 智谱AI Embedding 维度不匹配: 期望 ${ZHIPU_EMBEDDING_DIMENSION}，实际 ${dimension}`);
        // 如果维度不匹配，尝试截断或填充（但最好修复配置）
        if (dimension > ZHIPU_EMBEDDING_DIMENSION) {
          devWarn(`⚠️ 截断 embedding 到 ${ZHIPU_EMBEDDING_DIMENSION} 维`);
          embedding.splice(ZHIPU_EMBEDDING_DIMENSION);
        } else if (dimension < ZHIPU_EMBEDDING_DIMENSION) {
          devWarn(`⚠️ 填充 embedding 到 ${ZHIPU_EMBEDDING_DIMENSION} 维`);
          embedding.push(...new Array(ZHIPU_EMBEDDING_DIMENSION - dimension).fill(0));
        }
      }
      
      devLog('✅ 智谱AI Embedding 生成成功（通过代理）:', {
        dimension: embedding.length,
        textLength: text.length,
        model: ZHIPU_EMBEDDING_MODEL,
      });
      return { values: embedding, isFallback: false };
    }

    devWarn('⚠️ 智谱AI Embedding 返回格式异常:', data);
    return { values: new Array(ZHIPU_EMBEDDING_DIMENSION).fill(0), isFallback: true };
  }

  // Node/脚本环境：直接调用智谱AI API
  const apiKey = (process.env as any).ZHIPU_API_KEY;
  if (!apiKey) {
    devWarn('⚠️ ZHIPU_API_KEY 未配置');
    return { values: new Array(ZHIPU_EMBEDDING_DIMENSION).fill(0), isFallback: true };
  }

  const response = await fetch(ZHIPU_EMBEDDING_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: ZHIPU_EMBEDDING_MODEL,
      input: text,
      dimensions: ZHIPU_EMBEDDING_DIMENSION,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    devWarn('⚠️ 智谱AI Embedding API 调用失败:', response.status, errorText);
    return { values: new Array(ZHIPU_EMBEDDING_DIMENSION).fill(0), isFallback: true };
  }

  const data = await response.json();
  if (data.data && Array.isArray(data.data) && data.data[0]?.embedding) {
    const embedding = data.data[0].embedding;
    const dimension = embedding.length;
    
    // 检查维度是否匹配预期
    if (dimension !== ZHIPU_EMBEDDING_DIMENSION) {
      devWarn(`⚠️ 智谱AI Embedding 维度不匹配: 期望 ${ZHIPU_EMBEDDING_DIMENSION}，实际 ${dimension}`);
      // 如果维度不匹配，尝试截断或填充（但最好修复配置）
      if (dimension > ZHIPU_EMBEDDING_DIMENSION) {
        devWarn(`⚠️ 截断 embedding 到 ${ZHIPU_EMBEDDING_DIMENSION} 维`);
        embedding.splice(ZHIPU_EMBEDDING_DIMENSION);
      } else if (dimension < ZHIPU_EMBEDDING_DIMENSION) {
        devWarn(`⚠️ 填充 embedding 到 ${ZHIPU_EMBEDDING_DIMENSION} 维`);
        embedding.push(...new Array(ZHIPU_EMBEDDING_DIMENSION - dimension).fill(0));
      }
    }
    
    devLog('✅ 智谱AI Embedding 生成成功（直接调用）:', {
      dimension: embedding.length,
      textLength: text.length,
      model: ZHIPU_EMBEDDING_MODEL,
    });
    return { values: embedding, isFallback: false };
  }

  devWarn('⚠️ 智谱AI Embedding 返回格式异常:', data);
  return { values: new Array(ZHIPU_EMBEDDING_DIMENSION).fill(0), isFallback: true };
};

/**
 * 使用 OpenAI 生成 Embedding
 */
const generateOpenAIEmbedding = async (text: string): Promise<{ values: number[]; isFallback: boolean }> => {
  const inBrowser = typeof window !== 'undefined';
  
  if (inBrowser) {
    // 浏览器端：通过 Vite 代理调用 OpenAI
    const response = await fetch('/api/openai/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_EMBEDDING_MODEL,
        input: text,
        encoding_format: 'float',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      devWarn('⚠️ OpenAI Embedding 代理调用失败:', response.status, errorText);
      return { values: new Array(OPENAI_EMBEDDING_DIMENSION).fill(0), isFallback: true };
    }

    const data = await response.json();
    if (data.embedding && Array.isArray(data.embedding)) {
      devLog('✅ OpenAI Embedding 生成成功（通过代理）:', {
        dimension: data.embedding.length,
        textLength: text.length,
      });
      return { values: data.embedding, isFallback: false };
    }

    devWarn('⚠️ OpenAI Embedding 返回格式异常:', data);
    return { values: new Array(OPENAI_EMBEDDING_DIMENSION).fill(0), isFallback: true };
  }

  // Node/脚本环境：直接调用 OpenAI API
  const apiKey = (process.env as any).OPENAI_API_KEY;
  if (!apiKey) {
    devWarn('⚠️ OPENAI_API_KEY 未配置');
    return { values: new Array(OPENAI_EMBEDDING_DIMENSION).fill(0), isFallback: true };
  }

  const response = await fetch(OPENAI_EMBEDDING_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_EMBEDDING_MODEL,
      input: text,
      encoding_format: 'float',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    devWarn('⚠️ OpenAI Embedding API 调用失败:', response.status, errorText);
    return { values: new Array(OPENAI_EMBEDDING_DIMENSION).fill(0), isFallback: true };
  }

  const data = await response.json();
  if (data.data && Array.isArray(data.data) && data.data[0]?.embedding) {
    const embedding = data.data[0].embedding;
    devLog('✅ OpenAI Embedding 生成成功（直接调用）:', {
      dimension: embedding.length,
      textLength: text.length,
      model: OPENAI_EMBEDDING_MODEL,
    });
    return { values: embedding, isFallback: false };
  }

  devWarn('⚠️ OpenAI Embedding 返回格式异常:', data);
  return { values: new Array(OPENAI_EMBEDDING_DIMENSION).fill(0), isFallback: true };
};

/**
 * 生成 Embedding 向量
 * @param text 要编码的文本
 * @param taskType 任务类型（RETRIEVAL_QUERY 或 RETRIEVAL_DOCUMENT）
 * @returns Embedding 向量和是否降级标志
 */
export const generateEmbedding = async (
  text: string,
  taskType: 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT'
): Promise<{ values: number[]; isFallback: boolean }> => {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    devWarn('⚠️ generateEmbedding: 输入文本为空');
    return { values: new Array(EMBEDDING_DIMENSION).fill(0), isFallback: true };
  }

  const service = detectEmbeddingService();
  
  try {
    // 优先级：智谱AI > OpenAI > 降级
    if (service === 'zhipu') {
      const result = await generateZhipuEmbedding(text);
      if (!result.isFallback) return result;
      // 如果智谱AI失败，尝试 OpenAI
      devWarn('⚠️ 智谱AI Embedding 失败，尝试 OpenAI...');
      return await generateOpenAIEmbedding(text);
    }
    
    if (service === 'openai') {
      return await generateOpenAIEmbedding(text);
    }
    
    // 降级方案：返回零向量
    devWarn('⚠️ 未配置 Embedding API Key，使用降级方案（零向量）');
    devWarn('💡 提示：配置 ZHIPU_API_KEY 或 OPENAI_API_KEY 以启用 Embedding 功能');
    return { values: new Array(EMBEDDING_DIMENSION).fill(0), isFallback: true };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    devWarn('⚠️ generateEmbedding 异常:', errorMsg);
    return { values: new Array(EMBEDDING_DIMENSION).fill(0), isFallback: true };
  }
};

/**
 * 批量生成 Embedding（用于规则库批量导入）
 * @param texts 文本数组
 * @returns Embedding 向量数组
 */
export const generateEmbeddingsBatch = async (
  texts: string[],
  taskType: 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT' = 'RETRIEVAL_DOCUMENT'
): Promise<Array<{ values: number[]; isFallback: boolean }>> => {
  // OpenAI API 支持批量，但为简化错误处理，这里串行调用
  // 后续可优化为真正的批量 API 调用
  const results = [];
  for (const text of texts) {
    const result = await generateEmbedding(text, taskType);
    results.push(result);
    // 避免速率限制，添加小延迟
    if (results.length < texts.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  return results;
};
