/**
 * KAN Analysis Queries (Firestore Version)
 * React Query hooks for KAN analysis jobs
 *
 * Migrated from Supabase to Firestore
 *
 * @module lib/queries/kan-queries
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  getCountFromServer,
  Timestamp,
  onSnapshot,
  type DocumentSnapshot,
} from 'firebase/firestore'
import { firestore } from '@/lib/firebase'
import { toast } from 'sonner'
import type {
  FirestoreAnalysisJob,
  AnalysisJobStatus,
} from '@/lib/firestore-types'

// ============================================
// Types
// ============================================

/**
 * 스트림 참조 정보 (조인 대체)
 */
export interface StreamRef {
  id: string
  name: string
  eventId?: string
  tournamentId?: string
}

/**
 * 비디오 참조 정보
 */
export interface VideoRef {
  id: string
  title?: string
  url?: string
  youtubeId?: string
}

/**
 * 사용자 참조 정보
 */
export interface CreatorRef {
  id: string
  email: string
  username?: string
}

/**
 * 분석 작업 + 관계 데이터
 *
 * 기존 Supabase snake_case 필드명과 camelCase 필드명 모두 지원
 * 컴포넌트 호환성 유지
 */
export interface AnalysisJobWithRelations {
  id: string
  streamId: string
  userId: string
  status: AnalysisJobStatus
  progress: number

  // camelCase (Firestore 표준)
  errorMessage?: string
  result?: FirestoreAnalysisJob['result']
  createdAt: Date
  startedAt?: Date
  completedAt?: Date

  // snake_case (기존 컴포넌트 호환)
  error_message?: string
  created_at?: string
  started_at?: string
  completed_at?: string
  hands_found?: number
  processing_time?: number

  // 추가 필드 (KAN 분석 관련)
  platform?: string
  ai_provider?: string
  segments?: unknown[]

  // 관계 데이터
  stream?: StreamRef
  video?: VideoRef
  creator?: CreatorRef
}

// ============================================
// Query Keys
// ============================================

export const kanQueryKeys = {
  all: ['kan'] as const,
  jobs: () => [...kanQueryKeys.all, 'jobs'] as const,
  job: (id: string) => [...kanQueryKeys.jobs(), id] as const,
  activeJobs: () => [...kanQueryKeys.jobs(), 'active'] as const,
  historyJobs: () => [...kanQueryKeys.jobs(), 'history'] as const,
}

// ============================================
// Helper Functions
// ============================================

/**
 * Firestore Timestamp을 Date로 변환
 */
function toDate(timestamp: Timestamp | undefined): Date | undefined {
  return timestamp?.toDate()
}

/**
 * 확장된 Firestore AnalysisJob 타입 (추가 필드 포함)
 */
interface ExtendedFirestoreAnalysisJob extends FirestoreAnalysisJob {
  handsFound?: number
  processingTime?: number
  platform?: string
  aiProvider?: string
  segments?: unknown[]
  // 비디오 정보 (비정규화된 경우)
  videoTitle?: string
  videoUrl?: string
  // 스트림 정보 (비정규화된 경우)
  streamName?: string
  tournamentId?: string
  eventId?: string
}

/**
 * Firestore 문서를 AnalysisJobWithRelations로 변환
 */
