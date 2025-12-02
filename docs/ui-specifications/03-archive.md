# 아카이브 페이지 (Archive Page)

## 📄 페이지 정보

- **라우트**: `/archive`
- **파일**: `app/archive/page.tsx`
- **목적**: 토너먼트 → 서브이벤트 → Day 계층 구조로 영상 및 핸드 관리
- **접근 권한**: 공개

---

## 🎯 주요 기능

1. **계층적 트리 탐색** (Tournament > SubEvent > Day)
2. **비디오 재생** (YouTube/Upload/NAS)
3. **영상 분석 통합** (분석 상태 표시 및 시작)
4. **핸드 목록 표시**
5. **Tournament/SubEvent/Day 추가** (Dialog)
6. **핸드 즐겨찾기 토글**

---

## 🏗 UI 구조

### Resizable 2-Panel 레이아웃
```
ArchivePage (/archive)
├── Header
│
└── ResizablePanelGroup (horizontal)
    ├── Left Panel (25% ~ 40%)
    │   ├── "Events" Header + Add Button
    │   ├── ScrollArea
    │   │   └── Hierarchical Tree
    │   │       ├── Tournament
    │   │       │   ├── ChevronDown/Right Icon
    │   │       │   ├── Category Badge
    │   │       │   ├── Name
    │   │       │   └── Add SubEvent Button
    │   │       │
    │   │       ├── SubEvent (if expanded)
    │   │       │   ├── ChevronDown/Right Icon
    │   │       │   ├── Name
    │   │       │   └── Add Day Button
    │   │       │
    │   │       └── Day (if expanded)
    │   │           └── Selectable Item
    │   │
    │   ├── SubEvent Dialog
    │   └── Day/Video Dialog (3 tabs: NAS/YouTube/Upload)
    │
    ├── ResizableHandle
    │
    └── Right Panel (60% ~ 75%)
        ├── Video Player Card
        │   ├── Tournament Name + Download Button
        │   ├── VideoPlayer Component
        │   │   ├── YouTube iframe (if youtube)
        │   │   ├── <video> tag (if upload/nas)
        │   │   └── Placeholder (no source)
        │   │
        │   └── Analysis Section (if day selected)
        │       ├── Status Display
        │       │   ├── CheckCircle + "분석완료" (if hands exist)
        │       │   └── Play + "분석 준비됨" (if no hands)
        │       │
        │       └── Analyze Button (if no hands)
        │           └── "분석 시작" Button
        │
        └── Hand History Card
            ├── "Hand History" Title
            └── ScrollArea (h-400px)
                └── Hand List
                    ├── Checkbox
                    ├── Star (favorite toggle)
                    ├── Hand Number
                    ├── Description
                    ├── Timestamp
                    └── Comment Button
```

---

## 🔄 주요 인터랙션

### 1. 트리 탐색
```tsx
// Tournament 확장/축소
const toggleTournament = (id) => {
  setTournaments(prev => prev.map(t =>
    t.id === id ? { ...t, expanded: !t.expanded } : t
  ))
}

// Stream 선택
const selectStream = (streamId) => {
  setSelectedStream(streamId)
  setTournaments(prev => prev.map(t => ({
    ...t,
    events: t.events?.map(e => ({
      ...e,
      streams: e.streams?.map(s => ({
        ...s,
        selected: s.id === streamId
      }))
    }))
  })))
}
```

### 2. 비디오 소스 처리
```tsx
// Day 추가 시 3가지 소스 선택
const [videoSourceTab, setVideoSourceTab] = useState<'nas' | 'youtube' | 'upload'>('nas')

// NAS: video_nas_path 저장
// YouTube: video_url 저장
// Upload: Supabase Storage 업로드 후 video_file 저장
```

