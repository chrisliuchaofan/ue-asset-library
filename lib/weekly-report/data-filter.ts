/**
 * 数据筛选工具
 * 根据推广类型、渠道、素材类型等条件筛选和分组数据
 */

import type { ReportMaterial } from '@/types/weekly-report';
import { nlRuleParser, type ParsedRule } from './nl-rule-parser';

export interface FilteredData {
  /** 按推广类型分组的数据 */
  byPromotionType: {
    weixiao: ReportMaterial[]; // 微小
    douxiao: ReportMaterial[]; // 抖小
    app: ReportMaterial[]; // APP
  };
  /** 按渠道分组的数据 */
  byChannel: {
    toutiao: ReportMaterial[]; // 头条
    guangdiantong: ReportMaterial[]; // 广点通
  };
  /** 头条渠道下按推广类型分组 */
  toutiaoByPromotionType: {
    weixiao: ReportMaterial[];
    douxiao: ReportMaterial[];
  };
  /** 广点通渠道下按素材类型分组 */
  guangdiantongByMaterialType: {
    video: ReportMaterial[];
    image: ReportMaterial[];
    trial: ReportMaterial[];
  };
}

/**
 * 筛选和分组数据
 */
export function filterAndGroupMaterials(materials: ReportMaterial[]): FilteredData {
  const result: FilteredData = {
    byPromotionType: {
      weixiao: [],
      douxiao: [],
      app: [],
    },
    byChannel: {
      toutiao: [],
      guangdiantong: [],
    },
    toutiaoByPromotionType: {
      weixiao: [],
      douxiao: [],
    },
    guangdiantongByMaterialType: {
      video: [],
      image: [],
      trial: [],
    },
  };

  materials.forEach((material) => {
    // 按推广类型分组
    const promotionType = material.promotionType?.toLowerCase() || '';
    
    // 如果推广类型为空，尝试从素材名称推断
    let inferredType = promotionType;
    if (!inferredType && material.name) {
      const nameLower = material.name.toLowerCase();
      if (nameLower.includes('微小') || nameLower.includes('微信')) {
        inferredType = '微小';
      } else if (nameLower.includes('抖小') || nameLower.includes('抖音')) {
        inferredType = '抖小';
      } else if (nameLower.includes('app') || nameLower.includes('应用')) {
        inferredType = 'app';
      }
    }
    
    if (inferredType.includes('微小') || inferredType.includes('微信')) {
      result.byPromotionType.weixiao.push(material);
    } else if (inferredType.includes('抖小') || inferredType.includes('抖音')) {
      result.byPromotionType.douxiao.push(material);
    } else if (inferredType.includes('app') || inferredType.includes('应用')) {
      result.byPromotionType.app.push(material);
    }

    // 按渠道分组
    const channel = material.channel?.toLowerCase() || '';
    if (channel.includes('头条') || channel.includes('今日头条')) {
      result.byChannel.toutiao.push(material);
      
      // 头条下按推广类型再分组
      if (promotionType.includes('微小') || promotionType.includes('微信')) {
        result.toutiaoByPromotionType.weixiao.push(material);
      } else if (promotionType.includes('抖小') || promotionType.includes('抖音')) {
        result.toutiaoByPromotionType.douxiao.push(material);
      }
    } else if (channel.includes('广点通')) {
      result.byChannel.guangdiantong.push(material);
      
      // 广点通下按素材类型分组
      const materialType = material.materialType?.toLowerCase() || '';
      if (materialType.includes('视频') || materialType.includes('video')) {
        result.guangdiantongByMaterialType.video.push(material);
      } else if (materialType.includes('图片') || materialType.includes('image') || materialType.includes('pic')) {
        result.guangdiantongByMaterialType.image.push(material);
      } else if (materialType.includes('试玩') || materialType.includes('trial') || materialType.includes('试玩录屏')) {
        result.guangdiantongByMaterialType.trial.push(material);
      }
    }
  });

  return result;
}

/**
 * 获取消耗排名前十的素材
 */
export function getTop10ByConsumption(materials: ReportMaterial[]): ReportMaterial[] {
  return [...materials]
    .filter((m) => m.consumption !== undefined && m.consumption > 0)
    .sort((a, b) => (b.consumption || 0) - (a.consumption || 0))
    .slice(0, 10);
}

/**
 * 按消耗和 ROI 分类素材
 */
