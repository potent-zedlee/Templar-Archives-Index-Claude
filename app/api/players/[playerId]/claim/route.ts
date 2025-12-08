/**
 * Player Claim API Route (Firestore)
 *
 * GET /api/players/[playerId]/claim - 플레이어 클레임 정보 조회
 *
 * @module app/api/players/[playerId]/claim/route
 */

import { NextResponse } from 'next/server'
import { adminFirestore } from '@/lib/db/firebase-admin'
import { COLLECTION_PATHS, type FirestoreUser } from '@/lib/db/firestore-types'

interface RouteParams {
  params: Promise<{ playerId: string }>
}

/**
 * 클레임 상태
 */
type ClaimStatus = 'pending' | 'approved' | 'rejected'

/**
 * 클레임 문서 인터페이스
 */
interface PlayerClaimDoc {
  userId: string
  playerId: string
  status: ClaimStatus
  verificationMethod: 'social_media' | 'email' | 'admin' | 'other'
  verificationData?: unknown
  adminNotes?: string
  claimedAt: FirebaseFirestore.Timestamp
  verifiedAt?: FirebaseFirestore.Timestamp
  verifiedBy?: string
  rejectedReason?: string
  createdAt: FirebaseFirestore.Timestamp
  updatedAt: FirebaseFirestore.Timestamp
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { playerId } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!playerId) {
      return NextResponse.json(
        { success: false, error: 'Player ID is required' },
        { status: 400 }
      )
    }

    // 1. 플레이어의 승인된 클레임 정보 조회
    // 클레임은 /playerClaims 컬렉션에 저장된다고 가정
    const claimsSnapshot = await adminFirestore
      .collection('playerClaims')
      .where('playerId', '==', playerId)
      .where('status', '==', 'approved')
      .limit(1)
      .get()

    let claimInfo = {
      claimed: false,
      claimerId: undefined as string | undefined,
      claimerName: undefined as string | undefined,
    }

    if (!claimsSnapshot.empty) {
      const claimDoc = claimsSnapshot.docs[0]
      const claimData = claimDoc.data() as PlayerClaimDoc

      // 클레이머 정보 조회
      const claimerDoc = await adminFirestore
        .collection(COLLECTION_PATHS.USERS)
        .doc(claimData.userId)
        .get()

      let claimerName = 'Unknown User'
      if (claimerDoc.exists) {
        const userData = claimerDoc.data() as FirestoreUser
        claimerName = userData.nickname || userData.email || 'Unknown User'
      }

      claimInfo = {
        claimed: true,
        claimerId: claimData.userId,
        claimerName,
      }
    }

    // 2. 특정 유저의 클레임 정보 조회 (userId가 제공된 경우)
    let userClaim: { status: ClaimStatus } | null = null

    if (userId) {
      const userClaimSnapshot = await adminFirestore
        .collection('playerClaims')
        .where('playerId', '==', playerId)
        .where('userId', '==', userId)
        .where('status', 'in', ['pending', 'approved'])
        .limit(1)
        .get()

      if (!userClaimSnapshot.empty) {
        const userClaimData = userClaimSnapshot.docs[0].data() as PlayerClaimDoc
        userClaim = {
          status: userClaimData.status,
        }
      }
    }

    return NextResponse.json({
      success: true,
      claimInfo,
      userClaim,
    })
  } catch (error) {
    console.error('Error fetching player claim:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch player claim',
      },
      { status: 500 }
    )
  }
}
