/**
 * API 입력 검증 스키마 (Zod)
 *
 * 모든 API 엔드포인트의 입력 검증을 위한 Zod 스키마
 *
 * Single Source of Truth: 모든 Form 데이터 타입은 이 스키마에서 z.infer로 파생
 */

import { z } from "zod"

// ==================== Enum Schemas ====================

/**
 * 토너먼트 카테고리 스키마
 */
export const tournamentCategorySchema = z.enum([
  "WSOP",
  "Triton",
  "EPT",
  "Hustler Casino Live",
  "APT",
  "APL",
  "WSOP Classic",
  "GGPOKER",
])

/**
 * 영상 소스 스키마
 */
export const videoSourceSchema = z.enum(["youtube", "upload", "nas"])

/**
 * 게임 타입 스키마
 */
export const gameTypeSchema = z.enum(["tournament", "cash-game"])

// ==================== Form Data Schemas ====================

/**
 * Tournament Form 데이터 스키마
 * UI 폼에서 사용하는 데이터 구조
 */
export const tournamentFormDataSchema = z.object({
  name: z.string().trim().min(1, "토너먼트 이름을 입력해주세요").max(200),
  category: tournamentCategorySchema,
  categoryLogo: z.string().optional(),
  gameType: gameTypeSchema,
  location: z.string().trim().min(1, "개최 장소를 입력해주세요").max(100),
  city: z.string().trim().max(100),
  country: z.string().trim().max(100),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "유효하지 않은 날짜 형식입니다"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "유효하지 않은 날짜 형식입니다"),
})

/**
 * Event Form 데이터 스키마
 * UI 폼에서 사용하는 데이터 구조
 */
export const eventFormDataSchema = z.object({
  name: z.string().trim().min(1, "이벤트 이름을 입력해주세요").max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "유효하지 않은 날짜 형식입니다"),
  eventNumber: z.string().max(20),
  totalPrize: z.string().max(50),
  winner: z.string().max(100),
  buyIn: z.string().max(50),
  entryCount: z.string().max(20),
  blindStructure: z.string().max(200),
  levelDuration: z.string().max(20),
  startingStack: z.string().max(20),
  notes: z.string().max(1000),
})

/**
 * Stream Form 데이터 스키마
 * UI 폼에서 사용하는 데이터 구조
 * Note: uploadFile은 File 객체로 Zod에서 직접 검증하지 않음 (런타임 검증)
 */
export const streamFormDataSchema = z.object({
  name: z.string().trim().min(1, "스트림 이름을 입력해주세요").max(200),
  videoSource: videoSourceSchema.exclude(["nas"]), // Form에서는 youtube, upload만
  videoUrl: z.string().url("유효한 URL을 입력해주세요").or(z.literal("")),
  publishedAt: z.string(),
})

// ==================== API Input Schemas ====================

/**
 * 자연어 검색 API 스키마
 */
export const naturalSearchSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, "검색어를 입력해주세요")
    .max(200, "검색어는 최대 200자까지 입력 가능합니다")
    .regex(/^[a-zA-Z0-9가-힣\s.,!?'-]+$/, "허용되지 않는 특수문자가 포함되어 있습니다"),
})

/**
 * 핸드 Import API 스키마
 */
export const importHandsSchema = z.object({
  streamId: z.string().uuid("유효하지 않은 Stream ID입니다"),
  hands: z
    .array(
      z.object({
        number: z.string().min(1).max(10),
        description: z.string().min(1).max(500),
        timestamp: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, "유효하지 않은 타임스탬프 형식입니다"),
        summary: z.string().max(200).optional(),
        potSize: z.number().min(0).max(1000000000).optional(),
        boardCards: z.array(z.string().length(2).or(z.string().length(3))).max(5).optional(),
      })
    )
    .min(1, "최소 1개의 핸드가 필요합니다")
    .max(100, "한 번에 최대 100개의 핸드만 Import 가능합니다"),
})

/**
 * Tournament API 스키마 (생성/수정)
 * @deprecated tournamentFormDataSchema 사용 권장
 */
export const tournamentSchema = z.object({
  name: z.string().trim().min(1, "토너먼트 이름을 입력해주세요").max(200),
  category: tournamentCategorySchema,
  location: z.string().trim().min(1).max(100),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "유효하지 않은 날짜 형식입니다"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "유효하지 않은 날짜 형식입니다"),
})

/**
 * SubEvent 생성/수정 스키마
 */
export const subEventSchema = z.object({
  tournamentId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  totalPrize: z.string().max(50).optional(),
  winner: z.string().max(100).optional(),
  buyIn: z.string().max(50).optional(),
  entryCount: z.number().int().min(0).max(100000).optional(),
  blindStructure: z.string().max(200).optional(),
  levelDuration: z.number().int().min(0).max(1000).optional(),
  startingStack: z.number().int().min(0).max(10000000).optional(),
  notes: z.string().max(1000).optional(),
})

