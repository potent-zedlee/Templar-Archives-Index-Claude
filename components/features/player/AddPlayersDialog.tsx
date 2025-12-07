"use client"

/**
 * Add Players Dialog
 *
 * 핸드에 플레이어를 추가하는 다이얼로그
 */

import { useState, useMemo } from "react"
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAllPlayersQuery } from "@/lib/queries/hand-players-queries"
import { useAddPlayerMutation } from "@/lib/queries/hand-players-queries"
import { POSITIONS } from "@/lib/poker/hand-players"
import { toast } from "sonner"

type AddPlayersDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  handId: string
  existingPlayerIds: string[]
}

type SelectedPlayer = {
  id: string
  name: string
  photoUrl: string | null
  position: string
  cards: string
  startingStack: string
}

export function AddPlayersDialog({
  open,
  onOpenChange,
  handId,
  existingPlayerIds,
}: AddPlayersDialogProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPlayers, setSelectedPlayers] = useState<SelectedPlayer[]>([])

  const { data: allPlayers = [], isLoading } = useAllPlayersQuery()
  const addPlayerMutation = useAddPlayerMutation(handId)

  // Filter players
  const filteredPlayers = useMemo(() => {
    return allPlayers.filter(player => {
      // Exclude already added players
      if (existingPlayerIds.includes(player.id)) return false

      // Search filter
      if (searchQuery && !player.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }

      return true
    })
  }, [allPlayers, existingPlayerIds, searchQuery])

  // Check if player is selected
  const isPlayerSelected = (playerId: string) => {
    return selectedPlayers.some(p => p.id === playerId)
  }

  // Toggle player selection
  const togglePlayer = (playerId: string) => {
    const player = allPlayers.find(p => p.id === playerId)
    if (!player) return

    if (isPlayerSelected(playerId)) {
      setSelectedPlayers(prev => prev.filter(p => p.id !== playerId))
    } else {
      setSelectedPlayers(prev => [
        ...prev,
        {
          id: player.id,
          name: player.name,
          photoUrl: player.photoUrl,
          position: '',
          cards: '',
          startingStack: '',
        },
      ])
    }
  }

  // Update selected player data
  const updateSelectedPlayer = (
    playerId: string,
    field: 'position' | 'cards' | 'startingStack',
    value: string
  ) => {
    setSelectedPlayers(prev =>
      prev.map(p => (p.id === playerId ? { ...p, [field]: value } : p))
    )
  }

  // Add all selected players
  const handleAddPlayers = async () => {
    if (selectedPlayers.length === 0) {
      toast.error('Please select at least one player')
      return
    }

    let successCount = 0
    let errorCount = 0

    for (const player of selectedPlayers) {
      const result = await addPlayerMutation.mutateAsync({
        playerId: player.id,
        position: player.position || undefined,
        cards: player.cards || undefined,
        startingStack: player.startingStack ? parseInt(player.startingStack) : undefined,
      })

      if (result.success) {
        successCount++
      } else {
        errorCount++
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} player(s) added successfully`)
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} player(s) failed to add`)
    }

    // Reset and close
    setSelectedPlayers([])
    setSearchQuery('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Add Players to Hand</DialogTitle>
          <DialogDescription>
            Select players and assign their positions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search */}
          <div>
            <Input
              type="text"
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Player List */}
          <ScrollArea className="h-[300px] border rounded-md p-4">
            {isLoading ? (
              <div className="text-center text-muted-foreground py-8">
                Loading players...
              </div>
            ) : filteredPlayers.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No players found
              </div>
            ) : (
              <div className="space-y-2">
                {filteredPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center space-x-3 p-2 hover:bg-accent rounded-md"
                  >
                    <Checkbox
                      checked={isPlayerSelected(player.id)}
                      onCheckedChange={() => togglePlayer(player.id)}
                    />
                    {player.photoUrl && (
                      <div className="w-10 h-10 rounded-full relative overflow-hidden">
                        <Image
                          src={player.photoUrl}
                          alt={player.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{player.name}</div>
                      {player.country && (
                        <div className="text-sm text-muted-foreground">
                          {player.country}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Selected Players Configuration */}
          {selectedPlayers.length > 0 && (
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-semibold text-sm">
                Selected Players ({selectedPlayers.length})
              </h4>
              <ScrollArea className="h-[200px]">
                <div className="space-y-4 pr-4">
                  {selectedPlayers.map((player) => (
                    <div
                      key={player.id}
                      className="grid grid-cols-4 gap-3 items-end p-3 bg-accent rounded-md"
                    >
                      <div className="col-span-4 sm:col-span-1">
                        <Label className="text-xs">Player</Label>
                        <div className="font-medium text-sm mt-1">{player.name}</div>
                      </div>
                      <div>
                        <Label className="text-xs">Position</Label>
                        <Select
                          value={player.position}
                          onValueChange={(value) =>
                            updateSelectedPlayer(player.id, 'position', value)
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {POSITIONS.map((pos) => (
                              <SelectItem key={pos} value={pos}>
                                {pos}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Cards</Label>
                        <Input
                          placeholder="AA, KK..."
                          value={player.cards}
                          onChange={(e) =>
                            updateSelectedPlayer(player.id, 'cards', e.target.value)
                          }
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Starting Stack</Label>
                        <Input
                          type="number"
                          placeholder="10000"
                          value={player.startingStack}
                          onChange={(e) =>
                            updateSelectedPlayer(player.id, 'startingStack', e.target.value)
                          }
                          className="h-9"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAddPlayers}
            disabled={selectedPlayers.length === 0 || addPlayerMutation.isPending}
          >
            {addPlayerMutation.isPending
              ? 'Adding...'
              : `Add ${selectedPlayers.length} Player(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
