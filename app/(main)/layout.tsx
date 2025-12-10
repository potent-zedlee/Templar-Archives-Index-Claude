import { Header } from "@/components/header/Header"
import { LiquidEtherBackground } from "@/components/backgrounds/LiquidEtherBackground"

/**
 * Main Layout
 *
 * 모든 메인 페이지에 공통으로 적용되는 레이아웃
 * - Header 자동 포함
 * - LiquidEther 배경 애니메이션
 * - Route Groups: (main)은 URL에 포함되지 않음
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <LiquidEtherBackground
      colors={['#5227FF', '#FF9FFC', '#00D4FF']}
      className="bg-black"
    >
      <Header />
      {children}
    </LiquidEtherBackground>
  )
}
