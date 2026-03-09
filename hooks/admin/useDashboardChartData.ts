/**
 * Dashboard Chart Data Hooks (Supabase Version)
 */

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

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
 * Hook for loading user growth data
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
      const supabase = createClient()
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { data: users, error } = await supabase
        .from('users')
        .select('created_at')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at')

      if (error) throw error

      const growthByDate: Record<string, number> = {}
      users.forEach((u) => {
        const date = new Date(u.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
        growthByDate[date] = (growthByDate[date] || 0) + 1
      })

      setData(Object.entries(growthByDate).map(([date, count]) => ({ date, users: count })))
    } catch (error) {
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
      const supabase = createClient()

      const [posts, comments, hands, tournaments] = await Promise.all([
        supabase.from('posts').select('*', { count: 'exact', head: true }),
        supabase.from('post_comments').select('*', { count: 'exact', head: true }),
        supabase.from('hands').select('*', { count: 'exact', head: true }),
        supabase.from('tournaments').select('*', { count: 'exact', head: true }),
      ])

      setData([
        { name: 'Posts', value: posts.count || 0 },
        { name: 'Comments', value: comments.count || 0 },
        { name: 'Hands', value: hands.count || 0 },
        { name: 'Tournaments', value: tournaments.count || 0 },
      ])
    } catch (error) {
      setData([])
    } finally {
      setIsLoading(false)
    }
  }

  return { data, isLoading, refetch: loadContentDistribution }
}

/**
 * Hook for loading recent security events
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
      const supabase = createClient()
      const { data: events, error } = await supabase
        .from('security_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      setData(events as any)
    } catch (error) {
      setData([])
    } finally {
      setIsLoading(false)
    }
  }

  return { data, isLoading, refetch: loadSecurityEvents }
}
