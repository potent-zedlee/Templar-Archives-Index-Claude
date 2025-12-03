# Segment Analyzer Service Dockerfile
# Multi-stage build for optimized image size
# FFmpeg 포함 Node.js 환경

# ===== Stage 1: Build =====
FROM node:22-slim AS builder

WORKDIR /app

# 패키지 파일 복사 (캐시 최적화)
COPY package.json package-lock.json ./

# 의존성 설치 (lock 파일 사용으로 버전 일관성 보장)
RUN npm ci

# 소스 복사 및 빌드
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ===== Stage 2: Production =====
FROM node:22-slim

# FFmpeg 설치 (segment-analyzer 필수)
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 프로덕션 의존성만 설치
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# 빌드된 파일 복사 (builder 스테이지에서)
COPY --from=builder /app/dist ./dist

# 환경 설정
ENV NODE_ENV=production
ENV PORT=8080
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV FFPROBE_PATH=/usr/bin/ffprobe

EXPOSE 8080
CMD ["node", "dist/index.js"]
