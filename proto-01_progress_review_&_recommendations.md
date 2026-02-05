# PROTO-01 Progress Review & Recommendations

# PROTO-01 Progress Review & Recommendations

#proto-01 #status #review #recommendations

**Purpose**: Full progress review of PROTO-01 with recommendations for next steps.
**Parent**: [PROTO-01 Breakdown](/docs/proto_01_breakdown)
**See also**: [PROTO-01 Progress Report](/docs/proto_01_progress_report) for raw status details.

---

## Recommendation: What to Do Next

**TL;DR**: Skip the orientation refactor. Keep odd-r. Get pieces on screen fast.

### Why

The orientation decision (nb 170, odd-q columns-contiguous) was made for aesthetic/chess-analogy reasons — columns feel like files. But the code (odd-r, rows-contiguous) already works: 61 tests pass, rendering is correct, coordinate math is solid. Executing the refactor plan (nb 179) means rewriting `hex.ts`, all 47 hex tests, `render.ts` transforms, and `main.ts` — basically starting over on the foundation to get an equivalent result with a different axis convention.

For a prototype whose explicit goal is "hardcoded board, basic moves, 2-player hotseat," this is yak-shaving. The orientation can be revisited when it actually matters (e.g., when designing the starting position layout or when porting to another language).

### Suggested order

1. **Decide board size** (5 min) — Pick 7x7 or 9x9. Blocks everything else.
2. **Board data structure** (PROTO-01.3) — `Map<string, Piece>` in GameState. Small task, ~30 lines.
3. **Hardcode a starting position** (PROTO-01.5) — Skip the parser for now. Just write a function that returns a populated board. Design the piece layout on paper/in a doc first.
4. **Render pieces** — Wire `pieceSymbol()` into the draw loop. Pieces appear on screen.
5. **Click-to-move + turns** (PROTO-01.8, 01.9) — Select source, select dest, move piece, swap turn. No validation.
6. **Done** — PROTO-01 complete.

Steps 2-4 could be done in a single session. Steps 5-6 in another. The parser (nb 188) and orientation refactor (nb 179) become future work, not blockers.

### What to update if you agree

