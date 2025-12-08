import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import type { Element } from 'domhandler'
import { sanitizeErrorMessage, logError } from '@/lib/utils/error-handler'
import { applyRateLimit, rateLimiters } from '@/lib/utils/rate-limit'
import { isSafeUrl, sanitizeText, logSecurityEvent } from '@/lib/security'

export async function POST(request: NextRequest) {
  // Apply rate limiting (10 requests per minute)
  const rateLimitResponse = await applyRateLimit(request, rateLimiters.parseApi)
  if (rateLimitResponse) return rateLimitResponse


  try {
    const { url } = await request.json()

    // URL 검증
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // 안전한 URL인지 확인
    if (!isSafeUrl(url)) {
      logSecurityEvent('xss_attempt', { url })
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // Hendon Mob URL인지 확인
    if (!url.includes('thehendonmob.com')) {
      return NextResponse.json(
        { error: 'Invalid Hendon Mob URL' },
        { status: 400 }
      )
    }

    // Fetch HTML with comprehensive browser-like headers to avoid 403
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
        'Referer': 'https://pokerdb.thehendonmob.com/',
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.status}` },
        { status: response.status }
      )
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Parse payout table
    const payouts: Array<{ rank: number; playerName: string; prizeAmount: string }> = []

    // Try multiple selectors to find the results table
    const tables = $('table')

    let resultsTable: cheerio.Cheerio<any> | null = null

    // Find table with "Place" or "Pos" or "Rank" header
    tables.each((_, table): void | false => {
      const headers = $(table).find('tr').first().find('th, td')
      const headerTexts = headers.map((_, el) => $(el).text().trim().toLowerCase()).get()

      if (headerTexts.some(h => h.includes('place') || h.includes('pos') || h.includes('rank'))) {
        resultsTable = $(table)
        return false // break
      }
    })

    if (!resultsTable) {
      return NextResponse.json(
        { error: 'Could not find results table on the page' },
        { status: 404 }
      )
    }

    // Parse table rows (skip header)
    // TypeScript: Use type assertion - resultsTable is guaranteed to be non-null here
    const tableRows = (resultsTable as cheerio.Cheerio<any>).find('tr').slice(1)
    tableRows.each((_: number, row: Element) => {
      const cells = $(row).find('td')

      if (cells.length >= 3) {
        // Common patterns:
        // Column 0: Rank/Place
        // Column 1 or 2: Player Name (sometimes with flag/country)
        // Last column: Prize

        const rankText = $(cells[0]).text().trim()
        const rank = parseInt(rankText.replace(/\D/g, '')) || 0

        // Player name is usually in column 1 or 2
        // Look for link with player name
        let playerName = ''
        cells.each((i, cell): void | false => {
          if (i === 0) return // skip rank column
          const link = $(cell).find('a').first()
          if (link.length && link.attr('href')?.includes('player.php')) {
            playerName = link.text().trim()
            return false // break
          }
        })

        // Fallback to column 1 if no link found
        if (!playerName) {
          playerName = $(cells[1]).text().trim()
        }

        // Prize is usually in the last column
        const prizeText = $(cells[cells.length - 1]).text().trim()

        // Only add if we have valid data
        if (rank > 0 && playerName && prizeText && prizeText !== '-') {
          payouts.push({
            rank,
            playerName: sanitizeText(playerName, 100), // XSS 방지
            prizeAmount: sanitizeText(prizeText, 50), // XSS 방지
          })
        }
      }
    })

    if (payouts.length === 0) {
      return NextResponse.json(
        { error: 'No payout data found. The page structure might have changed.' },
        { status: 404 }
      )
    }

    // Sort by rank just in case
    payouts.sort((a, b) => a.rank - b.rank)

    return NextResponse.json({ payouts })

  } catch (error) {
    logError('parse-hendon-mob', error)
    return NextResponse.json(
      { error: sanitizeErrorMessage(error, '페이지 파싱에 실패했습니다. 다시 시도하거나 수동으로 입력해주세요.') },
      { status: 500 }
    )
  }
}
