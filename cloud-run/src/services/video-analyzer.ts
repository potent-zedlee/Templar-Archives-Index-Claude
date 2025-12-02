/**
 * Video Analyzer Service
 *
 * Cloud Run 기반 영상 분석 서비스
 *
 * 주요 기능:
 * 1. FFmpeg로 영상 세그먼트 추출
 * 2. Vertex AI Gemini로 핸드 분석
 * 3. Firestore DB에 결과 저장
 */

import { z } from 'zod'
import { GoogleGenAI } from '@google/genai'
import { Storage } from '@google-cloud/storage'
import { Firestore, FieldValue } from '@google-cloud/firestore'
import ffmpeg from 'fluent-ffmpeg'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import {
  updateJobStatus,
  updateJobMetadata,
  completeJob,
  type JobMetadata,
} from './job-manager.js'

// ==================== 타입 정의 ====================

export const AnalysisInputSchema = z.object({
  streamId: z.string().min(1),  // Firestore document ID (not necessarily UUID)
  gcsUri: z.string().startsWith('gs://'),
  segments: z.array(
    z.object({
      start: z.number().min(0),
      end: z.number().min(0),
    })
  ),
  platform: z.enum(['ept', 'triton', 'wsop']),
  players: z.array(z.string()).optional(),
})

export type AnalysisInput = z.infer<typeof AnalysisInputSchema>

export interface ExtractedHand {
  number: string
  timestamp_start?: string
  timestamp_end?: string
  absolute_timestamp_start?: number
  absolute_timestamp_end?: number
  pot_size?: number
  description?: string
  players?: {
    name: string
    position?: string
    stack?: number
    cards?: string
  }[]
  actions?: {
    player: string
    action: string
    amount?: number
    street?: string
  }[]
  winner?: string
  showdown?: boolean
}

interface ExtractedSegment {
  gcsUri: string
  localPath: string
  start: number
  end: number
}

// ==================== Firestore 컬렉션 경로 ====================

const COLLECTION_PATHS = {
  HANDS: 'hands',
  PLAYERS: 'players',
  UNSORTED_STREAMS: 'streams',
  ANALYSIS_JOBS: 'analysisJobs',
} as const

// ==================== 클라이언트 초기화 ====================

let genAI: GoogleGenAI | null = null
let storage: Storage | null = null
let firestore: Firestore | null = null

function getGenAI(): GoogleGenAI {
  if (!genAI) {
    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY is required')
    }
    genAI = new GoogleGenAI({ apiKey })
  }
  return genAI
}

function getStorage(): Storage {
  if (!storage) {
    storage = new Storage({
      projectId: process.env.GCS_PROJECT_ID,
    })
  }
  return storage
}

function getFirestore(): Firestore {
  if (!firestore) {
    firestore = new Firestore({
      projectId: process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT,
    })
  }
  return firestore
}

// ==================== 유틸리티 함수 ====================

function parseTimestampToSeconds(timestamp?: string): number | null {
  if (!timestamp) return null

  const parts = timestamp.split(':').map(Number)
  if (parts.some(isNaN)) return null

  if (parts.length === 2) {
    const [minutes, seconds] = parts
    return minutes * 60 + seconds
  } else if (parts.length === 3) {
    const [hours, minutes, seconds] = parts
    return hours * 3600 + minutes * 60 + seconds
  }

  return null
}

function parseGcsUri(gcsUri: string): { bucket: string; path: string } {
  const match = gcsUri.match(/^gs:\/\/([^\/]+)\/(.+)$/)
  if (!match) {
    throw new Error(`Invalid GCS URI: ${gcsUri}`)
  }
  return { bucket: match[1], path: match[2] }
}

// ==================== Phase 1: 세그먼트 추출 ====================

