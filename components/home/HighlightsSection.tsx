'use client'

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { ThumbsUp, Play, TrendingUp, Sparkles } from 'lucide-react'
import type { WeeklyHighlight } from '@/lib/main-page'

// 상수 정의
const HIGHLIGHTS_CONTENT = {
  title: '주간 하이라이트',
  subtitle: '최근 7일간 가장 많은 좋아요를 받은 핸드',
  emptyTitle: '아직 하이라이트가 없습니다',
  emptySubtitle: '새로운 핸드가 등록되면 여기에 표시됩니다',
  viewButton: '핸드 보기',
} as const

interface HighlightsSectionProps {
  highlights: WeeklyHighlight[]
}

export function HighlightsSection({ highlights }: HighlightsSectionProps) {
  return (
    <section
      className="py-12 md:py-16 bg-background"
      aria-labelledby="highlights-title"
    >
      <div className="container max-w-7xl mx-auto px-4 md:px-6">
        {/* Section Header */}
        <div className="flex items-center gap-3 mb-8">
          <TrendingUp className="w-6 h-6 text-gold-400" aria-hidden="true" />
          <div>
            <h2 id="highlights-title" className="text-2xl sm:text-3xl font-bold text-foreground">
              {HIGHLIGHTS_CONTENT.title}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              {HIGHLIGHTS_CONTENT.subtitle}
            </p>
          </div>
        </div>

        {/* Empty State or Cards Grid */}
        {highlights.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {highlights.map((hand) => (
              <HighlightCard key={hand.id} hand={hand} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div
        className="w-16 h-16 bg-gold-400/10 rounded-full flex items-center justify-center mb-4"
        aria-hidden="true"
      >
        <Sparkles className="w-8 h-8 text-gold-400" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {HIGHLIGHTS_CONTENT.emptyTitle}
      </h3>
      <p className="text-muted-foreground text-sm max-w-md">
        {HIGHLIGHTS_CONTENT.emptySubtitle}
      </p>
      <Link
        href="/archive"
        className="mt-6 px-6 py-3 bg-gold-400 text-gray-900 font-semibold rounded-lg hover:bg-gold-500 transition-colors"
      >
        Archive 둘러보기
      </Link>
    </div>
  )
}

function HighlightCard({ hand }: { hand: WeeklyHighlight }) {
  return (
    <article
      className="group bg-muted border border-border rounded-lg overflow-hidden hover:border-gold-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-gold-400/10"
      aria-labelledby={`hand-${hand.id}-title`}
    >
      {/* Video Thumbnail */}
      <div className="relative aspect-video bg-background overflow-hidden">
        {hand.video_url ? (
          <LazyVideo videoUrl={hand.video_url} handNumber={hand.number} />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center bg-muted"
            aria-label="비디오 없음"
          >
            <Play className="w-12 h-12 text-muted-foreground" aria-hidden="true" />
          </div>
        )}

        {/* Hand Number Badge */}
        <div className="absolute top-3 right-3">
          <span className="px-3 py-1 bg-gold-400 text-background text-sm font-bold rounded-full">
            #{hand.number}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
        {/* Tournament & Stream */}
        <div className="space-y-1">
          <p
            id={`hand-${hand.id}-title`}
            className="text-xs text-muted-foreground uppercase tracking-wider"
          >
            {hand.tournament_name}
          </p>
          <p className="text-sm text-muted-foreground">{hand.stream_name}</p>
        </div>

        {/* Description */}
        {hand.description && (
          <p className="text-foreground line-clamp-2 text-sm leading-relaxed">
            {hand.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <ThumbsUp className="w-4 h-4" aria-hidden="true" />
            <span className="text-sm font-medium" aria-label={`${hand.likes_count}개의 좋아요`}>
              {hand.likes_count}
            </span>
          </div>
          {hand.pot_size > 0 && (
            <span className="text-sm font-bold text-gold-400" aria-label={`팟 사이즈 ${hand.pot_size.toLocaleString()}달러`}>
              ${hand.pot_size.toLocaleString()}
            </span>
          )}
        </div>

        {/* View Button */}
        <Link
          href={`/archive?hand=${hand.id}`}
          className="block w-full py-3 bg-background text-foreground text-center font-semibold rounded-lg hover:bg-muted/50 transition-colors border border-border hover:border-gold-400/50"
          aria-label={`핸드 #${hand.number} 상세 보기`}
        >
          {HIGHLIGHTS_CONTENT.viewButton}
        </Link>
      </div>
    </article>
  )
}

// Lazy Loading Video Component with Intersection Observer
function LazyVideo({ videoUrl, handNumber }: { videoUrl: string; handNumber: number }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '100px', threshold: 0.1 }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <div ref={containerRef} className="w-full h-full">
      {isVisible ? (
        <>
          <video
            ref={videoRef}
            src={videoUrl}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            preload="metadata"
            muted
            playsInline
            onLoadedData={() => setIsLoaded(true)}
            aria-label={`핸드 #${handNumber} 비디오 썸네일`}
          />
          {!isLoaded && (
            <div className="absolute inset-0 bg-muted animate-pulse" aria-hidden="true" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" aria-hidden="true" />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="p-4 bg-gold-400 rounded-full" aria-hidden="true">
              <Play className="w-8 h-8 text-background fill-current" />
            </div>
          </div>
        </>
      ) : (
        <div className="w-full h-full bg-muted animate-pulse" aria-hidden="true" />
      )}
    </div>
  )
}
