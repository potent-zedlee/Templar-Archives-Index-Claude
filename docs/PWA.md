# PWA (Progressive Web App) 가이드

Templar Archives는 프로그레시브 웹 앱(PWA)으로 구축되어 네이티브 앱과 유사한 경험을 제공합니다.

## 핵심 기능

### 1. 오프라인 지원

Service Worker를 통해 네트워크 연결이 끊어져도 일부 기능을 사용할 수 있습니다.

**오프라인 가능 기능**:
- 최근 조회한 핸드 히스토리 보기
- 캐시된 페이지 탐색
- 저장된 북마크 확인

**구현 파일**:
- `app/sw.ts` - Service Worker 메인 로직
- `app/offline/page.tsx` - 오프라인 폴백 페이지
- `components/common/OfflineIndicator.tsx` - 오프라인 상태 표시

### 2. 설치 가능 (Install to Home Screen)

사용자는 브라우저에서 앱을 홈 화면에 추가하여 네이티브 앱처럼 사용할 수 있습니다.

**지원 플랫폼**:
- Android: Chrome, Samsung Internet, Edge
- iOS: Safari (수동 설치)
- Desktop: Chrome, Edge, Opera

**구현 파일**:
- `components/common/InstallPWAPrompt.tsx` - 설치 프롬프트
- `public/manifest.json` - 웹 앱 매니페스트

### 3. 캐싱 전략

| 리소스 | 전략 | 설명 |
|--------|------|------|
| Firestore API | Network First | 최신 데이터 우선, 오프라인 시 캐시 사용 |
| Firebase Storage | Cache First | 영상 파일 등 대용량 리소스 캐싱 |
| 외부 이미지 | Cache First | YouTube 썸네일, 프로필 이미지 등 |
| Google Fonts | Stale While Revalidate | 폰트 로딩 최적화 |
| 정적 파일 | Precache | 빌드 시 자동 캐싱 |

### 4. 푸시 알림 (Push Notifications)

영상 분석 완료, 댓글 알림 등을 푸시 알림으로 받을 수 있습니다.

**구현 위치**: `app/sw.ts` (Push/Notification 이벤트 핸들러)

### 5. Background Sync

오프라인 중 실패한 작업을 네트워크 연결 시 자동으로 재시도합니다.

**사용 예**: 영상 분석 작업 재시도

## 개발 가이드

### 로컬 테스트

개발 환경에서는 Service Worker가 비활성화됩니다. 프로덕션 빌드에서만 테스트하세요.

```bash
# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm run start

# 브라우저에서 확인
# Chrome DevTools → Application → Service Workers
```

### Service Worker 디버깅

```bash
# Chrome DevTools
1. F12 → Application 탭
2. Service Workers → 등록된 Service Worker 확인
3. Cache Storage → 캐시된 리소스 확인
4. Manifest → manifest.json 검증

# 강제 새로고침 (캐시 무시)
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)

# Service Worker 재등록
Application → Service Workers → Unregister → 새로고침
```

### 캐시 업데이트

코드 변경 시 Service Worker가 자동으로 업데이트됩니다.

```typescript
// app/sw.ts
const serwist = new Serwist({
  skipWaiting: true,      // 새 버전 즉시 활성화
  clientsClaim: true,     // 기존 클라이언트도 새 버전 사용
})
```

## 아이콘 생성

PWA 아이콘은 여러 크기가 필요합니다.

### 현재 제공되는 아이콘

- 72x72, 96x96, 128x128, 144x144, 152x152
- 192x192 (Android 최소 요구사항)
- 384x384, 512x512 (Android splash screen)
- badge-72x72 (푸시 알림용)

### 새 아이콘 생성

```bash
# 1. 원본 SVG/PNG 준비 (최소 512x512 권장)
# 2. 스크립트 실행
node scripts/generate-pwa-icons.js
node scripts/convert-svg-to-png.mjs

# 또는 온라인 도구 사용
# https://realfavicongenerator.net/
```