### 3. 분석 상태 표시
```tsx
// 분석 상태 확인
{selectedDay && (
  <div className="mt-4 flex items-center justify-between p-4 border rounded-lg">
    <div className="flex items-center gap-3">
      {hands.length > 0 ? (
        <>
          <CheckCircle className="h-5 w-5 text-green-500" />
          <div>
            <p>분석완료</p>
            <p>{hands.length}개의 핸드 발견</p>
          </div>
        </>
      ) : (
        <>
          <Play className="h-5 w-5 text-primary" />
          <div>
            <p>분석 준비됨</p>
            <p>이 영상을 분석하여 핸드를 추출하세요</p>
          </div>
        </>
      )}
    </div>
    {hands.length === 0 && (
      <Button onClick={() => toast.info('분석 기능은 곧 출시됩니다')}>
        분석 시작
      </Button>
    )}
  </div>
)}
```

### 4. 핸드 즐겨찾기
```tsx
const toggleFavorite = async (handId) => {
  const hand = hands.find(h => h.id === handId)

  try {
    await supabase
      .from('hands')
      .update({ favorite: !hand.favorite })
      .eq('id', handId)

    setHands(prev => prev.map(h =>
      h.id === handId ? { ...h, favorite: !h.favorite } : h
    ))
  } catch (error) {
    console.error(error)
  }
}
```

---

## 📊 데이터 흐름

### 최적화된 쿼리 (N+1 해결)
```tsx
// fetchTournamentsTree 사용
const tournamentsData = await fetchTournamentsTree()

// UI 상태 추가
const tournamentsWithUIState = tournamentsData.map(tournament => ({
  ...tournament,
  events: tournament.events?.map(event => ({
    ...event,
    streams: event.streams?.map(stream => ({ ...stream, selected: false })),
    expanded: false,
  })),
  expanded: true,
}))
```

### 핸드 로딩
```tsx
// Day 선택 시 핸드 로딩
useEffect(() => {
  if (selectedDay) {
    loadHands(selectedDay)
  }
}, [selectedDay])

const loadHands = async (dayId) => {
  const { data } = await supabase
    .from('hands')
    .select('*')
    .eq('day_id', dayId)
    .order('created_at', { ascending: true })

  setHands(data?.map(hand => ({ ...hand, checked: false })))
}
```

---

## 📱 반응형

- **ResizablePanel**: 사용자가 직접 크기 조절
- **기본 비율**: 25% (트리) / 75% (영상+핸드)
- **최소/최대**: 15% ~ 40% / 60% ~ 85%

---

## 🎨 비디오 플레이어

### VideoPlayer 컴포넌트
```tsx
// YouTube
{day?.video_source === 'youtube' && day?.video_url && (
  <iframe src={getYouTubeEmbedUrl(day.video_url)} />
)}

// Upload / NAS
{(day?.video_source === 'upload' || day?.video_source === 'nas') && (
  <video controls src={videoUrl} />
)}

// 비디오 없음
{!day && <p>Select a day to view video</p>}
```

---

## 📝 Dialog 구조

### Day 추가 Dialog (3-Tab)
```tsx
<Dialog>
  <DialogContent>
    <Input placeholder="Day Name (optional)" />

    {/* Tabs */}
    <div className="flex gap-2">
      <Button variant={tab === 'nas' ? 'default' : 'outline'}>
        <Server /> NAS File
      </Button>
      <Button variant={tab === 'youtube' ? 'default' : 'outline'}>
        <Youtube /> YouTube
      </Button>
      <Button variant={tab === 'upload' ? 'default' : 'outline'}>
        <Upload /> Upload
      </Button>
    </div>

    {/* Tab Content */}
    {tab === 'nas' && <Input placeholder="videos/2024/wsop.mp4" />}
    {tab === 'youtube' && <Input placeholder="https://youtube.com/watch?v=..." />}
    {tab === 'upload' && <input type="file" accept="video/*" />}

    <Button onClick={addDay}>Add Video</Button>
  </DialogContent>
</Dialog>
```

---

**라우트**: `/archive`
**마지막 업데이트**: 2025-10-05
