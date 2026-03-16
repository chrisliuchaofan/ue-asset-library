/**
 * 自然语言规则解析器
 * 支持通过自然语言描述筛选条件，自动解析并应用到数据筛选
 */

import type { ReportMaterial } from '@/types/weekly-report';

/**
 * 解析后的规则对象
 */
export interface ParsedRule {
  /** 平台：广点通、头条 */
  platform?: string;
  /** 单个推广类型：微小、抖小、APP */
  promotionType?: string;
  /** 多个推广类型列表（如"微小和抖小"） */
  promotionTypes?: string[];
  /** 试玩筛选：true=只要试玩，false=排除试玩 */
  trialPlay?: boolean;
  /** 素材名筛选：true=只要空值，false=排除空值 */
  materialNameEmpty?: boolean;
  /** Top N 排名 */
  topN?: number;
  /** 排序字段：consumption=消耗，roi=ROI */
  sortBy?: 'consumption' | 'roi';
  /** 时间晚于 */
  dateAfter?: Date;
  /** 时间早于 */
  dateBefore?: Date;
  /** 最小消耗 */
  minConsume?: number;
  /** 最大消耗 */
  maxConsume?: number;
}

/**
 * 自然语言规则解析器
 */
export class NaturalLanguageRuleParser {
  // 平台关键词映射（渠道）
  private platformKeywords: Record<string, string> = {
    '广点通': '广点通',
    '头条': '头条',
    '今日头条': '头条',
  };

  // 推广类型关键词映射
  private promotionTypeKeywords: Record<string, string> = {
    '微小': '微信小游戏',
    '微信': '微信小游戏',
    '微信小游戏': '微信小游戏',
    '抖小': '抖音小游戏',
    '抖音': '抖音小游戏',
    '抖音小游戏': '抖音小游戏',
    'app': 'APP',
    'APP': 'APP',
  };

  // 时间格式模式（支持多种格式）
  private datePatterns = [
    /(\d{2})(\d{2})(\d{2})/, // 250722 -> 25年7月22日
    /(\d{4})(\d{2})(\d{2})/, // 20250722 -> 2025年7月22日
    /(\d{4})-(\d{2})-(\d{2})/, // 2025-07-22
    /(\d{4})\/(\d{2})\/(\d{2})/, // 2025/07/22
    /(\d{2})年(\d{1,2})月/, // 25年7月
  ];

  // 中文数字映射
  private chineseNumbers: Record<string, number> = {
    '一': 1,
    '二': 2,
    '三': 3,
    '四': 4,
    '五': 5,
    '六': 6,
    '七': 7,
    '八': 8,
    '九': 9,
    '十': 10,
    '十一': 11,
    '十二': 12,
    '十三': 13,
    '十四': 14,
    '十五': 15,
    '二十': 20,
    '三十': 30,
    '四十': 40,
    '五十': 50,
    '一百': 100,
    '两百': 200,
    '三百': 300,
    '五百': 500,
    '一千': 1000,
  };

  /**
   * 从素材名称中提取日期
   * 支持的格式：
   * - 250722 -> 2025年7月22日
   * - 20250722 -> 2025年7月22日
   * - 25年7月 -> 2025年7月
   */
  extractDateFromName(name: string | null | undefined): Date | null {
    if (!name) {
      return null;
    }

    const nameStr = String(name);

    // 尝试匹配各种日期格式
    for (const pattern of this.datePatterns) {
      const matches = nameStr.match(pattern);
      if (matches && matches.length > 0) {
        const match = matches[0];
        const groups = matches.slice(1);

        try {
          if (groups.length === 3) {
            let yearPart = groups[0];
            const monthPart = groups[1];
            const dayPart = groups[2] || '1';

            // 处理2位年份（如25 -> 2025）
            let year: number;
            if (yearPart.length === 2) {
              year = 2000 + parseInt(yearPart, 10);
            } else {
              year = parseInt(yearPart, 10);
            }

            const month = parseInt(monthPart, 10);
            const day = parseInt(dayPart, 10);

            // 验证日期有效性
            if (2000 <= year && year <= 2100 && 1 <= month && month <= 12 && 1 <= day && day <= 31) {
              return new Date(year, month - 1, day);
            }
          } else if (groups.length === 2) {
            // 处理 "25年7月" 格式
            let yearPart = groups[0];
            const monthPart = groups[1];

            let year: number;
            if (yearPart.length === 2) {
              year = 2000 + parseInt(yearPart, 10);
            } else {
              year = parseInt(yearPart, 10);
            }

            const month = parseInt(monthPart, 10);

            if (2000 <= year && year <= 2100 && 1 <= month && month <= 12) {
              return new Date(year, month - 1, 1);
            }
          }
        } catch (error) {
          // 继续尝试下一个模式
          continue;
        }
      }
    }

    return null;
  }

