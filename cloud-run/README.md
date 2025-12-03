# Cloud Run 영상 분석 서비스

Google Cloud Run 기반 영상 분석 파이프라인입니다.

## 아키텍처

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   Frontend      │────▶│  Orchestrator   │────▶│  Cloud Tasks    │
│   (Next.js)     │     │  (Cloud Run)    │     │                 │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                              │                         │
                              │                         ▼
                              │                ┌─────────────────┐
                              │                │                 │
                              ▼                │ Segment Analyzer│
                       ┌─────────────────┐     │  (Cloud Run)    │
                       │                 │     │                 │
                       │   Firestore     │◀────│  - FFmpeg       │
                       │   (상태 저장)    │     │  - Vertex AI    │
                       │                 │     │  - Firestore    │
                       └─────────────────┘     └─────────────────┘
```

## 폴더 구조

```
cloud-run/
├── orchestrator/          # Orchestrator 서비스
│   ├── src/
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   └── .gcloudignore
│
├── segment-analyzer/      # Segment Analyzer 서비스
│   ├── src/
│   ├── Dockerfile         # Multi-stage (FFmpeg 포함)
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   └── .gcloudignore
│
└── deploy.sh              # 배포 스크립트
```

## 서비스 구성

### 1. Orchestrator (`/orchestrator`)

분석 요청을 받아 세그먼트로 분할하고 Cloud Tasks에 큐잉하는 서비스입니다.

**빌드 방식**: Google Cloud Buildpack (Dockerfile 없음)

**엔드포인트:**
- `POST /analyze` - 분석 시작
- `GET /status/:jobId` - 작업 상태 조회

**환경 변수:**
```bash
GOOGLE_CLOUD_PROJECT=your-project-id
FIRESTORE_COLLECTION=analysisJobs
CLOUD_TASKS_LOCATION=asia-northeast3
CLOUD_TASKS_QUEUE=video-analysis-queue
SEGMENT_ANALYZER_URL=https://segment-analyzer-xxx.run.app
SERVICE_ACCOUNT_EMAIL=xxx@project.iam.gserviceaccount.com
```

### 2. Segment Analyzer (`/segment-analyzer`)

개별 세그먼트를 분석하는 서비스입니다.

**빌드 방식**: Multi-stage Dockerfile (FFmpeg 필수)

**Dockerfile 특징:**
- Stage 1: Node.js 빌드 (builder)
- Stage 2: Production (FFmpeg + node_modules --omit=dev)
- `npm ci` 사용으로 버전 일관성 보장

**기능:**
- FFmpeg로 세그먼트 추출
- Vertex AI Gemini로 영상 분석
- Firestore에 핸드 저장
- Firestore 진행 상황 업데이트

**환경 변수:**
```bash
GOOGLE_CLOUD_PROJECT=your-project-id
GCP_PROJECT_ID=your-project-id
FIRESTORE_COLLECTION=analysisJobs
GCS_BUCKET_NAME=templar-archives-videos
VERTEX_AI_LOCATION=global
ORCHESTRATOR_URL=https://video-orchestrator-xxx.run.app
```

## 배포

### 배포 명령

```bash
# 전체 배포
cd cloud-run
chmod +x deploy.sh
./deploy.sh all

# 개별 배포
./deploy.sh orchestrator
./deploy.sh segment-analyzer
```

### 배포 방식: `gcloud run deploy --source`

**Cloud Build에서 서버 빌드** (로컬 Docker 빌드 아님)

```bash
# ✅ 올바른 방법 (deploy.sh가 사용하는 방식)
gcloud run deploy SERVICE_NAME --source=. --region=asia-northeast3 ...

# ❌ 금지 - OCI 매니페스트 형식 문제 발생
docker build --platform linux/amd64 ...
docker buildx build --platform linux/amd64 --push ...
```

**장점:**
- Apple Silicon Mac에서도 플랫폼 문제 없음
- 로컬 Docker 설치 불필요
- Cloud Build 캐시 자동 관리

### 하이브리드 빌드 전략

| 서비스 | 빌드 방식 | 이유 |
|--------|----------|------|
| **orchestrator** | Buildpack | FFmpeg 불필요, 간단 |
| **segment-analyzer** | Dockerfile | FFmpeg 필수 |

## 로컬 개발

```bash
# Orchestrator
cd orchestrator
npm install
npm run dev

# Segment Analyzer
cd segment-analyzer
npm install
npm run dev
```

## 비용 최적화

### Cloud Run 설정

- Orchestrator: 낮은 메모리 (512Mi), 짧은 타임아웃 (60s)
- Segment Analyzer: 높은 메모리 (2Gi), 긴 타임아웃 (3600s)

### Cloud Tasks 설정

- 동시 실행 제한: 10개
- 세그먼트 간 지연: 2초
- 최대 재시도: 3회

## 문제 해결

### 세그먼트 분석 실패

1. Cloud Run 로그 확인:
   ```bash
   gcloud run services logs read segment-analyzer --region=asia-northeast3
   ```

2. Firestore에서 작업 상태 확인

3. GCS 권한 확인

### Vertex AI 에러

1. 서비스 계정 권한 확인 (Vertex AI User)
2. 리전 설정 확인 (global 권장)
3. 모델 할당량 확인

### 캐시 문제로 이전 코드 배포됨

1. package-lock.json 변경 확인
2. `--no-cache` 옵션으로 강제 새 빌드:
   ```bash
   gcloud builds submit --no-cache --source=. ...
   ```

## 정리된 파일들 (참고용)

### 2025-12-03 정리

다음 미사용 파일들이 삭제되었습니다:
- `cloud-run/Dockerfile` - 미사용 (각 서비스 디렉토리에 개별 Dockerfile)
- `cloud-run/package.json` - 미사용
- `cloud-run/cloudbuild.yaml` - 미사용
- `cloud-run/cloudbuild-orchestrator.yaml` - 미사용
- `cloud-run/cloudbuild-segment-analyzer.yaml` - 미사용
- `cloud-run/src/` - 미사용 레거시 코드
- `cloud-run/orchestrator/Dockerfile` - Buildpack 전환으로 삭제
- `cloud-run/segment-analyzer/cloudbuild.yaml` - 미사용

## 관련 문서

- [Google Cloud Run](https://cloud.google.com/run)
- [Google Cloud Tasks](https://cloud.google.com/tasks)
- [Vertex AI Gemini](https://cloud.google.com/vertex-ai/docs/generative-ai)
- [Firebase Firestore](https://firebase.google.com/docs/firestore)
- [Cloud Run 소스 배포](https://cloud.google.com/run/docs/deploying-source-code)

---

**마지막 업데이트**: 2025-12-03
**변경 사항**: 배포 아키텍처 최적화 (Buildpack + Multi-stage Dockerfile 하이브리드)
