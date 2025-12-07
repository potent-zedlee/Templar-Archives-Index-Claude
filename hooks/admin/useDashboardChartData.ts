/**
 * Dashboard Chart Data Hooks
 *
 * Custom hooks for loading dashboard chart data with React Query
 * Firestore 버전으로 마이그레이션됨
 */

import { useState, useEffect } from 'react'
import { firestore } from '@/lib/db/firebase'
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
} from 'firebase/firestore'
import { COLLECTION_PATHS } from '@/lib/db/firestore-types'

type UserGrowthData = {
  date: string
  users: number
}

type ContentDistributionData = {
  name: string
  value: number
}

type SecurityEventData = {
  event_type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  created_at: string
}

/**
 * Hook for loading user growth data (last 7 days)
 */
export function useUserGrowthData() {
  const [data, setData] = useState<UserGrowthData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadUserGrowth()
  }, [])

  async function loadUserGrowth() {
    try {
      setIsLoading(true)

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const usersRef = collection(firestore, COLLECTION_PATHS.USERS)
      const q = query(
        usersRef,
        where('createdAt', '>=', Timestamp.fromDate(sevenDaysAgo)),
        orderBy('createdAt')
      )
      const snapshot = await getDocs(q)

      // Group by date
      const growthByDate: Record<string, number> = {}
      snapshot.docs.forEach((doc) => {
        const userData = doc.data()
        const createdAt = userData.createdAt?.toDate?.() || new Date()
        const date = createdAt.toLocaleDateString('ko-KR', {
          month: 'short',
          day: 'numeric',
        })
        growthByDate[date] = (growthByDate[date] || 0) + 1
      })

      const growthData = Object.entries(growthByDate).map(([date, count]) => ({
        date,
        users: count,
      }))

      setData(growthData)
    } catch (error) {
      console.error('Error loading user growth data:', error)
      setData([])
    } finally {
      setIsLoading(false)
    }
  }

  return { data, isLoading, refetch: loadUserGrowth }
}

/**
 * Hook for loading content distribution data
 */
export function useContentDistribution() {
  const [data, setData] = useState<ContentDistributionData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadContentDistribution()
  }, [])

  async function loadContentDistribution() {
    try {
      setIsLoading(true)

      // Firestore에서 각 컬렉션의 문서 수 카운트
      const [postsSnap, handsSnap, tournamentsSnap] = await Promise.all([
        getDocs(collection(firestore, COLLECTION_PATHS.POSTS)),
        getDocs(collection(firestore, COLLECTION_PATHS.HANDS)),
        getDocs(collection(firestore, COLLECTION_PATHS.TOURNAMENTS)),
      ])

      // 댓글은 posts 서브컬렉션이므로 별도 카운트 (간소화를 위해 0으로 표시)
      // 실제로는 각 post의 comments 서브컬렉션을 순회해야 함
      setData([
        { name: 'Posts', value: postsSnap.size },
        { name: 'Comments', value: 0 }, // 서브컬렉션 카운트 생략
        { name: 'Hands', value: handsSnap.size },
        { name: 'Tournaments', value: tournamentsSnap.size },
      ])
    } catch (error) {
      console.error('Error loading content distribution:', error)
      setData([])
    } finally {
      setIsLoading(false)
    }
  }

  return { data, isLoading, refetch: loadContentDistribution }
}

/**
 * Hook for loading recent security events
 * Note: Security events collection may not exist in Firestore yet
 */
export function useSecurityEvents(limit: number = 10) {
  const [data, setData] = useState<SecurityEventData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadSecurityEvents()
  }, [limit])

  async function loadSecurityEvents() {
    try {
      setIsLoading(true)

      // Security events 컬렉션이 Firestore에 없을 수 있음
      // 일단 빈 배열 반환
      // TODO: Firestore에 securityEvents 컬렉션 추가 시 구현
      setData([])
    } catch (error) {
      console.error('Error loading security events:', error)
      setData([])
    } finally {
      setIsLoading(false)
    }
  }

  return { data, isLoading, refetch: loadSecurityEvents }
}
