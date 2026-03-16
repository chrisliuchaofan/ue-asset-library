/**
 * 周报 AI 服务
 * 用于生成周报的 AI 智能总结
 */

import { aiService } from '@/lib/ai/ai-service';
import type { AIGenerateTextRequest } from '@/lib/ai/types';
import type { AnalysisResult } from '@/types/weekly-report';

// AnalysisResult 类型已从 @/types/weekly-report 导入

/**
 * 生成周报总结
 * 
 * @param stats 分析统计数据
 * @param weekDateRange 周报日期范围（用于在总结中提及）
 * @returns AI 生成的总结文本
 */
export async function generateReportSummary(
  stats: AnalysisResult,
  weekDateRange?: string
): Promise<string> {
  // 构建系统提示词
  const systemPrompt = `你是一名游戏广告团队的数据分析师。请分析提供的 JSON 统计数据，并用中文写出 3 点简明的周报总结。

要求：
1. 总结要专业、简洁、有洞察力
2. 突出关键数据和趋势
3. 使用数据支撑观点
4. 每点总结不超过 50 字
5. 使用项目符号（•）格式输出

示例格式：
• 本周总消耗 XXX，较上周增长/下降 XX%
• RC 类目消耗占比最高，达到 XX%，共使用 XX 个素材
• 高 ROI 素材占比 XX%，建议重点关注此类素材`;

  // 构建用户提示词
  const userPrompt = `请分析以下周报统计数据${weekDateRange ? `（${weekDateRange}）` : ''}：

${JSON.stringify(stats, null, 2)}

请生成 3 点简明的周报总结。`;

  // 调用 AI 服务生成文本
  const request: AIGenerateTextRequest = {
    prompt: userPrompt,
    systemPrompt,
    maxTokens: 500, // 限制输出长度
    temperature: 0.7, // 适中的创造性
    responseFormat: 'text',
  };

  try {
    // 优先使用 DeepSeek，如果未配置则使用默认提供商（qwen）
    const providerType = process.env.DEEPSEEK_API_KEY ? 'deepseek' : undefined;
    const response = await aiService.generateText(request, providerType);
    return response.text.trim();
  } catch (error) {
    console.error('[Weekly Report AI] 生成总结失败:', error);

    // 如果 AI 调用失败，返回一个基于数据的简单总结
    return generateFallbackSummary(stats, weekDateRange);
  }
}

/**
 * 生成后备总结（当 AI 调用失败时使用）
 */
function generateFallbackSummary(stats: AnalysisResult, weekDateRange?: string): string {
  const lines: string[] = [];

  // 总消耗总结
  if (stats.totalConsumption > 0) {
    lines.push(`• 本周总消耗 ${stats.totalConsumption.toLocaleString('zh-CN')}`);
  }

  // 总素材数总结
  if (stats.totalMaterials > 0) {
    lines.push(`• 共使用 ${stats.totalMaterials} 个素材`);
  }

  // 头部方向总结
  if (stats.topDirection) {
    lines.push(`• ${stats.topDirection.name} 类目消耗占比最高，达到 ${stats.topDirection.percentage.toFixed(1)}%`);
  }

  // ROI 分布总结
  if (stats.roiDistribution) {
    const { high, medium, low } = stats.roiDistribution;
    const total = high + medium + low;
    if (total > 0) {
      const highPercentage = ((high / total) * 100).toFixed(1);
      lines.push(`• 高 ROI 素材占比 ${highPercentage}%，建议重点关注`);
    }
  }

  // 如果没有任何数据，返回默认消息
  if (lines.length === 0) {
    return `• ${weekDateRange || '本周'} 暂无数据统计`;
  }

  return lines.join('\n');
}
