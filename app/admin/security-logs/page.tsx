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
import { auth } from '@/lib/db/firebase'
import { isAdmin } from '@/lib/auth/auth-utils'
import { exportSecurityLogs } from '@/lib/utils/export'
import {
  useSecurityEventsQuery,
  useSecurityStatsQuery,
  type LogCursor,
} from '@/lib/queries/admin-queries'

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
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(50)
  const [pageCursors, setPageCursors] = useState<Record<number, LogCursor | null>>({ 1: null })

  const [eventTypeFilter, setEventTypeFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')

  const { data: stats, refetch: refetchStats } = useSecurityStatsQuery()
  const { data: eventsData, isLoading: loading, refetch: refetchEvents } = useSecurityEventsQuery(
    { eventType: eventTypeFilter, severity: severityFilter },
    { pageSize, cursor: pageCursors[currentPage] }
  )

  const events = eventsData?.events || []
  const nextCursor = eventsData?.nextCursor || null
  const totalCount = stats?.total || 0
  const totalPages = Math.ceil(totalCount / pageSize)

  // Update next page cursor
  useEffect(() => {
    if (nextCursor && !pageCursors[currentPage + 1]) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPageCursors(prev => ({ ...prev, [currentPage + 1]: nextCursor }))
    }
  }, [nextCursor, currentPage, pageCursors])



  const handlePageChange = (newPage: number) => {
    if (newPage > currentPage && !pageCursors[newPage]) return
    if (newPage < 1) return
    setCurrentPage(newPage)
  }

  const checkAccess = async () => {
    const currentUser = auth.currentUser
    if (!currentUser) router.push('/auth/login')
    else if (!isAdmin(currentUser.email)) {
      router.push('/')
      toast.error('관리자 권한이 필요합니다')
    }
  }

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) checkAccess()
      else router.push('/auth/login')
    })
    return () => unsubscribe()
  }, [])

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
            <div className="text-2xl font-bold">{stats.recent24h.toLocaleString()}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Last 7 Days</div>
            <div className="text-2xl font-bold">{stats.recent7d.toLocaleString()}</div>
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
          <Select
            value={eventTypeFilter}
            onValueChange={(val) => {
              setEventTypeFilter(val)
              setCurrentPage(1)
              setPageCursors({ 1: null })
            }}
          >
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

          <Select
            value={severityFilter}
            onValueChange={(val) => {
              setSeverityFilter(val)
              setCurrentPage(1)
              setPageCursors({ 1: null })
            }}
          >
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
              setPageCursors({ 1: null })
              refetchEvents()
              refetchStats()
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
