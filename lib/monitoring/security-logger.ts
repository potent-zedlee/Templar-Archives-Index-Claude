/**
 * Security Event Logger (Supabase Version)
 *
 * Logs security events to Supabase for monitoring and auditing.
 */

import { createAdminClient } from '@/lib/supabase/admin/server'

export type SecurityEventType =
  | 'sql_injection'
  | 'xss_attempt'
  | 'csrf_violation'
  | 'rate_limit_exceeded'
  | 'suspicious_file_upload'
  | 'permission_violation'
  | 'failed_login_attempt'
  | 'admin_action'

export type SecurityEventSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface SecurityEventData {
  eventType: SecurityEventType
  severity: SecurityEventSeverity
  userId?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  requestMethod?: string | null
  requestPath?: string | null
  requestBody?: Record<string, unknown> | null
  responseStatus?: number | null
  details?: Record<string, unknown> | null
}

/**
 * Log a security event to Supabase
 */
export async function logSecurityEventToDb(
  eventData: SecurityEventData
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    const admin = createAdminClient()
    
    const { data, error } = await admin.from('security_events').insert({
      user_id: eventData.userId || null,
      event_type: eventData.eventType,
      severity: eventData.severity,
      ip_address: eventData.ipAddress,
      request_method: eventData.requestMethod,
      request_path: eventData.requestPath,
      details: {
        ...(eventData.details || {}),
        user_agent: eventData.userAgent,
        response_status: eventData.responseStatus
      }
    }).select().single()

    if (error) throw error

    return { success: true, eventId: data.id }
  } catch (error) {
    console.error('Error logging security event:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get security events with pagination and filtering
 */
export async function getSecurityEvents(options: {
  page?: number
  limit?: number
  event_type?: SecurityEventType
  severity?: SecurityEventSeverity
  user_id?: string
  from_date?: string
  to_date?: string
}): Promise<{ data: any[]; count: number; error?: string }> {
  try {
    const admin = createAdminClient()
    let query = admin.from('security_events').select('*', { count: 'exact' })

    if (options.event_type) query = query.eq('event_type', options.event_type)
    if (options.severity) query = query.eq('severity', options.severity)
    if (options.user_id) query = query.eq('user_id', options.user_id)
    if (options.from_date) query = query.gte('created_at', options.from_date)
    if (options.to_date) query = query.lte('created_at', options.to_date)

    const limit = options.limit || 20
    const page = options.page || 1
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) throw error

    return { data: data || [], count: count || 0 }
  } catch (error: any) {
    return { data: [], count: 0, error: error.message }
  }
}

/**
 * Cleanup old security events (older than 90 days)
 */
export async function cleanupOldSecurityEvents(): Promise<{
  success: boolean
  deletedCount?: number
  error?: string
}> {
  try {
    const admin = createAdminClient()
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const { count, error } = await admin
      .from('security_events')
      .delete({ count: 'exact' })
      .lt('created_at', ninetyDaysAgo.toISOString())

    if (error) throw error
    return { success: true, deletedCount: count || 0 }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
