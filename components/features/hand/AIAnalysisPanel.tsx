/**
 * AI Analysis Panel Component
 *
 * AI 분석 결과를 시각적으로 표시하는 패널
 * - 신뢰도 게이지
 * - 핸드 품질 배지
 * - AI 추론 설명
 * - 플레이어 감정/플레이 스타일 분석
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ChevronDown,
  ChevronUp,
  Sparkles,
  Star,
  Flame,
  AlertCircle,
  TrendingUp,
  Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AIAnalysis } from '@/lib/db/firestore-types'

interface AIAnalysisPanelProps {
  analysis: AIAnalysis | null
  isLoading?: boolean
  className?: string
}

/**
 * 신뢰도 레벨에 따른 색상 반환
 */
const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.8) return 'text-green-500 bg-green-500/10 border-green-500/50'
  if (confidence >= 0.5) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/50'
  return 'text-red-500 bg-red-500/10 border-red-500/50'
}

/**
 * 신뢰도 프로그레스 바 색상 (Tailwind)
 */
const getConfidenceProgressClass = (confidence: number): string => {
  if (confidence >= 0.8) return 'bg-green-500'
  if (confidence >= 0.5) return 'bg-yellow-500'
  return 'bg-red-500'
}

/**
 * 핸드 품질에 따른 배지 스타일 및 아이콘
 */
const getHandQualityBadge = (quality: string) => {
  switch (quality) {
    case 'epic':
      return {
        label: 'EPIC',
        icon: <Flame className="w-3 h-3" />,
        className: 'bg-purple-500 text-white border-purple-600 hover:bg-purple-600',
      }
    case 'highlight':
      return {
        label: 'HIGHLIGHT',
        icon: <Star className="w-3 h-3" />,
        className: 'bg-yellow-500 text-black border-yellow-600 hover:bg-yellow-600',
      }
    case 'interesting':
      return {
        label: 'INTERESTING',
        icon: <Sparkles className="w-3 h-3" />,
        className: 'bg-blue-500 text-white border-blue-600 hover:bg-blue-600',
      }
    default:
      return {
        label: 'ROUTINE',
        icon: <Activity className="w-3 h-3" />,
        className: 'bg-gray-500 text-white border-gray-600 hover:bg-gray-600',
      }
  }
}

/**
 * 감정 상태 아이콘 및 색상
 */
const getEmotionalStateDisplay = (state: string) => {
  switch (state) {
    case 'tilting':
      return { emoji: '😤', label: 'Tilting', className: 'text-red-500 bg-red-500/10' }
    case 'confident':
      return { emoji: '😎', label: 'Confident', className: 'text-green-500 bg-green-500/10' }
    case 'cautious':
      return { emoji: '🤔', label: 'Cautious', className: 'text-yellow-500 bg-yellow-500/10' }
    default:
      return { emoji: '😐', label: 'Neutral', className: 'text-gray-500 bg-gray-500/10' }
  }
}

/**
 * 플레이 스타일 배지 색상
 */
const getPlayStyleBadge = (style: string) => {
  switch (style) {
    case 'aggressive':
      return { label: 'Aggressive', className: 'border-red-500 text-red-500 bg-red-500/5' }
    case 'passive':
      return { label: 'Passive', className: 'border-blue-500 text-blue-500 bg-blue-500/5' }
    default:
      return { label: 'Balanced', className: 'border-green-500 text-green-500 bg-green-500/5' }
  }
}

