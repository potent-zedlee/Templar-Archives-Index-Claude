/**
 * Phase 2 배치 프롬프트 - 세그먼트 내 모든 핸드 분석
 *
 * 모델: Gemini 2.5 Flash
 * 목적: 30분 세그먼트에서 여러 핸드를 한 번에 분석
 * 비용 절감: 214회 호출 → 12회 호출 (비디오 토큰 90% 절감)
 */

export type Platform = 'ept' | 'triton' | 'wsop'

export const PHASE2_BATCH_PROMPT = `Expert poker analyst. Analyze ALL poker hands in this video segment.

## Hand Timestamps to Analyze
{HAND_TIMESTAMPS}

## Output Format
Return JSON with hands array:
{
  "hands": [
    {
      "handNumber": 1,
      "stakes": "50K/100K",
      "pot": 2500000,
      "board": {"flop":["As","Kh","7d"],"turn":"2c","river":"Jh"},
      "players": [{"name":"Player","position":"BTN","seat":1,"stackSize":5000000,"holeCards":["Ah","Kd"]}],
      "actions": [{"player":"Name","street":"preflop","action":"raise","amount":225000}],
      "winners": [{"name":"Name","amount":2500000,"hand":"Two Pair"}],
      "timestampStart": "05:30",
      "timestampEnd": "08:45",
      "semanticTags": ["#HeroCall"],
      "aiAnalysis": {
        "confidence": 0.92,
        "reasoning": "Key decision explanation",
        "playerStates": {"playerName":{"emotionalState":"confident","playStyle":"aggressive"}},
        "handQuality": "highlight"
      }
    }
  ]
}

## Semantic Tags
- #BadBeat: 95%+ equity loses on river
- #Cooler: Premium vs premium (AA vs KK, set over set)
- #HeroCall: Successful bluff catch
- #Tilt: Aggressive play after recent bad beat
- #SoulRead: Accurate hand reading
- #SuckOut: Winning with few outs
- #SlowPlay: Check/call with strong hand
- #Bluff: Large bet with weak hand
- #AllIn: All-in situation
- #BigPot: Pot exceeds 100BB
- #FinalTable: Final table action
- #BubblePlay: Bubble situation play

## Field Reference
Cards: As,Kh,7d (rank+suit: s/h/d/c)
Positions: BTN,SB,BB,UTG,UTG+1,MP,CO
Actions: fold,check,call,raise,bet,all-in
Streets: preflop,flop,turn,river
Quality: routine|interesting|highlight|epic
EmotionalState: tilting|confident|cautious|neutral
PlayStyle: aggressive|passive|balanced

## Important
- Analyze EACH hand at the given timestamps
- Use null for unclear/invisible cards
- Match output handNumber with input hand numbers
- Skip hands that are incomplete in the video

Return ONLY JSON.`

/**
 * 플랫폼별 배치 프롬프트 생성
 */
export function getPhase2BatchPromptWithTimestamps(
    platform: Platform,
    handTimestamps: Array<{ handNumber: number; start: string; end: string }>
): string {
    const timestampList = handTimestamps
        .map(h => `Hand ${h.handNumber}: ${h.start} - ${h.end}`)
        .join('\n')

    const platformNotes: Record<Platform, string> = {
        ept: 'EPT: European Poker Tour standard format.',
        triton: 'Triton: Big blind ante format (SB/BB/Ante). May use HKD currency.',
        wsop: 'WSOP: World Series of Poker standard format.',
    }

    return PHASE2_BATCH_PROMPT
        .replace('{HAND_TIMESTAMPS}', timestampList)
        + `\n\n## Platform\n${platformNotes[platform]}`
}
