/**
 * Excel/CSV 文件解析服务
 * 用于导入视频库数据（支持 .xlsx/.xls 与创量导出的 .csv）
 */
import * as XLSX from 'xlsx';
import { VideoLibraryItem } from './videoDeduplicationService';

const isCsvFile = (name: string): boolean =>
  name.toLowerCase().endsWith('.csv');

/**
 * 解析 Excel 或 CSV 文件，提取视频库数据
 * 自动处理：过滤无效数据，按消耗排名，只保留前1000名
 * 创量 CSV 表头：时间,素材ID,素材名,素材预览,消耗,...
 */
export function parseVideoLibraryExcel(file: File): Promise<{
  videos: VideoLibraryItem[];
  stats: {
    totalRows: number;
    validCount: number;
    skippedCount: number;
    importedCount: number;
    filteredCount: number;
    groupedCount: number; // 分组后的数量
  };
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    const parseAndResolve = (jsonData: Record<string, unknown>[]) => {
      try {
        if (jsonData.length > 0) {
          const firstRow = jsonData[0] as Record<string, unknown>;
          const columns = Object.keys(firstRow);
          console.log('📊 表头列名:', columns);
        }

        // 解析数据（带消耗字段用于排序）
        interface VideoItemWithCost extends VideoLibraryItem {
          cost?: number; // 消耗值，用于排序
          promotionType?: string;
        }

        const videoLibrary: VideoItemWithCost[] = [];
        let skippedCount = 0; // 跳过的无效数据计数
        let validCount = 0; // 有效数据计数

        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i] as any;

          // 尝试识别列名（支持多种可能的列名；创量 CSV 为「素材预览」）
          const previewUrl =
            row['预览链接'] ||
            row['预览'] ||
            row['素材预览'] ||
            row['视频链接'] ||
            row['视频'] ||
            row['preview_url'] ||
            row['preview'] ||
            row['video_url'] ||
            row['video'];

          const coverUrl =
            row['封面链接'] ||
            row['封面'] ||
            row['缩略图'] ||
            row['cover_url'] ||
            row['cover'] ||
            row['thumbnail'];

          // 识别素材名称（优先使用"素材名称"列）
          const materialName =
            row['素材名称'] ||
            row['素材名'] ||
            row['标题'] ||
            row['名称'] ||
            row['title'] ||
            row['name'] ||
            '';

          const idRaw = row['ID'] || row['id'] || row['素材ID'] || '';
          const idTrim = idRaw ? String(idRaw).trim() : '';
          // 保证每条 id 唯一（创量 CSV 中多行素材ID 可能同为 0）
          const id = idTrim ? `${idTrim}_${i}` : `video_${i + 1}`;

          // 识别推广类型
          const promotionType =
            row['推广类型'] ||
            row['推广'] ||
            row['promotion_type'] ||
            row['promotion'] ||
            '';

          // 识别消耗字段（用于排序）- 支持更多列名格式
          let costStr = '';
          const possibleCostKeys = [
            '消耗', '消费', '花费', '消耗金额', '消费金额', '花费金额',
            'cost', 'Cost', 'COST', 'Cost金额', 'cost金额',
            '金额', '费用', '支出', '花费金额', '消费金额',
            '消耗值', '消费值', '花费值'
          ];

          // 尝试所有可能的列名
          for (const key of possibleCostKeys) {
            if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
              costStr = row[key];
              break;
            }
          }

          // 转换为数字
          let cost: number | undefined;
          if (costStr) {
            // 移除可能的货币符号、空格、逗号等
            const cleaned = String(costStr).replace(/[¥$€£,\s]/g, '').trim();
            const parsed = parseFloat(cleaned);
            if (!isNaN(parsed) && isFinite(parsed)) {
              cost = parsed;
            } else {
              console.log(`⚠️ 第${i + 1}行消耗值无法解析: "${costStr}"`);
            }
          }

          // 数据验证：必须要有预览链接
          if (!previewUrl || typeof previewUrl !== 'string' || previewUrl.trim() === '') {
            skippedCount++;
            console.log(`⏭️ 跳过第${i + 1}行：预览链接为空`);
            continue; // 跳过无效数据
          }

          // 过滤无效的URL（不是有效的HTTP/HTTPS链接）
          const trimmedUrl = previewUrl.trim();
          if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
            skippedCount++;
            console.log(`⏭️ 跳过第${i + 1}行：预览链接格式无效 (${trimmedUrl.substring(0, 50)})`);
            continue; // 跳过无效URL
          }

          validCount++;

          videoLibrary.push({
            id: String(id),
            title: materialName ? String(materialName).trim() : undefined,
            previewUrl: trimmedUrl,
            coverUrl: coverUrl ? String(coverUrl).trim() : undefined,
            cost: cost,
            promotionType: promotionType ? String(promotionType).trim() : undefined
          });
        }

        console.log(`📈 数据处理统计（分组前）：`);
        console.log(`  - 总行数: ${jsonData.length}`);
        console.log(`  - 有效数据: ${validCount}`);
        console.log(`  - 跳过数据: ${skippedCount}`);

        // 第一步：按素材名称分组，消耗求和
        interface GroupedItem extends VideoLibraryItem {
          cost?: number;
          promotionType?: string;
        }

        const groupedMap = new Map<string, {
          items: GroupedItem[];
          totalCost: number;
          promotionTypes: Map<string, number>;
        }>();

        for (const item of videoLibrary) {
          const materialName = item.title || '未命名素材';
          const cost = item.cost ?? 0;
          const promotionType = (item as any).promotionType || '未分类';

          if (!groupedMap.has(materialName)) {
            groupedMap.set(materialName, {
              items: [],
              totalCost: 0,
              promotionTypes: new Map()
            });
          }

          const group = groupedMap.get(materialName)!;
          group.items.push(item);
          group.totalCost += cost;

          // 按推广类型统计消耗
          const currentTypeCost = group.promotionTypes.get(promotionType) || 0;
          group.promotionTypes.set(promotionType, currentTypeCost + cost);
        }

        console.log(`📊 按素材名称分组结果：`);
        console.log(`  - 分组数量: ${groupedMap.size}`);

        // 转换为数组，每个素材名称只保留一个代表项（使用第一个预览链接）
        const groupedLibrary: VideoLibraryItem[] = [];
        for (const [materialName, group] of groupedMap.entries()) {
          const firstItem = group.items[0];
          const promotionTypes = Array.from(group.promotionTypes.entries()).map(([type, cost]) => ({
            type,
            cost
          }));

          groupedLibrary.push({
            id: firstItem.id,
            title: materialName,
            previewUrl: firstItem.previewUrl,
            coverUrl: firstItem.coverUrl,
            totalCost: group.totalCost,
            promotionTypes: promotionTypes
          });
        }

        console.log(`📊 分组后数据量: ${groupedLibrary.length}`);

        // 第二步：按总消耗降序排序
        const sortedLibrary = groupedLibrary.sort((a, b) => {
          const costA = a.totalCost ?? 0;
          const costB = b.totalCost ?? 0;
          return costB - costA; // 降序
        });

        // 打印排序后的前5条数据（用于调试）
        if (sortedLibrary.length > 0) {
          console.log('📊 排序后的前5条数据：');
          sortedLibrary.slice(0, 5).forEach((v, idx) => {
            console.log(`  ${idx + 1}. 素材名称: ${v.title || '无'}, 总消耗: ${v.totalCost ?? 0}, URL: ${v.previewUrl.substring(0, 50)}...`);
          });
        }

        // 第三步：只保留前1000名（按总消耗排名）
        const MAX_IMPORT_COUNT = 1000;
        const totalCount = sortedLibrary.length;
        const willImport = sortedLibrary.slice(0, MAX_IMPORT_COUNT);
        const willSkip = totalCount - willImport.length;

        console.log(`📊 排名筛选结果：`);
        console.log(`  - 分组后总数: ${totalCount}`);
        console.log(`  - 将导入: ${willImport.length} 条（前${MAX_IMPORT_COUNT}名）`);
        console.log(`  - 将跳过: ${willSkip} 条（排名${MAX_IMPORT_COUNT + 1}及以后）`);

        if (willSkip > 0) {
          const lastImportedCost = willImport[willImport.length - 1]?.totalCost ?? 0;
          const firstSkippedCost = sortedLibrary[MAX_IMPORT_COUNT]?.totalCost ?? 0;
          console.log(`  - 最后导入的总消耗: ${lastImportedCost}`);
          console.log(`  - 第一个跳过的总消耗: ${firstSkippedCost}`);
        }

        const finalLibrary: VideoLibraryItem[] = willImport;

        if (finalLibrary.length === 0) {
          reject(new Error('文件中未找到有效的视频数据。请确保包含「预览链接」或「素材预览」列，且链接格式正确（http:// 或 https:// 开头）。'));
          return;
        }

        // 返回处理结果（包含统计信息）
        resolve({
          videos: finalLibrary,
          stats: {
            totalRows: jsonData.length,
            validCount: validCount,
            skippedCount: skippedCount,
            importedCount: finalLibrary.length,
            filteredCount: willSkip,
            groupedCount: groupedMap.size // 分组后的数量
          }
        });
      } catch (error: any) {
        reject(new Error(`解析Excel文件失败: ${error.message || '未知错误'}`));
      }
    };

    reader.onload = (e) => {
      try {
        const result = e.target?.result;
        if (result == null) {
          reject(new Error('读取文件失败'));
          return;
        }
        let workbook: XLSX.WorkBook;
        if (isCsvFile(file.name)) {
          const text = typeof result === 'string' ? result : new TextDecoder('utf-8').decode(result as ArrayBuffer);
          workbook = XLSX.read(text, { type: 'string', raw: false });
        } else {
          const data = new Uint8Array(result as ArrayBuffer);
          workbook = XLSX.read(data, { type: 'array' });
        }
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false }) as Record<string, unknown>[];
        parseAndResolve(jsonData);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '未知错误';
        reject(new Error(`解析文件失败: ${msg}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('读取文件失败'));
    };

    if (isCsvFile(file.name)) {
      reader.readAsText(file, 'UTF-8');
    } else {
      reader.readAsArrayBuffer(file);
    }
  });
}

/**
 * 导出视频库为Excel文件
 */
export function exportVideoLibraryToExcel(videoLibrary: VideoLibraryItem[]): void {
  // 准备数据
  const data = videoLibrary.map((video, index) => ({
    'ID': video.id,
    '标题': video.title || '',
    '预览链接': video.previewUrl,
    '封面链接': video.coverUrl || ''
  }));

  // 创建工作簿
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '视频库');

  // 导出文件
  XLSX.writeFile(workbook, `视频库_${new Date().toISOString().split('T')[0]}.xlsx`);
}
