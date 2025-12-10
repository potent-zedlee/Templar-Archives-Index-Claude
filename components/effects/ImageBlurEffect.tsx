'use client'

import { useRef, useEffect, useState, ReactNode } from 'react'

interface ImageBlurEffectProps {
  children: ReactNode
  /** 기본 blur 값 (마우스가 멀리 있을 때) */
  baseBlur?: number
  className?: string
}

/**
 * 마우스가 요소 위에 올라가면 선명해지고, 벗어나면 흐려지는 효과
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
        filter: isHovered ? 'blur(0px)' : `blur(${baseBlur}px)`,
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
