/**
 * Phase 1 프롬프트 - 타임스탬프 추출 전용 (압축 버전)
 *
 * 모델: Gemini 2.5 Flash-Lite
 * 목적: 장시간 영상에서 핸드 시작/종료 타임스탬프만 빠르게 추출
 * 토큰: ~500 (기존 ~1,800에서 72% 감소)
 */

export const PHASE1_PROMPT = `Poker hand boundary detector. Extract start/end timestamps of complete hands only.

Output JSON (camelCase):
{"hands":[{"handNumber":1,"start":"05:30","end":"08:45"}]}

Start: cards dealt, blinds posted, "Hand #X" graphics
End: pot pushed to winner, muck, next hand starts

Rules:
- COMPLETE hands only (both start AND end visible in video)
- One hand = preflop through showdown (no street splitting)
- Format: MM:SS or HH:MM:SS
- No overlapping timestamps
- Tight boundaries (exclude breaks)
- Empty array if no valid hands

Return ONLY JSON.`