  /**
   * 解析自然语言规则
   */
  parseRule(ruleText: string): ParsedRule {
    const rule: ParsedRule = {};

    const ruleLower = ruleText.toLowerCase();

    // 解析平台（渠道）
    for (const [keyword, platform] of Object.entries(this.platformKeywords)) {
      if (ruleText.includes(keyword)) {
        rule.platform = platform;
        break;
      }
    }

    // 解析推广类型（支持多个，如"微小和抖小"）
    const promotionTypesFound: string[] = [];

    // 检查是否包含"和"、"与"、"、"等连接词
    if (ruleText.includes('和') || ruleText.includes('与') || ruleText.includes('、')) {
      // 多个推广类型的情况
      for (const [keyword, promotionType] of Object.entries(this.promotionTypeKeywords)) {
        if (ruleText.includes(keyword)) {
          if (!promotionTypesFound.includes(promotionType)) {
            promotionTypesFound.push(promotionType);
          }
        }
      }

      if (promotionTypesFound.length > 0) {
        rule.promotionTypes = promotionTypesFound;
      }
    } else {
      // 单个推广类型的情况
      for (const [keyword, promotionType] of Object.entries(this.promotionTypeKeywords)) {
        if (ruleText.includes(keyword)) {
          rule.promotionType = promotionType;
          break;
        }
      }
    }

    // 解析试玩（名称包含hx）
    if (ruleText.includes('试玩') || ruleLower.includes('hx')) {
      rule.trialPlay = true;
    }

    // 解析素材名称筛选条件
    // "去掉素材名为空"、"去掉空素材名"、"素材名不为空"、"素材名非空"
    if (
      /(去掉|排除|删除|不要).*素材名.*空/.test(ruleText) ||
      /素材名.*(不为空|非空|有内容|不为空值)/.test(ruleText) ||
      /去掉.*空.*素材/.test(ruleText)
    ) {
      rule.materialNameEmpty = false; // 排除空值
    }
    // "只要素材名为空的"、"素材名为空"
    else if (/(只要|仅).*素材名.*空/.test(ruleText) || /素材名.*为空/.test(ruleText)) {
      rule.materialNameEmpty = true; // 只要空值
    }
    // "根据素材名筛选"、"按素材名筛选" - 默认排除空值
    else if (/(根据|按|按照).*素材名.*筛/.test(ruleText)) {
      rule.materialNameEmpty = false;
    }

    // 解析排名（top N）
    // 先尝试匹配数字
    const topMatch = ruleText.match(/(排名|top|前)\s*(\d+)/i);
    if (topMatch) {
      rule.topN = parseInt(topMatch[2], 10);
    } else {
      // 尝试匹配中文数字（如"前十"）
      for (const [chinese, num] of Object.entries(this.chineseNumbers)) {
        if (ruleText.includes(`前${chinese}`) || ruleText.includes(`排名${chinese}`)) {
          rule.topN = num;
          break;
        }
      }
      // 如果还没匹配到，尝试匹配"前N"格式（N是数字）
      if (rule.topN === undefined) {
        const topMatch2 = ruleText.match(/前\s*(\d+)/);
        if (topMatch2) {
          rule.topN = parseInt(topMatch2[1], 10);
        }
      }
    }

    // 解析排序字段
    if (ruleText.includes('消耗') || ruleText.includes('消费')) {
      rule.sortBy = 'consumption';
    } else if (ruleLower.includes('roi')) {
      rule.sortBy = 'roi';
    } else if (ruleText.includes('新增')) {
      rule.sortBy = 'consumption'; // 默认使用消耗
    } else {
      rule.sortBy = 'consumption'; // 默认按消耗排序
    }

    // 解析时间条件
    // 晚于/之后
    const dateAfterMatch = ruleText.match(/(晚于|之后|以后|大于|>)\s*(\d{2,4})年\s*(\d{1,2})月/);
    if (dateAfterMatch) {
      const yearPart = dateAfterMatch[2];
      const monthPart = dateAfterMatch[3];
      let year: number;
      if (yearPart.length === 2) {
        year = 2000 + parseInt(yearPart, 10);
      } else {
        year = parseInt(yearPart, 10);
      }
      const month = parseInt(monthPart, 10);
      rule.dateAfter = new Date(year, month - 1, 1);
    }

    // 早于/之前
    const dateBeforeMatch = ruleText.match(/(早于|之前|以前|小于|<)\s*(\d{2,4})年\s*(\d{1,2})月/);
    if (dateBeforeMatch) {
      const yearPart = dateBeforeMatch[2];
      const monthPart = dateBeforeMatch[3];
      let year: number;
      if (yearPart.length === 2) {
        year = 2000 + parseInt(yearPart, 10);
      } else {
        year = parseInt(yearPart, 10);
      }
      const month = parseInt(monthPart, 10);
      rule.dateBefore = new Date(year, month - 1, 1);
    }

    // 解析消耗范围
    const consumeMatch = ruleText.match(/消耗\s*(大于|>|>=|小于|<|<=)\s*(\d+)/);
    if (consumeMatch) {
      const op = consumeMatch[1];
      const value = parseFloat(consumeMatch[2]);
      if (op.includes('大于') || op.includes('>')) {
        rule.minConsume = value;
      } else if (op.includes('小于') || op.includes('<')) {
        rule.maxConsume = value;
      }
    }

    return rule;
  }

