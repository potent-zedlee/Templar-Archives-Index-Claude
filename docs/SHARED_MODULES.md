# Shared Modules Documentation
 
 이 문서는 프로젝트 전반에서 사용되는 재사용 가능한 모듈, 컴포넌트, 유틸리티에 대해 설명합니다.
 
 ---
 
 ## 1. Common UI Components (`components/common`)
 
 ### IconBadge
 
 아이콘, 텍스트, 라벨을 조합하여 배지 형태로 표시하는 컴포넌트입니다.
 
 **경로**: `@/components/common/IconBadge`
 
 **Props**:
 
 | Prop | Type | Default | Description |
 |------|------|---------|-------------|
 | `icon` | `LucideIcon` | - | Lucide React 아이콘 컴포넌트 |
 | `value` | `number \| string` | - | 표시할 주요 값 |
 | `label` | `string` | - | 보조 라벨 (size="lg"일 때만 표시) |
 | `variant` | `'default' \| 'primary' \| 'success' \| 'warning' \| 'destructive'` | 'default' | 배지 스타일 변형 |
 | `size` | `'sm' \| 'md' \| 'lg'` | 'md' | 크기 조절 |
 
 **사용 예시**:
 
 ```tsx
 import { IconBadge } from "@/components/common/IconBadge"
 import { Users, Trophy } from "lucide-react"
 
 // 기본 (회색)
 <IconBadge icon={Users} value={100} />
 
 // 강조 (금색)
 <IconBadge icon={Trophy} value="Winner" variant="primary" />
 
 // 성공 (초록색)
 <IconBadge icon={Users} value={50} variant="success" size="sm" />
 ```
 
 ---
 
 ## 2. Utilities (`lib/utils`)
 
 ### Poker Formatting (`poker-formatting.ts`)
 
 포커 관련 수치(칩, 블라인드)를 표준 형식으로 변환하는 유틸리티입니다.
 
 **경로**: `@/lib/utils/poker-formatting`
 
 #### `formatChips(chips: number): string`
 
 칩 개수를 읽기 쉬운 문자열로 변환합니다. (K/M 접미사 사용)
 
 - `1500` -> `"1.5k"`
 - `1000000` -> `"1M"`
 - `500` -> `"500"`
 
 #### `formatBlinds(sb?: number, bb?: number, ante?: number): string`
 
 블라인드와 앤티를 표준 형식(`SB/BB/Ante`)으로 조합합니다.
 
 - `formatBlinds(500, 1000, 1000)` -> `"500/1k/1k"`
 - `formatBlinds(100, 200)` -> `"100/200"`
 
 **사용 예시**:
 
 ```tsx
 import { formatBlinds, formatChips } from "@/lib/utils/poker-formatting"
 
 <div>{formatBlinds(hand.sb, hand.bb, hand.ante)}</div>
 ```
 
 ---
 
 **마지막 업데이트**: 2025-12-07
