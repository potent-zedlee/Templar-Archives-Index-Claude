/**
 * Archive UI Store
 *
 * UI 상태 관리를 담당하는 Zustand store
 * - Dialog 열기/닫기
 * - 네비게이션 상태
 * - 뷰 모드 (list/grid/timeline)
 * - 필터 및 정렬
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type {
  DialogState,
  VideoPlayerState,
  UploadState,
  Stream,
} from '@/lib/types/archive'

interface ArchiveUIState {
  // Dialogs
  tournamentDialog: DialogState
  eventDialog: DialogState
  eventInfoDialog: DialogState
  streamDialog: DialogState
  videoDialog: VideoPlayerState
  analyzeDialog: DialogState
  renameDialog: DialogState
  deleteDialog: DialogState
  editEventDialog: DialogState
  moveToEventDialog: DialogState
  moveToNewEventDialog: DialogState
  infoDialog: DialogState

  // Upload State
  uploadState: UploadState

  // Selection
  selectedVideoIds: Set<string>
  selectedTournamentIdForDialog: string
  selectedEventIdForDialog: string
  selectedEventIdForEdit: string | null
  analyzeStreamForDialog: Stream | null

  // Menu State
  openMenuId: string

  // Viewing Event (for info dialog)
  viewingEventId: string
  viewingEvent: any | null
  viewingPayouts: any[]
  loadingViewingPayouts: boolean
  isEditingViewingPayouts: boolean

  // Actions - Dialogs
  openTournamentDialog: (editingId?: string) => void
  closeTournamentDialog: () => void
  openEventDialog: (tournamentId: string, editingId?: string) => void
  closeEventDialog: () => void
  openEventInfoDialog: (eventId: string) => void
  closeEventInfoDialog: () => void
  openStreamDialog: (eventId: string, editingId?: string) => void
  closeStreamDialog: () => void
  openVideoDialog: (stream: Stream | null, startTime?: string) => void
  closeVideoDialog: () => void
  openAnalyzeDialog: (stream: Stream | null) => void
  closeAnalyzeDialog: () => void
  openRenameDialog: (itemId: string) => void
  closeRenameDialog: () => void
  openDeleteDialog: (itemId: string) => void
  closeDeleteDialog: () => void
  openEditEventDialog: (eventId: string) => void
  closeEditEventDialog: () => void
  openMoveToEventDialog: () => void
  closeMoveToEventDialog: () => void
  openMoveToNewEventDialog: () => void
  closeMoveToNewEventDialog: () => void
  openInfoDialog: (itemId: string) => void
  closeInfoDialog: () => void

  // Actions - Upload
  setUploadFile: (file: File | null) => void
  setUploading: (uploading: boolean) => void
  setUploadProgress: (progress: number) => void
  resetUploadState: () => void

  // Actions - Selection
  toggleVideoSelection: (videoId: string) => void
  selectAllVideos: (videoIds: string[]) => void
  clearSelection: () => void

  // Actions - Menu
  setOpenMenuId: (id: string) => void

  // Actions - Viewing Event
  setViewingEventId: (id: string) => void
  setViewingEvent: (event: any | null) => void
  setViewingPayouts: (payouts: any[]) => void
  setLoadingViewingPayouts: (loading: boolean) => void
  setIsEditingViewingPayouts: (editing: boolean) => void
}

export const useArchiveUIStore = create<ArchiveUIState>()(
  devtools(
    persist(
      (set, _get) => ({
        // Initial State - Dialogs
        tournamentDialog: { isOpen: false, editingId: null },
        eventDialog: { isOpen: false, editingId: null },
        eventInfoDialog: { isOpen: false, editingId: null },
        streamDialog: { isOpen: false, editingId: null },
        videoDialog: { isOpen: false, startTime: '', stream: null },
        analyzeDialog: { isOpen: false, editingId: null },
        renameDialog: { isOpen: false, editingId: null },
        deleteDialog: { isOpen: false, editingId: null },
        editEventDialog: { isOpen: false, editingId: null },
        moveToEventDialog: { isOpen: false, editingId: null },
        moveToNewEventDialog: { isOpen: false, editingId: null },
        infoDialog: { isOpen: false, editingId: null },

        // Initial State - Upload
        uploadState: {
          uploading: false,
          progress: 0,
          file: null,
        },

        // Initial State - Selection
        selectedVideoIds: new Set<string>(),
        selectedTournamentIdForDialog: '',
        selectedEventIdForDialog: '',
        selectedEventIdForEdit: null,
        analyzeStreamForDialog: null,

        // Initial State - Menu
        openMenuId: '',

        // Initial State - Viewing Event
        viewingEventId: '',
        viewingEvent: null,
        viewingPayouts: [],
        loadingViewingPayouts: false,
        isEditingViewingPayouts: false,

        // Actions - Dialogs
        openTournamentDialog: (editingId) =>
          set({ tournamentDialog: { isOpen: true, editingId: editingId || null } }),
        closeTournamentDialog: () =>
          set({ tournamentDialog: { isOpen: false, editingId: null } }),

        openEventDialog: (tournamentId, editingId) =>
          set({
            eventDialog: { isOpen: true, editingId: editingId || null },
            selectedTournamentIdForDialog: tournamentId,
          }),
        closeEventDialog: () =>
          set({
            eventDialog: { isOpen: false, editingId: null },
            selectedTournamentIdForDialog: '',
          }),

        openEventInfoDialog: (eventId) =>
          set({
            eventInfoDialog: { isOpen: true, editingId: eventId },
            viewingEventId: eventId,
          }),
        closeEventInfoDialog: () =>
          set({
            eventInfoDialog: { isOpen: false, editingId: null },
            viewingEventId: '',
            viewingEvent: null,
          }),

        openStreamDialog: (eventId, editingId) =>
          set({
            streamDialog: { isOpen: true, editingId: editingId || null },
            selectedEventIdForDialog: eventId,
          }),
        closeStreamDialog: () =>
          set({
            streamDialog: { isOpen: false, editingId: null },
            selectedEventIdForDialog: '',
          }),

        openVideoDialog: (stream, startTime = '') =>
          set((state) => ({
            videoDialog: { ...state.videoDialog, isOpen: true, stream, startTime },
          })),
        closeVideoDialog: () =>
          set((state) => ({
            videoDialog: { ...state.videoDialog, isOpen: false, startTime: '' },
          })),

        openAnalyzeDialog: (stream) =>
          set({
            analyzeDialog: { isOpen: true, editingId: null },
            analyzeStreamForDialog: stream,
          }),
        closeAnalyzeDialog: () =>
          set({
            analyzeDialog: { isOpen: false, editingId: null },
            analyzeStreamForDialog: null,
          }),

        openRenameDialog: (itemId) =>
          set({ renameDialog: { isOpen: true, editingId: itemId } }),
        closeRenameDialog: () =>
          set({ renameDialog: { isOpen: false, editingId: null } }),

        openDeleteDialog: (itemId) =>
          set({ deleteDialog: { isOpen: true, editingId: itemId } }),
        closeDeleteDialog: () =>
          set({ deleteDialog: { isOpen: false, editingId: null } }),

        openEditEventDialog: (eventId) =>
          set({
            editEventDialog: { isOpen: true, editingId: eventId },
            selectedEventIdForEdit: eventId,
          }),
        closeEditEventDialog: () =>
          set({
            editEventDialog: { isOpen: false, editingId: null },
            selectedEventIdForEdit: null,
          }),

        openMoveToEventDialog: () =>
          set({ moveToEventDialog: { isOpen: true, editingId: null } }),
        closeMoveToEventDialog: () =>
          set({ moveToEventDialog: { isOpen: false, editingId: null } }),

        openMoveToNewEventDialog: () =>
          set({ moveToNewEventDialog: { isOpen: true, editingId: null } }),
        closeMoveToNewEventDialog: () =>
          set({ moveToNewEventDialog: { isOpen: false, editingId: null } }),

        openInfoDialog: (itemId) =>
          set({ infoDialog: { isOpen: true, editingId: itemId } }),
        closeInfoDialog: () =>
          set({ infoDialog: { isOpen: false, editingId: null } }),

        // Actions - Upload
        setUploadFile: (file) =>
          set((state) => ({
            uploadState: { ...state.uploadState, file },
          })),
        setUploading: (uploading) =>
          set((state) => ({
            uploadState: { ...state.uploadState, uploading },
          })),
        setUploadProgress: (progress) =>
          set((state) => ({
            uploadState: { ...state.uploadState, progress },
          })),
        resetUploadState: () =>
          set({
            uploadState: { uploading: false, progress: 0, file: null },
          }),

        // Actions - Selection
        toggleVideoSelection: (videoId) =>
          set((state) => {
            const newSet = new Set(state.selectedVideoIds)
            if (newSet.has(videoId)) {
              newSet.delete(videoId)
            } else {
              newSet.add(videoId)
            }
            return { selectedVideoIds: newSet }
          }),

        selectAllVideos: (videoIds) =>
          set({ selectedVideoIds: new Set(videoIds) }),

        clearSelection: () => set({ selectedVideoIds: new Set() }),

        // Actions - Menu
        setOpenMenuId: (id) => set({ openMenuId: id }),

        // Actions - Viewing Event
        setViewingEventId: (id) => set({ viewingEventId: id }),
        setViewingEvent: (event) => set({ viewingEvent: event }),
        setViewingPayouts: (payouts) => set({ viewingPayouts: payouts }),
        setLoadingViewingPayouts: (loading) => set({ loadingViewingPayouts: loading }),
        setIsEditingViewingPayouts: (editing) => set({ isEditingViewingPayouts: editing }),
      }),
      {
        name: 'ArchiveUIStore',
        partialize: (_state) => ({}),
      }
    ),
    { name: 'ArchiveUIStore' }
  )
)