  /**
   * 应用自然语言规则到素材数据
   */
  applyRule(materials: ReportMaterial[], ruleText: string): ReportMaterial[] {
    let result = [...materials];

    // 解析规则
    const rule = this.parseRule(ruleText);

    // 应用平台筛选（渠道）
    if (rule.platform) {
      result = result.filter((m) => m.channel === rule.platform);
    }

    // 应用推广类型筛选（支持多个）
    if (rule.promotionTypes && rule.promotionTypes.length > 0) {
      result = result.filter((m) => {
        const promotionType = m.promotionType;
        return promotionType && rule.promotionTypes!.includes(promotionType);
      });
    } else if (rule.promotionType) {
      result = result.filter((m) => m.promotionType === rule.promotionType);
    }

    // 应用试玩筛选（素材名称包含hx）
    if (rule.trialPlay !== undefined) {
      result = result.filter((m) => {
        const name = m.name || '';
        const containsHx = name.toLowerCase().includes('hx');
        return containsHx === rule.trialPlay;
      });
    }

    // 应用素材名称筛选（空值/非空值）
    if (rule.materialNameEmpty !== undefined) {
      if (rule.materialNameEmpty) {
        // 只要素材名为空的
        result = result.filter((m) => !m.name || m.name.trim() === '');
      } else {
        // 排除素材名为空的
        result = result.filter((m) => m.name && m.name.trim() !== '');
      }
    }

    // 提取日期并应用时间筛选
    if (rule.dateAfter || rule.dateBefore) {
      result = result.filter((m) => {
        const date = this.extractDateFromName(m.name);
        if (!date) {
          return false; // 无法提取日期的数据在时间筛选中被排除
        }

        if (rule.dateAfter && date < rule.dateAfter) {
          return false;
        }

        if (rule.dateBefore && date > rule.dateBefore) {
          return false;
        }

        return true;
      });
    }

    // 应用消耗范围筛选
    if (rule.minConsume !== undefined) {
      result = result.filter((m) => (m.consumption || 0) >= rule.minConsume!);
    }

    if (rule.maxConsume !== undefined) {
      result = result.filter((m) => (m.consumption || 0) <= rule.maxConsume!);
    }

    // 排序
    const ascending = false; // 默认降序（消耗大的在前）

    // 取前N名
    if (rule.topN) {
      // 如果有多个推广类型，各自取Top N
      if (rule.promotionTypes && rule.promotionTypes.length > 1) {
        // 每种推广类型各自取Top N
        const topResults: ReportMaterial[] = [];
        for (const promoType of rule.promotionTypes) {
          const promoResults = result.filter((m) => m.promotionType === promoType);
          const sorted = this.sortMaterials(promoResults, rule.sortBy || 'consumption', ascending);
          topResults.push(...sorted.slice(0, rule.topN));
        }
        // 合并后再次排序
        result = this.sortMaterials(topResults, rule.sortBy || 'consumption', ascending);
      } else {
        // 单个推广类型，直接排序取Top N
        result = this.sortMaterials(result, rule.sortBy || 'consumption', ascending);
        result = result.slice(0, rule.topN);
      }
    } else {
      // 没有指定Top N，只排序
      result = this.sortMaterials(result, rule.sortBy || 'consumption', ascending);
    }

    return result;
  }

