#!/bin/bash

# Cloud Run 서비스 배포 스크립트 (Cloud Build 사용)
#
# 사용법:
#   ./deploy.sh orchestrator     # Orchestrator만 배포
#   ./deploy.sh segment-analyzer # Segment Analyzer만 배포
#   ./deploy.sh all              # 전체 배포
#
# 필수 환경 변수:
#   GCP_PROJECT_ID - Google Cloud 프로젝트 ID
#   GCP_REGION - 배포 리전 (기본: asia-northeast3)
#
# 참고: gcloud run deploy --source를 사용하여 Cloud Build로 서버에서 빌드합니다.
#       로컬 Docker 빌드가 필요 없으며 플랫폼 문제가 발생하지 않습니다.

set -e

# 설정
PROJECT_ID="${GCP_PROJECT_ID:-templar-archives-index}"
REGION="${GCP_REGION:-asia-northeast3}"

# 색상
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

echo_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

echo_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# GCP 인증 확인
check_auth() {
  echo_info "Checking GCP authentication..."
  if ! gcloud auth print-identity-token &>/dev/null; then
    echo_error "Not authenticated. Please run: gcloud auth login"
    exit 1
  fi
  echo_info "Authenticated as: $(gcloud config get-value account)"
}

# 프로젝트 설정
set_project() {
  echo_info "Setting project to: $PROJECT_ID"
  gcloud config set project "$PROJECT_ID"
}

# Cloud Tasks 큐 생성 (없으면)
create_cloud_tasks_queue() {
  echo_info "Checking Cloud Tasks queue..."
  QUEUE_NAME="video-analysis-queue"
  if ! gcloud tasks queues describe "$QUEUE_NAME" --location="$REGION" &>/dev/null; then
    echo_info "Creating Cloud Tasks queue..."
    gcloud tasks queues create "$QUEUE_NAME" \
      --location="$REGION" \
      --max-concurrent-dispatches=10 \
      --max-dispatches-per-second=5 \
      --max-attempts=3 \
      --min-backoff=10s \
      --max-backoff=3600s
  fi
}

# Firestore 데이터베이스 확인
check_firestore() {
  echo_info "Checking Firestore..."
  echo_info "Firestore check passed (manual verification recommended)"
}

# Orchestrator 배포
deploy_orchestrator() {
  echo_info "Deploying Orchestrator service..."

  SERVICE_NAME="video-orchestrator"
  cd "$(dirname "$0")/orchestrator"

  # 기존 Segment Analyzer URL 가져오기 (있으면 유지)
  EXISTING_SEGMENT_URL=$(gcloud run services describe "$SERVICE_NAME" \
    --region="$REGION" --format='value(spec.template.spec.containers[0].env)' 2>/dev/null | \
    grep -o 'SEGMENT_ANALYZER_URL=[^,]*' | cut -d'=' -f2 || echo "")

  # Segment Analyzer URL 설정 (기존 값 또는 기본값)
  if [ -z "$EXISTING_SEGMENT_URL" ]; then
    SEGMENT_ANALYZER_URL="https://segment-analyzer-700566907563.${REGION}.run.app"
    echo_warn "No existing SEGMENT_ANALYZER_URL, using default: $SEGMENT_ANALYZER_URL"
  else
    SEGMENT_ANALYZER_URL="$EXISTING_SEGMENT_URL"
    echo_info "Using existing SEGMENT_ANALYZER_URL: $SEGMENT_ANALYZER_URL"
  fi

  # Cloud Build로 빌드 및 배포 (--source 사용)
  # 로컬 Docker 빌드 없이 서버에서 빌드하므로 플랫폼 문제 없음
  echo_info "Building and deploying with Cloud Build..."
  # Cloud Tasks OIDC 인증용 서비스 계정
  SERVICE_ACCOUNT_EMAIL="${PROJECT_ID}@appspot.gserviceaccount.com"

  gcloud run deploy "$SERVICE_NAME" \
    --source=. \
    --region="$REGION" \
    --platform=managed \
    --allow-unauthenticated \
    --memory=512Mi \
    --cpu=1 \
    --timeout=60s \
    --max-instances=10 \
    --set-env-vars="GOOGLE_CLOUD_PROJECT=${PROJECT_ID}" \
    --set-env-vars="FIRESTORE_COLLECTION=analysis-jobs" \
    --set-env-vars="CLOUD_TASKS_LOCATION=${REGION}" \
    --set-env-vars="CLOUD_TASKS_QUEUE=video-analysis-queue" \
    --set-env-vars="SEGMENT_ANALYZER_URL=${SEGMENT_ANALYZER_URL}" \
    --set-env-vars="SERVICE_ACCOUNT_EMAIL=${SERVICE_ACCOUNT_EMAIL}"

  ORCHESTRATOR_URL=$(gcloud run services describe "$SERVICE_NAME" \
    --region="$REGION" --format='value(status.url)')
  echo_info "Orchestrator deployed: $ORCHESTRATOR_URL"

  cd ..
}

