import { useState, useEffect, useCallback } from 'react'
import { firestore } from '@/lib/db/firebase'
import { auth } from '@/lib/db/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from 'firebase/firestore'
import { COLLECTION_PATHS } from '@/lib/db/firestore-types'
import type { FirestoreHand, FirestoreTournament, FirestoreEvent, FirestoreStream } from '@/lib/db/firestore-types'
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

  // Load tournaments from Firestore
  const loadTournaments = useCallback(async () => {
    setLoading(true)
    try {
      const tournamentsRef = collection(firestore, COLLECTION_PATHS.TOURNAMENTS)
      const tournamentsSnap = await getDocs(query(tournamentsRef, orderBy('startDate', 'desc')))

      const tournamentsData = await Promise.all(
        tournamentsSnap.docs.map(async (tournamentDoc) => {
          const tournamentData = tournamentDoc.data() as FirestoreTournament
          const tournamentId = tournamentDoc.id

          // Load events for this tournament
          const eventsRef = collection(firestore, COLLECTION_PATHS.EVENTS(tournamentId))
          const eventsSnap = await getDocs(query(eventsRef, orderBy('date', 'desc')))

          const events = await Promise.all(
            eventsSnap.docs.map(async (eventDoc) => {
              const eventData = eventDoc.data() as FirestoreEvent
              const eventId = eventDoc.id

              // Load streams for this event
              const streamsRef = collection(firestore, COLLECTION_PATHS.STREAMS(tournamentId, eventId))
              const streamsSnap = await getDocs(query(streamsRef, orderBy('name')))

              const streams = streamsSnap.docs.map((streamDoc) => {
                const streamData = streamDoc.data() as FirestoreStream
                return {
                  id: streamDoc.id,
                  name: streamData.name,
                  video_url: streamData.videoUrl,
                  video_source: streamData.videoSource,
                  status: streamData.status,
                  selected: false,
                }
              })

              return {
                id: eventId,
                name: eventData.name,
                buy_in: eventData.buyIn,
                date: eventData.date?.toDate?.()?.toISOString(),
                streams,
                expanded: false,
              }
            })
          )

          return {
            id: tournamentId,
            name: tournamentData.name,
            category: tournamentData.category,
            location: tournamentData.location,
            start_date: tournamentData.startDate?.toDate?.()?.toISOString(),
            end_date: tournamentData.endDate?.toDate?.()?.toISOString(),
            events: events,
            expanded: true,
          }
        })
      )

      setTournaments(tournamentsData)
    } catch (error) {
      console.error('Error loading tournaments:', error)
      toast.error('Failed to load tournaments')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load unsorted videos
  const loadUnsortedVideos = useCallback(async () => {
    try {
      const videos = await getUnsortedVideos()
      setUnsortedVideos(videos)
    } catch (error) {
      console.error('Error loading unsorted videos:', error)
    }
  }, [])

  // Load hands for selected stream from Firestore
  const loadHands = useCallback(async (streamId: string) => {
    try {
      const handsRef = collection(firestore, COLLECTION_PATHS.HANDS)
      const handsQuery = query(
        handsRef,
        where('streamId', '==', streamId),
        orderBy('createdAt', 'asc')
      )
      const handsSnap = await getDocs(handsQuery)

      const handsData = handsSnap.docs.map((doc) => {
        const data = doc.data() as FirestoreHand
        // 기존 문자열 데이터와 새로운 정수 데이터 모두 호환
        const handNumber = typeof data.number === 'string'
          ? parseInt(data.number, 10) || 0
          : data.number ?? 0
        return {
          id: doc.id,
          number: handNumber,
          description: data.description,
          timestamp: data.timestamp,
          pot_size: data.potSize,
          ai_summary: data.aiSummary,
          stream_id: data.streamId,
          favorite: data.favorite,
          checked: false,
          hand_players: data.players?.map((p) => ({
            position: p.position,
            cards: p.holeCards,
            player: { name: p.name },
          })),
        }
      })

      setHands(handsData)
    } catch (error) {
      console.error('Error loading hands:', error)
    }
  }, [])

  // Initial data load
  useEffect(() => {
    loadTournaments()
    loadUnsortedVideos()
  }, [loadTournaments, loadUnsortedVideos])

  // Load hands when stream changes
  useEffect(() => {
    if (selectedStream) {
      loadHands(selectedStream)
    }
  }, [selectedStream, loadHands])

  // Listen to auth state changes (Firebase Auth)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserEmail(user?.email || null)
    })

    return () => unsubscribe()
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
