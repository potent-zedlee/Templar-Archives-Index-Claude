import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore } from '@/lib/db/firebase-admin'
import { gcsClient } from '@/lib/gcs/client'
import { COLLECTION_PATHS, type UploadStatus } from '@/lib/db/firestore-types'
import { FieldValue } from 'firebase-admin/firestore'
import { verifyAdminFromRequest } from '@/lib/auth/api-auth'

/**
 * GCS 업로드 완료 콜백 API
 *
 * POST /api/gcs/complete-upload
 *
 * 요청 body:
 * - uploadId: string - 스트림 ID (init-upload에서 반환된 값)
 * - tournamentId: string - 토너먼트 ID
 * - eventId: string - 이벤트 ID
 * - duration?: number - 영상 길이 (초, 선택사항)
 *
 * 응답:
 * - success: boolean
 * - gcsUri: string
 *
 * ⚠️ Admin/High Templar 권한 필요
 */
export async function POST(request: NextRequest) {
  try {
    // 0. 관리자 권한 검증
    const auth = await verifyAdminFromRequest(request)
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: 401 }
      )
    }

    // 1. 요청 body 파싱
    const body = await request.json()
    const { uploadId, tournamentId, eventId, duration } = body

    if (!uploadId || !tournamentId || !eventId) {
      return NextResponse.json(
        { error: 'uploadId, tournamentId, eventId가 필요합니다.' },
        { status: 400 }
      )
    }

    // 2. Firestore에서 Stream 문서 조회
    const streamPath = `${COLLECTION_PATHS.STREAMS(tournamentId, eventId)}/${uploadId}`
    const streamRef = adminFirestore.doc(streamPath)
    const streamDoc = await streamRef.get()

    if (!streamDoc.exists) {
      return NextResponse.json(
        { error: '스트림을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const streamData = streamDoc.data()
    const uploadStatus = streamData?.uploadStatus as UploadStatus | undefined
    const gcsPath = streamData?.gcsPath as string | undefined
    const gcsUri = streamData?.gcsUri as string | undefined

    // 이미 완료된 경우
    if (uploadStatus === 'uploaded' || uploadStatus === 'completed') {
      return NextResponse.json({
        success: true,
        gcsUri: gcsUri || '',
        message: '이미 완료된 업로드입니다.',
      })
    }

    // 3. GCS 파일 존재 확인 (간소화)
    // GCS resumable upload 완료 시 파일은 이미 존재하므로 한 번만 확인
    if (gcsPath) {
      const fileExists = await gcsClient.fileExists(gcsPath)

      if (!fileExists) {
        // 파일이 없어도 일단 진행 (GCS 전파 지연 가능성)
        // 분석 시작 시 다시 확인됨
        console.warn(`[GCS Complete Upload] 파일 존재 확인 실패, 하지만 진행: ${gcsPath}`)
      } else {
        console.log(`[GCS Complete Upload] 파일 존재 확인 완료: ${gcsPath}`)
      }
    }

    // 4. Firestore Stream 문서 업데이트
    const updateData: Record<string, unknown> = {
      uploadStatus: 'uploaded' as UploadStatus,
      updatedAt: FieldValue.serverTimestamp(),
    }

    // duration이 있으면 videoDuration도 업데이트
    if (duration !== undefined && duration !== null) {
      updateData.videoDuration = duration
    }

    await streamRef.update(updateData)

    console.log(`[GCS Complete Upload] 업로드 완료: streamId=${uploadId}, gcsUri=${gcsUri}`)

    return NextResponse.json({
      success: true,
      gcsUri: gcsUri || '',
    })
  } catch (error) {
    console.error('[GCS Complete Upload] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
