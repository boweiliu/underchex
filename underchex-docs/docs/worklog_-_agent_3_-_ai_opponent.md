---
title: Worklog   Agent 3   Ai Opponent
---

# Worklog - Agent 3 - AI Opponent

## Summary
Agent #3 implemented the AI opponent using alpha-beta search with pruning and integrated it into the web UI.

## Work Completed

### 1. AI Module Implementation (src/typescript/src/ai.ts)
- **Piece values**: Standard chess-like values adapted for hex pieces (pawn=100, knight=300, lance/chariot=450, queen=900)
- **Position evaluation**: Material balance + centrality bonus + pawn advancement + mobility
- **Move ordering**: MVV-LVA (Most Valuable Victim - Least Valuable Attacker) for better pruning
- **Alpha-beta search**: Full implementation with depth-limited minimax
- **Iterative deepening**: Optional time-limited search

### 2. AI Interface
- Three difficulty levels: easy (depth 2), medium (depth 4), hard (depth 6)
- Clean API: `getAIMove(state, difficulty)` for game integration
- Search statistics tracking (nodes searched, cutoffs)

### 3. Tests (src/typescript/tests/ai.test.ts)
- 25 new tests covering:
  - Piece value relationships
  - Centrality and advancement bonuses
  - Material evaluation
  - Move ordering
  - Alpha-beta search correctness
  - AI quality (prefers captures, avoids blunders)

### 4. Web UI Integration (src/web/index.html)
- "Play vs AI" button to start AI game
- Difficulty selector (easy/medium/hard)
- "AI is thinking..." indicator during computation
- Undo properly handles AI games (undoes both moves)
- AI automatically moves after player move

## Test Results
- 84 tests passing (59 previous + 25 new AI tests)
- TypeScript build succeeds

## Files Created/Modified
- src/typescript/src/ai.ts (NEW - 333 lines)
- src/typescript/tests/ai.test.ts (NEW - 327 lines)
- src/typescript/src/index.ts (added AI exports)
- src/web/index.html (added AI game mode)

## How to Test
```
cd src/web
python3 -m http.server 8000
# Open http://localhost:8000
# Click "Play vs AI" and play as white
```

## Design Decisions
1. **Evaluation function**: Kept simple for now - material + position. Can be enhanced with:
   - Piece-square tables
   - King safety evaluation
   - Pawn structure analysis
2. **Search depth**: Medium difficulty (depth 4) provides good balance of speed and strength
3. **No transposition table**: Would improve performance but adds complexity

## Next Steps
1. Add transposition table for faster search
2. Implement quiescence search (extend search for captures)
3. Opening book for better early game
4. Endgame tablebase for perfect play with few pieces
5. Add "AI vs AI" mode for self-play analysis

## Links
- [[Worklog - Agent 2 - Web UI and Promotion]]
- [[Worklog - Agent 1 - Core Game Engine]]
- [[Project/Underchex - Hub]]

Signed-by: agent #3 claude-sonnet-4 via opencode 20260122T02:35:07

