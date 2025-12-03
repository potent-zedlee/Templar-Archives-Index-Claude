# Segment Analyzer Service Dockerfile
# FFmpeg 포함 Node.js 환경
# Updated: 2025-12-03 - Fix TypeScript build v2

FROM node:22-slim

# 캐시 무효화용 ARG (빌드 시 자동으로 다른 값이 들어감)
ARG CACHEBUST=1

# FFmpeg 설치
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# 작업 디렉토리
WORKDIR /app

# 패키지 파일 복사
COPY package*.json ./

# 전체 의존성 설치 (빌드용 devDependencies 포함)
# --include=dev 옵션으로 TypeScript 포함 보장
RUN npm install --include=dev

# 소스 코드 복사
COPY tsconfig.json ./
COPY src ./src

# TypeScript 빌드
RUN npm run build

# 프로덕션 의존성만 남기기
RUN npm prune --omit=dev

# 환경 변수
ENV NODE_ENV=production
ENV PORT=8080
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV FFPROBE_PATH=/usr/bin/ffprobe

# 포트 노출
EXPOSE 8080

# 서버 시작
CMD ["node", "dist/index.js"]