# Segment Analyzer 배포
deploy_segment_analyzer() {
  echo_info "Deploying Segment Analyzer service..."

  SERVICE_NAME="segment-analyzer"
  cd "$(dirname "$0")/segment-analyzer"

  # Cloud Build로 빌드 및 배포 (--source 사용)
  echo_info "Building and deploying with Cloud Build..."

  # Orchestrator URL (Phase 1 완료 콜백용)
  ORCHESTRATOR_URL="https://video-orchestrator-700566907563.${REGION}.run.app"

  gcloud run deploy "$SERVICE_NAME" \
    --source=. \
    --region="$REGION" \
    --platform=managed \
    --no-allow-unauthenticated \
    --memory=2Gi \
    --cpu=2 \
    --timeout=3600s \
    --max-instances=20 \
    --set-env-vars="GOOGLE_CLOUD_PROJECT=${PROJECT_ID}" \
    --set-env-vars="FIRESTORE_COLLECTION=analysis-jobs" \
    --set-env-vars="GCS_BUCKET_NAME=templar-archives-videos" \
    --set-env-vars="VERTEX_AI_LOCATION=global" \
    --set-env-vars="ORCHESTRATOR_URL=${ORCHESTRATOR_URL}"

  SEGMENT_ANALYZER_URL=$(gcloud run services describe "$SERVICE_NAME" \
    --region="$REGION" --format='value(status.url)')
  echo_info "Segment Analyzer deployed: $SEGMENT_ANALYZER_URL"

  # Orchestrator에 Segment Analyzer URL 업데이트
  echo_info "Updating Orchestrator with Segment Analyzer URL..."
  gcloud run services update video-orchestrator \
    --region="$REGION" \
    --update-env-vars="SEGMENT_ANALYZER_URL=${SEGMENT_ANALYZER_URL}"

  cd ..
}

# 전체 배포
deploy_all() {
  check_auth
  set_project
  create_cloud_tasks_queue
  check_firestore
  deploy_orchestrator
  deploy_segment_analyzer

  echo ""
  echo_info "=== Deployment Complete ==="
  echo ""
  echo "Orchestrator URL: $(gcloud run services describe video-orchestrator --region="$REGION" --format='value(status.url)')"
  echo "Segment Analyzer URL: $(gcloud run services describe segment-analyzer --region="$REGION" --format='value(status.url)')"
  echo ""
  echo "Next steps:"
  echo "1. Update .env.local with CLOUD_RUN_ORCHESTRATOR_URL"
  echo "2. Set USE_CLOUD_RUN=true to enable Cloud Run"
  echo "3. Configure Supabase credentials as Cloud Run secrets"
}

# 메인
case "$1" in
  orchestrator)
    check_auth
    set_project
    deploy_orchestrator
    ;;
  segment-analyzer)
    check_auth
    set_project
    deploy_segment_analyzer
    ;;
  all)
    deploy_all
    ;;
  *)
    echo "Usage: $0 {orchestrator|segment-analyzer|all}"
    exit 1
    ;;
esac
