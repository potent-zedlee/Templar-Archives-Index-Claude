/**
 * User Profile Service (Firestore)
 *
 * 사용자 프로필 관련 Firestore 작업 함수들
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  collection,
  where,
  getDocs,
  limit as firestoreLimit,
  orderBy,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore'
import { firestore, auth } from '@/lib/db/firebase'
import type { FirestoreUser } from '@/lib/db/firestore-types'
import { COLLECTION_PATHS } from '@/lib/db/firestore-types'
import { isAdminEmail } from '@/lib/auth/auth-utils'

/**
 * UserProfile 타입 (API 응답용)
 *
 * Firestore 타입과 별도로 관리하여 API 호환성 유지
 */
export type UserProfile = {
  id: string
  email: string
  nickname: string
  role: 'user' | 'high_templar' | 'arbiter' | 'admin'
  avatarUrl?: string
  bio?: string
  pokerExperience?: string
  location?: string
  website?: string
  twitterHandle?: string
  instagramHandle?: string
  profileVisibility?: 'public' | 'private' | 'friends'
  postsCount: number
  commentsCount: number
  likesReceived: number
  createdAt: string
  updatedAt: string
}

/**
 * Firestore 문서를 UserProfile로 변환
 */
function firestoreUserToProfile(id: string, data: FirestoreUser): UserProfile {
  return {
    id,
    email: data.email,
    nickname: data.nickname || `user${id.substring(0, 6)}`,
    role: data.role,
    avatarUrl: data.avatarUrl,
    bio: data.bio,
    pokerExperience: data.pokerExperience,
    location: data.location,
    website: data.website,
    twitterHandle: data.twitterHandle,
    instagramHandle: data.instagramHandle,
    profileVisibility: data.profileVisibility || 'public',
    postsCount: data.stats.postsCount,
    commentsCount: data.stats.commentsCount,
    likesReceived: data.likesReceived || 0,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : new Date().toISOString(),
  }
}

/**
 * 사용자 프로필 조회
 */
export async function getProfile(userId: string): Promise<UserProfile | null> {
  try {
    const userRef = doc(firestore, COLLECTION_PATHS.USERS, userId)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      return null
    }

    return firestoreUserToProfile(userSnap.id, userSnap.data() as FirestoreUser)
  } catch (error) {
    console.error('프로필 조회 실패:', error)
    return null
  }
}

/**
 * 신규 사용자 프로필 생성
 * Firebase Auth 정보를 기반으로 Firestore에 사용자 문서 생성
 */
