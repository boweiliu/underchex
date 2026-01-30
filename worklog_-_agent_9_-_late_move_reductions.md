# Worklog - Agent 9 - Late Move Reductions

## Summary
Agent #9 enhanced the AI module with Late Move Reductions (LMR) for faster search by reducing depth for moves ordered late in the move list.

## Work Completed

### 1. LMR Core Implementation (src/typescript/src/ai.ts)
- **lmrReduction()**: Pre-computed log-based reduction table
- **shouldApplyLMR()**: Conditions for applying LMR (not in check, not capture/promotion, sufficient depth, late move)
- **adjustLMRReduction()**: Adjusts reduction based on killer move status and history score
- **LMR_MIN_DEPTH**: Minimum depth of 3 for LMR
- **LMR_FULL_DEPTH_MOVES**: First 4 moves searched at full depth

### 2. Alpha-Beta Integration
- Added LMR to both maximizing and minimizing branches
- Uses null window search for reduced depth moves
- Re-searches at full depth if reduced search fails high/low
- Tracks lmrReductions and lmrResearches in SearchStats

### 3. Tests (src/typescript/tests/ai.test.ts)
- 23 new tests covering:
  - lmrReduction table values
  - shouldApplyLMR conditions
  - adjustLMRReduction adjustments for killers and history
  - Integration with findBestMove and findBestMoveIterative
  - SearchStats LMR field verification

## Test Results
- 130 AI tests passing (107 previous + 23 new)
- 189 total tests passing
- TypeScript build succeeds

## Files Modified
- src/typescript/src/ai.ts (~150 new lines for LMR)
- src/typescript/src/index.ts (added new exports)
- src/typescript/tests/ai.test.ts (23 new tests)

## Design Decisions
1. **Log-based reduction formula**: R = ln(depth) * ln(moveIndex) / 2 - conservative but effective
2. **Pre-computed table**: Avoids log calculations during search
3. **Full depth for first 4 moves**: Hash move, killers, good captures need full search
4. **Null window re-search**: Verifies reduced search results efficiently
5. **Adjustments for killers/history**: Less reduction for promising moves
6. **More reduction for zero-history moves**: Unknown moves get more aggressive pruning

## Performance Impact
- LMR significantly reduces search tree size for late moves
- Combined with other optimizations (TT, NMP, killers, history), search is very efficient
- Re-search overhead is minimal when reduction succeeds

## Next Steps
1. Aspiration windows for iterative deepening
2. Opening book / simple database
3. Principal Variation Search (PVS) optimization
4. Futility pruning at leaf nodes

## Links
- [[Worklog - Agent 8 - Killer Move Heuristic]] (nb 28)
- [[Worklog - Agent 7 - NMP and History Heuristic]] (nb 27)
- [[Project/Underchex - Hub]] (nb Project/2)

Signed-by: agent #9 claude-sonnet-4 via opencode 20260122T03:45:57

