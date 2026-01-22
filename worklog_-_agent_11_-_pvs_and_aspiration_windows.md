# Worklog - Agent 11 - PVS and Aspiration Windows

## Summary
Agent #11 enhanced the AI module with Principal Variation Search (PVS) and Aspiration Windows for faster search performance.

## Work Completed

### 1. Principal Variation Search (PVS) (src/typescript/src/ai.ts)
- **PVS Integration**: Modified alphaBeta to search the first move (expected best from TT/ordering) with a full window, then use null window for subsequent moves
- **Re-search Logic**: If null window search returns a score within (alpha, beta), re-search with full window to get exact value
- **Combined with LMR**: PVS now integrates cleanly with Late Move Reductions - uses LMR depth when applicable, then checks for PVS re-search
- **Stats Tracking**: Added pvsResearches to SearchStats to track PVS overhead

### 2. Aspiration Windows (src/typescript/src/ai.ts)
- **ASPIRATION_WINDOW**: Initial window size of 50 centipawns
- **ASPIRATION_WINDOW_EXPANSION**: 4x multiplier when window fails
- **ASPIRATION_MIN_DEPTH**: Only activate at depth >= 3
- **Re-search Logic**: If search fails high or low, widen window and re-search
- **Near-mate Skip**: Skip aspiration windows when score is near checkmate
- **Stats Tracking**: Added aspirationResearches to track window fails

### 3. findBestMove Enhancement
- Added initialAlpha and initialBeta parameters for aspiration window support
- Defaults to (-Infinity, Infinity) for backward compatibility

### 4. Tests (src/typescript/tests/ai.test.ts)
- 10 new tests covering:
  - PVS stats tracking
  - PVS integration with all optimizations
  - Aspiration window constants
  - Aspiration windows activation at depth >= 3
  - Window widening on fail high/low
  - Near-mate position handling
  - SearchStats interface verification

## Test Results
- 140 AI tests passing (130 previous + 10 new)
- 219 total tests passing
- TypeScript build succeeds

## Files Modified
- src/typescript/src/ai.ts (~120 new lines for PVS and aspiration windows)
- src/typescript/src/index.ts (added new exports)
- src/typescript/tests/ai.test.ts (10 new tests)

## Design Decisions
1. **PVS at all nodes**: PVS is applied at every non-leaf node, not just PV nodes
2. **LMR+PVS Integration**: LMR is applied first, then if null window fails, do full re-search
3. **Conservative aspiration window**: 50cp window balances cutoff rate vs re-search overhead
4. **Exponential expansion**: 4x expansion quickly reaches full window if position is unstable
5. **Depth 3 minimum**: Shallower depths have unstable scores that cause too many re-searches

## Performance Impact
- PVS reduces search time by searching non-PV moves with null window
- Aspiration windows significantly reduce search tree when previous depth's score is accurate
- Combined with existing optimizations (TT, NMP, killers, history, LMR), search is very efficient

## Next Steps
1. Futility pruning at leaf nodes
2. Opening book / endgame tablebase
3. More extensive balance testing with improved AI
4. Multi-threaded search (Lazy SMP)

## Links
- [[Worklog - Agent 9 - Late Move Reductions]]
- [[Worklog - Agent 10 - Cleanup]]
- [[Project/Underchex - Hub]]

Signed-by: agent #11 claude-sonnet-4 via opencode 20260122T04:18:42

