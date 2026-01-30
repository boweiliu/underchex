---
title: Worklog   Agent 12   Futility Pruning
---

# Worklog - Agent 12 - Futility Pruning

## Summary
Agent #12 enhanced the AI module with Futility Pruning for faster search performance at shallow depths, and fixed a build error in balance.ts.

## Work Completed

### 1. Build Error Fix
- **Issue**: balance.ts was importing AIDifficulty from selfplay.ts, but selfplay.ts doesn't re-export it
- **Fix**: Changed import to get AIDifficulty directly from ai.ts where it's defined
- **Files**: src/typescript/src/balance.ts

### 2. Futility Pruning Implementation (src/typescript/src/ai.ts)
- **FUTILITY_MAX_DEPTH**: 3 plies from horizon
- **FUTILITY_MARGINS**: Conservative margins by depth (200cp, 350cp, 500cp)
- **canFutilityPrune()**: Helper function to check if a position can be pruned
  - Skips quiet moves that can't raise alpha (maximizing) or lower beta (minimizing)
  - Never prunes: first move, captures, promotions, in check, near-mate positions
- **Integration**: Added to both maximizing and minimizing branches of alphaBeta()
- **Stats Tracking**: Added futilityPrunes to SearchStats

### 3. Tests (src/typescript/tests/ai.test.ts)
- 20 new tests covering:
  - Futility pruning constants validation
  - canFutilityPrune behavior for all edge cases
  - Integration with search (stats tracking, correctness)
  - Boundary conditions

## Test Results
- 160 AI tests passing (140 previous + 20 new)
- 219 total tests passing
- TypeScript build succeeds

## Files Modified
- src/typescript/src/ai.ts (~140 new lines for futility pruning)
- src/typescript/src/balance.ts (fixed import)
- src/typescript/src/index.ts (added new exports)
- src/typescript/tests/ai.test.ts (20 new tests)

## Design Decisions
1. **Conservative margins**: 200/350/500cp for depths 1/2/3 to avoid over-pruning
2. **Depth 3 maximum**: Higher depths have too much uncertainty for safe pruning
3. **Static eval caching**: Only calculate when depth &lt;= FUTILITY_MAX_DEPTH to avoid overhead
4. **Never prune PV move**: First move in ordered list is always searched fully
5. **Skip in check**: Tactical positions need full search

## Performance Impact
- Reduces search tree at frontier/pre-frontier nodes
- Works well with existing optimizations (LMR, NMP, PVS)
- Minimal overhead (single eval at low depths)

## Next Steps
1. Opening book / endgame tablebase
2. Move ordering improvements (SEE for captures)
3. Extended futility pruning (reverse futility)
4. Multi-threaded search (Lazy SMP)

## Links
- [[Worklog - Agent 11 - PVS and Aspiration Windows]]
- [[Project/Underchex - Hub]]

Signed-by: agent #12 claude-sonnet-4 via opencode 20260122T04:41:51

