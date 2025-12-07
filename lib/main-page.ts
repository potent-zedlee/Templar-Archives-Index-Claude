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
      where('createdAt', '>=', Timestamp.fromDate(sevenDaysAgo)),
      orderBy('createdAt', 'desc'),
      orderBy('engagement.likesCount', 'desc'),
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
        potSize: data.potSize || 0,
        likesCount: data.engagement?.likesCount || 0,
        videoUrl: data.refData?.streamVideoUrl || '',
        tournamentName: data.refData?.tournamentName || 'Unknown',
        streamName: data.refData?.streamName || 'Unknown'
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
      orderBy('createdAt', 'desc'),
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
        createdAt: data.createdAt?.toDate?.()?.toISOString() || '',
        likesCount: data.engagement?.likesCount || 0,
        commentsCount: data.engagement?.commentsCount || 0,
        author: {
          nickname: data.author?.name || 'Unknown',
          avatarUrl: data.author?.avatarUrl || ''
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
      orderBy('totalWinnings', 'desc'),
      limit(limitCount)
    )

    const playersSnapshot = await getDocs(playersQuery)

    return playersSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        name: data.name || '',
        photoUrl: data.photoUrl,
        totalWinnings: data.totalWinnings || 0,
        tournamentCount: data.stats?.tournamentCount || 0,
        handsCount: data.stats?.totalHands || 0
      }
    })
  } catch (error) {
    console.error('Error fetching top players:', error)
    return []
  }
}
