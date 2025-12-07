# PWA Screenshots

이 디렉토리는 PWA manifest에서 사용하는 스크린샷을 저장합니다.

## 필요한 이미지

1. **desktop-1.png** (1920x1080)
   - Desktop 버전 메인 화면 스크린샷
   - Archive 페이지 또는 Hand Detail 페이지 권장

2. **mobile-1.png** (750x1334)
   - Mobile 버전 메인 화면 스크린샷
   - 세로 방향으로 촬영

## 생성 방법

### 옵션 1: 실제 스크린샷
```bash
# 개발 서버 실행
npm run dev

# Chrome DevTools를 사용하여 스크린샷 촬영
# 1. F12 → Device Toolbar (Ctrl+Shift+M)
# 2. Desktop: 1920x1080 해상도 설정
# 3. Mobile: iPhone 8 Plus (750x1334) 선택
# 4. Capture screenshot
```

### 옵션 2: Playwright 자동화
```javascript
import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage()

// Desktop
await page.setViewportSize({ width: 1920, height: 1080 })
await page.goto('http://localhost:3000/archive')
await page.screenshot({ path: 'public/screenshots/desktop-1.png' })

// Mobile
await page.setViewportSize({ width: 750, height: 1334 })
await page.goto('http://localhost:3000/archive')
await page.screenshot({ path: 'public/screenshots/mobile-1.png' })

await browser.close()
```

## 참고

- PWA 앱 스토어 등록 시 필수 요구사항입니다
- 실제 사용자 화면을 보여주는 것이 좋습니다
- 개인정보가 포함되지 않도록 주의하세요
