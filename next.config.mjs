import withBundleAnalyzer from '@next/bundle-analyzer'

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Specify the workspace root to silence warnings
  output: 'standalone',
  outputFileTracingRoot: import.meta.dirname,
  typescript: {
    ignoreBuildErrors: false,
  },
  // React 19 Compiler - 자동 메모이제이션 (useMemo/useCallback 불필요)
  reactCompiler: true,
  // Empty turbopack config to silence webpack/turbopack conflict warning
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (isServer) {
      // FFmpeg 바이너리를 번들에서 제외
      config.externals = config.externals || []
      config.externals.push({
        'fluent-ffmpeg': 'commonjs fluent-ffmpeg',
        '@ffmpeg-installer/ffmpeg': 'commonjs @ffmpeg-installer/ffmpeg',
      })
    }
    return config
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  async headers() {
    return [
      {
        // Security headers for all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY', // Prevent clickjacking attacks
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff', // Prevent MIME type sniffing
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin', // Control referrer information
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()', // Restrict browser features
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block', // Enable XSS filter
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com https://www.youtube.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://api.anthropic.com https://storage.googleapis.com https://firebasestorage.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://firestore.googleapis.com",
              "media-src 'self' https: blob:",
              "worker-src 'self' blob:",
              "frame-src 'self' https://www.youtube.com https://accounts.google.com https://*.firebaseapp.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests"
            ].join('; ')
          },
        ],
      },
      {
        // CORS headers for API routes
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ]
  },
  async redirects() {
    return [
      {
        source: '/analyze',
        destination: '/admin/kan/new',
        permanent: true,
      },
      {
        source: '/analyze/:path*',
        destination: '/admin/kan/:path*',
        permanent: true,
      },
      {
        source: '/hae',
        destination: '/admin/kan/new',
        permanent: true,
      },
      {
        source: '/hae/:path*',
        destination: '/admin/kan/:path*',
        permanent: true,
      },
      // API 라우트 하위 호환성
      {
        source: '/api/hae/:path*',
        destination: '/api/kan/:path*',
        permanent: true,
      },
    ]
  },
}

export default bundleAnalyzer(nextConfig)