async function extractSegments(
  gcsUri: string,
  segments: { start: number; end: number }[],
  streamId: string,
  maxSegmentDuration: number = 1800
): Promise<ExtractedSegment[]> {
  const tempDir = path.join(os.tmpdir(), `video-analyzer-${streamId}`)
  fs.mkdirSync(tempDir, { recursive: true })

  const { bucket, path: objectPath } = parseGcsUri(gcsUri)
  const storage = getStorage()

  // GCS에서 영상 다운로드
  const localVideoPath = path.join(tempDir, 'source.mp4')
  console.log(`[EXTRACTOR] Downloading video from ${gcsUri}...`)

  await storage.bucket(bucket).file(objectPath).download({
    destination: localVideoPath,
  })

  console.log(`[EXTRACTOR] Downloaded to ${localVideoPath}`)

  const extractedSegments: ExtractedSegment[] = []

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const duration = segment.end - segment.start

    // 30분 초과 시 분할
    const subSegments: { start: number; end: number }[] = []
    if (duration > maxSegmentDuration) {
      let currentStart = segment.start
      while (currentStart < segment.end) {
        const currentEnd = Math.min(currentStart + maxSegmentDuration, segment.end)
        subSegments.push({ start: currentStart, end: currentEnd })
        currentStart = currentEnd
      }
    } else {
      subSegments.push(segment)
    }

    // 각 서브 세그먼트 추출
    for (let j = 0; j < subSegments.length; j++) {
      const subSeg = subSegments[j]
      const outputFileName = `segment_${i}_${j}_${subSeg.start}-${subSeg.end}.mp4`
      const outputPath = path.join(tempDir, outputFileName)

      console.log(`[EXTRACTOR] Extracting segment ${subSeg.start}s-${subSeg.end}s...`)

      await new Promise<void>((resolve, reject) => {
        ffmpeg(localVideoPath)
          .setStartTime(subSeg.start)
          .setDuration(subSeg.end - subSeg.start)
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run()
      })

      // GCS에 업로드
      const segmentGcsPath = `temp-segments/${streamId}/${outputFileName}`
      await storage.bucket(bucket).upload(outputPath, {
        destination: segmentGcsPath,
      })

      extractedSegments.push({
        gcsUri: `gs://${bucket}/${segmentGcsPath}`,
        localPath: outputPath,
        start: subSeg.start,
        end: subSeg.end,
      })

      console.log(`[EXTRACTOR] Uploaded segment to gs://${bucket}/${segmentGcsPath}`)
    }
  }

  // 원본 영상 삭제
  fs.unlinkSync(localVideoPath)

  return extractedSegments
}

// ==================== Phase 2: Vertex AI 분석 ====================

async function analyzeVideoWithGemini(
  gcsUri: string,
  platform: 'ept' | 'triton' | 'wsop'
): Promise<ExtractedHand[]> {
  const genAI = getGenAI()

  // 플랫폼별 프롬프트
  const prompts: Record<string, string> = {
    ept: `You are analyzing a European Poker Tour (EPT) live stream video. Extract all poker hands shown in this video segment. For each hand, provide:
- Hand number
- Timestamp (start and end)
- Players involved with positions, stack sizes, and hole cards if visible
- All betting actions in order
- Pot size
- Winner
- Brief description

Output as JSON array with this structure:
[{
  "number": "Hand 1",
  "timestamp_start": "00:00",
  "timestamp_end": "05:30",
  "pot_size": 150000,
  "description": "Brief description",
  "players": [{"name": "Player Name", "position": "BTN", "stack": 100000, "cards": "Ah Kd"}],
  "actions": [{"player": "Player Name", "action": "raises", "amount": 3000, "street": "preflop"}],
  "winner": "Player Name",
  "showdown": true
}]`,
    triton: `You are analyzing a Triton Poker Series high stakes cash game/tournament video. Extract all poker hands. Focus on high-value pots and notable plays. Output as JSON array.`,
    wsop: `You are analyzing a World Series of Poker (WSOP) video. Extract all poker hands with complete action sequences. Output as JSON array.`,
  }

  const prompt = prompts[platform] || prompts.ept

  console.log(`[ANALYZER] Analyzing video with Gemini: ${gcsUri}`)

  const model = genAI.models.generateContent({
    model: 'models/gemini-2.5-flash',
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
          { text: prompt },
        ],
      },
    ],
    config: {
      maxOutputTokens: 8192,
      temperature: 0.1,
    },
  })

  const response = await model

  // JSON 추출
  const text = response.text || ''
  const jsonMatch = text.match(/\[[\s\S]*\]/)

  if (!jsonMatch) {
    console.warn('[ANALYZER] No JSON found in response')
    return []
  }

  try {
    const hands = JSON.parse(jsonMatch[0]) as ExtractedHand[]
    console.log(`[ANALYZER] Extracted ${hands.length} hands`)
    return hands
  } catch (parseError) {
    console.error('[ANALYZER] Failed to parse JSON:', parseError)
    return []
  }
}

