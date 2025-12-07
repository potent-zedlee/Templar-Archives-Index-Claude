"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { signInWithGoogle } from "@/lib/auth/auth"
import { useAuth } from "@/components/layout/AuthProvider"
import { Loader2, AlertTriangle, ExternalLink } from "lucide-react"
import { useWebViewDetection, getOpenInBrowserMessage } from "@/lib/utils/webview-detector"

export default function LoginClient() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const webViewDetection = useWebViewDetection()

  // Redirect logged-in users to home
  useEffect(() => {
    if (!authLoading && user) {
      router.push("/")
    }
  }, [user, authLoading, router])

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      setError(null)
      await signInWithGoogle()
      // OAuth redirect will occur, no need to stop loading here
    } catch (err) {
      console.error("Login failed:", err)
      setError("Login failed. Please try again.")
      setLoading(false)
    }
  }

  // Loading or already logged in
  if (authLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black-0">
        <Loader2 className="h-8 w-8 animate-spin text-gold-400" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black-0 p-4">
      <div className="card-postmodern p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center border-2 border-gold-600 bg-gradient-to-br from-gold-400 to-gold-600">
              <span className="font-mono text-2xl font-bold text-black-0">GG</span>
            </div>
          </div>
          <h1 className="text-heading mb-2">WELCOME TO TEMPLAR ARCHIVES INDEX</h1>
          <p className="text-body text-text-muted">
            Poker Hand Archive and Community Platform
          </p>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* WebView Warning */}
          {webViewDetection.isWebView && (
            <div className="border-2 border-orange-500 bg-orange-950/20 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-caption-lg text-orange-300 mb-2">
                    앱 내부 브라우저에서는 로그인이 불가능합니다
                  </div>
                  <p className="text-body text-orange-400 mb-2">
                    Google 보안 정책상 {webViewDetection.browserName} 내부 브라우저에서는 로그인할 수 없습니다.
                  </p>
                  <p className="text-body text-orange-300 flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    {getOpenInBrowserMessage(webViewDetection.browserType)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={loading || webViewDetection.isWebView}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                SIGNING IN...
              </>
            ) : (
              <>
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                SIGN IN WITH GOOGLE
              </>
            )}
          </button>

          {error && (
            <p className="text-caption text-destructive text-center">{error}</p>
          )}

          <div className="text-caption text-text-muted text-center">
            By signing in, you agree to Templar Archives Index&apos;{" "}
            <a href="#" className="text-gold-400 hover:text-gold-300">
              Terms of Service
            </a>
            {" "}and{" "}
            <a href="#" className="text-gold-400 hover:text-gold-300">
              Privacy Policy
            </a>
            .
          </div>
        </div>
      </div>
    </div>
  )
}
