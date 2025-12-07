/**
 * Stream Checklist Modal
 *
 * Stream 발행 전 체크리스트를 보여주는 모달
 * - YouTube 링크 확인
 * - 썸네일 존재 확인
 * - 핸드 개수 확인
 * - 모든 조건 만족 시 Publish 버튼 활성화
 *
 * Firestore 버전으로 마이그레이션됨
 */

'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { publishStream, unpublishStream } from '@/app/actions/admin/archive-admin'
import { firestore } from '@/lib/db/firebase'
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { COLLECTION_PATHS } from '@/lib/db/firestore-types'
import type { FirestoreStream } from '@/lib/db/firestore-types'
import type { ContentStatus } from '@/lib/types/archive'

interface StreamChecklistProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  streamId: string
  streamName: string
  currentStatus: ContentStatus
  onStatusChange?: () => void
  /** Stream이 속한 토너먼트 ID */
  tournamentId?: string
  /** Stream이 속한 이벤트 ID */
  eventId?: string
}

interface ChecklistItem {
  id: string
  label: string
  status: 'checking' | 'passed' | 'warning' | 'failed'
  message?: string
}

export function StreamChecklist({
  isOpen,
  onOpenChange,
  streamId,
  streamName,
  currentStatus,
  onStatusChange,
  tournamentId,
  eventId,
}: StreamChecklistProps) {
  const [loading, setLoading] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: 'video', label: 'YouTube Link', status: 'checking' },
    { id: 'thumbnail', label: 'Thumbnail', status: 'checking' },
    { id: 'hands', label: 'Hand Count', status: 'checking' },
  ])

  // 체크리스트 검증
  useEffect(() => {
    if (!isOpen) return

    const checkStream = async () => {
      setLoading(true)
      const newChecklist: ChecklistItem[] = []

      try {
        // 1. Stream 데이터 가져오기 (Firestore)
        // Stream은 계층 구조 또는 unsorted에 있을 수 있음
        let streamData: FirestoreStream | null = null

        if (tournamentId && eventId) {
          // 계층 구조의 스트림
          const streamRef = doc(
            firestore,
            COLLECTION_PATHS.STREAMS(tournamentId, eventId),
            streamId
          )
          const streamSnap = await getDoc(streamRef)
          if (streamSnap.exists()) {
            streamData = streamSnap.data() as FirestoreStream
          }
        } else {
          // Unsorted 스트림 체크
          const unsortedRef = doc(firestore, COLLECTION_PATHS.UNSORTED_STREAMS, streamId)
          const unsortedSnap = await getDoc(unsortedRef)
          if (unsortedSnap.exists()) {
            streamData = unsortedSnap.data() as FirestoreStream
          }
        }

        if (!streamData) {
          throw new Error('Stream not found')
        }

        // 2. Video URL 체크
        if (streamData.videoUrl && streamData.videoSource === 'youtube') {
          newChecklist.push({
            id: 'video',
            label: 'YouTube Link',
            status: 'passed',
            message: streamData.videoUrl,
          })
        } else {
          newChecklist.push({
            id: 'video',
            label: 'YouTube Link',
            status: 'warning',
            message: 'No YouTube URL',
          })
        }

        // 3. Thumbnail 체크 (Firestore에는 thumbnailUrl 필드가 없을 수 있음)
        // GCS 경로가 있으면 통과로 처리
        if (streamData.gcsPath || streamData.videoUrl) {
          newChecklist.push({
            id: 'thumbnail',
            label: 'Thumbnail',
            status: 'passed',
            message: 'Video source exists',
          })
        } else {
          newChecklist.push({
            id: 'thumbnail',
            label: 'Thumbnail',
            status: 'warning',
            message: 'No video source',
          })
        }

        // 4. Hand Count 체크 (hands 컬렉션에서 streamId로 조회)
        const handsRef = collection(firestore, COLLECTION_PATHS.HANDS)
        const handsQuery = query(handsRef, where('streamId', '==', streamId))
        const handsSnap = await getDocs(handsQuery)
        const handCount = handsSnap.size

        if (handCount > 0) {
          newChecklist.push({
            id: 'hands',
            label: 'Hand Count',
            status: 'passed',
            message: `${handCount} hands`,
          })
        } else {
          newChecklist.push({
            id: 'hands',
            label: 'Hand Count',
            status: 'failed',
            message: 'No hands yet',
          })
        }

        setChecklist(newChecklist)
      } catch (error) {
        console.error('Error checking stream:', error)
        toast.error('Failed to load checklist')
      } finally {
        setLoading(false)
      }
    }

    checkStream()
  }, [isOpen, streamId, tournamentId, eventId])

  // 모든 필수 조건 통과 여부
  const canPublish = checklist.every((item) => item.status !== 'failed')

  // Publish 핸들러
  const handlePublish = async () => {
    if (!tournamentId || !eventId) {
      toast.error('Missing tournament or event information')
      return
    }

    setPublishing(true)
    try {
      const result = await publishStream(tournamentId, eventId, streamId)

      if (result.success) {
        toast.success(`"${streamName}" published successfully`)
        onStatusChange?.()
        onOpenChange(false)
      } else {
        toast.error(result.error || 'Failed to publish stream')
      }
    } catch (error) {
      console.error('Error publishing stream:', error)
      toast.error('Failed to publish stream')
    } finally {
      setPublishing(false)
    }
  }

  // Unpublish 핸들러
  const handleUnpublish = async () => {
    if (!tournamentId || !eventId) {
      toast.error('Missing tournament or event information')
      return
    }

    setPublishing(true)
    try {
      const result = await unpublishStream(tournamentId, eventId, streamId)

      if (result.success) {
        toast.success(`"${streamName}" unpublished successfully`)
        onStatusChange?.()
        onOpenChange(false)
      } else {
        toast.error(result.error || 'Failed to unpublish stream')
      }
    } catch (error) {
      console.error('Error unpublishing stream:', error)
      toast.error('Failed to unpublish stream')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Stream Checklist</DialogTitle>
          <DialogDescription>
            {currentStatus === 'published'
              ? 'Stream is currently published. You can unpublish it below.'
              : 'Review checklist before publishing'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Stream Name */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Stream:</span>
            <span className="text-sm text-muted-foreground">{streamName}</span>
          </div>

          {/* Checklist Items */}
          <div className="space-y-3 border rounded-lg p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              checklist.map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  {/* Status Icon */}
                  {item.status === 'passed' && (
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  )}
                  {item.status === 'warning' && (
                    <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                  )}
                  {item.status === 'failed' && (
                    <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  )}

                  {/* Label & Message */}
                  <div className="flex-1 space-y-1">
                    <div className="text-sm font-medium">{item.label}</div>
                    {item.message && (
                      <div className="text-xs text-muted-foreground truncate">
                        {item.message}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Warning Badge */}
          {!canPublish && !loading && (
            <Badge variant="destructive" className="w-full justify-center">
              Cannot publish: Missing hands
            </Badge>
          )}
        </div>

        <DialogFooter>
          {currentStatus === 'published' ? (
            <Button
              variant="destructive"
              onClick={handleUnpublish}
              disabled={publishing}
            >
              {publishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Unpublish
            </Button>
          ) : (
            <Button
              onClick={handlePublish}
              disabled={!canPublish || loading || publishing}
            >
              {publishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Publish
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
