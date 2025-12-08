/**
 * Error handling utilities for API routes
 * Sanitizes error messages in production to avoid leaking sensitive information
 */

import { logger } from '@/lib/logger'

const isProduction = process.env.NODE_ENV === 'production'

/**
 * 민감한 정보를 포함할 수 있는 키워드 목록
 */
const SENSITIVE_KEYWORDS = [
  'password',
  'token',
  'secret',
  'api_key',
  'apikey',
  'auth',
  'credential',
  'private',
  'jwt',
  'session',
  'cookie',
  'connection',
  'database',
  'postgres',
  'firebase',
  'firestore',
]

/**
 * 에러 메시지에서 민감한 정보 제거
 */
function removeSensitiveInfo(message: string): string {
  let sanitized = message

  // 민감한 키워드가 포함된 경우 일반 메시지로 대체
  for (const keyword of SENSITIVE_KEYWORDS) {
    if (sanitized.toLowerCase().includes(keyword)) {
      return '요청 처리 중 오류가 발생했습니다'
    }
  }

  // Stack trace 제거
  const stackTraceIndex = sanitized.indexOf('\n    at ')
  if (stackTraceIndex !== -1) {
    sanitized = sanitized.substring(0, stackTraceIndex)
  }

  // 파일 경로 제거 (절대 경로 노출 방지)
  sanitized = sanitized.replace(/\/[a-zA-Z0-9_\-./]+\.(ts|js|tsx|jsx):\d+:\d+/g, '[file]')

  return sanitized
}

/**
 * Sanitize error message for client response
 * In production, returns generic message. In development, returns detailed error.
 */
export function sanitizeErrorMessage(error: unknown, fallbackMessage: string): string {
  if (!isProduction) {
    // In development, show detailed error messages
    if (error instanceof Error) {
      return error.message
    }
    if (typeof error === 'string') {
      return error
    }
    return String(error)
  }

  // In production, sanitize and return message
  if (error instanceof Error) {
    const sanitized = removeSensitiveInfo(error.message)
    // 빈 메시지나 너무 일반적인 메시지는 fallback 사용
    if (!sanitized || sanitized.length < 10) {
      return fallbackMessage
    }
    return sanitized
  }

  // In production, return generic fallback message
  return fallbackMessage
}

/**
 * Log error to console (always logs regardless of environment)
 */
export function logError(context: string, error: unknown): void {
  logger.error(`[${context}]`, error)
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: unknown,
  fallbackMessage: string,
  statusCode: number = 500
): {
  error: string
  status: number
} {
  const message = sanitizeErrorMessage(error, fallbackMessage)
  return {
    error: message,
    status: statusCode
  }
}
