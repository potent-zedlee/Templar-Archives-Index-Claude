/**
 * Toast 통합 유틸리티
 *
 * API 호출 및 비동기 작업을 위한 일관된 Toast 처리
 */

import { toast } from "sonner"
import { logError } from "./error-handler"

/**
 * API 에러를 Toast로 표시
 */
export function showErrorToast(error: unknown, fallbackMessage: string = "작업 실행 중 오류가 발생했습니다"): void {
  const message = error instanceof Error ? error.message : fallbackMessage
  toast.error(message)
  logError("ToastUtils", error)
}

/**
 * 성공 메시지 Toast
 */
export function showSuccessToast(message: string): void {
  toast.success(message)
}

/**
 * 정보 메시지 Toast
 */
export function showInfoToast(message: string): void {
  toast.info(message)
}

/**
 * 경고 메시지 Toast
 */
export function showWarningToast(message: string): void {
  toast.warning(message)
}

/**
 * Promise 기반 작업을 Toast로 래핑
 *
 * 사용법:
 * ```ts
 * await toastPromise(
 *   fetchData(),
 *   {
 *     loading: "데이터 로딩 중...",
 *     success: "데이터를 성공적으로 불러왔습니다",
 *     error: "데이터 로딩에 실패했습니다"
 *   }
 * )
 * ```
 */
export async function toastPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string
    success: string | ((data: T) => string)
    error?: string | ((error: unknown) => string)
  }
): Promise<T> {
  toast.promise(promise, {
    loading: messages.loading,
    success: (data: T) => {
      return typeof messages.success === "function"
        ? messages.success(data)
        : messages.success
    },
    error: (error: unknown) => {
      logError("ToastPromise", error)

      if (messages.error) {
        return typeof messages.error === "function"
          ? messages.error(error)
          : messages.error
      }

      return error instanceof Error
        ? error.message
        : "작업 실행 중 오류가 발생했습니다"
    },
  })

  return promise
}

/**
 * Try-Catch 래퍼 with Toast
 *
 * 사용법:
 * ```ts
 * const result = await tryCatchWithToast(
 *   async () => await fetchData(),
 *   {
 *     success: "데이터 로딩 성공",
 *     error: "데이터 로딩 실패"
 *   }
 * )
 * ```
 */
export async function tryCatchWithToast<T>(
  fn: () => Promise<T>,
  messages?: {
    success?: string | ((data: T) => string)
    error?: string | ((error: unknown) => string)
  }
): Promise<T | null> {
  try {
    const result = await fn()

    if (messages?.success) {
      const successMessage = typeof messages.success === "function"
        ? messages.success(result)
        : messages.success
      showSuccessToast(successMessage)
    }

    return result
  } catch (error) {
    const errorMessage = messages?.error
      ? typeof messages.error === "function"
        ? messages.error(error)
        : messages.error
      : error instanceof Error
      ? error.message
      : "작업 실행 중 오류가 발생했습니다"

    showErrorToast(error, errorMessage)
    return null
  }
}

/**
 * Mutation을 위한 Toast 헬퍼
 * (Create, Update, Delete 작업용)
 */
export const mutationToasts = {
  create: {
    loading: "생성 중...",
    success: "성공적으로 생성되었습니다",
    error: "생성에 실패했습니다",
  },
  update: {
    loading: "업데이트 중...",
    success: "성공적으로 업데이트되었습니다",
    error: "업데이트에 실패했습니다",
  },
  delete: {
    loading: "삭제 중...",
    success: "성공적으로 삭제되었습니다",
    error: "삭제에 실패했습니다",
  },
  save: {
    loading: "저장 중...",
    success: "성공적으로 저장되었습니다",
    error: "저장에 실패했습니다",
  },
} as const

/**
 * API 응답 에러 처리
 */
export function handleApiError(error: unknown, context: string = "API"): void {
  let message = "요청 처리 중 오류가 발생했습니다"

  if (error instanceof Response) {
    message = `서버 오류 (${error.status}): ${error.statusText}`
  } else if (error instanceof Error) {
    message = error.message
  }

  toast.error(message)
  logError(context, error)
}

/**
 * Form 제출을 위한 Toast 헬퍼
 */
export async function handleFormSubmit<T>(
  submitFn: () => Promise<T>,
  options?: {
    successMessage?: string
    errorMessage?: string
    onSuccess?: (data: T) => void
    onError?: (error: unknown) => void
  }
): Promise<boolean> {
  try {
    const result = await toastPromise(submitFn(), {
      loading: "제출 중...",
      success: options?.successMessage || "성공적으로 제출되었습니다",
      error: options?.errorMessage || "제출에 실패했습니다",
    })

    options?.onSuccess?.(result)
    return true
  } catch (error) {
    options?.onError?.(error)
    return false
  }
}
