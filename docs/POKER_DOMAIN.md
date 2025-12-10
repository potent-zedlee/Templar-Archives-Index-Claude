# Poker Domain Knowledge

Templar Archives 개발을 위한 포커 도메인 지식 문서입니다.

---

## 핵심 용어

### 게임 구조

| 용어 | 설명 |
|------|------|
| Small Blind (SB) | 강제 베팅 (BB의 절반) |
| Big Blind (BB) | 강제 베팅 |
| Ante | 모든 플레이어 의무 베팅 |
| Pot | 베팅된 칩의 총합 |
| Stack | 플레이어 보유 칩 |

### 포지션 (시계 방향)

| 포지션 | 설명 |
|--------|------|
| BTN (Button) | 가장 유리한 포지션 |
| SB (Small Blind) | 포스트플랍 첫 번째 액션 |
| BB (Big Blind) | 프리플랍 마지막 액션 |
| UTG (Under The Gun) | 가장 불리한 포지션 |
| MP (Middle Position) | 중립적 |
| CO (Cut-Off) | 두 번째로 유리한 포지션 |

### 스트리트

| 스트리트 | 설명 |
|----------|------|
| Preflop | 홀카드 받은 직후 |
| Flop | 첫 3장 커뮤니티 카드 |
| Turn | 4번째 카드 |
| River | 5번째 카드 |

### 액션

| 액션 | 설명 |
|------|------|
| Fold | 포기 |
| Check | 베팅 없이 차례 넘김 |
| Call | 현재 베팅 금액 추가 |
| Bet | 처음으로 칩 거는 행위 |
| Raise | 이전 베팅보다 많이 베팅 |
| 3-bet | 레이즈에 대한 리레이즈 |
| All-in | 모든 칩 베팅 |

---

## 핸드 랭킹 (높은 순)

1. **Royal Flush** - A, K, Q, J, 10 동일 수트
2. **Straight Flush** - 연속된 5장 동일 수트
3. **Four of a Kind (Quads)** - 같은 숫자 4장
4. **Full House** - 같은 숫자 3장 + 2장
5. **Flush** - 동일 수트 5장
6. **Straight** - 연속된 5장
7. **Three of a Kind (Set)** - 같은 숫자 3장
8. **Two Pair** - 페어 2개
9. **One Pair** - 페어 1개
10. **High Card** - 위 조합 없음

---

## 전략 용어

| 용어 | 설명 |
|------|------|
| GTO (Game Theory Optimal) | 수학적 최적 전략 |
| ICM (Independent Chip Model) | 토너먼트 칩 가치 모델 |
| Equity | 현재 핸드에서 팟을 가져갈 확률 |
| Range | 플레이어가 가질 수 있는 핸드 조합 |
| Balanced Range | 강한 핸드와 블러프가 적절히 섞인 레인지 |

---

## 플레이어 통계

### 주요 지표

| 지표 | 설명 | 계산 |
|------|------|------|
| VPIP | Voluntarily Put In Pot | 프리플랍 참여율 |
| PFR | Pre-Flop Raise | 프리플랍 레이즈율 |
| 3BET | 3벳 비율 | 3벳 액션 / 기회 |
| ATS | Attempt To Steal | BTN/CO/SB 스틸 시도율 |
| Win Rate | 승률 | 승리 핸드 / 전체 핸드 |
| Avg Pot Size | 평균 팟 크기 | 총 팟 / 핸드 수 |

### 플레이 스타일 분류

| 스타일 | VPIP | PFR | 특징 |
|--------|------|-----|------|
| Tight-Aggressive (TAG) | 낮음 | 높음 | 선택적이지만 공격적 |
| Loose-Aggressive (LAG) | 높음 | 높음 | 많은 핸드를 공격적으로 |
| Tight-Passive | 낮음 | 낮음 | 콜 위주 |
| Loose-Passive | 높음 | 낮음 | 많은 핸드를 수동적으로 |

---

## DB 스키마 매핑

### hands 테이블

| DB 컬럼 | 포커 개념 | 예시 |
|---------|-----------|------|
| `number` | 핸드 번호 | `"001"` |
| `small_blind` | 스몰 블라인드 (cents) | `50000` |
| `big_blind` | 빅 블라인드 (cents) | `100000` |
| `ante` | 앤티 (cents) | `100000` |
| `board_flop` | 플랍 카드 (3장) | `["9d", "6s", "3c"]` |
| `board_turn` | 턴 카드 (1장) | `"As"` |
| `board_river` | 리버 카드 (1장) | `"2h"` |
| `final_pot` | 최종 팟 크기 (cents) | `19500000` |
| `video_timestamp_start` | 시작 타임스탬프 (초) | `3245` |

