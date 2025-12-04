/**
 * Vertex AI YouTube URL 분석기
 *
 * YouTube URL을 직접 Gemini에 전달하여 분석
 * - videoMetadata로 특정 구간 지정
 * - GCS 업로드 및 FFmpeg 처리 불필요
 * - 공개 영상만 지원
 *
 * @google/genai SDK 사용 (Vertex AI 모드)
 */

import { GoogleGenAI } from '@google/genai'
import { PHASE1_PROMPT } from './prompts/phase1-prompt'
import { getPhase2BatchPromptWithTimestamps } from './prompts/phase2-batch-prompt'
import type { Phase1Result, Phase2Result } from '../types'

export type Platform = 'ept' | 'triton' | 'wsop'

// Gemini 2.5 Flash - YouTube 분석용
const MODEL_NAME = 'gemini-2.5-flash'

export interface YouTubeSegment {
  start: number  // 초 단위
  end: number    // 초 단위
}

export interface HandTimestamp {
  handNumber: number
  start: string  // "HH:MM:SS" or "MM:SS"
  end: string
}

export class VertexAnalyzerYouTube {
  private ai: GoogleGenAI

  constructor() {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT
    const location = process.env.GOOGLE_CLOUD_LOCATION || process.env.VERTEX_AI_LOCATION || 'global'

    if (!projectId) {
      throw new Error('GOOGLE_CLOUD_PROJECT 환경 변수가 필요합니다')
    }

    this.ai = new GoogleGenAI({
      vertexai: true,
      project: projectId,
      location,
    })

    console.log(`[VertexAnalyzerYouTube] 초기화: ${projectId} / ${location} / ${MODEL_NAME}`)
  }

  /**
   * Phase 1: YouTube URL에서 타임스탬프 추출
   *
   * videoMetadata로 특정 세그먼트만 분석
   */
  async analyzePhase1(
    youtubeUrl: string,
    segment: YouTubeSegment,
    platform: Platform,
    maxRetries: number = 3
  ): Promise<Phase1Result> {
    if (!youtubeUrl.includes('youtube.com') && !youtubeUrl.includes('youtu.be')) {
      throw new Error(`유효하지 않은 YouTube URL: ${youtubeUrl}`)
    }

    const prompt = PHASE1_PROMPT
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[YouTubePhase1] Gemini 분석 시도 ${attempt}/${maxRetries}`)
        console.log(`[YouTubePhase1] URL: ${youtubeUrl}`)
        console.log(`[YouTubePhase1] Segment: ${segment.start}s - ${segment.end}s`)

        const response = await this.ai.models.generateContent({
          model: MODEL_NAME,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  fileData: {
                    fileUri: youtubeUrl,
                    mimeType: 'video/mp4',
                  },
                  // videoMetadata로 세그먼트 지정
                  videoMetadata: {
                    startOffset: `${segment.start}s`,
                    endOffset: `${segment.end}s`,
                  },
                } as Record<string, unknown>,
                {
                  text: prompt,
                },
              ],
            },
          ],
          config: {
            temperature: 0.5,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 65536,
            responseMimeType: 'application/json',
          },
        })

        if (!response?.candidates?.[0]?.content?.parts?.[0]) {
          throw new Error('Gemini 응답이 비어있습니다')
        }

        const textPart = response.candidates[0].content.parts.find(
          (part): part is { text: string } => 'text' in part && typeof part.text === 'string'
        )

        if (!textPart) {
          throw new Error('Gemini 응답에 텍스트가 없습니다')
        }

        const result = this.parsePhase1Response(textPart.text, segment.start)

        console.log(`[YouTubePhase1] 분석 완료. 발견된 핸드: ${result.hands.length}개`)

        return result

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        console.error(`[YouTubePhase1] 시도 ${attempt} 실패:`, lastError.message)

        if (attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt) * 1000
          console.log(`[YouTubePhase1] ${delayMs / 1000}초 후 재시도...`)
          await new Promise((resolve) => setTimeout(resolve, delayMs))
        }
      }
    }

    throw new Error(`${maxRetries}회 시도 후 분석 실패: ${lastError?.message}`)
  }

  /**
   * Phase 2: YouTube URL에서 상세 핸드 분석 (배치)
   *
   * 세그먼트 내 모든 핸드를 한 번에 분석
   */
  async analyzePhase2Batch(
    youtubeUrl: string,
    segment: YouTubeSegment,
    handTimestamps: HandTimestamp[],
    platform: Platform,
    maxRetries: number = 3
  ): Promise<Phase2Result[]> {
    if (handTimestamps.length === 0) {
      console.log('[YouTubePhase2Batch] 분석할 핸드가 없습니다')
      return []
    }

    const prompt = getPhase2BatchPromptWithTimestamps(platform, handTimestamps)
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[YouTubePhase2Batch] Gemini 분석 시도 ${attempt}/${maxRetries}`)
        console.log(`[YouTubePhase2Batch] URL: ${youtubeUrl}`)
        console.log(`[YouTubePhase2Batch] Segment: ${segment.start}s - ${segment.end}s`)
        console.log(`[YouTubePhase2Batch] Hands: ${handTimestamps.length}개`)

