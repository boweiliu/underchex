---
title: Worklog   Agent 8   Killer Move Heuristic
---

# Worklog - Agent 8 - Killer Move Heuristic

## Summary
Agent #8 enhanced the AI module with Killer Move Heuristic for improved move ordering at each ply depth.

## Work Completed

### 1. Killer Move Heuristic (src/typescript/src/ai.ts)
- **KillerTable type**: Stores up to 2 killer moves per ply depth (up to 64 ply)
- **killerStore()**: Stores quiet moves that caused beta cutoffs at a given ply
- **killerGet()**: Retrieves killer moves for a ply depth
- **isKillerMove()**: Checks if a move is a killer at the given ply
- **killerScore()**: Returns 8000 for primary killer, 7000 for secondary
- **killerClear()**: Resets all killer moves (for new games/searches)
- **killerCount()**: Returns total stored killers for stats

### 2. Move Ordering Enhancement
- Updated estimateMoveValue() to include killer move scoring with ply parameter
- Killer bonus (7000-8000) ranks below captures/promotions but above history
- Updated orderMoves() to accept ply parameter for killer lookup

### 3. Alpha-Beta Integration
- Added ply tracking through recursive alphaBeta() calls
- Killer moves are stored on beta cutoffs for quiet moves
- Killers are preserved across iterative deepening iterations
- findBestMove() clears killers at start of new search (configurable)
- getAIMove() clears killers when clearTables=true

### 4. Tests (src/typescript/tests/ai.test.ts)
- 19 new tests covering:
  - killerStore and killerGet basic operations
  - Two-slot replacement scheme
  - No duplicates stored
  - Captures/promotions excluded
  - Ply isolation
  - isKillerMove checks
  - killerScore bonuses (primary/secondary)
  - killerClear and killerCount
  - Integration with move ordering
  - Captures ranking above killers
  - orderMoves with ply parameter
  - Search populating killer table
  - Iterative deepening preserving killers
  - clearTables clearing killers

## Test Results
- 107 AI tests passing (88 previous + 19 new)
- 166 total tests passing (147 previous + 19 new)
- TypeScript build succeeds

## Files Modified
- src/typescript/src/ai.ts (~130 new lines for killer heuristic)
- src/typescript/src/index.ts (added new exports)
- src/typescript/tests/ai.test.ts (19 new tests)

## Design Decisions
1. **Two killer slots per ply**: Standard in chess engines, balances memory and effectiveness
2. **Replacement scheme**: New killer replaces slot 0, old slot 0 moves to slot 1
3. **Only quiet moves**: Captures/promotions already have good ordering via MVV-LVA
4. **Killer bonus values**: 8000/7000 ensures captures still rank higher but killers beat history
5. **Clear on new search**: Killers are search-specific, unlike history which accumulates
6. **Preserve across iterations**: Killers from shallower depths remain useful at deeper depths

## Performance Impact
- Killer moves improve move ordering by prioritizing moves that worked well at the same depth
- Complements history heuristic (which tracks across all depths)
- Combined with TT, quiescence, NMP, and history, search is now highly optimized

## Next Steps
1. Late Move Reductions (LMR) for additional pruning
2. Aspiration windows for iterative deepening
3. Opening book / simple database
4. Balance testing with improved AI

## Links
- [[Worklog - Agent 7 - NMP and History Heuristic]]
- [[Worklog - Agent 6 - PST and Zobrist Hashing]]
- [[Project/Underchex - Hub]]

Signed-by: agent #8 claude-sonnet-4 via opencode 20260122T03:31:32

