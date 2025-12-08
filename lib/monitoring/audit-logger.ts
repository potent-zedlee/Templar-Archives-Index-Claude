/**
 * Audit Logger
 *
 * Logs user and admin actions for auditing purposes.
 * Migrated to Firestore.
 */

import { collection, addDoc, getDocs, query, where, orderBy, limit, getCountFromServer, Timestamp, doc, getDoc } from 'firebase/firestore'
import { firestore } from '@/lib/db/firebase'

const AUDIT_LOGS_COLLECTION = 'auditLogs'

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

interface FirestoreAuditLog {
  userId: string | null
  action: string
  resourceType?: string | null
  resourceId?: string | null
  oldValue?: Record<string, unknown> | null
  newValue?: Record<string, unknown> | null
  ipAddress?: string | null
  userAgent?: string | null
  metadata?: Record<string, unknown> | null
  createdAt: Timestamp
}

/**
 * Log an audit event
 *
 * @param data Audit log data
 * @returns Promise<{ success: boolean; logId?: string; error?: string }>
 */
export async function logAuditEvent(
  data: AuditLogData
): Promise<{ success: boolean; logId?: string; error?: string }> {
  try {
    const auditLogData: FirestoreAuditLog = {
      userId: data.user_id,
      action: data.action,
      resourceType: data.resource_type,
      resourceId: data.resource_id,
      oldValue: data.old_value,
      newValue: data.new_value,
      ipAddress: data.ip_address,
      userAgent: data.user_agent,
      metadata: data.metadata,
      createdAt: Timestamp.now()
    }

    const docRef = await addDoc(collection(firestore, AUDIT_LOGS_COLLECTION), auditLogData)

    return { success: true, logId: docRef.id }
  } catch (error) {
    console.error('Failed to log audit event:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get audit logs with pagination
 *
 * @param options Query options
 * @returns Promise<{ data: any[]; count: number; error?: string }>
 */
export async function getAuditLogs(options: {
  page?: number
  limit?: number
  user_id?: string
  action?: string
  resource_type?: string
  from_date?: string
  to_date?: string
}): Promise<{ data: unknown[]; count: number; error?: string }> {
  try {
    const pageSize = options.limit || 50
    const constraints: Parameters<typeof where>[] = []

    // Build query constraints
    if (options.user_id) {
      constraints.push(['userId', '==', options.user_id])
    }

    if (options.action) {
      constraints.push(['action', '==', options.action])
    }

    if (options.resource_type) {
      constraints.push(['resourceType', '==', options.resource_type])
    }

    if (options.from_date) {
      constraints.push(['createdAt', '>=', Timestamp.fromDate(new Date(options.from_date))])
    }

    if (options.to_date) {
      constraints.push(['createdAt', '<=', Timestamp.fromDate(new Date(options.to_date))])
    }

    // Build the query
    const baseQuery = collection(firestore, AUDIT_LOGS_COLLECTION)
    const whereConstraints = constraints.map(c => where(c[0] as string, c[1] as any, c[2]))

    const logsQuery = query(
      baseQuery,
      ...whereConstraints,
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    )

    // Get count
    const countQuery = query(baseQuery, ...whereConstraints)
    const countSnapshot = await getCountFromServer(countQuery)
    const totalCount = countSnapshot.data().count

    // Get data
    const logsSnapshot = await getDocs(logsQuery)

    // Fetch user data for each log
    const logsWithUsers = await Promise.all(
      logsSnapshot.docs.map(async (logDoc) => {
        const logData = logDoc.data() as FirestoreAuditLog
        let userData = null

        if (logData.userId) {
          try {
            const userDoc = await getDoc(doc(firestore, 'users', logData.userId))
            if (userDoc.exists()) {
              const user = userDoc.data()
              userData = {
                id: userDoc.id,
                email: user.email,
                name: user.nickname || user.displayName
              }
            }
          } catch {
            // User not found, continue without user data
          }
        }

        return {
          id: logDoc.id,
          user_id: logData.userId,
          action: logData.action,
          resource_type: logData.resourceType,
          resource_id: logData.resourceId,
          old_value: logData.oldValue,
          new_value: logData.newValue,
          ip_address: logData.ipAddress,
          user_agent: logData.userAgent,
          metadata: logData.metadata,
          created_at: logData.createdAt.toDate().toISOString(),
          users: userData
        }
      })
    )

    return { data: logsWithUsers, count: totalCount }
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return {
      data: [],
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
