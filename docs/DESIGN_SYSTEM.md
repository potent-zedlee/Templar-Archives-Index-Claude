# Templar Archives 포스트모던 디자인 시스템

## 개요

Templar Archives는 **검정(#000000)과 금색(#D4AF37)**을 기반으로 한 포스트모던 디자인 시스템을 사용합니다.

**핵심 원칙**:
- **대담함 (Bold)**: 강렬한 색상 대비와 초대형 타이포그래피
- **비대칭 (Asymmetric)**: 비정형 그리드와 오프셋 레이아웃
- **3D 효과 (Depth)**: 다중 레이어 섀도우와 호버 리프트
- **샤프함 (Sharp)**: border-radius: 0, 날카로운 모서리
- **미니멀리즘 (Minimalist)**: 불필요한 장식 제거

---

## 1. 색상 팔레트

### Primary Colors (Gold Spectrum)

| 변수명 | 색상 코드 | 용도 |
|--------|-----------|------|
| `--gold-300` | `oklch(0.78 0.14 85)` | 라이트 금색 (Hover, Secondary Text) |
| `--gold-400` | `oklch(0.68 0.16 85)` | **표준 금색** (Primary Text, Borders) |
| `--gold-500` | `oklch(0.58 0.18 80)` | 깊은 금색 (Buttons, Badges) |
| `--gold-600` | `oklch(0.48 0.16 75)` | 다크 골드 (Card Borders, Shadows) |
| `--gold-700` | `oklch(0.38 0.14 70)` | 매우 어두운 금색 (3D Shadows) |

### Background Colors (Black Spectrum)

| 변수명 | 색상 코드 | 용도 |
|--------|-----------|------|
| `--black-0` | `oklch(0 0 0)` | **순수 검정** (Background, Button Text) |
| `--black-100` | `oklch(0.12 0 0)` | 카드 배경 (Cards, Inputs) |
| `--black-200` | `oklch(0.16 0 0)` | 상승된 요소 (Dropdowns, Modals) |
| `--black-300` | `oklch(0.20 0 0)` | Hover 상태 (Button Hover) |
| `--black-400` | `oklch(0.28 0 0)` | 테두리 (Borders, Dividers) |

### Text Colors

| 변수명 | 색상 코드 | 용도 |
|--------|-----------|------|
| `--text-primary` | `var(--gold-400)` | 주요 텍스트 (헤딩, 강조) |
| `--text-secondary` | `oklch(0.88 0 0)` | 보조 텍스트 (본문) |
| `--text-inverse` | `oklch(0.98 0 0)` | 반전 텍스트 (White on Gold) |
| `--text-muted` | `oklch(0.58 0 0)` | 비활성 텍스트 (Metadata) |

---

## 2. 타이포그래피

### Display (초대형 헤딩)

```css
.text-display {
  font-size: 3.75rem;    /* 60px */
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.15em;
}

.text-display-sm {
  font-size: 2.25rem;    /* 36px */
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}
```

**용도**: 히어로 섹션, 페이지 타이틀

### Headings (섹션 제목)

```css
.text-heading-lg {
  font-size: 1.875rem;   /* 30px */
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.text-heading {
  font-size: 1.5rem;     /* 24px */
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.text-heading-sm {
  font-size: 1.25rem;    /* 20px */
  font-weight: 600;
  text-transform: uppercase;
}
```

**용도**: 섹션 타이틀, 카드 제목

### Body (본문)

```css
.text-body-lg {
  font-size: 1rem;       /* 16px */
  font-weight: 500;
}

.text-body {
  font-size: 0.875rem;   /* 14px */
  font-weight: 400;
}
```

**용도**: 일반 본문, 설명

### Caption (메타데이터)

```css
.text-caption-lg {
  font-size: 0.875rem;   /* 14px */
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.text-caption {
  font-size: 0.75rem;    /* 12px */
  font-weight: 500;
  text-transform: uppercase;
}
```

**용도**: 날짜, 라벨, 통계 레이블

### Monospace (통계 숫자)

```css
.text-mono {
  font-family: var(--font-mono, 'Geist Mono');
}

.text-hand-number {
  font-family: var(--font-mono);
  font-size: 1rem;
  font-weight: 700;
  color: var(--gold-400);
  letter-spacing: 0.05em;
}
```

**용도**: 핸드 번호, 통계 수치, 금액

---

## 3. 컴포넌트

### 카드 (Cards)

#### .card-postmodern (기본 카드)

```css
.card-postmodern {
  background-color: var(--black-100);
  border: 2px solid var(--gold-600);
  position: relative;
  box-shadow: 4px 4px 0 var(--black-0), 8px 8px 0 var(--gold-700);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-postmodern:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 var(--black-0), 12px 12px 0 var(--gold-700);
}
```

**특징**:
- 다중 레이어 섀도우 (3D 효과)
- Hover 시 리프트 애니메이션
- Sharp edges (border-radius: 0)

**사용 예시**: Tournament Card, Player Card, Post Card

#### .card-postmodern-interactive (클릭 가능 카드)

```css
.card-postmodern-interactive {
  /* Same as .card-postmodern */
  cursor: pointer;
}

.card-postmodern-interactive:active {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0 var(--black-0), 4px 4px 0 var(--gold-700);
}
```

**특징**: 클릭 시 눌림 효과

### 버튼 (Buttons)

#### .btn-primary (주요 버튼)

```css
.btn-primary {
  background: linear-gradient(to right, var(--gold-400), var(--gold-600));
  color: var(--black-0);
  font-weight: 700;
  text-transform: uppercase;
  padding: 0.75rem 1.5rem;
  box-shadow: 4px 4px 0 var(--black-0), 6px 6px 0 var(--gold-700);
  transition: all 0.2s ease-out;
}

.btn-primary:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 var(--black-0), 10px 10px 0 var(--gold-700);
}

.btn-primary:active {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0 var(--black-0), 4px 4px 0 var(--gold-700);
}
```

**용도**: Submit, Create, Confirm

#### .btn-secondary (보조 버튼)

```css
.btn-secondary {
  background-color: var(--black-100);
  color: var(--gold-400);
  border: 2px solid var(--gold-600);
  font-weight: 700;
  text-transform: uppercase;
  padding: 0.75rem 1.5rem;
  box-shadow: 3px 3px 0 var(--black-0);
  transition: all 0.2s ease-out;
}

.btn-secondary:hover {
  background-color: var(--black-200);
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 var(--black-0);
}
```

**용도**: Cancel, Back, Secondary Actions

#### .btn-ghost (고스트 버튼)

```css
.btn-ghost {
  background-color: transparent;
  color: var(--gold-400);
  font-weight: 600;
  text-transform: uppercase;
  padding: 0.5rem 1rem;
  transition: all 0.2s ease-out;
}

.btn-ghost:hover {
  color: var(--gold-300);
  background-color: var(--black-100);
}
```

**용도**: Tertiary Actions, Navigation

### 입력 (Inputs)

#### .input-postmodern

```css
.input-postmodern {
  background-color: var(--black-100);
  border: 2px solid var(--gold-600);
  color: var(--text-secondary);
  padding: 0.5rem 1rem;
  transition: all 0.2s ease-out;
}

.input-postmodern:focus {
  border-color: var(--gold-400);
  outline: none;
  box-shadow: 0 0 20px rgba(212, 175, 55, 0.2);
}
```

**특징**: Focus 시 금색 글로우

---

## 4. 레이아웃 패턴

### 비대칭 그리드 (Asymmetric Grid)

#### 2:3 비대칭

```css
.grid-asymmetric-2-3 {
  display: grid;
  grid-template-columns: 2fr 3fr;
  gap: 1rem;
}
```

**용도**: Stream Card (좌측 정보, 우측 핸드 목록)

#### 3열 비대칭

```css
.tournament-card-grid {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 1rem;
  align-items: start;
}
```

**용도**: Tournament Card (Year Badge | Info | Stats)

### 반응형 그리드

```css
/* 모바일: 1열 */
grid-cols-1

/* 태블릿: 2열 */
md:grid-cols-2

/* 데스크탑: 3열 */
lg:grid-cols-3

/* 대형 화면: 4열 */
xl:grid-cols-4
```

---

## 5. 특수 효과

### Gold Glow (금색 글로우)

```css
.gold-glow {
  box-shadow: 0 0 20px rgba(212, 175, 55, 0.2);
}

.gold-glow-intense {
  box-shadow: 0 0 30px rgba(212, 175, 55, 0.4),
              0 0 60px rgba(212, 175, 55, 0.2);
}
```

**용도**: Focus states, Hover effects, Active elements

### 3D Hover Effect

```css
.hover-3d {
  transition: transform 0.3s ease-out, box-shadow 0.3s ease-out;
}

.hover-3d:hover {
  transform: translateY(-4px) rotateX(2deg);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3),
              0 0 30px rgba(212, 175, 55, 0.2);
}
```

**용도**: Tournament cards, Hero sections

### Link Underline Animation

```css
a:not(.no-underline-animation):hover::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: var(--gold-400);
  animation: underline-slide 0.3s ease-out;
}

@keyframes underline-slide {
  from { width: 0; }
  to { width: 100%; }
}
```

**용도**: 텍스트 링크

---

## 6. Archive 전용 컴포넌트

### Year Badge (대형 금색 배지)

```css
.year-badge {
  background: linear-gradient(135deg, var(--gold-500), var(--gold-400));
  color: var(--black-0);
  padding: 1rem;
  min-width: 120px;
  text-align: center;
  border: 3px solid var(--gold-600);
  box-shadow: 0 0 20px rgba(212, 175, 55, 0.3);
  font-family: var(--font-mono);
  font-weight: 900;
  font-size: 1.875rem;
  letter-spacing: 0.1em;
}
```

**용도**: Tournament 년도 표시

### Day Badge (일별 스트림)

```css
.day-badge {
  background: var(--black-200);
  border-left: 5px solid var(--gold-400);
  padding: 0.75rem 1rem;
}
```

**용도**: Stream Day 표시 (Day 1A, Day 2, etc.)

### Stats Card (통계 정보)

```css
.stats-card {
  background: var(--black-200);
  border: 2px solid var(--gold-700);
  padding: 1rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  border-left: 3px solid var(--gold-600);
  padding-left: 0.75rem;
}
```

**용도**: Tournament 통계 (Entries, Prize Pool, Hands)

### Progress Bar (핸드 진행률)

```css
.progress-bar {
  background: var(--black-200);
  border: 2px solid var(--border-secondary);
  height: 0.5rem;
  overflow: hidden;
}

.progress-bar-fill {
  background: linear-gradient(90deg, var(--gold-500), var(--gold-400));
  height: 100%;
  transition: width 0.3s ease-out;
  box-shadow: 0 0 10px var(--gold-400);
}
```

**용도**: Stream 핸드 진행률

---

## 7. Players 전용 컴포넌트

### Player Badge (국가/플랫폼)

```css
.player-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.75rem;
  background: var(--black-200);
  color: var(--gold-300);
  border: 1px solid var(--gold-700);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

**용도**: 국가 플래그, 소셜 플랫폼

### Player Avatar (프로필 이미지)

```css
.player-avatar {
  border: 4px solid var(--gold-600);
  box-shadow: 0 0 20px rgba(212, 175, 55, 0.3);
}

.player-avatar-lg {
  width: 12rem;
  height: 12rem;
  border: 4px solid var(--gold-600);
  box-shadow: 0 0 20px rgba(212, 175, 55, 0.3);
}
```

**용도**: 플레이어 프로필 사진

### Verified Badge (인증 배지)

```css
.verified-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  background: var(--gold-500);
  color: var(--black-0);
  border: 2px solid var(--gold-600);
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  box-shadow: 0 0 15px rgba(212, 175, 55, 0.4);
}
```

**용도**: 인증된 플레이어 표시

---

## 8. 반응형 디자인

### 모바일 최적화 (< 768px)

```css
/* 타이포그래피 축소 */
@media (max-width: 767px) {
  .text-display {
    font-size: 3rem; /* 48px instead of 60px */
  }

  .text-heading-lg {
    font-size: 1.5rem; /* 24px instead of 30px */
  }

  /* Year Badge 축소 */
  .year-badge {
    min-width: 80px;
    padding: 0.5rem;
    font-size: 1.5rem;
  }

  /* 카드 패딩 축소 */
  .post-card, .player-card {
    padding: 1.25rem;
  }
}
```

### 터치 인터랙션 개선

```css
@media (hover: none) {
  /* 터치 타겟 최소 44x44px */
  .btn-primary,
  .btn-secondary,
  .btn-ghost {
    min-height: 44px;
    min-width: 44px;
  }

  .community-action-btn {
    padding: 0.75rem 1.25rem;
    min-height: 44px;
  }

  /* Hover 효과 제거 (터치 디바이스) */
  .card-postmodern:hover {
    transform: none;
    box-shadow: 4px 4px 0 var(--black-0), 8px 8px 0 var(--gold-700);
  }

  /* 탭 효과는 유지 */
  .card-postmodern:active {
    transform: translate(2px, 2px);
    box-shadow: 2px 2px 0 var(--black-0), 4px 4px 0 var(--gold-700);
  }
}
```

---

## 9. 접근성 (Accessibility)

### 색상 대비 (WCAG AA 준수)

- **일반 텍스트**: 4.5:1 이상
  - 금색(#D4AF37) vs 검정(#000000): 7.2:1 (AA 통과)
- **큰 텍스트(18px+)**: 3:1 이상
  - 금색 vs 검정: 7.2:1 (AAA 통과)
- **UI 요소**: 3:1 이상
  - 금색 테두리 vs 검정 배경: 7.2:1 (AAA 통과)

### Focus States

```css
*:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--gold-400),
              0 0 0 4px var(--black-0);
}
```

**특징**: 금색 2px 테두리 + 검정 4px 외부 링

### 키보드 네비게이션

- 모든 버튼/링크에 focus-visible 스타일 적용
- Tab 키로 모든 인터랙티브 요소 접근 가능
- Skip to main content 링크 제공

---

## 10. 성능 최적화

### CSS 최적화

- 불필요한 선택자 제거
- 중복 스타일 통합
- CSS 변수 활용 (유지보수성)

### 애니메이션 성능

```css
/* GPU 가속 사용 */
transform: translateY(-4px);
will-change: transform, box-shadow;

