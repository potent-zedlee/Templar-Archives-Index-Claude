/**
 * Admin Role Sync Server Action (Supabase Version)
 */

'use server'

import { createAdminClient } from '@/lib/supabase/admin/server'
import { isAdminEmail } from '@/lib/auth/auth-utils'

export async function syncAdminRole(
  userId: string,
  email: string
): Promise<{ success: boolean; updated: boolean; error?: string }> {
  try {
    if (!isAdminEmail(email)) return { success: true, updated: false }

    const admin = createAdminClient()
    const { data: user } = await admin.from('users').select('role').eq('id', userId).single()

    if (!user) return { success: false, updated: false, error: 'User not found' }
    if (user.role === 'admin') return { success: true, updated: false }

    await admin.from('users').update({
      role: 'admin',
      updated_at: new Date().toISOString()
    }).eq('id', userId)

    return { success: true, updated: true }
  } catch (error: any) {
    return { success: false, updated: false, error: error.message }
  }
}
