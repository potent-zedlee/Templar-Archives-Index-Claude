'use client'

/**
 * PipelineTabs - 파이프라인 상태별 탭 네비게이션
 *
 * Admin Archive 페이지에서 스트림을 상태별로 필터링
 *
 * @example
 * ```tsx
 * import { PipelineTabs } from '@/components/admin/PipelineTabs'
 *
 * function AdminArchive() {
 *   const [activeTab, setActiveTab] = useState<PipelineStatus | 'all'>('all')
 *   const { data: counts } = usePipelineStatusCounts()
 *
 *   return (
 *     <PipelineTabs
 *       activeTab={activeTab}
 *       onTabChange={setActiveTab}
 *       counts={counts}
 *     />
 *   )
 * }
 * ```
 */

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  LayoutGrid,
  Upload,
  FolderTree,
  Sparkles,
  CheckCircle,
  Globe,
  AlertCircle
} from 'lucide-react'
import type { PipelineStatus } from '@/lib/types/archive'
import type { PipelineStatusCounts } from '@/lib/queries/admin-archive-queries'

interface PipelineTab {
  status: PipelineStatus | 'all'
  label: string
  icon: React.ElementType
  color: string
  bgColor: string
}

// StreamCard.tsx와 동일한 색상 팔레트 사용
const tabs: PipelineTab[] = [
  { status: 'all', label: 'All', icon: LayoutGrid, color: 'text-foreground', bgColor: 'bg-muted' },
  { status: 'pending', label: 'Pending', icon: Upload, color: 'text-slate-600 dark:text-slate-400', bgColor: 'bg-slate-100 dark:bg-slate-800' },
  { status: 'needs_classify', label: 'Classify', icon: FolderTree, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  { status: 'analyzing', label: 'Analyzing', icon: Sparkles, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  { status: 'completed', label: 'Completed', icon: CheckCircle, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  { status: 'needs_review', label: 'Review', icon: CheckCircle, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  { status: 'published', label: 'Published', icon: Globe, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  { status: 'failed', label: 'Failed', icon: AlertCircle, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' },
]

interface PipelineTabsProps {
  activeTab: PipelineStatus | 'all'
  onTabChange: (status: PipelineStatus | 'all') => void
  counts?: PipelineStatusCounts
  className?: string
}

export function PipelineTabs({
  activeTab,
  onTabChange,
  counts,
  className
}: PipelineTabsProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {tabs.map((tab) => {
        const Icon = tab.icon
        const count = counts?.[tab.status] ?? 0
        const isActive = activeTab === tab.status

        return (
          <button
            key={tab.status}
            onClick={() => onTabChange(tab.status)}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
              'hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary',
              isActive
                ? cn(tab.bgColor, tab.color, 'shadow-sm')
                : 'bg-transparent text-muted-foreground hover:bg-muted'
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{tab.label}</span>
            {count > 0 && (
              <Badge
                variant="secondary"
                className={cn(
                  'ml-1 h-5 min-w-5 px-1.5 text-xs',
                  isActive && tab.bgColor
                )}
              >
                {count}
              </Badge>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ==================== Utility Functions ====================

/**
 * 상태별 라벨 가져오기 유틸
 *
 * @example
 * getPipelineStatusLabel('analyzing') // 'Analyzing'
 * getPipelineStatusLabel('needs_classify') // 'Classify'
 */
export function getPipelineStatusLabel(status: PipelineStatus): string {
  const tab = tabs.find((t) => t.status === status)
  return tab?.label || status
}

/**
 * 상태별 색상 가져오기 유틸
 *
 * @example
 * const { color, bgColor } = getPipelineStatusColor('completed')
 * // color: 'text-emerald-600 dark:text-emerald-400'
 * // bgColor: 'bg-emerald-100 dark:bg-emerald-900/30'
 */
export function getPipelineStatusColor(status: PipelineStatus): { color: string; bgColor: string } {
  const tab = tabs.find((t) => t.status === status)
  return {
    color: tab?.color || 'text-foreground',
    bgColor: tab?.bgColor || 'bg-muted',
  }
}
