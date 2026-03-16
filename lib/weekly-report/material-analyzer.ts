/**
 * 素材数据分析器
 * 解析 Excel 文件并计算统计数据
 */

import * as XLSX from 'xlsx';
import type { ReportMaterial, AnalysisResult } from '@/types/weekly-report';

/**
 * 解析 Excel 文件
 * 
 * @param file Excel 文件
 * @returns 素材数据数组
 */
export async function parseExcelFile(file: File): Promise<ReportMaterial[]> {
  // 1. 读取文件为 ArrayBuffer
  const buffer = await file.arrayBuffer();

  // 2. 使用 XLSX 解析
  const workbook = XLSX.read(buffer, { type: 'array' });

  // 3. 获取第一个工作表（或根据实际需要选择）
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // 4. 转换为 JSON（第一行作为表头）
  const rawData = XLSX.utils.sheet_to_json(worksheet, {
    header: 1, // 使用数组格式，第一行是表头
    defval: null, // 空单元格返回 null
  }) as any[];

  if (rawData.length < 2) {
    throw new Error('Excel 文件数据不足，至少需要表头和数据行');
  }

  // 5. 检测并跳过标题行（如果第一行是标题，如"微小素材"）
  let headerRowIndex = 0;
  let dataStartIndex = 1;

  // 检查第一行是否包含"微小素材"、"抖小素材"等标题
  const firstRow = rawData[0] as string[];
  const firstRowText = firstRow.join('').toLowerCase();
  if (firstRowText.includes('微小素材') || firstRowText.includes('抖小素材') || firstRowText.includes('app素材')) {
    // 第一行是标题，表头在第二行
    headerRowIndex = 1;
    dataStartIndex = 2;
  }

  // 6. 从文件名推断推广类型（如果 Excel 中没有推广类型列）
  let inferredPromotionType: string | undefined;
  const fileName = file.name.toLowerCase();
  if (fileName.includes('微小') || fileName.includes('微信')) {
    inferredPromotionType = '微小';
  } else if (fileName.includes('抖小') || fileName.includes('抖音')) {
    inferredPromotionType = '抖小';
  } else if (fileName.includes('app') || fileName.includes('应用')) {
    inferredPromotionType = 'APP';
  }

  // 如果第一行是标题，也从标题推断
  if (!inferredPromotionType && headerRowIndex === 1) {
    if (firstRowText.includes('微小')) {
      inferredPromotionType = '微小';
    } else if (firstRowText.includes('抖小')) {
      inferredPromotionType = '抖小';
    } else if (firstRowText.includes('app')) {
      inferredPromotionType = 'APP';
    }
  }

  // 7. 提取表头
  const headers = rawData[headerRowIndex] as string[];

  // 6. 映射表头到字段名（根据实际 Excel 结构调整）
  // 支持多种列名变体，提高兼容性
  const headerMap: Record<string, string> = {
    // 素材名称映射（多种变体）
    '素材名称': 'name',
    '素材名': 'name',
    '名称': 'name',
    '素材': 'name',
    'Material Name': 'name',
    'Name': 'name',

    // 分类映射
    '分类': 'category',
    '类目': 'category',
    '类型': 'category',
    'Category': 'category',
    'Type': 'category',

    // 方向映射
    '方向': 'direction',
    'Direction': 'direction',
    '游戏方向': 'direction',
    'Game Direction': 'direction',

    // 推广类型映射（微小、抖小、APP）
    '推广类型': 'promotionType',
    '平台类型': 'promotionType',
    '游戏类型': 'promotionType',
    'Promotion Type': 'promotionType',
    'Platform Type': 'promotionType',
    '微小': 'promotionType',
    '抖小': 'promotionType',
    'APP': 'promotionType',
    '微信小游戏': 'promotionType',
    '抖音小游戏': 'promotionType',
    '应用': 'promotionType',

    // 渠道映射（头条、广点通）
    '渠道': 'channel',
    '投放渠道': 'channel',
    '媒体渠道': 'channel',
    'Channel': 'channel',
    'Media Channel': 'channel',
    '头条': 'channel',
    '今日头条': 'channel',
    '广点通': 'channel',

    // 素材类型映射（视频、图片、试玩）
    '素材类型': 'materialType',
    '媒体类型': 'materialType',
    'Material Type': 'materialType',
    'Media Type': 'materialType',
    '视频': 'materialType',
    '图片': 'materialType',
    '试玩': 'materialType',

    // 消耗映射
    '消耗': 'consumption',
    '消费': 'consumption',
    '花费': 'consumption',
    'Consumption': 'consumption',
    'Cost': 'consumption',
    'Spend': 'consumption',

    // ROI 映射
    'ROI': 'roi',
    '投资回报率': 'roi',
    'Return on Investment': 'roi',
    '首日roi': 'firstDayRoi',
    '首日ROI': 'firstDayRoi',
    '3日roi': 'day3Roi',
    '3日ROI': 'day3Roi',
    '7日roi': 'day7Roi',
    '7日ROI': 'day7Roi',
    '累计roi': 'cumulativeRoi',
    '累计ROI': 'cumulativeRoi',

    // 成本相关映射
    '新增成本': 'newCost',
    '付费成本': 'paidCost',
    '付费率': 'paymentRate',

    // 媒体链接映射（华为云 OBS）- 视频链接
    '视频链接': 'mediaUrl',
    '媒体链接': 'mediaUrl',
    '视频URL': 'mediaUrl',
    'Video URL': 'mediaUrl',
    'Media URL': 'mediaUrl',
    'URL': 'mediaUrl',
    '链接': 'mediaUrl',
    '华为云链接': 'mediaUrl',
    'OBS链接': 'mediaUrl',
    'OBS 链接': 'mediaUrl',

    // 封面链接映射（预览图片）
    '封面链接': 'previewUrl',
    '预览链接': 'previewUrl',
    '封面': 'previewUrl',
    '预览': 'previewUrl',
    '缩略图': 'previewUrl',
    '图片链接': 'previewUrl',
    'Preview URL': 'previewUrl',
    'Thumbnail URL': 'previewUrl',
    'Cover URL': 'previewUrl',
    'Image URL': 'previewUrl',
  };

  // 7. 构建字段映射索引
  const fieldIndexMap: Record<string, number> = {};
  headers.forEach((header, index) => {
    const normalizedHeader = header?.trim() || '';
    // 先尝试精确匹配
    let fieldName = headerMap[normalizedHeader];

    // 如果精确匹配失败，尝试不区分大小写的匹配
    if (!fieldName) {
      const lowerHeader = normalizedHeader.toLowerCase();
      for (const [key, value] of Object.entries(headerMap)) {
        if (key.toLowerCase() === lowerHeader) {
          fieldName = value;
          break;
        }
      }
    }

    // 如果还是没匹配到，尝试部分匹配（用于处理可能的空格或特殊字符）
    if (!fieldName) {
      const cleanHeader = normalizedHeader.replace(/\s+/g, ''); // 移除所有空格
      for (const [key, value] of Object.entries(headerMap)) {
        const cleanKey = key.replace(/\s+/g, '');
        if (cleanKey === cleanHeader || cleanKey.toLowerCase() === cleanHeader.toLowerCase()) {
          fieldName = value;
          break;
        }
      }
    }

    if (fieldName) {
      fieldIndexMap[fieldName] = index;
      console.log(`[Weekly Report] 识别列: "${normalizedHeader}" -> ${fieldName} (索引: ${index})`);
    }
  });

  // 调试：输出识别到的字段映射
  console.log('[Weekly Report] 字段映射结果:', fieldIndexMap);

  // 如果第一列没有识别为任何字段，但包含素材名称特征（如 .mp4），则将其作为素材名称
  if (fieldIndexMap.name === undefined && headers.length > 0) {
    // 检查第一列是否可能是素材名称（检查数据行中是否有 .mp4 等特征）
    const firstColumnSample = rawData.slice(dataStartIndex, Math.min(dataStartIndex + 5, rawData.length))
      .map(row => String(row[0] || '').trim())
      .filter(Boolean);

    // 如果第一列的数据包含文件扩展名或长字符串，可能是素材名称
    if (firstColumnSample.some(val => val.includes('.mp4') || val.includes('.') || val.length > 20)) {
      fieldIndexMap.name = 0;
      console.log('[Weekly Report] 检测到第一列为素材名称');
    }
  }

  // 8. 转换数据行（从 dataStartIndex 开始）
  const materials: ReportMaterial[] = [];
  for (let i = dataStartIndex; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || row.length === 0) continue;

    const material: ReportMaterial = {
      name: '',
    };

    // 提取字段值
    if (fieldIndexMap.name !== undefined) {
      material.name = String(row[fieldIndexMap.name] || '').trim();
    }

    if (fieldIndexMap.category !== undefined) {
      material.category = String(row[fieldIndexMap.category] || '').trim() || undefined;
    }

    if (fieldIndexMap.direction !== undefined) {
      material.direction = String(row[fieldIndexMap.direction] || '').trim() || undefined;
    }

    if (fieldIndexMap.consumption !== undefined) {
      const consumptionValue = row[fieldIndexMap.consumption];
      if (consumptionValue !== null && consumptionValue !== undefined) {
        material.consumption = parseFloat(String(consumptionValue)) || undefined;
      }
    }

    if (fieldIndexMap.roi !== undefined) {
      const roiValue = row[fieldIndexMap.roi];
      if (roiValue !== null && roiValue !== undefined) {
        material.roi = parseFloat(String(roiValue)) || undefined;
      }
    }

    // 推广类型
    if (fieldIndexMap.promotionType !== undefined) {
      const promotionTypeValue = String(row[fieldIndexMap.promotionType] || '').trim();
      if (promotionTypeValue) {
        // 标准化推广类型值
        const normalized = promotionTypeValue.toLowerCase();
        if (normalized.includes('微信') || normalized.includes('微小')) {
          material.promotionType = '微小';
        } else if (normalized.includes('抖音') || normalized.includes('抖小')) {
          material.promotionType = '抖小';
        } else if (normalized.includes('app') || normalized.includes('应用')) {
          material.promotionType = 'APP';
        } else {
          material.promotionType = promotionTypeValue;
        }
      }
    }

    // 如果 Excel 中没有推广类型列，使用推断的推广类型
    if (!material.promotionType && inferredPromotionType) {
      material.promotionType = inferredPromotionType;
    }

    // 渠道
    if (fieldIndexMap.channel !== undefined) {
      const channelValue = String(row[fieldIndexMap.channel] || '').trim();
      if (channelValue) {
        // 标准化渠道值
        const normalized = channelValue.toLowerCase();
        if (normalized.includes('头条') || normalized.includes('今日头条')) {
          material.channel = '头条';
        } else if (normalized.includes('广点通')) {
          material.channel = '广点通';
        } else {
          material.channel = channelValue;
        }
      }
    }

    // 素材类型
    if (fieldIndexMap.materialType !== undefined) {
      const materialTypeValue = String(row[fieldIndexMap.materialType] || '').trim();
      if (materialTypeValue) {
        material.materialType = materialTypeValue;
      }
    }

    // ROI 相关字段
    if (fieldIndexMap.firstDayRoi !== undefined) {
      const roiValue = row[fieldIndexMap.firstDayRoi];
      if (roiValue !== null && roiValue !== undefined) {
        material.firstDayRoi = parseFloat(String(roiValue)) || undefined;
      }
    }

    if (fieldIndexMap.day3Roi !== undefined) {
      const roiValue = row[fieldIndexMap.day3Roi];
      if (roiValue !== null && roiValue !== undefined) {
        material.day3Roi = parseFloat(String(roiValue)) || undefined;
      }
    }

    if (fieldIndexMap.day7Roi !== undefined) {
      const roiValue = row[fieldIndexMap.day7Roi];
      if (roiValue !== null && roiValue !== undefined) {
        material.day7Roi = parseFloat(String(roiValue)) || undefined;
      }
    }

    if (fieldIndexMap.cumulativeRoi !== undefined) {
      const roiValue = row[fieldIndexMap.cumulativeRoi];
      if (roiValue !== null && roiValue !== undefined) {
        material.cumulativeRoi = parseFloat(String(roiValue)) || undefined;
      }
    }

    // 成本相关字段
    if (fieldIndexMap.newCost !== undefined) {
      const costValue = row[fieldIndexMap.newCost];
      if (costValue !== null && costValue !== undefined) {
        material.newCost = parseFloat(String(costValue)) || undefined;
      }
    }

    if (fieldIndexMap.paidCost !== undefined) {
      const costValue = row[fieldIndexMap.paidCost];
      if (costValue !== null && costValue !== undefined) {
        material.paidCost = parseFloat(String(costValue)) || undefined;
      }
    }

    if (fieldIndexMap.paymentRate !== undefined) {
      const rateValue = row[fieldIndexMap.paymentRate];
      if (rateValue !== null && rateValue !== undefined) {
        material.paymentRate = parseFloat(String(rateValue)) || undefined;
      }
    }

    // 视频链接（媒体文件）
    if (fieldIndexMap.mediaUrl !== undefined) {
      const urlValue = String(row[fieldIndexMap.mediaUrl] || '').trim();
      if (urlValue) {
        // 支持 http/https 开头的完整 URL，也支持相对路径
        if (urlValue.startsWith('http://') || urlValue.startsWith('https://') || urlValue.startsWith('/')) {
          material.mediaUrl = urlValue;
          console.log(`[Weekly Report] 解析到视频链接: ${urlValue.substring(0, 50)}...`);
        } else if (urlValue.includes('.') && !urlValue.includes(' ')) {
          // 如果包含点号且没有空格，可能是 URL（即使没有 http 前缀）
          material.mediaUrl = urlValue;
          console.log(`[Weekly Report] 解析到视频链接（无协议）: ${urlValue.substring(0, 50)}...`);
        } else {
          console.log(`[Weekly Report] 视频链接格式无效: ${urlValue.substring(0, 50)}...`);
        }
      } else {
        console.log(`[Weekly Report] 视频链接为空（索引: ${fieldIndexMap.mediaUrl}）`);
      }
    } else {
      // 调试：检查是否有类似的列名
      const similarHeaders = headers.filter((h, idx) => {
        const hLower = String(h || '').trim().toLowerCase();
        return hLower.includes('视频') || hLower.includes('媒体') || hLower.includes('video') || hLower.includes('media') || hLower.includes('链接');
      });
      if (similarHeaders.length > 0) {
        console.log(`[Weekly Report] 未识别到视频链接列，但发现相似列名:`, similarHeaders);
      }
    }

    // 封面链接（预览图片）
    if (fieldIndexMap.previewUrl !== undefined) {
      const urlValue = String(row[fieldIndexMap.previewUrl] || '').trim();
      if (urlValue) {
        // 支持 http/https 开头的完整 URL，也支持相对路径
        if (urlValue.startsWith('http://') || urlValue.startsWith('https://') || urlValue.startsWith('/')) {
          material.previewUrl = urlValue;
          console.log(`[Weekly Report] 解析到封面链接: ${urlValue.substring(0, 50)}...`);
        } else if (urlValue.includes('.') && !urlValue.includes(' ')) {
          // 如果包含点号且没有空格，可能是 URL（即使没有 http 前缀）
          material.previewUrl = urlValue;
          console.log(`[Weekly Report] 解析到封面链接（无协议）: ${urlValue.substring(0, 50)}...`);
        } else {
          console.log(`[Weekly Report] 封面链接格式无效: ${urlValue.substring(0, 50)}...`);
        }
      } else {
        console.log(`[Weekly Report] 封面链接为空（索引: ${fieldIndexMap.previewUrl}）`);
      }
    } else {
      // 调试：检查是否有类似的列名
      const similarHeaders = headers.filter((h, idx) => {
        const hLower = String(h || '').trim().toLowerCase();
        return hLower.includes('封面') || hLower.includes('预览') || hLower.includes('preview') || hLower.includes('cover');
      });
      if (similarHeaders.length > 0) {
        console.log(`[Weekly Report] 未识别到封面链接列，但发现相似列名:`, similarHeaders);
      }
    }

    // 如果素材名称不为空，添加到数组
    if (material.name) {
      materials.push(material);
    }
  }

  return materials;
}

