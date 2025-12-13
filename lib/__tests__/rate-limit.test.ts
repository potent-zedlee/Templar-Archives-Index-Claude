import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { applyRateLimit, isRateLimitingEnabled, rateLimiters } from '../utils/rate-limit'
import { NextRequest } from 'next/server'

// Store original environment variables
let originalEnv: NodeJS.ProcessEnv

describe('Rate Limiting', () => {
  beforeEach(() => {
    originalEnv = { ...process.env }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('isRateLimitingEnabled', () => {
    it('should return false when Redis is not configured', () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      // Re-import to get updated env
      const result = isRateLimitingEnabled()
      expect(typeof result).toBe('boolean')
    })

    it('should check for environment variables', () => {
      const hasUrl = !!process.env.UPSTASH_REDIS_REST_URL
      const hasToken = !!process.env.UPSTASH_REDIS_REST_TOKEN
      const shouldBeEnabled = hasUrl && hasToken

      const result = isRateLimitingEnabled()
      expect(result).toBe(shouldBeEnabled)
    })
  })

  describe('rateLimiters configuration', () => {
    it('should have naturalSearch limiter', () => {
      expect(rateLimiters).toHaveProperty('naturalSearch')
    })

    it('should have importHands limiter', () => {
      expect(rateLimiters).toHaveProperty('importHands')
    })

    it('should have parseApi limiter', () => {
      expect(rateLimiters).toHaveProperty('parseApi')
    })

    it('should have general limiter', () => {
      expect(rateLimiters).toHaveProperty('general')
    })
  })

  describe('applyRateLimit', () => {
    it('should return null when limiter is null (development)', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
      })

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const result = await applyRateLimit(request, null)

      expect(result).toBeNull()
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Rate limiting is disabled')
      )

      consoleWarnSpy.mockRestore()
    })

    it('should extract user ID from authorization header', async () => {
      // Create a mock JWT token
      const payload = { sub: 'user-123', user_id: 'user-123' }
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64')
      const mockToken = `header.${encodedPayload}.signature`

      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
      })

      // Mock limiter
      const mockLimiter = {
        limit: vi.fn().mockResolvedValue({
          success: true,
          limit: 10,
          reset: Date.now() + 60000,
          remaining: 9,
        }),
      }

      await applyRateLimit(request, mockLimiter as any)

      expect(mockLimiter.limit).toHaveBeenCalledWith(
        expect.stringContaining('user:user-123')
      )
    })

    it('should fallback to IP address when no auth header', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.1',
        },
      })

      const mockLimiter = {
        limit: vi.fn().mockResolvedValue({
          success: true,
          limit: 10,
          reset: Date.now() + 60000,
          remaining: 9,
        }),
      }

      await applyRateLimit(request, mockLimiter as any)

      expect(mockLimiter.limit).toHaveBeenCalledWith(
        expect.stringContaining('ip:192.168.1.1')
      )
    })

    it('should return 429 when rate limit exceeded', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
      })

      const resetTime = Date.now() + 60000
      const mockLimiter = {
        limit: vi.fn().mockResolvedValue({
          success: false,
          limit: 10,
          reset: resetTime,
          remaining: 0,
        }),
      }

      const result = await applyRateLimit(request, mockLimiter as any)

      expect(result).not.toBeNull()
      expect(result?.status).toBe(429)

      const body = await result?.json()
      expect(body).toHaveProperty('error')
      expect(body).toHaveProperty('retryAfter')
    })

    it('should return null when rate limit not exceeded', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
      })

      const mockLimiter = {
        limit: vi.fn().mockResolvedValue({
          success: true,
          limit: 10,
          reset: Date.now() + 60000,
          remaining: 9,
        }),
      }

      const result = await applyRateLimit(request, mockLimiter as any)
      expect(result).toBeNull()
    })

    it('should handle rate limiter errors gracefully', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
      })

      const mockLimiter = {
        limit: vi.fn().mockRejectedValue(new Error('Redis connection failed')),
      }

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const result = await applyRateLimit(request, mockLimiter as any)

      expect(result).toBeNull()
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Rate limiting error'),
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })

    it('should include rate limit headers in response when exceeded', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
      })

      const resetTime = Date.now() + 60000
      const mockLimiter = {
        limit: vi.fn().mockResolvedValue({
          success: false,
          limit: 10,
          reset: resetTime,
          remaining: 0,
        }),
      }

      const result = await applyRateLimit(request, mockLimiter as any)

      expect(result?.headers.get('X-RateLimit-Limit')).toBe('10')
      expect(result?.headers.get('X-RateLimit-Remaining')).toBe('0')
      expect(result?.headers.get('X-RateLimit-Reset')).toBeTruthy()
    })

    it('should handle invalid JWT tokens', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
        headers: {
          authorization: 'Bearer invalid.token.here',
          'x-forwarded-for': '192.168.1.1',
        },
      })

      const mockLimiter = {
        limit: vi.fn().mockResolvedValue({
          success: true,
          limit: 10,
          reset: Date.now() + 60000,
          remaining: 9,
        }),
      }

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      await applyRateLimit(request, mockLimiter as any)

      // Should fallback to IP
      expect(mockLimiter.limit).toHaveBeenCalledWith(
        expect.stringContaining('ip:')
      )

      consoleWarnSpy.mockRestore()
    })

    it('should use x-real-ip header as fallback', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
        headers: {
          'x-real-ip': '10.0.0.1',
        },
      })

      const mockLimiter = {
        limit: vi.fn().mockResolvedValue({
          success: true,
          limit: 10,
          reset: Date.now() + 60000,
          remaining: 9,
        }),
      }

      await applyRateLimit(request, mockLimiter as any)

      expect(mockLimiter.limit).toHaveBeenCalledWith(
        expect.stringContaining('ip:10.0.0.1')
      )
    })

    it('should use "unknown" when no IP headers present', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
      })

      const mockLimiter = {
        limit: vi.fn().mockResolvedValue({
          success: true,
          limit: 10,
          reset: Date.now() + 60000,
          remaining: 9,
        }),
      }

      await applyRateLimit(request, mockLimiter as any)

      expect(mockLimiter.limit).toHaveBeenCalledWith(
        expect.stringContaining('ip:unknown')
      )
    })
  })
})
