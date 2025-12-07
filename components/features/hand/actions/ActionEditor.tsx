"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Plus } from "lucide-react"
import { StreetTabs } from "./StreetTabs"
import { ActionInput } from "./ActionInput"
import { ActionList } from "./ActionList"
import {
  useHandActionsQuery,
  useDeleteHandActionMutation,
  useReorderHandActionsMutation,
} from "@/lib/queries/hand-actions-queries"
import type { Street, HandActionInput } from "@/lib/poker/hand-actions"
import { toast } from "sonner"

type Player = {
  id: string
  name: string
}

type ActionEditorProps = {
  handId: string
  players: Player[]
  onActionsChange?: () => void
  onPendingActionsChange?: (actions: Omit<HandActionInput, 'handId'>[]) => void
}

export function ActionEditor({
  handId,
  players,
  onActionsChange,
  onPendingActionsChange,
}: ActionEditorProps) {
  const [activeStreet, setActiveStreet] = useState<Street>('preflop')
  const [isAddingAction, setIsAddingAction] = useState(false)
  const [pendingActions, setPendingActions] = useState<Omit<HandActionInput, 'handId'>[]>([])

  // Fetch actions
  const { data: actions = [], isLoading } = useHandActionsQuery(handId)
  const deleteActionMutation = useDeleteHandActionMutation(handId)
  const reorderActionsMutation = useReorderHandActionsMutation(handId, activeStreet)

  // Filter actions by street
  const streetActions = useMemo(() => {
    return actions.filter(action => action.street === activeStreet)
  }, [actions, activeStreet])

  // Calculate action counts per street
  const actionCounts = useMemo(() => {
    return {
      preflop: actions.filter(a => a.street === 'preflop').length,
      flop: actions.filter(a => a.street === 'flop').length,
      turn: actions.filter(a => a.street === 'turn').length,
      river: actions.filter(a => a.street === 'river').length,
    }
  }, [actions])

  // Calculate next sequence number
  const nextSequence = useMemo(() => {
    const streetActionsList = [...streetActions, ...pendingActions.filter(a => a.street === activeStreet)]
    if (streetActionsList.length === 0) return 1
    const maxSequence = Math.max(...streetActionsList.map(a => a.sequence))
    return maxSequence + 1
  }, [streetActions, pendingActions, activeStreet])

  // Notify parent when pending actions change
  useEffect(() => {
    onPendingActionsChange?.(pendingActions)
  }, [pendingActions, onPendingActionsChange])

  function handleAddPendingAction(action: Omit<HandActionInput, 'handId'>) {
    setPendingActions(prev => [...prev, action])
    setIsAddingAction(false)
    toast.success('Action added (not saved yet)')
  }

  function handleDeleteAction(actionId: string) {
    deleteActionMutation.mutate(actionId, {
      onSuccess: () => {
        toast.success('Action deleted')
        onActionsChange?.()
      },
      onError: (error) => {
        console.error('Failed to delete action:', error)
        toast.error('Failed to delete action')
      },
    })
  }

  function handleMoveUp(actionId: string) {
    const currentIndex = streetActions.findIndex(a => a.id === actionId)
    if (currentIndex <= 0) return

    const newOrder = [...streetActions]
    const temp = newOrder[currentIndex]
    newOrder[currentIndex] = newOrder[currentIndex - 1]
    newOrder[currentIndex - 1] = temp

    reorderActionsMutation.mutate(newOrder.map(a => a.id), {
      onSuccess: () => {
        toast.success('Action moved up')
      },
      onError: (error) => {
        console.error('Failed to reorder actions:', error)
        toast.error('Failed to reorder actions')
      },
    })
  }

  function handleMoveDown(actionId: string) {
    const currentIndex = streetActions.findIndex(a => a.id === actionId)
    if (currentIndex >= streetActions.length - 1) return

    const newOrder = [...streetActions]
    const temp = newOrder[currentIndex]
    newOrder[currentIndex] = newOrder[currentIndex + 1]
    newOrder[currentIndex + 1] = temp

    reorderActionsMutation.mutate(newOrder.map(a => a.id), {
      onSuccess: () => {
        toast.success('Action moved down')
      },
      onError: (error) => {
        console.error('Failed to reorder actions:', error)
        toast.error('Failed to reorder actions')
      },
    })
  }

  // Get pending actions for current street
  const pendingStreetActions = pendingActions.filter(a => a.street === activeStreet)

  if (isLoading) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">Loading actions...</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Street Tabs */}
      <StreetTabs
        activeStreet={activeStreet}
        onStreetChange={setActiveStreet}
        actionCounts={actionCounts}
      />

      {/* Saved Actions */}
      {streetActions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Saved Actions</h3>
          <ActionList
            actions={streetActions}
            players={players}
            onDelete={handleDeleteAction}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
          />
        </div>
      )}

      {/* Pending Actions (not saved yet) */}
      {pendingStreetActions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-orange-600">
            Pending Actions (not saved yet)
          </h3>
          <ActionList
            actions={pendingStreetActions.map((action, index) => ({
              ...action,
              id: `pending-${index}`,
              handId: handId,
              createdAt: new Date().toISOString(),
            }))}
            players={players}
            onDelete={(id) => {
              const index = parseInt(id.replace('pending-', ''))
              setPendingActions(prev => prev.filter((_, i) => i !== index))
              toast.success('Pending action removed')
            }}
          />
        </div>
      )}

      {/* Add Action Input */}
      {isAddingAction ? (
        <ActionInput
          handId={handId}
          players={players}
          street={activeStreet}
          sequence={nextSequence}
          onAdd={handleAddPendingAction}
          onCancel={() => setIsAddingAction(false)}
        />
      ) : (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setIsAddingAction(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Action
        </Button>
      )}

      {/* Expose pending actions for parent to save */}
      {pendingActions.length > 0 && (
        <Card className="p-4 bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
          <p className="text-sm text-orange-800 dark:text-orange-200">
            You have {pendingActions.length} pending action(s) that need to be saved.
            Click &quot;Save Actions&quot; at the bottom to persist these changes.
          </p>
        </Card>
      )}
    </div>
  )
}

// Export helper to get pending actions
export function useActionEditorState() {
  const [pendingActions, setPendingActions] = useState<Omit<HandActionInput, 'handId'>[]>([])

  return {
    pendingActions,
    setPendingActions,
    getPendingActionsToSave: (handId: string) =>
      pendingActions.map(action => ({
        ...action,
        handId: handId,
      })),
    clearPendingActions: () => setPendingActions([]),
  }
}
