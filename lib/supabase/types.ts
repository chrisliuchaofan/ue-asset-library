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
          created_at?: string
          [key: string]: any
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
    }
    Enums: {
      [_ in never]: never
    }
  }
}


