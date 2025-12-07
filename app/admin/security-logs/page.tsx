/**
 * Admin Security Logs Page
 *
 * View and monitor security events logged by the system.
 * Migrated from Supabase to Firestore
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Shield, AlertTriangle, Info, XCircle, ChevronLeft, ChevronRight, RefreshCw, Download } from 'lucide-react'
import { toast } from 'sonner'
import { firestore, auth } from '@/lib/db/firebase'
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  where,
  Timestamp,
  startAfter,
  DocumentSnapshot,
  getCountFromServer,
} from 'firebase/firestore'
import { isAdmin } from '@/lib/auth/auth-utils'
import { exportSecurityLogs } from '@/lib/export-utils'

type SecurityEvent = {
  id: string
  eventType: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  userId: string | null
  ipAddress: string | null
  userAgent: string | null
  requestMethod: string | null
  requestPath: string | null
  responseStatus: number | null
  details: Record<string, unknown> | null
  createdAt: string
  user: {
    id: string
    email: string
    name: string | null
  } | null
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  sql_injection: 'SQL Injection',
  xss_attempt: 'XSS Attempt',
  csrf_violation: 'CSRF Violation',
  rate_limit_exceeded: 'Rate Limit',
  suspicious_file_upload: 'Suspicious File',
  permission_violation: 'Permission Denied',
  failed_login_attempt: 'Failed Login',
  admin_action: 'Admin Action',
}

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
}

const SEVERITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  low: Info,
  medium: AlertTriangle,
  high: AlertTriangle,
  critical: XCircle,
}

export default function SecurityLogsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(50)
  const [pageSnapshots, setPageSnapshots] = useState<(DocumentSnapshot | null)[]>([null])

  // Filters
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all')
  const [severityFilter, setSeverityFilter] = useState<string>('all')

  // Stats
  const [stats, setStats] = useState<{
    total: number
    by_severity: Record<string, number>
    recent_24h: number
    recent_7d: number
  } | null>(null)

  // Check admin access
  useEffect(() => {
    const checkAccess = async () => {
      const currentUser = auth.currentUser

      if (!currentUser) {
        router.push('/auth/login')
        return
      }

      if (!isAdmin(currentUser.email)) {
        router.push('/')
        toast.error('관리자 권한이 필요합니다')
        return
      }

      loadSecurityEvents()
      loadStats()
    }

    // Wait for auth state to be ready
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        checkAccess()
      } else {
        router.push('/auth/login')
      }
    })

    return () => unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reload when filters or page changes
  useEffect(() => {
    if (auth.currentUser && isAdmin(auth.currentUser.email)) {
      loadSecurityEvents()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, eventTypeFilter, severityFilter])

  const loadSecurityEvents = async () => {
    setLoading(true)
    try {
      const securityEventsRef = collection(firestore, 'securityEvents')

      // Build query constraints
      const constraints: Parameters<typeof query>[1][] = []

      if (eventTypeFilter !== 'all') {
        constraints.push(where('eventType', '==', eventTypeFilter))
      }

      if (severityFilter !== 'all') {
        constraints.push(where('severity', '==', severityFilter))
      }

      constraints.push(orderBy('createdAt', 'desc'))
      constraints.push(limit(pageSize))

      // Add pagination cursor if not first page
      if (currentPage > 1 && pageSnapshots[currentPage - 1]) {
        constraints.push(startAfter(pageSnapshots[currentPage - 1]))
      }

      const q = query(securityEventsRef, ...constraints)
      const snapshot = await getDocs(q)

      // Store the last document for next page
      if (snapshot.docs.length > 0) {
        const newLastDoc = snapshot.docs[snapshot.docs.length - 1]

        // Store snapshot for this page
        const newPageSnapshots = [...pageSnapshots]
        newPageSnapshots[currentPage] = newLastDoc
        setPageSnapshots(newPageSnapshots)
      }

      // Fetch user info for each event
      const eventsData: SecurityEvent[] = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const data = doc.data()

          // Try to get user info
          let userInfo: SecurityEvent['user'] = null
          if (data.userId) {
            try {
              const usersRef = collection(firestore, 'users')
              const userQuery = query(usersRef, where('__name__', '==', data.userId), limit(1))
              const userSnapshot = await getDocs(userQuery)
              if (!userSnapshot.empty) {
                const userData = userSnapshot.docs[0].data()
                userInfo = {
                  id: userSnapshot.docs[0].id,
                  email: userData.email || '',
                  name: userData.nickname || null,
                }
              }
            } catch {
              // User not found, ignore
            }
          }

          return {
            id: doc.id,
            eventType: data.eventType || '',
            severity: data.severity || 'low',
            userId: data.userId || null,
            ipAddress: data.ipAddress || null,
            userAgent: data.userAgent || null,
            requestMethod: data.requestMethod || null,
            requestPath: data.requestPath || null,
            responseStatus: data.responseStatus || null,
            details: data.details || null,
            createdAt: data.createdAt instanceof Timestamp
              ? data.createdAt.toDate().toISOString()
              : data.createdAt || new Date().toISOString(),
            user: userInfo,
          }
        })
      )

      setEvents(eventsData)

      // Get total count
      const countQuery = query(
        securityEventsRef,
        ...(eventTypeFilter !== 'all' ? [where('eventType', '==', eventTypeFilter)] : []),
        ...(severityFilter !== 'all' ? [where('severity', '==', severityFilter)] : [])
      )
      const countSnapshot = await getCountFromServer(countQuery)
      setTotalCount(countSnapshot.data().count)
    } catch (error) {
      console.error('Failed to load security events:', error)
      toast.error('보안 이벤트를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const securityEventsRef = collection(firestore, 'securityEvents')

      // Get total count
      const totalSnapshot = await getCountFromServer(securityEventsRef)
      const total = totalSnapshot.data().count

      // Get count by severity (sample approach - fetch limited docs)
      const severitySnapshot = await getDocs(query(securityEventsRef, limit(500)))
      const bySeverity: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 }
      severitySnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.severity) {
          bySeverity[data.severity] = (bySeverity[data.severity] || 0) + 1
        }
      })

      // Get count in last 24 hours
      const now = new Date()
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const recent24hQuery = query(
        securityEventsRef,
        where('createdAt', '>=', Timestamp.fromDate(twentyFourHoursAgo))
      )
      const recent24hSnapshot = await getCountFromServer(recent24hQuery)
      const recent24h = recent24hSnapshot.data().count

      // Get count in last 7 days
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const recent7dQuery = query(
        securityEventsRef,
        where('createdAt', '>=', Timestamp.fromDate(sevenDaysAgo))
      )
      const recent7dSnapshot = await getCountFromServer(recent7dQuery)
      const recent7d = recent7dSnapshot.data().count

      setStats({
        total,
        by_severity: bySeverity,
        recent_24h: recent24h,
        recent_7d: recent7d,
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const getSeverityIcon = (severity: string) => {
    const Icon = SEVERITY_ICONS[severity] || Info
    return <Icon className="w-4 h-4" />
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return

    // If going back, we need to reset the snapshots
    if (newPage < currentPage) {
      setPageSnapshots(pageSnapshots.slice(0, newPage))
    }

    setCurrentPage(newPage)
  }

  const handleExportCSV = () => {
    if (events.length === 0) {
      toast.error('내보낼 데이터가 없습니다')
      return
    }
    const exportData = events.map(event => ({
      id: event.id,
      eventType: event.eventType,
      severity: event.severity,
      userId: event.userId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      method: event.requestMethod,
      path: event.requestPath,
      details: event.details,
      createdAt: event.createdAt,
    }))
    exportSecurityLogs(exportData, 'csv')
    toast.success('CSV 파일이 다운로드되었습니다')
  }

  const handleExportJSON = () => {
    if (events.length === 0) {
      toast.error('내보낼 데이터가 없습니다')
      return
    }
    const exportData = events.map(event => ({
      id: event.id,
      eventType: event.eventType,
      severity: event.severity,
      userId: event.userId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      method: event.requestMethod,
      path: event.requestPath,
      details: event.details,
      createdAt: event.createdAt,
    }))
    exportSecurityLogs(exportData, 'json')
    toast.success('JSON 파일이 다운로드되었습니다')
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Shield className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Security Logs</h1>
          <p className="text-muted-foreground">모니터링 및 보안 이벤트 추적</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total Events</div>
            <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Last 24 Hours</div>
            <div className="text-2xl font-bold">{stats.recent_24h.toLocaleString()}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Last 7 Days</div>
            <div className="text-2xl font-bold">{stats.recent_7d.toLocaleString()}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Critical Events</div>
            <div className="text-2xl font-bold text-red-600">
              {stats.by_severity.critical || 0}
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Event Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCurrentPage(1)
              setPageSnapshots([null])
              loadSecurityEvents()
              loadStats()
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>

          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJSON}
            >
              <Download className="w-4 h-4 mr-2" />
              Export JSON
            </Button>
          </div>
        </div>
      </Card>

      {/* Events Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Event Type</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>User</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Path</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  로딩 중...
                </TableCell>
              </TableRow>
            ) : events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  보안 이벤트가 없습니다
                </TableCell>
              </TableRow>
            ) : (
              events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="font-mono text-xs">
                    {formatDate(event.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {EVENT_TYPE_LABELS[event.eventType] || event.eventType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getSeverityIcon(event.severity)}
                      <Badge className={SEVERITY_COLORS[event.severity]}>
                        {event.severity.toUpperCase()}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    {event.user ? (
                      <div className="text-sm">
                        <div className="font-medium">{event.user.name || 'Unknown'}</div>
                        <div className="text-muted-foreground">{event.user.email}</div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Anonymous</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {event.ipAddress || '-'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {event.requestMethod} {event.requestPath || '-'}
                  </TableCell>
                  <TableCell>
                    {event.details && (
                      <details>
                        <summary className="cursor-pointer text-sm text-primary hover:underline">
                          View Details
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-w-md">
                          {JSON.stringify(event.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages} ({totalCount} total events)
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
