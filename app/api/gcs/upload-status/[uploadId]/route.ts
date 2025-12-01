import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore } from '@/lib/firebase-admin'
import { COLLECTION_PATHS, type UploadStatus } from '@/lib/firestore-types'
import { verifyAdminFromRequest } from '@/lib/api-auth'

/**
 * video_uploads 상태 조회 결과 타입
 */
interface VideoUploadStatusRow {
  id: string
  status: UploadStatus
  progress: number | null
  errorMessage: string | null
  createdAt: FirebaseFirestore.Timestamp | null
  updatedAt: FirebaseFirestore.Timestamp | null
  completedAt: FirebaseFirestore.Timestamp | null
}

/**
 * GCS 업로드 상태 조회 API
 *
 * GET /api/gcs/upload-status/[uploadId]
 *
 * 응답:
 * - status: 'none' | 'uploading' | 'uploaded' | 'analyzing' | 'completed' | 'failed'
 * - progress: number (0-100)
 * - errorMessage?: string
 *
 * ⚠️ Admin/High Templar 권한 필요
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uploadId: string }> }
) {
  try {
    // 0. 관리자 권한 검증
    const auth = await verifyAdminFromRequest(request)
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: 401 }
      )
    }

    const { uploadId } = await params

    if (!uploadId) {
      return NextResponse.json(
        { error: 'uploadId가 필요합니다.' },
        { status: 400 }
      )
    }

    // videoUploads 컬렉션에서 상태 조회
    const uploadDoc = await adminFirestore
      .collection('videoUploads')
      .doc(uploadId)
      .get()

    if (!uploadDoc.exists) {
      // streams 컬렉션에서도 찾아보기 (uploadStatus 필드)
      const streamDoc = await adminFirestore
        .collection(COLLECTION_PATHS.UNSORTED_STREAMS)
        .doc(uploadId)
        .get()

      if (!streamDoc.exists) {
        return NextResponse.json(
          { error: '업로드 레코드를 찾을 수 없습니다.' },
          { status: 404 }
        )
      }

      const streamData = streamDoc.data()
      return NextResponse.json({
        id: uploadId,
        status: streamData?.uploadStatus ?? 'none',
        progress: streamData?.uploadProgress ?? 0,
        errorMessage: streamData?.uploadErrorMessage ?? null,
        createdAt: streamData?.createdAt?.toDate?.()?.toISOString() ?? null,
        updatedAt: streamData?.updatedAt?.toDate?.()?.toISOString() ?? null,
        completedAt: streamData?.gcsUploadedAt?.toDate?.()?.toISOString() ?? null,
      })
    }

    const uploadData = uploadDoc.data() as VideoUploadStatusRow

    return NextResponse.json({
      id: uploadId,
      status: uploadData.status ?? 'none',
      progress: uploadData.progress ?? 0,
      errorMessage: uploadData.errorMessage ?? null,
      createdAt: uploadData.createdAt?.toDate?.()?.toISOString() ?? null,
      updatedAt: uploadData.updatedAt?.toDate?.()?.toISOString() ?? null,
      completedAt: uploadData.completedAt?.toDate?.()?.toISOString() ?? null,
    })
  } catch (error) {
    console.error('[GCS Upload Status] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
