/**
 * Add Player Dialog
 *
 * 새로운 플레이어를 추가하는 다이얼로그
 */

'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createPlayer, type Player } from '@/lib/poker/hand-players'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface AddPlayerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPlayerCreated: (player: Player) => void
  suggestedName?: string
}

export function AddPlayerDialog({
  open,
  onOpenChange,
  onPlayerCreated,
  suggestedName,
}: AddPlayerDialogProps) {
  const [name, setName] = useState('')
  const [country, setCountry] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 다이얼로그 열릴 때 suggestedName으로 초기화
  useEffect(() => {
    if (open && suggestedName) {
      setName(suggestedName)
    }
  }, [open, suggestedName])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('플레이어 이름을 입력해주세요')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await createPlayer({
        name: name.trim(),
        country: country.trim() || undefined,
        photoUrl: photoUrl.trim() || undefined,
      })

      if (result.success && result.player) {
        toast.success('플레이어가 추가되었습니다')
        onPlayerCreated(result.player)
        handleClose()
      } else {
        toast.error(result.error || '플레이어 추가에 실패했습니다')
      }
    } catch (error) {
      console.error('플레이어 추가 오류:', error)
      toast.error('플레이어 추가 중 오류가 발생했습니다')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setName('')
    setCountry('')
    setPhotoUrl('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>새 플레이어 추가</DialogTitle>
          <DialogDescription>
            플레이어 정보를 입력하여 새로운 플레이어를 추가합니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 플레이어 이름 */}
          <div className="space-y-2">
            <Label htmlFor="player-name">
              플레이어 이름 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="player-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: Phil Ivey"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* 국적 */}
          <div className="space-y-2">
            <Label htmlFor="player-country">국적 (선택)</Label>
            <Input
              id="player-country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="예: USA"
              disabled={isSubmitting}
            />
          </div>

          {/* 사진 URL */}
          <div className="space-y-2">
            <Label htmlFor="player-photo">사진 URL (선택)</Label>
            <Input
              id="player-photo"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://example.com/photo.jpg"
              type="url"
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  추가 중...
                </>
              ) : (
                '플레이어 추가'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
