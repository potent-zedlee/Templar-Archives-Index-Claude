"use client"

/**
 * Admin Edit Hand Actions Page
 *
 * Edit hand actions for admin users.
 * Migrated from Supabase to Firestore
 */

import { useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Save, Trash2 } from "lucide-react"
import { useAuth } from "@/components/layout/AuthProvider"
import { ActionEditor } from "@/components/features/hand/actions/ActionEditor"
import {
  useBulkCreateHandActionsMutation,
  useDeleteAllHandActionsMutation,
} from "@/lib/queries/hand-actions-queries"
import { useHandDetailQuery } from "@/lib/queries/archive-queries"
import { toast } from "sonner"
import { CardSkeleton } from "@/components/ui/skeletons/CardSkeleton"
import Link from "next/link"

export default function EditHandActionsPage() {
  const params = useParams()
  const { user } = useAuth()

  const handId = params.id as string
  // Check if user is admin (simplified check for UI, real check in backend/hook)
  // We can rely on the hook to return null/error if not allowed, or check user role here if needed.
  // For now we assume if user is logged in they can see it, but we should probably check claim.
  const hasAccess = !!user
  const { data: hand, isLoading: loading, refetch } = useHandDetailQuery(hasAccess ? handId : null)

  const handPlayers = hand?.handPlayers?.map((p, index) => ({
    id: `${handId}-player-${index}`,
    hand_id: handId,
    player_id: p.playerId,
    position: p.pokerPosition || null,
    hole_cards: p.holeCards ? p.holeCards.join(" ") : null,
    player: {
      id: p.playerId,
      name: p.player?.name || 'Unknown',
    },
  })) || []

  // Pending actions from ActionEditor
  const [pendingActions, setPendingActions] = useState<unknown[]>([])

  // Mutations
  const handPlayerIds = handPlayers.map(hp => hp.player_id)
  const bulkCreateMutation = useBulkCreateHandActionsMutation(handId, handPlayerIds)
  const deleteAllMutation = useDeleteAllHandActionsMutation(handId, handPlayerIds)

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
        refetch()
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
        refetch()
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
              <span>{hand.stream?.event?.tournament?.name || 'Unknown Tournament'}</span>
              <span>&gt;</span>
              <span>{hand.stream?.event?.name || 'Unknown Event'}</span>
              <span>&gt;</span>
              <span>{hand.stream?.name || 'Unknown Stream'}</span>
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
