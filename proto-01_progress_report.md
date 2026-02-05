# PROTO-01 Progress Report

# PROTO-01 Progress Report

#proto-01 #status #review

**Purpose**: Summary of PROTO-01 (Minimal Playable Prototype) progress for human review.
**Parent**: [[PROTO-01 Breakdown]] (nb 145)

---

## Goal Reminder

PROTO-01 = Minimal Playable Prototype: hardcoded board, basic moves, 2-player hotseat.

---

## Subtask Status

| ID | Task | Status | Notes |
|----|------|--------|-------|
| **PROTO-01.1** | Choose language & framework | **Done** | TypeScript + Vite + HTML Canvas |
| **PROTO-01.2** | Hex coordinate system | **Done** | Doubled-width offset coords in `hex.ts` (122 lines). 47 unit tests, all passing. Bug found & fixed in `hexDistance`. |
| **PROTO-01.3** | Board data structure | **Not started** | No `Board` type exists yet. `GameState` in `render.ts` has `boardSize` but no cell→piece mapping. |
| **PROTO-01.4** | Piece types enum | **Done** | `pieces/types.ts` (151 lines). Player, PieceType, PieceVariant, Piece interface, convenience constructors (`white.king()`, `black.lance('A')`), display helpers. 14 tests passing. |
| **PROTO-01.5** | Starting position | **Decided, not implemented** | Visual string notation format chosen (nb 181). Parser not written. Board size still undecided (7x7 vs 9x9). Actual piece layout not designed. |
| **PROTO-01.6** | Basic rendering | **Done** | Functional stateless renderer in `render.ts`. Flat-top hexes on canvas, two-tone coloring, selection highlight, coordinate debug labels. |
| **PROTO-01.7** | Input handling | **Done** | Click-to-select in `main.ts`. `pixelToHex()` converts mouse position to hex. Toggle-select on click. |
| **PROTO-01.8** | Move execution | **Not started** | No move logic at all. |
| **PROTO-01.9** | Turn alternation | **Not started** | No turn tracking. |
| **PROTO-01.10** | Game loop | **Partially done** | Event-driven redraw loop exists (click → mutate state → render). But no game-specific loop (no moves, turns, etc). |

**Summary: 4 of 10 subtasks done, 1 partial, 1 decided-but-not-implemented, 4 not started.**

---

## What Exists in Code

```
proto01/src/
  hex.ts          — Hex coordinate system (doubled-width)
  hex.test.ts     — 47 tests for hex coords
  render.ts       — Canvas rendering (hexToPixel, pixelToHex, drawHexagon, render)
  main.ts         — Entry point, canvas setup, click handler
  pieces/
    types.ts      — Player, PieceType, PieceVariant, Piece, constructors, display
    types.test.ts — 14 tests for piece types
    index.ts      — Re-exports
```

All 61 tests pass. Dev server runs on port 5888.

---

## The Gap to "Pieces on Screen"

Three things needed:

1. **Board data structure** (PROTO-01.3) — A `Map<string, Piece>` keyed by hexKey, connecting hexes to pieces.
2. **Starting position** (PROTO-01.5) — Either hardcode an array of `{hex, piece}` pairs, or implement the visual string parser. Format decided but not built.
3. **Render pieces on hexes** — `render.ts` draws empty hexes with coordinate labels. `pieceSymbol()` exists in `pieces/types.ts` but isn't wired to the renderer.

---

## The Gap to "Playable" (Full PROTO-01)

Beyond rendering pieces:

4. **Click-to-move** (PROTO-01.8) — Select source piece, select destination, execute move.
5. **Turn tracking** (PROTO-01.9) — Alternate white/black.
6. **Capture** (PROTO-01.8) — Remove opponent piece when landing on occupied cell.
7. **Wire it together** (PROTO-01.10) — Full game loop.

Note: PROTO-01 intentionally has **no move validation** — any piece can move anywhere. Legal moves come in PROTO-03/04.

---

## Open Decisions Blocking Progress

| Question | Impact | Options |
|----------|--------|---------|
| **Board size** | Affects everything downstream | 7x7 (current render default), 9x9, or other |
| **Row 0 orientation** | Affects string parser & display | Top or bottom |
| **Variant encoding in strings** | Affects parser complexity | `N` vs `Na` |
| **Actual piece layout** | Needed for PROTO-01.5 | Not designed yet |

---

## Code Health

- All 61 tests pass
- Clean architecture: functional stateless rendering, no class spaghetti
- Solid foundation to build on

---

Written-by: agent #20.0.0 claude-opus-4-6 via claude-code 2026-02-05T19:03:00Z