// ==================== Phase 3: Firestore 저장 ====================

async function saveHandsToDatabase(
  streamId: string,
  hands: ExtractedHand[]
): Promise<{ success: boolean; saved: number; errors: number; error?: string }> {
  if (hands.length === 0) {
    return { success: true, saved: 0, errors: 0 }
  }

  const db = getFirestore()
  let saved = 0
  let errors = 0

  for (const hand of hands) {
    try {
      // 핸드 문서 생성
      const handRef = db.collection(COLLECTION_PATHS.HANDS).doc()

      // 플레이어 임베딩 데이터 준비
      const playersEmbedded = []
      for (const player of hand.players || []) {
        const normalizedName = player.name.toLowerCase().replace(/[^a-z0-9]/g, '')

        // 플레이어 찾기 또는 생성
        const playersQuery = await db
          .collection(COLLECTION_PATHS.PLAYERS)
          .where('normalizedName', '==', normalizedName)
          .limit(1)
          .get()

        let playerId: string
        if (playersQuery.empty) {
          const newPlayerRef = db.collection(COLLECTION_PATHS.PLAYERS).doc()
          await newPlayerRef.set({
            name: player.name,
            normalizedName,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          })
          playerId = newPlayerRef.id
        } else {
          playerId = playersQuery.docs[0].id
        }

        playersEmbedded.push({
          playerId,
          name: player.name,
          position: player.position || null,
          holeCards: player.cards ? [player.cards] : null,
          startStack: player.stack || 0,
          endStack: player.stack || 0,
          isWinner: hand.winner === player.name,
        })
      }

      // 액션 임베딩 데이터 준비
      const actionsEmbedded = []
      let sequence = 1
      for (const action of hand.actions || []) {
        const playerData = playersEmbedded.find(
          (p) => p.name.toLowerCase() === action.player.toLowerCase()
        )

        actionsEmbedded.push({
          playerId: playerData?.playerId || '',
          playerName: action.player,
          street: action.street || 'preflop',
          sequence: sequence++,
          actionType: action.action,
          amount: action.amount || 0,
        })
      }

      // playerIds 배열 생성 (array-contains 쿼리용)
      const playerIds = playersEmbedded.map((p) => p.playerId)

      // 핸드 저장
      await handRef.set({
        streamId,
        eventId: '',
        tournamentId: '',
        playerIds, // array-contains 쿼리용
        number: hand.number,
        timestamp: hand.timestamp_start || '',
        videoTimestampStart: hand.absolute_timestamp_start ?? null,
        videoTimestampEnd: hand.absolute_timestamp_end ?? null,
        potSize: hand.pot_size || 0,
        description: hand.description || '',
        players: playersEmbedded,
        actions: actionsEmbedded,
        engagement: {
          likesCount: 0,
          dislikesCount: 0,
          bookmarksCount: 0,
        },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })

      saved++
    } catch (error) {
      console.error(`[DB] Failed to save hand ${hand.number}:`, error)
      errors++
    }
  }

  return {
    success: errors === 0,
    saved,
    errors,
    error: errors > 0 ? `${errors} hands failed to save` : undefined,
  }
}

async function updateStreamStatus(
  streamId: string,
  status: 'completed' | 'failed'
): Promise<void> {
  const db = getFirestore()

  await db.collection(COLLECTION_PATHS.UNSORTED_STREAMS).doc(streamId).update({
    status,
    updatedAt: FieldValue.serverTimestamp(),
  })
}

// ==================== 정리 ====================

