/**
 * Vertex AI Gemini Phase 2 배치 분석기
 *
 * 30분 세그먼트에서 여러 핸드를 한 번에 분석
 * 기존 방식: 214회 개별 호출 → 최적화: 12회 배치 호출
 * 비용 절감: 비디오 토큰 90% 감소
 *
 * @google/genai SDK 사용 (Vertex AI 모드)
 */

import { GoogleGenAI } from '@google/genai'
import { getPhase2BatchPromptWithTimestamps } from './prompts/phase2-batch-prompt'
import type { Phase2Result } from '../types'

export type Platform = 'ept' | 'triton' | 'wsop'

// Gemini 2.5 Flash - Phase 2 배치 분석용
const MODEL_NAME = 'gemini-2.5-flash'

export interface HandTimestamp {
  handNumber: number
  start: string  // "HH:MM:SS" or "MM:SS"
  end: string
}

export interface BatchAnalysisResult {
  hands: Phase2Result[]
  segmentIndex: number
  processedCount: number
  failedCount: number
}

export class VertexAnalyzerPhase2Batch {
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

    console.log(`[VertexAnalyzerPhase2Batch] 초기화: ${projectId} / ${location} / ${MODEL_NAME}`)
  }

  /**
   * 30분 세그먼트에서 모든 핸드를 한 번에 분석
   *
   * @param segmentGcsUri Phase 1에서 추출된 30분 세그먼트 GCS URI
   * @param handTimestamps 세그먼트 내 핸드 타임스탬프 배열
   * @param platform 포커 플랫폼
   * @param cacheName Context Cache 이름 (선택)
   * @param maxRetries 최대 재시도 횟수
   */
  async analyzeSegmentBatch(
    segmentGcsUri: string,
    handTimestamps: HandTimestamp[],
    platform: Platform,
    cacheName?: string,
    maxRetries: number = 3
  ): Promise<Phase2Result[]> {
    if (!segmentGcsUri.startsWith('gs://')) {
      throw new Error(`잘못된 GCS URI 형식: ${segmentGcsUri}`)
    }

    if (handTimestamps.length === 0) {
      console.log('[Phase2Batch] 분석할 핸드가 없습니다')
      return []
    }

    console.log(`[Phase2Batch] 배치 분석 시작: ${handTimestamps.length}개 핸드`)

    const prompt = getPhase2BatchPromptWithTimestamps(platform, handTimestamps)
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Phase2Batch] Gemini 호출 시도 ${attempt}/${maxRetries}`)

        // 요청 설정
        const config: Record<string, unknown> = {
          temperature: 0.5,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 65536,
          responseMimeType: 'application/json',
        }

        // Context Cache 사용 시
        if (cacheName) {
          config.cachedContent = cacheName
        }

        const response = await this.ai.models.generateContent({
          model: MODEL_NAME,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  fileData: {
                    fileUri: segmentGcsUri,
                    mimeType: 'video/mp4',
                  },
                },
                {
                  text: cacheName ? this.getTimestampsOnlyPrompt(handTimestamps) : prompt,
                },
              ],
            },
          ],
          config,
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

        const results = this.parseBatchResponse(textPart.text, handTimestamps)

        console.log(`[Phase2Batch] 배치 분석 완료: ${results.length}/${handTimestamps.length}개 핸드`)

        return results

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        console.error(`[Phase2Batch] 시도 ${attempt} 실패:`, lastError.message)

        if (attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt) * 1000
          console.log(`[Phase2Batch] ${delayMs / 1000}초 후 재시도...`)
          await new Promise((resolve) => setTimeout(resolve, delayMs))
        }
      }
    }

    throw new Error(`${maxRetries}회 시도 후 배치 분석 실패: ${lastError?.message}`)
  }

  /**
   * Context Cache 사용 시 타임스탬프만 전송하는 경량 프롬프트
   */
  private getTimestampsOnlyPrompt(handTimestamps: HandTimestamp[]): string {
    const timestampList = handTimestamps
      .map(h => `Hand ${h.handNumber}: ${h.start} - ${h.end}`)
      .join('\n')

    return `Analyze these hands:\n${timestampList}`
  }

  /**
   * 배치 응답 파싱 및 검증
   */
  private parseBatchResponse(text: string, expectedTimestamps: HandTimestamp[]): Phase2Result[] {
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

    let parsed: { hands: Phase2Result[] }
    try {
      parsed = JSON.parse(cleanText)
    } catch (jsonError) {
      console.error('[Phase2Batch] JSON 파싱 오류, 복구 시도 중...')

      // JSON 추출 시도
      const firstBrace = cleanText.indexOf('{')
      const lastBrace = cleanText.lastIndexOf('}')

      if (firstBrace !== -1 && lastBrace > firstBrace) {
        const extractedJson = cleanText.substring(firstBrace, lastBrace + 1)
        try {
          parsed = JSON.parse(extractedJson)
          console.log('[Phase2Batch] JSON 복구 성공')
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
        console.warn(`[Phase2Batch] 핸드 검증 실패:`, e)
        // 실패한 핸드는 건너뛰기
      }
    }

    return validatedHands
  }

  /**
   * 개별 핸드 검증 및 정규화
   */
  private validateAndNormalizeHand(
    hand: Partial<Phase2Result>,
    expectedTimestamps: HandTimestamp[]
  ): Phase2Result {
    // handNumber 매칭 또는 타임스탬프 기반 추론
    let handNumber = hand.handNumber

    if (!handNumber && hand.timestampStart) {
      // 타임스탬프로 handNumber 찾기
      const match = expectedTimestamps.find(
        t => t.start === hand.timestampStart || t.end === hand.timestampEnd
      )
      if (match) {
        handNumber = match.handNumber
      }
    }

    if (!handNumber) {
      handNumber = 0 // 나중에 정규화됨
    }

    // 필수 필드 기본값 설정
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
   * GoogleGenAI 인스턴스 접근 (ContextCacheManager용)
   */
  get genai(): GoogleGenAI {
    return this.ai
  }
}

// 싱글톤
let _batchAnalyzer: VertexAnalyzerPhase2Batch | null = null

export const vertexBatchAnalyzer = {
  get instance(): VertexAnalyzerPhase2Batch {
    if (!_batchAnalyzer) {
      _batchAnalyzer = new VertexAnalyzerPhase2Batch()
    }
    return _batchAnalyzer
  },

  analyzeSegmentBatch: (
    ...args: Parameters<VertexAnalyzerPhase2Batch['analyzeSegmentBatch']>
  ) => {
    return vertexBatchAnalyzer.instance.analyzeSegmentBatch(...args)
  },

  get genai(): GoogleGenAI {
    return vertexBatchAnalyzer.instance.genai
  },
}
