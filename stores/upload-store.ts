/**
 * Global Upload Store
 *
 * 백그라운드 업로드 작업을 관리하는 Zustand store
 * - 다이얼로그를 닫아도 업로드 계속 진행
 * - Toast UI에서 진행률 확인
 * - 일시정지/재개/취소 지원
 *
 * @module stores/upload-store
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { MAX_CONCURRENT_UPLOADS } from '@/lib/upload-constants'

// ==================== Types ====================

export type UploadTaskStatus =
  | 'pending'    // 대기 중
  | 'uploading'  // 업로드 중
  | 'paused'     // 일시정지
  | 'completed'  // 완료
  | 'error'      // 에러

export interface UploadTask {
  id: string
  streamId: string
  tournamentId: string
  eventId: string
  fileName: string
  fileSize: number
  file: File
  progress: number
  status: UploadTaskStatus
  error?: string
  gcsUri?: string
  gcsPath?: string
  uploadSpeed?: number    // bytes per second
  remainingTime?: number  // seconds
  createdAt: number       // timestamp
}

export interface UploadStoreState {
  // 업로드 작업 목록
  tasks: UploadTask[]

  // 현재 활성 업로드 수 (동시 업로드 제한용)
  activeUploads: number

  // 최대 동시 업로드 수
  maxConcurrentUploads: number
}

export interface UploadStoreActions {
  // Task 관리
  addTask: (task: Omit<UploadTask, 'progress' | 'status' | 'createdAt'>) => void
  updateTask: (id: string, updates: Partial<UploadTask>) => void
  removeTask: (id: string) => void

  // 상태 변경
  setTaskStatus: (id: string, status: UploadTaskStatus, error?: string) => void
  setTaskProgress: (id: string, progress: number, speed?: number, remaining?: number) => void
  setTaskCompleted: (id: string, gcsUri: string, gcsPath: string) => void

  // 일괄 작업
  clearCompletedTasks: () => void
  cancelAllTasks: () => void

  // 동시 업로드 관리
  incrementActiveUploads: () => void
  decrementActiveUploads: () => void

  // 헬퍼
  getTask: (id: string) => UploadTask | undefined
  getPendingTasks: () => UploadTask[]
  getActiveTasks: () => UploadTask[]
  hasActiveTasks: () => boolean
}

type UploadStore = UploadStoreState & UploadStoreActions

// ==================== Store ====================

export const useUploadStore = create<UploadStore>()(
  devtools(
    (set, get) => ({
      // Initial State
      tasks: [],
      activeUploads: 0,
      maxConcurrentUploads: MAX_CONCURRENT_UPLOADS,

      // Task 관리
      addTask: (taskData) => {
        const newTask: UploadTask = {
          ...taskData,
          progress: 0,
          status: 'pending',
          createdAt: Date.now(),
        }

        set((state) => ({
          tasks: [...state.tasks, newTask],
        }))
      },

      updateTask: (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? { ...task, ...updates } : task
          ),
        }))
      },

      removeTask: (id) => {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
        }))
      },

      // 상태 변경
      setTaskStatus: (id, status, error) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? { ...task, status, error } : task
          ),
        }))
      },

      setTaskProgress: (id, progress, speed, remaining) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? {
                  ...task,
                  progress,
                  uploadSpeed: speed ?? task.uploadSpeed,
                  remainingTime: remaining ?? task.remainingTime,
                }
              : task
          ),
        }))
      },

      setTaskCompleted: (id, gcsUri, gcsPath) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? {
                  ...task,
                  status: 'completed' as UploadTaskStatus,
                  progress: 100,
                  gcsUri,
                  gcsPath,
                }
              : task
          ),
        }))
      },

      // 일괄 작업
      clearCompletedTasks: () => {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.status !== 'completed'),
        }))
      },

      cancelAllTasks: () => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.status === 'uploading' || task.status === 'pending' || task.status === 'paused'
              ? { ...task, status: 'error' as UploadTaskStatus, error: 'Cancelled by user' }
              : task
          ),
          activeUploads: 0,
        }))
      },

      // 동시 업로드 관리
      incrementActiveUploads: () => {
        set((state) => ({
          activeUploads: state.activeUploads + 1,
        }))
      },

      decrementActiveUploads: () => {
        set((state) => ({
          activeUploads: Math.max(0, state.activeUploads - 1),
        }))
      },

      // 헬퍼
      getTask: (id) => {
        return get().tasks.find((task) => task.id === id)
      },

      getPendingTasks: () => {
        return get().tasks.filter((task) => task.status === 'pending')
      },

      getActiveTasks: () => {
        return get().tasks.filter(
          (task) => task.status === 'uploading' || task.status === 'pending' || task.status === 'paused'
        )
      },

      hasActiveTasks: () => {
        return get().tasks.some(
          (task) => task.status === 'uploading' || task.status === 'pending' || task.status === 'paused'
        )
      },
    }),
    { name: 'UploadStore' }
  )
)

// ==================== Selectors ====================

/**
 * 진행 중인 업로드 작업 선택자
 */
export const selectActiveTasks = (state: UploadStore) =>
  state.tasks.filter(
    (task) => task.status === 'uploading' || task.status === 'pending' || task.status === 'paused'
  )

/**
 * 완료된 업로드 작업 선택자
 */
export const selectCompletedTasks = (state: UploadStore) =>
  state.tasks.filter((task) => task.status === 'completed')

/**
 * 에러 발생 작업 선택자
 */
export const selectErrorTasks = (state: UploadStore) =>
  state.tasks.filter((task) => task.status === 'error')

/**
 * 전체 진행률 계산 (모든 활성 작업)
 */
export const selectOverallProgress = (state: UploadStore) => {
  const activeTasks = selectActiveTasks(state)
  if (activeTasks.length === 0) return 0

  const totalProgress = activeTasks.reduce((sum, task) => sum + task.progress, 0)
  return Math.round(totalProgress / activeTasks.length)
}
