'use client'

import dynamic from 'next/dynamic'
import { Suspense, useState, useSyncExternalStore, useCallback } from 'react'
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

// WebGL 지원 여부를 한 번만 체크
function checkWebGLSupport(): boolean {
  if (typeof window === 'undefined') return true // SSR에서는 true 반환
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    return !!gl
  } catch {
    return false
  }
}

// 캐시된 WebGL 지원 여부
let cachedWebGLSupport: boolean | null = null

function getWebGLSupport(): boolean {
  if (cachedWebGLSupport === null) {
    cachedWebGLSupport = checkWebGLSupport()
  }
  return cachedWebGLSupport
}

// SSR용 subscribe (no-op)
const subscribeNoop = () => () => {}

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
  const [hasError, setHasError] = useState(false)

  // useSyncExternalStore로 hydration mismatch 방지
  const isWebGLSupported = useSyncExternalStore(
    subscribeNoop,
    getWebGLSupport,
    () => true // SSR에서는 true
  )

  const handleError = useCallback(() => {
    setHasError(true)
  }, [])

  // WebGL 미지원 또는 에러 시 fallback
  if (!isWebGLSupported || hasError) {
    return (
      <div className={`relative min-h-screen ${className}`}>
        {children}
      </div>
    )
  }

  return (
    <div className={`relative min-h-screen ${className}`}>
      {/* Background Layer */}
      <div className="fixed inset-0 z-0" style={{ width: '100vw', height: '100vh' }}>
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
              className="!pointer-events-auto"
              style={{ width: '100%', height: '100%' }}
            />
          </ErrorBoundary>
        </Suspense>
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
