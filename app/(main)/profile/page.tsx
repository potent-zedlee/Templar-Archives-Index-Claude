```
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Check, X, AlertTriangle, Trash2, Shield } from "lucide-react"
import { useAuth } from "@/components/layout/AuthProvider"
import { toast } from "sonner"
import {
  useCurrentUserProfileQuery,
  useCheckNicknameQuery,
  useUpdateProfileMutation,
} from "@/lib/queries/profile-queries"
import { TwoFactorSetup } from "@/components/security/TwoFactorSetup"
import { getTwoFactorStatus } from "@/app/actions/two-factor"
import { AvatarUpload } from "@/components/profile/AvatarUpload"

export default function ProfileClient() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  // React Query hooks
  const { data: profile = null, isLoading: loading } = useCurrentUserProfileQuery()
  const updateProfileMutation = useUpdateProfileMutation()

  // Form state
  const [nickname, setNickname] = useState("")
  const [bio, setBio] = useState("")
  const [pokerExperience, setPokerExperience] = useState("")
  const [nicknameForCheck, setNicknameForCheck] = useState("")

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [backupCodesRemaining, setBackupCodesRemaining] = useState(0)
  const [twoFactorLoading, setTwoFactorLoading] = useState(true)

  // Nickname duplicate check (with debounce)
  const shouldCheckNickname = nicknameForCheck !== "" && nicknameForCheck !== profile?.nickname
  const nicknameRegex = /^[a-zA-Z0-9가-힣_]{3,20}$/
  const isValidFormat = nicknameRegex.test(nicknameForCheck)

  const { data: isNicknameAvailable, isLoading: checking } = useCheckNicknameQuery(
    nicknameForCheck,
    user?.id,
    shouldCheckNickname && isValidFormat
  )

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login")
    }
  }, [user, authLoading, router])

  // Initialize form when profile loads
  useEffect(() => {
    if (profile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNickname(profile.nickname)
      setBio(profile.bio || "")
      setPokerExperience(profile.pokerExperience || "")
    }
  }, [profile])

  // Load 2FA status
  useEffect(() => {
    async function loadTwoFactorStatus() {
      if (!user) return

      try {
        const result = await getTwoFactorStatus()
        if (result.success && result.data) {
          setTwoFactorEnabled(result.data.enabled)
          setBackupCodesRemaining(result.data.backupCodesRemaining || 0)
        }
      } catch (error) {
        console.error('2FA 상태 로드 실패:', error)
      } finally {
        setTwoFactorLoading(false)
      }
    }

    loadTwoFactorStatus()
  }, [user])

  // Debounce nickname check (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setNicknameForCheck(nickname)
    }, 500)

    return () => clearTimeout(timer)
  }, [nickname])

  function handleNicknameChange(value: string) {
    setNickname(value)
  }

  function handleSave() {
    if (!user) return

    // Don't save if nickname changed but unavailable
    const nicknameAvailability = nicknameForCheck === profile?.nickname ? true : isNicknameAvailable
    if (nickname !== profile?.nickname && !nicknameAvailability) {
      toast.error('Please check your nickname.')
      return
    }

    updateProfileMutation.mutate(
      {
        userId: user.id,
        updates: {
          nickname,
          bio: bio || undefined,
          pokerExperience: pokerExperience || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success('Profile updated successfully!')
        },
        onError: (error) => {
          console.error('Profile save failed:', error)
          toast.error('Failed to save profile. Please try again.')
        },
      }
    )
  }

  const nicknameAvailability = nicknameForCheck === profile?.nickname ? true : isNicknameAvailable

  const canSave =
    nickname.length >= 3 &&
    (nickname === profile?.nickname || nicknameAvailability === true) &&
    !checking &&
    (nickname !== profile?.nickname || bio !== (profile?.bio || "") || pokerExperience !== (profile?.pokerExperience || ""))

  const saving = updateProfileMutation.isPending

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gold-400" />
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="flex flex-1 items-center justify-center">
          <p className="text-black-600">Failed to load profile.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="container max-w-4xl mx-auto px-4 py-8">
        {/* Profile Settings Card */}
        <div className="card-postmodern mb-8">
          <div className="p-6 border-b-2 border-black-300">
            <h1 className="text-heading text-2xl mb-2">PROFILE SETTINGS</h1>
            <p className="text-black-600">
              Manage your profile information for Templar Archives.
            </p>
          </div>

          <div className="p-6 space-y-8">
            {/* Profile Photo */}
            <div className="flex items-center gap-6">
              <AvatarUpload
                currentImageUrl={profile.avatarUrl}
                nickname={profile.nickname}
                onUpload={async (file) => {
                  if (!user) throw new Error('User not authenticated')
                  
                  try {
                    const { uploadAvatar } = await import('@/lib/user-profile')
                    const url = await uploadAvatar(user.id, file)

                    // Firestore 업데이트
                    await updateProfileMutation.mutateAsync({
                      userId: user.id,
                      updates: { avatarUrl: url }
                    })

                    toast.success('Avatar updated successfully')
                    return url
                  } catch (error) {
                    console.error('Avatar upload failed', error)
                    throw error
                  }
                }}
              />
              <div>
                <p className="text-caption font-medium mb-1">{profile.nickname}</p>
                <p className="text-xs text-black-600 mb-2">{profile.email}</p>
                <p className="text-xs text-muted-foreground">
                  Recommend 500x500px or larger. Max 5MB.
                </p>
              </div>
            </div>

            {/* Nickname */}
            <div className="space-y-2">
              <label htmlFor="nickname" className="text-caption block">
                NICKNAME *
              </label>
              <div className="relative">
                <input
                  id="nickname"
                  type="text"
                  placeholder="PokerMaster123"
                  value={nickname}
                  onChange={(e) => handleNicknameChange(e.target.value)}
                  disabled={saving}
                  className="input-postmodern w-full pr-10"
                />
                {checking && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-black-600" />
                  </div>
                )}
                {!checking && nicknameAvailability === true && nickname !== profile.nickname && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Check className="h-4 w-4 text-gold-400" />
                  </div>
                )}
                {!checking && nicknameAvailability === false && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="h-4 w-4 text-destructive" />
                  </div>
                )}
              </div>
              <p className="text-xs text-black-600">
                3-20 characters, alphanumeric and underscore only
              </p>
              {nicknameAvailability === false && (
                <p className="text-xs text-destructive">
                  Nickname already in use or invalid format.
                </p>
              )}
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <label htmlFor="bio" className="text-caption block">BIO</label>
              <textarea
                id="bio"
                placeholder="A passionate poker player."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={saving}
                rows={4}
                maxLength={500}
                className="input-postmodern w-full resize-none"
              />
              <p className="text-xs text-black-600 text-right font-mono">
                {bio.length} / 500
              </p>
            </div>

            {/* Poker Experience */}
            <div className="space-y-2">
              <label htmlFor="poker-experience" className="text-caption block">
                POKER EXPERIENCE
              </label>
              <input
                id="poker-experience"
                type="text"
                placeholder="5 years, tournament focused"
                value={pokerExperience}
                onChange={(e) => setPokerExperience(e.target.value)}
                disabled={saving}
                maxLength={100}
                className="input-postmodern w-full"
              />
            </div>

            {/* Save button */}
            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={() => router.push("/")}
                disabled={saving}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!canSave || saving}
                className="btn-primary"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="card-postmodern mb-8">
          <div className="p-6 border-b-2 border-black-300">
            <h2 className="text-heading flex items-center gap-2">
              <Shield className="h-5 w-5 text-gold-400" />
              SECURITY
            </h2>
            <p className="text-black-600 mt-2">
              Manage your account security settings.
            </p>
          </div>
          <div className="p-6">
            {twoFactorLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-gold-400" />
              </div>
            ) : (
              <TwoFactorSetup
                initialEnabled={twoFactorEnabled}
                initialBackupCodesRemaining={backupCodesRemaining}
                onStatusChange={(enabled) => {
                  setTwoFactorEnabled(enabled)
                  if (!enabled) {
                    setBackupCodesRemaining(0)
                  }
                }}
              />
            )}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="card-postmodern border-2 border-destructive">
          <div className="p-6 border-b-2 border-destructive/50">
            <h2 className="text-heading flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              DANGER ZONE
            </h2>
            <p className="text-black-600 mt-2">
              Irreversible actions that affect your account and data.
            </p>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between p-4 border-2 border-destructive/20 bg-destructive/5">
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">Request Data Deletion</h3>
                <p className="text-xs text-black-600">
                  Exercise your right to be forgotten under GDPR, CCPA, and PIPL. This will permanently delete all your data.
                </p>
              </div>
              <button
                onClick={() => router.push("/profile/delete-data")}
                className="ml-4 px-4 py-2 border-2 border-destructive bg-destructive text-white hover:bg-destructive/90 transition-colors flex items-center gap-2 text-sm uppercase font-bold"
              >
                <Trash2 className="h-4 w-4" />
                Request Deletion
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
