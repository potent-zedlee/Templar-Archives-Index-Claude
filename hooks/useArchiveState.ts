import { useState } from 'react'

// Types
type TournamentCategory = "WSOP" | "Triton" | "EPT" | "Hustler" | "APT" | "APL" | "GGPOKER"
type VideoSourceTab = 'youtube' | 'upload'

export type PayoutRow = {
  rank: number
  playerName: string
  prizeAmount: string
}

export interface ArchiveState {
  // Data states
  tournaments: any[]
  setTournaments: (tournaments: any[]) => void
  hands: any[]
  setHands: (hands: any[]) => void
  selectedStream: string
  setSelectedStream: (stream: string) => void
  loading: boolean
  setLoading: (loading: boolean) => void
  userEmail: string | null
  setUserEmail: (email: string | null) => void
  selectedCategory: string
  setSelectedCategory: (category: string) => void

  // Tournament dialog states
  isDialogOpen: boolean
  setIsDialogOpen: (open: boolean) => void
  editingTournamentId: string
  setEditingTournamentId: (id: string) => void
  newTournamentName: string
  setNewTournamentName: (name: string) => void
  newCategory: TournamentCategory
  setNewCategory: (category: TournamentCategory) => void
  newLocation: string
  setNewLocation: (location: string) => void
  newStartDate: string
  setNewStartDate: (date: string) => void
  newEndDate: string
  setNewEndDate: (date: string) => void

  // Event dialog states
  isEventDialogOpen: boolean
  setIsEventDialogOpen: (open: boolean) => void
  selectedTournamentId: string
  setSelectedTournamentId: (id: string) => void
  editingEventId: string
  setEditingEventId: (id: string) => void
  newEventName: string
  setNewEventName: (name: string) => void
  newEventDate: string
  setNewEventDate: (date: string) => void
  newEventPrize: string
  setNewEventPrize: (prize: string) => void
  newEventWinner: string
  setNewEventWinner: (winner: string) => void
  newEventBuyIn: string
  setNewEventBuyIn: (buyIn: string) => void
  newEventEntryCount: string
  setNewEventEntryCount: (count: string) => void
  newEventBlindStructure: string
  setNewEventBlindStructure: (structure: string) => void
  newEventLevelDuration: string
  setNewEventLevelDuration: (duration: string) => void
  newEventStartingStack: string
  setNewEventStartingStack: (stack: string) => void
  newEventNotes: string
  setNewEventNotes: (notes: string) => void

  // Event Info dialog states
  isEventInfoDialogOpen: boolean
  setIsEventInfoDialogOpen: (open: boolean) => void
  viewingEventId: string
  setViewingEventId: (id: string) => void
  viewingEvent: any | null
  setViewingEvent: (event: any | null) => void
  viewingPayouts: any[]
  setViewingPayouts: (payouts: any[]) => void
  loadingViewingPayouts: boolean
  setLoadingViewingPayouts: (loading: boolean) => void
  isEditingViewingPayouts: boolean
  setIsEditingViewingPayouts: (editing: boolean) => void
  editingViewingPayouts: PayoutRow[]
  setEditingViewingPayouts: (payouts: PayoutRow[]) => void
  savingPayouts: boolean
  setSavingPayouts: (saving: boolean) => void

  // Payout dialog states
  payouts: PayoutRow[]
  setPayouts: (payouts: PayoutRow[]) => void
  payoutSectionOpen: boolean
  setPayoutSectionOpen: (open: boolean) => void
  hendonMobUrl: string
  setHendonMobUrl: (url: string) => void
  hendonMobHtml: string
  setHendonMobHtml: (html: string) => void
  csvText: string
  setCsvText: (text: string) => void
  loadingPayouts: boolean
  setLoadingPayouts: (loading: boolean) => void

