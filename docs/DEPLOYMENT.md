# Templar Archives 배포 가이드

이 가이드는 Templar Archives를 Firebase Hosting을 통해 배포하는 방법을 설명합니다.

**마지막 업데이트**: 2025-11-30
**프로덕션 URL**: https://templar-archives-index.web.app

---

## 배포 전 체크리스트

- [ ] GitHub 계정 (https://github.com)
- [ ] Firebase 프로젝트 (https://console.firebase.google.com)
- [ ] GCP 프로젝트 (https://console.cloud.google.com)
- [ ] Google API Key (Gemini AI용)
- [ ] (선택) Anthropic API Key (자연어 검색용)

---

## 1단계: 환경 변수 준비

### 필수 환경 변수

| 변수명 | 설명 | 발급처 |
|--------|------|--------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API 키 | Firebase Console → Settings |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase 인증 도메인 | Firebase Console → Settings |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase 프로젝트 ID | Firebase Console → Settings |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage 버킷 | Firebase Console → Settings |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase 메시징 ID | Firebase Console → Settings |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase 앱 ID | Firebase Console → Settings |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Firebase Admin 비공개 키 | Firebase Console → Service Accounts |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Firebase Admin 클라이언트 이메일 | Firebase Console → Service Accounts |
| `GOOGLE_API_KEY` | Gemini AI API 키 | https://aistudio.google.com/app/apikey |
| `CLOUD_RUN_ORCHESTRATOR_URL` | Cloud Run Orchestrator URL | GCP Console → Cloud Run |

### 선택 환경 변수

| 변수명 | 설명 | 발급처 |
|--------|------|--------|
| `ANTHROPIC_API_KEY` | Claude API (자연어 검색) | https://console.anthropic.com |
| `UPSTASH_REDIS_REST_URL` | Rate Limiting | https://console.upstash.com |
| `UPSTASH_REDIS_REST_TOKEN` | Rate Limiting | https://console.upstash.com |

---

## 2단계: Firebase 설정

### 2.1 Firebase 프로젝트 생성

1. https://console.firebase.google.com 접속
2. 새 프로젝트 생성
3. Firestore Database 활성화
4. Authentication 활성화 (Google Provider)
5. Storage 활성화

### 2.2 Firebase Admin SDK 설정

1. Firebase Console → Project Settings → Service Accounts
2. "Generate new private key" 클릭
3. JSON 파일에서 `private_key`, `client_email` 추출

### 2.3 로컬 개발 설정

```bash
# Firebase 에뮬레이터 실행 (선택)
firebase emulators:start
```

---

## 3단계: Cloud Run 설정 (영상 분석)

### 3.1 Cloud Run 서비스 배포

```bash
# 전체 배포 (권장)
cd cloud-run && ./deploy.sh all

# 개별 배포
cd cloud-run && ./deploy.sh orchestrator      # Orchestrator만
cd cloud-run && ./deploy.sh segment-analyzer  # Segment Analyzer만
```

### 3.2 Cloud Build 사용 (권장)

deploy.sh는 `gcloud run deploy --source` 명령을 사용하여 **Cloud Build**에서 서버 빌드를 수행합니다.

**장점:**
- 로컬 Docker 설치 불필요
- Apple Silicon Mac에서도 플랫폼 문제 없음 (Cloud Build가 linux/amd64에서 빌드)
- Dockerfile이 있으면 자동으로 사용

**동작 방식:**
```bash
# deploy.sh 내부에서 실행되는 명령
gcloud run deploy SERVICE_NAME \
  --source=. \
  --region=asia-northeast3 \
  --platform=managed \
  ...
```

> 참고: [Cloud Run 소스 배포 공식 문서](https://cloud.google.com/run/docs/deploying-source-code)

### 3.3 Cloud Tasks 큐 생성

```bash
gcloud tasks queues create video-analysis-queue --location=asia-northeast3
```

---

## 4단계: GitHub Actions 자동 배포

### 4.1 GitHub Secrets 설정

Repository Settings → Secrets and variables → Actions에서 추가:

```
FIREBASE_SERVICE_ACCOUNT=<서비스 계정 JSON>
NEXT_PUBLIC_FIREBASE_API_KEY=<API 키>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<인증 도메인>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<프로젝트 ID>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<스토리지 버킷>
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<메시징 ID>
NEXT_PUBLIC_FIREBASE_APP_ID=<앱 ID>
CLOUD_RUN_ORCHESTRATOR_URL=<Cloud Run URL>
GOOGLE_API_KEY=<Gemini API 키>
```

### 4.2 자동 배포

GitHub main 브랜치에 push하면 자동으로 배포됩니다:

```bash
git add .
git commit -m "feat: 새 기능 추가"
git push origin main
# GitHub Actions가 자동으로 빌드 및 배포 (2-3분)
```

---

## 5단계: 수동 배포 (선택)

```bash
# 로컬에서 빌드
npm run build

# Firebase Hosting 배포
firebase deploy --only hosting
```

---

## 6단계: 배포 확인

### 확인 항목

- [ ] 홈페이지 로딩
- [ ] Firebase 연결 (Archive 페이지 데이터 표시)
- [ ] 사용자 인증 (Google 로그인)
- [ ] 영상 분석 (Cloud Run 작동)
- [ ] 자연어 검색 (선택)

### 로그 확인

- **GitHub Actions 로그**: GitHub → Actions → Workflow runs
- **Firebase Hosting 로그**: Firebase Console → Hosting
- **Cloud Run 로그**: GCP Console → Cloud Run → Logs

```bash
# CLI에서 확인
gh run list
gh run view <run-id> --log-failed

# Cloud Run 로그
gcloud run services logs read video-orchestrator --region=asia-northeast3
```

---

## 트러블슈팅

### 빌드 실패

```bash
# 로컬에서 빌드 테스트
npm run build
npx tsc --noEmit
```

### 환경 변수 오류

1. GitHub → Settings → Secrets and variables → Actions
2. 변수 확인 및 수정
3. Re-run workflow 실행

### Cloud Run 연결 실패

1. `CLOUD_RUN_ORCHESTRATOR_URL` 환경 변수 확인
2. Cloud Run 서비스 상태 확인
3. IAM 권한 확인 (Cloud Run Invoker)

### Firebase 인증 에러

- Firebase Console → Authentication에서 Google Provider 활성화 확인
- Authorized domains에 배포 도메인 추가

---

## 참고 문서

- [Firebase Hosting 문서](https://firebase.google.com/docs/hosting)
- [Next.js 문서](https://nextjs.org/docs)
- [Cloud Run 문서](https://cloud.google.com/run/docs)
- [CLAUDE.md](../CLAUDE.md) - 프로젝트 개발 가이드
