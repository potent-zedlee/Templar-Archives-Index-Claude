# Templar Archives 배포 가이드

**마지막 업데이트**: 2025-12-01

---

## 프로덕션 URL

| 환경 | URL | 배포 시간 |
|------|-----|----------|
| **Vercel (메인)** | https://templar-archives-index.vercel.app | ~1분 |
| **Firebase (백업)** | https://templar-archives-index.web.app | ~5분 |

---

## 자동 배포

`main` 브랜치에 push하면 **둘 다 자동 배포**됩니다:

```
Git Push (main)
    ├── Vercel: 자동 빌드 (~1분)
    └── Firebase: GitHub Actions (~5분)
```

---

## 배포 전 체크리스트

- [ ] GitHub 계정 (https://github.com)
- [ ] Vercel 계정 (https://vercel.com)
- [ ] Firebase 프로젝트 (https://console.firebase.google.com)
- [ ] GCP 프로젝트 (https://console.cloud.google.com)
- [ ] Google API Key (Gemini AI용)

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
| `GOOGLE_API_KEY` | Gemini AI API 키 | https://aistudio.google.com/app/apikey |
| `CLOUD_RUN_ORCHESTRATOR_URL` | Cloud Run Orchestrator URL | GCP Console → Cloud Run |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | Server Actions 암호화 키 | `openssl rand -base64 32` |

---

## 2단계: Vercel 설정 (메인 배포)

### 2.1 Vercel 프로젝트 연결

```bash
npx vercel link
```

### 2.2 환경 변수 추가

```bash
# 예시
printf "value" | npx vercel env add VARIABLE_NAME production
```

또는 Vercel 대시보드에서 직접 추가:
https://vercel.com/[team]/templar-archives/settings/environment-variables

### 2.3 GitHub 연동

Vercel은 GitHub과 직접 연동되어 push 시 자동 배포됩니다.

---

## 3단계: Firebase 설정 (백업 배포)

### 3.1 Firebase 프로젝트 생성

1. https://console.firebase.google.com 접속
2. 새 프로젝트 생성
3. Firestore Database 활성화
4. Authentication 활성화 (Google Provider)
5. Storage 활성화

### 3.2 Firebase Auth 도메인 추가

Firebase Console → Authentication → Settings → Authorized domains:
- `templar-archives-index.vercel.app`
- `templar-archives-index.web.app`

### 3.3 GitHub Secrets 설정

Repository Settings → Secrets and variables → Actions에서 추가:

```
GOOGLE_APPLICATION_CREDENTIALS=<서비스 계정 JSON>
FIREBASE_TOKEN=<Firebase CLI 토큰>
NEXT_PUBLIC_FIREBASE_API_KEY=<API 키>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<인증 도메인>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<프로젝트 ID>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<스토리지 버킷>
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<메시징 ID>
NEXT_PUBLIC_FIREBASE_APP_ID=<앱 ID>
CLOUD_RUN_ORCHESTRATOR_URL=<Cloud Run URL>
GOOGLE_API_KEY=<Gemini API 키>
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=<암호화 키>
```

---

## 4단계: Cloud Run 설정 (영상 분석)

### 4.1 Cloud Run 서비스 배포

```bash
# 전체 배포 (권장)
cd cloud-run && ./deploy.sh all

# 개별 배포
cd cloud-run && ./deploy.sh orchestrator      # Orchestrator만
cd cloud-run && ./deploy.sh segment-analyzer  # Segment Analyzer만
```

### 4.2 Cloud Build 사용 (권장)

deploy.sh는 `gcloud run deploy --source` 명령을 사용하여 **Cloud Build**에서 서버 빌드를 수행합니다.

**장점:**
- 로컬 Docker 설치 불필요
- Apple Silicon Mac에서도 플랫폼 문제 없음

### 4.3 Cloud Tasks 큐 생성

```bash
gcloud tasks queues create video-analysis-queue --location=asia-northeast3
```

---

## 5단계: 배포 확인

### 확인 항목

- [ ] 홈페이지 로딩
- [ ] Firebase 연결 (Archive 페이지 데이터 표시)
- [ ] 사용자 인증 (Google 로그인)
- [ ] 영상 분석 (Cloud Run 작동)

### 로그 확인

```bash
# Vercel 로그
npx vercel logs [deployment-url]

# GitHub Actions 로그
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

### Firebase 인증 에러 (auth/unauthorized-domain)

Firebase Console → Authentication → Settings → Authorized domains에 배포 도메인 추가

### Cloud Run 연결 실패

1. `CLOUD_RUN_ORCHESTRATOR_URL` 환경 변수 확인
2. Cloud Run 서비스 상태 확인
3. IAM 권한 확인 (Cloud Run Invoker)

---

## 참고 문서

- [Vercel 문서](https://vercel.com/docs)
- [Firebase Hosting 문서](https://firebase.google.com/docs/hosting)
- [Cloud Run 문서](https://cloud.google.com/run/docs)
- [CLAUDE.md](../CLAUDE.md) - 프로젝트 개발 가이드