### 카드 표기법

- **Rank**: `A` (Ace), `K` (King), `Q` (Queen), `J` (Jack), `T` (Ten), `9`-`2`
- **Suit**: `s` (♠), `h` (♥), `d` (♦), `c` (♣)
- **예시**: `["Ah", "As"]` = Ace of hearts, Ace of spades

### hand_players 테이블

| DB 컬럼 | 포커 개념 | 예시 |
|---------|-----------|------|
| `poker_position` | 포지션 | `"BTN"`, `"SB"`, `"UTG"` |
| `hole_cards` | 홀카드 (2장) | `["Ah", "As"]` |
| `starting_stack` | 시작 스택 (cents) | `9600000` |
| `ending_stack` | 종료 스택 (cents) | `19500000` |
| `is_winner` | 승자 여부 | `true` |

### hand_actions 테이블

| DB 컬럼 | 포커 개념 | 예시 |
|---------|-----------|------|
| `street` | 스트리트 | `"preflop"`, `"flop"`, `"turn"`, `"river"` |
| `sequence_order` | 액션 순서 (핸드 전체) | `1`, `2`, `3`... |
| `action_type` | 액션 타입 | `"fold"`, `"check"`, `"call"`, `"bet"`, `"raise"`, `"all-in"`, `"3-bet"` |
| `amount` | 베팅 금액 (cents) | `300000` |
| `pot_after` | 액션 후 팟 (cents) | `650000` |

### players 테이블

| DB 컬럼 | 설명 | 예시 |
|---------|------|------|
| `name` | 플레이어 이름 | `"Kristen Foxen"` |
| `country` | 국가 | `"Canada"` |
| `gender` | 성별 | `"female"`, `"male"`, `"other"` |
| `total_winnings` | 총 상금 (cents) | `402060300` ($4,020,603) |
| `photo_url` | 프로필 사진 URL | GCS URL |

---

## KAN 분석 체크리스트

### 분석 전

- [ ] YouTube URL 유효성 확인
- [ ] 영상 길이 1시간 이하 세그먼트로 분할
- [ ] 플랫폼 식별 (EPT, WSOP, Triton)
- [ ] Prompt 선택 (`lib/ai/prompts.ts`)
- [ ] Stream 존재 확인 (stream_id 필요)

### 분석 후

- [ ] 플레이어 이름 인식 (EPT: 대문자, WSOP/Triton: 일반 케이스)
- [ ] 포지션 추출 정확도
- [ ] 홀카드 파싱 (`["Ah", "As"]` 형식)
- [ ] 보드 카드 추출 (Flop 3장, Turn 1장, River 1장)
- [ ] 액션 시퀀스 순서 보장
- [ ] 베팅 금액 일관성 (amount, pot_after, stack_after)

### 플랫폼별 특이사항

| 플랫폼 | 이름 형식 | Ante |
|--------|-----------|------|
| EPT | 대문자 (`"BRZEZINSKI"`) | 있음 |
| WSOP | 일반 케이스 (`"Phil Ivey"`) | 있음 |
| Triton | 일반 케이스 | 있음 |
| Cash Game | 일반 케이스 | 없음 (0 또는 NULL) |

---

## 핸드 히스토리 JSON 예시

```json
{
  "number": "001",
  "small_blind": 50000,
  "big_blind": 100000,
  "ante": 100000,
  "stakes": "50K/100K/100K ante",
  "board_flop": ["9d", "6s", "3c"],
  "board_turn": "As",
  "board_river": "2h",
  "final_pot": 19500000,
  "video_timestamp_start": 3245,
  "video_timestamp_end": 3510,
  "ai_summary": "Preflop all-in battle between pocket Aces and pocket Kings.",
  "hand_players": [
    {
      "name": "BRZEZINSKI",
      "poker_position": "BTN",
      "hole_cards": ["Ah", "As"],
      "starting_stack": 9600000,
      "ending_stack": 19500000,
      "seat": 3,
      "is_winner": true,
      "hand_description": "Pair of Aces"
    }
  ],
  "hand_actions": [
    {
      "street": "preflop",
      "sequence_order": 1,
      "player_name": "BRZEZINSKI",
      "action_type": "raise",
      "amount": 300000,
      "pot_after": 650000,
      "stack_after": 9300000
    }
  ]
}
```

---

**마지막 업데이트**: 2025-12-10
