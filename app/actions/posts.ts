'use server'

/**
 * Community Posts Server Actions (Firestore)
 *
 * 커뮤니티 포스트 관련 모든 write 작업은 서버 사이드에서만 실행되며,
 * 사용자 인증을 서버에서 검증합니다.
 */

import { adminFirestore, adminAuth } from '@/lib/firebase-admin'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { FieldValue } from 'firebase-admin/firestore'
import { COLLECTION_PATHS } from '@/lib/firestore-types'
import type { PostCategory, VoteType } from '@/lib/firestore-types'

// ==================== Types ====================

type CreatePostInput = {
  title: string
  content: string
  category: PostCategory
  handId?: string
  tags: string[]
  status: 'draft' | 'published'
}

type UpdatePostInput = {
  title?: string
  content?: string
  category?: PostCategory
  handId?: string
  tags?: string[]
  status?: 'draft' | 'published'
}

// ==================== Helper Functions ====================

/**
 * 인증된 사용자 검증
 *
 * @returns {Promise<{authorized: boolean, error?: string, userId?: string, user?: object}>}
 */
async function verifyUser(): Promise<{
  authorized: boolean
  error?: string
  userId?: string
  user?: {
    id: string
    nickname: string
    avatarUrl?: string
    role: string
  }
}> {
  try {
    // 1. 쿠키에서 Firebase Auth 토큰 가져오기
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')

    if (!sessionCookie?.value) {
      return { authorized: false, error: 'Unauthorized - Please sign in' }
    }

    // 2. Firebase Auth 세션 쿠키 검증
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie.value, true)
    const userId = decodedToken.uid

    // 3. Firestore에서 사용자 정보 조회
    const userDoc = await adminFirestore
      .collection(COLLECTION_PATHS.USERS)
      .doc(userId)
      .get()

    if (!userDoc.exists) {
      return {
        authorized: false,
        error: 'User not found in database'
      }
    }

    const userData = userDoc.data()

    return {
      authorized: true,
      userId,
      user: {
        id: userId,
        nickname: userData?.nickname || userData?.email || 'Anonymous',
        avatarUrl: userData?.avatarUrl,
        role: userData?.role || 'user',
      }
    }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Authentication failed'
    console.error('[verifyUser] Error:', errorMsg)
    return {
      authorized: false,
      error: errorMsg
    }
  }
}

/**
 * 포스트 작성자 또는 Admin 권한 검증
 */
async function verifyPostOwnerOrAdmin(postId: string): Promise<{
  authorized: boolean
  error?: string
  userId?: string
  isAdmin?: boolean
}> {
  const auth = await verifyUser()
  if (!auth.authorized || !auth.userId || !auth.user) {
    return { authorized: false, error: auth.error }
  }

  const isAdmin = ['admin', 'high_templar'].includes(auth.user.role)

  // Admin은 모든 포스트에 접근 가능
  if (isAdmin) {
    return { authorized: true, userId: auth.userId, isAdmin: true }
  }

  // 일반 사용자는 자신의 포스트만 수정/삭제 가능
  const postDoc = await adminFirestore
    .collection(COLLECTION_PATHS.POSTS)
    .doc(postId)
    .get()

  if (!postDoc.exists) {
    return { authorized: false, error: 'Post not found' }
  }

  const postData = postDoc.data()
  if (postData?.author?.id !== auth.userId) {
    return { authorized: false, error: 'Forbidden - You can only modify your own posts' }
  }

  return { authorized: true, userId: auth.userId, isAdmin: false }
}

// ==================== Post Actions ====================

/**
 * 포스트 생성
 */
export async function createPost(data: CreatePostInput): Promise<{
  success: boolean
  error?: string
  data?: { id: string }
}> {
  try {
    // 1. 사용자 인증 검증
    const auth = await verifyUser()
    if (!auth.authorized || !auth.userId || !auth.user) {
      return { success: false, error: auth.error }
    }

    // 2. 입력 검증
    if (!data.title.trim()) {
      return { success: false, error: 'Title is required' }
    }
    if (!data.content.trim()) {
      return { success: false, error: 'Content is required' }
    }
    if (!data.category) {
      return { success: false, error: 'Category is required' }
    }

    // 3. Firestore에 문서 추가
    const postRef = adminFirestore.collection(COLLECTION_PATHS.POSTS).doc()

    const postData = {
      title: data.title.trim(),
      content: data.content.trim(),
      category: data.category,
      author: {
        id: auth.user.id,
        name: auth.user.nickname,
        avatarUrl: auth.user.avatarUrl || null,
      },
      handId: data.handId || null,
      tags: data.tags || [],
      stats: {
        likesCount: 0,
        dislikesCount: 0,
        commentsCount: 0,
        viewsCount: 0,
      },
      status: data.status,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      publishedAt: data.status === 'published' ? FieldValue.serverTimestamp() : null,
    }

    await postRef.set(postData)

    // 4. 사용자 통계 업데이트
    await adminFirestore
      .collection(COLLECTION_PATHS.USERS)
      .doc(auth.userId)
      .update({
        'stats.postsCount': FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      })

    // 5. 캐시 무효화
    revalidatePath('/community')

    return {
      success: true,
      data: { id: postRef.id }
    }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[createPost] Error:', errorMsg)
    return { success: false, error: errorMsg }
  }
}

/**
 * 포스트 수정
 */
