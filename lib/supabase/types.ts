/**
 * Supabase Database 类型定义
 * 
 * 后续可从 Supabase Dashboard 生成完整类型：
 * npx supabase gen types typescript --project-id <project-id> > lib/supabase/types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          username: string | null
          avatar_url: string | null
          credits: number
          password_hash: string | null
          is_active: boolean
          onboarding_completed: boolean
          created_at: string
          updated_at: string
          [key: string]: any
        }
        Insert: {
          id: string
          email: string
          username?: string | null
          avatar_url?: string | null
          credits?: number
          password_hash?: string | null
          is_active?: boolean
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
          [key: string]: any
        }
        Update: {
          id?: string
          email?: string
          username?: string | null
          avatar_url?: string | null
          credits?: number
          password_hash?: string | null
          is_active?: boolean
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
          [key: string]: any
        }
      }
      assets: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          file_url: string
          file_size: number
          file_type: string
          team_id: string | null
          created_at: string
          updated_at: string
          [key: string]: any
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          file_url: string
          file_size: number
          file_type: string
          team_id?: string | null
          created_at?: string
          updated_at?: string
          [key: string]: any
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          file_url?: string
          file_size?: number
          file_type?: string
          team_id?: string | null
          created_at?: string
          updated_at?: string
          [key: string]: any
        }
      }
      generations: {
        Row: {
          id: string
          user_id: string
          prompt: string
          status: string
          result_url: string | null
          cost: number | null
          completed_at: string | null
          error_message: string | null
          team_id: string | null
          created_at: string
          updated_at: string
          [key: string]: any
        }
        Insert: {
          id?: string
          user_id: string
          prompt: string
          status?: string
          result_url?: string | null
          cost?: number | null
          completed_at?: string | null
          error_message?: string | null
          team_id?: string | null
          created_at?: string
          updated_at?: string
          [key: string]: any
        }
        Update: {
          id?: string
          user_id?: string
          prompt?: string
          status?: string
          result_url?: string | null
          cost?: number | null
          completed_at?: string | null
          error_message?: string | null
          team_id?: string | null
          created_at?: string
          updated_at?: string
          [key: string]: any
        }
      }
      credit_transactions: {
        Row: {
          id: string
          user_id: string
          amount: number
          type: string
          description: string | null
          ref_id: string | null
          metadata: Json | null
          team_id: string | null
          created_at: string
          [key: string]: any
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          type: string
          description?: string | null
          ref_id?: string | null
          metadata?: Json | null
          team_id?: string | null
          created_at?: string
          [key: string]: any
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          type?: string
          description?: string | null
          ref_id?: string | null
          metadata?: Json | null
          team_id?: string | null
          created_at?: string
          [key: string]: any
        }
      }
      inspirations: {
        Row: {
          id: string
          user_id: string
          title: string | null
          content: string | null
          media_urls: string[]
          voice_url: string | null
          tags: string[]
          source: string
          status: string          // 'new' | 'used' | 'archived'
          reference_url: string | null
          team_id: string | null
          created_at: string
          updated_at: string
          [key: string]: any
        }
        Insert: {
          id?: string
          user_id: string
          title?: string | null
          content?: string | null
          media_urls?: string[]
          voice_url?: string | null
          tags?: string[]
          source?: string
          status?: string
          reference_url?: string | null
          team_id?: string | null
          created_at?: string
          updated_at?: string
          [key: string]: any
        }
        Update: {
          id?: string
          user_id?: string
          title?: string | null
          content?: string | null
          media_urls?: string[]
          voice_url?: string | null
          tags?: string[]
          source?: string
          status?: string
          reference_url?: string | null
          team_id?: string | null
          created_at?: string
          updated_at?: string
          [key: string]: any
        }
      }
      weekly_reports: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          week_date_range: string
          week_start_date: string
          week_end_date: string
          summary_text: string | null
          report_data: Json
          excel_file_name: string | null
          total_materials: number
          total_consumption: number
          created_by: string | null
          team_id: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          week_date_range: string
          week_start_date: string
          week_end_date: string
          summary_text?: string | null
          report_data?: Json
          excel_file_name?: string | null
          total_materials?: number
          total_consumption?: number
          created_by?: string | null
          team_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          week_date_range?: string
          week_start_date?: string
          week_end_date?: string
          summary_text?: string | null
          report_data?: Json
          excel_file_name?: string | null
          total_materials?: number
          total_consumption?: number
          created_by?: string | null
          team_id?: string | null
        }
      }
      // ==================== Phase 2: 团队相关表 ====================
      teams: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          avatar_url: string | null
          created_by: string
          created_at: string
          updated_at: string
          [key: string]: any
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          avatar_url?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
          [key: string]: any
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          avatar_url?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
          [key: string]: any
        }
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          user_id: string
          role: string
          joined_at: string
          [key: string]: any
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
          role?: string
          joined_at?: string
          [key: string]: any
        }
        Update: {
          id?: string
          team_id?: string
          user_id?: string
          role?: string
          joined_at?: string
          [key: string]: any
        }
      }
      // ==================== Phase 0.1: 素材表 ====================
      materials: {
        Row: {
          id: string
          name: string
          source: string
          type: string
          project: string
          tag: string
          quality: string[]
          thumbnail: string
          src: string
          gallery: string[] | null
          file_size: number | null
          hash: string | null
          width: number | null
          height: number | null
          duration: number | null
          recommended: boolean | null
          consumption: number | null
          conversions: number | null
          roi: number | null
          platform: string | null
          advertiser: string | null
          estimated_spend: number | null
          first_seen: string | null
          last_seen: string | null
          team_id: string | null
          // V2: 状态 & 投放字段
          status: string | null
          platform_name: string | null
          platform_id: string | null
          campaign_id: string | null
          ad_account: string | null
          launch_date: string | null
          source_script_id: string | null
          // V3: 命名系统
          material_naming: string | null
          naming_fields: any | null
          naming_verified: boolean | null
          // V3: 投放数据反标
          impressions: number | null
          clicks: number | null
          ctr: number | null
          cpc: number | null
          cpm: number | null
          new_user_cost: number | null
          first_day_pay_count: number | null
          first_day_pay_cost: number | null
          report_period: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          source?: string
          type: string
          project: string
          tag: string
          quality: string[]
          thumbnail?: string
          src?: string
          gallery?: string[] | null
          file_size?: number | null
          hash?: string | null
          width?: number | null
          height?: number | null
          duration?: number | null
          recommended?: boolean | null
          consumption?: number | null
          conversions?: number | null
          roi?: number | null
          platform?: string | null
          advertiser?: string | null
          estimated_spend?: number | null
          first_seen?: string | null
          last_seen?: string | null
          team_id?: string | null
          // V2: 状态 & 投放字段
          status?: string | null
          platform_name?: string | null
          platform_id?: string | null
          campaign_id?: string | null
          ad_account?: string | null
          launch_date?: string | null
          source_script_id?: string | null
          // V3: 命名系统
          material_naming?: string | null
          naming_fields?: any | null
          naming_verified?: boolean | null
          // V3: 投放数据反标
          impressions?: number | null
          clicks?: number | null
          ctr?: number | null
          cpc?: number | null
          cpm?: number | null
          new_user_cost?: number | null
          first_day_pay_count?: number | null
          first_day_pay_cost?: number | null
          report_period?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          source?: string
          type?: string
          project?: string
          tag?: string
          quality?: string[]
          thumbnail?: string
          src?: string
          gallery?: string[] | null
          file_size?: number | null
          hash?: string | null
          width?: number | null
          height?: number | null
          duration?: number | null
          recommended?: boolean | null
          consumption?: number | null
          conversions?: number | null
          roi?: number | null
          platform?: string | null
          advertiser?: string | null
          estimated_spend?: number | null
          first_seen?: string | null
          last_seen?: string | null
          team_id?: string | null
          // V2: 状态 & 投放字段
          status?: string | null
          platform_name?: string | null
          platform_id?: string | null
          campaign_id?: string | null
          ad_account?: string | null
          launch_date?: string | null
          source_script_id?: string | null
          // V3: 命名系统
          material_naming?: string | null
          naming_fields?: any | null
          naming_verified?: boolean | null
          // V3: 投放数据反标
          impressions?: number | null
          clicks?: number | null
          ctr?: number | null
          cpc?: number | null
          cpm?: number | null
          new_user_cost?: number | null
          first_day_pay_count?: number | null
          first_day_pay_cost?: number | null
          report_period?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'materials_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          }
        ]
      }
      // ==================== Phase 0.3: 脚本表 ====================
      scripts: {
        Row: {
          id: string
          team_id: string | null
          user_id: string | null
          inspiration_id: string | null
          material_id: string | null
          template_id: string | null
          title: string
          scenes: any
          total_duration: number
          topic: string | null
          selling_points: string[] | null
          style: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id?: string | null
          user_id?: string | null
          inspiration_id?: string | null
          material_id?: string | null
          template_id?: string | null
          title: string
          scenes?: any
          total_duration?: number
          topic?: string | null
          selling_points?: string[] | null
          style?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string | null
          user_id?: string | null
          inspiration_id?: string | null
          material_id?: string | null
          template_id?: string | null
          title?: string
          scenes?: any
          total_duration?: number
          topic?: string | null
          selling_points?: string[] | null
          style?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'scripts_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          }
        ]
      }
      // ==================== Phase 1.1: 爆款模版表 ====================
      material_templates: {
        Row: {
          id: string
          team_id: string | null
          user_id: string | null
          name: string
          description: string | null
          source_material_ids: string[] | null
          hook_pattern: string | null
          structure: any
          target_emotion: string | null
          style: string | null
          recommended_duration: number | null
          tags: string[] | null
          effectiveness_score: number
          usage_count: number
          embedding: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id?: string | null
          user_id?: string | null
          name: string
          description?: string | null
          source_material_ids?: string[] | null
          hook_pattern?: string | null
          structure?: any
          target_emotion?: string | null
          style?: string | null
          recommended_duration?: number | null
          tags?: string[] | null
          effectiveness_score?: number
          usage_count?: number
          embedding?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string | null
          user_id?: string | null
          name?: string
          description?: string | null
          source_material_ids?: string[] | null
          hook_pattern?: string | null
          structure?: any
          target_emotion?: string | null
          style?: string | null
          recommended_duration?: number | null
          tags?: string[] | null
          effectiveness_score?: number
          usage_count?: number
          embedding?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'material_templates_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          }
        ]
      }
      // ==================== Phase 4: 知识库 ====================
      knowledge_entries: {
        Row: {
          id: string
          team_id: string | null
          user_id: string | null
          title: string
          content: string
          category: string
          tags: string[] | null
          check_type: string | null
          prompt_template: string | null
          criteria: Json | null
          applicable_dimensions: string[] | null
          source_type: string
          source_material_id: string | null
          source_review_id: string | null
          status: string
          embedding: string | null
          created_at: string
          updated_at: string
          [key: string]: any
        }
        Insert: {
          id?: string
          team_id?: string | null
          user_id?: string | null
          title: string
          content: string
          category?: string
          tags?: string[] | null
          check_type?: string | null
          prompt_template?: string | null
          criteria?: Json | null
          applicable_dimensions?: string[] | null
          source_type?: string
          source_material_id?: string | null
          source_review_id?: string | null
          status?: string
          embedding?: string | null
          created_at?: string
          updated_at?: string
          [key: string]: any
        }
        Update: {
          id?: string
          team_id?: string | null
          user_id?: string | null
          title?: string
          content?: string
          category?: string
          tags?: string[] | null
          check_type?: string | null
          prompt_template?: string | null
          criteria?: Json | null
          applicable_dimensions?: string[] | null
          source_type?: string
          source_material_id?: string | null
          source_review_id?: string | null
          status?: string
          embedding?: string | null
          created_at?: string
          updated_at?: string
          [key: string]: any
        }
        Relationships: [
          {
            foreignKeyName: 'knowledge_entries_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          }
        ]
      }
      // ==================== Phase 4: 审核记录 ====================
      material_reviews: {
        Row: {
          id: string
          material_id: string
          team_id: string | null
          overall_status: string
          ai_rationale: string | null
          dimension_results: Json
          score_duration_pass: boolean | null
          score_duration_rationale: string | null
          score_hook_pass: boolean | null
          score_hook_rationale: string | null
          score_cta_pass: boolean | null
          score_cta_rationale: string | null
          human_reviewed_by: string | null
          human_override_status: string | null
          created_at: string
          updated_at: string
          [key: string]: any
        }
        Insert: {
          id?: string
          material_id: string
          team_id?: string | null
          overall_status?: string
          ai_rationale?: string | null
          dimension_results?: Json
          score_duration_pass?: boolean | null
          score_duration_rationale?: string | null
          score_hook_pass?: boolean | null
          score_hook_rationale?: string | null
          score_cta_pass?: boolean | null
          score_cta_rationale?: string | null
          human_reviewed_by?: string | null
          human_override_status?: string | null
          created_at?: string
          updated_at?: string
          [key: string]: any
        }
        Update: {
          id?: string
          material_id?: string
          team_id?: string | null
          overall_status?: string
          ai_rationale?: string | null
          dimension_results?: Json
          score_duration_pass?: boolean | null
          score_duration_rationale?: string | null
          score_hook_pass?: boolean | null
          score_hook_rationale?: string | null
          score_cta_pass?: boolean | null
          score_cta_rationale?: string | null
          human_reviewed_by?: string | null
          human_override_status?: string | null
          created_at?: string
          updated_at?: string
          [key: string]: any
        }
      }
      // ==================== Phase 4.4: 评论系统 ====================
      comments: {
        Row: {
          id: string
          material_id: string
          user_id: string
          team_id: string
          content: string
          parent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          material_id: string
          user_id: string
          team_id: string
          content: string
          parent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          material_id?: string
          user_id?: string
          team_id?: string
          content?: string
          parent_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      // ==================== Phase 5.2: 订阅计费 ====================
      billing_customers: {
        Row: {
          id: string
          team_id: string
          stripe_customer_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          stripe_customer_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          stripe_customer_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          team_id: string
          stripe_subscription_id: string | null
          stripe_price_id: string | null
          plan_id: string
          status: string
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          canceled_at: string | null
          trial_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          plan_id?: string
          status?: string
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          trial_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          plan_id?: string
          status?: string
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          trial_end?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      team_invitations: {
        Row: {
          id: string
          team_id: string
          code: string
          email: string | null
          role: string
          status: string
          max_uses: number
          used_count: number
          created_by: string
          expires_at: string | null
          created_at: string
          [key: string]: any
        }
        Insert: {
          id?: string
          team_id: string
          code: string
          email?: string | null
          role?: string
          status?: string
          max_uses?: number
          used_count?: number
          created_by: string
          expires_at?: string | null
          created_at?: string
          [key: string]: any
        }
        Update: {
          id?: string
          team_id?: string
          code?: string
          email?: string | null
          role?: string
          status?: string
          max_uses?: number
          used_count?: number
          created_by?: string
          expires_at?: string | null
          created_at?: string
          [key: string]: any
        }
      }
      // ==================== W3.1: 知识访谈 ====================
      knowledge_interviews: {
        Row: {
          id: string
          team_id: string | null
          topic: string
          guide_questions: string[]
          token: string
          contributor_name: string | null
          contributor_role: string | null
          status: string
          chat_history: Json
          extracted_knowledge_id: string | null
          created_by: string
          created_at: string
          completed_at: string | null
          [key: string]: any
        }
        Insert: {
          id?: string
          team_id?: string | null
          topic: string
          guide_questions?: string[]
          token: string
          contributor_name?: string | null
          contributor_role?: string | null
          status?: string
          chat_history?: Json
          extracted_knowledge_id?: string | null
          created_by: string
          created_at?: string
          completed_at?: string | null
          [key: string]: any
        }
        Update: {
          id?: string
          team_id?: string | null
          topic?: string
          guide_questions?: string[]
          token?: string
          contributor_name?: string | null
          contributor_role?: string | null
          status?: string
          chat_history?: Json
          extracted_knowledge_id?: string | null
          created_by?: string
          created_at?: string
          completed_at?: string | null
          [key: string]: any
        }
      }
      // ==================== V3: 团队命名配置 ====================
      team_naming_config: {
        Row: {
          id: string
          team_id: string | null
          products: string[]
          designers: string[]
          vendors: string[]
          naming_template: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id?: string | null
          products?: string[]
          designers?: string[]
          vendors?: string[]
          naming_template?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string | null
          products?: string[]
          designers?: string[]
          vendors?: string[]
          naming_template?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      deduct_credits: {
        Args: {
          p_user_id: string
          p_cost: number
        }
        Returns: number | null
      }
      add_credits: {
        Args: {
          p_user_id: string
          p_amount: number
        }
        Returns: number
      }
      match_materials: {
        Args: {
          query_embedding: string
          match_threshold?: number
          match_count?: number
          filter_team_id?: string | null
        }
        Returns: {
          id: string
          name: string
          type: string
          project: string
          tag: string
          thumbnail: string
          similarity: number
        }[]
      }
      match_knowledge_entries: {
        Args: {
          query_embedding: string
          match_threshold?: number
          match_count?: number
          filter_team_id?: string | null
          filter_category?: string | null
        }
        Returns: {
          id: string
          title: string
          content: string
          category: string
          tags: string[]
          check_type: string | null
          prompt_template: string | null
          criteria: any
          applicable_dimensions: string[] | null
          similarity: number
        }[]
      }
      match_templates: {
        Args: {
          query_embedding: string
          match_threshold?: number
          match_count?: number
        }
        Returns: {
          id: string
          name: string
          description: string
          hook_pattern: string
          structure: any
          target_emotion: string
          style: string
          effectiveness_score: number
          tags: string[]
          similarity: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}


