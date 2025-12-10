import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'

// 상수 정의
const HERO_CONTENT = {
  subtitle: '프로 포커 토너먼트의 모든 핸드 히스토리를 분석하고 학습하세요',
  ctaPrimary: 'Archive 둘러보기',
  ctaSecondary: '핸드 검색하기',
  features: ['AI 영상 분석', 'GTO 분석', '실시간 통계'],
} as const

export function HeroSection() {
  return (
    <section
      className="relative py-16 sm:py-20 md:py-32 overflow-hidden"
      aria-labelledby="hero-title"
    >
      {/* Background with gold glow effect - transparent to show LiquidEther */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent" aria-hidden="true" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold-400/10 via-transparent to-transparent" aria-hidden="true" />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(rgba(251, 191, 36, 0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(251, 191, 36, 0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
        aria-hidden="true"
      />

      <div className="container max-w-7xl mx-auto px-4 md:px-6 relative z-10">
        <div className="flex flex-col items-center text-center space-y-6 sm:space-y-8">
          {/* Logo */}
          <div className="mb-6 sm:mb-8">
            <Image
              src="/logo.svg"
              alt="Templar Archives"
              width={800}
              height={800}
              priority
              className="w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 xl:w-[28rem] xl:h-[28rem]"
            />
          </div>

          {/* Subtitle */}
          <div className="space-y-3 sm:space-y-4">
            <h1 id="hero-title" className="sr-only">Templar Archives</h1>
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto px-4 sm:px-0">
              {HERO_CONTENT.subtitle}
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 pt-2 sm:pt-4 w-full sm:w-auto px-4 sm:px-0">
            <Link
              href="/archive"
              className="group px-6 sm:px-8 py-3 sm:py-4 bg-gold-400 text-gray-900 font-bold text-base sm:text-lg rounded-lg hover:bg-gold-500 transition-all duration-300 shadow-lg shadow-gold-400/20 hover:shadow-gold-400/40 hover:scale-105 text-center"
            >
              <span className="flex items-center justify-center gap-2">
                {HERO_CONTENT.ctaPrimary}
                <ArrowRight
                  className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                  aria-hidden="true"
                />
              </span>
            </Link>
            <Link
              href="/search"
              className="px-6 sm:px-8 py-3 sm:py-4 bg-muted text-foreground font-bold text-base sm:text-lg rounded-lg hover:bg-muted/80 transition-all duration-300 border border-border hover:border-gold-400/50 text-center"
            >
              {HERO_CONTENT.ctaSecondary}
            </Link>
          </div>

          {/* Feature badges */}
          <nav
            className="flex flex-wrap gap-2 sm:gap-3 justify-center pt-6 sm:pt-8 px-4 sm:px-0"
            aria-label="주요 기능"
          >
            {HERO_CONTENT.features.map((feature) => (
              <span
                key={feature}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-muted/80 text-muted-foreground text-xs sm:text-sm rounded-full border border-border/50 backdrop-blur-sm"
              >
                {feature}
              </span>
            ))}
          </nav>
        </div>
      </div>
    </section>
  )
}
