/**
 * Search React Query Hooks (Supabase Version)
 */

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { fetchHandsWithDetails, fetchHandDetails } from '@/lib/queries'

// ==================== Types ====================

export interface SearchFilter {
  limit?: number
  offset?: number
  favoriteOnly?: boolean
  streamId?: string
  playerId?: string
}

// ==================== Queries ====================

export function useSearchHandsQuery(options: SearchFilter & { enabled?: boolean }) {
  return useQuery({
    queryKey: ['search', 'hands', options],
    queryFn: () => fetchHandsWithDetails(options),
    enabled: options.enabled !== false,
  })
}

export function useTournamentsQuery() {
  return useQuery({
    queryKey: ['search', 'tournaments'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('tournaments')
        .select(`
          id, name, category,
          events (
            id, name,
            streams (id, name)
          )
        `)
        .order('name')
      
      if (error) throw error
      return data
    }
  })
}

export function usePlayersQuery() {
  return useQuery({
    queryKey: ['search', 'players'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('name')
      
      if (error) throw error
      return data
    }
  })
}

export function useHandQuery(handId: string) {
  return useQuery({
    queryKey: ['search', 'hand', handId],
    queryFn: () => fetchHandDetails(handId),
    enabled: !!handId,
  })
}
