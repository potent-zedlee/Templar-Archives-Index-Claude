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
import { firestore } from '@/lib/db/firebase'
import { auth } from '@/lib/db/firebase'
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
import { exportAuditLogs } from '@/lib/export-utils'

type AuditLog = {
  id: string
  userId: string | null
  action: string
  resourceType: string | null
  resourceId: string | null
  oldValue: Record<string, unknown> | null
  newValue: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  user: {
    id: string
    email: string
    name: string | null
  } | null
}

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
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(50)
  const [pageSnapshots, setPageSnapshots] = useState<(DocumentSnapshot | null)[]>([null])

  // Filters
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>('all')

  // Detail modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  // Stats
  const [stats, setStats] = useState<{
    total: number
    recent24h: number
    recent7d: number
    byResourceType: Record<string, number>
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

      loadAuditLogs()
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
      loadAuditLogs()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, actionFilter, resourceTypeFilter])

  const loadAuditLogs = async () => {
    setLoading(true)
    try {
      const auditLogsRef = collection(firestore, 'auditLogs')

      // Build query constraints
      const constraints: Parameters<typeof query>[1][] = []

      if (actionFilter !== 'all') {
        constraints.push(where('action', '==', actionFilter))
      }

      if (resourceTypeFilter !== 'all') {
        constraints.push(where('resourceType', '==', resourceTypeFilter))
      }

      constraints.push(orderBy('createdAt', 'desc'))
      constraints.push(limit(pageSize))

      // Add pagination cursor if not first page
      if (currentPage > 1 && pageSnapshots[currentPage - 1]) {
        constraints.push(startAfter(pageSnapshots[currentPage - 1]))
      }

      const q = query(auditLogsRef, ...constraints)
      const snapshot = await getDocs(q)

      // Store the last document for next page
      if (snapshot.docs.length > 0) {
        const newLastDoc = snapshot.docs[snapshot.docs.length - 1]

        // Store snapshot for this page
        const newPageSnapshots = [...pageSnapshots]
        newPageSnapshots[currentPage] = newLastDoc
        setPageSnapshots(newPageSnapshots)
      }

      // Fetch user info for each log
      const logsData: AuditLog[] = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const data = doc.data()

          // Try to get user info
          let userInfo: AuditLog['user'] = null
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
            userId: data.userId || null,
            action: data.action || '',
            resourceType: data.resourceType || null,
            resourceId: data.resourceId || null,
            oldValue: data.oldValue || null,
            newValue: data.newValue || null,
            ipAddress: data.ipAddress || null,
            userAgent: data.userAgent || null,
            metadata: data.metadata || null,
            createdAt: data.createdAt instanceof Timestamp
              ? data.createdAt.toDate().toISOString()
              : data.createdAt || new Date().toISOString(),
            user: userInfo,
          }
        })
      )

      setLogs(logsData)

      // Get total count
      const countQuery = query(
        auditLogsRef,
        ...(actionFilter !== 'all' ? [where('action', '==', actionFilter)] : []),
        ...(resourceTypeFilter !== 'all' ? [where('resourceType', '==', resourceTypeFilter)] : [])
      )
      const countSnapshot = await getCountFromServer(countQuery)
      setTotalCount(countSnapshot.data().count)
    } catch (error) {
      console.error('Failed to load audit logs:', error)
      toast.error('Audit 로그를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const auditLogsRef = collection(firestore, 'auditLogs')

      // Get total count
      const totalSnapshot = await getCountFromServer(auditLogsRef)
      const total = totalSnapshot.data().count

      // Get count in last 24 hours
      const now = new Date()
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const recent24hQuery = query(
        auditLogsRef,
        where('createdAt', '>=', Timestamp.fromDate(twentyFourHoursAgo))
      )
      const recent24hSnapshot = await getCountFromServer(recent24hQuery)
      const recent24h = recent24hSnapshot.data().count

      // Get count in last 7 days
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const recent7dQuery = query(
        auditLogsRef,
        where('createdAt', '>=', Timestamp.fromDate(sevenDaysAgo))
      )
      const recent7dSnapshot = await getCountFromServer(recent7dQuery)
      const recent7d = recent7dSnapshot.data().count

      // Get count by resource type (sample approach - fetch limited docs)
      const resourceTypeSnapshot = await getDocs(query(auditLogsRef, limit(500)))
      const byResourceType: Record<string, number> = {}
      resourceTypeSnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.resourceType) {
          byResourceType[data.resourceType] = (byResourceType[data.resourceType] || 0) + 1
        }
      })

      setStats({
        total,
        recent24h: recent24h,
        recent7d: recent7d,
        byResourceType: byResourceType,
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

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

  const totalPages = Math.ceil(totalCount / pageSize)

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return

    // If going back, we need to reset the snapshots
    if (newPage < currentPage) {
      setPageSnapshots(pageSnapshots.slice(0, newPage))
    }

    setCurrentPage(newPage)
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
          <Select value={actionFilter} onValueChange={setActionFilter}>
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

          <Select value={resourceTypeFilter} onValueChange={setResourceTypeFilter}>
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
              setPageSnapshots([null])
              loadAuditLogs()
              loadStats()
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