  // Stream dialog states (formerly Day)
  isStreamDialogOpen: boolean
  setIsStreamDialogOpen: (open: boolean) => void
  selectedEventId: string
  setSelectedEventId: (id: string) => void
  editingStreamId: string
  setEditingStreamId: (id: string) => void
  newStreamName: string
  setNewStreamName: (name: string) => void
  videoSourceTab: VideoSourceTab
  setVideoSourceTab: (tab: VideoSourceTab) => void
  newStreamVideoUrl: string
  setNewStreamVideoUrl: (url: string) => void
  uploadFile: File | null
  setUploadFile: (file: File | null) => void
  uploading: boolean
  setUploading: (uploading: boolean) => void
  uploadProgress: number
  setUploadProgress: (progress: number) => void

  // Video player dialog states
  isVideoDialogOpen: boolean
  setIsVideoDialogOpen: (open: boolean) => void
  videoStartTime: string
  setVideoStartTime: (time: string) => void

  // UI states
  openMenuId: string
  setOpenMenuId: (id: string) => void

  // Folder navigation states
  navigationLevel: 'root' | 'tournament' | 'event' | 'unorganized'
  setNavigationLevel: (level: 'root' | 'tournament' | 'event' | 'unorganized') => void
  currentTournamentId: string
  setCurrentTournamentId: (id: string) => void
  currentEventId: string
  setCurrentEventId: (id: string) => void

  // Unsorted videos state
  unsortedVideos: any[]
  setUnsortedVideos: (videos: any[]) => void
}