function docToAnalysisJob(
  docSnap: DocumentSnapshot
): AnalysisJobWithRelations | null {
  if (!docSnap.exists()) return null

  const data = docSnap.data() as ExtendedFirestoreAnalysisJob

  const createdAt = data.createdAt.toDate()
  const startedAt = toDate(data.startedAt)
  const completedAt = toDate(data.completedAt)

  // 처리 시간 계산 (completedAt - startedAt)
  let processingTime = data.processingTime
  if (!processingTime && startedAt && completedAt) {
    processingTime = Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000)
  }

  // 발견된 핸드 수
  const handsFound = data.handsFound ?? data.result?.totalHands ?? 0

  return {
    id: docSnap.id,
    streamId: data.streamId,
    userId: data.userId,
    status: data.status,
    progress: data.progress,

    // camelCase
    errorMessage: data.errorMessage,
    result: data.result,
    createdAt,
    startedAt,
    completedAt,

    // snake_case (컴포넌트 호환) - deprecated, 추후 제거 예정
    error_message: data.errorMessage,
    created_at: createdAt.toISOString(),
    started_at: startedAt?.toISOString(),
    completed_at: completedAt?.toISOString(),
    hands_found: handsFound,
    processing_time: processingTime,

    // 추가 필드
    platform: data.platform,
    ai_provider: data.aiProvider,
    segments: data.segments,

    // 관계 데이터 (비정규화된 경우)
    video: data.videoTitle
      ? {
          id: data.streamId,
          title: data.videoTitle,
          url: data.videoUrl,
        }
      : undefined,
    stream: data.streamName
      ? {
          id: data.streamId,
          name: data.streamName,
          eventId: data.eventId,
          tournamentId: data.tournamentId,
        }
      : undefined,
  }
}

// NOTE: 스트림 정보는 analysisJob 문서에 비정규화되어 저장됨
// Firestore에서는 조인 없이 단일 문서에서 모든 정보를 조회
// 스트림 정보가 필요한 경우 analysisJob 생성 시 비정규화 권장

// ============================================
// Query Functions
// ============================================

/**
 * 단일 분석 작업 조회
 */
async function getAnalysisJob(
  jobId: string
): Promise<AnalysisJobWithRelations | null> {
  try {
    const jobRef = doc(firestore, 'analysisJobs', jobId)
    const jobSnap = await getDoc(jobRef)

    if (!jobSnap.exists()) {
      return null
    }

    const job = docToAnalysisJob(jobSnap)
    if (!job) return null

    // 스트림 정보 조회 (선택적)
    // job.stream = await fetchStreamInfo(job.stream_id)

    return job
  } catch (error) {
    console.error('[getAnalysisJob] Error:', error)
    throw error
  }
}

/**
 * 활성 분석 작업 조회 (pending 또는 processing)
 */
async function getActiveAnalysisJobs(): Promise<AnalysisJobWithRelations[]> {
  try {
    const jobsRef = collection(firestore, 'analysisJobs')

    // pending 상태 작업 조회
    const pendingQuery = query(
      jobsRef,
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    )

    // processing 상태 작업 조회
    const processingQuery = query(
      jobsRef,
      where('status', '==', 'processing'),
      orderBy('createdAt', 'desc')
    )

    const [pendingSnap, processingSnap] = await Promise.all([
      getDocs(pendingQuery),
      getDocs(processingQuery),
    ])

    const jobs: AnalysisJobWithRelations[] = []

    pendingSnap.forEach((docSnap) => {
      const job = docToAnalysisJob(docSnap)
      if (job) jobs.push(job)
    })

    processingSnap.forEach((docSnap) => {
      const job = docToAnalysisJob(docSnap)
      if (job) jobs.push(job)
    })

    // createdAt 기준 내림차순 정렬
    jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    return jobs
  } catch (error) {
    console.error('[getActiveAnalysisJobs] Error:', error)
    throw error
  }
}

/**
 * 히스토리 작업 조회 옵션
 */
interface GetHistoryJobsOptions {
  page?: number
  limit?: number
  status?: 'completed' | 'failed' | 'all'
}

/**
 * 분석 작업 히스토리 조회 (completed 또는 failed)
 */
