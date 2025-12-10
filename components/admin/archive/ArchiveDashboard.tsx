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
import dynamic from 'next/dynamic'
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
import { UploadDialog } from '@/components/features/admin/upload/UploadDialog'
import { TournamentDialog } from '@/components/features/archive/TournamentDialog'
import type { StreamWithIds } from '@/components/features/archive/dialogs/AnalyzeVideoDialog'

// 대형 Dialog 컴포넌트는 동적 로드 (초기 번들 크기 감소)
const AnalyzeVideoDialog = dynamic(
  () => import('@/components/features/archive/dialogs/AnalyzeVideoDialog').then((mod) => mod.AnalyzeVideoDialog),
  { ssr: false }
)
import type { TournamentCategory } from '@/lib/db/firestore-types'
import {
  useStreamsByPipelineStatus,
  usePipelineStatusCounts,
  useRetryAnalysis,
  type PipelineStream,
} from '@/lib/queries/admin-archive-queries'
import { useActiveJobs } from '@/lib/queries/kan-queries'
import type { PipelineStatus } from '@/lib/types/archive'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

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
  const [analyzeDialogOpen, setAnalyzeDialogOpen] = useState(false)
  const [analyzeStream, setAnalyzeStream] = useState<StreamWithIds | null>(null)
  const [reviewPanelOpen, setReviewPanelOpen] = useState(false)
  const [reviewStreamId, setReviewStreamId] = useState<string | null>(null)
  const [reviewStreamName, setReviewStreamName] = useState<string>('')

  // TournamentDialog 상태
  const [tournamentDialogOpen, setTournamentDialogOpen] = useState(false)
  const [newTournamentName, setNewTournamentName] = useState('')
  const [newCategory, setNewCategory] = useState<TournamentCategory>('EPT')
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

  // 상태 변경 핸들러
  const handleStatusChange = useCallback(
    (status: PipelineStatus | 'all') => {
      setCurrentStatusFilter(status)
      if (status === 'all') {
        router.push('/admin/archive/pipeline')
      } else {
        router.push(`/admin/archive/pipeline?status=${status}`)
      }
    },
    [router, setCurrentStatusFilter]
  )

  // 재시도 핸들러
  const handleRetry = useCallback(
    (stream: PipelineStream) => {
      if (!stream.tournamentId || !stream.eventId) {
        toast.error('토너먼트/이벤트 정보가 없습니다. 먼저 분류해주세요.')
        return
      }
      retryMutation.mutate({
        streamId: stream.id,
        tournamentId: stream.tournamentId,
        eventId: stream.eventId,
      })
    },
    [retryMutation]
  )

  // 분석 다이얼로그 열기
  const handleAnalyze = useCallback((stream: PipelineStream) => {
    // PipelineStream을 StreamWithIds로 변환
    const streamWithIds: StreamWithIds = {
      id: stream.id,
      name: stream.name,
      description: stream.description,
      videoUrl: stream.videoUrl,
      videoFile: stream.videoFile,
      videoSource: stream.videoSource,
      uploadStatus: stream.uploadStatus,
      gcsUri: stream.gcsUri,
      gcsPath: stream.gcsPath,
      tournamentId: stream.tournamentId || '',
      eventId: stream.eventId || '',
      // FirestoreStream 필수 필드
      stats: { handsCount: stream.handCount || 0 },
      createdAt: stream.createdAt,
      updatedAt: stream.updatedAt,
    }
    setAnalyzeStream(streamWithIds)
    setAnalyzeDialogOpen(true)
  }, [])

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
                  onRetry={(streamId) => {
                    const stream = streams?.find(s => s.id === streamId)
                    if (stream) handleRetry(stream)
                  }}
                />
              ) : (
                // TreeView는 추후 구현, 일단 FlatView 표시
                <FlatView
                  streams={streams || []}
                  isLoading={isLoading}
                  onRetry={(streamId) => {
                    const stream = streams?.find(s => s.id === streamId)
                    if (stream) handleRetry(stream)
                  }}
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
                  onAnalyze={() => handleAnalyze(selectedStream)}
                  onRetry={() => handleRetry(selectedStream)}
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

      {/* AnalyzeVideoDialog */}
      <AnalyzeVideoDialog
        isOpen={analyzeDialogOpen}
        onOpenChange={setAnalyzeDialogOpen}
        stream={analyzeStream}
        onSuccess={() => {
          refetch()
          setAnalyzeDialogOpen(false)
          setAnalyzeStream(null)
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
