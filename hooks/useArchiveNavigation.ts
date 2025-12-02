import { useState, useMemo } from 'react'
import type { FolderItem, AdvancedFilters, NavigationLevel, SortOption } from '@/lib/types/archive'

interface UseArchiveNavigationProps {
  tournaments: any[]
  selectedCategory: string
}

export function useArchiveNavigation({
  tournaments,
  selectedCategory,
}: UseArchiveNavigationProps) {
  // Navigation state
  const [navigationLevel, setNavigationLevel] = useState<NavigationLevel>('root')
  const [currentTournamentId, setCurrentTournamentId] = useState<string>("")
  const [currentSubEventId, setCurrentSubEventId] = useState<string>("")

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sortBy, setSortBy] = useState<SortOption>('date-desc')
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    dateRange: { start: undefined, end: undefined },
    handCountRange: [0, 1000],
    videoSources: { youtube: true, upload: true },
    hasHandsOnly: false
  })

  // Filter tournaments by category (using category_id for accurate matching)
  const filteredTournaments = useMemo(() => {
    return selectedCategory === "All"
      ? tournaments
      : tournaments.filter(t => t.category_id === selectedCategory || t.category === selectedCategory)
  }, [tournaments, selectedCategory])

  // Build breadcrumb items
  const breadcrumbItems = useMemo(() => {
    const items: Array<{ id: string; name: string; type: 'home' | 'tournament' | 'event' }> = []

    if (navigationLevel === 'tournament' || navigationLevel === 'event') {
      const tournament = tournaments.find(t => t.id === currentTournamentId)
      if (tournament) {
        items.push({
          id: tournament.id,
          name: tournament.name,
          type: 'tournament'
        })
      }
    }

    if (navigationLevel === 'event') {
      const tournament = tournaments.find(t => t.id === currentTournamentId)
      const event = tournament?.events?.find((e: any) => e.id === currentSubEventId)
      if (event) {
        items.push({
          id: event.id,
          name: event.name,
          type: 'event'
        })
      }
    }

    return items
  }, [tournaments, navigationLevel, currentTournamentId, currentSubEventId])

  // Build folder items with filters
  const folderItems = useMemo((): FolderItem[] => {
    let items: FolderItem[] = []

    if (navigationLevel === 'root') {
      // Show all tournaments + Unorganized folder
      const tournamentItems = filteredTournaments.map(tournament => ({
        id: tournament.id,
        name: tournament.name,
        type: 'tournament' as const,
        itemCount: tournament.events?.length || 0,
        data: tournament
      }))

      items = tournamentItems
    } else if (navigationLevel === 'tournament') {
      // Show events of current tournament
      const tournament = tournaments.find(t => t.id === currentTournamentId)
      const events = tournament?.events || []

      items = events.map((event: any) => ({
        id: event.id,
        name: event.name,
        type: 'event' as const,
        itemCount: event.streams?.length || 0,
        date: event.date,
        data: event
      }))
    } else if (navigationLevel === 'event') {
      // Show streams of current event
      const tournament = tournaments.find(t => t.id === currentTournamentId)
      const event = tournament?.events?.find((e: any) => e.id === currentSubEventId)
      items = event?.streams?.map((stream: any) => ({
        id: stream.id,
        name: stream.name,
        type: 'stream' as const,
        data: stream
      })) || []
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      items = items.filter(item =>
        item.name.toLowerCase().includes(query)
      )
    }

    // Apply advanced filters
    // Date Range filter
    if (advancedFilters.dateRange.start || advancedFilters.dateRange.end) {
      items = items.filter(item => {
        if (!item.date) return true // Keep items without dates
        const itemDate = new Date(item.date)

        if (advancedFilters.dateRange.start && itemDate < advancedFilters.dateRange.start) {
          return false
        }
        if (advancedFilters.dateRange.end && itemDate > advancedFilters.dateRange.end) {
          return false
        }
        return true
      })
    }


    // Apply sorting
    items.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name)
        case 'name-desc':
          return b.name.localeCompare(a.name)
        case 'date-asc':
          if (!a.date || !b.date) return 0
          return new Date(a.date).getTime() - new Date(b.date).getTime()
        case 'date-desc':
          if (!a.date || !b.date) return 0
          return new Date(b.date).getTime() - new Date(a.date).getTime()
        case 'count-asc':
          return (a.itemCount || 0) - (b.itemCount || 0)
        case 'count-desc':
          return (b.itemCount || 0) - (a.itemCount || 0)
        default:
          return 0
      }
    })

    return items
  }, [navigationLevel, filteredTournaments, tournaments, currentTournamentId, currentSubEventId, searchQuery, advancedFilters, sortBy])

  // Handle breadcrumb navigation
  const handleBreadcrumbNavigate = (item: { id: string; name: string; type: 'home' | 'tournament' | 'event' } | null) => {
    if (!item) {
      // Navigate to root
      setNavigationLevel('root')
      setCurrentTournamentId('')
      setCurrentSubEventId('')
    } else if (item.type === 'tournament') {
      // Navigate to tournament level
      setNavigationLevel('tournament')
      setCurrentTournamentId(item.id)
      setCurrentSubEventId('')
    } else if (item.type === 'event') {
      // Navigate to subevent level (stay at current level)
      setNavigationLevel('event')
      setCurrentSubEventId(item.id)
    }
  }

  // Handle folder navigation
  const handleFolderNavigate = (item: FolderItem) => {
    if (item.type === 'tournament') {
      setNavigationLevel('tournament')
      setCurrentTournamentId(item.id)
      setCurrentSubEventId('')
    } else if (item.type === 'event') {
      setNavigationLevel('event')
      setCurrentSubEventId(item.id)
    }
    // Stream clicks are handled by onSelectStream
  }

  // Navigate back
  const navigateBack = () => {
    if (navigationLevel === 'event') {
      setNavigationLevel('tournament')
      setCurrentSubEventId('')
    } else if (navigationLevel === 'tournament') {
      setNavigationLevel('root')
      setCurrentTournamentId('')
      setCurrentSubEventId('')
    }
  }

  return {
    navigationLevel,
    setNavigationLevel,
    currentTournamentId,
    setCurrentTournamentId,
    currentSubEventId,
    setCurrentSubEventId,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    advancedFilters,
    setAdvancedFilters,
    filteredTournaments,
    breadcrumbItems,
    folderItems,
    handleBreadcrumbNavigate,
    handleFolderNavigate,
    navigateBack,
  }
}
