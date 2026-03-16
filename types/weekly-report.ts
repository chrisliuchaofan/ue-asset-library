/**
 * 周报相关类型定义
 */

/**
 * 周报数据接口
 */
export interface WeeklyReport {
  id: string;
  created_at: string;
  updated_at: string;
  week_date_range: string;
  week_start_date: string; // ISO date string
  week_end_date: string; // ISO date string
  summary_text: string | null;
  report_data: ReportMaterial[]; // JSONB 数组
  excel_file_name: string | null;
  total_materials: number;
  total_consumption: number;
  created_by: string | null;
}

/**
 * 报告中的素材数据
 */
export interface ReportMaterial {
  /** 素材 ID（如果有） */
  id?: string;
  /** 素材名称 */
  name: string;
  /** 关联的素材库 material_id（匹配后回填） */
  material_id?: string;
  /** 匹配方式 */
  match_type?: 'exact' | 'fuzzy' | 'manual';
  /** 匹配置信度 0-1 */
  match_confidence?: number;
  /** 素材类型/分类 */
  category?: string;
  /** 方向（RC、RPG 等） */
  direction?: string;
  /** 消耗 */
  consumption?: number;
  /** ROI */
  roi?: number;
  /** 推广类型（微小、抖小、APP） */
  promotionType?: string;
  /** 渠道（头条、广点通） */
  channel?: string;
  /** 素材类型（视频、图片、试玩） */
  materialType?: string;
  /** 首日 ROI */
  firstDayRoi?: number;
  /** 3日 ROI */
  day3Roi?: number;
  /** 7日 ROI */
  day7Roi?: number;
  /** 累计 ROI */
  cumulativeRoi?: number;
  /** 新增成本 */
  newCost?: number;
  /** 付费成本 */
  paidCost?: number;
  /** 付费率 */
  paymentRate?: number;
  /** 媒体文件 URL（华为云 OSS）- 视频链接 */
  mediaUrl?: string;
  /** 封面链接（预览图片） */
  previewUrl?: string;
  /** 其他自定义字段 */
  [key: string]: any;
}

/**
 * 创建周报的请求数据
 */
export interface CreateWeeklyReportRequest {
  week_date_range: string;
  week_start_date: string; // ISO date string
  week_end_date: string; // ISO date string
  summary_text?: string;
  report_data: ReportMaterial[];
  excel_file_name?: string;
  total_materials?: number;
  total_consumption?: number;
}

/**
 * 分析结果（用于 AI 生成总结）
 */
export interface AnalysisResult {
  totalConsumption: number;
  totalMaterials: number;
  topDirection?: {
    name: string;
    consumption: number;
    percentage: number;
  };
  roiDistribution?: {
    high: number;
    medium: number;
    low: number;
  };
  categoryStats?: Array<{
    category: string;
    consumption: number;
    percentage: number;
    materialCount: number;
  }>;
  directionStats?: Array<{
    direction: string;
    consumption: number;
    percentage: number;
    materialCount: number;
  }>;
  [key: string]: any;
}
