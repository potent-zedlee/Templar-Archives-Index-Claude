/**
 * LogoShapeBlur - WebGL 기반 로고 blur 효과
 * 마우스 커서 주변만 선명하고 나머지는 흐린 효과
 * React Bits ShapeBlur 스타일 구현
 */

/* eslint-disable react-hooks/exhaustive-deps */
'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'

interface LogoShapeBlurProps {
  /** 로고 이미지 경로 */
  src: string
  /** 로고 alt 텍스트 */
  alt: string
  /** 선명한 영역 크기 (0-1) */
  focusSize?: number
  /** 선명한 영역 가장자리 부드러움 (0-1) */
  focusEdge?: number
  /** 최대 blur 강도 */
  blurAmount?: number
  className?: string
}

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = `
uniform sampler2D uTexture;
uniform vec2 uMouse;
uniform vec2 uResolution;
uniform float uFocusSize;
uniform float uFocusEdge;
uniform float uBlurAmount;
uniform float uTime;

varying vec2 vUv;

// 간단한 blur 샘플링
vec4 blur(sampler2D tex, vec2 uv, vec2 resolution, float amount) {
  vec4 color = vec4(0.0);
  vec2 off1 = vec2(1.3846153846) * amount / resolution;
  vec2 off2 = vec2(3.2307692308) * amount / resolution;

  color += texture2D(tex, uv) * 0.2270270270;
  color += texture2D(tex, uv + vec2(off1.x, 0.0)) * 0.3162162162;
  color += texture2D(tex, uv - vec2(off1.x, 0.0)) * 0.3162162162;
  color += texture2D(tex, uv + vec2(0.0, off1.y)) * 0.0702702703;
  color += texture2D(tex, uv - vec2(0.0, off1.y)) * 0.0702702703;

  return color;
}

void main() {
  // 마우스 위치를 UV 좌표로 변환
  vec2 mouseUV = uMouse / uResolution;
  mouseUV.y = 1.0 - mouseUV.y; // Y축 반전

  // 현재 픽셀과 마우스 사이의 거리
  float dist = distance(vUv, mouseUV);

  // 선명한 영역 계산 (마우스 주변)
  float focus = smoothstep(uFocusSize + uFocusEdge, uFocusSize, dist);

  // 선명한 버전과 흐린 버전 샘플링
  vec4 sharp = texture2D(uTexture, vUv);
  vec4 blurred = blur(uTexture, vUv, uResolution, uBlurAmount * (1.0 - focus));

  // 마우스 주변은 선명, 나머지는 흐림
  gl_FragColor = mix(blurred, sharp, focus);
}
`

export function LogoShapeBlur({
  src,
  alt,
  focusSize = 0.15,
  focusEdge = 0.1,
  blurAmount = 8.0,
  className = '',
}: LogoShapeBlurProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const materialRef = useRef<THREE.ShaderMaterial | null>(null)
  const mouseRef = useRef(new THREE.Vector2())
  const targetMouseRef = useRef(new THREE.Vector2())
  const sizeRef = useRef({ width: 0, height: 0 })

  const [isLoaded, setIsLoaded] = useState(false)
  const [hasWebGL, setHasWebGL] = useState(true)

  // 리사이즈 핸들러
  const handleResize = useCallback(() => {
    const container = containerRef.current
    const renderer = rendererRef.current
    const material = materialRef.current
    if (!container || !renderer || !material) return

    const width = container.clientWidth
    const height = container.clientHeight

    sizeRef.current = { width, height }
    renderer.setSize(width, height)
    material.uniforms.uResolution.value.set(width, height)

    // 마우스 초기 위치도 업데이트
    targetMouseRef.current.set(width / 2, height / 2)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // WebGL 지원 체크
    const testCanvas = document.createElement('canvas')
    const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl')
    if (!gl) {
      setHasWebGL(false)
      return
    }

    let animationFrameId: number
    let scene: THREE.Scene
    let camera: THREE.OrthographicCamera

    // 텍스처 로드
    const textureLoader = new THREE.TextureLoader()
    textureLoader.load(
      src,
      (texture) => {
        const width = container.clientWidth
        const height = container.clientHeight
        sizeRef.current = { width, height }

        // 텍스처 설정 - 고품질
        texture.minFilter = THREE.LinearFilter
        texture.magFilter = THREE.LinearFilter
        texture.anisotropy = 16

        // Scene 설정
        scene = new THREE.Scene()

        // 카메라 설정
        camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10)
        camera.position.z = 1

        // Renderer 설정
        const renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          premultipliedAlpha: false
        })
        renderer.setSize(width, height)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.setClearColor(0x000000, 0)
        container.appendChild(renderer.domElement)
        rendererRef.current = renderer

        // Material 설정
        const material = new THREE.ShaderMaterial({
          vertexShader,
          fragmentShader,
          uniforms: {
            uTexture: { value: texture },
            uMouse: { value: mouseRef.current },
            uResolution: { value: new THREE.Vector2(width, height) },
            uFocusSize: { value: focusSize },
            uFocusEdge: { value: focusEdge },
            uBlurAmount: { value: blurAmount },
            uTime: { value: 0 },
          },
          transparent: true,
        })
        materialRef.current = material

        // Mesh 생성
        const geometry = new THREE.PlaneGeometry(1, 1)
        const mesh = new THREE.Mesh(geometry, material)
        scene.add(mesh)

        // 초기 마우스 위치
        mouseRef.current.set(width / 2, height / 2)
        targetMouseRef.current.set(width / 2, height / 2)

        setIsLoaded(true)

        // 마우스 이벤트
        const handleMouseMove = (e: MouseEvent) => {
          const rect = container.getBoundingClientRect()
          targetMouseRef.current.x = e.clientX - rect.left
          targetMouseRef.current.y = e.clientY - rect.top
        }

        const handleMouseLeave = () => {
          targetMouseRef.current.x = sizeRef.current.width / 2
          targetMouseRef.current.y = sizeRef.current.height / 2
        }

        container.addEventListener('mousemove', handleMouseMove)
        container.addEventListener('mouseleave', handleMouseLeave)

        // ResizeObserver로 크기 변화 감지
        const resizeObserver = new ResizeObserver(handleResize)
        resizeObserver.observe(container)

        // 애니메이션 루프
        const animate = () => {
          // 부드러운 마우스 추적
          mouseRef.current.x += (targetMouseRef.current.x - mouseRef.current.x) * 0.1
          mouseRef.current.y += (targetMouseRef.current.y - mouseRef.current.y) * 0.1

          material.uniforms.uTime.value = performance.now() * 0.001

          renderer.render(scene, camera)
          animationFrameId = requestAnimationFrame(animate)
        }
        animate()

        // Cleanup 반환
        return () => {
          container.removeEventListener('mousemove', handleMouseMove)
          container.removeEventListener('mouseleave', handleMouseLeave)
          resizeObserver.disconnect()
        }
      },
      undefined,
      () => {
        setHasWebGL(false)
      }
    )

    return () => {
      cancelAnimationFrame(animationFrameId)
      if (rendererRef.current) {
        rendererRef.current.dispose()
        if (container.contains(rendererRef.current.domElement)) {
          container.removeChild(rendererRef.current.domElement)
        }
        rendererRef.current = null
      }
    }
  }, [src, focusSize, focusEdge, blurAmount, handleResize])

  // WebGL 미지원 시 일반 이미지로 fallback
  if (!hasWebGL) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={className}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    )
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        cursor: 'pointer',
      }}
      role="img"
      aria-label={alt}
    >
      {/* 로딩 전 placeholder */}
      {!isLoaded && (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        />
      )}
    </div>
  )
}
