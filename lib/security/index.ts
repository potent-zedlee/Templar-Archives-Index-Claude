/**
 * 보안 유틸리티 통합 모듈
 *
 * 모든 보안 관련 기능을 한 곳에서 import
 */

// SQL Injection 방지
export {
  detectSQLInjection,
  escapeLikePattern,
  validateIdentifier,
  createSafeLikePattern,
  sanitizeSearchQuery,
  isValidUUID,
  isValidInteger,
  isValidDateFormat,
  validateSortField,
  validateSortDirection,
} from "./sql-sanitizer"

// XSS 방지
export {
  escapeHtml,
  detectDangerousHtml,
  sanitizeMarkdown,
  isSafeUrl,
  sanitizeText,
  sanitizeFilename,
  sanitizeJsonInput,
  isAllowedResourceUrl,
  sanitizeUserContent,
} from "./xss-sanitizer"

// CSRF 보호
export {
  generateCSRFToken,
  hashCSRFToken,
  verifyCSRF,
  SECURE_COOKIE_OPTIONS,
  createCSRFMiddleware,
  generateDoubleSubmitToken,
  verifyDoubleSubmitToken,
  fetchWithCSRF,
  CSRFTokenInput,
} from "./csrf"

// 통합 검증 헬퍼
export function validateAndSanitize(input: {
  value: unknown
  type: "text" | "html" | "url" | "uuid" | "int" | "date"
  maxLength?: number
}): {
  valid: boolean
  sanitized: unknown
  errors: string[]
} {
  const errors: string[] = []
  let sanitized = input.value

  switch (input.type) {
    case "text":
      if (typeof input.value !== "string") {
        errors.push("값이 문자열이 아닙니다")
        return { valid: false, sanitized: "", errors }
      }
      sanitized = sanitizeText(input.value, input.maxLength)
      break

    case "html":
      if (typeof input.value !== "string") {
        errors.push("값이 문자열이 아닙니다")
        return { valid: false, sanitized: "", errors }
      }
      if (detectDangerousHtml(input.value)) {
        errors.push("위험한 HTML이 감지되었습니다")
      }
      sanitized = escapeHtml(input.value)
      break

    case "url":
      if (typeof input.value !== "string") {
        errors.push("값이 문자열이 아닙니다")
        return { valid: false, sanitized: "", errors }
      }
      if (!isSafeUrl(input.value)) {
        errors.push("안전하지 않은 URL입니다")
        return { valid: false, sanitized: "", errors }
      }
      sanitized = input.value
      break

    case "uuid":
      if (typeof input.value !== "string") {
        errors.push("값이 문자열이 아닙니다")
        return { valid: false, sanitized: "", errors }
      }
      if (!isValidUUID(input.value)) {
        errors.push("유효하지 않은 UUID입니다")
        return { valid: false, sanitized: "", errors }
      }
      sanitized = input.value
      break

    case "int":
      if (typeof input.value !== "number") {
        errors.push("값이 숫자가 아닙니다")
        return { valid: false, sanitized: 0, errors }
      }
      if (!Number.isInteger(input.value)) {
        errors.push("값이 정수가 아닙니다")
        return { valid: false, sanitized: 0, errors }
      }
      sanitized = input.value
      break

    case "date":
      if (typeof input.value !== "string") {
        errors.push("값이 문자열이 아닙니다")
        return { valid: false, sanitized: "", errors }
      }
      if (!isValidDateFormat(input.value)) {
        errors.push("유효하지 않은 날짜 형식입니다")
        return { valid: false, sanitized: "", errors }
      }
      sanitized = input.value
      break
  }

  return {
    valid: errors.length === 0,
    sanitized,
    errors,
  }
}

/**
 * API 요청 보안 체크리스트
 *
 * @example
 * const result = await securityChecklist(request, {
 *   requireAuth: true,
 *   rateLimit: rateLimiters.general,
 *   validateCSRF: true,
 * })
 *
 * if (!result.passed) {
 *   return result.response
 * }
 */
import { NextRequest, NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { applyRateLimit } from "@/lib/utils/rate-limit"
import { verifyCSRF } from "./csrf"
import { isValidUUID, isValidDateFormat } from "./sql-sanitizer"
import { sanitizeText, detectDangerousHtml, escapeHtml, isSafeUrl } from "./xss-sanitizer"

export async function securityChecklist(
  request: NextRequest,
  options: {
    requireAuth?: boolean
    rateLimit?: Ratelimit | null
    validateCSRF?: boolean
    maxBodySize?: number // bytes
  } = {}
): Promise<{
  passed: boolean
  response?: NextResponse
}> {
  // Rate Limiting
  if (options.rateLimit) {
    const rateLimitResponse = await applyRateLimit(request, options.rateLimit)
    if (rateLimitResponse) {
      return { passed: false, response: rateLimitResponse }
    }
  }

  // CSRF 검증
  if (options.validateCSRF) {
    const csrfResponse = await verifyCSRF(request)
    if (csrfResponse) {
      return { passed: false, response: csrfResponse }
    }
  }

  // Body 크기 제한
  if (options.maxBodySize) {
    const contentLength = request.headers.get("content-length")
    if (contentLength && parseInt(contentLength) > options.maxBodySize) {
      return {
        passed: false,
        response: NextResponse.json(
          { error: "요청 크기가 너무 큽니다" },
          { status: 413 }
        ),
      }
    }
  }

  // 인증 필요 (간단한 체크, 실제로는 세션/JWT 검증 필요)
  if (options.requireAuth) {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return {
        passed: false,
        response: NextResponse.json(
          { error: "인증이 필요합니다" },
          { status: 401 }
        ),
      }
    }
  }

  return { passed: true }
}

/**
 * 보안 로깅
 */
export function logSecurityEvent(
  event: "sql_injection" | "xss_attempt" | "csrf_violation" | "rate_limit_exceeded" | "suspicious_file_upload" | "permission_violation" | "failed_login_attempt" | "admin_action",
  details: Record<string, unknown>
): void {
  console.warn(`[SECURITY] ${event}:`, details)

  // Log to database for admin monitoring
  if (process.env.NEXT_PUBLIC_ENVIRONMENT !== 'development') {
    try {
      import('../monitoring/security-logger').then(({ logSecurityEventToDb }) => {
        // Determine severity based on event type
        const severity =
          event === 'sql_injection' || event === 'permission_violation' ? 'critical' :
            event === 'xss_attempt' || event === 'csrf_violation' ? 'high' :
              event === 'failed_login_attempt' || event === 'suspicious_file_upload' ? 'medium' :
                'low'

        logSecurityEventToDb({
          eventType: event,
          severity,
          userId: (details.userId as string) || null,
          ipAddress: (details.ipAddress as string) || null,
          userAgent: (details.userAgent as string) || null,
          requestMethod: (details.method as string) || null,
          requestPath: (details.path as string) || null,
          details: details as Record<string, unknown> | null,
        })
      })
    } catch (error) {
      // Fallback: log DB errors to console
      console.error('Failed to log security event to database:', error)
    }
  }
}
