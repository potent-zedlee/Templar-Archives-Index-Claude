/**
 * 업로드 관련 공유 상수
 *
 * GCS Resumable Upload 설정
 * - 모든 업로드 관련 컴포넌트에서 동일한 값 사용
 */

/**
 * 청크 크기 (16MB)
 * - HTTP 오버헤드 감소로 속도 향상
 * - GCS Resumable Upload 권장 범위: 5MB ~ 16MB
 */
export const CHUNK_SIZE = 16 * 1024 * 1024 // 16MB

/**
 * 동시 업로드 파일 수 (3개)
 * - 대역폭 활용 최적화
 * - GCS는 단일 파일 내 병렬 청크 업로드를 지원하지 않으므로
 *   여러 파일을 동시에 업로드하여 대역폭 활용
 */
export const MAX_CONCURRENT_UPLOADS = 3

/**
 * 업로드 재시도 횟수
 */
export const MAX_UPLOAD_RETRIES = 3

/**
 * 재시도 지연 시간 (ms)
 */
export const RETRY_DELAY_MS = 1000

/**
 * 업로드 스테일 타임아웃 (24시간)
 * - 이 시간 이상 지난 'uploading' 상태는 리셋 가능
 */
export const UPLOAD_STALE_TIMEOUT_MS = 24 * 60 * 60 * 1000 // 24 hours
