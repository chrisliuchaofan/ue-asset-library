/**
 * 去重/抄袭检查服务
 * 检查上传的素材是否与已有素材重复或相似
 */
import { AnalysisReport } from './types';

// 从历史档案中检索相似素材（检查是否与已有报告重复）
const getReferenceAssets = async (currentMaterialId?: string): Promise<Array<{
  id: string;
  title: string;
  description: string;
  script?: string;
  performance_score?: number;
}>> => {
  try {
    // 从 Supabase 获取历史报告作为参考素材库
    const { historyService } = await import('./legacySupabase');
    
    // 获取最近的历史报告（排除当前素材）
    const historyRecords = await historyService.getUserHistory('temp-admin-id', 50, 0);
    
    if (historyRecords.length === 0) {
      console.log('📚 历史档案为空，跳过去重检查');
      return [];
    }
    
    // 转换为参考素材格式
    const referenceAssets = historyRecords
      .filter(record => record.id !== currentMaterialId) // 排除当前素材
      .map(record => ({
        id: record.id,
        title: record.file_name,
        description: record.critique_summary || record.aesthetic_verdict || '无描述',
        script: record.creative_verdict || '',
        performance_score: record.total_score
      }));
    
    console.log(`📚 从历史档案检索到 ${referenceAssets.length} 个参考素材`);
    return referenceAssets;
  } catch (error: any) {
    console.warn('⚠️ 获取历史档案失败，使用空参考库:', error.message);
    return [];
  }
};

// 使用AI分析相似度
const analyzeSimilarityWithAI = async (
  materialContent: string,
  referenceAssets: Array<{ id: string; title: string; description: string; script?: string }>
): Promise<{
  similarity_score: number;
  verdict: 'Plagiarism' | 'Inspired' | 'Original';
  details: string;
  matched_assets: Array<{ id: string; title: string; similarity: number }>;
}> => {
  // 构建提示词
  const referenceTexts = referenceAssets.map(asset => 
    `参考素材 ${asset.id} (${asset.title}): ${asset.description}${asset.script ? `\n脚本: ${asset.script}` : ''}`
  ).join('\n\n');

  const prompt = `你是一位专业的素材审核专家。请分析以下上传素材与**历史档案中的已有报告**的相似度，判断是否为重复上传。

上传素材内容：
${materialContent.substring(0, 1000)}

历史档案中的参考报告（${referenceAssets.length}个）：
${referenceTexts}

**重要**：这是去重检查，目的是判断当前素材是否与历史档案中的报告重复。
- 如果内容高度相似（>=80%），可能是重复上传的同一素材
- 如果内容有相似元素（50-80%），可能是相似但不同的素材
- 如果内容差异较大（<50%），判定为原创

请分析相似度并返回JSON格式：
{
  "similarity_score": 0.0-1.0之间的浮点数（0=完全不同，1=完全相同）,
  "verdict": "Plagiarism"（疑似重复，相似度>=0.8）| "Inspired"（有相似，相似度0.5-0.8）| "Original"（原创，相似度<0.5）,
  "details": "详细说明相似之处和差异，如果是重复上传请明确指出",
  "matched_assets": [{"id": "历史报告ID", "title": "文件名", "similarity": 相似度分数}]
}

只返回JSON，不要其他文字。`;

  try {
    // 使用现有的AI服务（智谱AI或OpenRouter）
    const { safeChatCompletion } = await import('./openRouterService');
    
    // 使用 OpenRouter 的默认模型（智谱AI 模型需要通过 OpenRouter，格式为 zhipu/glm-4-flash）
    // 但为了兼容性，使用通用的 GPT-4o-mini 或默认模型
    const { getDefaultModel } = await import('./openRouterService');
    const defaultModel = getDefaultModel();
    
    const response = await safeChatCompletion({
      model: defaultModel, // 使用默认模型（通常是 google/gemini-3-pro-preview）
      messages: [
        {
          role: 'system',
          content: '你是一位专业的素材审核专家，擅长分析素材相似度。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    // 解析JSON响应
    let result;
    try {
      // 移除可能的markdown代码块标记
      const cleaned = response.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      result = JSON.parse(cleaned);
    } catch (e) {
      // 如果解析失败，使用默认值
      result = {
        similarity_score: 0.0,
        verdict: 'Original',
        details: '无法解析AI响应，默认判定为原创',
        matched_assets: []
      };
    }

    return {
      similarity_score: result.similarity_score || 0.0,
      verdict: result.verdict || 'Original',
      details: result.details || '分析完成',
      matched_assets: result.matched_assets || []
    };
  } catch (error: any) {
    console.error('去重检查失败:', error);
    // 返回默认值
    return {
      similarity_score: 0.0,
      verdict: 'Original',
      details: `去重检查失败: ${error.message || '未知错误'}`,
      matched_assets: []
    };
  }
};

/**
 * 检查素材是否重复/抄袭
 * @param materialContent 素材内容（视频描述、脚本等）
 * @param materialId 素材ID（可选）
 * @returns 去重检查结果
 */
export const checkDuplication = async (
  materialContent: string,
  materialId?: string
): Promise<{
  similarity_score: number;
  verdict: 'Plagiarism' | 'Inspired' | 'Original';
  details: string;
  matched_assets: Array<{ id: string; title: string; similarity: number }>;
  timestamp: string;
}> => {
  console.log('🔍 开始去重检查...', { materialId, contentLength: materialContent.length });

  try {
    // 步骤1: 从历史档案获取参考素材库（检查是否与已有报告重复）
    const referenceAssets = await getReferenceAssets(materialId);
    
    // 如果历史档案为空，直接返回原创判定
    if (referenceAssets.length === 0) {
      console.log('📚 历史档案为空，判定为原创');
      return {
        similarity_score: 0.0,
        verdict: 'Original',
        details: '历史档案为空，无法进行去重检查，默认判定为原创',
        matched_assets: [],
        timestamp: new Date().toISOString()
      };
    }

    console.log(`📚 从历史档案检索到 ${referenceAssets.length} 个参考素材`);

    // 步骤2: 使用AI分析相似度
    const analysisResult = await analyzeSimilarityWithAI(materialContent, referenceAssets);
    console.log('✅ 去重检查完成:', analysisResult);

    return {
      ...analysisResult,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    console.error('❌ 去重检查异常:', error);
    return {
      similarity_score: 0.0,
      verdict: 'Original',
      details: `去重检查失败: ${error.message || '未知错误'}`,
      matched_assets: [],
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * 从视频报告中提取文本内容用于去重检查
 */
export const extractContentFromReport = (report: AnalysisReport): string => {
  const parts: string[] = [];
  
  if (report.critique_summary) {
    parts.push(`总结: ${report.critique_summary}`);
  }
  
  if (report.aesthetic_verdict) {
    parts.push(`美学评估: ${report.aesthetic_verdict}`);
  }
  
  if (report.creative_verdict) {
    parts.push(`创意评估: ${report.creative_verdict}`);
  }
  
  if (report.detailed_analysis && report.detailed_analysis.length > 0) {
    const issues = report.detailed_analysis.map(item => 
      `${item.time_stamp}: ${item.issue}`
    ).join('; ');
    parts.push(`详细分析: ${issues}`);
  }
  
  return parts.join('\n');
};
