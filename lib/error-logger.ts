/**
 * Error Logging Utility
 *
 * Structured error logging for debugging and monitoring
 */

export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export enum ErrorCategory {
  NETWORK = 'network',
  DATABASE = 'database',
  VALIDATION = 'validation',
  AUTH = 'auth',
  FILE_SYSTEM = 'file_system',
  UNKNOWN = 'unknown',
}

export interface ErrorContext {
  /** 요청 ID */
  requestId?: string
  /** 사용자 ID */
  userId?: string
  /** 추가 메타데이터 */
  metadata?: Record<string, any>
  /** Stack trace */
  stack?: string
  /** HTTP 상태 코드 */
  statusCode?: number
}

export interface LogEntry {
  timestamp: string
  severity: ErrorSeverity
  category: ErrorCategory
  message: string
  error?: string
  context?: ErrorContext
}

/**
 * 에러 카테고리 자동 감지
 */
export function detectErrorCategory(error: Error): ErrorCategory {
  const message = error.message.toLowerCase()

  // Network errors
  if (
    message.includes('econnreset') ||
    message.includes('enotfound') ||
    message.includes('etimedout') ||
    message.includes('network') ||
    message.includes('timeout')
  ) {
    return ErrorCategory.NETWORK
  }

  // Database errors
  if (
    message.includes('database') ||
    message.includes('postgres') ||
    message.includes('supabase') ||
    message.includes('sql')
  ) {
    return ErrorCategory.DATABASE
  }

  // Auth errors
  if (
    message.includes('auth') ||
    message.includes('login') ||
    message.includes('unauthorized') ||
    message.includes('forbidden')
  ) {
    return ErrorCategory.AUTH
  }

  // Validation errors
  if (
    message.includes('invalid') ||
    message.includes('validation') ||
    message.includes('required') ||
    message.includes('missing')
  ) {
    return ErrorCategory.VALIDATION
  }

  // File system errors
  if (
    message.includes('enoent') ||
    message.includes('eacces') ||
    message.includes('file') ||
    message.includes('directory')
  ) {
    return ErrorCategory.FILE_SYSTEM
  }

  return ErrorCategory.UNKNOWN
}

/**
 * 에러 심각도 자동 감지
 */
export function detectErrorSeverity(error: Error): ErrorSeverity {
  const message = error.message.toLowerCase()

  // Critical errors
  if (
    message.includes('critical') ||
    message.includes('fatal') ||
    message.includes('out of memory')
  ) {
    return ErrorSeverity.CRITICAL
  }

  // Warnings
  if (
    message.includes('warning') ||
    message.includes('deprecated') ||
    message.includes('retry')
  ) {
    return ErrorSeverity.WARNING
  }

  // Default to ERROR
  return ErrorSeverity.ERROR
}

/**
 * Structured error logging
 */
export function logError(
  error: Error,
  context: ErrorContext = {},
  severity?: ErrorSeverity,
  category?: ErrorCategory
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    severity: severity || detectErrorSeverity(error),
    category: category || detectErrorCategory(error),
    message: error.message,
    error: error.name,
    context: {
      ...context,
      stack: error.stack,
    },
  }

  // 콘솔 출력
  const prefix = `[${entry.severity.toUpperCase()}] [${entry.category}]`
  console.error(prefix, entry.message)

  if (context.requestId) {
    console.error(`${prefix} Request ID: ${context.requestId}`)
  }

  if (context.metadata) {
    console.error(`${prefix} Metadata:`, context.metadata)
  }

  if (process.env.NODE_ENV === 'development') {
    console.error(`${prefix} Stack:`, error.stack)
  }
}

/**
 * Info 로깅
 */
export function logInfo(message: string, metadata?: Record<string, any>): void {

  console.log(`[INFO]`, message)
  if (metadata) {
    console.log(`[INFO] Metadata:`, metadata)
  }
}

/**
 * Warning 로깅
 */
export function logWarning(message: string, metadata?: Record<string, any>): void {

  console.warn(`[WARNING]`, message)
  if (metadata) {
    console.log(`[WARNING] Metadata:`, metadata)
  }
}
