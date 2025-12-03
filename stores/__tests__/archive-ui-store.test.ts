import { describe, it, expect, beforeEach } from 'vitest'
import { useArchiveUIStore } from '../archive-ui-store'

describe('ArchiveUIStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useArchiveUIStore.setState({
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
      uploadState: { uploading: false, progress: 0, file: null },
      selectedVideoIds: new Set<string>(),
      selectedTournamentIdForDialog: '',
      selectedEventIdForDialog: '',
      selectedEventIdForEdit: null,
      analyzeStreamForDialog: null,
      openMenuId: '',
      viewingEventId: '',
      viewingEvent: null,
      viewingPayouts: [],
      loadingViewingPayouts: false,
      isEditingViewingPayouts: false,
    })
  })

  describe('Dialog Actions', () => {
    it('should open and close tournament dialog', () => {
      const { openTournamentDialog, closeTournamentDialog } = useArchiveUIStore.getState()

      openTournamentDialog()
      expect(useArchiveUIStore.getState().tournamentDialog).toEqual({
        isOpen: true,
        editingId: null,
      })

      openTournamentDialog('tournament-123')
      expect(useArchiveUIStore.getState().tournamentDialog).toEqual({
        isOpen: true,
        editingId: 'tournament-123',
      })

      closeTournamentDialog()
      expect(useArchiveUIStore.getState().tournamentDialog).toEqual({
        isOpen: false,
        editingId: null,
      })
    })

    it('should open event dialog with tournamentId', () => {
      const { openEventDialog, closeEventDialog } = useArchiveUIStore.getState()

      openEventDialog('tournament-456')
      const state = useArchiveUIStore.getState()
      expect(state.eventDialog.isOpen).toBe(true)
      expect(state.selectedTournamentIdForDialog).toBe('tournament-456')

      closeEventDialog()
      const closedState = useArchiveUIStore.getState()
      expect(closedState.eventDialog.isOpen).toBe(false)
      expect(closedState.selectedTournamentIdForDialog).toBe('')
    })

    it('should open event info dialog with eventId', () => {
      const { openEventInfoDialog, closeEventInfoDialog } = useArchiveUIStore.getState()

      openEventInfoDialog('event-789')
      const state = useArchiveUIStore.getState()
      expect(state.eventInfoDialog.isOpen).toBe(true)
      expect(state.eventInfoDialog.editingId).toBe('event-789')
      expect(state.viewingEventId).toBe('event-789')

      closeEventInfoDialog()
      const closedState = useArchiveUIStore.getState()
      expect(closedState.eventInfoDialog.isOpen).toBe(false)
      expect(closedState.viewingEventId).toBe('')
    })

    it('should open stream dialog with eventId', () => {
      const { openStreamDialog, closeStreamDialog } = useArchiveUIStore.getState()

      openStreamDialog('event-123', 'stream-456')
      const state = useArchiveUIStore.getState()
      expect(state.streamDialog).toEqual({ isOpen: true, editingId: 'stream-456' })
      expect(state.selectedEventIdForDialog).toBe('event-123')

      closeStreamDialog()
      expect(useArchiveUIStore.getState().selectedEventIdForDialog).toBe('')
    })

    it('should open video dialog with stream and startTime', () => {
      const { openVideoDialog, closeVideoDialog } = useArchiveUIStore.getState()
      const mockStream = { id: 'stream-1', name: 'Test Stream' } as any

      openVideoDialog(mockStream, '01:23:45')
      const state = useArchiveUIStore.getState()
      expect(state.videoDialog.isOpen).toBe(true)
      expect(state.videoDialog.stream).toEqual(mockStream)
      expect(state.videoDialog.startTime).toBe('01:23:45')

      closeVideoDialog()
      const closedState = useArchiveUIStore.getState()
      expect(closedState.videoDialog.isOpen).toBe(false)
      expect(closedState.videoDialog.startTime).toBe('')
    })

    it('should open analyze dialog with stream', () => {
      const { openAnalyzeDialog, closeAnalyzeDialog } = useArchiveUIStore.getState()
      const mockStream = { id: 'stream-2', name: 'Analyze Stream' } as any

      openAnalyzeDialog(mockStream)
      const state = useArchiveUIStore.getState()
      expect(state.analyzeDialog.isOpen).toBe(true)
      expect(state.analyzeStreamForDialog).toEqual(mockStream)

      closeAnalyzeDialog()
      expect(useArchiveUIStore.getState().analyzeStreamForDialog).toBeNull()
    })
  })

  describe('Upload Actions', () => {
    it('should manage upload state', () => {
      const { setUploadFile, setUploading, setUploadProgress, resetUploadState } =
        useArchiveUIStore.getState()
      const mockFile = new File(['test'], 'test.mp4', { type: 'video/mp4' })

      setUploadFile(mockFile)
      expect(useArchiveUIStore.getState().uploadState.file).toEqual(mockFile)

      setUploading(true)
      expect(useArchiveUIStore.getState().uploadState.uploading).toBe(true)

      setUploadProgress(50)
      expect(useArchiveUIStore.getState().uploadState.progress).toBe(50)

      resetUploadState()
      const resetState = useArchiveUIStore.getState().uploadState
      expect(resetState).toEqual({ uploading: false, progress: 0, file: null })
    })
  })

  describe('Selection Actions', () => {
    it('should toggle video selection', () => {
      const { toggleVideoSelection } = useArchiveUIStore.getState()

      toggleVideoSelection('video-1')
      expect(useArchiveUIStore.getState().selectedVideoIds.has('video-1')).toBe(true)

      toggleVideoSelection('video-2')
      expect(useArchiveUIStore.getState().selectedVideoIds.size).toBe(2)

      toggleVideoSelection('video-1')
      expect(useArchiveUIStore.getState().selectedVideoIds.has('video-1')).toBe(false)
      expect(useArchiveUIStore.getState().selectedVideoIds.size).toBe(1)
    })

    it('should select all videos', () => {
      const { selectAllVideos } = useArchiveUIStore.getState()

      selectAllVideos(['video-1', 'video-2', 'video-3'])
      const state = useArchiveUIStore.getState()
      expect(state.selectedVideoIds.size).toBe(3)
      expect(state.selectedVideoIds.has('video-1')).toBe(true)
      expect(state.selectedVideoIds.has('video-2')).toBe(true)
      expect(state.selectedVideoIds.has('video-3')).toBe(true)
    })

    it('should clear selection', () => {
      const { selectAllVideos, clearSelection } = useArchiveUIStore.getState()

      selectAllVideos(['video-1', 'video-2'])
      expect(useArchiveUIStore.getState().selectedVideoIds.size).toBe(2)

      clearSelection()
      expect(useArchiveUIStore.getState().selectedVideoIds.size).toBe(0)
    })
  })

  describe('Menu State', () => {
    it('should set open menu id', () => {
      const { setOpenMenuId } = useArchiveUIStore.getState()

      setOpenMenuId('menu-1')
      expect(useArchiveUIStore.getState().openMenuId).toBe('menu-1')

      setOpenMenuId('')
      expect(useArchiveUIStore.getState().openMenuId).toBe('')
    })
  })

  describe('Viewing Event Actions', () => {
    it('should manage viewing event state', () => {
      const {
        setViewingEventId,
        setViewingEvent,
        setViewingPayouts,
        setLoadingViewingPayouts,
        setIsEditingViewingPayouts,
      } = useArchiveUIStore.getState()

      setViewingEventId('event-1')
      expect(useArchiveUIStore.getState().viewingEventId).toBe('event-1')

      const mockEvent = { id: 'event-1', name: 'Test Event' }
      setViewingEvent(mockEvent)
      expect(useArchiveUIStore.getState().viewingEvent).toEqual(mockEvent)

      const mockPayouts = [{ rank: 1, amount: 1000 }]
      setViewingPayouts(mockPayouts)
      expect(useArchiveUIStore.getState().viewingPayouts).toEqual(mockPayouts)

      setLoadingViewingPayouts(true)
      expect(useArchiveUIStore.getState().loadingViewingPayouts).toBe(true)

      setIsEditingViewingPayouts(true)
      expect(useArchiveUIStore.getState().isEditingViewingPayouts).toBe(true)
    })
  })

  describe('Rename and Delete Dialogs', () => {
    it('should open and close rename dialog', () => {
      const { openRenameDialog, closeRenameDialog } = useArchiveUIStore.getState()

      openRenameDialog('item-1')
      expect(useArchiveUIStore.getState().renameDialog).toEqual({
        isOpen: true,
        editingId: 'item-1',
      })

      closeRenameDialog()
      expect(useArchiveUIStore.getState().renameDialog).toEqual({
        isOpen: false,
        editingId: null,
      })
    })

    it('should open and close delete dialog', () => {
      const { openDeleteDialog, closeDeleteDialog } = useArchiveUIStore.getState()

      openDeleteDialog('item-2')
      expect(useArchiveUIStore.getState().deleteDialog).toEqual({
        isOpen: true,
        editingId: 'item-2',
      })

      closeDeleteDialog()
      expect(useArchiveUIStore.getState().deleteDialog).toEqual({
        isOpen: false,
        editingId: null,
      })
    })
  })

  describe('Edit Event Dialog', () => {
    it('should open edit event dialog with eventId', () => {
      const { openEditEventDialog, closeEditEventDialog } = useArchiveUIStore.getState()

      openEditEventDialog('event-edit-1')
      const state = useArchiveUIStore.getState()
      expect(state.editEventDialog).toEqual({ isOpen: true, editingId: 'event-edit-1' })
      expect(state.selectedEventIdForEdit).toBe('event-edit-1')

      closeEditEventDialog()
      const closedState = useArchiveUIStore.getState()
      expect(closedState.editEventDialog.isOpen).toBe(false)
      expect(closedState.selectedEventIdForEdit).toBeNull()
    })
  })

  describe('Move Dialogs', () => {
    it('should open and close move to event dialog', () => {
      const { openMoveToEventDialog, closeMoveToEventDialog } = useArchiveUIStore.getState()

      openMoveToEventDialog()
      expect(useArchiveUIStore.getState().moveToEventDialog.isOpen).toBe(true)

      closeMoveToEventDialog()
      expect(useArchiveUIStore.getState().moveToEventDialog.isOpen).toBe(false)
    })

    it('should open and close move to new event dialog', () => {
      const { openMoveToNewEventDialog, closeMoveToNewEventDialog } = useArchiveUIStore.getState()

      openMoveToNewEventDialog()
      expect(useArchiveUIStore.getState().moveToNewEventDialog.isOpen).toBe(true)

      closeMoveToNewEventDialog()
      expect(useArchiveUIStore.getState().moveToNewEventDialog.isOpen).toBe(false)
    })
  })

  describe('Info Dialog', () => {
    it('should open and close info dialog', () => {
      const { openInfoDialog, closeInfoDialog } = useArchiveUIStore.getState()

      openInfoDialog('info-item-1')
      expect(useArchiveUIStore.getState().infoDialog).toEqual({
        isOpen: true,
        editingId: 'info-item-1',
      })

      closeInfoDialog()
      expect(useArchiveUIStore.getState().infoDialog).toEqual({
        isOpen: false,
        editingId: null,
      })
    })
  })
})
