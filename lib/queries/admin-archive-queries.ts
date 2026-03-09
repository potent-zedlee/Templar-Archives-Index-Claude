/**
 * Admin Archive React Query Hooks (Supabase Version)
 */

import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Tournament, Event, Stream, ContentStatus } from '@/lib/types/archive'

// ==================== Types ====================

export interface AdminStream extends Stream {
  eventName?: string
  tournamentName?: string
  tournamentId?: string
}

// ==================== Admin Queries ====================

/**
 * Admin 전용 Tournaments 쿼리
 */
export function useAdminTournamentsQuery(statusFilter: ContentStatus | 'all' = 'all') {
  return useQuery({
    queryKey: ['admin', 'tournaments', statusFilter],
    queryFn: async () => {
      const supabase = createClient()
      let query = supabase.from('tournaments').select('*').order('end_date', { ascending: false })
      if (statusFilter !== 'all') query = query.eq('status', statusFilter)
      const { data, error } = await query
      if (error) throw error
      return data as Tournament[]
    }
  })
}

/**
 * Admin 전용 Events 쿼리
 */
export function useAdminEventsQuery(tournamentId: string, statusFilter: ContentStatus | 'all' = 'all') {
  return useQuery({
    queryKey: ['admin', 'events', tournamentId, statusFilter],
    queryFn: async () => {
      const supabase = createClient()
      let query = supabase.from('events').select('*').eq('tournament_id', tournamentId).order('date', { ascending: false })
      if (statusFilter !== 'all') query = query.eq('status', statusFilter)
      const { data, error } = await query
      if (error) throw error
      return data as Event[]
    },
    enabled: !!tournamentId
  })
}

/**
 * Admin 전용 Streams 쿼리
 */
export function useAdminStreamsQuery(eventId: string | 'all', statusFilter: ContentStatus | 'all' = 'all') {
  return useQuery({
    queryKey: ['admin', 'streams', eventId, statusFilter],
    queryFn: async () => {
      const supabase = createClient()
      let query = supabase
        .from('streams')
        .select(`
          *,
          events (
            name,
            tournament_id,
            tournaments (name)
          )
        `)
        .order('created_at', { ascending: false })

      if (eventId !== 'all') query = query.eq('event_id', eventId)
      if (statusFilter !== 'all') query = query.eq('status', statusFilter)

      const { data, error } = await query
      if (error) throw error

      return (data || []).map(d => ({
        ...d,
        eventName: (d.events as any)?.name,
        tournamentId: (d.events as any)?.tournament_id,
        tournamentName: (d.events as any)?.tournaments?.name,
      })) as AdminStream[]
    }
  })
}

export function useStreamHands(streamId: string) {
  return useQuery({
    queryKey: ['admin', 'stream-hands', streamId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('hands')
        .select('*')
        .eq('stream_id', streamId)
        .order('hand_number')
      if (error) throw error
      return data
    },
    enabled: !!streamId
  })
}

// ==================== Mutations ====================

export function useUpdateStreamStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ streamId, status }: { streamId: string, status: ContentStatus }) => {
      const supabase = createClient()
      const { error } = await supabase.from('streams').update({ status }).eq('id', streamId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'streams'] })
      toast.success('Status updated')
    }
  })
}

export function useClassifyStream() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ streamId, eventId, tournamentId }: { streamId: string, eventId: string, tournamentId: string }) => {
      const supabase = createClient()
      const { error } = await supabase.from('streams').update({ 
        event_id: eventId,
        tournament_id: tournamentId,
      }).eq('id', streamId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'streams'] })
      toast.success('Stream classified')
    }
  })
}