export function useArchiveState(): ArchiveState {
  // Data states
  const [tournaments, setTournaments] = useState<any[]>([])
  const [hands, setHands] = useState<any[]>([])
  const [selectedStream, setSelectedStream] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>("All")

  // Tournament dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTournamentId, setEditingTournamentId] = useState<string>("")
  const [newTournamentName, setNewTournamentName] = useState("")
  const [newCategory, setNewCategory] = useState<TournamentCategory>("WSOP")
  const [newLocation, setNewLocation] = useState("")
  const [newStartDate, setNewStartDate] = useState("")
  const [newEndDate, setNewEndDate] = useState("")

  // Event dialog states
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false)
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("")
  const [editingEventId, setEditingEventId] = useState<string>("")
  const [newEventName, setNewEventName] = useState("")
  const [newEventDate, setNewEventDate] = useState("")
  const [newEventPrize, setNewEventPrize] = useState("")
  const [newEventWinner, setNewEventWinner] = useState("")
  const [newEventBuyIn, setNewEventBuyIn] = useState("")
  const [newEventEntryCount, setNewEventEntryCount] = useState("")
  const [newEventBlindStructure, setNewEventBlindStructure] = useState("")
  const [newEventLevelDuration, setNewEventLevelDuration] = useState("")
  const [newEventStartingStack, setNewEventStartingStack] = useState("")
  const [newEventNotes, setNewEventNotes] = useState("")

  // Event Info dialog states
  const [isEventInfoDialogOpen, setIsEventInfoDialogOpen] = useState(false)
  const [viewingEventId, setViewingEventId] = useState<string>("")
  const [viewingEvent, setViewingEvent] = useState<any | null>(null)
  const [viewingPayouts, setViewingPayouts] = useState<any[]>([])
  const [loadingViewingPayouts, setLoadingViewingPayouts] = useState(false)
  const [isEditingViewingPayouts, setIsEditingViewingPayouts] = useState(false)
  const [editingViewingPayouts, setEditingViewingPayouts] = useState<PayoutRow[]>([])
  const [savingPayouts, setSavingPayouts] = useState(false)

  // Payout dialog states
  const [payouts, setPayouts] = useState<PayoutRow[]>([
    { rank: 1, playerName: "", prizeAmount: "" }
  ])
  const [payoutSectionOpen, setPayoutSectionOpen] = useState(false)
  const [hendonMobUrl, setHendonMobUrl] = useState("")
  const [hendonMobHtml, setHendonMobHtml] = useState("")
  const [csvText, setCsvText] = useState("")
  const [loadingPayouts, setLoadingPayouts] = useState(false)

  // Stream dialog states (formerly Day)
  const [isStreamDialogOpen, setIsStreamDialogOpen] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState<string>("")
  const [editingStreamId, setEditingStreamId] = useState<string>("")
  const [newStreamName, setNewStreamName] = useState("")
  const [videoSourceTab, setVideoSourceTab] = useState<VideoSourceTab>('youtube')
  const [newStreamVideoUrl, setNewStreamVideoUrl] = useState("")
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Video player dialog states
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false)
  const [videoStartTime, setVideoStartTime] = useState<string>("")

  // UI states
  const [openMenuId, setOpenMenuId] = useState<string>("")

  // Folder navigation states
  const [navigationLevel, setNavigationLevel] = useState<'root' | 'tournament' | 'event' | 'unorganized'>('root')
  const [currentTournamentId, setCurrentTournamentId] = useState<string>("")
  const [currentEventId, setCurrentEventId] = useState<string>("")

  // Unsorted videos state
  const [unsortedVideos, setUnsortedVideos] = useState<any[]>([])

  return {
    tournaments,
    setTournaments,
    hands,
    setHands,
    selectedStream,
    setSelectedStream,
    loading,
    setLoading,
    userEmail,
    setUserEmail,
    selectedCategory,
    setSelectedCategory,
    isDialogOpen,
    setIsDialogOpen,
    editingTournamentId,
    setEditingTournamentId,
    newTournamentName,
    setNewTournamentName,
    newCategory,
    setNewCategory,
    newLocation,
    setNewLocation,
    newStartDate,
    setNewStartDate,
    newEndDate,
    setNewEndDate,
    isEventDialogOpen,
    setIsEventDialogOpen,
    selectedTournamentId,
    setSelectedTournamentId,
    editingEventId,
    setEditingEventId,
    newEventName,
    setNewEventName,
    newEventDate,
    setNewEventDate,
    newEventPrize,
    setNewEventPrize,
    newEventWinner,
    setNewEventWinner,
    newEventBuyIn,
    setNewEventBuyIn,
    newEventEntryCount,
    setNewEventEntryCount,
    newEventBlindStructure,
    setNewEventBlindStructure,
    newEventLevelDuration,
    setNewEventLevelDuration,
    newEventStartingStack,
    setNewEventStartingStack,
    newEventNotes,
    setNewEventNotes,
    isEventInfoDialogOpen,
    setIsEventInfoDialogOpen,
    viewingEventId,
    setViewingEventId,
    viewingEvent,
    setViewingEvent,
    viewingPayouts,
    setViewingPayouts,
    loadingViewingPayouts,
    setLoadingViewingPayouts,
    isEditingViewingPayouts,
    setIsEditingViewingPayouts,
    editingViewingPayouts,
    setEditingViewingPayouts,
    savingPayouts,
    setSavingPayouts,
    payouts,
    setPayouts,
    payoutSectionOpen,
    setPayoutSectionOpen,
    hendonMobUrl,
    setHendonMobUrl,
    hendonMobHtml,
    setHendonMobHtml,
    csvText,
    setCsvText,
    loadingPayouts,
    setLoadingPayouts,
    isStreamDialogOpen,
    setIsStreamDialogOpen,
    selectedEventId,
    setSelectedEventId,
    editingStreamId,
    setEditingStreamId,
    newStreamName,
    setNewStreamName,
    videoSourceTab,
    setVideoSourceTab,
    newStreamVideoUrl,
    setNewStreamVideoUrl,
    uploadFile,
    setUploadFile,
    uploading,
    setUploading,
    uploadProgress,
    setUploadProgress,
    isVideoDialogOpen,
    setIsVideoDialogOpen,
    videoStartTime,
    setVideoStartTime,
    openMenuId,
    setOpenMenuId,
    navigationLevel,
    setNavigationLevel,
    currentTournamentId,
    setCurrentTournamentId,
    currentEventId,
    setCurrentEventId,
    unsortedVideos,
    setUnsortedVideos,
  }
}
