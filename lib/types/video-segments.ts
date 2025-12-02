/**
 * Video Segments Types
 *
 * 비디오 세그먼트 (구간) 타입 정의
 * Analysis-logic.md에 정의된 영상 구간 설정을 위한 타입
 */

/**
 * 세그먼트 타입
 */
export type SegmentType =
  | 'countdown' // 카운트다운
  | 'opening' // 오프닝 시퀀스
  | 'gameplay' // 게임플레이
  | 'break' // 브레이크
  | 'ending' // 엔딩 시퀀스

/**
 * 비디오 세그먼트 (단일 구간)
 */
export interface VideoSegment {
  id: string
  type: SegmentType
  startTime: string // "HH:MM:SS" 또는 "MM:SS"
  endTime: string // "HH:MM:SS" 또는 "MM:SS"
  duration?: number // 자동 계산 (초 단위)
  label?: string // 선택적 커스텀 라벨
}

/**
 * 비디오 세그먼트 설정 (전체)
 */
export interface VideoSegments {
  totalDuration: string // 전체 영상 길이 "HH:MM:SS"
  segments: VideoSegment[]
}

/**
 * 시간 문자열을 초로 변환
 * "HH:MM:SS" → 초 또는 "MM:SS" → 초
 */
export function timeStringToSeconds(timeStr: string | undefined | null): number {
  if (!timeStr || typeof timeStr !== 'string') {
    return 0
  }
  const parts = timeStr.split(':').map((p) => parseInt(p, 10))

  if (parts.length === 3) {
    // HH:MM:SS
    const [hours, minutes, seconds] = parts
    return hours * 3600 + minutes * 60 + seconds
  } else if (parts.length === 2) {
    // MM:SS
    const [minutes, seconds] = parts
    return minutes * 60 + seconds
  }

  return 0
}

/**
 * 초를 시간 문자열로 변환
 * 초 → "HH:MM:SS" 또는 "MM:SS"
 */
export function secondsToTimeString(seconds: number, includeHours: boolean = false): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (includeHours || hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  } else {
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
}

/**
 * 세그먼트 duration 계산
 */
export function calculateSegmentDuration(segment: VideoSegment): number {
  const startSeconds = timeStringToSeconds(segment.startTime)
  const endSeconds = timeStringToSeconds(segment.endTime)
  return Math.max(0, endSeconds - startSeconds)
}

/**
 * 세그먼트가 겹치는지 확인
 */
export function isSegmentOverlapping(seg1: VideoSegment, seg2: VideoSegment): boolean {
  const start1 = timeStringToSeconds(seg1.startTime)
  const end1 = timeStringToSeconds(seg1.endTime)
  const start2 = timeStringToSeconds(seg2.startTime)
  const end2 = timeStringToSeconds(seg2.endTime)

  return !(end1 <= start2 || end2 <= start1)
}

/**
 * 세그먼트 유효성 검사
 */
export function validateSegment(segment: VideoSegment): string | null {
  const startSeconds = timeStringToSeconds(segment.startTime)
  const endSeconds = timeStringToSeconds(segment.endTime)

  if (startSeconds >= endSeconds) {
    return '시작 시간은 종료 시간보다 빨라야 합니다'
  }

  if (startSeconds < 0 || endSeconds < 0) {
    return '시간은 0보다 커야 합니다'
  }

  return null
}

/**
 * 전체 세그먼트 유효성 검사
 */
export function validateSegments(segments: VideoSegment[]): string[] {
  const errors: string[] = []

  // 각 세그먼트 개별 검사
  segments.forEach((segment, index) => {
    const error = validateSegment(segment)
    if (error) {
      errors.push(`세그먼트 ${index + 1}: ${error}`)
    }
  })

  // 겹침 검사
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      if (isSegmentOverlapping(segments[i], segments[j])) {
        errors.push(`세그먼트 ${i + 1}과 ${j + 1}이 겹칩니다`)
      }
    }
  }

  return errors
}

/**
 * 게임플레이 세그먼트만 필터링
 */
export function getGameplaySegments(segments: VideoSegment[]): VideoSegment[] {
  return segments.filter((s) => s.type === 'gameplay')
}

/**
 * 게임플레이 구간을 문자열로 변환 (Gemini 프롬프트용)
 * 예: "03:25 - 45:30, 58:00 - 1:42:15"
 */
export function gameplaySegmentsToString(segments: VideoSegment[]): string {
  const gameplaySegments = getGameplaySegments(segments)

  if (gameplaySegments.length === 0) {
    return ''
  }

  return gameplaySegments.map((s) => `${s.startTime} - ${s.endTime}`).join(', ')
}

/**
 * 기본 세그먼트 템플릿
 * 사용자가 빠르게 시작할 수 있도록 일반적인 구조 제공
 */
export function getDefaultSegments(): VideoSegment[] {
  return [
    {
      id: '1',
      type: 'countdown',
      startTime: '00:00',
      endTime: '00:30',
    },
    {
      id: '2',
      type: 'opening',
      startTime: '00:30',
      endTime: '03:00',
    },
    {
      id: '3',
      type: 'gameplay',
      startTime: '03:00',
      endTime: '30:00',
    },
    {
      id: '4',
      type: 'break',
      startTime: '30:00',
      endTime: '35:00',
    },
    {
      id: '5',
      type: 'gameplay',
      startTime: '35:00',
      endTime: '1:00:00',
    },
    {
      id: '6',
      type: 'ending',
      startTime: '1:00:00',
      endTime: '1:03:00',
    },
  ]
}

/**
 * 세그먼트 타입별 색상
 */
export function getSegmentColor(type: SegmentType): string {
  switch (type) {
    case 'countdown':
      return '#6366f1' // indigo
    case 'opening':
      return '#8b5cf6' // violet
    case 'gameplay':
      return '#10b981' // green
    case 'break':
      return '#f59e0b' // amber
    case 'ending':
      return '#ec4899' // pink
    default:
      return '#6b7280' // gray
  }
}

/**
 * 세그먼트 타입별 라벨
 */
export function getSegmentTypeLabel(type: SegmentType): string {
  switch (type) {
    case 'countdown':
      return '카운트다운'
    case 'opening':
      return '오프닝'
    case 'gameplay':
      return '게임플레이'
    case 'break':
      return '브레이크'
    case 'ending':
      return '엔딩'
    default:
      return '알 수 없음'
  }
}
