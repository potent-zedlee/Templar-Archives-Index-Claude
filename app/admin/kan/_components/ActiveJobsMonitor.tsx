'use client'

/**
 * Active Jobs Monitor
 * Real-time monitoring of active KAN analysis jobs
 */

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, CheckCircle2, XCircle, Clock, Sparkles } from 'lucide-react'
import { useRealtimeActiveJobs } from '@/lib/queries/kan-queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatTime } from '@/types/segments'

// Type for segment results from JSON
interface SegmentResult {
  segment_id: string
  segment_index: number
  status: 'pending' | 'processing' | 'success' | 'failed'
  hands_found?: number
  error?: string
  processing_time?: number
}

export function ActiveJobsMonitor() {
  const searchParams = useSearchParams()
  const highlightJobId = searchParams.get('job')

  const { data: jobs, isLoading, error } = useRealtimeActiveJobs()

  // Scroll to highlighted job
  useEffect(() => {
    if (highlightJobId) {
      const element = document.getElementById(`job-${highlightJobId}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [highlightJobId, jobs])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-500/50">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <XCircle className="h-12 w-12 text-red-500" />
          <div className="text-center">
            <p className="font-medium text-red-600 dark:text-red-400">
              작업 목록을 불러오는데 실패했습니다
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {error instanceof Error ? error.message : '알 수 없는 오류'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!jobs || jobs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <Activity className="h-12 w-12 text-muted-foreground" />
          <div className="text-center">
            <p className="font-medium text-muted-foreground">
              진행 중인 작업이 없습니다
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              새로운 분석을 시작하려면 &quot;새 분석 요청&quot; 페이지로 이동하세요
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              총 작업
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{jobs.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              대기 중
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
              {jobs.filter((j) => j.status === 'pending').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              처리 중
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {jobs.filter((j) => j.status === 'processing').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Jobs List */}
      <div className="space-y-4">
        {jobs.map((job) => {
          const isHighlighted = job.id === highlightJobId
          const currentTime = new Date().getTime()
          const processingTime = job.started_at
            ? Math.floor((currentTime - new Date(job.started_at).getTime()) / 1000)
            : 0

          return (
            <Card
              key={job.id}
              id={`job-${job.id}`}
              className={
                isHighlighted
                  ? 'border-purple-500 shadow-lg shadow-purple-500/20'
                  : ''
              }
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">
                        {job.video?.title || 'YouTube 영상'}
                      </CardTitle>
                      {job.status === 'pending' && (
                        <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-300">
                          <Clock className="h-3 w-3 mr-1" />
                          대기 중
                        </Badge>
                      )}
                      {job.status === 'processing' && (
                        <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 dark:text-blue-300">
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          처리 중
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {job.stream && (
                        <span className="flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          {job.stream.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {job.progress}%
                    </div>
                    {job.status === 'processing' && (
                      <div className="text-xs text-muted-foreground">
                        {formatTime(processingTime)}
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Progress Bar */}
                <Progress value={job.progress} className="h-2" />

                {/* Statistics */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">발견된 핸드</div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {job.hands_found || 0}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">세그먼트</div>
                    <div className="text-2xl font-bold">
                      {(() => {
                        const jobResult = job.result as unknown as { segment_results?: SegmentResult[] } | null
                        const segmentResults = jobResult?.segment_results || []
                        const jobSegments = job.segments as unknown[] | null
                        const total = jobSegments?.length || 0
                        const processed = segmentResults.filter(
                          (s: SegmentResult) => s.status === 'success' || s.status === 'failed'
                        ).length
                        return (
                          <>
                            {processed}
                            <span className="text-base text-muted-foreground">/{total}</span>
                          </>
                        )
                      })()}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">플랫폼</div>
                    <Badge variant="outline" className="mt-1">
                      {job.platform?.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                {/* Segment Results */}
                {(() => {
                  const jobResult = job.result as unknown as { segment_results?: SegmentResult[] } | null
                  const segmentResults = jobResult?.segment_results || []
                  if (segmentResults.length === 0) return null
                  return (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">세그먼트 처리 상태</div>
                    <ScrollArea className="max-h-[200px]">
                      <div className="space-y-2">
                        {segmentResults.map((segment: SegmentResult, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                          >
                            {segment.status === 'pending' && (
                              <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                            )}
                            {segment.status === 'processing' && (
                              <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                            )}
                            {segment.status === 'success' && (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            )}
                            {segment.status === 'failed' && (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}

                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  세그먼트 {idx + 1}
                                </span>
                                {segment.status === 'success' && (
                                  <Badge variant="default" className="text-xs bg-green-500">
                                    완료
                                  </Badge>
                                )}
                                {segment.status === 'failed' && (
                                  <Badge variant="destructive" className="text-xs">
                                    실패
                                  </Badge>
                                )}
                              </div>
                              {segment.hands_found !== undefined && segment.hands_found > 0 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {segment.hands_found}개 핸드 발견
                                </p>
                              )}
                              {segment.error && (
                                <p className="text-xs text-red-500 mt-1">
                                  {segment.error}
                                </p>
                              )}
                            </div>

                            {segment.processing_time && (
                              <span className="text-xs text-muted-foreground">
                                {formatTime(segment.processing_time)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                  )
                })()}

                {/* Job ID */}
                <div className="text-xs text-muted-foreground">
                  Job ID: <span className="font-mono">{job.id}</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function Activity({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  )
}
