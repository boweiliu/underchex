# Worklog - Agent 7 - NMP and History Heuristic

## Summary
Agent #7 enhanced the AI module with Null Move Pruning (NMP) for faster search and History Heuristic for improved move ordering.

## Work Completed

### 1. Null Move Pruning (src/typescript/src/ai.ts)
- **nullMoveReduction()**: Computes adaptive R value (2 + depth/6)
- **hasNullMoveMaterial()**: Checks if side has at least one non-pawn/king piece (avoids zugzwang)
- **shouldTryNullMove()**: Guards null move with depth, check, and material conditions
- Integrated into alphaBeta() with proper cutoff handling
- Tracks nullMoveAttempts and nullMoveCutoffs in SearchStats

### 2. History Heuristic (src/typescript/src/ai.ts)
- **HistoryTable type**: Separate tables for white and black
- **historyUpdate()**: Increments score by depth^2 on beta cutoffs
- **historyScore()**: Retrieves history score for a move
- **historyAge()**: Halves all scores between iterations to prevent stale data
- **historyClear()**: Resets table (for new games)
- **historySize()**: Returns total entries for stats

### 3. Move Ordering Enhancement
- Updated estimateMoveValue() to include history scores (scaled down)
- Captures/promotions still prioritized over quiet moves with history
- History updates only for quiet moves that cause cutoffs

### 4. Integration Changes
- SearchStats now includes nullMoveCutoffs and nullMoveAttempts
- findBestMove() and findBestMoveIterative() accept useNullMove parameter
- getAIMove() clearTables option now clears history table too
- historyAge() called between iterative deepening iterations
- Updated index.ts exports

### 5. Tests (src/typescript/tests/ai.test.ts)
- 27 new tests covering:
  - History table operations (store, retrieve, age, clear)
  - History color separation
  - History influence on move ordering
  - Capture priority over history
  - Null move reduction calculation
  - hasNullMoveMaterial checks
  - shouldTryNullMove condition checks
  - Null move integration with search
  - Combined features performance

## Test Results
- 88 AI tests passing (61 previous + 27 new)
- 167 total tests passing (140 previous + 27 new)
- TypeScript build succeeds

## Files Modified
- src/typescript/src/ai.ts (~150 new lines for NMP and history)
- src/typescript/src/index.ts (added new exports)
- src/typescript/tests/ai.test.ts (27 new tests)

## Design Decisions
1. **Adaptive R value**: 2 + depth/6 balances safety and aggressiveness
2. **Material check for NMP**: Avoids zugzwang in pawn-only endgames
3. **History depth^2 bonus**: Deeper cutoffs are more valuable
4. **History aging**: Prevents stale history from dominating
5. **History scaling in move ordering**: Capped to not overshadow tactical moves
6. **Only update history for quiet moves**: Captures already have good ordering via MVV-LVA

## Performance Impact
- NMP can prune large subtrees when position is strong
- History heuristic improves move ordering for better alpha-beta efficiency
- Combined with TT and quiescence, search is now significantly more efficient

## Next Steps
1. Late Move Reductions (LMR) for additional pruning
2. Opening book / simple database
3. Balance testing with improved AI
4. Aspiration windows for iterative deepening
5. Killer move heuristic

## Links
- [[Worklog - Agent 6 - PST and Zobrist Hashing]]
- [[Worklog - Agent 5 - TT and Quiescence Search]]
- [[Project/Underchex - Hub]]

Signed-by: agent #7 claude-sonnet-4 via opencode 20260122T03:17:17
