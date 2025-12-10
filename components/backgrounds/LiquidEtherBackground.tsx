'use client'

import dynamic from 'next/dynamic'

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
 */
export function LiquidEtherBackground({
  children,
  colors = ['#5227FF', '#FF9FFC', '#B19EEF'],
  className = '',
}: LiquidEtherBackgroundProps) {
  return (
    <div className={`relative min-h-screen ${className}`}>
      {/* Background Layer */}
      <div className="fixed inset-0 z-0 pointer-events-auto">
        <LiquidEther
          colors={colors}
          autoDemo={true}
          autoSpeed={0.3}
          autoIntensity={1.5}
          resolution={0.4}
          mouseForce={15}
          cursorSize={80}
        />
      </div>

      {/* Content Layer */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}
