/**
 * Supabase Browser Client
 * Client Component (브라우저) 환경에서 Supabase 인스턴스를 생성하고 재사용합니다.
 */
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

export function createClient() {
  // 싱글톤 패턴을 사용하여 불필요한 재렌더링 방지
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
