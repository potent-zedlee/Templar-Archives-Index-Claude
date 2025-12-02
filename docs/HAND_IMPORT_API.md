# Hand History Import API

외부 시스템에서 분석한 핸드 히스토리를 Templar Archives에 import하는 API 가이드입니다.

## API Endpoint

```
POST /api/import-hands
```

## 요청 형식

### Headers
```
Content-Type: application/json
```

### Body
```typescript
{
  "streamId": "uuid-of-stream",  // 필수: 핸드를 추가할 Stream의 ID
  "source": "external-analyzer-v1",  // 선택: 데이터 출처 식별자
  "hands": [
    {
      // 핸드 번호 (필수)
      "handNumber": "001",

      // 타임코드 (필수)
      "startTime": "00:26:37",  // HH:MM:SS 또는 MM:SS
      "endTime": "00:27:58",
      "duration": 81,  // 초 단위

      // 메타데이터 (선택)
      "confidence": 95,  // 0-100 (신뢰도 점수)
      "summary": "타카자와 오픈레이즈, 모두 폴드",  // 한 줄 요약

      // 플레이어 정보 (필수, 최소 1명)
      "players": [
        {
          "name": "Takasugi",  // 필수
          "position": "BTN",  // 선택
          "cards": "AhKh",  // 선택: Ace of Hearts, King of Hearts
          "stack": 25000  // 선택: 칩 스택
        },
        {
          "name": "Daniel Negreanu",
          "position": "SB",
          "cards": "QdQs",
          "stack": 30000
        }
      ],

      // 게임 정보 (모두 선택)
      "potSize": 1500,
      "boardCards": "As Kh Qd 7c 3s",  // 보드 카드
      "winner": "Takasugi",
      "winAmount": 1500,

      // 스트릿별 액션 (모두 선택)
      "preflop": [
        "Takasugi raises to 500",
        "Daniel Negreanu folds"
      ],
      "flop": [],
      "turn": [],
      "river": [],

      // 원본 데이터 (선택, 디버깅용)
      "rawData": {}
    }
  ]
}
```

## 응답 형식

### 성공 (200 OK)
```json
{
  "success": true,
  "imported": 5,  // 성공적으로 import된 핸드 수
  "failed": 0,  // 실패한 핸드 수
  "errors": []  // 에러 메시지 (실패한 경우만)
}
```

### 부분 성공 (200 OK)
```json
{
  "success": true,
  "imported": 3,
  "failed": 2,
  "errors": [
    "Hand #004: 플레이어 저장 실패",
    "Hand #005: 핸드 저장 실패: Invalid timestamp"
  ]
}
```

### 실패 (400 Bad Request)
```json
{
  "success": false,
  "error": "streamId와 hands 배열이 필요합니다",
  "imported": 0,
  "failed": 0
}
```

### 실패 (404 Not Found)
```json
{
  "success": false,
  "error": "Stream을 찾을 수 없습니다",
  "imported": 0,
  "failed": 0
}
```

## 사용 예시

### cURL
```bash
curl -X POST http://localhost:3000/api/import-hands \
  -H "Content-Type: application/json" \
  -d '{
    "streamId": "00000000-0000-0000-0000-000000000003",
    "source": "my-analyzer-v1",
    "hands": [
      {
        "handNumber": "001",
        "startTime": "00:26:37",
        "endTime": "00:27:58",
        "duration": 81,
        "confidence": 95,
        "summary": "타카자와 오픈레이즈, 모두 폴드",
        "players": [
          {
            "name": "Takasugi",
            "position": "BTN",
            "cards": "AhKh",
            "stack": 25000
          }
        ],
        "potSize": 1500,
        "winner": "Takasugi",
        "winAmount": 1500
      }
    ]
  }'
```

