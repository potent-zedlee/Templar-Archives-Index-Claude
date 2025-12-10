'use client'

import { useRef, useEffect, useState, ReactNode } from 'react'

interface ImageBlurEffectProps {
  children: ReactNode
  /** 기본 blur 값 (마우스가 멀리 있을 때) */
  baseBlur?: number
  className?: string
}

/**
 * 기본은 선명, 마우스 hover 시 흐려지는 효과
 */
export function ImageBlurEffect({
  children,
  baseBlur = 5,
  className = '',
}: ImageBlurEffectProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        filter: isHovered ? `blur(${baseBlur}px)` : 'blur(0px)',
        transition: 'filter 0.3s ease-out',
        cursor: 'pointer',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </div>
  )
}
