/**
 * Home Page Server Actions (Supabase Version)
 */

'use server'

import { createAdminClient } from '@/lib/supabase/admin/server'
import type { PlatformStats, WeeklyHighlight, TopPlayer } from '@/lib/main-page'

/**
 * 플랫폼 통계 조회
 */
export async function getPlatformStats(): Promise<PlatformStats> {
  const admin = createAdminClient()
  
  try {
    const [
      { count: handsCount },
      { count: tournamentsCount },
      { count: playersCount }
    ] = await Promise.all([
      admin.from('hands').select('*', { count: 'exact', head: true }),
      admin.from('tournaments').select('*', { count: 'exact', head: true }),
      admin.from('players').select('*', { count: 'exact', head: true }),
    ])

    return {
      totalHands: handsCount || 0,
      totalTournaments: tournamentsCount || 0,
      totalPlayers: playersCount || 0,
    }
  } catch (error) {
    console.error('Error fetching platform stats:', error)
    return { totalHands: 0, totalTournaments: 0, totalPlayers: 0 }
  }
}

/**
 * 주간 하이라이트 조회
 */
export async function getWeeklyHighlights(): Promise<WeeklyHighlight[]> {
  const admin = createAdminClient()
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  try {
    const { data, error } = await admin
      .from('hands')
      .select(`
        id,
        hand_number,
        description,
        timestamp,
        pot_size,
        likes_count,
        streams (
          name,
          video_url,
          tournaments (
            name
          )
        )
      `)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('likes_count', { ascending: false })
      .limit(3)

    if (error) throw error

    return (data || []).map((h: any) => ({
      id: h.id,
      number: h.hand_number,
      description: h.description || '',
      timestamp: h.timestamp || '',
      potSize: Number(h.pot_size) || 0,
      likesCount: h.likes_count || 0,
      videoUrl: h.streams?.video_url || '',
      tournamentName: h.streams?.tournaments?.name || 'Unknown',
      streamName: h.streams?.name || 'Unknown',
    }))
  } catch (error) {
    console.error('Error fetching weekly highlights:', error)
    return []
  }
}

/**
 * 최신 게시글 조회
 */
export async function getLatestPosts() {
  const admin = createAdminClient()
  try {
    const { data, error } = await admin
      .from('posts')
      .select(`
        id,
        title,
        content,
        category,
        created_at,
        likes_count,
        comments_count,
        users (
          nickname,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false })
      .limit(4)

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
        nickname: p.users?.nickname || 'Anonymous',
        avatarUrl: p.users?.avatar_url || null,
      }
    }))
  } catch (error) {
    return []
  }
}

/**
 * 상위 플레이어 조회
 */
export async function getTopPlayers(): Promise<TopPlayer[]> {
  const admin = createAdminClient()
  try {
    const { data, error } = await admin
      .from('players')
      .select('*')
      .order('total_winnings', { ascending: false })
      .limit(5)

    if (error) throw error

    return (data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      photoUrl: p.photo_url,
      totalWinnings: Number(p.total_winnings) || 0,
      tournamentCount: 0, // 별도 집계 필요 시 추가
      handsCount: 0,
    }))
  } catch (error) {
    return []
  }
}
