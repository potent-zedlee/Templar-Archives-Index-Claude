'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { firestore } from '@/lib/db/firebase'
import { doc, onSnapshot } from 'firebase/firestore'
import { COLLECTION_PATHS, type FirestoreAnalysisJob } from '@/lib/db/firestore-types'

interface JobStatusProps {
  jobId: string
  onComplete?: () => void
}

export function JobStatus({ jobId, onComplete }: JobStatusProps) {
  const [job, setJob] = useState<FirestoreAnalysisJob | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Firestore 실시간 구독
    const jobRef = doc(firestore, COLLECTION_PATHS.ANALYSIS_JOBS, jobId)

    const unsubscribe = onSnapshot(
      jobRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as FirestoreAnalysisJob

          setJob(data)

          // Call onComplete when job finishes
          if (data.status === 'completed' && onComplete) {
            onComplete()
          }
        }
      },
      (error) => {
        console.error('[JobStatus] Firestore subscription error:', error)
      }
    )

    // Cleanup
    return () => {
      unsubscribe()
    }
  }, [jobId, onComplete])

  if (!job) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>작업 정보를 불러오는 중...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {job.status === 'pending' && (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              분석 대기 중
            </>
          )}
          {job.status === 'processing' && (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              분석 진행 중
            </>
          )}
          {job.status === 'completed' && (
            <>
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              분석 완료
            </>
          )}
          {job.status === 'failed' && (
            <>
              <XCircle className="w-5 h-5 text-red-500" />
              분석 실패
            </>
          )}
        </CardTitle>
        <CardDescription>
          {job.status === 'processing' && `진행률: ${job.progress}%`}
          {job.status === 'completed' && '모든 핸드 분석이 완료되었습니다'}
          {job.status === 'failed' && '분석 중 오류가 발생했습니다'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(job.status === 'pending' || job.status === 'processing') && (
          <Progress value={job.progress} className="w-full" />
        )}

        {job.status === 'failed' && job.errorMessage && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
            <p className="text-sm font-medium">오류 메시지:</p>
            <p className="text-sm mt-1">{job.errorMessage}</p>
          </div>
        )}

        {job.status === 'completed' && (
          <div className="space-y-4">
            <div className="bg-green-500/10 text-green-700 dark:text-green-400 p-4 rounded-lg">
              <p className="text-sm">
                분석이 완료되었습니다. 추출된 핸드 히스토리를 확인하세요.
              </p>
            </div>
            <Button
              onClick={() => router.push('/hands')}
              className="w-full"
            >
              핸드 히스토리 보기
            </Button>
          </div>
        )}

        <div className="text-sm text-muted-foreground space-y-1">
          <p>작업 ID: {jobId}</p>
          {job.startedAt && (
            <p>
              시작 시간:{' '}
              {job.startedAt.toDate().toLocaleString('ko-KR')}
            </p>
          )}
          {job.completedAt && (
            <p>
              완료 시간:{' '}
              {job.completedAt.toDate().toLocaleString('ko-KR')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