async function cleanupSegments(segments: ExtractedSegment[]): Promise<void> {
  const storage = getStorage()

  for (const segment of segments) {
    try {
      // GCS 파일 삭제
      const { bucket, path: objectPath } = parseGcsUri(segment.gcsUri)
      await storage.bucket(bucket).file(objectPath).delete()

      // 로컬 파일 삭제
      if (fs.existsSync(segment.localPath)) {
        fs.unlinkSync(segment.localPath)
      }
    } catch (error) {
      console.warn(`[CLEANUP] Failed to delete segment: ${segment.gcsUri}`, error)
    }
  }
}

// ==================== 메인 분석 함수 ====================

export async function runAnalysis(
  jobId: string,
  input: AnalysisInput
): Promise<void> {
  const { streamId, gcsUri, segments, platform, players } = input

  console.log(`[ANALYZER] Starting job ${jobId}`)
  console.log(`[ANALYZER] Stream: ${streamId}, Platform: ${platform}`)
  console.log(`[ANALYZER] Segments: ${segments.length}`)

  let extractedSegments: ExtractedSegment[] = []
  const allHands: ExtractedHand[] = []

  try {
    // 작업 시작
    updateJobStatus(jobId, 'EXECUTING', {
      status: 'initializing',
      progress: 0,
      streamId,
      gcsUri,
      totalSegments: segments.length,
    })

    // Phase 1: 세그먼트 추출
    updateJobMetadata(jobId, { status: 'extracting' })
    console.log(`[ANALYZER] Phase 1: Extracting segments...`)

    extractedSegments = await extractSegments(gcsUri, segments, streamId)
    console.log(`[ANALYZER] Extracted ${extractedSegments.length} segments`)

    // Phase 2: Vertex AI 분석
    updateJobMetadata(jobId, {
      status: 'analyzing',
      extractedSegments: extractedSegments.length,
    })
    console.log(`[ANALYZER] Phase 2: Analyzing with Vertex AI...`)

    for (let i = 0; i < extractedSegments.length; i++) {
      const segment = extractedSegments[i]

      updateJobMetadata(jobId, {
        currentSegment: i + 1,
        currentSegmentRange: `${segment.start}s-${segment.end}s`,
      })

      const hands = await analyzeVideoWithGemini(segment.gcsUri, platform)

      // 절대 타임코드 계산
      for (const hand of hands) {
        const startSeconds = parseTimestampToSeconds(hand.timestamp_start)
        const endSeconds = parseTimestampToSeconds(hand.timestamp_end)

        if (startSeconds !== null) {
          hand.absolute_timestamp_start = segment.start + startSeconds
        }
        if (endSeconds !== null) {
          hand.absolute_timestamp_end = segment.start + endSeconds
        }
      }

      allHands.push(...hands)

      // 진행률 업데이트
      const progress = Math.round(((i + 1) / extractedSegments.length) * 100)
      updateJobMetadata(jobId, {
        progress,
        processedSegments: i + 1,
        handsFound: allHands.length,
      })
    }

    console.log(`[ANALYZER] Total hands found: ${allHands.length}`)

    // Phase 3: DB 저장
    updateJobMetadata(jobId, { status: 'saving' })
    console.log(`[ANALYZER] Phase 3: Saving to Firestore...`)

    const saveResult = await saveHandsToDatabase(streamId, allHands)
    console.log(`[ANALYZER] Saved: ${saveResult.saved}, Errors: ${saveResult.errors}`)

    // 스트림 상태 업데이트
    await updateStreamStatus(streamId, 'completed')

    // 완료
    completeJob(jobId, true, {
      success: true,
      streamId,
      handCount: allHands.length,
      savedToDb: saveResult.success,
    })

    console.log(`[ANALYZER] Job ${jobId} completed successfully`)

  } catch (error) {
    console.error(`[ANALYZER] Job ${jobId} failed:`, error)

    // 스트림 상태 업데이트 (실패)
    try {
      await updateStreamStatus(streamId, 'failed')
    } catch {}

    completeJob(
      jobId,
      false,
      undefined,
      error instanceof Error ? error.message : 'Unknown error'
    )

  } finally {
    // Phase 4: 정리
    if (extractedSegments.length > 0) {
      console.log(`[ANALYZER] Phase 4: Cleaning up...`)
      await cleanupSegments(extractedSegments)
    }
  }
}
