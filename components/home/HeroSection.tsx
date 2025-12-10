'use client'

import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { ArrowRight } from 'lucide-react'

// ShapeBlur는 WebGL 사용하므로 SSR 비활성화
const ShapeBlur = dynamic(() => import('@/components/backgrounds/ShapeBlur'), {
  ssr: false,
})

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
          {/* Logo with ShapeBlur effect */}
          <div className="relative mb-6 sm:mb-8">
            {/* ShapeBlur 배경 효과 */}
            <div className="absolute inset-0 -inset-x-20 -inset-y-10 pointer-events-auto">
              <ShapeBlur
                variation={1}
                shapeSize={1.0}
                roundness={0.5}
                borderSize={0.05}
                circleSize={0.5}
                circleEdge={1}
                className="opacity-60"
              />
            </div>
            {/* 로고 이미지 */}
            <Image
              src="/logo.svg"
              alt="Templar Archives"
              width={800}
              height={200}
              priority
              className="relative z-10 h-32 sm:h-48 md:h-64 lg:h-80 w-auto"
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
