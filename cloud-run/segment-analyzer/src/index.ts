/**
 * Segment Analyzer Service
 *
 * Cloud Tasks에서 받은 세그먼트 분석 요청을 처리
 * - FFmpeg로 세그먼트 추출
 * - Vertex AI Gemini로 분석
 * - DB에 핸드 저장
 * - Firestore 진행 상황 업데이트
 */

import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { processSegmentHandler } from './handlers/process-segment'
import { phase2Handler } from './handlers/phase2-handler'
import { phase2BatchHandler } from './handlers/phase2-batch-handler'

const app = new Hono()

// Middleware
app.use('*', logger())

// Health check
app.get('/', (c) => c.json({ status: 'ok', service: 'segment-analyzer' }))
app.get('/health', (c) => c.json({ status: 'healthy' }))

// API Routes
app.post('/analyze-segment', processSegmentHandler)
app.post('/analyze-phase2', phase2Handler)
app.post('/analyze-phase2-batch', phase2BatchHandler)  // 배치 처리 (비용 최적화)

// Error handling
app.onError((err, c) => {
  console.error('[SegmentAnalyzer] Error:', err)
  return c.json(
    { error: err.message || 'Internal server error' },
    500
  )
})

// Start server
const port = parseInt(process.env.PORT || '8080')

console.log(`[SegmentAnalyzer] Starting server on port ${port}`)

serve({
  fetch: app.fetch,
  port,
})