/**
 * Day 생성/수정 스키마
 */
export const daySchema = z.object({
  subEventId: z.string().uuid(),
  name: z.string().trim().min(1).max(100),
  videoSource: z.enum(["youtube", "upload"]),
  videoUrl: z.string().url().optional().or(z.literal("")),
  videoFile: z.string().optional(),
})

/**
 * 커뮤니티 포스트 생성 스키마
 */
export const createPostSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력해주세요").max(200),
  content: z.string().trim().min(1, "내용을 입력해주세요").max(10000),
  category: z.enum(["analysis", "strategy", "hand-review", "general"]),
  handId: z.string().uuid().optional(),
})

/**
 * 댓글 생성 스키마
 */
export const createCommentSchema = z.object({
  postId: z.string().uuid(),
  content: z.string().trim().min(1, "댓글 내용을 입력해주세요").max(2000),
  parentCommentId: z.string().uuid().optional(),
})

/**
 * Player Claim 스키마
 */
export const playerClaimSchema = z.object({
  playerId: z.string().uuid(),
  proofType: z.enum(["social_media", "email", "tournament_photo", "other"]),
  proofUrl: z.string().url().max(500).optional().or(z.literal("")),
  proofText: z.string().max(1000).optional(),
})

/**
 * Hand Edit Request 스키마
 */
export const handEditRequestSchema = z.object({
  handId: z.string().uuid(),
  editType: z.enum(["basic_info", "board", "players", "actions"]),
  oldValue: z.string().max(1000),
  newValue: z.string().max(1000),
  reason: z.string().trim().min(1).max(500),
})

/**
 * Content Report 스키마
 */
export const contentReportSchema = z.object({
  targetType: z.enum(["post", "comment"]),
  targetId: z.string().uuid(),
  reason: z.enum([
    "spam",
    "offensive",
    "misinformation",
    "inappropriate",
    "other",
  ]),
  details: z.string().max(500).optional(),
})

/**
 * 북마크 생성 스키마
 */
export const createBookmarkSchema = z.object({
  handId: z.string().uuid(),
  folderName: z.string().trim().min(1).max(50).optional(),
  notes: z.string().max(500).optional(),
})

/**
 * 유저 프로필 업데이트 스키마
 */
export const updateProfileSchema = z.object({
  nickname: z.string().trim().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().max(500).optional(),
  socialLinks: z
    .object({
      twitter: z.string().url().optional(),
      twitch: z.string().url().optional(),
      youtube: z.string().url().optional(),
    })
    .optional(),
  visibility: z.enum(["public", "private", "friends"]).optional(),
})

/**
 * 검증 헬퍼 함수
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean
  data?: T
  errors?: z.ZodError
} {
  try {
    const validated = schema.parse(data)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error }
    }
    throw error
  }
}

/**
 * API 응답용 에러 포맷팅
 */
export function formatValidationErrors(errors: z.ZodError): string[] {
  return errors.errors.map((err) => {
    const field = err.path.join(".")
    return field ? `${field}: ${err.message}` : err.message
  })
}

// ==================== Inferred Types (Single Source of Truth) ====================

/**
 * Form 데이터 타입들 - Zod 스키마에서 파생 (z.infer)
 *
 * 이 타입들은 스키마에서 자동으로 추론되므로 수동 정의가 필요 없음
 */

/** 토너먼트 카테고리 타입 */
export type TournamentCategoryInferred = z.infer<typeof tournamentCategorySchema>

/** 영상 소스 타입 */
export type VideoSourceInferred = z.infer<typeof videoSourceSchema>

/** 게임 타입 */
export type GameTypeInferred = z.infer<typeof gameTypeSchema>

/** Tournament Form 데이터 */
export type TournamentFormDataInferred = z.infer<typeof tournamentFormDataSchema>

/** Event Form 데이터 */
export type EventFormDataInferred = z.infer<typeof eventFormDataSchema>

/** Stream Form 데이터 (uploadFile 제외 - 런타임 처리) */
export type StreamFormDataInferred = z.infer<typeof streamFormDataSchema>

/** 자연어 검색 입력 */
export type NaturalSearchInput = z.infer<typeof naturalSearchSchema>

/** 핸드 Import 입력 */
export type ImportHandsInput = z.infer<typeof importHandsSchema>

/** Player Claim 입력 */
export type PlayerClaimInput = z.infer<typeof playerClaimSchema>

/** Hand Edit Request 입력 */
export type HandEditRequestInput = z.infer<typeof handEditRequestSchema>

/** Content Report 입력 */
export type ContentReportInput = z.infer<typeof contentReportSchema>

/** 북마크 생성 입력 */
export type CreateBookmarkInput = z.infer<typeof createBookmarkSchema>

/** 프로필 업데이트 입력 */
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
