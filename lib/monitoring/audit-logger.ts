/**
 * Audit Logger (Supabase Version)
 */

import { createClient } from '@/lib/supabase/client'

export interface AuditLogData {
  user_id: string | null
  action: string
  resource_type?: string | null
  resource_id?: string | null
  old_value?: Record<string, unknown> | null
  new_value?: Record<string, unknown> | null
  ip_address?: string | null
  user_agent?: string | null
  metadata?: Record<string, unknown> | null
}

export async function logAuditEvent(
  data: AuditLogData
): Promise<{ success: boolean; logId?: string; error?: string }> {
  try {
    const supabase = createClient()
    const { data: log, error } = await supabase
      .from('admin_logs')
      .insert({
        admin_id: data.user_id,
        action: data.action,
        target_type: data.resource_type,
        target_id: data.resource_id,
        details: {
          old_value: data.old_value,
          new_value: data.new_value,
          ip_address: data.ip_address,
          user_agent: data.user_agent,
          metadata: data.metadata
        }
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, logId: log.id }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getAuditLogs(options: {
  page?: number
  limit?: number
  user_id?: string
  action?: string
  resource_type?: string
  from_date?: string
  to_date?: string
}) {
  try {
    const supabase = createClient()
    const pageSize = options.limit || 50
    const from = ((options.page || 1) - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('admin_logs')
      .select('*, users:admin_id(nickname, email)', { count: 'exact' })

    if (options.user_id) query = query.eq('admin_id', options.user_id)
    if (options.action) query = query.eq('action', options.action)
    if (options.resource_type) query = query.eq('target_type', options.resource_type)
    if (options.from_date) query = query.gte('created_at', options.from_date)
    if (options.to_date) query = query.lte('created_at', options.to_date)

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) throw error

    return {
      data: (data || []).map(d => ({
        id: d.id,
        user_id: d.admin_id,
        action: d.action,
        resource_type: d.target_type,
        resource_id: d.target_id,
        old_value: d.details?.old_value,
        new_value: d.details?.new_value,
        ip_address: d.details?.ip_address,
        user_agent: d.details?.user_agent,
        metadata: d.details?.metadata,
        created_at: d.created_at,
        users: d.users
      })),
      count: count || 0
    }
  } catch (error: any) {
    return { data: [], count: 0, error: error.message }
  }
}
