/**
 * Supabase Admin Client
 * Server 환경에서 RLS(Row Level Security)를 우회하여 모든 데이터에 접근해야 할 때 사용합니다.
 * 백그라운드 작업, 웹훅 처리, 관리자용 API 등에서 사용됩니다.
 */
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../database.types'

export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin client')
  }
  
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
