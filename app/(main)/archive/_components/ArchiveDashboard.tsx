"use client"

/**
 * Archive Dashboard
 *
 * 스트림을 선택하지 않았을 때 표시되는 대시보드
 * - 전체 통계 (토너먼트, 이벤트, 스트림, 핸드 수)
 * - 카테고리별 핸드 분포
 */

import { useMemo } from 'react'
import { Trophy, Calendar, Video, PlayCircle, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tournament } from '@/lib/types/archive'

interface ArchiveDashboardProps {
  tournaments: Tournament[]
}

export function ArchiveDashboard({ tournaments }: ArchiveDashboardProps) {
  // 통계 계산
  const stats = useMemo(() => {
    const totalTournaments = tournaments.length
    const totalEvents = tournaments.reduce((sum, t) => sum + (t.events?.length || 0), 0)
    const totalStreams = tournaments.reduce((sum, t) =>
      sum + (t.events?.reduce((s, e) => s + (e.streams?.length || 0), 0) || 0), 0
    )
    const totalHands = tournaments.reduce((sum, t) =>
      sum + (t.events?.reduce((s, e) =>
        s + (e.streams?.reduce((h, stream) => h + (stream.handCount || 0), 0) || 0), 0) || 0), 0
    )

    return { totalTournaments, totalEvents, totalStreams, totalHands }
  }, [tournaments])

  // 카테고리별 집계
  const categoryStats = useMemo(() => {
    const categories: Record<string, { count: number; tournaments: number }> = {}
    tournaments.forEach(t => {
      if (!categories[t.category]) {
        categories[t.category] = { count: 0, tournaments: 0 }
      }
      categories[t.category].tournaments++
    })
    return Object.entries(categories)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.tournaments - a.tournaments)
  }, [tournaments])

  return (
    <div data-testid="archive-dashboard" className="flex-1 overflow-auto bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Archive Dashboard</h1>
          <p data-testid="dashboard-hint" className="text-sm text-muted-foreground mt-1">
            왼쪽에서 스트림을 선택하면 핸드 히스토리를 확인할 수 있습니다.
          </p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Trophy}
            label="Total Tournaments"
            value={stats.totalTournaments}
            color="blue"
          />
          <StatCard
            icon={Calendar}
            label="Total Events"
            value={stats.totalEvents}
            color="purple"
          />
          <StatCard
            icon={Video}
            label="Total Streams"
            value={stats.totalStreams}
            color="orange"
          />
          <StatCard
            icon={PlayCircle}
            label="Total Hands"
            value={stats.totalHands}
            color="green"
          />
        </div>

        {/* 카테고리별 분포 */}
        <div className="bg-card rounded-lg p-6 border border-border">
          <h2 className="text-lg font-semibold mb-4 text-foreground">
            Category Distribution
          </h2>
          <div className="space-y-3">
            {categoryStats.map(({ name, tournaments: count }) => (
              <div key={name} className="flex items-center gap-3">
                <div className="w-32 text-sm font-medium text-foreground truncate">
                  {name}
                </div>
                <div className="flex-1 bg-muted rounded-full h-8 overflow-hidden">
                  <div
                    className="bg-green-600 dark:bg-green-500 h-full flex items-center justify-end px-3 text-xs text-white font-semibold transition-all"
                    style={{ width: `${(count / stats.totalTournaments) * 100}%` }}
                  >
                    {count > 0 && count}
                  </div>
                </div>
                <div className="w-20 text-right text-sm text-muted-foreground">
                  {((count / stats.totalTournaments) * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>

          {categoryStats.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              카테고리 데이터가 없습니다
            </div>
          )}
        </div>

        {/* Recent Activity Placeholder */}
        <div className="bg-card rounded-lg p-6 border border-border">
          <h2 className="text-lg font-semibold mb-4 text-foreground">
            Recent Hands
          </h2>
          <div className="text-center py-8 text-sm text-muted-foreground">
            최근 핸드 데이터를 보려면 스트림을 선택하세요
          </div>
        </div>
      </div>
    </div>
  )
}

// StatCard 컴포넌트
function StatCard({ icon: Icon, label, value, color }: {
  icon: LucideIcon
  label: string
  value: number
  color: 'blue' | 'purple' | 'orange' | 'green'
}) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
  }

  return (
    <div className="bg-card rounded-lg p-6 border border-border hover:shadow-lg transition-shadow">
      <div className="flex items-center gap-3">
        <div className={cn("p-3 rounded-lg", colorClasses[color])}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold text-foreground">
            {value.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  )
}
