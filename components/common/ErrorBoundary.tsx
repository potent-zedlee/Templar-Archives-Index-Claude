"use client"

import React, { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertCircle, RefreshCcw, Home } from 'lucide-react'
import Link from 'next/link'
import { logError } from '@/lib/utils/error-handler'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * 커스텀 Error Boundary 컴포넌트
 *
 * 사용법:
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 *
 * 커스텀 fallback UI:
 * ```tsx
 * <ErrorBoundary fallback={(error, reset) => <CustomError error={error} onReset={reset} />}>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // 에러 로깅
    logError('ErrorBoundary', error)
    console.error('Error Info:', errorInfo)

    // 커스텀 에러 핸들러 호출
    this.props.onError?.(error, errorInfo)
  }

  reset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    })
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // 커스텀 fallback이 제공된 경우
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset)
      }

      // 기본 fallback UI
      return (
        <Card className="p-8 text-center max-w-md mx-auto my-8">
          <div className="flex justify-center mb-6">
            <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
          </div>

          <h2 className="text-title-lg mb-4">
            문제가 발생했습니다
          </h2>

          <p className="text-body text-muted-foreground mb-6">
            예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
          </p>

          {this.state.error.message && (
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <p className="text-caption text-muted-foreground font-mono break-all">
                {this.state.error.message}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={this.reset}
              variant="default"
              className="flex-1"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              다시 시도
            </Button>

            <Link href="/" className="flex-1">
              <Button variant="outline" className="w-full">
                <Home className="mr-2 h-4 w-4" />
                홈으로
              </Button>
            </Link>
          </div>
        </Card>
      )
    }

    return this.props.children
  }
}

/**
 * Inline Error Boundary (작은 영역용)
 */
export function InlineErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <div className="p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive mb-1">
                오류 발생
              </p>
              <p className="text-sm text-muted-foreground mb-3">
                {error.message}
              </p>
              <Button
                onClick={reset}
                variant="outline"
                size="sm"
              >
                <RefreshCcw className="mr-2 h-3 w-3" />
                다시 시도
              </Button>
            </div>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  )
}
