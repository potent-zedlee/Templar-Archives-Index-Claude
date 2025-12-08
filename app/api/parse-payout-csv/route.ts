import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'
import { sanitizeErrorMessage, logError } from '@/lib/utils/error-handler'
import { applyRateLimit, rateLimiters } from '@/lib/utils/rate-limit'
import { sanitizeText } from '@/lib/security'

export async function POST(request: NextRequest) {
  // Apply rate limiting (10 requests per minute)
  const rateLimitResponse = await applyRateLimit(request, rateLimiters.parseApi)
  if (rateLimitResponse) return rateLimitResponse


  try {
    const { csvText } = await request.json()

    if (!csvText || typeof csvText !== 'string') {
      return NextResponse.json(
        { error: 'CSV text is required' },
        { status: 400 }
      )
    }

    // Parse CSV
    const parseResult = Papa.parse(csvText, {
      header: false,
      skipEmptyLines: true,
      dynamicTyping: false,
    })

    if (parseResult.errors.length > 0) {
      console.error('CSV parse errors:', parseResult.errors)
      return NextResponse.json(
        { error: 'Failed to parse CSV. Please check the format.' },
        { status: 400 }
      )
    }

    const rows = parseResult.data as string[][]

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'CSV is empty' },
        { status: 400 }
      )
    }

    const payouts: Array<{ rank: number; playerName: string; prizeAmount: string }> = []

    // Detect if first row is header
    const firstRow = rows[0]
    const hasHeader = firstRow.some((cell: string) =>
      typeof cell === 'string' &&
      (cell.toLowerCase().includes('rank') ||
        cell.toLowerCase().includes('place') ||
        cell.toLowerCase().includes('pos') ||
        cell.toLowerCase().includes('name') ||
        cell.toLowerCase().includes('player') ||
        cell.toLowerCase().includes('prize'))
    )

    const dataStartIndex = hasHeader ? 1 : 0

    // Parse data rows
    for (let i = dataStartIndex; i < rows.length; i++) {
      const row = rows[i]

      // Skip rows with less than 2 columns (need at least name and prize)
      if (row.length < 2) continue

      // Try to find rank, name, and prize
      let rank = 0
      let playerName = ''
      let prizeAmount = ''

      // Format 1: [Rank, Name, Prize] (3 columns)
      if (row.length >= 3) {
        const rankStr = String(row[0]).trim()
        rank = parseInt(rankStr.replace(/\D/g, '')) || (i - dataStartIndex + 1)
        playerName = String(row[1]).trim()
        prizeAmount = String(row[2]).trim()
      }
      // Format 2: [Name, Prize] (2 columns, auto-generate rank)
      else if (row.length === 2) {
        rank = i - dataStartIndex + 1
        playerName = String(row[0]).trim()
        prizeAmount = String(row[1]).trim()
      }

      // Skip if name or prize is empty
      if (!playerName || !prizeAmount) continue

      payouts.push({
        rank,
        playerName: sanitizeText(playerName, 100), // XSS 방지
        prizeAmount: sanitizeText(prizeAmount, 50), // XSS 방지
      })
    }

    if (payouts.length === 0) {
      return NextResponse.json(
        { error: 'No valid payout data found in CSV. Expected format: Rank, Player Name, Prize Amount' },
        { status: 404 }
      )
    }

    // Sort by rank
    payouts.sort((a, b) => a.rank - b.rank)

    return NextResponse.json({ payouts })

  } catch (error) {
    logError('parse-payout-csv', error)
    return NextResponse.json(
      { error: sanitizeErrorMessage(error, 'CSV 파싱에 실패했습니다. 형식을 확인하고 다시 시도해주세요.') },
      { status: 500 }
    )
  }
}
