/**
 * Admin Archive Dashboard Store
 *
 * Zustand store for Admin Archive Dashboard state management
 * - View mode (tree/flat)
 * - Selection state
 * - Expansion state (tree view)
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ContentStatus } from '@/lib/types/archive'

/**
 * Selected item type
 */
export interface SelectedItem {
  type: 'tournament' | 'event' | 'stream'
  id: string
  // Additional context for stream
  tournamentId?: string
  eventId?: string
}

/**
 * Admin Archive Store State
 */
interface AdminArchiveState {
  // View mode
  viewMode: 'tree' | 'flat'
  setViewMode: (mode: 'tree' | 'flat') => void

  // Content status filter
  currentStatusFilter: ContentStatus | 'all'
  setCurrentStatusFilter: (status: ContentStatus | 'all') => void

  // Selected item for detail panel
  selectedItem: SelectedItem | null
  setSelectedItem: (item: SelectedItem | null) => void

  // Expanded state for tree view
  expandedTournaments: Set<string>
  expandedEvents: Set<string>
  toggleTournamentExpand: (id: string) => void
  toggleEventExpand: (id: string) => void
  expandAll: () => void
  collapseAll: () => void

  // Multi-select for bulk actions
  selectedTournamentIds: Set<string>
  selectedEventIds: Set<string>
  selectedStreamIds: Set<string>
  toggleTournamentSelect: (id: string) => void
  toggleEventSelect: (id: string) => void
  toggleStreamSelect: (id: string, tournamentId?: string, eventId?: string) => void
  clearSelection: () => void
  selectAllStreams: (streams: Array<{ id: string; tournamentId?: string; eventId?: string }>) => void

  // Stream meta for bulk actions
  selectedStreamMeta: Map<string, { tournamentId: string; eventId: string }>
}

/**
 * Admin Archive Store
 */
export const useAdminArchiveStore = create<AdminArchiveState>()(
  persist(
    (set, get) => ({
      // View mode
      viewMode: 'tree',
      setViewMode: (mode) => set({ viewMode: mode }),

      // Status filter
      currentStatusFilter: 'all',
      setCurrentStatusFilter: (status) => set({ currentStatusFilter: status }),

      // Selected item
      selectedItem: null,
      setSelectedItem: (item) => set({ selectedItem: item }),

      // Expanded state
      expandedTournaments: new Set<string>(),
      expandedEvents: new Set<string>(),

      toggleTournamentExpand: (id) => {
        const { expandedTournaments } = get()
        const newSet = new Set(expandedTournaments)
        if (newSet.has(id)) {
          newSet.delete(id)
        } else {
          newSet.add(id)
        }
        set({ expandedTournaments: newSet })
      },

      toggleEventExpand: (id) => {
        const { expandedEvents } = get()
        const newSet = new Set(expandedEvents)
        if (newSet.has(id)) {
          newSet.delete(id)
        } else {
          newSet.add(id)
        }
        set({ expandedEvents: newSet })
      },

      expandAll: () => {
        // Placeholder
      },

      collapseAll: () => {
        set({
          expandedTournaments: new Set(),
          expandedEvents: new Set(),
        })
      },

      // Multi-select
      selectedTournamentIds: new Set<string>(),
      selectedEventIds: new Set<string>(),
      selectedStreamIds: new Set<string>(),
      selectedStreamMeta: new Map<string, { tournamentId: string; eventId: string }>(),

      toggleTournamentSelect: (id) => {
        const { selectedTournamentIds } = get()
        const newSet = new Set(selectedTournamentIds)
        if (newSet.has(id)) {
          newSet.delete(id)
        } else {
          newSet.add(id)
        }
        set({ selectedTournamentIds: newSet })
      },

      toggleEventSelect: (id) => {
        const { selectedEventIds } = get()
        const newSet = new Set(selectedEventIds)
        if (newSet.has(id)) {
          newSet.delete(id)
        } else {
          newSet.add(id)
        }
        set({ selectedEventIds: newSet })
      },

      toggleStreamSelect: (id, tournamentId, eventId) => {
        const { selectedStreamIds, selectedStreamMeta } = get()
        const newSet = new Set(selectedStreamIds)
        const newMeta = new Map(selectedStreamMeta)

        if (newSet.has(id)) {
          newSet.delete(id)
          newMeta.delete(id)
        } else {
          newSet.add(id)
          if (tournamentId && eventId) {
            newMeta.set(id, { tournamentId, eventId })
          }
        }
        set({ selectedStreamIds: newSet, selectedStreamMeta: newMeta })
      },

      clearSelection: () => {
        set({
          selectedTournamentIds: new Set(),
          selectedEventIds: new Set(),
          selectedStreamIds: new Set(),
          selectedStreamMeta: new Map(),
        })
      },

      selectAllStreams: (streams) => {
        const newSet = new Set<string>()
        const newMeta = new Map<string, { tournamentId: string; eventId: string }>()

        streams.forEach((stream) => {
          newSet.add(stream.id)
          if (stream.tournamentId && stream.eventId) {
            newMeta.set(stream.id, {
              tournamentId: stream.tournamentId,
              eventId: stream.eventId,
            })
          }
        })

        set({ selectedStreamIds: newSet, selectedStreamMeta: newMeta })
      },
    }),
    {
      name: 'admin-archive-store',
      // Only persist viewMode, not selection state
      partialize: (state) => ({
        viewMode: state.viewMode,
      }),
      // Custom storage to handle Set/Map serialization (simplified here)
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name)
          if (!str) return null
          return JSON.parse(str)
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value))
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
)
