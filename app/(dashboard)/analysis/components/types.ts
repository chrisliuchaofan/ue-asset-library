export interface DimensionScores {
    composition_score: number;
    lighting_score: number;
    pacing_score: number;
    creative_score?: number;
    art_score?: number;
}

export interface DetailedAnalysisItem {
    time_stamp: string;
    issue: string;
    creative_dimension: string;
    art_dimension: string;
    fix_suggestion: string;
    thumbnail_base64?: string;
    script_text?: string;
    excel_images?: string[];
}

export interface AnalysisReport {
    id?: string;
    total_score: number;
    is_s_tier: boolean;
    critique_summary: string;
    dimensions: DimensionScores;
    detailed_analysis: DetailedAnalysisItem[];
    aesthetic_verdict: string;
    creative_verdict?: string;
    hook_strength?: string;
    visual_style?: string;
}

export interface AnalysisTaskState {
    status: 'idle' | 'analyzing' | 'completed' | 'error';
    progress: number;
    step: string;
    report: AnalysisReport | null;
    error: string | null;
}
