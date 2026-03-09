import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { onAuthStateChange } from '@/lib/supabase/auth'
import { getUnsortedVideos } from '@/lib/unsorted-videos'
import type { UnsortedVideo } from '@/lib/unsorted-videos'
import { toast } from 'sonner'

export function useArchiveData() {
  const [tournaments, setTournaments] = useState<any[]>([])
  const [hands, setHands] = useState<any[]>([])
  const [unsortedVideos, setUnsortedVideos] = useState<UnsortedVideo[]>([])
  const [selectedStream, setSelectedStream] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  const supabase = createClient()

  // Load tournaments tree from Supabase
  const loadTournaments = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select(`
          id, name, category, location, start_date, end_date,
          events (
            id, name, date,
            streams (
              id, name, video_url, video_source, status
            )
          )
        `)
        .order('start_date', { ascending: false })

      if (error) throw error

      const formattedData = (data || []).map(t => ({
        ...t,
        expanded: true,
        events: (t.events || []).map((e: any) => ({
          ...e,
          expanded: false,
          streams: (e.streams || []).map((s: any) => ({
            ...s,
            selected: false
          }))
        }))
      }))

      setTournaments(formattedData)
    } catch (error) {
      console.error('Error loading tournaments:', error)
      toast.error('Failed to load tournaments')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Load unsorted videos
  const loadUnsortedVideos = useCallback(async () => {
    try {
      const videos = await getUnsortedVideos()
      setUnsortedVideos(videos)
    } catch (error) {
      console.error('Error loading unsorted videos:', error)
    }
  }, [])

  // Load hands for selected stream
  const loadHands = useCallback(async (streamId: string) => {
    try {
      const { data, error } = await supabase
        .from('hands')
        .select('*')
        .eq('stream_id', streamId)
        .order('hand_number', { ascending: true })

      if (error) throw error

      const handsData = (data || []).map((h: any) => ({
        id: h.id,
        number: h.hand_number,
        description: h.description,
        timestamp: h.timestamp,
        pot_size: h.pot_size,
        ai_summary: h.ai_summary,
        stream_id: h.stream_id,
        favorite: h.description === 'FAVORITE', // 임시 매핑
        checked: false,
        hand_players: (h.players_json as any[])?.map((p: any) => ({
          position: p.position,
          cards: p.hole_cards,
          player: { name: p.name },
        })),
      }))

      setHands(handsData)
    } catch (error) {
      console.error('Error loading hands:', error)
    }
  }, [supabase])

  useEffect(() => {
    loadTournaments()
    loadUnsortedVideos()
  }, [loadTournaments, loadUnsortedVideos])

  useEffect(() => {
    if (selectedStream) {
      loadHands(selectedStream)
    }
  }, [selectedStream, loadHands])

  useEffect(() => {
    const { unsubscribe } = onAuthStateChange((user) => {
      setUserEmail(user?.email || null)
    })
    return () => { unsubscribe() }
  }, [])

  return {
    tournaments,
    setTournaments,
    hands,
    setHands,
    unsortedVideos,
    setUnsortedVideos,
    selectedStream,
    setSelectedStream,
    loading,
    setLoading,
    userEmail,
    setUserEmail,
    loadTournaments,
    loadUnsortedVideos,
    loadHands,
  }
}
