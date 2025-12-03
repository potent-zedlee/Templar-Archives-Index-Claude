import { NextRequest, NextResponse } from 'next/server'
import { syncStreamHandsCount } from '@/app/actions/pipeline'

/**
 * POST /api/admin/sync-stream-hands
 *
 * 스트림의 핸드 수를 hands 컬렉션과 동기화합니다.
 * Admin 권한 필요
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { streamId, tournamentId, eventId } = body

    if (!streamId || !tournamentId || !eventId) {
      return NextResponse.json(
        { error: 'Missing required fields: streamId, tournamentId, eventId' },
        { status: 400 }
      )
    }

    const result = await syncStreamHandsCount(streamId, tournamentId, eventId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === 'Unauthorized' ? 401 : 500 }
      )
    }

    return NextResponse.json({
      success: true,
      streamId,
      handsCount: result.handsCount,
    })
  } catch (error) {
    console.error('[sync-stream-hands] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
