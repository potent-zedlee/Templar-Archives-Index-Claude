/**
 * Archive React Query Hooks (Supabase Version)
 *
 * Archive 페이지의 데이터 페칭을 위한 React Query hooks
 * PostgreSQL의 관계형 구조를 활용하여 최적화된 쿼리를 제공합니다.
 */

'use client'

import { useQuery, useQueryClient, useInfiniteQuery, useMutation } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Tournament, Hand, UnsortedVideo, Event, Stream } from '@/lib/types/archive'
import type { ServerSortParams } from '@/lib/types/sorting'
import type { Database } from '@/lib/supabase/database.types'

type Tables = Database['public']['Tables']

// ==================== Helper Functions ====================

/**
 * DB Tournament 데이터를 UI 타입으로 변환
 */
function mapDbTournament(data: any): Tournament {
  return {
    id: data.id,
    name: data.name,
    category: data.category,
    location: data.location,
    city: data.city,
    country: data.country,
    startDate: data.start_date || '',
    endDate: data.end_date || '',
    status: data.status,
    createdAt: data.created_at,
    logoSimpleUrl: data.logo_url,
    events: data.events ? data.events.map((e: any) => mapDbEvent(e, data.id)) : [],
    expanded: true,
  }
}

/**
 * DB Event 데이터를 UI 타입으로 변환
 */
function mapDbEvent(data: any, tournamentId: string): Event {
  return {
    id: data.id,
    tournamentId: tournamentId,
    name: data.name,
    date: data.date || '',
    status: data.status,
    createdAt: data.created_at,
    streams: data.streams ? data.streams.map((s: any) => mapDbStream(s, data.id)) : [],
    expanded: false,
  }
}

/**
 * DB Stream 데이터를 UI 타입으로 변환
 */
function mapDbStream(data: any, eventId: string): Stream {
  const stats = data.stats as any
  return {
    id: data.id,
    eventId: eventId,
    name: data.name,
    videoUrl: data.video_url,
    videoSource: data.video_source,
    status: data.status,
    createdAt: data.created_at,
    handCount: stats?.hands_count || 0,
    selected: false,
  }
}

/**
 * DB Hand 데이터를 UI 타입으로 변환
 */
function mapDbHand(data: any): Hand {
  return {
    id: data.id,
    streamId: data.stream_id,
    number: data.hand_number,
    description: data.description,
    timestamp: data.timestamp,
    boardFlop: data.board_flop,
    boardTurn: data.board_turn,
    boardRiver: data.board_river,
    potSize: data.pot_size,
    createdAt: data.created_at,
    handPlayers: (data.players_json as any[])?.map((p: any) => ({
      id: p.player_id,
      playerId: p.player_id,
      pokerPosition: p.position,
      holeCards: p.hole_cards,
      isWinner: p.is_winner,
      player: { id: p.player_id, name: p.name }
    })),
    handHistoryFormat: data.hand_history_json,
    checked: false,
  }
}

// ==================== Query Keys ====================

export const archiveKeys = {
  all: ['archive'] as const,
  tournaments: (sortParams?: Partial<ServerSortParams>) =>
    [...archiveKeys.all, 'tournaments', sortParams] as const,
  hands: (streamId: string) => [...archiveKeys.all, 'hands', streamId] as const,
  handsInfinite: (streamId: string) => [...archiveKeys.all, 'hands-infinite', streamId] as const,
  unsortedVideos: () => [...archiveKeys.all, 'unsorted-videos'] as const,
}

// ==================== Tournaments Query ====================

/**
 * Supabase에서 전체 토너먼트 트리(이벤트, 스트림 포함)를 가져옵니다.
 */
async function fetchTournamentsTree(includeHidden: boolean = false) {
  const supabase = createClient()
  
  let query = supabase
    .from('tournaments')
    .select(`
      *,
      events (
        *,
        streams (*)
      )
    `)
    .order('start_date', { ascending: false })

  if (!includeHidden) {
    query = query.eq('status', 'published')
  }

  const { data, error } = await query
  if (error) throw error

  return (data || []).map(mapDbTournament)
}

