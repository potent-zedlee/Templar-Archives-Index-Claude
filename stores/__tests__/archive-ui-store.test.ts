import { describe, it, expect, beforeEach } from 'vitest'
import { useArchiveUIStore } from '../archive-ui-store'
import type { Stream } from '@/lib/types/archive'

describe('Archive UI Store', () => {
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

  describe('Dialog Management', () => {
    it('should open tournament dialog', () => {
      const { openTournamentDialog } = useArchiveUIStore.getState()
      openTournamentDialog()

      const { tournamentDialog } = useArchiveUIStore.getState()
      expect(tournamentDialog.isOpen).toBe(true)
      expect(tournamentDialog.editingId).toBeNull()
    })

    it('should open tournament dialog with editing ID', () => {
      const { openTournamentDialog } = useArchiveUIStore.getState()
      openTournamentDialog('tournament-1')

      const { tournamentDialog } = useArchiveUIStore.getState()
      expect(tournamentDialog.isOpen).toBe(true)
      expect(tournamentDialog.editingId).toBe('tournament-1')
    })

    it('should close tournament dialog', () => {
      const { openTournamentDialog, closeTournamentDialog } = useArchiveUIStore.getState()
      openTournamentDialog('tournament-1')
      closeTournamentDialog()

      const { tournamentDialog } = useArchiveUIStore.getState()
      expect(tournamentDialog.isOpen).toBe(false)
      expect(tournamentDialog.editingId).toBeNull()
    })

    it('should open event dialog with tournament ID', () => {
      const { openEventDialog } = useArchiveUIStore.getState()
      openEventDialog('tournament-1')

      const { eventDialog, selectedTournamentIdForDialog } = useArchiveUIStore.getState()
      expect(eventDialog.isOpen).toBe(true)
      expect(selectedTournamentIdForDialog).toBe('tournament-1')
    })

    it('should close event dialog', () => {
      const { openEventDialog, closeEventDialog } = useArchiveUIStore.getState()
      openEventDialog('tournament-1')
      closeEventDialog()

      const { eventDialog, selectedTournamentIdForDialog } = useArchiveUIStore.getState()
      expect(eventDialog.isOpen).toBe(false)
      expect(selectedTournamentIdForDialog).toBe('')
    })

    it('should open stream dialog with event ID', () => {
      const { openStreamDialog } = useArchiveUIStore.getState()
      openStreamDialog('event-1')

      const { streamDialog, selectedEventIdForDialog } = useArchiveUIStore.getState()
      expect(streamDialog.isOpen).toBe(true)
      expect(selectedEventIdForDialog).toBe('event-1')
    })

    it('should open stream dialog with editing ID', () => {
      const { openStreamDialog } = useArchiveUIStore.getState()
      openStreamDialog('event-1', 'stream-edit-1')

      const { streamDialog, selectedEventIdForDialog } = useArchiveUIStore.getState()
      expect(streamDialog.isOpen).toBe(true)
      expect(streamDialog.editingId).toBe('stream-edit-1')
      expect(selectedEventIdForDialog).toBe('event-1')
    })

    it('should open video dialog with stream and start time', () => {
      const mockStream: Stream = {
        id: 'stream-1',
        eventId: 'event-1',
        name: 'Test Stream',
        videoSource: 'youtube',
        videoUrl: 'https://youtube.com/watch?v=test',
        publishedAt: '2024-01-01',
        createdAt: '2024-01-01',
        handCount: 0,
      }

      const { openVideoDialog } = useArchiveUIStore.getState()
      openVideoDialog(mockStream, '00:10:30')

      const { videoDialog } = useArchiveUIStore.getState()
      expect(videoDialog.isOpen).toBe(true)
      expect(videoDialog.stream).toBe(mockStream)
      expect(videoDialog.startTime).toBe('00:10:30')
    })

    it('should close video dialog and clear start time', () => {
      const mockStream: Stream = {
        id: 'stream-1',
        eventId: 'event-1',
        name: 'Test Stream',
        videoSource: 'youtube',
        videoUrl: 'https://youtube.com/watch?v=test',
        publishedAt: '2024-01-01',
        createdAt: '2024-01-01',
        handCount: 0,
      }

      const { openVideoDialog, closeVideoDialog } = useArchiveUIStore.getState()
      openVideoDialog(mockStream, '00:10:30')
      closeVideoDialog()

      const { videoDialog } = useArchiveUIStore.getState()
      expect(videoDialog.isOpen).toBe(false)
      expect(videoDialog.startTime).toBe('')
    })

    it('should open analyze dialog with stream', () => {
      const mockStream: Stream = {
        id: 'stream-1',
        eventId: 'event-1',
        name: 'Test Stream',
        videoSource: 'youtube',
        videoUrl: 'https://youtube.com/watch?v=test',
        publishedAt: '2024-01-01',
        createdAt: '2024-01-01',
        handCount: 0,
      }

      const { openAnalyzeDialog } = useArchiveUIStore.getState()
      openAnalyzeDialog(mockStream)

      const { analyzeDialog, analyzeStreamForDialog } = useArchiveUIStore.getState()
      expect(analyzeDialog.isOpen).toBe(true)
      expect(analyzeStreamForDialog).toBe(mockStream)
    })

    it('should close analyze dialog and clear stream', () => {
      const mockStream: Stream = {
        id: 'stream-1',
        eventId: 'event-1',
        name: 'Test Stream',
        videoSource: 'youtube',
        videoUrl: 'https://youtube.com/watch?v=test',
        publishedAt: '2024-01-01',
        createdAt: '2024-01-01',
        handCount: 0,
      }

      const { openAnalyzeDialog, closeAnalyzeDialog } = useArchiveUIStore.getState()
      openAnalyzeDialog(mockStream)
      closeAnalyzeDialog()

      const { analyzeDialog, analyzeStreamForDialog } = useArchiveUIStore.getState()
      expect(analyzeDialog.isOpen).toBe(false)
      expect(analyzeStreamForDialog).toBeNull()
    })

    it('should open and close rename dialog', () => {
      const { openRenameDialog, closeRenameDialog } = useArchiveUIStore.getState()
      openRenameDialog('item-1')

      let { renameDialog } = useArchiveUIStore.getState()
      expect(renameDialog.isOpen).toBe(true)
      expect(renameDialog.editingId).toBe('item-1')

      closeRenameDialog()
      renameDialog = useArchiveUIStore.getState().renameDialog
      expect(renameDialog.isOpen).toBe(false)
    })

    it('should open and close delete dialog', () => {
      const { openDeleteDialog, closeDeleteDialog } = useArchiveUIStore.getState()
      openDeleteDialog('item-1')

      let { deleteDialog } = useArchiveUIStore.getState()
      expect(deleteDialog.isOpen).toBe(true)
      expect(deleteDialog.editingId).toBe('item-1')

      closeDeleteDialog()
      deleteDialog = useArchiveUIStore.getState().deleteDialog
      expect(deleteDialog.isOpen).toBe(false)
    })

    it('should open event info dialog', () => {
      const { openEventInfoDialog } = useArchiveUIStore.getState()
      openEventInfoDialog('event-1')

      const { eventInfoDialog, viewingEventId } = useArchiveUIStore.getState()
      expect(eventInfoDialog.isOpen).toBe(true)
      expect(viewingEventId).toBe('event-1')
    })
  })

  describe('Upload State', () => {
    it('should set upload file', () => {
      const mockFile = new File(['content'], 'test.mp4', { type: 'video/mp4' })
      const { setUploadFile } = useArchiveUIStore.getState()
      setUploadFile(mockFile)

      const { uploadState } = useArchiveUIStore.getState()
      expect(uploadState.file).toBe(mockFile)
    })

    it('should set uploading state', () => {
      const { setUploading } = useArchiveUIStore.getState()
      setUploading(true)

      const { uploadState } = useArchiveUIStore.getState()
      expect(uploadState.uploading).toBe(true)
    })

    it('should set upload progress', () => {
      const { setUploadProgress } = useArchiveUIStore.getState()
      setUploadProgress(75)

      const { uploadState } = useArchiveUIStore.getState()
      expect(uploadState.progress).toBe(75)
    })

    it('should reset upload state', () => {
      const mockFile = new File(['content'], 'test.mp4', { type: 'video/mp4' })
      const { setUploadFile, setUploading, setUploadProgress, resetUploadState } =
        useArchiveUIStore.getState()

      setUploadFile(mockFile)
      setUploading(true)
      setUploadProgress(50)

      resetUploadState()

      const { uploadState } = useArchiveUIStore.getState()
      expect(uploadState.uploading).toBe(false)
      expect(uploadState.progress).toBe(0)
      expect(uploadState.file).toBeNull()
    })
  })

  describe('Selection Management', () => {
    it('should toggle video selection', () => {
      const { toggleVideoSelection } = useArchiveUIStore.getState()
      toggleVideoSelection('video-1')

      const { selectedVideoIds } = useArchiveUIStore.getState()
      expect(selectedVideoIds.has('video-1')).toBe(true)
    })

    it('should toggle video deselection', () => {
      const { toggleVideoSelection } = useArchiveUIStore.getState()
      toggleVideoSelection('video-1')
      toggleVideoSelection('video-1')

      const { selectedVideoIds } = useArchiveUIStore.getState()
      expect(selectedVideoIds.has('video-1')).toBe(false)
    })

    it('should select all videos', () => {
      const { selectAllVideos } = useArchiveUIStore.getState()
      selectAllVideos(['video-1', 'video-2', 'video-3'])

      const { selectedVideoIds } = useArchiveUIStore.getState()
      expect(selectedVideoIds.size).toBe(3)
      expect(selectedVideoIds.has('video-1')).toBe(true)
      expect(selectedVideoIds.has('video-2')).toBe(true)
      expect(selectedVideoIds.has('video-3')).toBe(true)
    })

    it('should clear selection', () => {
      const { selectAllVideos, clearSelection } = useArchiveUIStore.getState()
      selectAllVideos(['video-1', 'video-2'])
      clearSelection()

      const { selectedVideoIds } = useArchiveUIStore.getState()
      expect(selectedVideoIds.size).toBe(0)
    })
  })

  describe('Menu State', () => {
    it('should set open menu ID', () => {
      const { setOpenMenuId } = useArchiveUIStore.getState()
      setOpenMenuId('menu-1')

      const { openMenuId } = useArchiveUIStore.getState()
      expect(openMenuId).toBe('menu-1')
    })

    it('should change open menu ID', () => {
      const { setOpenMenuId } = useArchiveUIStore.getState()
      setOpenMenuId('menu-1')
      setOpenMenuId('menu-2')

      const { openMenuId } = useArchiveUIStore.getState()
      expect(openMenuId).toBe('menu-2')
    })
  })

  describe('Viewing Event State', () => {
    it('should set viewing event ID', () => {
      const { setViewingEventId } = useArchiveUIStore.getState()
      setViewingEventId('event-1')

      const { viewingEventId } = useArchiveUIStore.getState()
      expect(viewingEventId).toBe('event-1')
    })

    it('should set viewing event', () => {
      const mockEvent = { id: 'event-1', name: 'Test Event' }
      const { setViewingEvent } = useArchiveUIStore.getState()
      setViewingEvent(mockEvent)

      const { viewingEvent } = useArchiveUIStore.getState()
      expect(viewingEvent).toBe(mockEvent)
    })

    it('should set viewing payouts', () => {
      const mockPayouts = [{ place: 1, amount: 1000 }]
      const { setViewingPayouts } = useArchiveUIStore.getState()
      setViewingPayouts(mockPayouts)

      const { viewingPayouts } = useArchiveUIStore.getState()
      expect(viewingPayouts).toBe(mockPayouts)
    })

    it('should set loading viewing payouts', () => {
      const { setLoadingViewingPayouts } = useArchiveUIStore.getState()
      setLoadingViewingPayouts(true)

      const { loadingViewingPayouts } = useArchiveUIStore.getState()
      expect(loadingViewingPayouts).toBe(true)
    })

    it('should set is editing viewing payouts', () => {
      const { setIsEditingViewingPayouts } = useArchiveUIStore.getState()
      setIsEditingViewingPayouts(true)

      const { isEditingViewingPayouts } = useArchiveUIStore.getState()
      expect(isEditingViewingPayouts).toBe(true)
    })
  })
})
