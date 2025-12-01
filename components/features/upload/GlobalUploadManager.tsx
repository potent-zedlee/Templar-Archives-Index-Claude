/**
 * Global Upload Manager
 *
 * 전역 업로드 작업을 관리하는 컴포넌트
 * - Upload Store를 감시하여 대기 중인 작업 자동 시작
 * - Toast UI로 진행률 표시
 * - 일시정지/재개/취소 지원
 *
 * @module components/features/upload/GlobalUploadManager
 */

'use client'

import { useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { X, Pause, Play, Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  useUploadStore,
  type UploadTask,
} from '@/stores/upload-store'
import { updateStreamUploadStatus } from '@/app/actions/archive'

// ==================== Constants ====================

const CHUNK_SIZE = 8 * 1024 * 1024 // 8MB
const MAX_CONCURRENT_UPLOADS = 2

// ==================== Types ====================

interface UploadController {
  abort: () => void
  isPaused: boolean
}

// ==================== Helper Functions ====================

/**
 * 파일 크기 포맷팅
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

/**
 * 업로드 속도 포맷팅
 */
function formatSpeed(bytesPerSecond: number): string {
  return formatFileSize(bytesPerSecond) + '/s'
}

/**
 * 남은 시간 포맷팅
 */
function formatRemainingTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`
}

// ==================== Component ====================

export function GlobalUploadManager() {
  const {
    tasks,
    activeUploads,
    setTaskStatus,
    setTaskProgress,
    setTaskCompleted,
    removeTask,
    incrementActiveUploads,
    decrementActiveUploads,
    getPendingTasks,
  } = useUploadStore()

  // 업로드 컨트롤러 저장 (AbortController + paused 상태)
  const uploadControllersRef = useRef<Map<string, UploadController>>(new Map())

  // Toast ID 저장 (중복 방지)
  const toastIdsRef = useRef<Map<string, string | number>>(new Map())

  /**
   * 청크 업로드
   */
  const uploadChunk = useCallback(
    async (
      uploadUrl: string,
      file: File,
      start: number,
      end: number,
      totalSize: number,
      signal: AbortSignal
    ): Promise<boolean> => {
      const chunk = file.slice(start, end)

      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'video/mp4',
          'Content-Range': `bytes ${start}-${end - 1}/${totalSize}`,
        },
        body: chunk,
        signal,
      })

      // 308 Resume Incomplete는 정상
      if (!response.ok && response.status !== 308) {
        throw new Error(`청크 업로드 실패: ${response.status}`)
      }

      return true
    },
    []
  )

  /**
   * 단일 업로드 작업 실행
   */
  const executeUpload = useCallback(
    async (task: UploadTask) => {
      const abortController = new AbortController()
      const controller: UploadController = {
        abort: () => abortController.abort(),
        isPaused: false,
      }
      uploadControllersRef.current.set(task.id, controller)

      try {
        incrementActiveUploads()
        setTaskStatus(task.id, 'uploading')

        // 1. 업로드 초기화
        const initResponse = await fetch('/api/gcs/init-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            streamId: task.streamId,
            tournamentId: task.tournamentId,
            eventId: task.eventId,
            filename: task.fileName,
            fileSize: task.fileSize,
            contentType: task.file.type || 'video/mp4',
          }),
          signal: abortController.signal,
        })

        if (!initResponse.ok) {
          const errorData = await initResponse.json()
          throw new Error(errorData.error || '업로드 초기화 실패')
        }

        const { uploadUrl, uploadId, gcsUri } = await initResponse.json()

        // 2. 청크 업로드
        const totalSize = task.fileSize
        let uploadedBytes = 0
        let lastProgressTime = Date.now()
        let lastUploadedBytes = 0

        while (uploadedBytes < totalSize) {
          // 일시정지 체크
          if (controller.isPaused) {
            setTaskStatus(task.id, 'paused')
            return
          }

          const end = Math.min(uploadedBytes + CHUNK_SIZE, totalSize)

          await uploadChunk(
            uploadUrl,
            task.file,
            uploadedBytes,
            end,
            totalSize,
            abortController.signal
          )

          uploadedBytes = end

          // 진행률 및 속도 계산
          const now = Date.now()
          const progress = Math.round((uploadedBytes / totalSize) * 100)

          let speed = 0
          let remaining = 0

          if (now - lastProgressTime >= 500) {
            const bytesDiff = uploadedBytes - lastUploadedBytes
            const timeDiff = (now - lastProgressTime) / 1000
            speed = bytesDiff / timeDiff

            const remainingBytes = totalSize - uploadedBytes
            remaining = speed > 0 ? remainingBytes / speed : 0

            lastProgressTime = now
            lastUploadedBytes = uploadedBytes
          }

          setTaskProgress(task.id, progress, speed, remaining)

          // Toast 업데이트
          updateUploadToast(task.id, task.fileName, progress, speed, remaining)
        }

        // 3. 업로드 완료 API 호출
        const completeResponse = await fetch('/api/gcs/complete-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uploadId,
            tournamentId: task.tournamentId,
            eventId: task.eventId,
          }),
          signal: abortController.signal,
        })

        if (!completeResponse.ok) {
          const errorData = await completeResponse.json()
          throw new Error(errorData.error || '업로드 완료 처리 실패')
        }

        const completeData = await completeResponse.json()

        // 4. 성공 처리
        setTaskCompleted(task.id, gcsUri, completeData.gcsPath || '')

        // 성공 Toast
        showCompletedToast(task.id, task.fileName, task.tournamentId, task.eventId)
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          // 사용자가 취소한 경우
          setTaskStatus(task.id, 'error', 'Upload cancelled')
        } else {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'
          setTaskStatus(task.id, 'error', errorMessage)

          // Firestore 상태 롤백
          try {
            await updateStreamUploadStatus(
              task.streamId,
              task.tournamentId,
              task.eventId,
              'failed',
              undefined,
              undefined,
              undefined,
              errorMessage
            )
          } catch (rollbackError) {
            console.error('[GlobalUploadManager] Rollback failed:', rollbackError)
          }

          // 에러 Toast
          showErrorToast(task.id, task.fileName, errorMessage)
        }
      } finally {
        decrementActiveUploads()
        uploadControllersRef.current.delete(task.id)
      }
    },
    [
      incrementActiveUploads,
      decrementActiveUploads,
      setTaskStatus,
      setTaskProgress,
      setTaskCompleted,
      uploadChunk,
    ]
  )

  /**
   * 업로드 진행 Toast 업데이트
   */
  const updateUploadToast = useCallback(
    (taskId: string, fileName: string, progress: number, speed: number, remaining: number) => {
      const existingToastId = toastIdsRef.current.get(taskId)

      const toastContent = (
        <div className="w-full space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm truncate max-w-[180px]">
              {fileName}
            </span>
            <span className="text-xs text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{speed > 0 ? formatSpeed(speed) : 'Calculating...'}</span>
            <span>{remaining > 0 ? formatRemainingTime(remaining) : ''}</span>
          </div>
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => handlePause(taskId)}
            >
              <Pause className="h-3 w-3 mr-1" />
              Pause
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-7 text-xs"
              onClick={() => handleCancel(taskId)}
            >
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      )

      if (existingToastId) {
        toast.custom(
          () => (
            <div className="bg-background border rounded-lg shadow-lg p-4 w-[320px]">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm font-medium">Uploading</span>
              </div>
              {toastContent}
            </div>
          ),
          { id: existingToastId, duration: Infinity }
        )
      } else {
        const newToastId = toast.custom(
          () => (
            <div className="bg-background border rounded-lg shadow-lg p-4 w-[320px]">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm font-medium">Uploading</span>
              </div>
              {toastContent}
            </div>
          ),
          { duration: Infinity }
        )
        toastIdsRef.current.set(taskId, newToastId)
      }
    },
    []
  )

  /**
   * 업로드 완료 Toast
   */
  const showCompletedToast = useCallback(
    (taskId: string, fileName: string, _tournamentId: string, _eventId: string) => {
      const existingToastId = toastIdsRef.current.get(taskId)
      if (existingToastId) {
        toast.dismiss(existingToastId)
      }

      toast.custom(
        () => (
          <div className="bg-background border rounded-lg shadow-lg p-4 w-[320px]">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Upload Complete</span>
            </div>
            <p className="text-sm text-muted-foreground truncate mb-3">
              {fileName}
            </p>
            <Link href="/admin/archive/pipeline" passHref>
              <Button size="sm" variant="outline" className="w-full h-8 text-xs">
                <ExternalLink className="h-3 w-3 mr-1" />
                Go to Pipeline
              </Button>
            </Link>
          </div>
        ),
        { duration: 10000 }
      )

      toastIdsRef.current.delete(taskId)
    },
    []
  )

  /**
   * 에러 Toast
   */
  const showErrorToast = useCallback(
    (taskId: string, fileName: string, errorMessage: string) => {
      const existingToastId = toastIdsRef.current.get(taskId)
      if (existingToastId) {
        toast.dismiss(existingToastId)
      }

      toast.custom(
        () => (
          <div className="bg-background border border-destructive/50 rounded-lg shadow-lg p-4 w-[320px]">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium">Upload Failed</span>
            </div>
            <p className="text-sm text-muted-foreground truncate">{fileName}</p>
            <p className="text-xs text-destructive mt-1">{errorMessage}</p>
            <Button
              size="sm"
              variant="outline"
              className="w-full h-8 text-xs mt-3"
              onClick={() => removeTask(taskId)}
            >
              Dismiss
            </Button>
          </div>
        ),
        { duration: 15000 }
      )

      toastIdsRef.current.delete(taskId)
    },
    [removeTask]
  )

  /**
   * 일시정지 Toast
   */
  const showPausedToast = useCallback(
    (taskId: string, fileName: string, progress: number) => {
      const existingToastId = toastIdsRef.current.get(taskId)
      if (existingToastId) {
        toast.dismiss(existingToastId)
      }

      const newToastId = toast.custom(
        () => (
          <div className="bg-background border rounded-lg shadow-lg p-4 w-[320px]">
            <div className="flex items-center gap-2 mb-2">
              <Pause className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">Upload Paused</span>
            </div>
            <p className="text-sm text-muted-foreground truncate mb-2">
              {fileName}
            </p>
            <Progress value={progress} className="h-2 mb-3" />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-8 text-xs"
                onClick={() => handleResume(taskId)}
              >
                <Play className="h-3 w-3 mr-1" />
                Resume
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-8 text-xs"
                onClick={() => handleCancel(taskId)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ),
        { duration: Infinity }
      )
      toastIdsRef.current.set(taskId, newToastId)
    },
    []
  )

  /**
   * 일시정지 핸들러
   */
  const handlePause = useCallback(
    (taskId: string) => {
      const controller = uploadControllersRef.current.get(taskId)
      if (controller) {
        controller.isPaused = true
        controller.abort()
      }

      const task = tasks.find((t) => t.id === taskId)
      if (task) {
        showPausedToast(taskId, task.fileName, task.progress)
      }
    },
    [tasks, showPausedToast]
  )

  /**
   * 재개 핸들러
   */
  const handleResume = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId)
      if (task && task.status === 'paused') {
        setTaskStatus(taskId, 'pending')
      }
    },
    [tasks, setTaskStatus]
  )

  /**
   * 취소 핸들러
   */
  const handleCancel = useCallback(
    (taskId: string) => {
      const controller = uploadControllersRef.current.get(taskId)
      if (controller) {
        controller.abort()
      }

      const existingToastId = toastIdsRef.current.get(taskId)
      if (existingToastId) {
        toast.dismiss(existingToastId)
      }

      removeTask(taskId)
      toastIdsRef.current.delete(taskId)
    },
    [removeTask]
  )

  /**
   * 대기 중인 작업 자동 시작
   */
  useEffect(() => {
    const pendingTasks = getPendingTasks()

    if (pendingTasks.length > 0 && activeUploads < MAX_CONCURRENT_UPLOADS) {
      const availableSlots = MAX_CONCURRENT_UPLOADS - activeUploads
      const tasksToStart = pendingTasks.slice(0, availableSlots)

      tasksToStart.forEach((task) => {
        executeUpload(task)
      })
    }
  }, [tasks, activeUploads, getPendingTasks, executeUpload])

  // 컴포넌트 렌더링 없음 - Toast만 표시
  return null
}
