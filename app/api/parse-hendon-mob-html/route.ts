import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import type { Element } from 'domhandler'
import { sanitizeErrorMessage, logError } from '@/lib/utils/error-handler'
import { applyRateLimit, rateLimiters } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/logger'

// Convert country name to 3-letter ISO code
function countryNameToCode(name: string): string {
  const mapping: Record<string, string> = {
    // A
    'Afghanistan': 'AFG',
    'Albania': 'ALB',
    'Algeria': 'DZA',
    'Andorra': 'AND',
    'Angola': 'AGO',
    'Argentina': 'ARG',
    'Armenia': 'ARM',
    'Australia': 'AUS',
    'Austria': 'AUT',
    'Azerbaijan': 'AZE',

    // B
    'Bahamas': 'BHS',
    'Bahrain': 'BHR',
    'Bangladesh': 'BGD',
    'Barbados': 'BRB',
    'Belarus': 'BLR',
    'Belgium': 'BEL',
    'Belize': 'BLZ',
    'Benin': 'BEN',
    'Bhutan': 'BTN',
    'Bolivia': 'BOL',
    'Bosnia and Herzegovina': 'BIH',
    'Botswana': 'BWA',
    'Brazil': 'BRA',
    'Brunei': 'BRN',
    'Bulgaria': 'BGR',
    'Burkina Faso': 'BFA',
    'Burundi': 'BDI',

    // C
    'Cambodia': 'KHM',
    'Cameroon': 'CMR',
    'Canada': 'CAN',
    'Cape Verde': 'CPV',
    'Central African Republic': 'CAF',
    'Chad': 'TCD',
    'Chile': 'CHL',
    'China': 'CHN',
    'Colombia': 'COL',
    'Comoros': 'COM',
    'Congo': 'COG',
    'Costa Rica': 'CRI',
    'Croatia': 'HRV',
    'Cuba': 'CUB',
    'Cyprus': 'CYP',
    'Czech Republic': 'CZE',
    'Czechia': 'CZE',

    // D
    'Denmark': 'DNK',
    'Djibouti': 'DJI',
    'Dominica': 'DMA',
    'Dominican Republic': 'DOM',

    // E
    'Ecuador': 'ECU',
    'Egypt': 'EGY',
    'El Salvador': 'SLV',
    'England': 'GBR',
    'Equatorial Guinea': 'GNQ',
    'Eritrea': 'ERI',
    'Estonia': 'EST',
    'Ethiopia': 'ETH',

    // F
    'Fiji': 'FJI',
    'Finland': 'FIN',
    'France': 'FRA',

    // G
    'Gabon': 'GAB',
    'Gambia': 'GMB',
    'Georgia': 'GEO',
    'Germany': 'DEU',
    'Ghana': 'GHA',
    'Greece': 'GRC',
    'Grenada': 'GRD',
    'Guatemala': 'GTM',
    'Guinea': 'GIN',
    'Guinea-Bissau': 'GNB',
    'Guyana': 'GUY',

    // H
    'Haiti': 'HTI',
    'Honduras': 'HND',
    'Hong Kong': 'HKG',
    'Hungary': 'HUN',

    // I
    'Iceland': 'ISL',
    'India': 'IND',
    'Indonesia': 'IDN',
    'Iran': 'IRN',
    'Iraq': 'IRQ',
    'Ireland': 'IRL',
    'Israel': 'ISR',
    'Italy': 'ITA',

    // J
    'Jamaica': 'JAM',
    'Japan': 'JPN',
    'Jordan': 'JOR',

    // K
    'Kazakhstan': 'KAZ',
    'Kenya': 'KEN',
    'Kuwait': 'KWT',
    'Kyrgyzstan': 'KGZ',

    // L
    'Laos': 'LAO',
    'Latvia': 'LVA',
    'Lebanon': 'LBN',
    'Lesotho': 'LSO',
    'Liberia': 'LBR',
    'Libya': 'LBY',
    'Liechtenstein': 'LIE',
    'Lithuania': 'LTU',
    'Luxembourg': 'LUX',

    // M
    'Macau': 'MAC',
    'Macedonia': 'MKD',
    'Madagascar': 'MDG',
    'Malawi': 'MWI',
    'Malaysia': 'MYS',
    'Maldives': 'MDV',
    'Mali': 'MLI',
    'Malta': 'MLT',
    'Mauritania': 'MRT',
    'Mauritius': 'MUS',
    'Mexico': 'MEX',
    'Moldova': 'MDA',
    'Monaco': 'MCO',
    'Mongolia': 'MNG',
    'Montenegro': 'MNE',
    'Morocco': 'MAR',
    'Mozambique': 'MOZ',
    'Myanmar': 'MMR',

    // N
    'Namibia': 'NAM',
    'Nepal': 'NPL',
    'Netherlands': 'NLD',
    'New Zealand': 'NZL',
    'Nicaragua': 'NIC',
    'Niger': 'NER',
    'Nigeria': 'NGA',
    'North Korea': 'PRK',
    'Norway': 'NOR',

    // O
    'Oman': 'OMN',

    // P
    'Pakistan': 'PAK',
    'Palestine': 'PSE',
    'Panama': 'PAN',
    'Papua New Guinea': 'PNG',
    'Paraguay': 'PRY',
    'Peru': 'PER',
    'Philippines': 'PHL',
    'Poland': 'POL',
    'Portugal': 'PRT',

    // Q
    'Qatar': 'QAT',

    // R
    'Romania': 'ROU',
    'Russia': 'RUS',
    'Russian Federation': 'RUS',
    'Rwanda': 'RWA',

    // S
    'Saudi Arabia': 'SAU',
    'Scotland': 'GBR',
    'Senegal': 'SEN',
    'Serbia': 'SRB',
    'Seychelles': 'SYC',
    'Sierra Leone': 'SLE',
    'Singapore': 'SGP',
    'Slovakia': 'SVK',
    'Slovenia': 'SVN',
    'Somalia': 'SOM',
    'South Africa': 'ZAF',
    'South Korea': 'KOR',
    'Spain': 'ESP',
    'Sri Lanka': 'LKA',
    'Sudan': 'SDN',
    'Suriname': 'SUR',
    'Sweden': 'SWE',
    'Switzerland': 'CHE',
    'Syria': 'SYR',

    // T
    'Taiwan': 'TWN',
    'Tajikistan': 'TJK',
    'Tanzania': 'TZA',
    'Thailand': 'THA',
    'Togo': 'TGO',
    'Trinidad and Tobago': 'TTO',
    'Tunisia': 'TUN',
    'Turkey': 'TUR',
    'Turkmenistan': 'TKM',

    // U
    'Uganda': 'UGA',
    'Ukraine': 'UKR',
    'United Arab Emirates': 'ARE',
    'United Kingdom': 'GBR',
    'United States': 'USA',
    'Uruguay': 'URY',
    'Uzbekistan': 'UZB',

    // V
    'Venezuela': 'VEN',
    'Vietnam': 'VNM',

    // W
    'Wales': 'GBR',

    // Y
    'Yemen': 'YEM',

    // Z
    'Zambia': 'ZMB',
    'Zimbabwe': 'ZWE',
  }

  return mapping[name] || ''
}

