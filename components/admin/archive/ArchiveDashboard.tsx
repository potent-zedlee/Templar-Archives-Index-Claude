'use client'

/**
 * ArchiveDashboard Component
 *
 * Admin Archive 통합 대시보드
 * - 트리/플랫 뷰 전환
 * - 상세 패널
 * - ClassifyDialog: 스트림 분류
 */

import { useRouter } from 'next/navigation'
import { useMemo, useState, Suspense } from 'react'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import { StreamDetailPanel } from '@/components/admin/StreamDetailPanel'
import { ViewToggle } from './ViewToggle'
import { FlatView } from './views/FlatView'
import { ClassifyDialog } from './ClassifyDialog'
import { Button } from '@/components/ui/button'
import { Plus, Loader2 } from 'lucide-react'
import { useAdminArchiveStore } from '@/stores/admin-archive-store'
import { UploadDialog } from '@/components/features/admin/upload/UploadDialog'
import { TournamentDialog } from '@/components/features/archive/TournamentDialog'
import {
  useAdminStreamsQuery,
  type AdminStream,
} from '@/lib/queries/admin-archive-queries'

/**
 * Dashboard Content Component
 */
function DashboardContent() {
  const { viewMode, selectedItem, setSelectedItem } = useAdminArchiveStore()

  // Dialog/Panel 상태
  const [classifyDialogOpen, setClassifyDialogOpen] = useState(false)
  const [classifyStream, setClassifyStream] = useState<AdminStream | null>(null)
  const [tournamentDialogOpen, setTournamentDialogOpen] = useState(false)

  // 쿼리 (전체 스트림 조회로 단순화)
  const { data: streams, isLoading, refetch } = useAdminStreamsQuery('all')

  // 선택된 스트림 데이터
  const selectedStream = useMemo(() => {
    if (!selectedItem || selectedItem.type !== 'stream') return null
    return streams?.find((s) => s.id === selectedItem.id) || null
  }, [selectedItem, streams])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-2xl font-bold">Archive</h1>
        <div className="flex items-center gap-2">
          <UploadDialog onSuccess={() => refetch()} />
          <Button size="sm" onClick={() => setTournamentDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            토너먼트
          </Button>
        </div>
      </div>

      {/* Filters & View Toggle */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center gap-2">
          {/* 필터 */}
        </div>
        <ViewToggle />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Stream List */}
          <ResizablePanel defaultSize={60} minSize={30}>
            <div className="h-full overflow-auto">
              {viewMode === 'flat' ? (
                <FlatView
                  streams={streams || []}
                  isLoading={isLoading}
                />
              ) : (
                <FlatView
                  streams={streams || []}
                  isLoading={isLoading}
                />
              )}
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Detail Panel */}
          <ResizablePanel defaultSize={40} minSize={25}>
            <div className="h-full overflow-auto border-l">
              {selectedStream ? (
                <StreamDetailPanel
                  stream={selectedStream}
                  onClose={() => setSelectedItem(null)}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>스트림을 선택하세요</p>
                </div>
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* ClassifyDialog */}
      <ClassifyDialog
        open={classifyDialogOpen}
        onOpenChange={setClassifyDialogOpen}
        stream={classifyStream}
        onSuccess={() => {
          refetch()
          setClassifyDialogOpen(false)
          setClassifyStream(null)
        }}
      />

      {/* TournamentDialog */}
      <TournamentDialog
        isOpen={tournamentDialogOpen}
        onOpenChange={setTournamentDialogOpen}
        editingTournamentId=""
        onSave={() => {
          refetch()
          setTournamentDialogOpen(false)
        }}
        onCancel={() => setTournamentDialogOpen(false)}
        isUserAdmin={true}
      />
    </div>
  )
}

export function ArchiveDashboard() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}
