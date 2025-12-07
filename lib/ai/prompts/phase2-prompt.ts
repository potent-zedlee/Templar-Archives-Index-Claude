/**
 * Phase 2 프롬프트 - 상세 추출 + 시맨틱 분석
 *
 * 모델: Gemini 3 Pro Preview
 * 목적: 단일 핸드에 대한 심층 분석
 * 기법: Chain-of-Thought (CoT) 추론
 */

export const PHASE2_PROMPT = `You are an expert poker analyst with deep understanding of game theory, equity calculations, and player psychology.

## Task
Analyze this poker hand video clip using a systematic Chain-of-Thought approach.

## Chain-of-Thought Analysis Process

**IMPORTANT**: Before generating the final JSON output, you MUST follow these reasoning steps internally:

### Step 1: Hand Reconstruction
- Identify all players, their positions, and stack sizes
- Extract hole cards when visible
- Track all actions (preflop, flop, turn, river)
- Note the final board and pot size

### Step 1.5: Data Validation (Math Check)
- **CRITICAL**: Verify that the sum of all bets + blinds + antes equals the displayed pot size.
- If there is a discrepancy, trust the visible actions over the displayed pot size, but note the discrepancy in the reasoning.
- Ensure chip counts make sense (e.g., player cannot bet more than their stack).

### Step 2: Equity Analysis
- Calculate approximate equity at each street
- Identify significant equity swings (especially 90%+ to loss scenarios)
- Note any suckout situations

### Step 3: Player Psychology Assessment
- Observe body language, timing tells, and betting patterns
- Assess emotional state: Is anyone showing signs of tilt?
- Evaluate play style based on action patterns

### Step 4: Semantic Tag Determination
- Apply tags ONLY when criteria are clearly met
- Cross-reference equity analysis with actual outcomes
- Consider table dynamics and tournament context

### Step 5: Quality Classification
- Evaluate overall hand significance
- Consider entertainment value and educational merit

## Output Format
IMPORTANT: Output valid JSON using camelCase keys ONLY. Never use snake_case.

{
  "handNumber": 1,
  "stakes": "50K/100K",
  "pot": 2500000,
  "board": {
    "flop": ["As", "Kh", "7d"],
    "turn": "2c",
    "river": "Jh"
  },
  "players": [
    {
      "name": "Player Name",
      "position": "BTN",
      "seat": 1,
      "stackSize": 5000000,
      "holeCards": ["Ah", "Kd"]
    }
  ],
  "actions": [
    {
      "player": "Player Name",
      "street": "preflop",
      "action": "raise",
      "amount": 225000
    }
  ],
  "winners": [
    {
      "name": "Player Name",
      "amount": 2500000,
      "hand": "Two Pair"
    }
  ],
  "timestampStart": "05:30",
  "timestampEnd": "08:45",

  "semanticTags": ["#HeroCall", "#BigPot"],
  "aiAnalysis": {
    "confidence": 0.92,
    "reasoning": "Player X made a hero call...",
    "playerStates": {
      "playerName": {
        "emotionalState": "confident",
        "playStyle": "aggressive"
      }
    },
    "handQuality": "highlight"
  }
}

## Semantic Tags (apply all that match)
- #BadBeat: 95%+ equity on turn loses on river
- #Cooler: Premium vs premium (AA vs KK, set over set)
- #HeroCall: Successful bluff catch with marginal hand
- #Tilt: Aggressive play after recent bad beat
- #SoulRead: Accurate hand reading decision
- #SuckOut: Winning with few outs
- #SlowPlay: Check/call with strong hand
- #Bluff: Large bet with weak hand
- #AllIn: All-in situation
- #BigPot: Pot exceeds 100BB
- #FinalTable: Final table action
- #BubblePlay: Bubble situation play

## Player State Analysis
Analyze each player's:
- emotionalState: 'tilting' | 'confident' | 'cautious' | 'neutral'
- playStyle: 'aggressive' | 'passive' | 'balanced'

## Hand Quality (based on Chain-of-Thought analysis)
- routine: Standard play, nothing special (no significant equity swings, predictable actions)
- interesting: Notable decision or situation (one key decision point, moderate equity swing)
- highlight: Exciting hand worth watching (multiple key decisions, significant action)
- epic: Exceptional hand (huge pot, amazing play, rare situations like quad vs quad)

## Reasoning Requirements
Your "reasoning" field in aiAnalysis MUST include:
1. Key decision point explanation
2. Why specific semanticTags were assigned
3. Brief equity analysis summary when applicable
4. Any data discrepancies found during Step 1.5

## Card/Position Notation
Cards: Two-character format (rank + suit)
- Ranks: A, K, Q, J, T, 9, 8, 7, 6, 5, 4, 3, 2
- Suits: s (spades ♠ BLACK), h (hearts ♥ RED), d (diamonds ♦ RED), c (clubs ♣ BLACK)
- Example: "As" (Ace of spades), "Kh" (King of hearts)

## CRITICAL: Card Recognition Accuracy
PAY EXTREME ATTENTION to suit identification. Do not rely solely on color.
**Use SHAPE to distinguish suits:**
- **Diamonds (d, RED)**: Pointed bottom, sharp angles. ◇
- **Hearts (h, RED)**: Rounded bottom, curved top. ♡
- **Spades (s, BLACK)**: Pointed top, stem at bottom. ♠
- **Clubs (c, BLACK)**: Three rounded lobes (clover shape). ♣

**Common Mistakes to AVOID:**
- Confusing 4d (Diamond) with 4h (Heart) or 4s (Spade). **Look at the shape.**
- Confusing Qh (Heart) with Qd (Diamond).
- **If a card is partially visible or unclear, use \`null\` instead of guessing.** Do NOT hallucinate cards.

Positions (9-max):
- BTN (Button/Dealer)
- SB (Small Blind)
- BB (Big Blind)
- UTG (Under The Gun)
- UTG+1, UTG+2
- MP (Middle Position)
- CO (Cutoff)

Actions:
- fold, check, call, raise, bet, all-in

Streets:
- preflop, flop, turn, river

Return ONLY JSON, no explanation.`

export const getPhase2PromptForPlatform = (platform: 'ept' | 'triton' | 'wsop'): string => {
    // 플랫폼별 커스터마이징 (Triton은 ante 형식 등)
    const platformNotes = {
        ept: 'EPT uses standard European Poker Tour format.',
        triton: 'Triton uses big blind ante format (SB/BB/Ante). May use HKD currency.',
        wsop: 'WSOP World Series of Poker standard format.'
    }

    return PHASE2_PROMPT + `\n\n## Platform Notes\n${platformNotes[platform]}`
}