/**
 * 分析素材数据，计算统计数据
 * 
 * @param materials 素材数据数组
 * @returns 分析结果
 */
export function analyzeMaterials(materials: ReportMaterial[]): AnalysisResult {
  // 1. 计算总消耗
  const totalConsumption = materials.reduce(
    (sum, m) => sum + (m.consumption || 0),
    0
  );

  // 2. 计算总素材数
  const totalMaterials = materials.length;

  // 3. 计算头部方向（消耗占比最高的方向）
  const directionMap = new Map<string, { consumption: number; count: number }>();

  materials.forEach(m => {
    if (m.direction) {
      const existing = directionMap.get(m.direction) || { consumption: 0, count: 0 };
      directionMap.set(m.direction, {
        consumption: existing.consumption + (m.consumption || 0),
        count: existing.count + 1,
      });
    }
  });

  let topDirection: AnalysisResult['topDirection'];
  if (directionMap.size > 0) {
    const entries = Array.from(directionMap.entries());
    const [name, data] = entries.reduce((a, b) =>
      a[1].consumption > b[1].consumption ? a : b
    );

    topDirection = {
      name,
      consumption: data.consumption,
      percentage: totalConsumption > 0
        ? (data.consumption / totalConsumption) * 100
        : 0,
    };
  }

  // 4. 计算 ROI 分布
  const roiDistribution = {
    high: materials.filter(m => (m.roi || 0) >= 3).length,
    medium: materials.filter(m => (m.roi || 0) >= 1.5 && (m.roi || 0) < 3).length,
    low: materials.filter(m => (m.roi || 0) < 1.5).length,
  };

  // 5. 计算分类统计
  const categoryMap = new Map<string, { consumption: number; count: number }>();

  materials.forEach(m => {
    const category = m.category || '未分类';
    const existing = categoryMap.get(category) || { consumption: 0, count: 0 };
    categoryMap.set(category, {
      consumption: existing.consumption + (m.consumption || 0),
      count: existing.count + 1,
    });
  });

  const categoryStats = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      consumption: data.consumption,
      percentage: totalConsumption > 0
        ? (data.consumption / totalConsumption) * 100
        : 0,
      materialCount: data.count,
    }))
    .sort((a, b) => b.consumption - a.consumption); // 按消耗降序排序

  // 6. 计算方向统计（除了头部方向）
  const directionStats = Array.from(directionMap.entries())
    .map(([direction, data]) => ({
      direction,
      consumption: data.consumption,
      percentage: totalConsumption > 0
        ? (data.consumption / totalConsumption) * 100
        : 0,
      materialCount: data.count,
    }))
    .sort((a, b) => b.consumption - a.consumption);

  return {
    totalConsumption,
    totalMaterials,
    topDirection,
    roiDistribution,
    categoryStats,
    directionStats, // 所有方向的统计
  };
}