export function useTournamentsQuery(
  gameType?: 'tournament' | 'cash-game',
  sortParams?: Partial<ServerSortParams>,
  includeHidden: boolean = false
) {
  return useQuery({
    queryKey: [...archiveKeys.tournaments(sortParams), includeHidden],
    queryFn: () => fetchTournamentsTree(includeHidden),
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * 토너먼트 목록만 (이벤트 제외) 조회
 */
export function useTournamentsShallowQuery() {
  return useQuery({
    queryKey: [...archiveKeys.all, 'tournaments-shallow'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('start_date', { ascending: false })
      if (error) throw error
      return (data || []).map(mapDbTournament)
    }
  })
}

// ==================== Events Query ====================

export function useEventsQuery(tournamentId: string | null) {
  return useQuery({
    queryKey: [...archiveKeys.all, 'events', tournamentId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('tournament_id', tournamentId!)
        .order('date', { ascending: false })
      if (error) throw error
      return (data || []).map(e => mapDbEvent(e, tournamentId!))
    },
    enabled: !!tournamentId
  })
}

// ==================== Streams Query ====================

export function useStreamsQuery(eventId: string | null) {
  return useQuery({
    queryKey: [...archiveKeys.all, 'streams', eventId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('streams')
        .select('*')
        .eq('event_id', eventId!)
        .order('name', { ascending: true })
      if (error) throw error
      return (data || []).map(s => mapDbStream(s, eventId!))
    },
    enabled: !!eventId
  })
}

export function useStreamDetailQuery(streamId: string | null) {
  return useQuery({
    queryKey: [...archiveKeys.all, 'stream-detail', streamId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('streams')
        .select('*, events(tournament_id)')
        .eq('id', streamId!)
        .single()
      if (error) throw error
      return mapDbStream(data, (data.events as any)?.tournament_id)
    },
    enabled: !!streamId
  })
}

// ==================== Players Query ====================

export function useSearchPlayersQuery(searchQuery: string) {
  return useQuery({
    queryKey: [...archiveKeys.all, 'players-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery) return []
      const supabase = createClient()
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .ilike('name', `%${searchQuery}%`)
        .limit(10)
      if (error) throw error
      return (data || []).map(p => ({
        id: p.id,
        name: p.name,
        photoUrl: p.photo_url
      }))
    },
    enabled: searchQuery.length >= 2
  })
}

// ==================== Hands Query ====================

async function fetchHandsByStream(streamId: string): Promise<Hand[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('hands')
    .select('*')
    .eq('stream_id', streamId)
    .order('hand_number', { ascending: true })

  if (error) throw error
  return (data || []).map(mapDbHand)
}

export function useHandsQuery(streamId: string | null) {
  return useQuery({
    queryKey: archiveKeys.hands(streamId || ''),
    queryFn: () => fetchHandsByStream(streamId!),
    enabled: !!streamId,
  })
}

export function useHandDetailQuery(handId: string | null) {
  return useQuery({
    queryKey: ['hands', 'detail', handId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('hands').select('*').eq('id', handId!).single()
      if (error) throw error
      return mapDbHand(data)
    },
    enabled: !!handId
  })
}

/**
 * 무한 스크롤 핸드 조회
 */
export function useHandsInfiniteQuery(streamId: string | null) {
  const HANDS_PER_PAGE = 50
  
  return useInfiniteQuery({
    queryKey: archiveKeys.handsInfinite(streamId || ''),
    queryFn: async ({ pageParam = 0 }) => {
      if (!streamId) return { hands: [], nextCursor: null }

      const supabase = createClient()
      const from = (pageParam as number) * HANDS_PER_PAGE
      const to = from + HANDS_PER_PAGE - 1

      const { data, error } = await supabase
        .from('hands')
        .select('*')
        .eq('stream_id', streamId)
        .order('hand_number', { ascending: true })
        .range(from, to)

      if (error) throw error
      
      const hands = (data || []).map(mapDbHand)
      const hasMore = hands.length === HANDS_PER_PAGE

      return {
        hands,
        nextCursor: hasMore ? (pageParam as number) + 1 : null,
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    enabled: !!streamId,
  })
}

// ==================== Unsorted Videos Query ====================

async function fetchUnsortedVideos() {
  const supabase = createClient()
  // PostgreSQL에서는 미분류 비디오가 streams 테이블에 event_id가 NULL인 행으로 존재
  const { data, error } = await supabase
    .from('streams')
    .select('*')
    .is('event_id', null)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(s => ({
    id: s.id,
    name: s.name,
    videoUrl: s.video_url,
    videoSource: s.video_source,
    createdAt: s.created_at,
  } as UnsortedVideo))
}

export function useUnsortedVideosQuery() {
  return useQuery({
    queryKey: archiveKeys.unsortedVideos(),
    queryFn: fetchUnsortedVideos,
  })
}

// ==================== Mutations ====================

export function useCreateHandMutation(streamId: string) {
  const queryClient = useQueryClient()
  const supabase = createClient()
  return useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('hands').insert({
        stream_id: streamId,
        hand_number: data.handNumber,
        description: data.description,
        timestamp: data.timestamp
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: archiveKeys.hands(streamId) })
    }
  })
}

export function useFavoriteHandMutation(streamId: string | null) {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ handId, favorite }: { handId: string; favorite: boolean }) => {
      // Supabase에서는 engagement나 별도 테이블로 관리해야 함
      // 여기서는 단순화를 위해 hands 테이블의 metadata 업데이트로 가정
      const { error } = await supabase
        .from('hands')
        .update({ description: favorite ? 'FAVORITE' : '' } as any) // 임시
        .eq('id', handId)
      
      if (error) throw error
    },
    onSuccess: () => {
      if (streamId) queryClient.invalidateQueries({ queryKey: archiveKeys.hands(streamId) })
    }
  })
}
