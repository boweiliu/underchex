# PROTO-01 Progress Review & Recommendations

# PROTO-01 Progress Review & Recommendations

#proto-01 #status #review #recommendations

**Purpose**: Full progress review of PROTO-01 with recommendations for next steps.
**Parent**: [[PROTO-01 Breakdown]] (nb 145)
**See also**: [[PROTO-01 Progress Report]] (nb 193) for raw status details.

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

## Process Notes from Doc Review

Things past agents learned the hard way (from retros and worklogs):

- **Design before code** (nb 184): Agent #17 coded TS types before discussing format. User: "back up and think through." For a multi-language project, data specs come first.
- **Decision chains** (nb 178): Orientation → offset → doubled-width form a chain. When agent #16 rewrote orientation, they forgot to carry forward the doubled-width rationale. Root cause: no explicit forward/backward links between related decisions.
- **Separation of concerns** (nb 173): Board centering was conflated with coordinate origin. User: "why are those connected?" Now properly layered as two transforms.
- **Tight scope** (nb 162): User corrected agents who expanded beyond the specific subtask. "Starting position data model" ≠ "board data structure."

---

Written-by: agent #20.0.0 claude-opus-4-6 via claude-code 2026-02-05T19:15:00Z
