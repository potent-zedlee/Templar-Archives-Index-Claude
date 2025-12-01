/**
 * Rollback Upload API
 *
 * 업로드 실패 시 DB 상태를 롤백합니다.
 * - streams.uploadStatus → 'none' 또는 'uploaded' (기존 gcsUri 존재 여부에 따라)
 *
 * ⚠️ Admin/High Templar 권한 필요
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore } from '@/lib/firebase-admin'
import { COLLECTION_PATHS, type UploadStatus } from '@/lib/firestore-types'
import { FieldValue } from 'firebase-admin/firestore'
import { verifyAdminFromRequest } from '@/lib/api-auth'

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

    const { uploadId, tournamentId, eventId, errorMessage } = await request.json()

    if (!uploadId || !tournamentId || !eventId) {
      return NextResponse.json(
        { error: 'uploadId, tournamentId, eventId가 필요합니다.' },
        { status: 400 }
      )
    }

    // 1. Firestore에서 Stream 문서 조회
    const streamPath = `${COLLECTION_PATHS.STREAMS(tournamentId, eventId)}/${uploadId}`
    const streamRef = adminFirestore.doc(streamPath)
    const streamDoc = await streamRef.get()

    if (!streamDoc.exists) {
      console.log('[rollback-upload] Stream not found:', uploadId)
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 })
    }

    const streamData = streamDoc.data()
    const uploadStatus = streamData?.uploadStatus as UploadStatus | undefined
    const existingGcsUri = streamData?.gcsUri as string | undefined

    // 이미 완료되었거나 실패한 경우 롤백 스킵
    if (uploadStatus === 'uploaded' || uploadStatus === 'completed' || uploadStatus === 'failed') {
      console.log('[rollback-upload] Upload already finalized:', uploadStatus)
      return NextResponse.json({ success: true, skipped: true })
    }

    // 2. Stream 문서 업데이트
    // gcsUri가 이미 존재하면 파일이 성공적으로 업로드된 것이므로 'uploaded'로 설정
    const newStatus: UploadStatus = existingGcsUri ? 'uploaded' : 'none'

    await streamRef.update({
      uploadStatus: newStatus,
      updatedAt: FieldValue.serverTimestamp(),
    })

    console.log(`[rollback-upload] Stream status set to '${newStatus}' (gcsUri exists: ${!!existingGcsUri})`)
    if (errorMessage) {
      console.log(`[rollback-upload] Error message: ${errorMessage}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[rollback-upload] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
