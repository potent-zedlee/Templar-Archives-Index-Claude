"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Share2, Copy, Check, Twitter, Facebook, MessageCircle } from "lucide-react"
import { toast } from "sonner"

type ShareHandDialogProps = {
  handId: string
  handDescription: string
  handNumber: string
}

export function ShareHandDialog({ handId, handDescription, handNumber }: ShareHandDialogProps) {
  const [copied, setCopied] = useState(false)
  const [embedCopied, setEmbedCopied] = useState(false)

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/hands/${handId}`
    : ''

  const shareText = `Check out this poker hand: Hand #${handNumber} - ${handDescription}`

  const copyToClipboard = async (text: string, setCopiedState: (value: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedState(true)
      toast.success('Copied to clipboard!')
      setTimeout(() => setCopiedState(false), 2000)
    } catch (err) {
      toast.error('Failed to copy')
    }
  }

  const shareToTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`
    window.open(twitterUrl, '_blank', 'width=550,height=420')
  }

  const shareToFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
    window.open(facebookUrl, '_blank', 'width=550,height=420')
  }

  const shareToKakao = () => {
    // KakaoTalk 공유는 KakaoTalk SDK가 필요합니다
    // 임시로 링크 복사로 대체
    copyToClipboard(shareUrl, setCopied)
    toast.info('카카오톡 공유는 준비 중입니다')
  }

  const embedCode = `<iframe src="${shareUrl}/embed" width="800" height="600" frameborder="0" allowfullscreen></iframe>`

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Share Hand #{handNumber}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="link" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="link">Link</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
            <TabsTrigger value="embed">Embed</TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="share-url">Share Link</Label>
              <div className="flex gap-2">
                <Input
                  id="share-url"
                  value={shareUrl}
                  readOnly
                  className="flex-1"
                  aria-label="공유 링크"
                />
                <Button
                  onClick={() => copyToClipboard(shareUrl, setCopied)}
                  variant="outline"
                  aria-label={copied ? "링크가 복사되었습니다" : "링크 복사하기"}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" aria-hidden="true" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" aria-hidden="true" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              {copied && (
                <div role="status" aria-live="polite" className="sr-only">
                  링크가 클립보드에 복사되었습니다
                </div>
              )}
              <p className="text-caption text-muted-foreground">
                Share this link to let others view this hand
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="share-text">Share Text</Label>
              <Textarea
                id="share-text"
                value={shareText}
                readOnly
                rows={3}
              />
              <p className="text-caption text-muted-foreground">
                Copy this text along with the link for sharing
              </p>
            </div>
          </TabsContent>

          <TabsContent value="social" className="space-y-4 pt-4">
            <div className="grid grid-cols-3 gap-4">
              <Button
                onClick={shareToTwitter}
                variant="outline"
                className="flex flex-col gap-2 h-auto py-6"
                aria-label="Twitter로 공유하기"
              >
                <Twitter className="h-8 w-8 text-blue-400" aria-hidden="true" />
                <span className="text-body">Twitter</span>
              </Button>

              <Button
                onClick={shareToFacebook}
                variant="outline"
                className="flex flex-col gap-2 h-auto py-6"
                aria-label="Facebook으로 공유하기"
              >
                <Facebook className="h-8 w-8 text-blue-600" aria-hidden="true" />
                <span className="text-body">Facebook</span>
              </Button>

              <Button
                onClick={shareToKakao}
                variant="outline"
                className="flex flex-col gap-2 h-auto py-6"
                aria-label="KakaoTalk으로 공유하기"
              >
                <MessageCircle className="h-8 w-8 text-yellow-500" aria-hidden="true" />
                <span className="text-body">KakaoTalk</span>
              </Button>
            </div>

            <div className="bg-muted rounded-lg p-4">
              <h4 className="text-body font-semibold mb-2">Preview</h4>
              <p className="text-caption text-muted-foreground mb-2">{shareText}</p>
              <p className="text-caption text-primary">{shareUrl}</p>
            </div>
          </TabsContent>

          <TabsContent value="embed" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="embed-code">Embed Code</Label>
              <div className="flex gap-2">
                <Textarea
                  id="embed-code"
                  value={embedCode}
                  readOnly
                  rows={4}
                  className="flex-1 font-mono text-xs"
                  aria-label="임베드 코드"
                />
                <Button
                  onClick={() => copyToClipboard(embedCode, setEmbedCopied)}
                  variant="outline"
                  className="self-start"
                  aria-label={embedCopied ? "임베드 코드가 복사되었습니다" : "임베드 코드 복사하기"}
                >
                  {embedCopied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" aria-hidden="true" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" aria-hidden="true" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              {embedCopied && (
                <div role="status" aria-live="polite" className="sr-only">
                  임베드 코드가 클립보드에 복사되었습니다
                </div>
              )}
              <p className="text-caption text-muted-foreground">
                Paste this HTML code into your website to embed this hand
              </p>
            </div>

            <div className="bg-muted rounded-lg p-4">
              <h4 className="text-body font-semibold mb-2">Preview</h4>
              <div className="aspect-video bg-background rounded border border-border flex items-center justify-center">
                <p className="text-caption text-muted-foreground">
                  Embedded hand preview will appear here
                </p>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <p className="text-caption text-blue-900 dark:text-blue-100">
                <strong>Note:</strong> The embedded view includes the poker table, hand details, and replay controls.
                Viewers can interact with the hand replay without leaving your website.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
