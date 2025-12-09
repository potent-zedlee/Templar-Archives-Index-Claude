/**
 * Admin Audit Logs Page
 *
 * View and monitor all user and admin actions for auditing.
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { FileText, ChevronLeft, ChevronRight, RefreshCw, Download, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { auth } from '@/lib/db/firebase'
import { isAdmin } from '@/lib/auth/auth-utils'
import { exportAuditLogs } from '@/lib/utils/export'
import {
  useAuditLogsQuery,
  useAuditStatsQuery,
  type LogCursor,
  type AuditLogDef as AuditLog
} from '@/lib/queries/admin-queries'

const ACTION_LABELS: Record<string, string> = {
  create_tournament: 'Create Tournament',
  update_tournament: 'Update Tournament',
  delete_tournament: 'Delete Tournament',
  create_event: 'Create Event',
  update_event: 'Update Event',
  delete_event: 'Delete Event',
  create_stream: 'Create Stream',
  update_stream: 'Update Stream',
  delete_stream: 'Delete Stream',
  // Legacy aliases for backward compatibility
  create_subevent: 'Create Event',
  update_subevent: 'Update Event',
  delete_subevent: 'Delete Event',
  create_day: 'Create Stream',
  update_day: 'Update Stream',
  delete_day: 'Delete Stream',
  ban_user: 'Ban User',
  unban_user: 'Unban User',
  change_role: 'Change Role',
  approve_claim: 'Approve Claim',
  reject_claim: 'Reject Claim',
  delete_post: 'Delete Post',
  delete_comment: 'Delete Comment',
}

const RESOURCE_TYPE_COLORS: Record<string, string> = {
  tournament: 'bg-blue-100 text-blue-800',
  event: 'bg-green-100 text-green-800',
  stream: 'bg-yellow-100 text-yellow-800',
  // Legacy aliases for backward compatibility
  subevent: 'bg-green-100 text-green-800',
  day: 'bg-yellow-100 text-yellow-800',
  user: 'bg-purple-100 text-purple-800',
  post: 'bg-pink-100 text-pink-800',
  hand: 'bg-orange-100 text-orange-800',
}

export default function AuditLogsPage() {
  const router = useRouter()
  const { data: stats, refetch: refetchStats } = useAuditStatsQuery()

  // Filter and Modal State
  const [actionFilter, setActionFilter] = useState('all')
  const [resourceTypeFilter, setResourceTypeFilter] = useState('all')
  const [pageSize] = useState(50)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)

  const [pageCursors, setPageCursors] = useState<Record<number, LogCursor | null>>({ 1: null })

  const { data: logsData, isLoading: loading, refetch: refetchLogs } = useAuditLogsQuery(
    { action: actionFilter, resourceType: resourceTypeFilter },
    { pageSize, cursor: pageCursors[currentPage] }
  )

  const logs = logsData?.logs || []
  const nextCursor = logsData?.nextCursor || null
  const totalCount = stats?.total || 0
  const totalPages = Math.ceil(totalCount / pageSize)

  // Update next page cursor when data loads
  useEffect(() => {
    if (nextCursor && !pageCursors[currentPage + 1]) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPageCursors(prev => ({ ...prev, [currentPage + 1]: nextCursor }))
    }
  }, [nextCursor, currentPage, pageCursors])



  const handlePageChange = (newPage: number) => {
    // Allow going to next page only if we have the cursor
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

  const handleExportCSV = () => {
    if (logs.length === 0) {
      toast.error('내보낼 데이터가 없습니다')
      return
    }
    const exportData = logs.map(log => ({
      id: log.id,
      userId: log.userId,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      oldValue: log.oldValue,
      newValue: log.newValue,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      metadata: log.metadata,
      createdAt: log.createdAt,
      users: log.user ? {
        id: log.user.id,
        email: log.user.email,
        name: log.user.name
      } : null
    }))
    exportAuditLogs(exportData, 'csv')
    toast.success('CSV 파일이 다운로드되었습니다')
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

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <FileText className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Audit Logs</h1>
            <p className="text-muted-foreground">사용자 및 관리자 액션 감사 추적</p>
          </div>
        </div>
        <Button onClick={handleExportCSV} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total Actions</div>
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
            <div className="text-sm text-muted-foreground">Resource Types</div>
            <div className="text-2xl font-bold">
              {Object.keys(stats.byResourceType).length}
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <Select
            value={actionFilter}
            onValueChange={(val) => {
              setActionFilter(val)
              setCurrentPage(1)
              setPageCursors({ 1: null })
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {Object.entries(ACTION_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={resourceTypeFilter}
            onValueChange={(val) => {
              setResourceTypeFilter(val)
              setCurrentPage(1)
              setPageCursors({ 1: null })
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Resource Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="tournament">Tournament</SelectItem>
              <SelectItem value="event">Event</SelectItem>
              <SelectItem value="stream">Stream</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="post">Post</SelectItem>
              <SelectItem value="hand">Hand</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCurrentPage(1)
              setPageCursors({ 1: null })
              refetchLogs()
              refetchStats()
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </Card>

      {/* Logs Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  로딩 중...
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Audit 로그가 없습니다
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs">
                    {formatDate(log.createdAt)}
                  </TableCell>
                  <TableCell>
                    {log.user ? (
                      <div className="text-sm">
                        <div className="font-medium">{log.user.name || 'Unknown'}</div>
                        <div className="text-muted-foreground">{log.user.email}</div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">System</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {ACTION_LABELS[log.action] || log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {log.resourceType && (
                      <div className="flex items-center gap-2">
                        <Badge className={RESOURCE_TYPE_COLORS[log.resourceType] || ''}>
                          {log.resourceType}
                        </Badge>
                        {log.resourceId && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {log.resourceId.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedLog(log)
                        setDetailModalOpen(true)
                      }}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
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
            Page {currentPage} of {totalPages} ({totalCount} total actions)
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

      {/* Detail Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              {selectedLog && formatDate(selectedLog.createdAt)}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              {/* User Info */}
              <div>
                <h3 className="font-semibold mb-2">User</h3>
                {selectedLog.user ? (
                  <div>
                    <div>{selectedLog.user.name || 'Unknown'}</div>
                    <div className="text-sm text-muted-foreground">
                      {selectedLog.user.email}
                    </div>
                  </div>
                ) : (
                  <span className="text-muted-foreground">System</span>
                )}
              </div>

              {/* Action Info */}
              <div>
                <h3 className="font-semibold mb-2">Action</h3>
                <Badge>{ACTION_LABELS[selectedLog.action] || selectedLog.action}</Badge>
              </div>

              {/* Resource Info */}
              {selectedLog.resourceType && (
                <div>
                  <h3 className="font-semibold mb-2">Resource</h3>
                  <div className="flex items-center gap-2">
                    <Badge className={RESOURCE_TYPE_COLORS[selectedLog.resourceType] || ''}>
                      {selectedLog.resourceType}
                    </Badge>
                    {selectedLog.resourceId && (
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {selectedLog.resourceId}
                      </code>
                    )}
                  </div>
                </div>
              )}

              {/* Old Value */}
              {selectedLog.oldValue && (
                <div>
                  <h3 className="font-semibold mb-2">Before</h3>
                  <pre className="p-4 bg-muted rounded text-xs overflow-auto">
                    {JSON.stringify(selectedLog.oldValue, null, 2)}
                  </pre>
                </div>
              )}

              {/* New Value */}
              {selectedLog.newValue && (
                <div>
                  <h3 className="font-semibold mb-2">After</h3>
                  <pre className="p-4 bg-muted rounded text-xs overflow-auto">
                    {JSON.stringify(selectedLog.newValue, null, 2)}
                  </pre>
                </div>
              )}

              {/* Metadata */}
              {selectedLog.metadata && (
                <div>
                  <h3 className="font-semibold mb-2">Metadata</h3>
                  <pre className="p-4 bg-muted rounded text-xs overflow-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {/* Technical Info */}
              <div>
                <h3 className="font-semibold mb-2">Technical Info</h3>
                <div className="space-y-1 text-sm">
                  {selectedLog.ipAddress && (
                    <div>
                      <span className="text-muted-foreground">IP: </span>
                      <code className="text-xs">{selectedLog.ipAddress}</code>
                    </div>
                  )}
                  {selectedLog.userAgent && (
                    <div>
                      <span className="text-muted-foreground">User Agent: </span>
                      <code className="text-xs">{selectedLog.userAgent}</code>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
