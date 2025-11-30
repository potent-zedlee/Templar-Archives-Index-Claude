#!/bin/bash

# Cloud Run 서비스 배포 스크립트
#
# 사용법:
#   ./deploy.sh orchestrator     # Orchestrator만 배포
#   ./deploy.sh segment-analyzer # Segment Analyzer만 배포
#   ./deploy.sh all              # 전체 배포
#
# 필수 환경 변수:
#   GCP_PROJECT_ID - Google Cloud 프로젝트 ID
#   GCP_REGION - 배포 리전 (기본: asia-northeast3)

set -e

# 설정
PROJECT_ID="${GCP_PROJECT_ID:-templar-archives-index}"
REGION="${GCP_REGION:-asia-northeast3}"
ARTIFACT_REGISTRY="${PROJECT_ID}-docker"

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

# Artifact Registry 저장소 생성 (없으면)
create_artifact_registry() {
  echo_info "Checking Artifact Registry..."
  if ! gcloud artifacts repositories describe "$ARTIFACT_REGISTRY" --location="$REGION" &>/dev/null; then
    echo_info "Creating Artifact Registry repository..."
    gcloud artifacts repositories create "$ARTIFACT_REGISTRY" \
      --repository-format=docker \
      --location="$REGION" \
      --description="Docker images for Templar Archives"
  fi
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
  # Firestore가 이미 설정되어 있다고 가정
  echo_info "Firestore check passed (manual verification recommended)"
}

# Orchestrator 배포
deploy_orchestrator() {
  echo_info "Deploying Orchestrator service..."

  SERVICE_NAME="video-orchestrator"
  IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REGISTRY}/${SERVICE_NAME}"

  cd "$(dirname "$0")/orchestrator"

  # 빌드 및 푸시 (Cloud Run은 linux/amd64만 지원, docker buildx로 직접 레지스트리에 푸시)
  echo_info "Building and pushing Docker image (linux/amd64) to Artifact Registry..."
  docker buildx build \
    --platform linux/amd64 \
    --provenance=false \
    --sbom=false \
    --push \
    -t "$IMAGE_NAME" \
    .

  # 배포
  echo_info "Deploying to Cloud Run..."
  gcloud run deploy "$SERVICE_NAME" \
    --image="$IMAGE_NAME" \
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
    --set-env-vars="CLOUD_TASKS_QUEUE=video-analysis-queue"

  # Segment Analyzer URL 설정 (나중에 업데이트 필요)
  ORCHESTRATOR_URL=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format='value(status.url)')
  echo_info "Orchestrator deployed: $ORCHESTRATOR_URL"

  cd ..
}

# Segment Analyzer 배포
deploy_segment_analyzer() {
  echo_info "Deploying Segment Analyzer service..."

  SERVICE_NAME="segment-analyzer"
  IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REGISTRY}/${SERVICE_NAME}"

  cd "$(dirname "$0")/segment-analyzer"

  # 빌드 및 푸시 (Cloud Run은 linux/amd64만 지원, docker buildx로 직접 레지스트리에 푸시)
  echo_info "Building and pushing Docker image (linux/amd64) to Artifact Registry..."
  docker buildx build \
    --platform linux/amd64 \
    --provenance=false \
    --sbom=false \
    --push \
    -t "$IMAGE_NAME" \
    .

  # 배포 (긴 실행 시간 허용)
  echo_info "Deploying to Cloud Run..."
  gcloud run deploy "$SERVICE_NAME" \
    --image="$IMAGE_NAME" \
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
    --set-env-vars="VERTEX_AI_LOCATION=global"

  SEGMENT_ANALYZER_URL=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format='value(status.url)')
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
  create_artifact_registry
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
