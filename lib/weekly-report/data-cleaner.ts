/**
 * 数据清理工具
 * 在本地对 Excel 数据进行筛选和清理
 */

import type { ReportMaterial } from '@/types/weekly-report';
import { parseMaterialName } from './name-parser';

export interface CleanResult {
  cleaned: ReportMaterial[];
  removed: {
    emptyName: number;
    zeroConsumption: number; // 实际是 <=1w 的数量
    duplicates: number;
    total: number;
  };
  stats: {
    originalCount: number;
    cleanedCount: number;
    totalConsumption: number;
  };
}

/**
 * 清理数据
 * 1. 移除素材名为空的
 * 2. 移除消耗小于等于1w的（仅保留消耗>1w的）
 * 3. 移除重复命名的（保留第一个）
 */
export function cleanMaterials(materials: ReportMaterial[]): CleanResult {
  const originalCount = materials.length;
  const removed = {
    emptyName: 0,
    zeroConsumption: 0,
    duplicates: 0,
    total: 0,
  };

  // 第一步：移除素材名为空的
  let cleaned = materials.filter((material) => {
    if (!material.name || material.name.trim() === '') {
      removed.emptyName++;
      return false;
    }
    return true;
  });

  // 第二步：仅保留消耗>1w的素材（10000）
  cleaned = cleaned.filter((material) => {
    const consumption = material.consumption || 0;
    if (consumption <= 10000) {
      removed.zeroConsumption++;
      return false;
    }
    return true;
  });

  // 第三步：移除重复命名的（保留第一个出现的）
  const seenNames = new Set<string>();
  const deduplicated: ReportMaterial[] = [];
  
  for (const material of cleaned) {
    const normalizedName = material.name.trim().toLowerCase();
    if (!seenNames.has(normalizedName)) {
      seenNames.add(normalizedName);
      deduplicated.push(material);
    } else {
      removed.duplicates++;
    }
  }

  // 第四步：解析素材名称，提取分类标签和创意类型
  const enriched = deduplicated.map((material) => {
    const parsed = parseMaterialName(material.name);
    
    // 将解析结果添加到素材数据中
    return {
      ...material,
      // 如果Excel中没有direction，使用解析出的direction
      direction: material.direction || parsed.direction,
      // 如果Excel中没有category，使用解析出的creativeType
      category: material.category || parsed.creativeType,
      // 添加解析出的标签
      parsedDirection: parsed.direction,
      parsedCreativeType: parsed.creativeType,
      parsedTechType: parsed.techType,
      parsedCreativeTag: parsed.creativeTag,
      parsedTags: parsed.tags || [],
    };
  });

  // 计算总消耗
  const totalConsumption = enriched.reduce((sum, material) => {
    return sum + (material.consumption || 0);
  }, 0);

  removed.total = originalCount - enriched.length;

  return {
    cleaned: enriched,
    removed,
    stats: {
      originalCount,
      cleanedCount: enriched.length,
      totalConsumption,
    },
  };
}

/**
 * 验证清理后的数据
 */
export function validateCleanedData(materials: ReportMaterial[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (materials.length === 0) {
    errors.push('清理后的数据为空，请检查原始数据');
  }

  // 检查是否还有空名称
  const hasEmptyName = materials.some((m) => !m.name || m.name.trim() === '');
  if (hasEmptyName) {
    errors.push('清理后的数据中仍存在空名称');
  }

  // 检查是否还有重复
  const names = materials.map((m) => m.name.trim().toLowerCase());
  const uniqueNames = new Set(names);
  if (names.length !== uniqueNames.size) {
    errors.push('清理后的数据中仍存在重复名称');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
