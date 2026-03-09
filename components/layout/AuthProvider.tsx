"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { getUser, onAuthStateChange, type AuthUser } from '@/lib/supabase/auth'
import { getCurrentUserProfile, createProfile } from '@/lib/user-profile'
import { isAdminEmail } from '@/lib/auth/auth-utils'
import { NicknameSetupModal } from '@/components/dialogs/NicknameSetupModal'
import type { UserProfile } from '@/lib/user-profile'

type AuthContextType = {
  user: AuthUser | null
  profile: UserProfile | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showNicknameModal, setShowNicknameModal] = useState(false)

  const loadProfile = async (currentUser: AuthUser) => {
    try {
      let userProfile = await getCurrentUserProfile()

      // 프로필이 없으면 자동 생성
      if (!userProfile && currentUser) {
        userProfile = await createProfile({
          id: currentUser.id,
          email: currentUser.email || '',
          nickname: currentUser.displayName || undefined,
          avatar_url: currentUser.photoURL || undefined,
        })
      }

      setProfile(userProfile)

      // Profile이 있고 임시 닉네임 형식이면 모달 표시
      if (userProfile) {
        const isTempNickname = /\d{6}$/.test(userProfile.nickname)
        setShowNicknameModal(isTempNickname)
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
    }
  }

  useEffect(() => {
    // 초기 사용자 조회
    getUser().then((user) => {
      setUser(user)
      if (user) {
        loadProfile(user)
      }
      setLoading(false)
    })

    // 인증 상태 변경 감지
    const { unsubscribe } = onAuthStateChange((user) => {
      setUser(user)
      if (user) {
        loadProfile(user)
      } else {
        setProfile(null)
        setShowNicknameModal(false)
      }
      setLoading(false)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const handleNicknameComplete = async () => {
    setShowNicknameModal(false)
    // Profile 다시 로드
    if (user) {
      await loadProfile(user)
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
      {showNicknameModal && profile && (
        <NicknameSetupModal
          open={showNicknameModal}
          currentNickname={profile.nickname}
          onComplete={handleNicknameComplete}
        />
      )}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error('useAuth는 AuthProvider 내에서만 사용할 수 있습니다')
  }

  return context
}
