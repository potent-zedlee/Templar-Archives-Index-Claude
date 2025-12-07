"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ThumbsUp, ThumbsDown, Pencil, ChevronDown, ChevronRight, Bookmark, Edit, List, UserPlus } from "lucide-react"
import { useAuth } from "@/components/layout/AuthProvider"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { HandHistory } from "@/lib/types/hand-history"
import { getHandLikeStatus, toggleHandLike, type HandLikeStatus } from "@/lib/poker/hand-likes"
import { isHandBookmarked, addHandBookmark, removeHandBookmark } from "@/lib/poker/hand-bookmarks"
import { EditHandDialog } from "@/components/dialogs/EditHandDialog"
import { EditRequestDialog } from "@/components/dialogs/EditRequestDialog"
import { BookmarkDialog } from "@/components/dialogs/BookmarkDialog"
import { isAdmin } from "@/lib/auth/auth-utils"
import { HandComments } from "@/components/features/hand/HandComments"
import { HandTagBadges } from "@/components/features/hand/HandTagBadges"
import { AddPlayersDialog } from "@/components/features/player/AddPlayersDialog"
import { HandHistoryTimeline } from "@/components/features/hand/HandHistoryTimeline"
import { useHandPlayersQuery } from "@/lib/queries/hand-players-queries"

type HandHistoryDetailProps = {
  hand: HandHistory
  handId?: string // 데이터베이스 ID (선택적)
  onUpdate?: () => void // 수정 후 콜백
  onCommentsCountChange?: (count: number) => void // 댓글 개수 변경 콜백
}