export async function POST(request: NextRequest) {
  // Apply rate limiting (10 requests per minute)
  const rateLimitResponse = await applyRateLimit(request, rateLimiters.parseApi)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { html } = await request.json()

    if (!html || typeof html !== 'string') {
      return NextResponse.json(
        { error: 'HTML content is required' },
        { status: 400 }
      )
    }

    // HTML size validation (max 5MB)
    const MAX_HTML_SIZE = 5 * 1024 * 1024 // 5MB in bytes
    if (html.length > MAX_HTML_SIZE) {
      return NextResponse.json(
        { error: 'HTML 크기가 너무 큽니다. 최대 5MB까지 허용됩니다.' },
        { status: 400 }
      )
    }

    const $ = cheerio.load(html)

    // Parse payout table
    const payouts: Array<{ rank: number; playerName: string; prizeAmount: string }> = []

    // Try multiple selectors to find the results table
    const tables = $('table')

    if (tables.length === 0) {
      return NextResponse.json(
        { error: 'No tables found in the HTML. Make sure you copied the full page source (not just a screenshot or partial content).' },
        { status: 404 }
      )
    }

    // Find table with Hendon Mob class structure (place, prize, name)
    let resultsTable: cheerio.Cheerio<any> | null = null

    tables.each((_, table): void | false => {
      const hasPlaceClass = $(table).find('td.place').length > 0
      const hasPrizeClass = $(table).find('td.prize').length > 0
      const hasNameClass = $(table).find('td.name').length > 0

      if (hasPlaceClass && hasPrizeClass && hasNameClass) {
        resultsTable = $(table)
        return false // break
      }
    })

    // Fallback: position-based detection for non-Hendon Mob sites
    if (!resultsTable) {
      tables.each((_, table): void | false => {
        const rows = $(table).find('tr')
        if (rows.length < 3) return

        let validRows = 0
        rows.slice(1, Math.min(11, rows.length)).each((_, row) => {
          const cells = $(row).find('td')
          if (cells.length >= 3) {
            const firstCell = $(cells[0]).text().trim()
            const lastCell = $(cells[cells.length - 1]).text().trim()

            // Check if first cell is rank and last cell is prize
            if (/^\d+(-\d+)?$/.test(firstCell) && /\$|€|£|,\d{3,}/.test(lastCell)) {
              validRows++
            }
          }
        })

        // If 70%+ rows look like payout rows, use this table
        if (validRows / Math.min(10, rows.length - 1) > 0.7) {
          resultsTable = $(table)
          return false // break
        }
      })
    }

    if (!resultsTable) {
      return NextResponse.json(
        {
          error: 'Could not find a valid payout table in the HTML. Please try CSV or Manual input instead.',
        },
        { status: 404 }
      )
    }

    logger.debug(`Found payout table. Total tables analyzed: ${tables.length}`)

    // Parse table rows (skip header)
    // TypeScript: Use type assertion - resultsTable is guaranteed to be non-null here
    const tableRows = (resultsTable as cheerio.Cheerio<any>).find('tr').slice(1)
    tableRows.each((_: number, row: Element) => {
      const cells = $(row).find('td')

      if (cells.length >= 3) {
        let rank = 0
        let playerName = ''
        let prizeText = ''
        let country = ''

        // Try class-based parsing first (Hendon Mob specific)
        cells.each((_, cell): void | false => {
          const cellClass = $(cell).attr('class') || ''
          const cellText = $(cell).text().trim()

          // Extract rank
          if (cellClass.includes('place')) {
            rank = parseInt(cellText.replace(/\D/g, '')) || 0
          }

          // Extract country from flag cell
          if (cellClass.includes('flag')) {
            const flagSpan = $(cell).find('span[class*="flag-"]')
            if (flagSpan.length) {
              // Get country name from title attribute or text content
              const countryName = flagSpan.attr('title') || flagSpan.text().trim()
              if (countryName) {
                // Convert country name to ISO code
                country = countryNameToCode(countryName)
              }
            }
          }

          // Extract player name
          if (cellClass.includes('name')) {
            const link = $(cell).find('a').first()
            if (link.length) {
              playerName = link.text().trim()
            } else {
              playerName = cellText
            }
          }

          // Extract prize (only first prize column, ignore empty ones)
          if (cellClass.includes('prize') && !prizeText && cellText) {
            prizeText = cellText
          }
        })

        // Fallback to position-based parsing if class-based failed
        if (!rank || !playerName) {
          const firstCell = $(cells[0]).text().trim()
          rank = parseInt(firstCell.replace(/\D/g, '')) || 0

          // Look for player name link
          cells.each((i, cell): void | false => {
            if (i === 0) return
            const link = $(cell).find('a').first()
            if (link.length && link.attr('href')?.includes('player.php')) {
              playerName = link.text().trim()
              return false // break
            }
          })

          if (!playerName && cells.length > 1) {
            playerName = $(cells[1]).text().trim()
          }
        }

        // Fallback prize extraction if class-based failed
        if (!prizeText) {
          // Look for cell with currency symbols
          cells.each((_, cell): void | false => {
            const cellText = $(cell).text().trim()
            if (/\$|€|£/.test(cellText) && !prizeText) {
              prizeText = cellText
              return false // break
            }
          })

          // Last resort: use last column
          if (!prizeText) {
            prizeText = $(cells[cells.length - 1]).text().trim()
          }
        }

        // Only add if we have valid data
        if (rank > 0 && playerName && prizeText && prizeText !== '-' && !prizeText.includes('points')) {
          payouts.push({
            rank,
            playerName: country ? `${playerName} (${country})` : playerName,
            prizeAmount: prizeText,
          })
        }
      }
    })

    if (payouts.length === 0) {
      return NextResponse.json(
        { error: 'No payout data found in the HTML. The page structure might be different than expected.' },
        { status: 404 }
      )
    }

    // Sort by rank just in case
    payouts.sort((a, b) => a.rank - b.rank)

    return NextResponse.json({ payouts })

  } catch (error) {
    logError('parse-hendon-mob-html', error)
    return NextResponse.json(
      { error: sanitizeErrorMessage(error, 'HTML 파싱에 실패했습니다. 다시 시도하거나 수동으로 입력해주세요.') },
      { status: 500 }
    )
  }
}