/* 60fps 유지 */
transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
```

### 이미지 최적화

- Next.js Image 컴포넌트 사용
- width/height 속성 명시
- priority 플래그 (LCP 이미지)
- lazy loading (Fold 아래 이미지)

---

## 11. 사용 예시

### Tournament Card

```tsx
<div className="card-postmodern hover-3d p-6">
  <div className="grid-asymmetric-3-2 gap-6">
    {/* Year Badge */}
    <div className="year-badge">2024</div>

    {/* Info */}
    <div className="space-y-4">
      <h2 className="text-heading">WSOP Main Event</h2>
      <div className="stats-card">
        <div className="stat-item">
          <span className="text-caption">Entries</span>
          <span className="text-mono text-2xl">10,000</span>
        </div>
      </div>
    </div>
  </div>
</div>
```

---

## 12. 디자인 토큰 (Tailwind Config)

프로젝트의 Tailwind 설정에서 사용 가능한 토큰들:

```javascript
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      gold: {
        300: 'var(--gold-300)',
        400: 'var(--gold-400)',
        500: 'var(--gold-500)',
        600: 'var(--gold-600)',
        700: 'var(--gold-700)',
      },
      black: {
        0: 'var(--black-0)',
        100: 'var(--black-100)',
        200: 'var(--black-200)',
        300: 'var(--black-300)',
        400: 'var(--black-400)',
      },
    },
  },
}
```

---

## 13. 브랜딩 가이드라인

### 로고

- **Primary**: TA 모노그램 (금색 그라데이션 배경)
- **Wordmark**: "Templar Archives" (금색, 대문자, 볼드)
- **최소 크기**: 40x40px (모노그램), 150px wide (워드마크)

### 어조 (Tone of Voice)

- **전문적 (Professional)**: 포커 용어 정확성
- **대담한 (Bold)**: 강렬한 비주얼, 초대형 타이포그래피
- **클린 (Clean)**: 불필요한 장식 제거

---

## 14. 금지 사항

❌ **다음을 절대 사용하지 마세요**:

1. **Rounded Corners**: border-radius는 항상 0
2. **Soft Shadows**: 항상 hard shadow 사용 (4px 4px 0)
3. **Pastel Colors**: 고대비 색상만 사용
4. **Script Fonts**: Sans-serif (Geist) 또는 Mono (Geist Mono)만
5. **Gradient Backgrounds**: 버튼 외 사용 금지

---

## 15. 참고 자료

- **globals.css**: `/app/globals.css` - 전체 CSS 유틸리티
- **Tailwind Config**: `/tailwind.config.ts` - 색상 토큰
- **컴포넌트**: `/components/ui/*` - 재사용 가능 UI
- **PAGES_STRUCTURE.md**: 22개 페이지 구조

---

**마지막 업데이트**: 2025-12-10
**문서 버전**: 1.2
**변경 이력**: Cash Game 기능 제거, 문서 날짜 동기화
