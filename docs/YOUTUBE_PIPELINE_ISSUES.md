# YouTube 분석 파이프라인 - 문서 vs 실제 코드 검증 결과

> **검증일**: 2025-12-11
> **대상 문서**: `docs/YOUTUBE_ANALYSIS_PIPELINE.md`
> **검증 결과**: 약 75% 일치, 일부 불일치 발견

---

## 1. 주요 불일치 사항

### 1.1 Phase 2 요청 파라미터 오류

**문서 내용** (`YOUTUBE_ANALYSIS_PIPELINE.md` 섹션 4.2):
```typescript
// 문서에서 설명한 Phase 2 요청
{
  type: 'youtube-phase2',
  gcsSegmentUri: segment.gcsSegmentUri,  // ❌ 잘못된 설명
  timestamps: [...],
}
```

**실제 코드** (`cloud-run/segment-analyzer/src/handlers/youtube-segment-handler.ts`):
```typescript
// 실제 Phase 2 요청
{
  type: 'youtube-phase2',
  youtubeUrl: segment.youtubeUrl,  // ✅ 실제로는 YouTube URL 직접 사용
  startTime: segment.startTime,
  endTime: segment.endTime,
  timestamps: phase1Results.timestamps,
}
```

**영향**: YouTube 분석은 GCS에 영상을 업로드하지 않고 YouTube URL을 직접 Gemini에 전달합니다. 문서가 GCS 업로드 방식과 혼동되어 있습니다.

---

### 1.2 누락된 필드들

#### Stream 컬렉션 누락 필드

| 필드명 | 타입 | 설명 | 문서 상태 |
|--------|------|------|----------|
| `pipelineProgress` | `number` | 0-100 진행률 | ❌ 누락 |
| `phase1CompletedAt` | `Timestamp` | Phase 1 완료 시각 | ❌ 누락 |
| `phase2CompletedAt` | `Timestamp` | Phase 2 완료 시각 | ❌ 누락 |
| `lastProgressUpdate` | `Timestamp` | 마지막 진행률 업데이트 | ❌ 누락 |

#### AnalysisJob 컬렉션 누락 필드

| 필드명 | 타입 | 설명 | 문서 상태 |
|--------|------|------|----------|
| `failedSegments` | `string[]` | 실패한 세그먼트 ID 목록 | ❌ 누락 |
| `retryCount` | `number` | 재시도 횟수 | ❌ 누락 |
| `lastError` | `string` | 마지막 에러 메시지 | ❌ 누락 |
| `completedSegmentIds` | `string[]` | 완료된 세그먼트 ID 목록 | ❌ 누락 |

---

### 1.3 완료 판단 로직 불일치

**문서 설명**:
```
완료 조건: completedSegments === totalSegments
```

**실제 코드** (`cloud-run/orchestrator/src/handlers/youtube-analyze.ts`):
```typescript
// 실제 완료 판단 로직
const isComplete =
  job.completedSegments >= job.totalSegments ||
  (job.completedSegments + job.failedSegments.length) >= job.totalSegments;

// failedSegments도 고려하여 완료 판단
if (job.failedSegments.length > 0) {
  job.status = 'partial';  // 일부 실패 상태
}
```

**영향**: 일부 세그먼트 실패 시에도 작업이 완료 처리될 수 있으며, `partial` 상태가 존재합니다.

---

### 1.4 Prompt 구조 불일치

**문서에서 설명한 Phase 1 프롬프트 위치**:
```
lib/ai/prompts.ts → getPlatformPrompt()
```

**실제 프롬프트 위치**:
```
cloud-run/segment-analyzer/src/lib/prompts/phase1-prompt.ts  // Phase 1
cloud-run/segment-analyzer/src/lib/prompts/phase2-prompt.ts  // Phase 2
```

**추가 발견**: 플랫폼별 프롬프트(EPT/Triton)는 `lib/ai/prompts.ts`에 있지만, Cloud Run에서 사용하는 분석 프롬프트는 `cloud-run/segment-analyzer/src/lib/prompts/` 디렉토리에 별도 관리됩니다.

---

## 2. 경미한 불일치 사항

### 2.1 세그먼트 오버랩 시간

**문서**: 5분 오버랩
**실제 코드**: 설정 가능 (기본값 5분, `SEGMENT_OVERLAP_MINUTES` 환경변수로 조정 가능)

### 2.2 배치 크기

**문서**: 최대 20개 타임스탬프/배치
**실제 코드**:
```typescript
const BATCH_SIZE = parseInt(process.env.PHASE2_BATCH_SIZE || '20');
```
환경변수로 조정 가능합니다.

### 2.3 재시도 로직

**문서**: Cloud Tasks 3회 재시도만 언급
**실제 코드**: 추가로 애플리케이션 레벨 재시도 로직 존재
```typescript
// cloud-run/segment-analyzer/src/lib/retry-utils.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  backoffMs: number = 1000
): Promise<T>
```

---

## 3. 문서에는 있지만 코드에 없는 내용

### 3.1 Self-Healing JSON 파싱

문서에서 자세히 설명했으나, 실제 구현 위치가 다릅니다:

**문서 설명 위치**: `lib/ai/json-parser.ts`
**실제 위치**: `cloud-run/segment-analyzer/src/lib/json-repair.ts`

### 3.2 비용 최적화 섹션

문서의 "7. 비용 최적화" 섹션에서 설명한 배치 처리 최적화 수치는 **예상치**입니다. 실제 모니터링 데이터와 비교 검증이 필요합니다.

---

## 4. 권장 수정 사항

### 4.1 즉시 수정 필요

1. **Phase 2 요청 파라미터 수정**
   - `gcsSegmentUri` → `youtubeUrl`로 문서 수정
   - YouTube 직접 분석과 GCS 업로드 방식의 차이점 명확히 구분

2. **완료 판단 로직 보완**
   - `failedSegments` 처리 로직 추가
   - `partial` 상태 설명 추가

### 4.2 문서 보완 필요

1. **누락 필드 추가**
   - Stream: `pipelineProgress`, Phase 완료 시각 필드들
   - AnalysisJob: `failedSegments`, `retryCount` 등

2. **프롬프트 파일 위치 정정**
   - Cloud Run 내부 프롬프트 파일 경로 명시

### 4.3 추가 문서화 권장

1. 에러 처리 및 재시도 전략 상세 문서화
2. 환경변수 설정 가이드 추가
3. 모니터링 및 디버깅 가이드 추가

---

## 5. 검증에 사용된 주요 파일

| 파일 경로 | 검증 항목 |
|----------|----------|
| `cloud-run/orchestrator/src/handlers/youtube-analyze.ts` | 세그먼트 분할, 완료 판단 |
| `cloud-run/segment-analyzer/src/handlers/youtube-segment-handler.ts` | Phase 1/2 처리 |
| `cloud-run/segment-analyzer/src/lib/vertex-analyzer-youtube.ts` | Gemini API 호출 |
| `cloud-run/segment-analyzer/src/lib/prompts/phase2-prompt.ts` | 분석 프롬프트 |
| `app/actions/cloud-run-trigger.ts` | Server Action 트리거 |
| `lib/hooks/use-cloud-run-job.ts` | 진행률 폴링 |

---

**문서 버전**: 1.0
**작성자**: Claude Code Analysis Agent
