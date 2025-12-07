"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { updateHandComplete } from "@/lib/poker/hand-mutations"
import type { HandHistory } from "@/lib/types/hand-history"
import { Loader2, Plus, Trash2 } from "lucide-react"

type EditHandDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  hand: HandHistory & { id?: string }
  handId: string
  onSuccess?: () => void
}

type PlayerEdit = {
  id: string
  name: string
  position: string
  cards: string
  starting_stack: number
  ending_stack: number
}

const POSITIONS = ['UTG', 'UTG+1', 'MP', 'HJ', 'CO', 'BTN', 'SB', 'BB']

export function EditHandDialog({
  open,
  onOpenChange,
  hand,
  handId,
  onSuccess,
}: EditHandDialogProps) {
  const [loading, setLoading] = useState(false)

  // 기본 정보
  const [handNumber, setHandNumber] = useState(hand.handNumber || "")
  const [description, setDescription] = useState(hand.summary || "")
  const [timestamp, setTimestamp] = useState(`${hand.startTime}-${hand.endTime}` || "")
  const [potSize, setPotSize] = useState(hand.potSize?.toString() || "0")
  const [boardCards, setBoardCards] = useState(hand.boardCards || "")

  // 플레이어 정보
  const [players, setPlayers] = useState<PlayerEdit[]>([])

  useEffect(() => {
    if (hand.players && hand.players.length > 0) {
      const initialPlayers: PlayerEdit[] = hand.players.map((p, _) => ({
        id: `player-${_}`,
        name: p.name || "",
        position: p.position || "",
        cards: p.cards || "",
        starting_stack: p.stack || 0,
        ending_stack: p.stack || 0,
      }))
      setPlayers(initialPlayers)
    }
  }, [hand])

  const addPlayer = () => {
    setPlayers([
      ...players,
      {
        id: `player-${Date.now()}`,
        name: "",
        position: "",
        cards: "",
        starting_stack: 0,
        ending_stack: 0,
      },
    ])
  }

  const removePlayer = (id: string) => {
    setPlayers(players.filter((p) => p.id !== id))
  }

  const updatePlayer = (id: string, field: keyof PlayerEdit, value: any) => {
    setPlayers(
      players.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    )
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await updateHandComplete(handId, {
        basicInfo: {
          number: handNumber,
          description,
          timestamp,
          potSize: parseInt(potSize) || 0,
          boardCards: boardCards,
        },
        // players: players.map((p) => ({
        //   id: p.id, // 실제로는 hand_player_id가 필요
        //   position: p.position,
        //   cards: p.cards,
        //   startingStack: p.starting_stack,
        //   endingStack: p.ending_stack,
        // })),
      })

      toast.success("핸드 정보가 수정되었습니다")
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error("핸드 수정 실패:", error)
      toast.error("핸드 수정에 실패했습니다")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>핸드 수정</DialogTitle>
          <DialogDescription>
            핸드의 정보를 수정할 수 있습니다. 변경 사항은 즉시 저장됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 기본 정보 */}
          <div className="space-y-4">
            <h3 className="text-body font-semibold">기본 정보</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="handNumber">핸드 번호</Label>
                <Input
                  id="handNumber"
                  value={handNumber}
                  onChange={(e) => setHandNumber(e.target.value)}
                  placeholder="001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timestamp">타임스탬프</Label>
                <Input
                  id="timestamp"
                  value={timestamp}
                  onChange={(e) => setTimestamp(e.target.value)}
                  placeholder="05:30-07:45"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">설명</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="타카자와 오픈레이즈, 모두 폴드"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="potSize">POT 크기</Label>
                <Input
                  id="potSize"
                  type="number"
                  value={potSize}
                  onChange={(e) => setPotSize(e.target.value)}
                  placeholder="150000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="boardCards">보드 카드</Label>
                <Input
                  id="boardCards"
                  value={boardCards}
                  onChange={(e) => setBoardCards(e.target.value)}
                  placeholder="As Kh Qd 7c 3s"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* 플레이어 정보 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-body font-semibold">플레이어 ({players.length})</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={addPlayer}
              >
                <Plus className="h-4 w-4 mr-1" />
                플레이어 추가
              </Button>
            </div>

            <div className="space-y-3">
              {players.map((player) => (
                <Card key={player.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-caption">이름</Label>
                          <Input
                            value={player.name}
                            onChange={(e) =>
                              updatePlayer(player.id, "name", e.target.value)
                            }
                            placeholder="Player Name"
                            disabled
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-caption">포지션</Label>
                          <Select
                            value={player.position}
                            onValueChange={(value) =>
                              updatePlayer(player.id, "position", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="선택" />
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

                        <div className="space-y-1">
                          <Label className="text-caption">홀카드</Label>
                          <Input
                            value={player.cards}
                            onChange={(e) =>
                              updatePlayer(player.id, "cards", e.target.value)
                            }
                            placeholder="AhKh"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-caption">시작 스택</Label>
                          <Input
                            type="number"
                            value={player.starting_stack}
                            onChange={(e) =>
                              updatePlayer(
                                player.id,
                                "starting_stack",
                                parseInt(e.target.value) || 0
                              )
                            }
                            placeholder="100000"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-caption">종료 스택</Label>
                          <Input
                            type="number"
                            value={player.ending_stack}
                            onChange={(e) =>
                              updatePlayer(
                                player.id,
                                "ending_stack",
                                parseInt(e.target.value) || 0
                              )
                            }
                            placeholder="120000"
                          />
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePlayer(player.id)}
                      className="mt-6"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}

              {players.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  플레이어가 없습니다. &quot;플레이어 추가&quot; 버튼을 클릭하세요.
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            취소
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
