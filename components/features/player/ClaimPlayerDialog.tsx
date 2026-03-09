"use client"

import { useState } from "react"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import { requestPlayerClaim, type VerificationMethod } from "@/lib/player-claims"
import { useAuth } from "@/components/layout/AuthProvider"

/**
 * 플레이어 타입
 */
type PlayerForClaim = {
  id: string
  name: string
  photoUrl?: string | null
  photo_url?: string | null  // Supabase 호환
  country?: string | null
}

type ClaimPlayerDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  player: PlayerForClaim
  onSuccess?: () => void
}

export function ClaimPlayerDialog({
  open,
  onOpenChange,
  player,
  onSuccess,
}: ClaimPlayerDialogProps) {
  const { user } = useAuth()
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>("social_media")
  const [socialMediaUrl, setSocialMediaUrl] = useState("")
  const [email, setEmail] = useState("")
  const [additionalInfo, setAdditionalInfo] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!user) {
      toast.error("로그인이 필요합니다")
      return
    }

    // Validation
    if (verificationMethod === "social_media" && !socialMediaUrl) {
      toast.error("소셜 미디어 URL을 입력해주세요")
      return
    }

    if (verificationMethod === "email" && !email) {
      toast.error("이메일을 입력해주세요")
      return
    }

    setIsSubmitting(true)

    try {
      const verificationData: Record<string, string> = {}

      if (verificationMethod === "social_media") {
        verificationData.socialMediaUrl = socialMediaUrl
      } else if (verificationMethod === "email") {
        verificationData.email = email
      }

      if (additionalInfo) {
        verificationData.additionalInfo = additionalInfo
      }

      const { error } = await requestPlayerClaim({
        userId: user.id,
        playerId: player.id,
        verificationMethod,
        verificationData,
      })

      if (error) {
        toast.error(error.message || "클레임 요청에 실패했습니다")
        return
      }

      toast.success("클레임 요청이 성공적으로 제출되었습니다. 관리자 승인을 기다려주세요.")
      onOpenChange(false)
      onSuccess?.()

      // Reset form
      setSocialMediaUrl("")
      setEmail("")
      setAdditionalInfo("")
      setVerificationMethod("social_media")
    } catch (error) {
      console.error("Error requesting claim:", error)
      toast.error("클레임 요청 중 오류가 발생했습니다")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>플레이어 프로필 클레임</DialogTitle>
          <DialogDescription>
            본인이 이 플레이어임을 인증하여 프로필을 클레임할 수 있습니다.
            관리자 승인 후 프로필이 연결됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Player Info */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <Avatar className="h-12 w-12">
              <AvatarImage src={player.photoUrl || player.photo_url || undefined} alt={player.name} />
              <AvatarFallback>
                {player.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-body font-semibold">{player.name}</p>
              {player.country && (
                <p className="text-caption text-muted-foreground">{player.country}</p>
              )}
            </div>
          </div>

          {/* Verification Method */}
          <div className="space-y-2">
            <Label>인증 방법</Label>
            <Select
              value={verificationMethod}
              onValueChange={(value) => setVerificationMethod(value as VerificationMethod)}
            >
              <SelectTrigger>
                <SelectValue placeholder="인증 방법을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="social_media">소셜 미디어 (Twitter, Instagram 등)</SelectItem>
                <SelectItem value="email">이메일 인증</SelectItem>
                <SelectItem value="other">기타</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Social Media URL */}
          {verificationMethod === "social_media" && (
            <div className="space-y-2">
              <Label>소셜 미디어 프로필 URL</Label>
              <Input
                placeholder="https://twitter.com/username"
                value={socialMediaUrl}
                onChange={(e) => setSocialMediaUrl(e.target.value)}
              />
              <p className="text-caption text-muted-foreground">
                본인의 공식 소셜 미디어 계정 링크를 입력해주세요
              </p>
            </div>
          )}

          {/* Email */}
          {verificationMethod === "email" && (
            <div className="space-y-2">
              <Label>이메일</Label>
              <Input
                type="email"
                placeholder="player@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-caption text-muted-foreground">
                플레이어와 관련된 공식 이메일 주소를 입력해주세요
              </p>
            </div>
          )}

          {/* Additional Info */}
          <div className="space-y-2">
            <Label>추가 정보 (선택사항)</Label>
            <Textarea
              placeholder="본인임을 증명할 수 있는 추가 정보를 입력해주세요"
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "제출 중..." : "클레임 요청"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
