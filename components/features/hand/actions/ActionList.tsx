"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, ChevronsUp, ChevronsDown } from "lucide-react"
import type { HandAction } from "@/lib/poker/hand-actions"

type Player = {
  id: string
  name: string
}

type ActionListProps = {
  actions: HandAction[]
  players: Player[]
  onDelete: (actionId: string) => void
  onMoveUp?: (actionId: string) => void
  onMoveDown?: (actionId: string) => void
}

function getActionTypeColor(actionType: string): string {
  switch (actionType) {
    case 'fold':
      return 'bg-gray-500'
    case 'check':
      return 'bg-blue-500'
    case 'call':
      return 'bg-green-500'
    case 'bet':
      return 'bg-yellow-500'
    case 'raise':
      return 'bg-orange-500'
    case 'all-in':
      return 'bg-red-500'
    default:
      return 'bg-gray-500'
  }
}

function formatAmount(amount: number | undefined): string {
  if (amount === undefined || amount === 0) return '-'
  return `$${amount.toLocaleString()}`
}

export function ActionList({
  actions,
  players,
  onDelete,
  onMoveUp,
  onMoveDown,
}: ActionListProps) {
  if (actions.length === 0) {
    return (
      <Card className="p-8 text-center border-dashed">
        <p className="text-sm text-muted-foreground">
          No actions yet. Add your first action above.
        </p>
      </Card>
    )
  }

  // 시퀀스 순서로 정렬
  const sortedActions = [...actions].sort((a, b) => a.sequence - b.sequence)

  return (
    <div className="space-y-2">
      {sortedActions.map((action, index) => {
        const player = players.find(p => p.id === action.playerId)
        const isFirst = index === 0
        const isLast = index === sortedActions.length - 1

        return (
          <Card key={action.id} className="p-3 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between gap-3">
              {/* Sequence Number */}
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-semibold">
                {action.sequence}
              </div>

              {/* Player Name */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {player?.name || 'Unknown Player'}
                </p>
              </div>

              {/* Action Type */}
              <Badge className={`${getActionTypeColor(action.actionType)} text-white`}>
                {action.actionType.toUpperCase()}
              </Badge>

              {/* Amount */}
              <div className="text-sm font-semibold w-24 text-right">
                {formatAmount(action.amount)}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {/* Move Up */}
                {onMoveUp && !isFirst && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onMoveUp(action.id)}
                    title="Move up"
                  >
                    <ChevronsUp className="h-4 w-4" />
                  </Button>
                )}

                {/* Move Down */}
                {onMoveDown && !isLast && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onMoveDown(action.id)}
                    title="Move down"
                  >
                    <ChevronsDown className="h-4 w-4" />
                  </Button>
                )}

                {/* Delete */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(action.id)}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
