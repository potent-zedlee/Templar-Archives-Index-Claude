# 네이밍 컨벤션 가이드

> **Templar Archives** 프로젝트의 일관된 네이밍 규칙

**마지막 업데이트**: 2025-12-10
**버전**: 1.2

---

## 📋 목차

1. [개요](#개요)
2. [테이블명](#테이블명)
3. [컬럼명](#컬럼명)
4. [인덱스명](#인덱스명)
5. [함수 및 트리거명](#함수-및-트리거명)
6. [마이그레이션 파일명](#마이그레이션-파일명)
7. [코드 네이밍](#코드-네이밍)

---

## 개요

### 목적
- **일관성**: 모든 개발자가 동일한 규칙 적용
- **가독성**: 이름만으로 역할 파악 가능
- **유지보수**: 코드 검색 및 수정 용이

### 언어
- **데이터베이스**: 영어 (snake_case)
- **코드**: 영어 (camelCase, PascalCase)
- **주석/문서**: 한글 + 영어

---

## 테이블명

### 기본 규칙

1. **복수형 사용**
   ```
   ✅ users, players, hands, tournaments
   ❌ user, player, hand, tournament
   ```

2. **snake_case**
   ```
   ✅ hand_players, hand_actions, player_stats_cache
   ❌ handPlayers, hand-players, HandPlayers
   ```

3. **간결하고 명확하게**
   ```
   ✅ notifications (O)
   ❌ user_notifications (너무 구체적)
   ❌ notifs (너무 축약)
   ```

### 관계 테이블 (Junction Table)

**패턴**: `{entity1}_{entity2}` (알파벳 순)

```sql
✅ hand_players  (hands ↔ players)
✅ post_tags     (posts ↔ tags)

❌ player_hands  (순서 틀림)
❌ hands_to_players (불필요한 to)
```

### 캐시 테이블

**패턴**: `{entity}_cache` 또는 `{entity}_{feature}_cache`

```sql
✅ player_stats_cache
✅ tournament_summary_cache

❌ cached_player_stats (형용사 앞에)
❌ cache_player_stats (명사 뒤에)
```

### 임시 테이블

**패턴**: `temp_{entity}` 또는 `{entity}_temp`

```sql
✅ temp_migrations
✅ unsorted_videos (임시 상태를 나타내는 형용사 사용)

❌ temporary_data (너무 일반적)
```

---

## 컬럼명

### 기본 규칙

1. **snake_case**
   ```sql
   ✅ user_id, created_at, total_winnings
   ❌ userId, CreatedAt, totalWinnings
   ```

2. **명확한 의미**
   ```sql
   ✅ starting_stack, ending_stack
   ❌ stack1, stack2 (숫자 사용 금지)
   ```

3. **단위 명시 (필요 시)**
   ```sql
   ✅ duration_minutes, file_size_bytes
   ❌ duration, file_size (단위 불명확)
   ```

### Primary Key

**패턴**: `id` (UUID)

```sql
✅ id UUID PRIMARY KEY DEFAULT uuid_generate_v4()

❌ user_id (PK는 단순히 id)
❌ uuid (타입명 사용 금지)
```

### Foreign Key

**패턴**: `{referenced_table_singular}_id`

```sql
✅ tournament_id → tournaments(id)
✅ player_id → players(id)
✅ hand_id → hands(id)

❌ tournament → tournaments(id) (생략 금지)
❌ t_id → tournaments(id) (축약 금지)
```

### Boolean 필드

**패턴**: `is_{adjective}`, `has_{noun}`, `{verb}_at`

```sql
✅ is_organized, is_public, is_banned
✅ has_video, has_actions
✅ completed_at (NULL = not completed)

❌ organized (동사/형용사 구분 불명확)
❌ video (명사만)
```

### 날짜/시간 필드

**패턴**: `{event}_at` (TIMESTAMPTZ) 또는 `{event}_date` (DATE)

```sql
✅ created_at, updated_at, deleted_at, published_at
✅ start_date, end_date

❌ create_time (time 사용 금지)
❌ creation_date (명사형 선호)
```

### 카운터 필드 (캐시)

**패턴**: `{entity}_count`

```sql
✅ likes_count, comments_count, hands_count

❌ total_likes (total 생략)
❌ number_of_comments (너무 장황)
```

### JSON 필드

**패턴**: `{entity}_metadata` 또는 `{specific_name}`

```sql
✅ analysis_metadata, positional_stats
✅ settings, preferences

❌ json_data (타입명 사용 금지)
❌ extra_fields (너무 일반적)
```

---

## 인덱스명

### 기본 규칙

**패턴**: `idx_{table}_{column(s)}` 또는 `idx_{table}_{purpose}`

```sql
✅ idx_hands_stream_id
✅ idx_players_name
✅ idx_hand_actions_hand_player (복합 인덱스)

❌ hands_stream_id_idx (접두사 규칙 위반)
❌ index_1 (의미 없는 이름)
```

### 복합 인덱스

**패턴**: `idx_{table}_{col1}_{col2}_{col3}`

```sql
✅ idx_hand_actions_hand_player_sequence
✅ idx_notifications_user_read

❌ idx_hand_actions_composite (purpose 불명확)
```

### Unique 인덱스

**패턴**: `unq_{table}_{column(s)}`

```sql
✅ unq_players_name
✅ unq_hand_players_hand_player

❌ idx_players_name_unique (idx vs unq 혼용)
```

### GIN 인덱스 (Full-Text Search)

**패턴**: `idx_{table}_{search_type}`

```sql
✅ idx_posts_search
✅ idx_hands_board_cards

❌ posts_fts_idx (약어 사용 금지)
```

### Partial 인덱스

**패턴**: `idx_{table}_{column}_where_{condition}`

```sql
✅ idx_streams_organized_where_false
✅ idx_player_stats_cache_style_where_not_null

❌ idx_streams_organized (조건 명시 안 됨)
```

---

## 함수 및 트리거명

### 함수명

**패턴**: `{verb}_{object}` (snake_case)

```sql
✅ invalidate_player_stats_cache()
✅ update_hand_likes_count()
✅ cleanup_old_security_events()

❌ InvalidatePlayerStatsCache() (PascalCase 금지)
❌ player_stats_invalidate() (동사 뒤로)
```

### 트리거명

**패턴**: `trigger_{action}_{table}` 또는 `trigger_{purpose}`

```sql
✅ trigger_invalidate_stats_on_hand_actions
✅ trigger_update_hand_likes_count
✅ trigger_create_notification_on_comment

❌ hand_actions_trigger (접두사 규칙 위반)
❌ trg_invalidate (약어 사용 금지)
```

### RLS 정책명

**패턴**: `{table}_{operation}_{role/condition}`

```sql
✅ hands_select_public
✅ hands_insert_admin
✅ posts_update_author
✅ users_select_self_or_admin

❌ select_hands (순서 틀림)
❌ hand_select_policy (불필요한 policy)
```

---

## 마이그레이션 파일명

### 패턴

**패턴**: `YYYYMMDD{sequence}_

{action}_{subject}.sql`

```bash
✅ 20251102000001_add_player_stats_cache.sql
✅ 20241001000002_add_players.sql
✅ 20251024000003_fix_rls_admin_only.sql

❌ migration_001.sql (날짜 없음)
❌ 2025-11-02-add-cache.sql (하이픈 사용)
❌ player_stats_cache.sql (날짜 없음)
```

### Action 동사

| 동사 | 용도 | 예시 |
|------|------|------|
| `add` | 테이블/컬럼 추가 | add_players.sql |
| `create` | 함수/트리거/인덱스 생성 | create_indexes.sql |
| `drop` | 테이블/컬럼 삭제 | drop_timecode_system.sql |
| `fix` | 버그 수정 | fix_rls_policies.sql |
| `update` | 기존 항목 수정 | update_hand_metadata.sql |
| `rename` | 이름 변경 | rename_days_to_streams.sql |
| `consolidate` | 통합 | consolidate_rls_policies.sql |
| `optimize` | 성능 개선 | optimize_indexes.sql |

### 시퀀스 번호

같은 날짜에 여러 마이그레이션 생성 시:

```bash
20251102000001_add_player_stats_cache.sql
20251102000002_update_hand_metadata.sql
20251102000003_create_new_indexes.sql
```

### 특수 케이스

- **초기화**: `000_init_migration_history.sql`
- **대규모 제거**: `YYYYMMDD999999_drop_{system}.sql`
  - 예: `20251029999999_drop_timecode_system.sql`

---

## 코드 네이밍

### TypeScript 타입

**패턴**: PascalCase

```typescript
✅ interface PlayerStatistics { }
✅ type PlayStyle = 'TAG' | 'LAG'
✅ enum VideoSource { }

❌ interface player_statistics { }
❌ type playStyle { }
```

### 함수/변수

**패턴**: camelCase

```typescript
✅ const playerStats = await calculatePlayerStatistics()
✅ function fetchPlayerActions(playerId: string) { }

❌ const player_stats = ...
❌ function FetchPlayerActions() { }
```

### 컴포넌트

**패턴**: PascalCase

```typescript
✅ function PlayerStatsCard() { }
✅ export const ArchiveToolbar: React.FC = () => { }

❌ function playerStatsCard() { }
❌ export const archiveToolbar
```

### 상수

**패턴**: UPPER_SNAKE_CASE

```typescript
✅ const MAX_FILE_SIZE = 5 * 1024 * 1024
✅ const API_BASE_URL = 'https://api.example.com'

❌ const maxFileSize = ...
❌ const api_base_url = ...
```

### React Query 키

**패턴**: 배열, 계층적

```typescript
✅ ['players', 'detail', playerId]
✅ ['hands', 'list', { streamId, filters }]

❌ 'player-detail-123' (문자열)
❌ ['playerDetail', playerId] (camelCase)
```

### Zustand Store

**패턴**: use{Name}Store

```typescript
✅ const useArchiveDataStore = create<ArchiveDataStore>()
✅ const useFilterStore = create<FilterStore>()

❌ const archiveDataStore = ... (use 접두사 필수)
❌ const useArchiveData = ... (Store 접미사 필수)
```

---

## 파일명

### 컴포넌트 파일

**패턴**: PascalCase.tsx (2025-11 업데이트)

```bash
✅ PlayerStatsCard.tsx
✅ ArchiveToolbar.tsx
✅ HandDetailPanel.tsx

❌ player-stats-card.tsx (kebab-case 금지 - 과거 방식)
❌ player_stats_card.tsx (snake_case 금지)
```

**참고**: 2025-11 업데이트로 컴포넌트 파일명은 PascalCase를 사용합니다.
이는 컴포넌트 이름과 파일명의 일관성을 위한 것입니다.

### 라이브러리 파일

**패턴**: kebab-case.ts

```bash
✅ player-stats.ts
✅ hand-bookmarks.ts
✅ filter-utils.ts
✅ auth-utils.ts

❌ playerStats.ts (camelCase 금지)
```

### 유틸리티 파일

**패턴**: 역할을 나타내는 단일 단어 또는 kebab-case

```bash
✅ utils.ts, helpers.ts, constants.ts
✅ toast-utils.ts, auth-utils.ts

❌ utilities.ts (너무 장황)
```

---

## 약어 사용 금지

### 권장하지 않는 약어

| 약어 | 올바른 표현 |
|------|------------|
| ❌ usr | ✅ user |
| ❌ pwd | ✅ password |
| ❌ msg | ✅ message |
| ❌ btn | ✅ button |
| ❌ trx | ✅ transaction |
| ❌ avg | ✅ average (또는 avg 허용 - 업계 표준) |

### 허용되는 약어 (업계 표준)

| 약어 | 의미 |
|------|------|
| ✅ id | identifier |
| ✅ url | Uniform Resource Locator |
| ✅ uuid | Universally Unique Identifier |
| ✅ api | Application Programming Interface |
| ✅ rls | Row Level Security |
| ✅ vpip | Voluntarily Put In Pot (포커 용어) |
| ✅ pfr | Pre-Flop Raise (포커 용어) |
| ✅ ats | Attempt To Steal (포커 용어) |

---

## 예외 및 특수 케이스

### 1. 레거시 테이블

기존 프로덕션 테이블명 변경 금지. 새 테이블만 규칙 적용.

### 2. 외부 API 연동

외부 API 응답 키는 원본 유지 (camelCase 변환은 코드에서 처리)

```typescript
// API 응답 (외부)
{ userId: "123", userName: "John" }

// 데이터베이스 (내부)
{ user_id: "123", user_name: "John" }
```

### 3. 포커 용어

포커 업계 표준 약어/용어는 그대로 사용:
- VPIP, PFR, 3-Bet, ATS (약어)
- BTN, SB, BB, CO, UTG (포지션)

---

## 검증 체크리스트

새로운 테이블/컬럼 추가 시:

- [ ] 테이블명은 복수형인가?
- [ ] snake_case 규칙을 따르는가?
- [ ] Foreign Key는 `{table}_id` 형식인가?
- [ ] Boolean 필드는 `is_`, `has_` 접두사를 사용하는가?
- [ ] 인덱스명은 `idx_{table}_{column(s)}` 형식인가?
- [ ] 함수명은 동사로 시작하는가?
- [ ] 약어 사용을 피했는가? (업계 표준 제외)

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2025-12-10 | 1.2 | 문서 날짜 동기화, Cash Game 기능 제거 반영 |
| 2025-11-23 | 1.1 | 컴포넌트 파일명 PascalCase 규칙 업데이트 |
| 2025-11-02 | 1.0 | 초기 문서 생성 |

---

**문서 관리자**: Claude (Anthropic AI)
**참고**: 프로젝트의 모든 개발자는 이 가이드를 준수해야 합니다.
