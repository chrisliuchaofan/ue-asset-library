/**
 * Server Supabase Client
 * 
 * 用途：仅用于 Server Components 和 Route Handlers
 * 
 * 使用场景：
 * - Server Components（app目录下的.tsx文件）
 * - Route Handlers（app/api目录下的route.ts文件）
 * - Server Actions
 * 
 * 特性：
 * - 通过 next/headers 的 cookies() 实现 cookie 读写
 * - 支持服务端认证状态管理
 * - 为后续 auth 集成做准备
 * 
 * 限制：
 * - 仅使用 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY
 * - 不包含 Service Role Key
 * 
 * 示例：
 * ```tsx
 * // app/page.tsx (Server Component)
 * import { createServerSupabaseClient } from '@/lib/supabase/server'
 * 
 * export default async function Page() {
 *   const supabase = await createServerSupabaseClient()
 *   const { data } = await supabase.from('profiles').select('*')
 *   // ...
 * }
 * ```
 * 
 * ```tsx
 * // app/api/users/route.ts (Route Handler)
 * import { createServerSupabaseClient } from '@/lib/supabase/server'
 * 
 * export async function GET() {
 *   const supabase = await createServerSupabaseClient()
 *   // ...
 * }
 * ```
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types'

export async function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
    )
  }

  const cookieStore = await cookies()

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch (error) {
          // 在某些场景下（如 middleware）可能无法设置 cookie
          // 这里静默处理，避免中断执行
        }
      },
    },
  })
}