        const response = await this.ai.models.generateContent({
          model: MODEL_NAME,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  fileData: {
                    fileUri: youtubeUrl,
                    mimeType: 'video/mp4',
                  },
                  videoMetadata: {
                    startOffset: `${segment.start}s`,
                    endOffset: `${segment.end}s`,
                  },
                } as Record<string, unknown>,
                {
                  text: prompt,
                },
              ],
            },
          ],
          config: {
            temperature: 0.5,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 65536,
            responseMimeType: 'application/json',
          },
        })

        if (!response?.candidates?.[0]?.content?.parts?.[0]) {
          throw new Error('Gemini 응답이 비어있습니다')
        }

        const textPart = response.candidates[0].content.parts.find(
          (part): part is { text: string } => 'text' in part && typeof part.text === 'string'
        )

        if (!textPart) {
          throw new Error('Gemini 응답에 텍스트가 없습니다')
        }

        const results = this.parsePhase2BatchResponse(textPart.text, handTimestamps)

        console.log(`[YouTubePhase2Batch] 분석 완료: ${results.length}/${handTimestamps.length}개 핸드`)

        return results

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        console.error(`[YouTubePhase2Batch] 시도 ${attempt} 실패:`, lastError.message)

        if (attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt) * 1000
          console.log(`[YouTubePhase2Batch] ${delayMs / 1000}초 후 재시도...`)
          await new Promise((resolve) => setTimeout(resolve, delayMs))
        }
      }
    }

    throw new Error(`${maxRetries}회 시도 후 배치 분석 실패: ${lastError?.message}`)
  }

  /**
   * Phase 1 응답 파싱
   *
   * 세그먼트 내 상대 타임스탬프를 절대 타임스탬프로 변환
   */
  private parsePhase1Response(text: string, segmentStartSeconds: number): Phase1Result {
    let cleanText = text.trim()

    // 마크다운 코드 블록 제거
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.slice(7)
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.slice(3)
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.slice(0, -3)
    }
    cleanText = cleanText.trim()

    let parsed: Phase1Result
    try {
      parsed = JSON.parse(cleanText)
    } catch (jsonError) {
      console.error('[YouTubePhase1] JSON 파싱 오류, 복구 시도 중...')

      const firstBrace = cleanText.indexOf('{')
      const lastBrace = cleanText.lastIndexOf('}')

      if (firstBrace !== -1 && lastBrace > firstBrace) {
        const extractedJson = cleanText.substring(firstBrace, lastBrace + 1)
        try {
          parsed = JSON.parse(extractedJson)
          console.log('[YouTubePhase1] JSON 복구 성공')
        } catch {
          throw new Error(`잘못된 JSON 응답: ${jsonError}`)
        }
      } else {
        throw new Error(`잘못된 JSON 응답: ${jsonError}`)
      }
    }

    if (!parsed.hands || !Array.isArray(parsed.hands)) {
      console.warn('[YouTubePhase1] hands 배열 누락, 빈 배열 반환')
      return { hands: [] }
    }

    // 세그먼트 내 상대 타임스탬프를 절대 타임스탬프로 변환
    const adjustedHands = parsed.hands.map((hand) => ({
      ...hand,
      start: this.addSecondsToTimestamp(hand.start, segmentStartSeconds),
      end: this.addSecondsToTimestamp(hand.end, segmentStartSeconds),
    }))

    return { hands: adjustedHands }
  }

  /**
   * Phase 2 배치 응답 파싱
   */
  private parsePhase2BatchResponse(
    text: string,
    expectedTimestamps: HandTimestamp[]
  ): Phase2Result[] {
    let cleanText = text.trim()

    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.slice(7)
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.slice(3)
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.slice(0, -3)
    }
    cleanText = cleanText.trim()

    let parsed: { hands: Phase2Result[] }
    try {
      parsed = JSON.parse(cleanText)
    } catch (jsonError) {
      console.error('[YouTubePhase2Batch] JSON 파싱 오류, 복구 시도 중...')

      const firstBrace = cleanText.indexOf('{')
      const lastBrace = cleanText.lastIndexOf('}')

      if (firstBrace !== -1 && lastBrace > firstBrace) {
        const extractedJson = cleanText.substring(firstBrace, lastBrace + 1)
        try {
          parsed = JSON.parse(extractedJson)
          console.log('[YouTubePhase2Batch] JSON 복구 성공')
        } catch {
          throw new Error(`잘못된 JSON 응답: ${jsonError}`)
        }
      } else {
        throw new Error(`잘못된 JSON 응답: ${jsonError}`)
      }
    }

    if (!parsed.hands || !Array.isArray(parsed.hands)) {
      throw new Error('hands 배열이 응답에 없습니다')
    }

    // 각 핸드 검증 및 정규화
    const validatedHands: Phase2Result[] = []

    for (const hand of parsed.hands) {
      try {
        const validated = this.validateAndNormalizeHand(hand, expectedTimestamps)
        validatedHands.push(validated)
      } catch (e) {
        console.warn(`[YouTubePhase2Batch] 핸드 검증 실패:`, e)
      }
    }

    return validatedHands
  }

  /**
   * 타임스탬프에 초 추가 (절대 타임스탬프 변환용)
   */
  private addSecondsToTimestamp(timestamp: string, secondsToAdd: number): string {
    const parts = timestamp.split(':').map(Number)
    let totalSeconds: number

    if (parts.length === 3) {
      totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2]
    } else if (parts.length === 2) {
      totalSeconds = parts[0] * 60 + parts[1]
    } else {
      return timestamp
    }

    totalSeconds += secondsToAdd

    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = Math.floor(totalSeconds % 60)

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }

  /**
   * 개별 핸드 검증 및 정규화
   */
  private validateAndNormalizeHand(
    hand: Partial<Phase2Result>,
    expectedTimestamps: HandTimestamp[]
  ): Phase2Result {
    let handNumber = hand.handNumber

    if (!handNumber && hand.timestampStart) {
      const match = expectedTimestamps.find(
        t => t.start === hand.timestampStart || t.end === hand.timestampEnd
      )
      if (match) {
        handNumber = match.handNumber
      }
    }

    if (!handNumber) {
      handNumber = 0
    }

    return {
      handNumber,
      stakes: hand.stakes,
      pot: hand.pot ?? 0,
      board: hand.board ?? { flop: null, turn: null, river: null },
      players: hand.players ?? [],
      actions: hand.actions ?? [],
      winners: hand.winners ?? [],
      timestampStart: hand.timestampStart ?? '',
      timestampEnd: hand.timestampEnd ?? '',
      semanticTags: hand.semanticTags ?? [],
      aiAnalysis: hand.aiAnalysis ?? {
        confidence: 0,
        reasoning: '분석 데이터 없음',
        playerStates: {},
        handQuality: 'routine',
      },
    }
  }

  /**
   * GoogleGenAI 인스턴스 접근
   */
  get genai(): GoogleGenAI {
    return this.ai
  }
}

// 싱글톤
let _youtubeAnalyzer: VertexAnalyzerYouTube | null = null

export const vertexYouTubeAnalyzer = {
  get instance(): VertexAnalyzerYouTube {
    if (!_youtubeAnalyzer) {
      _youtubeAnalyzer = new VertexAnalyzerYouTube()
    }
    return _youtubeAnalyzer
  },

  analyzePhase1: (
    ...args: Parameters<VertexAnalyzerYouTube['analyzePhase1']>
  ) => {
    return vertexYouTubeAnalyzer.instance.analyzePhase1(...args)
  },

  analyzePhase2Batch: (
    ...args: Parameters<VertexAnalyzerYouTube['analyzePhase2Batch']>
  ) => {
    return vertexYouTubeAnalyzer.instance.analyzePhase2Batch(...args)
  },

  get genai(): GoogleGenAI {
    return vertexYouTubeAnalyzer.instance.genai
  },
}
