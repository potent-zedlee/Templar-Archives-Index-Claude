/**
 * Vertex AI Gemini Phase 1 분석기
 *
 * 영상 세그먼트에서 핸드 타임스탬프만 추출
 *
 * @google/genai SDK 사용 (Google 공식 권장)
 * - @google-cloud/vertexai는 2025-06-24 deprecated
 * - 환경변수 기반 자동 초기화 지원
 *
 * 필수 환경변수:
 * - GOOGLE_GENAI_USE_VERTEXAI=true
 * - GOOGLE_CLOUD_PROJECT=templar-archives-index
 * - GOOGLE_CLOUD_LOCATION=global
 */

import { GoogleGenAI } from '@google/genai'
import { PHASE1_PROMPT } from './prompts/phase1-prompt'
import type { Phase1Result } from '../types'

export type Platform = 'ept' | 'triton' | 'wsop'

// Gemini 2.5 Flash - 빠른 타임스탬프 추출용
const MODEL_NAME = 'gemini-2.5-flash'

export class VertexAnalyzerPhase1 {
  private ai: GoogleGenAI

  constructor() {
    // 환경변수 기반 자동 초기화
    // Cloud Run에서는 ADC(Application Default Credentials) 자동 사용
    const projectId = process.env.GOOGLE_CLOUD_PROJECT
    const location = process.env.GOOGLE_CLOUD_LOCATION || process.env.VERTEX_AI_LOCATION || 'global'

    if (!projectId) {
      throw new Error('GOOGLE_CLOUD_PROJECT 환경 변수가 필요합니다')
    }

    // @google/genai SDK - Vertex AI 모드로 초기화
    this.ai = new GoogleGenAI({
      vertexai: true,
      project: projectId,
      location,
    })

    console.log(`[VertexAnalyzerPhase1] 초기화 완료: ${projectId} / ${location} / ${MODEL_NAME}`)
  }

  /**
   * Phase 1 분석: 타임스탬프만 추출
   */
  async analyzePhase1(
    gcsUri: string,
    platform: Platform,
    maxRetries: number = 3
  ): Promise<Phase1Result> {
    if (!gcsUri.startsWith('gs://')) {
      throw new Error(`잘못된 GCS URI 형식: ${gcsUri}`)
    }

    const prompt = PHASE1_PROMPT
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Phase1] Gemini 분석 시도 ${attempt}/${maxRetries} - ${gcsUri}`)

        const response = await this.ai.models.generateContent({
          model: MODEL_NAME,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  fileData: {
                    fileUri: gcsUri,
                    mimeType: 'video/mp4',
                  },
                },
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

        const result = this.parsePhase1Response(textPart.text)

        console.log(`[Phase1] 분석 완료. 발견된 핸드: ${result.hands.length}개`)

        return result

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        console.error(`[Phase1] 시도 ${attempt} 실패:`, lastError.message)

        if (attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt) * 1000
          console.log(`[Phase1] ${delayMs / 1000}초 후 재시도...`)
          await new Promise((resolve) => setTimeout(resolve, delayMs))
        }
      }
    }

    throw new Error(`${maxRetries}회 시도 후 분석 실패: ${lastError?.message}`)
  }

  /**
   * Phase 1 응답 파싱 및 검증
   */
  private parsePhase1Response(text: string): Phase1Result {
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
      console.error('[Phase1] JSON 파싱 오류, 복구 시도 중...')

      // JSON 추출 시도
      const firstBrace = cleanText.indexOf('{')
      const lastBrace = cleanText.lastIndexOf('}')

      if (firstBrace !== -1 && lastBrace > firstBrace) {
        const extractedJson = cleanText.substring(firstBrace, lastBrace + 1)
        try {
          parsed = JSON.parse(extractedJson)
          console.log('[Phase1] JSON 복구 성공')
        } catch {
          throw new Error(`잘못된 JSON 응답: ${jsonError}`)
        }
      } else {
        throw new Error(`잘못된 JSON 응답: ${jsonError}`)
      }
    }

    // 필수 필드 검증
    if (!parsed.hands || !Array.isArray(parsed.hands)) {
      console.warn('[Phase1] hands 배열 누락, 빈 배열 반환')
      return { hands: [] }
    }

    // 각 핸드 검증
    const validHands = parsed.hands.filter((hand, index) => {
      if (typeof hand.handNumber !== 'number') {
        console.warn(`[Phase1] 핸드 ${index + 1}: handNumber 누락, 스킵`)
        return false
      }
      if (!hand.start || !hand.end) {
        console.warn(`[Phase1] 핸드 ${index + 1}: 타임스탬프 누락, 스킵`)
        return false
      }
      return true
    })

    return { hands: validHands }
  }
}

// 싱글톤
let _vertexAnalyzer: VertexAnalyzerPhase1 | null = null

export const vertexAnalyzer = {
  get instance(): VertexAnalyzerPhase1 {
    if (!_vertexAnalyzer) {
      _vertexAnalyzer = new VertexAnalyzerPhase1()
    }
    return _vertexAnalyzer
  },

  analyzePhase1: (
    ...args: Parameters<VertexAnalyzerPhase1['analyzePhase1']>
  ) => {
    return vertexAnalyzer.instance.analyzePhase1(...args)
  },
}
