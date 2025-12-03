/**
 * Vertex AI Gemini Phase 2 분석기
 *
 * 단일 핸드에 대한 상세 분석 + 시맨틱 태깅
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
import { getPhase2PromptForPlatform } from './prompts/phase2-prompt'
import { gcsSegmentExtractor } from './gcs-segment-extractor'
import type { Phase2Result } from '../types'

export type Platform = 'ept' | 'triton' | 'wsop'

// Gemini 2.5 Flash - Phase 2 상세 분석용 (정확도 우선)
const MODEL_NAME = 'gemini-2.5-flash'

export interface HandTimestamp {
  handNumber: number
  start: string  // "HH:MM:SS"
  end: string
}

/**
 * HH:MM:SS 또는 MM:SS 형식을 초 단위로 변환
 */
function parseTimestampToSeconds(timestamp: string): number {
  const parts = timestamp.split(':').map(Number)

  if (parts.some(isNaN)) {
    throw new Error(`Invalid timestamp format: ${timestamp}`)
  }

  if (parts.length === 2) {
    const [minutes, seconds] = parts
    return minutes * 60 + seconds
  } else if (parts.length === 3) {
    const [hours, minutes, seconds] = parts
    return hours * 3600 + minutes * 60 + seconds
  }

  throw new Error(`Invalid timestamp format: ${timestamp}`)
}

export class VertexAnalyzerPhase2 {
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

    console.log(`[VertexAnalyzerPhase2] 초기화 완료: ${projectId} / ${location} / ${MODEL_NAME}`)
  }

  /**
   * Phase 2 분석: 특정 타임 구간에 대한 상세 분석
   */
  async analyzePhase2(
    gcsUri: string,
    handTimestamp: HandTimestamp,
    platform: Platform,
    maxRetries: number = 3
  ): Promise<Phase2Result> {
    if (!gcsUri.startsWith('gs://')) {
      throw new Error(`잘못된 GCS URI 형식: ${gcsUri}`)
    }

    // 1. 해당 핸드 구간만 추출 (FFmpeg)
    const startSeconds = parseTimestampToSeconds(handTimestamp.start)
    const endSeconds = parseTimestampToSeconds(handTimestamp.end)

    console.log(`[Phase2] Extracting hand segment: ${startSeconds}s - ${endSeconds}s`)

    const extractionResult = await gcsSegmentExtractor.extractSegments({
      sourceGcsUri: gcsUri,
      segments: [{ start: startSeconds, end: endSeconds }],
      streamId: `phase2_${handTimestamp.handNumber}`,
      maxSegmentDuration: 600, // 최대 10분 (단일 핸드는 보통 2-5분)
    })

    if (extractionResult.extractedSegments.length === 0) {
      throw new Error('핸드 세그먼트 추출 실패')
    }

    const segmentGcsUri = extractionResult.extractedSegments[0].gcsUri

    // 2. Vertex AI로 분석
    const prompt = getPhase2PromptForPlatform(platform)
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Phase2] Gemini 분석 시도 ${attempt}/${maxRetries}`)

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
                  text: prompt,
                },
              ],
            },
          ],
          config: {
            // Gemini 2.5 Flash 설정
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

        const result = this.parsePhase2Response(textPart.text)

        // 3. 임시 세그먼트 정리
        await gcsSegmentExtractor.cleanupSegments(extractionResult.extractedSegments)

        console.log(`[Phase2] 분석 완료. Hand #${result.handNumber || '(임시)'} - players: ${result.players?.length || 0}`)

        return result

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        console.error(`[Phase2] 시도 ${attempt} 실패:`, lastError.message)

        if (attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt) * 1000
          console.log(`[Phase2] ${delayMs / 1000}초 후 재시도...`)
          await new Promise((resolve) => setTimeout(resolve, delayMs))
        }
      }
    }

    // 최종 실패 시 정리
    await gcsSegmentExtractor.cleanupSegments(extractionResult.extractedSegments)

    throw new Error(`${maxRetries}회 시도 후 분석 실패: ${lastError?.message}`)
  }

  /**
   * Phase 2 응답 파싱 및 검증
   */
  private parsePhase2Response(text: string): Phase2Result {
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

    let parsed: Phase2Result
    try {
      parsed = JSON.parse(cleanText)
    } catch (jsonError) {
      console.error('[Phase2] JSON 파싱 오류, 복구 시도 중...')

      // JSON 추출 시도
      const firstBrace = cleanText.indexOf('{')
      const lastBrace = cleanText.lastIndexOf('}')

      if (firstBrace !== -1 && lastBrace > firstBrace) {
        const extractedJson = cleanText.substring(firstBrace, lastBrace + 1)
        try {
          parsed = JSON.parse(extractedJson)
          console.log('[Phase2] JSON 복구 성공')
        } catch {
          throw new Error(`잘못된 JSON 응답: ${jsonError}`)
        }
      } else {
        throw new Error(`잘못된 JSON 응답: ${jsonError}`)
      }
    }

    // 필수 필드 검증 (handNumber는 나중에 타임코드 기반으로 재할당되므로 선택적)
    if (!parsed.handNumber) {
      // Gemini가 handNumber를 반환하지 않으면 임시로 0 설정
      // 분석 완료 후 normalizeHandNumbers에서 타임코드 순으로 재할당됨
      parsed.handNumber = 0
      console.log('[Phase2] handNumber 누락 - 임시값 0 설정 (나중에 정규화됨)')
    }
    if (!parsed.players || !Array.isArray(parsed.players)) {
      throw new Error('players 배열 누락')
    }
    if (!parsed.board) {
      // board도 빈 객체로 기본값 설정
      parsed.board = { flop: [], turn: null, river: null }
      console.log('[Phase2] board 누락 - 빈 보드 설정')
    }
    if (!parsed.semanticTags || !Array.isArray(parsed.semanticTags)) {
      parsed.semanticTags = []
    }
    if (!parsed.aiAnalysis) {
      // aiAnalysis 기본값 설정 (AIAnalysis 타입에 맞춤)
      parsed.aiAnalysis = {
        confidence: 0,
        reasoning: '분석 데이터 없음',
        playerStates: {},
        handQuality: 'routine'
      }
      console.log('[Phase2] aiAnalysis 누락 - 기본값 설정')
    }

    return parsed
  }
}

// 싱글톤
let _vertexAnalyzer: VertexAnalyzerPhase2 | null = null

export const vertexAnalyzer = {
  get instance(): VertexAnalyzerPhase2 {
    if (!_vertexAnalyzer) {
      _vertexAnalyzer = new VertexAnalyzerPhase2()
    }
    return _vertexAnalyzer
  },

  analyzePhase2: (
    ...args: Parameters<VertexAnalyzerPhase2['analyzePhase2']>
  ) => {
    return vertexAnalyzer.instance.analyzePhase2(...args)
  },
}