### maskable 아이콘

Android Adaptive Icons를 위해 maskable 아이콘이 필요합니다.

**요구사항**:
- Safe zone: 중앙 80% 영역에 로고 배치
- Background: 전체 배경색 지정
- Format: PNG with transparency

**도구**: https://maskable.app/editor

## manifest.json 구성

```json
{
  "name": "Templar Archives",           // 전체 이름
  "short_name": "Templar",              // 홈 화면 표시 이름
  "start_url": "/",                     // 앱 시작 URL
  "display": "standalone",              // 전체화면 모드
  "background_color": "#000000",        // Splash screen 배경
  "theme_color": "#F59E0B",             // 브라우저 툴바 색상
  "orientation": "portrait-primary",    // 세로 방향
  "categories": ["poker", "entertainment", "sports"],
  "screenshots": [],                    // 앱 스토어용 스크린샷
  "shortcuts": []                       // 홈 화면 바로가기
}
```

## 배포 체크리스트

### 1. Service Worker 빌드

```bash
npm run build
# → public/sw.js 생성 확인
```

### 2. Manifest 검증

```bash
# Lighthouse 검사
npx lighthouse https://templar-archives-index.vercel.app --view

# 또는 Chrome DevTools
Application → Manifest → 경고 확인
```

### 3. PWA 스코어 확인

**필수 항목**:
- [ ] HTTPS 사용
- [ ] manifest.json 유효
- [ ] Service Worker 등록
- [ ] 192x192 아이콘 제공
- [ ] 512x512 아이콘 제공
- [ ] start_url 응답
- [ ] theme_color 설정
- [ ] 오프라인 페이지 제공

**권장 항목**:
- [ ] Apple Touch Icon
- [ ] maskable 아이콘
- [ ] screenshots 제공
- [ ] shortcuts 제공
- [ ] description 제공

### 4. 크로스 브라우저 테스트

| 브라우저 | 설치 | 오프라인 | 푸시 | Background Sync |
|---------|------|---------|------|-----------------|
| Chrome Android | ✅ | ✅ | ✅ | ✅ |
| Safari iOS | ✅ (수동) | ✅ | ❌ | ❌ |
| Chrome Desktop | ✅ | ✅ | ✅ | ✅ |
| Firefox | ⚠️ | ✅ | ✅ | ❌ |
| Edge | ✅ | ✅ | ✅ | ✅ |

## 트러블슈팅

### Service Worker 등록 실패

```javascript
// 브라우저 콘솔에서 확인
navigator.serviceWorker.getRegistrations().then(console.log)

// 해결책
1. HTTPS 확인 (localhost는 허용)
2. sw.js 경로 확인 (/public/sw.js)
3. CSP 헤더 확인
```

### 캐시가 업데이트되지 않음

```javascript
// 캐시 수동 삭제
caches.keys().then(keys => keys.forEach(key => caches.delete(key)))

// 또는 Service Worker 재등록
navigator.serviceWorker.getRegistrations()
  .then(regs => regs.forEach(reg => reg.unregister()))
```

### iOS에서 설치 안 됨

iOS Safari는 `beforeinstallprompt` 이벤트를 지원하지 않습니다.

**해결책**:
1. `IOSInstallPrompt` 컴포넌트 사용
2. 수동 설치 안내 표시

### 푸시 알림 안 옴

```javascript
// 권한 확인
Notification.permission // "granted" | "denied" | "default"

// 권한 요청
Notification.requestPermission().then(console.log)

// Service Worker 등록 확인
navigator.serviceWorker.ready.then(reg => reg.pushManager.getSubscription())
```

## 참고 자료

- [Serwist 문서](https://serwist.pages.dev/)
- [PWA 체크리스트](https://web.dev/pwa-checklist/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Maskable Icons](https://web.dev/maskable-icon/)

---

**마지막 업데이트**: 2025-12-07
**담당자**: Frontend Team