export function HandHistoryDetail({ hand, handId, onUpdate, onCommentsCountChange }: HandHistoryDetailProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [likeStatus, setLikeStatus] = useState<HandLikeStatus>({
    userVote: null,
    likesCount: 0,
    dislikesCount: 0,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false)
  const [bookmarkDialogOpen, setBookmarkDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editRequestDialogOpen, setEditRequestDialogOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [playersOpen, setPlayersOpen] = useState(false)
  const [tagsOpen, setTagsOpen] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [addPlayersDialogOpen, setAddPlayersDialogOpen] = useState(false)

  // 핸드 플레이어 목록 조회
  const { data: handPlayers = [] } = useHandPlayersQuery(handId || '')

  // 사용자 정보 로드
  useEffect(() => {
    async function loadUser() {
      if (user?.email) {
        setUserEmail(user.email)
      }
    }
    loadUser()
  }, [user])

  // 좋아요 상태 로드
  useEffect(() => {
    if (handId) {
      loadLikeStatus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handId, user?.id])

  // 북마크 상태 로드
  useEffect(() => {
    if (handId) {
      loadBookmarkStatus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handId, user?.id])

  const loadLikeStatus = async () => {
    if (!handId) return
    try {
      const status = await getHandLikeStatus(handId, user?.id)
      setLikeStatus(status)
    } catch (error) {
      console.error('좋아요 상태 로드 실패:', error)
    }
  }

  const loadBookmarkStatus = async () => {
    if (!handId) return
    try {
      const bookmarked = await isHandBookmarked(handId, user?.id)
      setIsBookmarked(bookmarked)
    } catch (error) {
      console.error('북마크 상태 로드 실패:', error)
    }
  }

  const handleLike = async (voteType: 'like' | 'dislike') => {
    if (!user) {
      toast.error('Login이 필요합니다.')
      router.push('/auth/login')
      return
    }

    if (!handId) {
      toast.error('핸드 ID가 없습니다.')
      return
    }

    setIsLoading(true)
    try {
      const newVote = await toggleHandLike(handId, user.id, voteType)

      // 낙관적 UI 업데이트
      setLikeStatus((prev) => {
        const newStatus = { ...prev, userVote: newVote }

        // 카운트 업데이트
        if (prev.userVote === 'like' && newVote === null) {
          // 좋아요 취소
          newStatus.likesCount = Math.max(0, prev.likesCount - 1)
        } else if (prev.userVote === 'dislike' && newVote === null) {
          // 싫어요 취소
          newStatus.dislikesCount = Math.max(0, prev.dislikesCount - 1)
        } else if (prev.userVote === null && newVote === 'like') {
          // 좋아요 추가
          newStatus.likesCount = prev.likesCount + 1
        } else if (prev.userVote === null && newVote === 'dislike') {
          // 싫어요 추가
          newStatus.dislikesCount = prev.dislikesCount + 1
        } else if (prev.userVote === 'like' && newVote === 'dislike') {
          // 좋아요 → 싫어요
          newStatus.likesCount = Math.max(0, prev.likesCount - 1)
          newStatus.dislikesCount = prev.dislikesCount + 1
        } else if (prev.userVote === 'dislike' && newVote === 'like') {
          // 싫어요 → 좋아요
          newStatus.dislikesCount = Math.max(0, prev.dislikesCount - 1)
          newStatus.likesCount = prev.likesCount + 1
        }

        return newStatus
      })
    } catch (error) {
      console.error('좋아요 토글 실패:', error)
      toast.error('좋아요 처리에 실패했습니다.')
      // 실패 시 다시 로드
      loadLikeStatus()
    } finally {
      setIsLoading(false)
    }
  }

  const handleBookmark = async () => {
    if (!user) {
      toast.error('Login required')
      router.push('/auth/login')
      return
    }

    if (!handId) {
      toast.error('Hand ID is missing')
      return
    }

    // If already bookmarked, remove it
    if (isBookmarked) {
      setIsBookmarkLoading(true)
      try {
        await removeHandBookmark(handId, user.id)
        setIsBookmarked(false)
        toast.success('Bookmark removed')
      } catch (error) {
        console.error('Failed to remove bookmark:', error)
        toast.error('Failed to remove bookmark')
      } finally {
        setIsBookmarkLoading(false)
      }
    } else {
      // If not bookmarked, open dialog
      setBookmarkDialogOpen(true)
    }
  }

  const handleSaveBookmark = async (folderName: string | null, notes: string) => {
    if (!user || !handId) return

    try {
      await addHandBookmark(handId, user.id, folderName || undefined, notes || undefined)
      setIsBookmarked(true)
      toast.success('Bookmark added')
    } catch (error) {
      console.error('Failed to add bookmark:', error)
      toast.error('Failed to add bookmark')
      throw error
    }
  }

  return (
    <div className="space-y-4 p-4">
      {/* 헤더 정보 */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-title font-semibold">#{hand.handNumber}</h3>
            <Badge variant="outline">
              신뢰도 {hand.confidence}%
            </Badge>
          </div>
          <p className="text-caption text-muted-foreground">
            {hand.startTime} - {hand.endTime} ({hand.duration}초)
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {hand.winner && (
            <div className="text-right">
              <p className="text-body font-medium text-green-600">
                🏆 {hand.winner}
              </p>
              <p className="text-caption text-muted-foreground">
                {hand.winAmount?.toLocaleString()} 칩 획득
              </p>
            </div>
          )}

          {/* 수정/좋아요 버튼 */}
          {handId && (
            <div className="flex items-center gap-2">
              {/* 수정 버튼 (관리자만) */}
              {isAdmin(userEmail) && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddPlayersDialogOpen(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Add Players
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditDialogOpen(true)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    수정
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/admin/hands/${handId}/edit-actions`)}
                  >
                    <List className="h-4 w-4 mr-1" />
                    Edit Actions
                  </Button>
                </>
              )}

              {/* 수정 제안 버튼 (일반 사용자) */}
              {!isAdmin(userEmail) && user && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditRequestDialogOpen(true)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  수정 제안
                </Button>
              )}

              {/* 북마크 버튼 */}
              <Button
                variant={isBookmarked ? 'default' : 'outline'}
                size="sm"
                onClick={handleBookmark}
                disabled={isBookmarkLoading}
                className="gap-1"
              >
                <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
              </Button>

              {/* 좋아요/싫어요 버튼 */}
              <Button
                variant={likeStatus.userVote === 'like' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleLike('like')}
                disabled={isLoading}
                className="gap-1"
              >
                <ThumbsUp className="h-4 w-4" />
                <span className="text-xs">{likeStatus.likesCount}</span>
              </Button>
              <Button
                variant={likeStatus.userVote === 'dislike' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => handleLike('dislike')}
                disabled={isLoading}
                className="gap-1"
              >
                <ThumbsDown className="h-4 w-4" />
                <span className="text-xs">{likeStatus.dislikesCount}</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Hand History Timeline */}
      {handId && (
        <div className="space-y-3">
          <h4 className="text-body font-semibold">Hand History</h4>
          <HandHistoryTimeline handId={handId} />
        </div>
      )}

      {/* 팟 정보 */}
      {hand.potSize && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-body font-medium">최종 POT</span>
            <span className="text-body-lg font-bold">
              {hand.potSize.toLocaleString()} 칩
            </span>
          </div>
        </Card>
      )}

      {/* Player 목록 (접을 수 있음) */}
      <Collapsible open={playersOpen} onOpenChange={setPlayersOpen}>
        <Card className="p-4">
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            <h4 className="text-body font-semibold">Player 칩 카운트</h4>
            {playersOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>포지션</TableHead>
                  <TableHead>홀카드</TableHead>
                  <TableHead className="text-right">칩 스택</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hand.players?.map((player, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{player.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{player.position || "-"}</Badge>
                    </TableCell>
                    <TableCell>
                      {player.cards ? (
                        <span className="font-mono text-sm font-semibold">
                          {player.cards}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {player.stack?.toLocaleString() || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Tags (접을 수 있음) */}
      {handId && (
        <Collapsible open={tagsOpen} onOpenChange={setTagsOpen}>
          <Card className="p-4">
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <h4 className="text-body font-semibold">Tags</h4>
              {tagsOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <HandTagBadges handId={handId} />
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* 수정 다이얼로그 (관리자) */}
      {handId && (
        <EditHandDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          hand={hand}
          handId={handId}
          onSuccess={() => {
            toast.success("핸드가 수정되었습니다")
            onUpdate?.()
          }}
        />
      )}

      {/* 수정 제안 다이얼로그 (일반 사용자) */}
      {handId && (
        <EditRequestDialog
          handId={handId}
          open={editRequestDialogOpen}
          onOpenChange={setEditRequestDialogOpen}
        />
      )}

      {/* 북마크 다이얼로그 */}
      {handId && (
        <BookmarkDialog
          open={bookmarkDialogOpen}
          onOpenChange={setBookmarkDialogOpen}
          onSave={handleSaveBookmark}
          userId={user?.id}
          mode="add"
        />
      )}

      {/* Add Players 다이얼로그 */}
      {handId && (
        <AddPlayersDialog
          open={addPlayersDialogOpen}
          onOpenChange={setAddPlayersDialogOpen}
          handId={handId}
          existingPlayerIds={handPlayers.map(p => p.playerId)}
        />
      )}

      {/* 댓글 섹션 (접을 수 있음) */}
      {handId && (
        <Collapsible open={commentsOpen} onOpenChange={setCommentsOpen}>
          <Card className="p-4">
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <h4 className="text-body font-semibold">댓글</h4>
              {commentsOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <HandComments
                handId={handId}
                onCommentsCountChange={onCommentsCountChange}
              />
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  )
}