- Mark nb 170 (orientation decision) as "deferred — keeping odd-r for prototype"
- Close nb 179 (refactor plan) as "not needed for PROTO-01"
- Update nb 124 (ship's log) with the decision

---

## Current State Summary

### What's built and working

| Component | Files | Tests | Notes |
|-----------|-------|-------|-------|
| Hex coordinate system | `hex.ts` (122 lines) | 47 passing | Doubled-width offset, odd-r. Distance, neighbors, equality, keys. |
| Piece types | `pieces/types.ts` (151 lines) | 14 passing | Player, PieceType, PieceVariant, Piece. Constructors like `white.king()`, `black.lance('A')`. Display helpers. |
| Canvas rendering | `render.ts` (197 lines) | — | Functional stateless. Flat-top hexes, two-tone coloring, selection highlight, debug coord labels. |
| Event loop | `main.ts` (59 lines) | — | Click-to-select, resize handling, event-driven redraw. |

All 61 tests pass. Dev server on port 5888.

### What's designed but not built

| Item | Doc(s) | What's there | What's missing |
|------|--------|--------------|----------------|
| Board data structure | nb 166 | Diagrams, neighbor tables for odd-q | No code. No `Board` type. |
| Starting position format | nb 181, 188 | Visual string notation spec, TDD test cases sketched | No parser. No actual piece layout. |
| Piece movement rules | nb 180 | JSON schema (step/ride/leap), format approved | Values are placeholders. Actual movesets TBD. |
| Orientation refactor | nb 179 | Line-by-line TODO list | Not executed (see recommendation above). |

### Decisions log

| Decision | Choice | Doc | In code? |
|----------|--------|-----|----------|
| Language | TypeScript + Vite + Canvas | — | Yes |
| Rendering | Functional stateless, event-driven | nb 147, 153 | Yes |
| Hex coords | Doubled-width offset | nb 146 | Yes |
| Hex orientation | Odd-q (columns contiguous) | nb 170 | **No** — code is odd-r |
| Coordinate transforms | Layered (hex→board, board→canvas) | nb 173 | Yes |
| Piece data format | Cross-language JSON spec | nb 180 | Format only |
| Starting position format | Visual string notation | nb 181 | No |
| Piece variants | Knight 3 colors, Lance 2 colors | nb 180 | Yes (in types.ts) |

### Open questions (need human input)

1. **Keep odd-r or execute refactor to odd-q?** (see recommendation)
2. **Board size**: 7x7 or 9x9?
3. **Starting piece layout**: What goes where? (Game design, not engineering.)
4. **Keep `types.ts` alongside JSON spec?** Or is TS code redundant with `spec/pieces.json`?

---

## Test Status & Analysis

### Testing infrastructure

- **Framework**: Vitest (zero-config with Vite, native TS)
- **Philosophy doc**: nb 157 — test behavior not implementation, progressive complexity, concrete hand-worked values, hierarchical naming, happy paths first for prototypes
- **Test plan**: nb 155 — detailed categories for hex.ts, co-located test files

### What's tested now

**`hex.test.ts` — 47 tests across 8 groups**

| Group | Tests | Verdict | Notes |
|-------|-------|---------|-------|
| `creation` | 6 | Correct | Even/odd row conversion, negatives. Values hand-worked. |
| `hexFromDoubled` | 1 | Correct | Passthrough constructor. |
| `offsetCol` | 5 | Correct | Includes roundtrip property (`offsetCol(hex(c,r)) === c`). |
| `neighbors` | 5 | Correct | Count, order, uniqueness, distance-1 invariant. Concrete values verified by hand. |
| `neighbor` | 1 | Correct | Cross-checks `neighbor(dir)` against `neighbors()` array. |
| `hexEquals` | 5 | Correct | Reflexive, equivalent, not-equal, symmetric. |
| `hexKey` | 4 | Correct | String format, uniqueness, negatives. |
| `hexDistance` | 11 | Correct | Progressive: same→adjacent→multi-step. Includes the bug-finding test (origin→(3,2)=4). Symmetry property. |
| `hexToString` | 3 | Correct | Format check, negatives, origin. |
| `DIRECTION_OFFSETS` | 4 | Correct | Count, E/W horizontal, E/W magnitude, diagonal offsets. |

**Assessment**: Well-structured, follows the philosophy doc closely. The hand-worked concrete values caught a real bug in `hexDistance` (nb 169). **If we keep odd-r, all 47 tests are correct and complete. If we switch to odd-q, all 47 need rewriting** — directions change from E/W to N/S, `dcol` becomes `drow`, every concrete value changes.

**`types.test.ts` — 14 tests across 5 groups**

| Group | Tests | Verdict | Notes |
|-------|-------|---------|-------|
| `Player` | 2 | Correct | Enum values, oppositePlayer. |
| `PieceType` | 1 | Correct | All 6 enum values. |
| `piece constructor` | 2 | Correct | With and without variant. |
| `convenience constructors` | 5 | Correct | white/black, variant required for knight/lance. |
| `pieceSymbol` | 2 | Correct | All 6 types × 2 players. |
| `pieceName` | 2 | Correct | With/without variant suffix. |

**Assessment**: Thorough for a data-only module. Orientation-independent — these survive any hex refactor unchanged.

### What's planned but not written

**Position parser tests** (nb 188) — sketched as pseudocode:

```typescript
parsePosition(". . .\n . . .\n. . .") → []           // empty board
parsePosition(". . .\n . K .\n. . .") → [{hex, piece}] // single piece
// Also planned: both players, variants (Na, Lb), full row, board size inference
```

These are just ideas, not implemented. They depend on open decisions (board size, row orientation, variant encoding format).

**Board data structure tests** — not planned anywhere. Would need tests for:
- Creating empty board
- Placing/removing pieces
- Querying what's at a hex
- Board bounds checking

**Rendering tests** — none exist, none planned. Rendering is visual/canvas-based, hard to unit test. The manual "click a hex and see it highlight" is the current verification.

### Orientation impact on tests

| If we... | hex.test.ts (47) | types.test.ts (14) | Future tests |
|----------|------------------|---------------------|--------------|
| **Keep odd-r** | No changes needed | No changes | Write for odd-r coords |
| **Switch to odd-q** | Rewrite all 47 | No changes | Write for odd-q coords |

This is another reason to keep odd-r: 47 correct, hand-verified tests are an asset. Rewriting them means re-verifying every concrete value by hand.

### Test gaps (not urgent for prototype)

- No tests for `render.ts` coordinate conversion (`hexToPixel`, `pixelToHex`) — these are the most bug-prone functions but hard to test without visual verification
- No integration test for "click on hex X, see it selected" loop
- No tests for board bounds (which hexes are valid for a 7×7 board)
- No edge case for `hex()` with non-integer inputs (not a real risk in TS)

---

## Process Notes from Doc Review

Things past agents learned the hard way (from retros and worklogs):

- **Design before code** (nb 184): Agent #17 coded TS types before discussing format. User: "back up and think through." For a multi-language project, data specs come first.
- **Decision chains** (nb 178): Orientation → offset → doubled-width form a chain. When agent #16 rewrote orientation, they forgot to carry forward the doubled-width rationale. Root cause: no explicit forward/backward links between related decisions.
- **Separation of concerns** (nb 173): Board centering was conflated with coordinate origin. User: "why are those connected?" Now properly layered as two transforms.
- **Tight scope** (nb 162): User corrected agents who expanded beyond the specific subtask. "Starting position data model" ≠ "board data structure."

---

Written-by: agent #20.0.0 claude-opus-4-6 via claude-code 2026-02-05T19:15:00Z
Edited-by: agent #20.0.0 claude-opus-4-6 via claude-code 2026-02-05T19:20:00Z (added test status & analysis section)
