import { describe, it, expect, beforeEach } from 'vitest'
import { useArchiveFormStore } from '../archive-form-store'

describe('Archive Form Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useArchiveFormStore.setState({
      tournamentForm: {
        name: '',
        category: 'WSOP',
        gameType: 'tournament',
        location: '',
        city: '',
        country: '',
        startDate: '',
        endDate: '',
      },
      eventForm: {
        name: '',
        date: '',
        eventNumber: '',
        totalPrize: '',
        winner: '',
        buyIn: '',
        entryCount: '',
        blindStructure: '',
        levelDuration: '',
        startingStack: '',
        notes: '',
      },
      streamForm: {
        name: '',
        videoSource: 'youtube',
        videoUrl: '',
        uploadFile: null,
        publishedAt: '',
      },
      payouts: [{ rank: 1, playerName: '', prizeAmount: '' }],
      hendonMobUrl: '',
      hendonMobHtml: '',
      csvText: '',
      loadingPayouts: false,
      payoutSectionOpen: false,
      editingViewingPayouts: [],
      savingPayouts: false,
    })
  })

  describe('Tournament Form', () => {
    it('should set tournament form field', () => {
      const { setTournamentFormField } = useArchiveFormStore.getState()
      setTournamentFormField('name', 'WSOP 2024 Main Event')

      const { tournamentForm } = useArchiveFormStore.getState()
      expect(tournamentForm.name).toBe('WSOP 2024 Main Event')
    })

    it('should set multiple tournament form fields', () => {
      const { setTournamentFormField } = useArchiveFormStore.getState()
      setTournamentFormField('name', 'WSOP 2024')
      setTournamentFormField('location', 'Las Vegas')
      setTournamentFormField('startDate', '2024-07-01')

      const { tournamentForm } = useArchiveFormStore.getState()
      expect(tournamentForm.name).toBe('WSOP 2024')
      expect(tournamentForm.location).toBe('Las Vegas')
      expect(tournamentForm.startDate).toBe('2024-07-01')
    })

    it('should set entire tournament form', () => {
      const newForm = {
        name: 'EPT Barcelona',
        category: 'EPT',
        gameType: 'tournament',
        location: 'Barcelona',
        city: 'Barcelona',
        country: 'Spain',
        startDate: '2024-08-15',
        endDate: '2024-08-25',
      }

      const { setTournamentForm } = useArchiveFormStore.getState()
      setTournamentForm(newForm as any)

      const { tournamentForm } = useArchiveFormStore.getState()
      expect(tournamentForm).toMatchObject(newForm)
    })

    it('should reset tournament form', () => {
      const { setTournamentFormField, resetTournamentForm } = useArchiveFormStore.getState()
      setTournamentFormField('name', 'Test Tournament')
      setTournamentFormField('location', 'Test Location')

      resetTournamentForm()

      const { tournamentForm } = useArchiveFormStore.getState()
      expect(tournamentForm.name).toBe('')
      expect(tournamentForm.location).toBe('')
      expect(tournamentForm.category).toBe('WSOP')
    })
  })

  describe('Event Form', () => {
    it('should set event form field', () => {
      const { setEventFormField } = useArchiveFormStore.getState()
      setEventFormField('name', 'Event #15: Main Event')

      const { eventForm } = useArchiveFormStore.getState()
      expect(eventForm.name).toBe('Event #15: Main Event')
    })

    it('should set multiple event form fields', () => {
      const { setEventFormField } = useArchiveFormStore.getState()
      setEventFormField('name', 'Event #15')
      setEventFormField('buyIn', '10000')
      setEventFormField('totalPrize', '50000000')

      const { eventForm } = useArchiveFormStore.getState()
      expect(eventForm.name).toBe('Event #15')
      expect(eventForm.buyIn).toBe('10000')
      expect(eventForm.totalPrize).toBe('50000000')
    })

    it('should set entire event form', () => {
      const newForm = {
        name: 'Event #20',
        date: '2024-07-15',
        eventNumber: '20',
        totalPrize: '10000000',
        winner: 'John Doe',
        buyIn: '5000',
        entryCount: '2000',
        blindStructure: 'Standard',
        levelDuration: '60',
        startingStack: '50000',
        notes: 'Test notes',
      }

      const { setEventForm } = useArchiveFormStore.getState()
      setEventForm(newForm as any)

      const { eventForm } = useArchiveFormStore.getState()
      expect(eventForm).toMatchObject(newForm)
    })

    it('should reset sub-event form', () => {
      const { setEventFormField, resetEventForm } = useArchiveFormStore.getState()
      setEventFormField('name', 'Test Event')
      setEventFormField('buyIn', '1000')

      resetEventForm()

      const { eventForm } = useArchiveFormStore.getState()
      expect(eventForm.name).toBe('')
      expect(eventForm.buyIn).toBe('')
    })
  })

  describe('Stream Form', () => {
    it('should set stream form field', () => {
      const { setStreamFormField } = useArchiveFormStore.getState()
      setStreamFormField('name', 'Day 1A')

      const { streamForm } = useArchiveFormStore.getState()
      expect(streamForm.name).toBe('Day 1A')
    })

    it('should set video URL', () => {
      const { setStreamFormField } = useArchiveFormStore.getState()
      setStreamFormField('videoUrl', 'https://youtube.com/watch?v=test123')

      const { streamForm } = useArchiveFormStore.getState()
      expect(streamForm.videoUrl).toBe('https://youtube.com/watch?v=test123')
    })

    it('should set video source', () => {
      const { setStreamFormField } = useArchiveFormStore.getState()
      setStreamFormField('videoSource', 'upload')

      const { streamForm } = useArchiveFormStore.getState()
      expect(streamForm.videoSource).toBe('upload')
    })

    it('should set upload file', () => {
      const mockFile = new File(['content'], 'video.mp4', { type: 'video/mp4' })
      const { setStreamFormField } = useArchiveFormStore.getState()
      setStreamFormField('uploadFile', mockFile)

      const { streamForm } = useArchiveFormStore.getState()
      expect(streamForm.uploadFile).toBe(mockFile)
    })

    it('should reset stream form', () => {
      const { setStreamFormField, resetStreamForm } = useArchiveFormStore.getState()
      setStreamFormField('name', 'Test Stream')
      setStreamFormField('videoUrl', 'https://youtube.com/test')

      resetStreamForm()

      const { streamForm } = useArchiveFormStore.getState()
      expect(streamForm.name).toBe('')
      expect(streamForm.videoUrl).toBe('')
      expect(streamForm.videoSource).toBe('youtube')
    })
  })

  describe('Payout Management', () => {
    it('should set payouts', () => {
      const newPayouts = [
        { rank: 1, playerName: 'John Doe', prizeAmount: '1000000' },
        { rank: 2, playerName: 'Jane Smith', prizeAmount: '500000' },
      ]

      const { setPayouts } = useArchiveFormStore.getState()
      setPayouts(newPayouts)

      const { payouts } = useArchiveFormStore.getState()
      expect(payouts).toEqual(newPayouts)
    })

    it('should add payout', () => {
      const { addPayout } = useArchiveFormStore.getState()
      addPayout()

      const { payouts } = useArchiveFormStore.getState()
      expect(payouts).toHaveLength(2)
      expect(payouts[1].rank).toBe(2)
    })

    it('should add multiple payouts', () => {
      const { addPayout } = useArchiveFormStore.getState()
      addPayout()
      addPayout()
      addPayout()

      const { payouts } = useArchiveFormStore.getState()
      expect(payouts).toHaveLength(4)
      expect(payouts[3].rank).toBe(4)
    })

    it('should remove payout', () => {
      const { setPayouts, removePayout } = useArchiveFormStore.getState()
      setPayouts([
        { rank: 1, playerName: 'Player 1', prizeAmount: '1000' },
        { rank: 2, playerName: 'Player 2', prizeAmount: '500' },
        { rank: 3, playerName: 'Player 3', prizeAmount: '250' },
      ])

      removePayout(1) // Remove index 1 (Player 2)

      const { payouts } = useArchiveFormStore.getState()
      expect(payouts).toHaveLength(2)
      expect(payouts[0].playerName).toBe('Player 1')
      expect(payouts[1].playerName).toBe('Player 3')
    })

    it('should update payout field', () => {
      const { setPayouts, updatePayout } = useArchiveFormStore.getState()
      setPayouts([
        { rank: 1, playerName: 'Player 1', prizeAmount: '1000' },
        { rank: 2, playerName: 'Player 2', prizeAmount: '500' },
      ])

      updatePayout(0, 'playerName', 'John Doe')
      updatePayout(0, 'prizeAmount', '2000')

      const { payouts } = useArchiveFormStore.getState()
      expect(payouts[0].playerName).toBe('John Doe')
      expect(payouts[0].prizeAmount).toBe('2000')
    })

    it('should not affect other payouts when updating one', () => {
      const { setPayouts, updatePayout } = useArchiveFormStore.getState()
      setPayouts([
        { rank: 1, playerName: 'Player 1', prizeAmount: '1000' },
        { rank: 2, playerName: 'Player 2', prizeAmount: '500' },
      ])

      updatePayout(0, 'playerName', 'Updated Player')

      const { payouts } = useArchiveFormStore.getState()
      expect(payouts[1].playerName).toBe('Player 2')
      expect(payouts[1].prizeAmount).toBe('500')
    })

    it('should set hendon mob URL', () => {
      const { setHendonMobUrl } = useArchiveFormStore.getState()
      setHendonMobUrl('https://hendonmob.com/event/123')

      const { hendonMobUrl } = useArchiveFormStore.getState()
      expect(hendonMobUrl).toBe('https://hendonmob.com/event/123')
    })

    it('should set CSV text', () => {
      const { setCsvText } = useArchiveFormStore.getState()
      const csvData = 'Rank,Player,Prize\n1,John Doe,1000000\n2,Jane Smith,500000'
      setCsvText(csvData)

      const { csvText } = useArchiveFormStore.getState()
      expect(csvText).toBe(csvData)
    })

    it('should set loading payouts state', () => {
      const { setLoadingPayouts } = useArchiveFormStore.getState()
      setLoadingPayouts(true)

      const { loadingPayouts } = useArchiveFormStore.getState()
      expect(loadingPayouts).toBe(true)
    })

    it('should toggle payout section open', () => {
      const { setPayoutSectionOpen } = useArchiveFormStore.getState()
      setPayoutSectionOpen(true)

      const { payoutSectionOpen } = useArchiveFormStore.getState()
      expect(payoutSectionOpen).toBe(true)
    })

    it('should set editing viewing payouts', () => {
      const mockPayouts = [
        { rank: 1, playerName: 'Player 1', prizeAmount: '1000' },
        { rank: 2, playerName: 'Player 2', prizeAmount: '500' },
      ]

      const { setEditingViewingPayouts } = useArchiveFormStore.getState()
      setEditingViewingPayouts(mockPayouts)

      const { editingViewingPayouts } = useArchiveFormStore.getState()
      expect(editingViewingPayouts).toEqual(mockPayouts)
    })

    it('should set saving payouts state', () => {
      const { setSavingPayouts } = useArchiveFormStore.getState()
      setSavingPayouts(true)

      const { savingPayouts } = useArchiveFormStore.getState()
      expect(savingPayouts).toBe(true)
    })

    it('should reset payout form', () => {
      const { setHendonMobUrl, setCsvText, setPayoutSectionOpen, resetPayoutForm } =
        useArchiveFormStore.getState()

      setHendonMobUrl('https://test.com')
      setCsvText('test,data')
      setPayoutSectionOpen(true)

      resetPayoutForm()

      const { hendonMobUrl, csvText, payoutSectionOpen, payouts } =
        useArchiveFormStore.getState()

      expect(hendonMobUrl).toBe('')
      expect(csvText).toBe('')
      expect(payoutSectionOpen).toBe(false)
      expect(payouts).toHaveLength(1)
      expect(payouts[0]).toEqual({ rank: 1, playerName: '', prizeAmount: '' })
    })
  })
})
