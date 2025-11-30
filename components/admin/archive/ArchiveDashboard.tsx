'use client'

/**
 * ArchiveDashboard Component
 *
 * Admin Archive 통합 대시보드
 * - 파이프라인 상태별 필터링
 * - Tree/Flat 뷰 전환
 * - 상세 패널
 * - 실시간 분석 모니터링 (Analyzing 상태)
 * - ClassifyDialog: 스트림 분류
 * - ReviewPanel: 핸드 검토
 */

import { useSearchParams, useRouter } from 'next/navigation'
import { useCallback, useMemo, useState, Suspense } from 'react'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import { PipelineTabs } from '@/components/admin/PipelineTabs'
import { StreamDetailPanel } from '@/components/admin/StreamDetailPanel'
import { ViewToggle } from './ViewToggle'
import { FlatView } from './views/FlatView'
import { ClassifyDialog } from './ClassifyDialog'
import { ReviewPanel } from './ReviewPanel'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useAdminArchiveStore } from '@/stores/admin-archive-store'
import { QuickUploadDialog } from '@/components/features/admin/upload/QuickUploadDialog'
import { TournamentDialog } from '@/components/features/archive/TournamentDialog'
import type { TournamentCategory } from '@/lib/firestore-types'
import {
  useStreamsByPipelineStatus,
  usePipelineStatusCounts,
  useRetryAnalysis,
  useUpdatePipelineStatus,
  type PipelineStream,
} from '@/lib/queries/admin-archive-queries'
import { useActiveJobs } from '@/lib/queries/kan-queries'
import type { PipelineStatus } from '@/lib/types/archive'
import { Loader2 } from 'lucide-react'

/**
 * Active Jobs Panel (KAN 통합)
 * Analyzing 상태에서 표시
 */
