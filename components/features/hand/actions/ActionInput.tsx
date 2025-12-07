"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Plus, X } from "lucide-react"
import type { ActionType, HandActionInput } from "@/lib/poker/hand-actions"

type Player = {
  id: string
  name: string
}

type ActionInputProps = {
  handId: string
  players: Player[]
  street: string
  sequence: number
  onAdd: (action: Omit<HandActionInput, 'handId'>) => void
  onCancel: () => void
}

const ACTION_TYPES: { value: ActionType; label: string }[] = [
  { value: 'fold', label: 'Fold' },
  { value: 'check', label: 'Check' },
  { value: 'call', label: 'Call' },
  { value: 'bet', label: 'Bet' },
  { value: 'raise', label: 'Raise' },
  { value: 'all-in', label: 'All-In' },
]

export function ActionInput({
  players,
  street,
  sequence,
  onAdd,
  onCancel,
}: ActionInputProps) {
  const [playerId, setPlayerId] = useState<string>("")
  const [actionType, setActionType] = useState<ActionType | "">("")
  const [amount, setAmount] = useState<string>("")
  const [error, setError] = useState<string>("")

  const needsAmount = ['bet', 'raise', 'all-in'].includes(actionType)
  const cantHaveAmount = ['fold', 'check'].includes(actionType)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    // 유효성 검증
    if (!playerId) {
      setError("Please select a player")
      return
    }

    if (!actionType) {
      setError("Please select an action type")
      return
    }

    if (needsAmount && (!amount || parseFloat(amount) <= 0)) {
      setError("Please enter a valid amount")
      return
    }

    if (cantHaveAmount && amount && parseFloat(amount) !== 0) {
      setError("Fold/Check cannot have an amount")
      return
    }

    // 액션 추가
    onAdd({
      playerId: playerId,
      street: street as any,
      actionType: actionType as ActionType,
      amount: needsAmount ? parseInt(amount) : 0,
      actionOrder: sequence,
      sequence,
    })

    // 폼 초기화
    setPlayerId("")
    setActionType("")
    setAmount("")
  }

  return (
    <Card className="p-4 border-dashed">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold">Add Action #{sequence}</h4>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Player */}
          <div className="space-y-2">
            <Label htmlFor="player">Player</Label>
            <Select value={playerId} onValueChange={setPlayerId}>
              <SelectTrigger id="player">
                <SelectValue placeholder="Select player" />
              </SelectTrigger>
              <SelectContent>
                {players.map(player => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Type */}
          <div className="space-y-2">
            <Label htmlFor="action-type">Action</Label>
            <Select value={actionType} onValueChange={(v) => setActionType(v as ActionType)}>
              <SelectTrigger id="action-type">
                <SelectValue placeholder="Select action" />
              </SelectTrigger>
              <SelectContent>
                {ACTION_TYPES.map(action => (
                  <SelectItem key={action.value} value={action.value}>
                    {action.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">
              Amount {needsAmount && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="amount"
              type="number"
              placeholder={needsAmount ? "Enter amount" : "-"}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={cantHaveAmount}
              min="0"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <div className="flex gap-2">
          <Button type="submit" size="sm" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Action
          </Button>
        </div>
      </form>
    </Card>
  )
}