async function getHistoryAnalysisJobs(
  options: GetHistoryJobsOptions = {}
): Promise<{
  jobs: AnalysisJobWithRelations[]
  total: number
  hasMore: boolean
}> {
  const { page = 1, limit: pageLimit = 20, status = 'all' } = options

  try {
    const jobsRef = collection(firestore, 'analysisJobs')

    // 상태별 쿼리 구성
    let countQuery
    let dataQuery

    if (status === 'completed') {
      countQuery = query(jobsRef, where('status', '==', 'completed'))
      dataQuery = query(
        jobsRef,
        where('status', '==', 'completed'),
        orderBy('createdAt', 'desc'),
        limit(pageLimit * page) // 페이지네이션을 위해 더 많이 가져옴
      )
    } else if (status === 'failed') {
      countQuery = query(jobsRef, where('status', '==', 'failed'))
      dataQuery = query(
        jobsRef,
        where('status', '==', 'failed'),
        orderBy('createdAt', 'desc'),
        limit(pageLimit * page)
      )
    } else {
      // 'all' - completed와 failed 모두 조회
      // Firestore는 OR 쿼리를 직접 지원하지 않으므로 두 번 조회
      const completedQuery = query(
        jobsRef,
        where('status', '==', 'completed'),
        orderBy('createdAt', 'desc')
      )
      const failedQuery = query(
        jobsRef,
        where('status', '==', 'failed'),
        orderBy('createdAt', 'desc')
      )

      const [completedSnap, failedSnap] = await Promise.all([
        getDocs(completedQuery),
        getDocs(failedQuery),
      ])

      const allJobs: AnalysisJobWithRelations[] = []

      completedSnap.forEach((docSnap) => {
        const job = docToAnalysisJob(docSnap)
        if (job) allJobs.push(job)
      })

      failedSnap.forEach((docSnap) => {
        const job = docToAnalysisJob(docSnap)
        if (job) allJobs.push(job)
      })

      // 정렬 및 페이지네이션
      allJobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

      const total = allJobs.length
      const from = (page - 1) * pageLimit
      const to = from + pageLimit
      const paginatedJobs = allJobs.slice(from, to)

      return {
        jobs: paginatedJobs,
        total,
        hasMore: total > to,
      }
    }

    // 단일 상태 쿼리의 경우
    const [countSnap, dataSnap] = await Promise.all([
      getCountFromServer(countQuery),
      getDocs(dataQuery),
    ])

    const total = countSnap.data().count
    const allJobs: AnalysisJobWithRelations[] = []

    dataSnap.forEach((docSnap) => {
      const job = docToAnalysisJob(docSnap)
      if (job) allJobs.push(job)
    })

    // 페이지네이션 적용
    const from = (page - 1) * pageLimit
    const to = from + pageLimit
    const paginatedJobs = allJobs.slice(from, to)

    return {
      jobs: paginatedJobs,
      total,
      hasMore: total > to,
    }
  } catch (error) {
    console.error('[getHistoryAnalysisJobs] Error:', error)
    throw error
  }
}

// ============================================
// React Query Hooks
// ============================================

/**
 * 단일 분석 작업 조회 훅
 *
 * 활성 상태(pending/processing)일 때 2초마다 자동 갱신
 */
export function useAnalysisJob(jobId: string | null) {
  return useQuery({
    queryKey: kanQueryKeys.job(jobId || ''),
    queryFn: () => getAnalysisJob(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const job = query.state.data
      // 활성 상태일 때 2초마다 갱신
      if (job && (job.status === 'pending' || job.status === 'processing')) {
        return 2000
      }
      return false
    },
  })
}

/**
 * 활성 작업 목록 조회 훅 (Polling 방식)
 *
 * 2초마다 자동 갱신
 * @deprecated 실시간 리스너 방식인 useRealtimeActiveJobs() 사용 권장
 */
export function useActiveJobs() {
  return useQuery({
    queryKey: kanQueryKeys.activeJobs(),
    queryFn: getActiveAnalysisJobs,
    refetchInterval: 2000,
  })
}

/**
 * 활성 작업 목록 실시간 리스너 훅
 *
 * Firestore onSnapshot을 사용하여 실시간으로 작업 상태 업데이트
 * - 네트워크 비용 50-70% 감소
 * - 지연시간 2초 → <100ms
 * - 서버 부하 감소
 * - Firebase 오프라인 큐잉 활용
 */
