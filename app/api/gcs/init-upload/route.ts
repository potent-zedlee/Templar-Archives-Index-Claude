import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore } from '@/lib/firebase-admin'
import { gcsClient } from '@/lib/gcs/client'
import { COLLECTION_PATHS, type UploadStatus } from '@/lib/firestore-types'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { verifyAdminFromRequest } from '@/lib/api-auth'

/**
 * GCS 업로드 세션 시작 API
 *
 * POST /api/gcs/init-upload
 *
 * 요청 body:
 * - streamId: string - 스트림 ID
 * - tournamentId: string - 토너먼트 ID
 * - eventId: string - 이벤트 ID
 * - filename: string - 파일명
 * - fileSize: number - 파일 크기 (bytes)
 * - contentType: string - MIME 타입 (예: "video/mp4")
 *
 * 응답:
 * - uploadUrl: string - Resumable Upload URL
 * - uploadId: string - 스트림 ID (Firestore에서는 stream 문서 자체에 저장)
 * - gcsUri: string - GCS URI (gs://bucket/path)
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
    const { streamId, tournamentId, eventId, filename, fileSize, contentType } = body

    if (!streamId || !tournamentId || !eventId || !filename || !fileSize || !contentType) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다: streamId, tournamentId, eventId, filename, fileSize, contentType' },
        { status: 400 }
      )
    }

    // 2. streamId 유효성 검증 (Firestore)
    const streamPath = `${COLLECTION_PATHS.STREAMS(tournamentId, eventId)}/${streamId}`
    const streamRef = adminFirestore.doc(streamPath)
    const streamDoc = await streamRef.get()

    if (!streamDoc.exists) {
      return NextResponse.json(
        { error: '유효하지 않은 스트림 ID입니다.' },
        { status: 404 }
      )
    }

    const streamData = streamDoc.data()
    const currentUploadStatus = streamData?.uploadStatus as UploadStatus | undefined

    // 3. 이미 업로드 중인지 확인
    if (currentUploadStatus === 'uploading') {
      // 업로드 상태가 uploading인데 시작된 지 24시간 이상 지났으면 리셋
      const gcsUploadedAt = streamData?.gcsUploadedAt as Timestamp | undefined
      if (gcsUploadedAt) {
        const uploadStartTime = gcsUploadedAt.toDate().getTime()
        const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000

        if (uploadStartTime < twentyFourHoursAgo) {
          console.log('[GCS Init Upload] Reset stale uploading status for stream:', streamId)
          // 오래된 업로드 상태는 아래에서 새로운 값으로 덮어씀
        } else {
          return NextResponse.json(
            { error: '이미 업로드가 진행 중입니다.' },
            { status: 409 }
          )
        }
      }
    }

    // 4. GCS 경로 생성: uploads/{streamId}/{timestamp}_{filename}
    const timestamp = Date.now()
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const gcsPath = `uploads/${streamId}/${timestamp}_${sanitizedFilename}`

    // 5. GCS Resumable Upload 세션 초기화
    const { uploadUrl, gcsUri } = await gcsClient.initResumableUpload(
      gcsPath,
      contentType
    )

    // 6. Firestore Stream 문서 업데이트
    await streamRef.update({
      uploadStatus: 'uploading' as UploadStatus,
      gcsPath: gcsPath,
      gcsUri: gcsUri,
      gcsFileSize: fileSize,
      gcsUploadedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    console.log(`[GCS Init Upload] 세션 생성 완료: streamId=${streamId}, gcsUri=${gcsUri}`)

    return NextResponse.json({
      uploadUrl,
      uploadId: streamId, // Firestore에서는 stream 문서 자체가 업로드 정보를 가짐
      gcsUri,
    })
  } catch (error) {
    console.error('[GCS Init Upload] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