### Python
```python
import requests

url = "http://localhost:3000/api/import-hands"
data = {
    "streamId": "00000000-0000-0000-0000-000000000003",
    "source": "my-analyzer-v1",
    "hands": [
        {
            "handNumber": "001",
            "startTime": "00:26:37",
            "endTime": "00:27:58",
            "duration": 81,
            "confidence": 95,
            "summary": "타카자와 오픈레이즈, 모두 폴드",
            "players": [
                {
                    "name": "Takasugi",
                    "position": "BTN",
                    "cards": "AhKh",
                    "stack": 25000
                }
            ],
            "potSize": 1500,
            "winner": "Takasugi",
            "winAmount": 1500
        }
    ]
}

response = requests.post(url, json=data)
print(response.json())
```

### JavaScript/Node.js
```javascript
const response = await fetch('http://localhost:3000/api/import-hands', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    streamId: '00000000-0000-0000-0000-000000000003',
    source: 'my-analyzer-v1',
    hands: [
      {
        handNumber: '001',
        startTime: '00:26:37',
        endTime: '00:27:58',
        duration: 81,
        confidence: 95,
        summary: '타카자와 오픈레이즈, 모두 폴드',
        players: [
          {
            name: 'Takasugi',
            position: 'BTN',
            cards: 'AhKh',
            stack: 25000
          }
        ],
        potSize: 1500,
        winner: 'Takasugi',
        winAmount: 1500
      }
    ]
  })
})

const result = await response.json()
console.log(result)
```

## Day ID 찾기

Archive 페이지에서 Day를 선택한 후, 브라우저 개발자 도구에서 네트워크 탭을 확인하거나, 다음 API를 사용하세요:

```bash
# 모든 Tournament 조회
curl http://localhost:3000/api/tournaments

# Stream ID는 tournaments[].events[].streams[].id 에 있습니다
```

또는 Firestore Console에서 직접 조회:
- 경로: `streams` 컬렉션

## 카드 표기법

### 카드 rank (랭크)
- `A`: Ace
- `K`: King
- `Q`: Queen
- `J`: Jack
- `T`: Ten
- `2-9`: 숫자 그대로

### 카드 suit (슈트)
- `h`: Hearts (하트)
- `d`: Diamonds (다이아)
- `c`: Clubs (클로버)
- `s`: Spades (스페이드)

### 예시
- `AhKh`: Ace of Hearts, King of Hearts (하트 A, K)
- `QdQs`: Queen of Diamonds, Queen of Spades (다이아 Q, 스페이드 Q)
- `7c3s`: 7 of Clubs, 3 of Spades (클로버 7, 스페이드 3)

## 주의사항

1. **플레이어 자동 생성**: DB에 없는 플레이어는 자동으로 생성됩니다.
2. **중복 방지**: 같은 핸드를 두 번 import하면 중복으로 저장됩니다. 외부 시스템에서 중복을 관리하세요.
3. **트랜잭션 없음**: 일부 핸드만 실패할 수 있습니다. 응답의 `failed`와 `errors`를 확인하세요.
4. **타임스탬프 형식**: `startTime-endTime` 형식으로 DB에 저장됩니다.

## TypeScript 타입 정의

전체 타입 정의는 `/lib/types/hand-history.ts`에서 확인할 수 있습니다:

```typescript
import type { HandHistory, ImportHandsRequest, ImportHandsResponse } from '@/lib/types/hand-history'
```

## 문제 해결

### "Day를 찾을 수 없습니다" 에러
- Day ID가 올바른지 확인하세요
- Supabase에서 해당 Day가 존재하는지 확인하세요

### 플레이어가 중복 생성됩니다
- 플레이어 이름의 대소문자와 공백을 정확히 일치시키세요
- 예: "Daniel Negreanu" ≠ "daniel negreanu" ≠ "DanielNegreanu"

### 핸드가 Archive 페이지에 표시되지 않습니다
- 페이지를 새로고침하세요
- 올바른 Day를 선택했는지 확인하세요
- 브라우저 개발자 도구의 Console에서 에러를 확인하세요

## 다음 단계

1. 외부 분석 시스템을 개발합니다
2. 분석 결과를 이 API 형식에 맞게 변환합니다
3. API를 호출하여 Templar Archives에 핸드를 import합니다
4. Archive 페이지에서 결과를 확인합니다

## 지원

문제가 있으면 GitHub Issues에 등록해주세요.
