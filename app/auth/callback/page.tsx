"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { auth } from "@/lib/db/firebase"
import { getRedirectResult } from "firebase/auth"
import { Loader2 } from "lucide-react"

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Firebase OAuth redirect 결과 처리
    const handleCallback = async () => {
      try {
        // Firebase redirect 결과 가져오기
        const result = await getRedirectResult(auth)

        if (result) {
          // OAuth 로그인 성공
          console.log("Firebase Auth: 로그인 성공", result.user.email)
          router.push("/")
          return
        }

        // 이미 로그인된 상태인지 확인
        const currentUser = auth.currentUser
        if (currentUser) {
          console.log("Firebase Auth: 이미 로그인됨", currentUser.email)
          router.push("/")
          return
        }

        // URL에서 에러 파라미터 확인
        const errorParam = searchParams.get("error")
        if (errorParam) {
          console.error("인증 콜백 오류:", errorParam)
          setError(`로그인 중 오류가 발생했습니다: ${errorParam}`)
          setTimeout(() => {
            router.push("/auth/login")
          }, 3000)
          return
        }

        // 세션이 없으면 로그인 페이지로
        console.log("Firebase Auth: 세션 없음, 로그인 페이지로 이동")
        router.push("/auth/login")

      } catch (err) {
        console.error("예상치 못한 오류:", err)

        // Firebase 인증 오류 처리
        if (err instanceof Error) {
          if (err.message.includes("auth/account-exists-with-different-credential")) {
            setError("이미 다른 로그인 방식으로 등록된 이메일입니다. 기존 방식으로 로그인해주세요.")
          } else if (err.message.includes("auth/popup-closed-by-user")) {
            setError("로그인 창이 닫혔습니다. 다시 시도해주세요.")
          } else if (err.message.includes("auth/cancelled-popup-request")) {
            // 여러 팝업이 열렸을 때 발생 - 무시하고 로그인 페이지로
            router.push("/auth/login")
            return
          } else {
            setError("로그인 중 오류가 발생했습니다.")
          }
        } else {
          setError("로그인 중 오류가 발생했습니다.")
        }

        setTimeout(() => {
          router.push("/auth/login")
        }, 3000)
      }
    }

    handleCallback()
  }, [router, searchParams])

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <div className="text-destructive text-body-lg">{error}</div>
        <p className="text-caption text-muted-foreground">잠시 후 로그인 페이지로 이동합니다...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-caption text-muted-foreground">로그인 처리 중...</p>
    </div>
  )
}
