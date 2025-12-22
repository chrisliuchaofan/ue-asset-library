/**
 * Browser Supabase Client
 * 
 * 用途：仅用于 Client Components（'use client'）
 * 
 * 使用场景：
 * - React Client Components 中需要访问 Supabase
 * - 浏览器端的数据查询和操作
 * 
 * 限制：
 * - 仅使用 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY
 * - 不包含 Service Role Key（永远不要暴露给浏览器）
 * 
 * 示例：
 * ```tsx
 * 'use client'
 * import { createBrowserSupabaseClient } from '@/lib/supabase/browser'
 * 
 * export function MyComponent() {
 *   const supabase = createBrowserSupabaseClient()
 *   // 使用 supabase...
 * }
 * ```
 */

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

export function createBrowserSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
    )
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}






