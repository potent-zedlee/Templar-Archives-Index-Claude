/**
 * Archive Data Store
 *
 * UI 상태 관리를 담당하는 Zustand store
 * - 선택 상태 (selectedStream)
 * - UI 상태 (expanded, selected)
 * - React Query가 데이터 캐싱 담당
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface ArchiveDataState {
  // UI State
  selectedStream: string | null

  // User info
  userEmail: string | null

  // Actions - State Management
  setSelectedStream: (streamId: string | null) => void
  setUserEmail: (email: string | null) => void
}

export const useArchiveDataStore = create<ArchiveDataState>()(
  devtools(
    (set) => ({
      // Initial State
      selectedStream: null,
      userEmail: null,

      // Setters
      setSelectedStream: (streamId) => set({ selectedStream: streamId }),
      setUserEmail: (email) => set({ userEmail: email }),
    }),
    { name: 'ArchiveDataStore' }
  )
)