  /**
   * 对素材进行排序
   */
  private sortMaterials(
    materials: ReportMaterial[],
    sortBy: 'consumption' | 'roi',
    ascending: boolean
  ): ReportMaterial[] {
    return [...materials].sort((a, b) => {
      let aValue: number;
      let bValue: number;

      if (sortBy === 'consumption') {
        aValue = a.consumption || 0;
        bValue = b.consumption || 0;
      } else {
        // ROI排序，优先使用首日ROI
        aValue = a.firstDayRoi || a.roi || 0;
        bValue = b.firstDayRoi || b.roi || 0;
      }

      if (ascending) {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });
  }

  /**
   * 解释解析后的规则
   */
  explainRule(ruleText: string): string {
    const rule = this.parseRule(ruleText);
    const explanations: string[] = [];

    if (rule.platform) {
      explanations.push(`平台：${rule.platform}`);
    }

    // 多个推广类型
    if (rule.promotionTypes && rule.promotionTypes.length > 0) {
      explanations.push(`推广类型：${rule.promotionTypes.join('、')}`);
    } else if (rule.promotionType) {
      explanations.push(`推广类型：${rule.promotionType}`);
    }

    if (rule.trialPlay !== undefined) {
      explanations.push(`试玩：${rule.trialPlay ? '是' : '否'}`);
    }

    if (rule.materialNameEmpty !== undefined) {
      if (rule.materialNameEmpty) {
        explanations.push('素材名：只要空值');
      } else {
        explanations.push('素材名：排除空值');
      }
    }

    if (rule.dateAfter) {
      const year = rule.dateAfter.getFullYear();
      const month = rule.dateAfter.getMonth() + 1;
      explanations.push(`时间：晚于 ${year}年${month}月`);
    }

    if (rule.dateBefore) {
      const year = rule.dateBefore.getFullYear();
      const month = rule.dateBefore.getMonth() + 1;
      explanations.push(`时间：早于 ${year}年${month}月`);
    }

    if (rule.minConsume !== undefined) {
      explanations.push(`消耗：≥ ${rule.minConsume}`);
    }

    if (rule.maxConsume !== undefined) {
      explanations.push(`消耗：≤ ${rule.maxConsume}`);
    }

    if (rule.topN) {
      const sortField = rule.sortBy === 'roi' ? 'ROI' : '消耗';
      explanations.push(`排序：按${sortField}降序，取前${rule.topN}名`);
    } else if (rule.sortBy && rule.sortBy !== 'consumption') {
      const sortField = rule.sortBy === 'roi' ? 'ROI' : '消耗';
      explanations.push(`排序：按${sortField}降序`);
    }

    if (explanations.length === 0) {
      return '未识别到有效规则';
    }

    return explanations.join(' | ');
  }
}

// 导出单例实例
export const nlRuleParser = new NaturalLanguageRuleParser();
