"use client"

/**
 * Admin Edit Hand Actions Page
 *
 * Edit hand actions for admin users.
 * Migrated from Supabase to Firestore
 */

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Save, Trash2 } from "lucide-react"
import { useAuth } from "@/components/layout/AuthProvider"
import { isAdmin } from "@/lib/admin"
import { ActionEditor } from "@/components/features/hand/actions/ActionEditor"
import {
  useBulkCreateHandActionsMutation,
  useDeleteAllHandActionsMutation,
} from "@/lib/queries/hand-actions-queries"
import { firestore } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { COLLECTION_PATHS } from "@/lib/firestore-types"
import type { FirestoreHand, FirestoreTournament, FirestoreEvent, FirestoreStream } from "@/lib/firestore-types"
import { toast } from "sonner"
import { CardSkeleton } from "@/components/ui/skeletons/CardSkeleton"
import Link from "next/link"

type Hand = {
  id: string
  number: string
  description: string
  stream: {
    id: string
    name: string
    event: {
      name: string
      tournament: {
        name: string
      }
    }
  }
}

type HandPlayer = {
  id: string
  hand_id: string
  player_id: string
  position: string | null
  hole_cards: string | null
  player: {
    id: string
    name: string
  }
}

export default function EditHandActionsPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()

  const handId = params.id as string
  const [hasAccess, setHasAccess] = useState(false)
  const [loading, setLoading] = useState(true)
  const [hand, setHand] = useState<Hand | null>(null)
  const [handPlayers, setHandPlayers] = useState<HandPlayer[]>([])

  // Pending actions from ActionEditor
  const [pendingActions, setPendingActions] = useState<unknown[]>([])

  // Mutations
  const handPlayerIds = handPlayers.map(hp => hp.player_id)
  const bulkCreateMutation = useBulkCreateHandActionsMutation(handId, handPlayerIds)
  const deleteAllMutation = useDeleteAllHandActionsMutation(handId, handPlayerIds)

  // Check admin access
  useEffect(() => {
    checkAccess()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Load hand and players
  useEffect(() => {
    if (hasAccess && handId) {
      loadHandData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAccess, handId])

  async function checkAccess() {
    if (!user) {
      router.push("/auth/login")
      return
    }

    try {
      const adminStatus = await isAdmin(user.id)
      if (!adminStatus) {
        toast.error("Admin privileges required")
        router.push("/")
        return
      }

      setHasAccess(true)
    } catch (error) {
      console.error("Error checking admin access:", error)
      toast.error("Error checking permissions")
      router.push("/")
    }
  }

  async function loadHandData() {
    try {
      setLoading(true)

      // Fetch hand info from Firestore
      const handRef = doc(firestore, COLLECTION_PATHS.HANDS, handId)
      const handSnap = await getDoc(handRef)

      if (!handSnap.exists()) {
        throw new Error("Hand not found")
      }

      const handData = handSnap.data() as FirestoreHand

      // Fetch stream, event, and tournament info
      let streamName = ""
      let eventName = ""
      let tournamentName = ""

      if (handData.streamId && handData.eventId && handData.tournamentId) {
        try {
          // Get tournament
          const tournamentRef = doc(firestore, COLLECTION_PATHS.TOURNAMENTS, handData.tournamentId)
          const tournamentSnap = await getDoc(tournamentRef)
          if (tournamentSnap.exists()) {
            const tournamentData = tournamentSnap.data() as FirestoreTournament
            tournamentName = tournamentData.name
          }

          // Get event
          const eventRef = doc(
            firestore,
            COLLECTION_PATHS.EVENTS(handData.tournamentId),
            handData.eventId
          )
          const eventSnap = await getDoc(eventRef)
          if (eventSnap.exists()) {
            const eventData = eventSnap.data() as FirestoreEvent
            eventName = eventData.name
          }

          // Get stream
          const streamRef = doc(
            firestore,
            COLLECTION_PATHS.STREAMS(handData.tournamentId, handData.eventId),
            handData.streamId
          )
          const streamSnap = await getDoc(streamRef)
          if (streamSnap.exists()) {
            const streamData = streamSnap.data() as FirestoreStream
            streamName = streamData.name
          }
        } catch (err) {
          console.error("Error fetching hierarchy info:", err)
        }
      }

      setHand({
        id: handSnap.id,
        number: handData.number,
        description: handData.description || "",
        stream: {
          id: handData.streamId || "",
          name: streamName || "Unknown Stream",
          event: {
            name: eventName || "Unknown Event",
            tournament: {
              name: tournamentName || "Unknown Tournament",
            },
          },
        },
      })

      // Fetch hand players from embedded data
      const players: HandPlayer[] = (handData.players || []).map((p, index) => ({
        id: `${handId}-player-${index}`,
        hand_id: handId,
        player_id: p.playerId,
        position: p.position || null,
        hole_cards: p.holeCards ? p.holeCards.join(" ") : null,
        player: {
          id: p.playerId,
          name: p.name,
        },
      }))

      setHandPlayers(players)
    } catch (error) {
      console.error("Failed to load hand data:", error)
      toast.error("Failed to load hand data")
    } finally {
      setLoading(false)
    }
  }

  function handleSaveActions() {
    if (pendingActions.length === 0) {
      toast.info("No pending actions to save")
      return
    }

    const actionsToSave = pendingActions.map(action => ({
      ...(action as Record<string, unknown>),
      handId: handId,
    }))

    bulkCreateMutation.mutate(actionsToSave as Parameters<typeof bulkCreateMutation.mutate>[0], {
      onSuccess: () => {
        toast.success("Actions saved successfully!")
        setPendingActions([])
        // Reload to show updated actions
        loadHandData()
      },
      onError: (error) => {
        console.error("Failed to save actions:", error)
        toast.error("Failed to save actions")
      },
    })
  }

  function handleDeleteAllActions() {
    if (!confirm("Are you sure you want to delete ALL actions for this hand?")) {
      return
    }

    deleteAllMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("All actions deleted")
        setPendingActions([])
        loadHandData()
      },
      onError: (error) => {
        console.error("Failed to delete actions:", error)
        toast.error("Failed to delete actions")
      },
    })
  }

  if (!hasAccess || loading) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <CardSkeleton count={3} />
      </div>
    )
  }

  if (!hand) {
    return (
      <div className="container max-w-7xl mx-auto py-16 px-4 text-center">
        <h2 className="text-title-lg mb-4">Hand not found</h2>
        <p className="text-body text-muted-foreground mb-6">
          The hand you are looking for does not exist.
        </p>
        <Link href="/archive">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Archive
          </Button>
        </Link>
      </div>
    )
  }

  const players = handPlayers.map(hp => ({
    id: hp.player_id,
    name: hp.player.name,
  }))

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/archive">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Archive
            </Button>
          </Link>
        </div>

        {/* Hand Info */}
        <Card className="p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-title-lg mb-2">
                Edit Hand Actions: #{hand.number}
              </h1>
              <p className="text-body text-muted-foreground mb-3">
                {hand.description}
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{hand.stream.event.tournament.name}</span>
                <span>&gt;</span>
                <span>{hand.stream.event.name}</span>
                <span>&gt;</span>
                <span>{hand.stream.name}</span>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Players */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Players</h3>
            <div className="flex flex-wrap gap-2">
              {handPlayers.map(hp => (
                <Badge key={hp.id} variant="secondary">
                  {hp.player.name}
                  {hp.position && ` (${hp.position})`}
                  {hp.hole_cards && ` - ${hp.hole_cards}`}
                </Badge>
              ))}
            </div>
          </div>
        </Card>

        {/* Action Editor */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-title">Hand Actions</h2>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteAllActions}
              disabled={deleteAllMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All Actions
            </Button>
          </div>

          <ActionEditor
            handId={handId}
            players={players}
            onActionsChange={() => {
              // This can be used to track changes if needed
            }}
            onPendingActionsChange={setPendingActions}
          />
        </Card>

        {/* Save Actions */}
        <div className="flex justify-end gap-3">
          <Link href="/archive">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button
            onClick={handleSaveActions}
            disabled={bulkCreateMutation.isPending || pendingActions.length === 0}
          >
            <Save className="h-4 w-4 mr-2" />
            {bulkCreateMutation.isPending ? "Saving..." : "Save Actions"}
          </Button>
        </div>
      </div>
  )
}