export function categorizeByConsumptionAndROI(materials: ReportMaterial[]): {
  blockbuster: ReportMaterial[]; // 爆款（30w+, roi1%+）
  highQuality: ReportMaterial[]; // 优质（10w+, roi1%+）
  standard: ReportMaterial[]; // 达标（5w+, roi1%+）
  potential: ReportMaterial[]; // 潜力（2-5w, roi1%+）
} {
  const result = {
    blockbuster: [] as ReportMaterial[],
    highQuality: [] as ReportMaterial[],
    standard: [] as ReportMaterial[],
    potential: [] as ReportMaterial[],
  };

  materials.forEach((material) => {
    const consumption = material.consumption || 0;
    const roi = material.firstDayRoi || material.roi || 0;

    if (consumption >= 300000 && roi >= 1) {
      result.blockbuster.push(material);
    } else if (consumption >= 100000 && roi >= 1) {
      result.highQuality.push(material);
    } else if (consumption >= 50000 && roi >= 1) {
      result.standard.push(material);
    } else if (consumption >= 20000 && consumption < 50000 && roi >= 1) {
      result.potential.push(material);
    }
  });

  return result;
}

/**
 * 计算整体数据统计
 */
export function calculateOverallStats(materials: ReportMaterial[]): {
  totalConsumption: number;
  totalMaterials: number;
  averageROI: number;
  passRate: number; // 达标率（首日ROI >= 1%）
} {
  const totalConsumption = materials.reduce((sum, m) => sum + (m.consumption || 0), 0);
  const totalMaterials = materials.length;
  const totalROI = materials.reduce((sum, m) => sum + (m.firstDayRoi || m.roi || 0), 0);
  const averageROI = totalMaterials > 0 ? totalROI / totalMaterials : 0;
  
  const passedMaterials = materials.filter(
    (m) => (m.firstDayRoi || m.roi || 0) >= 1
  ).length;
  const passRate = totalMaterials > 0 ? (passedMaterials / totalMaterials) * 100 : 0;

  return {
    totalConsumption,
    totalMaterials,
    averageROI,
    passRate,
  };
}

/**
 * 从素材名称中提取日期
 * 支持的格式：
 * - 250722 -> 2025年7月22日
 * - 20250722 -> 2025年7月22日
 * - 25年7月 -> 2025年7月
 */
export function extractDateFromName(name: string | null | undefined): Date | null {
  return nlRuleParser.extractDateFromName(name);
}

/**
 * 按时间范围筛选素材
 */
export function filterByDateRange(
  materials: ReportMaterial[],
  after?: Date,
  before?: Date
): ReportMaterial[] {
  return materials.filter((m) => {
    const date = extractDateFromName(m.name);
    if (!date) {
      return false; // 无法提取日期的数据在时间筛选中被排除
    }

    if (after && date < after) {
      return false;
    }

    if (before && date > before) {
      return false;
    }

    return true;
  });
}

/**
 * 按消耗范围筛选素材
 */
export function filterByConsumptionRange(
  materials: ReportMaterial[],
  minConsume?: number,
  maxConsume?: number
): ReportMaterial[] {
  return materials.filter((m) => {
    const consumption = m.consumption || 0;

    if (minConsume !== undefined && consumption < minConsume) {
      return false;
    }

    if (maxConsume !== undefined && consumption > maxConsume) {
      return false;
    }

    return true;
  });
}

/**
 * 获取按字段排序的前N名素材
 */
export function getTopNByField(
  materials: ReportMaterial[],
  field: 'consumption' | 'firstDayRoi',
  n: number
): ReportMaterial[] {
  return [...materials]
    .sort((a, b) => {
      let aValue: number;
      let bValue: number;

      if (field === 'consumption') {
        aValue = a.consumption || 0;
        bValue = b.consumption || 0;
      } else {
        aValue = a.firstDayRoi || a.roi || 0;
        bValue = b.firstDayRoi || b.roi || 0;
      }

      return bValue - aValue; // 降序
    })
    .slice(0, n);
}

/**
 * 应用自然语言规则筛选素材
 */
export function applyNaturalLanguageFilter(
  materials: ReportMaterial[],
  ruleText: string
): ReportMaterial[] {
  return nlRuleParser.applyRule(materials, ruleText);
}

/**
 * 解析并解释自然语言规则
 */
export function explainNaturalLanguageRule(ruleText: string): string {
  return nlRuleParser.explainRule(ruleText);
}

/**
 * 解析自然语言规则（返回结构化对象）
 */
export function parseNaturalLanguageRule(ruleText: string): ParsedRule {
  return nlRuleParser.parseRule(ruleText);
}
