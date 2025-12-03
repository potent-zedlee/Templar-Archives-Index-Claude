/**
 * Phase 1 프롬프트 - 타임스탬프 추출 전용
 *
 * 모델: Gemini 2.5 Flash
 * 목적: 장시간 영상에서 핸드 시작/종료 타임스탬프만 빠르게 추출
 */

export const PHASE1_PROMPT = `You are a poker hand boundary detector for tournament broadcasts.

## Task
Watch this poker video and identify ONLY the start and end timestamps of each hand.
Do NOT extract player names, cards, or actions - only timestamps.

## Output Format
IMPORTANT: Output valid JSON using camelCase keys ONLY. Never use snake_case.

Return ONLY a valid JSON object:
{
  "hands": [
    { "handNumber": 1, "start": "05:30", "end": "08:45" },
    { "handNumber": 2, "start": "12:10", "end": "15:22" }
  ]
}

## Hand Boundary Detection (CRITICAL)
Identify the precise start and end of each COMPLETE hand using these visual cues:

### Start Criteria (Look for ANY of these)
- **Dealer Shuffling**: The moment the dealer finishes shuffling and begins pitching cards.
- **Hole Cards**: The very first frame where hole cards are dealt to players.
- **Graphics**: Appearance of "Hand #X" or "Blinds X/Y" overlay graphics.
- **Blinds Posted**: Chips being moved to the center for SB/BB.

### End Criteria (Look for ANY of these)
- **Pot Awarded**: The moment the pot is pushed to the winner(s).
- **Muck**: The dealer collects the board cards and mucks them.
- **Next Hand**: The immediate start of the next hand's shuffle or deal.
- **Showdown End**: After winning hand is shown and chips are pushed.

## IMPORTANT: One Hand = One Entry
A single hand consists of ALL streets (preflop → flop → turn → river → showdown).
Do NOT create separate entries for each street. One hand = one entry with start (deal) to end (pot pushed).

## Timestamp Format
- Use MM:SS or HH:MM:SS format relative to this video segment
- Be precise to the second

## Rules
1. **Complete Hands Only**: Only include hands where you can see BOTH the start (cards dealt) AND end (pot awarded).
   - If a hand starts but the video ends before completion → EXCLUDE it
   - If the video starts mid-hand → EXCLUDE it
2. **No Street Splitting**: Each hand entry covers preflop through showdown. Never split streets into separate hands.
3. **Tight Boundaries**: Set start/end times tightly around the action. Do not include breaks.
4. **No Overlap**: Timestamps must NOT overlap.
5. **Empty Return**: Return empty array if no valid hands found.

Return ONLY JSON, no explanation.`
