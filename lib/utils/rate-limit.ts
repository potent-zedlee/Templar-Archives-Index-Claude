import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Rate limiter configuration for API routes
 * Uses Upstash Redis for distributed rate limiting
 *
 * Environment variables required:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 */

// Initialize Redis client (only if environment variables are set)
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null

/**
 * Create a rate limiter with sliding window algorithm
 * @param requests - Number of requests allowed
 * @param window - Time window (e.g., "1 m" for 1 minute)
 */
function createRateLimiter(requests: number, window: string) {
  if (!redis) {
    // If Redis is not configured, return a no-op limiter for development
    return null
  }

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window as any),
    analytics: true,
    prefix: 'ggvault',
  })
}

// Rate limiters for different API endpoints
export const rateLimiters = {
  // Natural search uses Claude API - limit to 5 requests per minute
  naturalSearch: createRateLimiter(5, '1 m'),

  // Import hands - limit to 10 requests per minute
  importHands: createRateLimiter(10, '1 m'),

  // Parse APIs - limit to 10 requests per minute
  parseApi: createRateLimiter(10, '1 m'),

  // General API - limit to 30 requests per minute
  general: createRateLimiter(30, '1 m'),
}

/**
 * Apply rate limiting to an API route
 * Returns 429 (Too Many Requests) if limit is exceeded
 *
 * @example
 * export async function POST(request: NextRequest) {
 *   const rateLimitResponse = await applyRateLimit(request, rateLimiters.naturalSearch)
 *   if (rateLimitResponse) return rateLimitResponse
 *
 *   // Continue with API logic...
 * }
 */
export async function applyRateLimit(
  request: NextRequest,
  limiter: Ratelimit | null
): Promise<NextResponse | null> {
  // Skip rate limiting if Redis is not configured (development mode)
  if (!limiter) {
    console.warn('Rate limiting is disabled (Redis not configured)')
    return null
  }

  try {
    // Get identifier from IP address or user ID
    const identifier = getIdentifier(request)

    // Check rate limit
    const { success, limit, reset, remaining } = await limiter.limit(identifier)

    // Add rate limit headers to response
    const headers = {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': new Date(reset).toISOString(),
    }

    if (!success) {
      return NextResponse.json(
        {
          error: '요청 제한을 초과했습니다. 잠시 후 다시 시도해주세요.',
          retryAfter: Math.ceil((reset - Date.now()) / 1000), // seconds until reset
        },
        {
          status: 429,
          headers,
        }
      )
    }

    // Rate limit passed - return null to continue
    return null
  } catch (error) {
    // If rate limiting fails, log error but don't block the request
    console.error('Rate limiting error:', error)
    return null
  }
}

/**
 * Get unique identifier for rate limiting
 * Prefers user ID (more secure) over IP address
 */
function getIdentifier(request: NextRequest): string {
  // Try to extract user ID from Firebase Auth token
  const authHeader = request.headers.get('authorization')

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7) // Remove "Bearer " prefix

      // Parse JWT payload (middle part between dots)
      const parts = token.split('.')
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
        const userId = payload.sub || payload.user_id

        if (userId) {
          return `user:${userId}`
        }
      }
    } catch (error) {
      // Invalid JWT - fall back to IP
      console.warn('Failed to parse JWT for rate limiting:', error)
    }
  }

  // Fallback to IP address
  const ip =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'unknown'

  return `ip:${ip}`
}

/**
 * Check if rate limiting is enabled
 */
export function isRateLimitingEnabled(): boolean {
  return !!redis
}
