import { getPlatformStats, getWeeklyHighlights } from '@/app/actions/home'
import { HeroSection } from '@/components/home/HeroSection'
import { StatsSection } from '@/components/home/StatsSection'
import { HighlightsSection } from '@/components/home/HighlightsSection'

export const metadata = {
  title: 'Templar Archives - 프로 포커 핸드 히스토리 아카이브',
  description: '프로 포커 토너먼트의 모든 핸드 히스토리를 분석하고 학습하세요',
}

export default async function HomePage() {
  const [stats, highlights] = await Promise.all([
    getPlatformStats(),
    getWeeklyHighlights(),
  ])

  return (
    <main className="min-h-screen">
      <HeroSection />
      <StatsSection stats={stats} />
      <HighlightsSection highlights={highlights} />
    </main>
  )
}
