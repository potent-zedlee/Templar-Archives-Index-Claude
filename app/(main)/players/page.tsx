"use client"

import { useEffect } from "react"
import { PlayersPageLayout } from "./_components/PlayersPageLayout"
import { usePlayersQuery, type PlayerWithHandCount } from "@/lib/queries/players-queries"
import { toast } from "sonner"

export default function PlayersClient() {
  // React Query hook (Firestore)
  const { data: playersData = [], isLoading: loading, error, isError, isFetched } = usePlayersQuery()
  const players = playersData as PlayerWithHandCount[]

  // Handle query error with useEffect to avoid repeated toasts
  useEffect(() => {
    if (isError && error) {
      console.error('[Players] Query error:', error)
      toast.error('Failed to load players')
    }
  }, [isError, error])

  // Debug logging in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' || typeof window !== 'undefined') {
      console.log('[Players] State:', {
        loading,
        isError,
        isFetched,
        playersCount: players.length,
        error: error?.message
      })
    }
  }, [loading, isError, isFetched, players.length, error])

  return <PlayersPageLayout players={players} loading={loading} />
}