export async function updatePost(
  postId: string,
  data: UpdatePostInput
): Promise<{
  success: boolean
  error?: string
  data?: { id: string }
}> {
  try {
    // 1. 작성자 또는 Admin 권한 검증
    const auth = await verifyPostOwnerOrAdmin(postId)
    if (!auth.authorized) {
      return { success: false, error: auth.error }
    }

    // 2. 업데이트할 필드 구성
    const updateData: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    }

    if (data.title !== undefined) {
      updateData.title = data.title.trim()
    }
    if (data.content !== undefined) {
      updateData.content = data.content.trim()
    }
    if (data.category !== undefined) {
      updateData.category = data.category
    }
    if (data.handId !== undefined) {
      updateData.handId = data.handId || null
    }
    if (data.tags !== undefined) {
      updateData.tags = data.tags
    }
    if (data.status !== undefined) {
      updateData.status = data.status
      // 발행 상태로 변경 시 publishedAt 업데이트
      if (data.status === 'published') {
        const postDoc = await adminFirestore
          .collection(COLLECTION_PATHS.POSTS)
          .doc(postId)
          .get()
        const existingData = postDoc.data()
        if (!existingData?.publishedAt) {
          updateData.publishedAt = FieldValue.serverTimestamp()
        }
      }
    }

    // 3. Firestore 업데이트
    await adminFirestore
      .collection(COLLECTION_PATHS.POSTS)
      .doc(postId)
      .update(updateData)

    // 4. 캐시 무효화
    revalidatePath('/community')
    revalidatePath(`/community/${postId}`)

    return {
      success: true,
      data: { id: postId }
    }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[updatePost] Error:', errorMsg)
    return { success: false, error: errorMsg }
  }
}

/**
 * 포스트 삭제 (soft delete)
 */
export async function deletePost(postId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    // 1. 작성자 또는 Admin 권한 검증
    const auth = await verifyPostOwnerOrAdmin(postId)
    if (!auth.authorized) {
      return { success: false, error: auth.error }
    }

    // 2. Soft delete (status를 deleted로 변경)
    await adminFirestore
      .collection(COLLECTION_PATHS.POSTS)
      .doc(postId)
      .update({
        status: 'deleted',
        updatedAt: FieldValue.serverTimestamp(),
      })

    // 3. 캐시 무효화
    revalidatePath('/community')
    revalidatePath(`/community/${postId}`)

    return { success: true }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[deletePost] Error:', errorMsg)
    return { success: false, error: errorMsg }
  }
}

/**
 * 포스트 좋아요/싫어요 토글
 */
export async function togglePostLike(
  postId: string,
  voteType: VoteType
): Promise<{
  success: boolean
  error?: string
  data?: { liked: boolean; voteType: VoteType | null }
}> {
  try {
    // 1. 사용자 인증 검증
    const auth = await verifyUser()
    if (!auth.authorized || !auth.userId) {
      return { success: false, error: auth.error }
    }

    const userId = auth.userId
    const postRef = adminFirestore.collection(COLLECTION_PATHS.POSTS).doc(postId)
    const likeRef = adminFirestore
      .collection(COLLECTION_PATHS.POST_LIKES(postId))
      .doc(userId)

    // 2. 기존 좋아요 확인
    const likeDoc = await likeRef.get()
    const existingVote = likeDoc.exists ? likeDoc.data()?.voteType as VoteType : null

    // 3. 투표 처리
    if (existingVote === voteType) {
      // 같은 투표 클릭 -> 취소
      await likeRef.delete()

      // 카운트 감소
      const statsUpdate = voteType === 'like'
        ? { 'stats.likesCount': FieldValue.increment(-1) }
        : { 'stats.dislikesCount': FieldValue.increment(-1) }

      await postRef.update({
        ...statsUpdate,
        updatedAt: FieldValue.serverTimestamp(),
      })

      revalidatePath('/community')
      revalidatePath(`/community/${postId}`)

      return {
        success: true,
        data: { liked: false, voteType: null }
      }
    } else if (existingVote) {
      // 다른 투표로 변경
      await likeRef.update({
        voteType,
        updatedAt: FieldValue.serverTimestamp(),
      })

      // 카운트 업데이트 (기존 감소, 새로운 증가)
      const statsUpdate = voteType === 'like'
        ? {
            'stats.likesCount': FieldValue.increment(1),
            'stats.dislikesCount': FieldValue.increment(-1),
          }
        : {
            'stats.likesCount': FieldValue.increment(-1),
            'stats.dislikesCount': FieldValue.increment(1),
          }

      await postRef.update({
        ...statsUpdate,
        updatedAt: FieldValue.serverTimestamp(),
      })

      revalidatePath('/community')
      revalidatePath(`/community/${postId}`)

      return {
        success: true,
        data: { liked: true, voteType }
      }
    } else {
      // 새로운 투표
      await likeRef.set({
        userId,
        voteType,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })

      // 카운트 증가
      const statsUpdate = voteType === 'like'
        ? { 'stats.likesCount': FieldValue.increment(1) }
        : { 'stats.dislikesCount': FieldValue.increment(1) }

      await postRef.update({
        ...statsUpdate,
        updatedAt: FieldValue.serverTimestamp(),
      })

      revalidatePath('/community')
      revalidatePath(`/community/${postId}`)

      return {
        success: true,
        data: { liked: true, voteType }
      }
    }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[togglePostLike] Error:', errorMsg)
    return { success: false, error: errorMsg }
  }
}

/**
 * 포스트 조회수 증가
 */
export async function incrementPostViews(postId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    await adminFirestore
      .collection(COLLECTION_PATHS.POSTS)
      .doc(postId)
      .update({
        'stats.viewsCount': FieldValue.increment(1),
      })

    return { success: true }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[incrementPostViews] Error:', errorMsg)
    return { success: false, error: errorMsg }
  }
}
