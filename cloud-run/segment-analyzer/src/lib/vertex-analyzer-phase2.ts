/**
 * Vertex AI Gemini Phase 2 분석기
 *
 * 단일 핸드에 대한 상세 분석 + 시맨틱 태깅
 */

import { GoogleGenAI } from '@google/genai'
import { getPhase2PromptForPlatform } from './prompts/phase2-prompt'
import { gcsSegmentExtractor } from './gcs-segment-extractor'
import type { Phase2Result } from '../types'

export type Platform = 'ept' | 'triton' | 'wsop'

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
  // Phase 2는 Deep Reasoning이 필요하므로 Gemini 3 Pro 사용
  // gemini-3-pro-preview는 global endpoint에서만 사용 가능
  private modelName = 'gemini-3-pro-preview'

  constructor() {
    const projectId = process.env.GCS_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT
    const location = process.env.VERTEX_AI_LOCATION || 'global'
    const clientEmail = process.env.GCS_CLIENT_EMAIL
    const privateKey = process.env.GCS_PRIVATE_KEY

    if (!projectId) {
      throw new Error('GCS_PROJECT_ID 또는 GOOGLE_CLOUD_PROJECT 환경 변수가 필요합니다')
    }

    const aiOptions: {
      vertexai: boolean
      project: string
      location: string
      googleAuthOptions?: {
        credentials: {
          client_email: string
          private_key: string
        }
      }
    } = {
      vertexai: true,
      project: projectId,
      location,
    }

    // 서비스 계정 credentials
    if (clientEmail && privateKey) {
      aiOptions.googleAuthOptions = {
        credentials: {
          client_email: clientEmail,
          private_key: privateKey.replace(/\\n/g, '\n'),
        },
      }
      console.log(`[VertexAnalyzerPhase2] 서비스 계정 인증 사용: ${clientEmail}`)
    } else {
      console.log('[VertexAnalyzerPhase2] ADC(Application Default Credentials) 사용')
    }

    this.ai = new GoogleGenAI(aiOptions)

    console.log(
      `[VertexAnalyzerPhase2] 초기화 완료: ${projectId} / ${location} / ${this.modelName}`
    )
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
          model: this.modelName,
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
            // Gemini 3 Pro 추론 최적화 설정
            temperature: 0.1, // 더 정확한 분석을 위해 낮춤
            topP: 0.9,
            topK: 32,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
            // Gemini 3 Pro의 adaptive thinking 활성화
            // 복잡한 포커 핸드 분석에 적합한 설정
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

        console.log(`[Phase2] 분석 완료. Hand #${result.handNumber}`)

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

    // 필수 필드 검증
    if (!parsed.handNumber) {
      throw new Error('handNumber 필드 누락')
    }
    if (!parsed.players || !Array.isArray(parsed.players)) {
      throw new Error('players 배열 누락')
    }
    if (!parsed.board) {
      throw new Error('board 필드 누락')
    }
    if (!parsed.semanticTags || !Array.isArray(parsed.semanticTags)) {
      parsed.semanticTags = []
    }
    if (!parsed.aiAnalysis) {
      throw new Error('aiAnalysis 필드 누락')
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