function ActiveJobsPanel() {
  const { data: activeJobs, isLoading } = useActiveJobs()

  if (isLoading || !activeJobs || activeJobs.length === 0) {
    return null
  }

  return (
    <div className="border-t bg-muted/30 p-4">
      <h3 className="text-sm font-medium mb-3">실시간 분석 모니터</h3>
      <div className="space-y-2">
        {activeJobs.map((job) => (
          <div
            key={job.id}
            className="flex items-center justify-between bg-background rounded-md p-3 border"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {job.stream?.name || job.video?.title || `Job ${job.id.slice(0, 8)}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {job.status === 'pending' ? '대기 중...' : '분석 중...'}
              </p>
            </div>
            <div className="flex items-center gap-3 ml-4">
              <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${job.progress}%` }}
                />
              </div>
              <span className="text-sm font-medium w-12 text-right">
                {job.progress}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Dashboard Content Component
 * (Suspense boundary 내부)
 */
function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { viewMode, selectedItem, setSelectedItem, setCurrentStatusFilter } = useAdminArchiveStore()

  // Dialog/Panel 상태
  const [classifyDialogOpen, setClassifyDialogOpen] = useState(false)
  const [classifyStream, setClassifyStream] = useState<PipelineStream | null>(null)
  const [reviewPanelOpen, setReviewPanelOpen] = useState(false)
  const [reviewStreamId, setReviewStreamId] = useState<string | null>(null)
  const [reviewStreamName, setReviewStreamName] = useState<string>('')

  // TournamentDialog 상태
  const [tournamentDialogOpen, setTournamentDialogOpen] = useState(false)
  const [newTournamentName, setNewTournamentName] = useState('')
  const [newCategory, setNewCategory] = useState<TournamentCategory>('EPT')
  const [newGameType, setNewGameType] = useState<'tournament' | 'cash-game'>('tournament')
  const [newLocation, setNewLocation] = useState('')
  const [newCity, setNewCity] = useState('')
  const [newCountry, setNewCountry] = useState('')
  const [newStartDate, setNewStartDate] = useState('')
  const [newEndDate, setNewEndDate] = useState('')

  // URL에서 상태 필터 읽기
  const statusParam = searchParams?.get('status') as PipelineStatus | null
  const currentStatus: PipelineStatus | 'all' = statusParam || 'all'

  // 쿼리
  const { data: streams, isLoading, refetch } = useStreamsByPipelineStatus(currentStatus)
  const { data: counts } = usePipelineStatusCounts()
  const retryMutation = useRetryAnalysis()
  const updateStatusMutation = useUpdatePipelineStatus()

  // 상태 변경 핸들러
  const handleStatusChange = useCallback(
    (status: PipelineStatus | 'all') => {
      setCurrentStatusFilter(status)
      if (status === 'all') {
        router.push('/admin/archive')
      } else {
        router.push(`/admin/archive?status=${status}`)
      }
    },
    [router, setCurrentStatusFilter]
  )

  // 재시도 핸들러
  const handleRetry = useCallback(
    (streamId: string) => {
      retryMutation.mutate(streamId)
    },
    [retryMutation]
  )

  // 분류 다이얼로그 열기
  const handleClassify = useCallback((stream: PipelineStream) => {
    setClassifyStream(stream)
    setClassifyDialogOpen(true)
  }, [])

  // 분석 시작 핸들러
  const handleAnalyze = useCallback(
    (streamId: string) => {
      updateStatusMutation.mutate({
        streamId,
        status: 'analyzing',
      })
    },
    [updateStatusMutation]
  )

  // 리뷰 패널 열기
  const handleReview = useCallback((stream: PipelineStream) => {
    setReviewStreamId(stream.id)
    setReviewStreamName(stream.name)
    setReviewPanelOpen(true)
  }, [])

  // 발행 핸들러
  const handlePublish = useCallback(
    (streamId: string) => {
      updateStatusMutation.mutate({
        streamId,
        status: 'published',
      })
    },
    [updateStatusMutation]
  )

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
          <QuickUploadDialog onSuccess={() => refetch()} />
          <Button size="sm" onClick={() => setTournamentDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            토너먼트
          </Button>
        </div>
      </div>

      {/* Pipeline Tabs */}
      <div className="border-b px-4 py-2">
        <PipelineTabs
          activeTab={currentStatus}
          onTabChange={handleStatusChange}
          counts={counts}
        />
      </div>

      {/* Filters & View Toggle */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center gap-2">
          {/* 필터는 추후 추가 */}
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
                  onRetry={handleRetry}
                />
              ) : (
                // TreeView는 추후 구현, 일단 FlatView 표시
                <FlatView
                  streams={streams || []}
                  isLoading={isLoading}
                  onRetry={handleRetry}
                />
              )}
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Detail Panel */}
          <ResizablePanel defaultSize={40} minSize={25}>
            <div className="h-full overflow-auto border-l">
              {reviewPanelOpen && reviewStreamId ? (
                <ReviewPanel
                  streamId={reviewStreamId}
                  streamName={reviewStreamName}
                  onClose={() => {
                    setReviewPanelOpen(false)
                    setReviewStreamId(null)
                    setReviewStreamName('')
                  }}
                  onApprove={() => {
                    refetch()
                    setReviewPanelOpen(false)
                    setReviewStreamId(null)
                    setReviewStreamName('')
                  }}
                />
              ) : selectedStream ? (
                <StreamDetailPanel
                  stream={selectedStream}
                  onClose={() => setSelectedItem(null)}
                  onClassify={() => handleClassify(selectedStream)}
                  onAnalyze={() => handleAnalyze(selectedStream.id)}
                  onReview={() => handleReview(selectedStream)}
                  onPublish={() => handlePublish(selectedStream.id)}
                  onRetry={() => handleRetry(selectedStream.id)}
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

      {/* Active Jobs Panel (Analyzing 상태에서만 표시) */}
      {currentStatus === 'analyzing' && <ActiveJobsPanel />}

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
          // Reset form
          setNewTournamentName('')
          setNewCategory('EPT')
          setNewGameType('tournament')
          setNewLocation('')
          setNewCity('')
          setNewCountry('')
          setNewStartDate('')
          setNewEndDate('')
        }}
        onCancel={() => {
          setTournamentDialogOpen(false)
          // Reset form
          setNewTournamentName('')
          setNewCategory('EPT')
          setNewGameType('tournament')
          setNewLocation('')
          setNewCity('')
          setNewCountry('')
          setNewStartDate('')
          setNewEndDate('')
        }}
        newTournamentName={newTournamentName}
        setNewTournamentName={setNewTournamentName}
        newCategory={newCategory}
        setNewCategory={setNewCategory}
        newGameType={newGameType}
        setNewGameType={setNewGameType}
        newLocation={newLocation}
        setNewLocation={setNewLocation}
        newCity={newCity}
        setNewCity={setNewCity}
        newCountry={newCountry}
        setNewCountry={setNewCountry}
        newStartDate={newStartDate}
        setNewStartDate={setNewStartDate}
        newEndDate={newEndDate}
        setNewEndDate={setNewEndDate}
        isUserAdmin={true}
      />
    </div>
  )
}

/**
 * ArchiveDashboard Component (with Suspense)
 */
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
