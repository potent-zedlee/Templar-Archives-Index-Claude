'use client'

import dynamic from 'next/dynamic'
import { Suspense, useState, useEffect, useCallback } from 'react'
import { Component, ReactNode } from 'react'

// LiquidEther는 Three.js WebGL을 사용하므로 클라이언트에서만 렌더링
const LiquidEther = dynamic(() => import('./LiquidEther'), {
  ssr: false,
  loading: () => null,
})

interface LiquidEtherBackgroundProps {
  children: React.ReactNode
  colors?: string[]
  className?: string
}

/**
 * LiquidEther Background Wrapper
 *
 * 페이지 배경에 LiquidEther 애니메이션을 적용하는 래퍼 컴포넌트
 * - 콘텐츠 위에 반투명하게 표시
 * - 마우스 인터랙션 지원
 * - 성능 최적화 (visibility 기반 pause/resume)
 * - WebGL 미지원 시 graceful fallback
 */
export function LiquidEtherBackground({
  children,
  colors = ['#5227FF', '#FF9FFC', '#B19EEF'],
  className = '',
}: LiquidEtherBackgroundProps) {
  const [mounted, setMounted] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isWebGLSupported, setIsWebGLSupported] = useState(true)

  useEffect(() => {
    // 클라이언트 마운트 후 WebGL 체크 - 의도된 hydration 패턴
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
    // WebGL 지원 여부 확인
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      if (!gl) {
        setIsWebGLSupported(false)
      }
    } catch {
      setIsWebGLSupported(false)
    }
  }, [])

  const handleError = useCallback(() => {
    setHasError(true)
  }, [])

  const showLiquidEther = mounted && isWebGLSupported && !hasError

  return (
    <div className={`relative min-h-screen ${className}`}>
      {/* Background Layer - LiquidEther WebGL Animation */}
      <div
        className="fixed inset-0 z-0"
        style={{
          width: '100vw',
          height: '100vh',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
        }}
      >
        {showLiquidEther && (
          <Suspense fallback={null}>
            <ErrorBoundary onError={handleError}>
              <LiquidEther
                colors={colors}
                autoDemo={true}
                autoSpeed={0.5}
                autoIntensity={2.0}
                resolution={0.5}
                mouseForce={20}
                cursorSize={100}
                style={{ width: '100%', height: '100%' }}
              />
            </ErrorBoundary>
          </Suspense>
        )}
      </div>

      {/* Content Layer */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}

// 간단한 에러 바운더리
interface ErrorBoundaryProps {
  children: ReactNode
  onError?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error('LiquidEther Error:', error)
    this.props.onError?.()
  }

  render() {
    if (this.state.hasError) {
      return null
    }
    return this.props.children
  }
}
