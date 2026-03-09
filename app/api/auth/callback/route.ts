import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // next 매개변수가 있으면 해당 경로로 리다이렉트, 없으면 루트(/)로 리다이렉트
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host') // 원래의 클라이언트 호스트 파악 (Vercel 등에서)
      const isLocalhost = process.env.NODE_ENV === 'development'
      
      if (isLocalhost) {
        // 로컬 개발 환경
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        // Vercel 등 배포 환경
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        // Fallback
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // 인증 코드가 없거나 에러가 발생한 경우 오류 페이지 또는 메인으로 리다이렉트
  return NextResponse.redirect(`${origin}/auth/auth-error`)
}
