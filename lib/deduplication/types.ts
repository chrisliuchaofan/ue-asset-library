
export interface DimensionScores {
  composition_score: number;
  lighting_score: number;
  pacing_score: number;
  creative_score?: number; // 新增：创意评分
  art_score?: number;      // 新增：美术评分
}

export interface DetailedAnalysisItem {
  time_stamp: string;
  issue: string;
  creative_dimension: string; // 创意维度反馈
  art_dimension: string;      // 美术维度反馈
  fix_suggestion: string;
  thumbnail_base64?: string;  // Base64 编码的缩略图，用于持久化存储
  script_text?: string;       // 原文引用（脚本内容）
  excel_images?: string[];   // Excel中的配图（base64数组）
}

export interface DuplicationCheck {
  similarity_score: number;
  verdict: 'Plagiarism' | 'Inspired' | 'Original';
  details: string;
  matched_assets: Array<{ id: string; title: string; similarity: number }>;
  timestamp: string;
}

export interface AnalysisReport {
  id?: string; // 数据库记录 ID
  total_score: number;
  is_s_tier: boolean;
  critique_summary: string;
  dimensions: DimensionScores;
  detailed_analysis: DetailedAnalysisItem[];
  aesthetic_verdict: string;
  creative_verdict?: string;
  hook_strength?: string;
  visual_style?: string;
  feedback?: 'like' | 'dislike' | null;
  duplication_check?: DuplicationCheck; // 去重检查结果
  flow_analysis?: FlowAnalysisResult; // Phase 1.2: 注意力心流分析结果
}

export interface HistoryRecord {
  id: string;
  file_name: string;
  file_type: string;
  total_score: number;
  is_s_tier: boolean;
  created_at: string;
  feedback?: 'like' | 'dislike' | null;
  detailed_analysis: DetailedAnalysisItem[];
  dimensions: DimensionScores;
  critique_summary: string;
  aesthetic_verdict: string;
  creative_verdict?: string;
  hook_strength?: string;
  visual_style?: string;
  flow_analysis?: FlowAnalysisResult; // Phase 1.2: 注意力心流分析结果
}

export interface User {
  id: string | number;
  username: string;
  nickname: string;
  password?: string;
  role: 'admin' | 'auditor';
  department: string; 
  function: string;   
  audit_count: number;
  created_at: string;
}

export interface AuditRule {
  id: string | number;
  name: string;
  category: string;
  system_prompt: string;
  created_at: string;
  author_name?: string;
  author_id?: string | number;
  similarity?: number;
  embedding?: number[];
  // Phase 1.3: 规则结构化字段
  material_type?: string; // 素材类型：video/image/script
  game_type?: string; // 游戏类型：SLG/casual/...
  tags?: string[]; // 标签数组
  positive_examples?: string[]; // 正例描述（或链接）
  negative_examples?: string[]; // 反例描述（或链接）
  deduction_rules?: Array<{ // 扣分规则
    condition: string;
    deduction: number;
  }>;
}

export enum AppRoute {
  AUDITOR = 'AUDITOR',
  BREAKDOWN = 'BREAKDOWN',
  LIBRARY = 'LIBRARY',
  PROFILE = 'PROFILE',
  ADMIN = 'ADMIN',
  DEBUG = 'DEBUG',
  CREATIVE_AUDIT = 'CREATIVE_AUDIT',
  FLOW = 'FLOW',
  DEDUPLICATION = 'DEDUPLICATION'
}

export type TrainingInputType = 'video' | 'image' | 'link' | 'text' | 'pdf';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type: 'text' | 'file' | 'link' | 'voice';
  fileUrl?: string | null;
  fileName?: string;
  fileType?: string;
  fileUrlExpired?: boolean; // 标记文件URL是否已失效（刷新后）
  status?: 'pending' | 'processing' | 'done' | 'error';
  result?: string; 
}

export interface AnalysisTask {
  status: 'idle' | 'uploading' | 'analyzing' | 'completed' | 'error';
  progress: number;
  step: string;
  subStep?: string; // 子步骤提示
  uploadProgress?: number; // 上传进度 0-100
  estimatedTimeRemaining?: string; // 预估剩余时间
  file: File | null;
  videoUrl: string | null;
  report: AnalysisReport | null;
  error: string | null;
  queryEmbedding?: number[];
  matchedRules?: AuditRule[];
}

export interface BreakdownState {
  messages: ChatMessage[];
  currentResult: string;
  isProcessing: boolean;
  errorMsg: string | null;
}

// 注意力心流相关类型
export interface FlowDataPoint {
  time: number; // 时间点（秒）
  attention: number; // 注意力值 0-100
  emotion?: string; // 情绪关键词
  event?: string; // 事件描述（如：惊喜画面、挫败感、压迫感等）
}

export interface FlowAnalysisResult {
  flowData: FlowDataPoint[]; // 心流数据点
  averageAttention: number; // 平均注意力值
  timeAbove80: number; // 保持在80分以上的时间（秒）
  totalTime: number; // 视频总时长（秒）
  percentageAbove80: number; // 保持在80分以上的百分比
  summary: string; // 综合评语
  suggestions: string[]; // 修改建议
  peakMoments: Array<{ time: number; attention: number; description: string }>; // 峰值时刻
  lowMoments: Array<{ time: number; attention: number; description: string }>; // 低点时刻
}