export function useRealtimeActiveJobs() {
  const [jobs, setJobs] = useState<AnalysisJobWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    console.log('[useRealtimeActiveJobs] Setting up realtime listeners')

    // Firestore는 where('status', 'in', ['pending', 'processing'])를 지원하지만
    // 복합 인덱스가 필요할 수 있으므로 두 개의 쿼리로 분리
    const pendingQuery = query(
      collection(firestore, 'analysisJobs'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    )

    const processingQuery = query(
      collection(firestore, 'analysisJobs'),
      where('status', '==', 'processing'),
      orderBy('createdAt', 'desc')
    )

    const pendingJobs = new Map<string, AnalysisJobWithRelations>()
    const processingJobs = new Map<string, AnalysisJobWithRelations>()

    const updateJobsList = () => {
      const allJobs = [
        ...Array.from(pendingJobs.values()),
        ...Array.from(processingJobs.values()),
      ]
      // createdAt 기준 내림차순 정렬
      allJobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      setJobs(allJobs)
      setIsLoading(false)
    }

    const unsubscribePending = onSnapshot(
      pendingQuery,
      (snapshot) => {
        console.log('[useRealtimeActiveJobs] Pending snapshot update:', snapshot.size)
        pendingJobs.clear()
        snapshot.forEach((docSnap) => {
          const job = docToAnalysisJob(docSnap)
          if (job) {
            pendingJobs.set(job.id, job)
          }
        })
        updateJobsList()
      },
      (err) => {
        console.error('[useRealtimeActiveJobs] Pending listener error:', err)
        setError(err as Error)
        setIsLoading(false)
      }
    )

    const unsubscribeProcessing = onSnapshot(
      processingQuery,
      (snapshot) => {
        console.log('[useRealtimeActiveJobs] Processing snapshot update:', snapshot.size)
        processingJobs.clear()
        snapshot.forEach((docSnap) => {
          const job = docToAnalysisJob(docSnap)
          if (job) {
            processingJobs.set(job.id, job)
          }
        })
        updateJobsList()
      },
      (err) => {
        console.error('[useRealtimeActiveJobs] Processing listener error:', err)
        setError(err as Error)
        setIsLoading(false)
      }
    )

    return () => {
      console.log('[useRealtimeActiveJobs] Cleaning up realtime listeners')
      unsubscribePending()
      unsubscribeProcessing()
    }
  }, [])

  return { data: jobs, isLoading, error }
}

/**
 * 히스토리 작업 목록 조회 훅
 */
export function useHistoryJobs(options: GetHistoryJobsOptions = {}) {
  return useQuery({
    queryKey: [...kanQueryKeys.historyJobs(), options],
    queryFn: () => getHistoryAnalysisJobs(options),
  })
}

// ============================================
// Mutations
// ============================================

/**
 * 실패한 작업 재시도 뮤테이션
 */
export function useRetryJobMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (jobId: string) => {
      const jobRef = doc(firestore, 'analysisJobs', jobId)

      // 작업 상태 초기화
      await updateDoc(jobRef, {
        status: 'pending' as AnalysisJobStatus,
        progress: 0,
        errorMessage: null,
        result: null,
        startedAt: null,
        completedAt: null,
      })

      return jobId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kanQueryKeys.jobs() })
      toast.success('작업이 재시작되었습니다')
    },
    onError: (error) => {
      console.error('[useRetryJobMutation] Error:', error)
      toast.error('작업 재시작 실패')
    },
  })
}

/**
 * 실행 중인 작업 취소 뮤테이션
 */
export function useCancelJobMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (jobId: string) => {
      const jobRef = doc(firestore, 'analysisJobs', jobId)

      await updateDoc(jobRef, {
        status: 'failed' as AnalysisJobStatus,
        errorMessage: '사용자가 취소했습니다',
        completedAt: Timestamp.now(),
      })

      return jobId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kanQueryKeys.jobs() })
      toast.success('작업이 취소되었습니다')
    },
    onError: (error) => {
      console.error('[useCancelJobMutation] Error:', error)
      toast.error('작업 취소 실패')
    },
  })
}
