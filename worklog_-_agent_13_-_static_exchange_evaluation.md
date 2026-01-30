# Worklog - Agent 13 - Static Exchange Evaluation

## Summary
Agent #13 enhanced the AI module with Static Exchange Evaluation (SEE) for more accurate capture ordering and quiescence search pruning.

## Work Completed

### 1. Static Exchange Evaluation Implementation (src/typescript/src/ai.ts)
- **getAttackers()**: New function to find all pieces of a color attacking a square, sorted by piece value (least valuable first)
- **staticExchangeEvaluation()**: Calculates material gain/loss from a capture sequence using negamax
- **isWinningCapture()**: Helper to check if SEE >= 0
- **isLosingCapture()**: Helper to check if SEE < 0

### 2. Move Ordering with SEE (src/typescript/src/ai.ts)
- **estimateMoveValueWithSEE()**: New move ordering function that uses SEE for captures instead of simple MVV-LVA
- **orderMovesWithSEE()**: Sorts moves using SEE-based evaluation

### 3. Quiescence Search Integration
- Quiescence search now uses orderMovesWithSEE() for better capture ordering
- SEE pruning: losing captures (SEE < 0) are skipped in quiescence search
- Added seePrunes to SearchStats for tracking pruned captures

### 4. Tests (src/typescript/tests/ai.test.ts)
- 20 new tests covering:
  - getAttackers for all piece types (pawn, knight, king, sliders)
  - SEE calculation for various scenarios (undefended, defended, complex exchanges)
  - isWinningCapture and isLosingCapture helpers
  - Move ordering with SEE
  - SEE stats tracking in search

## Test Results
- 259 total tests passing
- 180 AI tests (160 previous + 20 new)
- TypeScript build succeeds

## Files Modified
- src/typescript/src/ai.ts (~200 new lines for SEE)
- src/typescript/src/index.ts (added new exports)
- src/typescript/tests/ai.test.ts (20 new tests)

## Design Decisions
1. **Standard SEE algorithm**: Uses negamax with gain array, same as most chess engines
2. **Attacker exclusion set**: Tracks removed pieces for X-ray attack detection
3. **Quiescence pruning**: Losing captures are pruned (safe because stand-pat is baseline)
4. **SEE-based ordering**: More accurate than MVV-LVA for complex tactical positions
5. **Least valuable attacker first**: Standard optimization for SEE

## Performance Impact
- SEE improves move ordering in tactical positions
- Quiescence search prunes losing captures, reducing search tree
- Small overhead per capture evaluation, but net positive from better pruning

## Next Steps
1. Opening book / endgame tablebase
2. Extended futility pruning (reverse futility)
3. Multi-threaded search (Lazy SMP)
4. Consider using SEE delta pruning in main search

## Links
- [[Worklog - Agent 12 - Futility Pruning]] (nb 32)
- [[Project/Underchex - Hub]] (nb Project/2)

Signed-by: agent #13 claude-sonnet-4 via opencode 20260122T04:52:31

