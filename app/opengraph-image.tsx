import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Templar Archives Index - Poker Hand History Archive'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0a',
          backgroundImage: 'radial-gradient(circle at top, rgba(251, 191, 36, 0.15) 0%, transparent 50%)',
        }}
      >
        {/* Grid Pattern */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.1,
            backgroundImage: 'linear-gradient(rgba(251, 191, 36, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(251, 191, 36, 0.3) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />

        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 100,
            height: 100,
            borderRadius: 20,
            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
            marginBottom: 32,
          }}
        >
          <span
            style={{
              fontSize: 48,
              fontWeight: 'bold',
              color: '#0a0a0a',
            }}
          >
            TA
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <span
            style={{
              fontSize: 72,
              fontWeight: 'bold',
              color: '#fbbf24',
              letterSpacing: '-0.02em',
            }}
          >
            TEMPLAR
          </span>
          <span
            style={{
              fontSize: 72,
              fontWeight: 'bold',
              color: '#ffffff',
              letterSpacing: '-0.02em',
            }}
          >
            ARCHIVES
          </span>
        </div>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 28,
            color: '#a1a1aa',
            marginTop: 24,
            textAlign: 'center',
          }}
        >
          프로 포커 토너먼트의 모든 핸드 히스토리를 분석하고 학습하세요
        </p>

        {/* Feature Badges */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 16,
            marginTop: 48,
          }}
        >
          {['AI 영상 분석', 'GTO 분석', '실시간 통계'].map((feature) => (
            <div
              key={feature}
              style={{
                padding: '12px 24px',
                backgroundColor: 'rgba(251, 191, 36, 0.1)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                borderRadius: 999,
                fontSize: 18,
                color: '#fbbf24',
              }}
            >
              {feature}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