export function AIAnalysisPanel({ analysis, isLoading = false, className }: AIAnalysisPanelProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [showFullReasoning, setShowFullReasoning] = useState(false)

  if (isLoading) {
    return (
      <Card className={cn('card-postmodern', className)}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gold-400 animate-pulse" />
            <CardTitle className="text-heading">AI 분석 중...</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            <div className="h-4 bg-gold-700/20 rounded w-3/4" />
            <div className="h-4 bg-gold-700/20 rounded w-1/2" />
            <div className="h-4 bg-gold-700/20 rounded w-5/6" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!analysis) {
    return (
      <Card className={cn('card-postmodern border-gold-700/50', className)}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-gold-400/50" />
            <CardTitle className="text-heading text-gold-400/70">AI 분석 없음</CardTitle>
          </div>
          <CardDescription className="text-text-muted">
            이 핸드는 아직 AI 분석이 완료되지 않았습니다.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const { confidence, reasoning, playerStates, handQuality } = analysis
  const confidencePercent = Math.round(confidence * 100)
  const qualityBadge = getHandQualityBadge(handQuality)

  // 추론 설명 텍스트 자르기 (최대 3줄 = 약 200자)
  const reasoningPreview = reasoning.length > 200 ? reasoning.slice(0, 200) + '...' : reasoning
  const hasMoreReasoning = reasoning.length > 200

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <Card className="card-postmodern border-gold-600 shadow-ambient-gold">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gold-500/5 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-gold-400" />
                <CardTitle className="text-heading luxury-gradient">AI 분석 결과</CardTitle>
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  className={cn(
                    'font-black text-xs uppercase border-2',
                    qualityBadge.className
                  )}
                >
                  {qualityBadge.icon}
                  <span className="ml-1">{qualityBadge.label}</span>
                </Badge>
                {isOpen ? (
                  <ChevronUp className="w-5 h-5 text-gold-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gold-400" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
            {/* 신뢰도 게이지 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-gold-400" />
                  <span className="text-sm font-bold text-text-primary">분석 신뢰도</span>
                </div>
                <div
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-black border-2',
                    getConfidenceColor(confidence)
                  )}
                >
                  {confidencePercent}%
                </div>
              </div>
              <div className="relative">
                <Progress value={confidencePercent} className="h-3 bg-gold-700/20" />
                <div
                  className={cn(
                    'absolute top-0 left-0 h-full rounded-full transition-all',
                    getConfidenceProgressClass(confidence)
                  )}
                  style={{ width: `${confidencePercent}%` }}
                />
              </div>
            </div>

            {/* AI 추론 설명 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-gold-400" />
                <span className="text-sm font-bold text-text-primary">AI 추론</span>
              </div>
              <div className="border-l-3 border-gold-500 pl-4 py-2 bg-gold-500/5 rounded-r">
                <p className="text-sm text-text-secondary leading-relaxed">
                  {showFullReasoning ? reasoning : reasoningPreview}
                </p>
                {hasMoreReasoning && (
                  <button
                    onClick={() => setShowFullReasoning(!showFullReasoning)}
                    className="mt-2 text-xs text-gold-400 hover:text-gold-300 font-bold uppercase flex items-center gap-1"
                  >
                    {showFullReasoning ? (
                      <>
                        <ChevronUp className="w-3 h-3" />
                        접기
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3" />
                        더보기
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* 플레이어 상태 테이블 */}
            {playerStates && Object.keys(playerStates).length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-gold-400" />
                  <span className="text-sm font-bold text-text-primary">플레이어 분석</span>
                </div>
                <div className="border-2 border-gold-700 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gold-700/10">
                        <TableHead className="text-gold-300 font-black uppercase text-xs">
                          플레이어
                        </TableHead>
                        <TableHead className="text-gold-300 font-black uppercase text-xs">
                          감정 상태
                        </TableHead>
                        <TableHead className="text-gold-300 font-black uppercase text-xs">
                          플레이 스타일
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(playerStates).map(([playerName, state]) => {
                        const emotionalDisplay = getEmotionalStateDisplay(state.emotionalState)
                        const playStyleBadge = getPlayStyleBadge(state.playStyle)

                        return (
                          <TableRow key={playerName} className="hover:bg-gold-700/5">
                            <TableCell className="font-bold text-text-primary">
                              {playerName}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{emotionalDisplay.emoji}</span>
                                <Badge className={cn('text-xs', emotionalDisplay.className)}>
                                  {emotionalDisplay.label}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn('text-xs border-2', playStyleBadge.className)}
                              >
                                {playStyleBadge.label}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
