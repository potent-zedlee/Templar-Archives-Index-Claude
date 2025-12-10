'use client'

import { useRef, useEffect, useState, ReactNode } from 'react'

interface ImageBlurEffectProps {
  children: ReactNode
  /** 최대 blur 강도 (px) */
  maxBlur?: number
  /** blur 영향 반경 (px) - 마우스에서 이 거리 내에 있으면 blur 감소 */
  radius?: number
  /** 기본 blur 값 (마우스가 멀리 있을 때) */
  baseBlur?: number
  className?: string
}

/**
 * 마우스 위치에 따라 자식 요소에 동적 blur 효과를 적용합니다.
 * 마우스가 가까워지면 blur가 감소하고, 멀어지면 blur가 증가합니다.
 */
export function ImageBlurEffect({
  children,
  maxBlur = 8,
  radius = 200,
  baseBlur = 6,
  className = '',
}: ImageBlurEffectProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [blur, setBlur] = useState(baseBlur)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let rafId: number

    const handleMouseMove = (e: MouseEvent) => {
      if (!container) return

      // 애니메이션 프레임으로 성능 최적화
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const rect = container.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2

        // 마우스와 중심 간의 거리 계산
        const distance = Math.sqrt(
          Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2)
        )

        // 거리에 따른 blur 계산 (가까울수록 blur 감소)
        if (distance < radius) {
          // 마우스가 반경 내에 있으면 blur 감소
          const blurAmount = (distance / radius) * maxBlur
          setBlur(Math.max(0, blurAmount))
        } else {
          // 반경 밖이면 기본 blur
          setBlur(baseBlur)
        }
      })
    }

    const handleMouseLeave = () => {
      // 마우스가 화면을 벗어나면 기본 blur로 복귀
      setBlur(baseBlur)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      cancelAnimationFrame(rafId)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [maxBlur, radius, baseBlur])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        filter: `blur(${blur}px)`,
        transition: 'filter 0.15s ease-out',
      }}
    >
      {children}
    </div>
  )
}
