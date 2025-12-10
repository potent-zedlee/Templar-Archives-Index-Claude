'use client'

import { useEffect, useState, useRef } from 'react'
import { PlaySquare, Trophy, Users, type LucideIcon } from 'lucide-react'
import type { PlatformStats } from '@/lib/main-page'

// 상수 정의
const STATS_CONFIG = [
  { key: 'totalHands', icon: PlaySquare, label: '전체 핸드' },
  { key: 'totalTournaments', icon: Trophy, label: '토너먼트' },
  { key: 'totalPlayers', icon: Users, label: '플레이어' },
] as const

interface StatsSectionProps {
  stats: PlatformStats
}

export function StatsSection({ stats }: StatsSectionProps) {
  return (
    <section className="py-12 md:py-16 bg-black/40 backdrop-blur-sm" aria-label="플랫폼 통계">
      <div className="container max-w-7xl mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {STATS_CONFIG.map(({ key, icon, label }) => (
            <StatCard
              key={key}
              icon={icon}
              label={label}
              value={stats[key]}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: number
}

function StatCard({ icon: Icon, label, value }: StatCardProps) {
  const [count, setCount] = useState(0)
  const [hasAnimated, setHasAnimated] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  // Intersection Observer로 뷰포트 진입 시에만 애니메이션 시작
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true)
        }
      },
      { threshold: 0.5 }
    )

    if (cardRef.current) {
      observer.observe(cardRef.current)
    }

    return () => observer.disconnect()
  }, [hasAnimated])

  // 카운트 애니메이션
  useEffect(() => {
    if (!hasAnimated) return
    if (value === 0) return

    const duration = 2000
    const startTime = performance.now()
    let animationId: number

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      // easeOutExpo 이징
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      setCount(Math.floor(eased * value))

      if (progress < 1) {
        animationId = requestAnimationFrame(animate)
      }
    }

    animationId = requestAnimationFrame(animate)

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [hasAnimated, value])

  return (
    <article
      ref={cardRef}
      className="group bg-background border border-border rounded-lg p-6 sm:p-8 hover:border-gold-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-gold-400/10"
      aria-label={`${label}: ${value.toLocaleString()}`}
    >
      <div className="flex flex-col items-center gap-3 sm:gap-4 text-center">
        {/* Icon */}
        <div
          className="p-3 sm:p-4 bg-gold-400/10 rounded-full group-hover:bg-gold-400/20 transition-colors"
          aria-hidden="true"
        >
          <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-gold-400" />
        </div>

        {/* Number */}
        <div
          className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tabular-nums"
          aria-hidden="true"
        >
          {count.toLocaleString()}
        </div>

        {/* Label */}
        <div className="text-xs sm:text-sm md:text-base text-muted-foreground font-medium uppercase tracking-wider">
          {label}
        </div>
      </div>
    </article>
  )
}
