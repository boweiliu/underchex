# Worklog - Agent 6 - PST and Zobrist Hashing

## Summary
Agent #6 enhanced the AI evaluation with Piece-Square Tables (PST) for nuanced positional play and implemented Zobrist hashing for faster transposition table lookups.

## Work Completed

### 1. Piece-Square Tables (src/typescript/src/ai.ts)
- **PieceSquareTable type**: Map-based table storing positional bonuses per cell
- **PAWN_PST**: Encourages advancement and central file control
- **KNIGHT_PST**: Strong central bonus, edge penalty
- **LANCE_PST**: Bonus for central lanes
- **CHARIOT_PST**: Central diagonal control bonus
- **QUEEN_PST**: Central preference
- **KING_MG_PST**: Back-rank safety bonus, central exposure penalty
- **KING_EG_PST**: Active central king bonus for endgames
- **getPSTBonus()**: Gets PST bonus with automatic black mirroring
- **isEndgame()**: Detects endgame based on material count

### 2. Zobrist Hashing (src/typescript/src/ai.ts)
- **ZobristTable type**: Stores random values for piece-position combinations
- **initZobristTable()**: Creates deterministic random values using xorshift32 PRNG
- **getZobristTable()**: Singleton accessor for global Zobrist table
- **computeZobristHash()**: Full board hash computation via XOR
- **zobristUpdate()**: Incremental hash update for moves (O(1) vs O(n))
- Numeric keys instead of strings for faster Map lookups
- 36 piece indices (6 types * 2 colors * 3 lance variants)

### 3. Integration Changes
- **evaluateMaterial()**: Now uses PST bonuses with endgame detection
- **ttStore()/ttProbe()**: Use numeric Zobrist hashes
- **generateBoardHash()**: Backwards-compatible wrapper (deprecated)

### 4. Tests (src/typescript/tests/ai.test.ts)
- 21 new tests covering:
  - PST existence and values for all piece types
  - Pawn advancement bonuses
  - Knight/Queen central preference
  - King PST differences (middlegame vs endgame)
  - Black position mirroring
  - Endgame detection
  - Zobrist hash consistency
  - Zobrist hash uniqueness for different positions/pieces
  - Zobrist incremental update correctness
  - Zobrist capture handling
  - PST integration with evaluation

## Test Results
- 61 AI tests passing (40 previous + 21 new)
- 59 core tests passing
- TypeScript build succeeds

## Files Modified
- src/typescript/src/ai.ts (~200 new lines for PST and Zobrist)
- src/typescript/src/index.ts (added new exports)
- src/typescript/tests/ai.test.ts (21 new tests)

## Design Decisions
1. **Map-based PSTs**: Simple and readable, good enough for 61-cell hex board
2. **Separate King PSTs**: Middlegame (safety) vs endgame (activity) distinction
3. **xorshift32 PRNG**: Fast and deterministic for reproducible Zobrist values
4. **Fixed seed**: Ensures consistent hashing across sessions
5. **36 piece indices**: Accounts for lance variants
6. **Material-based endgame threshold**: 2400 centipawns (~queen + minor piece per side)

## Performance Impact
- Zobrist hashing: O(1) incremental update vs O(n) string concatenation
- PST evaluation: O(1) lookup per piece vs computed bonuses
- Better positional play from nuanced PST values

## Next Steps
1. Null move pruning for faster search
2. Late move reductions (LMR)
3. History heuristic for move ordering
4. Opening book / simple database
5. Balance testing with improved AI

## Links
- [[Worklog - Agent 5 - TT and Quiescence Search]] (nb 25)
- [[Worklog - Agent 4 - Self-Play Module]] (nb 24)
- [[Project/Underchex - Hub]] (nb Project/2)

Signed-by: agent #6 claude-sonnet-4 via opencode 20260122T03:06:11
