import { describe, it, expect, vi, beforeEach } from 'vitest'
import { toast } from 'sonner'
import {
  showErrorToast,
  showSuccessToast,
  showInfoToast,
  showWarningToast,
  toastPromise,
  tryCatchWithToast,
  handleApiError,
  handleFormSubmit,
  mutationToasts,
} from '../utils/toast'

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    promise: vi.fn(),
  },
}))

// Mock error-handler
vi.mock('../utils/error-handler', () => ({
  logError: vi.fn(),
}))

describe('Toast Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('showErrorToast', () => {
    it('should show error toast with error message', () => {
      const error = new Error('Test error')
      showErrorToast(error)
      expect(toast.error).toHaveBeenCalledWith('Test error')
    })

    it('should show fallback message for non-Error objects', () => {
      showErrorToast('string error', 'Fallback message')
      expect(toast.error).toHaveBeenCalledWith('Fallback message')
    })

    it('should use default fallback message', () => {
      showErrorToast(null)
      expect(toast.error).toHaveBeenCalledWith('작업 실행 중 오류가 발생했습니다')
    })
  })

  describe('showSuccessToast', () => {
    it('should show success toast', () => {
      showSuccessToast('Success message')
      expect(toast.success).toHaveBeenCalledWith('Success message')
    })
  })

  describe('showInfoToast', () => {
    it('should show info toast', () => {
      showInfoToast('Info message')
      expect(toast.info).toHaveBeenCalledWith('Info message')
    })
  })

  describe('showWarningToast', () => {
    it('should show warning toast', () => {
      showWarningToast('Warning message')
      expect(toast.warning).toHaveBeenCalledWith('Warning message')
    })
  })

  describe('toastPromise', () => {
    it('should handle successful promise', async () => {
      const promise = Promise.resolve('data')
      const messages = {
        loading: 'Loading...',
        success: 'Success!',
      }

      vi.mocked(toast.promise).mockResolvedValue('data' as never)
      await toastPromise(promise, messages)

      expect(toast.promise).toHaveBeenCalledWith(
        promise,
        expect.objectContaining({
          loading: 'Loading...',
        })
      )
    })

    it('should handle success message as function', async () => {
      const promise = Promise.resolve({ id: 1 })
      const messages = {
        loading: 'Loading...',
        success: (data: { id: number }) => `Created item ${data.id}`,
      }

      vi.mocked(toast.promise).mockImplementation((async (p: Promise<unknown>, opts: { success?: (data: unknown) => void }) => {
        const data: { id: number } = await p as { id: number }
        if (opts.success) {
          opts.success(data)
        }
        return data
      }) as never)

      await toastPromise(promise, messages)
      expect(toast.promise).toHaveBeenCalled()
    })
  })

  describe('tryCatchWithToast', () => {
    it('should return data on success', async () => {
      const fn = vi.fn().mockResolvedValue('success data')
      const result = await tryCatchWithToast(fn, {
        success: 'Operation successful',
      })

      expect(result).toBe('success data')
      expect(toast.success).toHaveBeenCalledWith('Operation successful')
    })

    it('should handle errors and return null', async () => {
      const error = new Error('Test error')
      const fn = vi.fn().mockRejectedValue(error)
      const result = await tryCatchWithToast(fn, {
        error: 'Operation failed',
      })

      expect(result).toBeNull()
      expect(toast.error).toHaveBeenCalledWith('Test error')
    })

    it('should handle success message as function', async () => {
      const fn = vi.fn().mockResolvedValue({ id: 1 })
      await tryCatchWithToast(fn, {
        success: (data: { id: number }) => `Created item ${data.id}`,
      })

      expect(toast.success).toHaveBeenCalledWith('Created item 1')
    })

    it('should handle error message as function', async () => {
      const error = new Error('Custom error')
      const fn = vi.fn().mockRejectedValue(error)
      await tryCatchWithToast(fn, {
        error: (err) => `Failed: ${err instanceof Error ? err.message : 'Unknown'}`,
      })

      expect(toast.error).toHaveBeenCalledWith('Custom error')
    })
  })

  describe('handleApiError', () => {
    it('should handle Error objects', () => {
      const error = new Error('API error')
      handleApiError(error, 'TestAPI')
      expect(toast.error).toHaveBeenCalledWith('API error')
    })

    it('should handle Response objects', () => {
      const response = new Response(null, { status: 500, statusText: 'Internal Server Error' })
      handleApiError(response, 'TestAPI')
      expect(toast.error).toHaveBeenCalledWith('서버 오류 (500): Internal Server Error')
    })

    it('should handle unknown errors', () => {
      handleApiError('unknown error', 'TestAPI')
      expect(toast.error).toHaveBeenCalledWith('요청 처리 중 오류가 발생했습니다')
    })
  })

  describe('handleFormSubmit', () => {
    it('should handle successful form submission', async () => {
      const submitFn = vi.fn().mockResolvedValue({ id: 1 })
      const onSuccess = vi.fn()

      vi.mocked(toast.promise).mockResolvedValue({ id: 1 } as never)

      const result = await handleFormSubmit(submitFn, {
        successMessage: 'Form submitted',
        onSuccess,
      })

      expect(result).toBe(true)
      expect(onSuccess).toHaveBeenCalledWith({ id: 1 })
    })

    it('should handle form submission errors', async () => {
      const submitFn = vi.fn().mockRejectedValue(new Error('Validation error'))
      const onError = vi.fn()

      vi.mocked(toast.promise).mockRejectedValue(new Error('Validation error') as never)

      const result = await handleFormSubmit(submitFn, {
        errorMessage: 'Form submission failed',
        onError,
      })

      expect(result).toBe(false)
      expect(onError).toHaveBeenCalled()
    })
  })

  describe('mutationToasts', () => {
    it('should have correct toast messages for mutations', () => {
      expect(mutationToasts.create.loading).toBe('생성 중...')
      expect(mutationToasts.create.success).toBe('성공적으로 생성되었습니다')
      expect(mutationToasts.create.error).toBe('생성에 실패했습니다')

      expect(mutationToasts.update.loading).toBe('업데이트 중...')
      expect(mutationToasts.update.success).toBe('성공적으로 업데이트되었습니다')
      expect(mutationToasts.update.error).toBe('업데이트에 실패했습니다')

      expect(mutationToasts.delete.loading).toBe('삭제 중...')
      expect(mutationToasts.delete.success).toBe('성공적으로 삭제되었습니다')
      expect(mutationToasts.delete.error).toBe('삭제에 실패했습니다')

      expect(mutationToasts.save.loading).toBe('저장 중...')
      expect(mutationToasts.save.success).toBe('성공적으로 저장되었습니다')
      expect(mutationToasts.save.error).toBe('저장에 실패했습니다')
    })
  })
})
