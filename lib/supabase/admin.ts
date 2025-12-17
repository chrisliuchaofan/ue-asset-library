/**
 * Admin Supabase Client
 * 
 * 用途：仅用于特权操作（API Route 内部调用）
 * 
 * 使用场景：
 * - 需要绕过 Row Level Security (RLS) 的操作
 * - 管理员级别的数据操作
 * - 批量数据处理
 * - 系统级任务
 * 
 * ⚠️ 安全警告：
 * - 使用 Service Role Key，拥有完全数据库访问权限
 * - 永远不要在浏览器端使用此 client
 * - 仅在 Server-side API Routes 中使用
 * 
 * 限制：
 * - 如果检测到运行在浏览器环境，会直接 throw Error
 * - 仅能在 API Routes、Server Actions、Server Components 中使用
 * 
 * 示例：
 * ```tsx
 * // app/api/admin/users/route.ts
 * import { supabaseAdmin } from '@/lib/supabase/admin'
 * 
 * export async function DELETE(request: Request) {
 *   // 管理员操作，绕过 RLS
 *   const { data } = await supabaseAdmin.from('users').delete().eq('id', userId)
 *   return Response.json(data)
 * }
 * ```
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

// 防误用保护：确保永远不会在浏览器端使用
if (typeof window !== 'undefined') {
  throw new Error(
    'supabaseAdmin 只能在服务器端使用。请使用 createBrowserSupabaseClient() 或 createServerSupabaseClient()。'
  )
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    'Missing Supabase admin environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'
  )
}

/**
 * Supabase Admin Client
 * 
 * 使用 Service Role Key，拥有完全数据库访问权限
 * 绕过所有 Row Level Security (RLS) 策略
 */
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)





