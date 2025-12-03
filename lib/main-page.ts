/**
 * Main Page Data Fetching
 *
 * Firestore-based data fetching for the main page
 */

import { collection, query, orderBy, limit, getDocs, getCountFromServer, where, Timestamp } from 'firebase/firestore'
import { firestore } from './firebase'
import { COLLECTION_PATHS } from './firestore-types'

export type PlatformStats = {
  totalHands: number
  totalTournaments: number
  totalPlayers: number
}

export type WeeklyHighlight = {
  id: string
  number: string
  description: string
  timestamp: string
  pot_size: number
  likes_count: number
  video_url: string
  tournament_name: string
  stream_name: string
}

export type TopPlayer = {
  id: string
  name: string
  photo_url?: string
  total_winnings: number
  tournament_count: number
  hands_count: number
}

/**
 * 플랫폼 전체 통계 조회
 */
export async function getPlatformStats(): Promise<PlatformStats> {
  try {
    const [handsCount, tournamentsCount, playersCount] = await Promise.all([
      getCountFromServer(collection(firestore, COLLECTION_PATHS.HANDS)),
      getCountFromServer(collection(firestore, COLLECTION_PATHS.TOURNAMENTS)),
      getCountFromServer(collection(firestore, COLLECTION_PATHS.PLAYERS))
    ])

    return {
      totalHands: handsCount.data().count,
      totalTournaments: tournamentsCount.data().count,
      totalPlayers: playersCount.data().count
    }
  } catch (error) {
    console.error('Error fetching platform stats:', error)
    return {
      totalHands: 0,
      totalTournaments: 0,
      totalPlayers: 0
    }
  }
}

/**
 * 주간 하이라이트 핸드 조회 (최근 7일간 좋아요 많이 받은 핸드)
 */
export async function getWeeklyHighlights(limitCount: number = 3): Promise<WeeklyHighlight[]> {
  try {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const handsQuery = query(
      collection(firestore, COLLECTION_PATHS.HANDS),
      where('created_at', '>=', Timestamp.fromDate(sevenDaysAgo)),
      orderBy('created_at', 'desc'),
      orderBy('engagement.likes_count', 'desc'),
      limit(limitCount)
    )

    const handsSnapshot = await getDocs(handsQuery)

    return handsSnapshot.docs.map(doc => {
      const data = doc.data()
      // 기존 문자열 데이터와 새로운 정수 데이터 모두 호환
      const handNumber = typeof data.number === 'string'
        ? parseInt(data.number, 10) || 0
        : data.number ?? 0
      return {
        id: doc.id,
        number: handNumber,
        description: data.description || '',
        timestamp: data.timestamp || '',
        pot_size: data.pot_size || 0,
        likes_count: data.engagement?.likes_count || 0,
        video_url: data.refData?.streamVideoUrl || '',
        tournament_name: data.refData?.tournamentName || 'Unknown',
        stream_name: data.refData?.streamName || 'Unknown'
      }
    })
  } catch (error) {
    console.error('Error fetching weekly highlights:', error)
    return []
  }
}

/**
 * 최신 커뮤니티 포스트 조회
 */
export async function getLatestPosts(limitCount: number = 5) {
  try {
    const postsQuery = query(
      collection(firestore, COLLECTION_PATHS.POSTS),
      orderBy('created_at', 'desc'),
      limit(limitCount)
    )

    const postsSnapshot = await getDocs(postsQuery)

    return postsSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        title: data.title || '',
        content: data.content || '',
        category: data.category || '',
        created_at: data.created_at?.toDate?.()?.toISOString() || '',
        likes_count: data.engagement?.likes_count || 0,
        comments_count: data.engagement?.comments_count || 0,
        author: {
          nickname: data.author?.name || 'Unknown',
          avatar_url: data.author?.avatar_url || ''
        }
      }
    })
  } catch (error) {
    console.error('Error fetching latest posts:', error)
    return []
  }
}

/**
 * Top 플레이어 조회 (총 상금 기준)
 */
export async function getTopPlayers(limitCount: number = 5): Promise<TopPlayer[]> {
  try {
    const playersQuery = query(
      collection(firestore, COLLECTION_PATHS.PLAYERS),
      orderBy('total_winnings', 'desc'),
      limit(limitCount)
    )

    const playersSnapshot = await getDocs(playersQuery)

    return playersSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        name: data.name || '',
        photo_url: data.photo_url,
        total_winnings: data.total_winnings || 0,
        tournament_count: data.stats?.tournament_count || 0,
        hands_count: data.stats?.total_hands || 0
      }
    })
  } catch (error) {
    console.error('Error fetching top players:', error)
    return []
  }
}