export async function createProfile(user: {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
}): Promise<UserProfile | null> {
  try {
    const userRef = doc(firestore, COLLECTION_PATHS.USERS, user.uid)

    // 이미 존재하는지 확인
    const existing = await getDoc(userRef)
    if (existing.exists()) {
      return firestoreUserToProfile(existing.id, existing.data() as FirestoreUser)
    }

    // Google displayName이 있으면 사용, 없으면 임시 닉네임 생성
    const tempNickname = user.displayName || `user${Math.random().toString(36).substring(2, 8)}`

    // 관리자 이메일인 경우 admin 역할 부여
    const userRole = isAdminEmail(user.email) ? 'admin' : 'user'

    const newUser: FirestoreUser = {
      email: user.email || '',
      nickname: tempNickname,
      avatarUrl: user.photoURL || undefined,
      role: userRole,
      emailVerified: true,
      stats: {
        postsCount: 0,
        commentsCount: 0,
      },
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    }

    await setDoc(userRef, newUser)

    // 생성된 프로필 반환
    return {
      id: user.uid,
      email: newUser.email,
      nickname: tempNickname,
      role: userRole,
      avatarUrl: newUser.avatarUrl,
      postsCount: 0,
      commentsCount: 0,
      likesReceived: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  } catch (error) {
    console.error('프로필 생성 실패:', error)
    return null
  }
}

/**
 * 현재 로그인한 사용자의 프로필 조회
 *
 * Firebase Auth UID로 Firestore에서 프로필 조회
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const user = auth.currentUser

  if (!user) {
    return null
  }

  return await getProfile(user.uid)
}

/**
 * 프로필 수정
 */
export async function updateProfile(
  userId: string,
  updates: Partial<Pick<UserProfile,
    'nickname' | 'avatarUrl' | 'bio' | 'pokerExperience' |
    'location' | 'website' | 'twitterHandle' | 'instagramHandle' | 'profileVisibility'
  >>
): Promise<UserProfile | null> {
  try {
    const userRef = doc(firestore, COLLECTION_PATHS.USERS, userId)

    // UserProfile 필드를 FirestoreUser 필드로 매핑
    const firestoreUpdates: Partial<FirestoreUser> = {
      updatedAt: serverTimestamp() as Timestamp,
    }

    if (updates.nickname !== undefined) {
      firestoreUpdates.nickname = updates.nickname
    }

    if (updates.avatarUrl !== undefined) {
      firestoreUpdates.avatarUrl = updates.avatarUrl
    }

    if (updates.bio !== undefined) {
      firestoreUpdates.bio = updates.bio
    }

    if (updates.pokerExperience !== undefined) {
      firestoreUpdates.pokerExperience = updates.pokerExperience
    }

    if (updates.location !== undefined) {
      firestoreUpdates.location = updates.location
    }

    if (updates.website !== undefined) {
      firestoreUpdates.website = updates.website
    }

    if (updates.twitterHandle !== undefined) {
      firestoreUpdates.twitterHandle = updates.twitterHandle
    }

    if (updates.instagramHandle !== undefined) {
      firestoreUpdates.instagramHandle = updates.instagramHandle
    }

    if (updates.profileVisibility !== undefined) {
      firestoreUpdates.profileVisibility = updates.profileVisibility
    }

    await updateDoc(userRef, firestoreUpdates as Record<string, unknown>)

    // 업데이트된 프로필 조회
    const updatedProfile = await getProfile(userId)
    return updatedProfile
  } catch (error) {
    console.error('프로필 수정 실패:', error)
    throw error
  }
}

/**
 * 닉네임 중복 체크
 * @returns true = 사용 가능, false = 이미 사용 중
 */
export async function checkNicknameAvailable(nickname: string, currentUserId?: string): Promise<boolean> {
  try {
    const usersRef = collection(firestore, COLLECTION_PATHS.USERS)
    const q = query(usersRef, where('nickname', '==', nickname), firestoreLimit(1))

    const querySnapshot = await getDocs(q)

    // 결과가 없으면 사용 가능
    if (querySnapshot.empty) {
      return true
    }

    // 현재 사용자의 닉네임이면 사용 가능
    if (currentUserId) {
      const existingUser = querySnapshot.docs[0]
      if (existingUser.id === currentUserId) {
        return true
      }
    }

    // 다른 사용자가 사용 중
    return false
  } catch (error) {
    console.error('닉네임 중복 체크 실패:', error)
    return false
  }
}

/**
 * 닉네임으로 사용자 조회
 */
export async function getUserByNickname(nickname: string): Promise<UserProfile | null> {
  try {
    const usersRef = collection(firestore, COLLECTION_PATHS.USERS)
    const q = query(usersRef, where('nickname', '==', nickname), firestoreLimit(1))

    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      console.error('사용자를 찾을 수 없습니다:', nickname)
      return null
    }

    const userDoc = querySnapshot.docs[0]
    return firestoreUserToProfile(userDoc.id, userDoc.data() as FirestoreUser)
  } catch (error) {
    console.error('사용자 조회 실패:', error)
    return null
  }
}

/**
 * 사용자가 프로필 설정을 완료했는지 확인
 * (닉네임이 임시 닉네임 형식이 아닌지 체크)
 */
export async function hasCompletedProfile(userId: string): Promise<boolean> {
  const profile = await getProfile(userId)

  if (!profile) {
    return false
  }

  // 임시 닉네임 형식 체크: user123456 같은 형식
  const isTempNickname = /^[a-z]+\d{6}$/.test(profile.nickname)

  // 임시 닉네임이 아니면 프로필 설정 완료로 간주
  return !isTempNickname
}

/**
 * UserPost 타입 (API 응답용)
 */
export type UserPost = {
  id: string
  title: string
  content: string
  category: string
  likesCount: number
  commentsCount: number
  createdAt: string
}

/**
 * 사용자의 포스트 목록 조회
 */
export async function fetchUserPosts(userId: string, limit: number = 10): Promise<UserPost[]> {
  try {
    const postsRef = collection(firestore, COLLECTION_PATHS.POSTS)
    const q = query(
      postsRef,
      where('author.id', '==', userId),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limit)
    )

    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        title: data.title || '',
        content: data.content || '',
        category: data.category || '',
        likesCount: data.stats?.likesCount || 0,
        commentsCount: data.stats?.commentsCount || 0,
        createdAt: data.createdAt instanceof Timestamp
          ? data.createdAt.toDate().toISOString()
          : new Date().toISOString(),
      }
    })
  } catch (error) {
    console.error('사용자 포스트 조회 실패:', error)
    throw error
  }
}

/**
 * UserComment 타입 (API 응답용)
 */
export type UserComment = {
  id: string
  content: string
  likesCount: number
  createdAt: string
  post?: {
    id: string
    title: string
  }
}

