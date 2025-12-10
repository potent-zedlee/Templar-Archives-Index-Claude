# Scripts

## PWA 아이콘 생성

PWA 아이콘을 생성/변환하는 유틸리티 스크립트입니다.

### 파일 목록

| 파일 | 설명 |
|------|------|
| `generate-pwa-icons.js` | SVG placeholder 아이콘 생성 |
| `convert-svg-to-png.mjs` | SVG → PNG 변환 (sharp 사용) |

### 사용법

```bash
# 1. SVG 아이콘 생성 (placeholder)
node scripts/generate-pwa-icons.js

# 2. PNG로 변환
node scripts/convert-svg-to-png.mjs
```

### 생성되는 파일

`public/icons/` 폴더에 다음 사이즈로 생성됩니다:
- 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512

---

## Admin CLI (운영 도구)

대부분의 운영 작업은 **Admin CLI** (`npm run admin`)로 통합되었습니다.

```bash
npm run admin -- --action=help       # 도움말
npm run admin -- --action=check-jobs # 분석 작업 상태
npm run admin -- --action=cleanup-jobs # STUCK 작업 정리
```

---

**마지막 업데이트**: 2025-12-10
