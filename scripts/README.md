# Scripts

> ⚠️ **정리됨**: 레거시 스크립트들이 정리되었습니다. (2025-12-03)

## 현재 상태

대부분의 운영 작업은 **Admin CLI** (`npm run admin`)로 통합되었습니다.

## Admin CLI (통합 관리 도구)

가장 자주 사용하는 운영 작업을 하나의 CLI로 통합했습니다.

### 사용법

```bash
# 도움말
npm run admin -- --action=help

# KAN 분석 작업 상태 확인
npm run admin -- --action=check-jobs

# STUCK 상태 작업 정리 (10분 초과)
npm run admin -- --action=cleanup-jobs

# RLS 정책 점검
npm run admin -- --action=check-rls

# DB 상태 확인 (테이블별 레코드 수, 최근 사용자)
npm run admin -- --action=check-db
```

## NPM Scripts

### 운영 (ops:*)

```bash
# KAN 작업 상태 확인
npm run ops:check-jobs

# STUCK 작업 정리
npm run ops:cleanup-jobs

# DB 상태 확인
npm run ops:check-db

# RLS 정책 확인
npm run ops:check-rls
```

## 환경 변수

스크립트 실행에 필요한 환경 변수 (`.env.local`):

```bash
# Firebase Admin SDK (필수)
FIREBASE_ADMIN_SDK_KEY='{"type":"service_account"...}'  # JSON 문자열
# 또는
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# Firebase 프로젝트 (필수)
NEXT_PUBLIC_FIREBASE_PROJECT_ID=templar-archives-index

# Vertex AI (영상 분석용)
GOOGLE_API_KEY=AIzaSy...
```

## 정리된 파일들 (참고용)

### 2025-12-03 정리

일회성 스크립트 19개 삭제:
- `add-*.ts` - 데이터 추가 스크립트
- `apply-*.ts` - 마이그레이션 적용
- `cleanup-*.ts` - 데이터 정리
- `migrate-*.ts` - 마이그레이션
- `update-*.ts` - 데이터 업데이트
- `upload-*.ts` - 업로드 스크립트
- `fix-*.ts` - 버그 수정
- `delete-*.ts` - 삭제 스크립트

필요한 경우 Git 히스토리에서 복구 가능:
```bash
git log --all --full-history -- scripts/
git checkout <commit-hash> -- scripts/<filename>
```

---

**마지막 업데이트**: 2025-12-03
