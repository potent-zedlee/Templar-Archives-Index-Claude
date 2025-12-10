# React Query 개발자 가이드

> Templar Archives에서 React Query를 사용한 데이터 페칭 패턴

**마지막 업데이트**: 2025-12-10
**버전**: 1.2

---

## 📚 목차

1. [개요](#개요)
2. [설정](#설정)
3. [Query 파일 구조](#query-파일-구조)
4. [기본 사용법](#기본-사용법)
5. [Mutations](#mutations)
6. [Optimistic Updates](#optimistic-updates)
7. [캐시 전략](#캐시-전략)
8. [모범 사례](#모범-사례)
9. [문제 해결](#문제-해결)

---

## 개요

Templar Archives는 **@tanstack/react-query 5.90.5** + **@tanstack/react-virtual 3.13.12**를 사용하여 서버 상태와 가상 스크롤을 관리합니다.

### 왜 React Query?

- **자동 캐싱**: 서버 응답을 자동으로 캐싱하여 불필요한 네트워크 요청 감소
- **낙관적 업데이트**: 즉각적인 UI 반응으로 UX 개선
- **자동 재시도**: 실패한 요청 자동 재시도
- **디바운싱/쓰로틀링**: 중복 요청 방지
- **동기화**: 여러 컴포넌트에서 동일한 데이터 자동 동기화

### 상태 관리 전략

- **UI 상태**: Zustand (archive-ui-store, filter-store 등)
- **서버 상태**: React Query (데이터 페칭, 캐싱, 동기화)

---

## 설정

### 1. 프로바이더 설정

`components/providers.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,        // 1분
            gcTime: 5 * 60 * 1000,        // 5분
            refetchOnWindowFocus: false,  // 윈도우 포커스 시 재요청 비활성화
            retry: 1,                     // 실패 시 1회 재시도
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools
          initialIsOpen={false}
          position="bottom-right"
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  )
}
```

### 2. DevTools (개발 환경)

React Query DevTools는 개발 환경에서만 렌더링됩니다:
- Tree shaking으로 프로덕션 빌드에서 자동 제거
- 우측 하단 버튼으로 열기/닫기
- 쿼리 상태, 캐시 내용, 타임라인 확인 가능

---

## Query 파일 구조

모든 React Query 훅은 `lib/queries/` 디렉토리에 도메인별로 구성됩니다.

### 디렉토리 구조

```
lib/queries/
├── archive-queries.ts         # Tournament/SubEvent/Stream/Hands
├── category-queries.ts        # 카테고리 조회
├── community-queries.ts       # 커뮤니티 포스트
├── search-queries.ts          # 검색 및 필터
├── players-queries.ts         # 플레이어 관련
├── player-stats-queries.ts    # 플레이어 통계 ⭐
├── profile-queries.ts         # 유저 프로필
├── bookmarks-queries.ts       # 북마크
├── edit-requests-queries.ts   # 핸드 수정 제안
├── kan-queries.ts             # KAN 분석 작업 모니터링 ⭐
├── notification-queries.ts    # 알림
└── ... (총 20개 파일)
```

**주요 쿼리 파일**:
- `archive-queries.ts` - Tournament/SubEvent/Stream/Hands 계층 조회
- `players-queries.ts` - 플레이어 통계 및 프로필
- `kan-queries.ts` - Cloud Run 영상 분석 작업 상태 폴링

### 파일 구조 패턴

각 query 파일은 다음 구조를 따릅니다:

```tsx
// 1. Import
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 관련함수들 } from "@/lib/domain"

// 2. Query Keys (계층적 구조)
export const domainKeys = {
  all: ['domain'] as const,
  lists: () => [...domainKeys.all, 'list'] as const,
  list: (filters: string) => [...domainKeys.lists(), { filters }] as const,
  details: () => [...domainKeys.all, 'detail'] as const,
  detail: (id: string) => [...domainKeys.details(), id] as const,
}

// 3. Query Hooks
export function useDomainQuery(id: string) {
  return useQuery({
    queryKey: domainKeys.detail(id),
    queryFn: () => fetchDomain(id),
    staleTime: 2 * 60 * 1000, // 2분
  })
}

// 4. Mutation Hooks
export function useUpdateDomainMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => updateDomain(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: domainKeys.all })
    },
  })
}
```

---

## 기본 사용법

### useQuery: 데이터 읽기

```tsx
import { usePlayerQuery } from "@/lib/queries/players-queries"

function PlayerDetail({ playerId }: { playerId: string }) {
  const { data: player, isLoading, error } = usePlayerQuery(playerId)

  if (isLoading) return <Spinner />
  if (error) return <ErrorMessage error={error} />
  if (!player) return <NotFound />

  return <div>{player.name}</div>
}
```

### useQuery 옵션

```tsx
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['players', playerId],
  queryFn: () => fetchPlayer(playerId),

  // 캐시 옵션
  staleTime: 5 * 60 * 1000,     // 5분 동안 fresh 상태 유지
  gcTime: 10 * 60 * 1000,        // 10분 후 가비지 컬렉션

  // 재요청 옵션
  refetchOnWindowFocus: false,   // 윈도우 포커스 시 재요청 비활성화
  refetchOnMount: true,          // 마운트 시 재요청 (stale일 때만)

  // 조건부 실행
  enabled: !!playerId,           // playerId가 있을 때만 실행

  // 재시도
  retry: 1,                      // 실패 시 1회 재시도
})
```

---

## Mutations

### useMutation: 데이터 쓰기

```tsx
import { useUpdatePlayerPhotoMutation } from "@/lib/queries/players-queries"

function UploadPhoto({ playerId }: { playerId: string }) {
  const updatePhotoMutation = useUpdatePlayerPhotoMutation(playerId)

  const handleUpload = async (file: File) => {
    try {
      await updatePhotoMutation.mutateAsync({ file })
      toast.success('사진이 업로드되었습니다')
    } catch (error) {
      toast.error('업로드 실패')
    }
  }

  return (
    <input
      type="file"
      onChange={(e) => handleUpload(e.target.files[0])}
      disabled={updatePhotoMutation.isPending}
    />
  )
}
```

### useMutation 콜백

```tsx
export function useUpdatePlayerPhotoMutation(playerId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ file }: { file: File }) => {
      return await uploadPlayerPhoto(playerId, file)
    },

    // 성공 시
    onSuccess: (data) => {
      // 특정 쿼리 무효화
      queryClient.invalidateQueries({
        queryKey: playersKeys.detail(playerId)
      })

      // 또는 모든 플레이어 쿼리 무효화
      queryClient.invalidateQueries({
        queryKey: playersKeys.all
      })
    },

    // 실패 시
    onError: (error) => {
      console.error('Upload failed:', error)
    },

    // 완료 시 (성공/실패 상관없이)
    onSettled: () => {
      console.log('Upload completed')
    },
  })
}
```

---

## Optimistic Updates

즉각적인 UI 반응을 위한 낙관적 업데이트 패턴입니다.

### 예제: 포스트 좋아요

`lib/queries/community-queries.ts`:

```tsx
export function useLikePostMutation(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ postId }: { postId: string }) => {
      return await togglePostLike(postId, userId)
    },

    // 1. 요청 전: 낙관적으로 UI 업데이트
    onMutate: async ({ postId }) => {
      // 진행 중인 쿼리 취소 (경쟁 조건 방지)
      await queryClient.cancelQueries({
        queryKey: communityKeys.post(postId)
      })

      // 이전 데이터 백업
      const previousPost = queryClient.getQueryData<Post>(
        communityKeys.post(postId)
      )

      // 낙관적 업데이트
      if (previousPost) {
        queryClient.setQueryData<Post>(
          communityKeys.post(postId),
          {
            ...previousPost,
            likes_count: previousPost.likes_count + 1,
          }
        )
      }

      // 롤백용 컨텍스트 반환
      return { previousPost }
    },

    // 2. 실패 시: 롤백
    onError: (err, { postId }, context) => {
      if (context?.previousPost) {
        queryClient.setQueryData(
          communityKeys.post(postId),
          context.previousPost
        )
      }
    },

    // 3. 완료 시: 최신 데이터로 동기화
    onSettled: ({ postId }) => {
      queryClient.invalidateQueries({
        queryKey: communityKeys.post(postId)
      })
    },
  })
}
```

### 사용 예제

```tsx
function PostLikeButton({ postId }: { postId: string }) {
  const { user } = useAuth()
  const likePostMutation = useLikePostMutation(user?.id || "")

  const handleLike = () => {
    likePostMutation.mutate({ postId })
  }

  return (
    <button
      onClick={handleLike}
      disabled={likePostMutation.isPending}
    >
      좋아요
    </button>
  )
}
```

---

## 캐시 전략

### staleTime vs gcTime

```tsx
{
  staleTime: 60 * 1000,      // 1분: 이 시간 동안 "fresh" 상태 유지
                             // fresh 상태일 때는 재요청하지 않음

  gcTime: 5 * 60 * 1000,     // 5분: 이 시간이 지나면 캐시에서 제거
                             // (이전 cacheTime)
}
```

### 데이터 특성별 전략

```tsx
// 거의 변하지 않는 데이터 (토너먼트 목록, 플레이어 목록)
staleTime: 10 * 60 * 1000,  // 10분

// 자주 변하는 데이터 (포스트 목록, 댓글)
staleTime: 1 * 60 * 1000,   // 1분

// 실시간 데이터 (라이브 스트림)
staleTime: 0,               // 항상 재요청
```

### 수동 캐시 조작

```tsx
const queryClient = useQueryClient()

// 1. 캐시에서 데이터 읽기
const player = queryClient.getQueryData<Player>(
  playersKeys.detail(playerId)
)

// 2. 캐시에 데이터 쓰기
queryClient.setQueryData<Player>(
  playersKeys.detail(playerId),
  updatedPlayer
)

// 3. 특정 쿼리 무효화 (다음 접근 시 재요청)
queryClient.invalidateQueries({
  queryKey: playersKeys.detail(playerId)
})

// 4. 모든 플레이어 쿼리 무효화
queryClient.invalidateQueries({
  queryKey: playersKeys.all
})

// 5. 즉시 재요청
queryClient.refetchQueries({
  queryKey: playersKeys.detail(playerId)
})
```

---

## 모범 사례

### 1. Query Keys는 계층적으로 구성

```tsx
// ✅ 좋은 예: 계층적 구조
export const playersKeys = {
  all: ['players'] as const,
  lists: () => [...playersKeys.all, 'list'] as const,
  list: (filters: string) => [...playersKeys.lists(), { filters }] as const,
  details: () => [...playersKeys.all, 'detail'] as const,
  detail: (id: string) => [...playersKeys.details(), id] as const,
}

// ❌ 나쁜 예: 평면적 구조
const playerKey = ['player', id]
const playersKey = ['players']
```

**이점**:
- 부분 무효화 가능: `invalidateQueries({ queryKey: playersKeys.all })`
- 타입 안정성
- 일관성 있는 네이밍

### 2. 조건부 실행 활용

```tsx
// ✅ 좋은 예: enabled 옵션 사용
const { data } = usePlayerQuery(playerId, {
  enabled: !!playerId  // playerId가 있을 때만 실행
})

// ❌ 나쁜 예: 조건문으로 분기
if (playerId) {
  const { data } = usePlayerQuery(playerId)  // Hook 조건부 호출 (에러!)
}
```

### 3. 디바운싱 구현

```tsx
// 닉네임 중복 체크 예제
function NicknameInput() {
  const [nickname, setNickname] = useState("")
  const [nicknameForCheck, setNicknameForCheck] = useState("")

  // 500ms 디바운싱
  useEffect(() => {
    const timer = setTimeout(() => {
      setNicknameForCheck(nickname)
    }, 500)

    return () => clearTimeout(timer)
  }, [nickname])

  // 디바운스된 값으로 쿼리
  const { data: isAvailable } = useCheckNicknameQuery(
    nicknameForCheck,
    userId,
    nicknameForCheck !== "" // enabled 옵션
  )

  return (
    <input
      value={nickname}
      onChange={(e) => setNickname(e.target.value)}
    />
  )
}
```

### 4. useMemo로 파생 데이터 계산

```tsx
function BookmarksList() {
  const { data: bookmarks = [] } = useBookmarksQuery(userId)

  // ✅ 좋은 예: useMemo로 메모이제이션
  const folders = useMemo(() => {
    const folderSet = new Set(
      bookmarks.map(b => b.folder_name || 'Default')
    )
    return Array.from(folderSet).sort()
  }, [bookmarks])

  // ❌ 나쁜 예: 매 렌더링마다 계산
  const folders = Array.from(
    new Set(bookmarks.map(b => b.folder_name || 'Default'))
  ).sort()
}
```

### 5. 에러 처리

```tsx
function PlayerDetail({ playerId }: { playerId: string }) {
  const { data: player, isLoading, error } = usePlayerQuery(playerId)

  // ✅ 좋은 예: 모든 상태 처리
  if (isLoading) return <Spinner />
  if (error) return <ErrorMessage error={error} />
  if (!player) return <NotFound />

  return <div>{player.name}</div>
}
```

---

## 문제 해결

### 1. "Rendered more hooks than during the previous render"

**원인**: Hook을 조건문 안에서 호출

```tsx
// ❌ 잘못된 코드
if (playerId) {
  const { data } = usePlayerQuery(playerId)
}

// ✅ 올바른 코드
const { data } = usePlayerQuery(playerId, {
  enabled: !!playerId
})
```

### 2. 데이터가 자동으로 업데이트되지 않음

**원인**: Query Key 불일치 또는 무효화 누락

```tsx
// ✅ Mutation 후 무효화 확인
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: domainKeys.all })
}
```

### 3. 너무 많은 재요청

**원인**: staleTime이 0이거나 refetchOnWindowFocus가 true

```tsx
// ✅ staleTime 설정
{
  staleTime: 5 * 60 * 1000,        // 5분
  refetchOnWindowFocus: false,     // 윈도우 포커스 비활성화
}
```

### 4. 메모리 누수

**원인**: gcTime이 너무 길거나 무한대

```tsx
// ✅ 적절한 gcTime 설정
{
  gcTime: 5 * 60 * 1000,  // 5분 후 캐시에서 제거
}
```

### 5. DevTools가 프로덕션에 포함됨

**원인**: 조건부 렌더링 누락

```tsx
// ✅ 개발 환경에서만 렌더링
{process.env.NODE_ENV === 'development' && (
  <ReactQueryDevtools />
)}
```

---

## 참고 자료

### 공식 문서
- [TanStack Query 공식 문서](https://tanstack.com/query/latest)
- [React Query v5 마이그레이션 가이드](https://tanstack.com/query/latest/docs/react/guides/migrating-to-v5)

### 프로젝트 파일
- `lib/queries/` - 모든 React Query 훅
- `components/providers.tsx` - QueryClient 설정
- 각 페이지 컴포넌트 - 사용 예제

### 추가 문서
- [../CLAUDE.md](../CLAUDE.md) - 전체 프로젝트 문서
- [../ROADMAP.md](../ROADMAP.md) - 개발 로드맵

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2025-12-10 | 1.2 | @tanstack/react-virtual 3.13.12 추가, 문서 날짜 동기화 |
| 2025-11-23 | 1.1 | React Query 5.90.5 버전 업데이트, 쿼리 파일 목록 갱신 |
| 2025-10-20 | 1.0 | 초기 문서 생성 |

---

**작성자**: Claude Code
**프로젝트**: Templar Archives
**버전**: 1.2 (2025-12-10)
