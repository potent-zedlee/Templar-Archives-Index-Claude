/**
 * Main Page Data Fetching (Supabase Version)
 */

import { createClient } from '@/lib/supabase/client'

export type PlatformStats = {
  totalHands: number
  totalTournaments: number
  totalPlayers: number
}

export type WeeklyHighlight = {
  id: string
  number: number
  description: string
  timestamp: string
  potSize: number
  likesCount: number
  videoUrl: string
  tournamentName: string
  streamName: string
}

export type TopPlayer = {
  id: string
  name: string
  photoUrl?: string
  totalWinnings: number
  tournamentCount: number
  handsCount: number
}

/**
 * 플랫폼 전체 통계 조회
 */
export async function getPlatformStats(): Promise<PlatformStats> {
  const supabase = createClient()
  try {
    const [hands, tournaments, players] = await Promise.all([
      supabase.from('hands').select('*', { count: 'exact', head: true }),
      supabase.from('tournaments').select('*', { count: 'exact', head: true }),
      supabase.from('players').select('*', { count: 'exact', head: true }),
    ])

    return {
      totalHands: hands.count || 0,
      totalTournaments: tournaments.count || 0,
      totalPlayers: players.count || 0,
    }
  } catch (error) {
    return { totalHands: 0, totalTournaments: 0, totalPlayers: 0 }
  }
}

/**
 * 주간 하이라이트 핸드 조회
 */
export async function getWeeklyHighlights(limitCount: number = 3): Promise<WeeklyHighlight[]> {
  const supabase = createClient()
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  try {
    const { data, error } = await supabase
      .from('hands')
      .select(`
        *,
        streams (
          name,
          video_url,
          events (
            tournaments (name)
          )
        )
      `)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('likes_count', { ascending: false })
      .limit(limitCount)

    if (error) throw error

    return (data || []).map((h: any) => ({
      id: h.id,
      number: h.hand_number,
      description: h.description || '',
      timestamp: h.timestamp || '',
      potSize: h.pot_size || 0,
      likesCount: h.likes_count || 0,
      videoUrl: h.streams?.video_url || '',
      tournamentName: h.streams?.events?.tournaments?.name || 'Unknown',
      streamName: h.streams?.name || 'Unknown',
    }))
  } catch (error) {
    return []
  }
}

/**
 * 최신 커뮤니티 포스트 조회
 */
export async function getLatestPosts(limitCount: number = 5) {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*, users(nickname, avatar_url)')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(limitCount)

    if (error) throw error

    return (data || []).map((p: any) => ({
      id: p.id,
      title: p.title,
      content: p.content,
      category: p.category,
      createdAt: p.created_at,
      likesCount: p.likes_count || 0,
      commentsCount: p.comments_count || 0,
      author: {
        nickname: p.users?.nickname || 'Unknown',
        avatarUrl: p.users?.avatar_url || ''
      }
    }))
  } catch (error) {
    return []
  }
}

/**
 * Top 플레이어 조회
 */
export async function getTopPlayers(limitCount: number = 5): Promise<TopPlayer[]> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('total_winnings', { ascending: false })
      .limit(limitCount)

    if (error) throw error

    return (data || []).map(p => ({
      id: p.id,
      name: p.name,
      photoUrl: p.photo_url,
      totalWinnings: Number(p.total_winnings) || 0,
      tournamentCount: 0,
      handsCount: (p.stats as any)?.total_hands || 0
    }))
  } catch (error) {
    return []
  }
}
