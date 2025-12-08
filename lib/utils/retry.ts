/**
 * Retry Utilities
 *
 * 일시적인 에러에 대한 재시도 로직
 */

export interface RetryOptions {
  /** 최대 재시도 횟수 (기본값: 3) */
  maxRetries?: number
  /** 재시도 간격 (밀리초, 기본값: 1000) */
  retryDelay?: number
  /** 지수 백오프 사용 여부 (기본값: true) */
  exponentialBackoff?: number
  /** 재시도 가능한 에러인지 확인하는 함수 */
  shouldRetry?: (error: Error) => boolean
  /** 재시도 전 콜백 */
  onRetry?: (error: Error, attempt: number) => void | Promise<void>
}

/**
 * 일시적인 네트워크 에러인지 확인
 */
export function isTransientError(error: Error): boolean {
  const message = error.message.toLowerCase()

  return (
    message.includes('econnreset') ||
    message.includes('enotfound') ||
    message.includes('etimedout') ||
    message.includes('econnrefused') ||
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('socket hang up') ||
    message.includes('temporary failure')
  )
}

/**
 * HTTP 상태 코드가 재시도 가능한지 확인
 */
export function isRetryableHttpStatus(status: number): boolean {
  return (
    status === 408 || // Request Timeout
    status === 429 || // Too Many Requests
    status === 500 || // Internal Server Error
    status === 502 || // Bad Gateway
    status === 503 || // Service Unavailable
    status === 504 // Gateway Timeout
  )
}

/**
 * 재시도 가능한 에러인지 확인 (기본 로직)
 */
export function shouldRetryByDefault(error: Error): boolean {
  // 일시적인 네트워크 에러는 재시도
  if (isTransientError(error)) {
    return true
  }

  // HTTP 에러인 경우 상태 코드 확인
  if ('status' in error && typeof error.status === 'number') {
    return isRetryableHttpStatus(error.status)
  }

  return false
}

/**
 * 비동기 함수를 재시도 로직과 함께 실행
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    exponentialBackoff = 2,
    shouldRetry = shouldRetryByDefault,
    onRetry,
  } = options

  let lastError: Error

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // 마지막 시도거나 재시도 불가능한 에러면 throw
      if (attempt === maxRetries || !shouldRetry(lastError)) {
        throw lastError
      }

      // 재시도 전 콜백 실행
      if (onRetry) {
        await onRetry(lastError, attempt + 1)
      }

      // 재시도 간격 계산
      const delay = typeof exponentialBackoff === 'number' && exponentialBackoff > 1
        ? retryDelay * Math.pow(exponentialBackoff, attempt)
        : retryDelay

      console.log(
        `[retry] Attempt ${attempt + 1}/${maxRetries} failed: ${lastError.message}. Retrying in ${delay}ms...`
      )

      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

/**
 * FFmpeg 프로세스 재시도
 */
export async function withFfmpegRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  return withRetry(fn, {
    maxRetries: 2,
    retryDelay: 2000,
    exponentialBackoff: 1,
    shouldRetry: (error) => {
      const message = error.message.toLowerCase()
      return (
        message.includes('timeout') ||
        message.includes('connection') ||
        message.includes('temporary')
      )
    },
    ...options,
  })
}

/**
 * OCR 재시도
 */
export async function withOcrRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  return withRetry(fn, {
    maxRetries: 2,
    retryDelay: 1000,
    exponentialBackoff: 1,
    shouldRetry: (error) => {
      return isTransientError(error)
    },
    ...options,
  })
}

/**
 * Claude API 재시도
 */
export async function withClaudeRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  return withRetry(fn, {
    maxRetries: 3,
    retryDelay: 2000,
    exponentialBackoff: 2,
    shouldRetry: (error) => {
      const message = error.message.toLowerCase()
      return (
        isTransientError(error) ||
        message.includes('rate limit') ||
        message.includes('overloaded')
      )
    },
    ...options,
  })
}

