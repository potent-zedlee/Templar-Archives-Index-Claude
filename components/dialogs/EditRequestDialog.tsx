"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/components/layout/AuthProvider"
import { useRouter } from "next/navigation"
import { ChevronRight, ChevronLeft } from "lucide-react"
import { createEditRequest, getHandDataForEdit, type EditType } from "@/lib/poker/hand-edit-requests"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

interface EditRequestDialogProps {
  handId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const EDIT_TYPES: { value: EditType; label: string; description: string }[] = [
  { value: "basic_info", label: "기본 정보", description: "핸드 번호, 설명, 타임스탬프 수정" },
  { value: "board", label: "보드 카드 & 팟", description: "커뮤니티 카드와 팟 사이즈 수정" },
  { value: "players", label: "플레이어 정보", description: "플레이어, 포지션, 홀카드, 스택 수정" },
  { value: "actions", label: "액션 히스토리", description: "베팅 액션 수정 (고급)" },
]

export function EditRequestDialog({ handId, open, onOpenChange }: EditRequestDialogProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Step 1: Edit type selection
  const [editType, setEditType] = useState<EditType>("basic_info")

  // Step 2: Edit data
  const [originalData, setOriginalData] = useState<any>(null)
  const [proposedData, setProposedData] = useState<any>({})

  // Step 3: Reason
  const [reason, setReason] = useState("")

  useEffect(() => {
    if (open && handId) {
      loadHandData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, handId])

  async function loadHandData() {
    setLoading(true)
    try {
      const data = await getHandDataForEdit(handId)
      setOriginalData(data)

      // Initialize proposed data based on edit type
      initializeProposedData(editType, data)
    } catch (error) {
      console.error("Error loading hand data:", error)
    } finally {
      setLoading(false)
    }
  }

  function initializeProposedData(type: EditType, data: any) {
    if (!data) return

    switch (type) {
      case "basic_info":
        setProposedData({
          description: data.hand.description || "",
          timestamp: data.hand.timestamp || ""
        })
        break
      case "board":
        setProposedData({
          board_cards: data.hand.board_cards || "",
          pot_size: data.hand.pot_size || 0
        })
        break
      case "players":
        setProposedData({
          players: data.players.map((p: any) => ({
            id: p.id,
            player_name: p.player?.name || "",
            position: p.position || "",
            cards: p.cards || "",
            starting_stack: p.starting_stack || 0,
            ending_stack: p.ending_stack || 0
          }))
        })
        break
      case "actions":
        setProposedData({
          actions: []
        })
        break
    }
  }

  function handleEditTypeChange(type: EditType) {
    setEditType(type)
    initializeProposedData(type, originalData)
  }

  function handleNext() {
    if (step < 3) {
      setStep(step + 1)
    }
  }

  function handleBack() {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  async function handleSubmit() {
    if (!user) {
      router.push("/auth/login")
      return
    }

    if (!reason.trim()) {
      alert("수정 이유를 입력해주세요")
      return
    }

    setSubmitting(true)
    try {
      await createEditRequest({
        handId,
        requesterId: user.id,
        requesterName: user.user_metadata?.name || user.email || "Anonymous",
        editType,
        originalData: getOriginalDataForType(editType),
        proposedData,
        reason
      })

      alert("수정 제안이 접수되었습니다. 관리자 검토 후 적용됩니다.")
      onOpenChange(false)
      resetForm()
    } catch (error: any) {
      console.error("Error creating edit request:", error)
      alert("수정 제안 접수 중 오류가 발생했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  function getOriginalDataForType(type: EditType) {
    if (!originalData) return {}

    switch (type) {
      case "basic_info":
        return {
          description: originalData.hand.description,
          timestamp: originalData.hand.timestamp
        }
      case "board":
        return {
          board_cards: originalData.hand.board_cards,
          pot_size: originalData.hand.pot_size
        }
      case "players":
        return {
          players: originalData.players
        }
      case "actions":
        return {
          actions: []
        }
    }
  }

  function resetForm() {
    setStep(1)
    setEditType("basic_info")
    setProposedData({})
    setReason("")
  }

  function handleOpenChange(newOpen: boolean) {
    if (!user && newOpen) {
      router.push("/auth/login")
      return
    }
    if (!newOpen) {
      resetForm()
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>핸드 수정 제안</DialogTitle>
          <DialogDescription>
            Step {step}/3: {step === 1 ? "수정 유형 선택" : step === 2 ? "수정 내용 입력" : "수정 이유 작성"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Edit Type Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <Label>수정할 항목을 선택하세요</Label>
              <div className="grid gap-3">
                {EDIT_TYPES.map((type) => (
                  <Card
                    key={type.value}
                    className={`p-4 cursor-pointer transition-colors ${
                      editType === type.value
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => handleEditTypeChange(type.value)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                        editType === type.value ? "border-primary" : "border-muted-foreground"
                      }`}>
                        {editType === type.value && (
                          <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{type.label}</h3>
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Edit Data Input */}
          {step === 2 && !loading && (
            <div className="space-y-4">
              {editType === "basic_info" && (
                <>
                  <div>
                    <Label htmlFor="description">핸드 설명</Label>
                    <Textarea
                      id="description"
                      value={proposedData.description || ""}
                      onChange={(e) => setProposedData({ ...proposedData, description: e.target.value })}
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="timestamp">타임스탬프 (MM:SS-MM:SS)</Label>
                    <Input
                      id="timestamp"
                      value={proposedData.timestamp || ""}
                      onChange={(e) => setProposedData({ ...proposedData, timestamp: e.target.value })}
                      placeholder="00:00-00:00"
                      className="mt-1"
                    />
                  </div>
                </>
              )}

              {editType === "board" && (
                <>
                  <div>
                    <Label htmlFor="board_cards">보드 카드 (예: As Kh Qd 7c 3s)</Label>
                    <Input
                      id="board_cards"
                      value={proposedData.board_cards || ""}
                      onChange={(e) => setProposedData({ ...proposedData, board_cards: e.target.value })}
                      placeholder="As Kh Qd"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pot_size">팟 사이즈</Label>
                    <Input
                      id="pot_size"
                      type="number"
                      value={proposedData.pot_size || 0}
                      onChange={(e) => setProposedData({ ...proposedData, pot_size: parseInt(e.target.value) || 0 })}
                      className="mt-1"
                    />
                  </div>
                </>
              )}

              {editType === "players" && (
                <div className="space-y-4">
                  <Label>플레이어 정보</Label>
                  {proposedData.players?.map((player: any, index: number) => (
                    <Card key={index} className="p-4">
                      <div className="space-y-3">
                        <div className="font-semibold">{player.player_name}</div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">포지션</Label>
                            <Input
                              value={player.position}
                              onChange={(e) => {
                                const newPlayers = [...proposedData.players]
                                newPlayers[index].position = e.target.value
                                setProposedData({ ...proposedData, players: newPlayers })
                              }}
                              placeholder="BTN"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">홀카드</Label>
                            <Input
                              value={player.cards}
                              onChange={(e) => {
                                const newPlayers = [...proposedData.players]
                                newPlayers[index].cards = e.target.value
                                setProposedData({ ...proposedData, players: newPlayers })
                              }}
                              placeholder="AA"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">시작 스택</Label>
                            <Input
                              type="number"
                              value={player.starting_stack}
                              onChange={(e) => {
                                const newPlayers = [...proposedData.players]
                                newPlayers[index].starting_stack = parseInt(e.target.value) || 0
                                setProposedData({ ...proposedData, players: newPlayers })
                              }}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">종료 스택</Label>
                            <Input
                              type="number"
                              value={player.ending_stack}
                              onChange={(e) => {
                                const newPlayers = [...proposedData.players]
                                newPlayers[index].ending_stack = parseInt(e.target.value) || 0
                                setProposedData({ ...proposedData, players: newPlayers })
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {editType === "actions" && (
                <div className="text-center py-8 text-muted-foreground">
                  액션 히스토리 수정은 현재 지원하지 않습니다.
                </div>
              )}

              {/* Preview */}
              <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                <div className="text-sm font-semibold mb-2">변경 사항 미리보기</div>
                <div className="text-xs text-muted-foreground">
                  수정된 내용은 관리자 승인 후 적용됩니다.
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Reason */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="reason">수정 이유</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={5}
                  placeholder="왜 이 수정이 필요한지 설명해주세요. 예: 영상에서 확인한 실제 값과 다름, 오타 수정 등"
                  className="mt-1"
                />
              </div>

              {/* Summary */}
              <Card className="p-4 bg-muted/30">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">수정 유형:</span>
                    <Badge>{EDIT_TYPES.find(t => t.value === editType)?.label}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">핸드:</span>
                    <span>#{originalData?.hand?.number}</span>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={submitting}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              이전
            </Button>
          )}
          {step < 3 ? (
            <Button onClick={handleNext} disabled={loading || editType === "actions"}>
              다음
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting || !reason.trim()}>
              {submitting ? "제출 중..." : "제출하기"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