/**
 * 사용자의 댓글 목록 조회
 */
export async function fetchUserComments(_userId: string, _limit: number = 10): Promise<UserComment[]> {
  try {
    // Firestore는 컬렉션 그룹 쿼리 필요
    // 모든 posts/{postId}/comments를 검색
    // TODO: collectionGroup 사용 필요
    // const q = query(
    //   collectionGroup(firestore, 'comments'),
    //   where('author.id', '==', userId),
    //   orderBy('createdAt', 'desc'),
    //   firestoreLimit(limit)
    // )

    // 임시: 빈 배열 반환 (collectionGroup 구현 필요)
    console.warn('fetchUserComments: collectionGroup 구현 필요')
    return [] as UserComment[]
  } catch (error) {
    console.error('사용자 댓글 조회 실패:', error)
    throw error
  }
}

/**
 * UserBookmark 타입 (API 응답용)
 */
export type UserBookmark = {
  id: string
  notes?: string
  folderName?: string
  createdAt: string
  hand?: {
    id: string
    number: string
    description?: string
  }
}

/**
 * 사용자의 북마크 목록 조회
 */
export async function fetchUserBookmarks(userId: string, limit: number = 20): Promise<UserBookmark[]> {
  try {
    const bookmarksRef = collection(firestore, COLLECTION_PATHS.USER_BOOKMARKS(userId))
    const q = query(bookmarksRef, orderBy('createdAt', 'desc'), firestoreLimit(limit))

    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        notes: data.notes,
        folderName: data.folderName,
        createdAt: data.createdAt instanceof Timestamp
          ? data.createdAt.toDate().toISOString()
          : new Date().toISOString(),
        hand: data.handId ? {
          id: data.handId,
          number: data.handNumber || '',
          description: data.handDescription,
        } : undefined,
      }
    })
  } catch (error) {
    console.error('사용자 북마크 조회 실패:', error)
    throw error
  }
}

/**
 * 사용자의 전체 활동 요약 조회
 */
export async function fetchUserActivity(userId: string) {
  const [posts, comments, bookmarks] = await Promise.all([
    fetchUserPosts(userId, 5),
    fetchUserComments(userId, 5),
    fetchUserBookmarks(userId, 5),
  ])

  return {
    posts,
    comments,
    bookmarks,
  }
}

/**
 * 아바타 이미지 업로드
 *
 * Firebase Storage의 `users/{userId}/avatar` 경로에 이미지를 업로드합니다.
 * 기존 이미지가 있다면 덮어씌워집니다 (파일명이 고정되므로).
 * 브라우저 캐싱 문제를 방지하기 위해 업로드 후 URL에 타임스탬프를 추가할 수도 있으나,
 * 여기서는 단순함을 위해 기본 URL을 반환하고 클라이언트에서 캐시 무효화를 처리하는 것을 권장합니다.
 */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  // File size validation (max 5MB)
  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB in bytes
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('파일 크기는 5MB를 초과할 수 없습니다.')
  }

  // MIME type validation
  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error('허용되지 않는 파일 형식입니다. JPG, PNG, GIF, WEBP 파일만 업로드 가능합니다.')
  }

  // File extension validation (whitelist)
  const fileExt = file.name.split('.').pop()?.toLowerCase()
  const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp']
  if (!fileExt || !ALLOWED_EXTENSIONS.includes(fileExt)) {
    throw new Error('허용되지 않는 파일 확장자입니다.')
  }

  try {
    const { storage } = await import('@/lib/db/firebase')
    const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage')

    // 항상 'avatar'라는 이름으로 저장하여 덮어쓰기 (공간 절약 및 관리 용이성)
    // 확장자는 원본 유지를 위해 포함하지 않거나, 메타데이터로 관리할 수 있음.
    // 여기서는 단순하게 `avatar`로 저장. Firebase Storage는 Content-Type을 저장하므로 확장자 없어도 서빙 가능.
    // 하지만 브라우저 호환성을 위해 확장자를 붙이는 것이 좋음.
    // 여기서는 고정된 이름 'avatar' (확장자 없음)을 사용하여 덮어쓰기를 보장.
    // 필요하다면 `avatar.${fileExt}` 로 할 수도 있는데, 그러면 이전 파일 삭제 로직이 필요함.

    const storageRef = ref(storage, `users/${userId}/avatar`)

    // 메타데이터 설정
    const metadata = {
      contentType: file.type,
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString()
      }
    }

    await uploadBytes(storageRef, file, metadata)
    const downloadURL = await getDownloadURL(storageRef)

    return downloadURL
  } catch (error) {
    console.error('Avatar upload error:', error)
    throw new Error('이미지 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.')
  }
}
