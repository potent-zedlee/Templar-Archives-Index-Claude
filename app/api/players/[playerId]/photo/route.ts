/**
 * Player Photo API Route (Firestore + GCS)
 *
 * POST /api/players/[playerId]/photo - 플레이어 사진 업로드
 *
 * @module app/api/players/[playerId]/photo/route
 */

import { NextResponse } from 'next/server'
import { adminFirestore } from '@/lib/firebase-admin'
import { COLLECTION_PATHS } from '@/lib/db/firestore-types'
import { Storage } from '@google-cloud/storage'

interface RouteParams {
  params: Promise<{ playerId: string }>
}

// GCS Storage 인스턴스
const storage = new Storage({
  projectId: process.env.GCS_PROJECT_ID,
})

const BUCKET_NAME = process.env.GCS_PLAYER_PHOTOS_BUCKET || 'templar-archives-player-photos'

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { playerId } = await params

    if (!playerId) {
      return NextResponse.json(
        { success: false, error: 'Player ID is required' },
        { status: 400 }
      )
    }

    // 플레이어 존재 확인
    const playerDoc = await adminFirestore
      .collection(COLLECTION_PATHS.PLAYERS)
      .doc(playerId)
      .get()

    if (!playerDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Player not found' },
        { status: 404 }
      )
    }

    // FormData에서 파일 추출
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // 파일 타입 검증
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' },
        { status: 400 }
      )
    }

    // 파일 크기 검증 (최대 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size: 5MB' },
        { status: 400 }
      )
    }

    // 파일명 생성
    const fileExt = file.name.split('.').pop() || 'jpg'
    const fileName = `player-photos/${playerId}-${Date.now()}.${fileExt}`

    // GCS에 업로드
    const bucket = storage.bucket(BUCKET_NAME)
    const blob = bucket.file(fileName)

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    await blob.save(buffer, {
      contentType: file.type,
      metadata: {
        cacheControl: 'public, max-age=31536000', // 1년 캐시
        playerId,
        uploadedAt: new Date().toISOString(),
      },
    })

    // Public URL 생성
    // 버킷이 공개 설정되어 있다면:
    const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${fileName}`

    // 또는 Signed URL 사용 (비공개 버킷인 경우)
    // const [signedUrl] = await blob.getSignedUrl({
    //   action: 'read',
    //   expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1년
    // })

    // Firestore 업데이트
    await adminFirestore
      .collection(COLLECTION_PATHS.PLAYERS)
      .doc(playerId)
      .update({
        photoUrl: publicUrl,
        updatedAt: new Date(),
      })

    return NextResponse.json({
      success: true,
      photoUrl: publicUrl,
      message: 'Photo uploaded successfully',
    })
  } catch (error) {
    console.error('Error uploading player photo:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload photo',
      },
      { status: 500 }
    )
  }
}
