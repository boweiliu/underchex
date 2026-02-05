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
| **PROTO-01.2** | Hex coordinate system | **Done (but needs refactor)** | Doubled-width offset coords in `hex.ts`. 47 unit tests passing. Bug found & fixed in `hexDistance`. **However**: code implements odd-r (rows contiguous) while decision says odd-q (columns contiguous) — see Orientation Gap below. |
| **PROTO-01.3** | Board data structure | **Doc only** | Design doc exists (nb 166) with diagrams and neighbor tables. No code — no `Board` type, no cell→piece mapping. |
| **PROTO-01.4** | Piece types enum | **Done (code + spec proposal)** | `pieces/types.ts`: Player, PieceType, PieceVariant, Piece interface, convenience constructors, display helpers. 14 tests. Also: JSON movement spec proposal in nb 180 (format approved, values are placeholders). Worklog (nb 184) notes user corrected agent twice — wanted cross-language data spec, not just TS types. |
| **PROTO-01.5** | Starting position | **Decided, not implemented** | Visual string notation format chosen (nb 181). Parser not written. Board size undecided. Piece layout not designed. Next steps doc exists (nb 188) with TDD test cases sketched out. |
| **PROTO-01.6** | Basic rendering | **Done** | Functional stateless renderer (pattern from nb 153). Flat-top hexes, two-tone coloring, selection highlight, debug labels. |
| **PROTO-01.7** | Input handling | **Done** | Click-to-select via `pixelToHex()`. Toggle-select on click. |
| **PROTO-01.8** | Move execution | **Not started** | |
| **PROTO-01.9** | Turn alternation | **Not started** | |
| **PROTO-01.10** | Game loop | **Partially done** | Event-driven redraw loop exists. No game mechanics wired. |

**Summary: 4 of 10 subtasks done, 1 partial, 2 have docs/decisions but no code, 3 not started.**

---

## Decisions Made (from docs)

| Decision | Choice | Doc | Status |
|----------|--------|-----|--------|
| Language | TypeScript + Vite + HTML Canvas | — | Implemented |
| Rendering pattern | Functional stateless (event-driven, not RAF) | nb 147, 153 | Implemented |
| Hex coords | Doubled-width offset (eliminates even/odd casework) | nb 146 | Implemented |
| Hex orientation | Flat-top, odd-q (columns contiguous vertically) | nb 170 | **NOT implemented** — code still uses odd-r |
| Coordinate transform | Layered: hex→board space, board→canvas space (separated) | nb 173 | Implemented |
| Piece data format | Cross-language JSON spec, not just TS types | nb 180 | Format approved, values TBD |
| Movement schema | Direction-based: step/ride/leap with dirs | nb 180 | Proposal only, values intentionally wrong |
| Starting position format | Visual string notation | nb 181 | Decided, not implemented |
| Piece variants | Knights have 3 colors (A/B/C), Lances have 2 (A/B) | nb 180, types.ts | In code |

---

## The Orientation Gap (Important)

The biggest code-vs-decision mismatch:

**Decision** (nb 170): flat-top hexes, odd-q — columns are contiguous vertically, like chess files. Doubled-height coords `(col, drow)`.

**Code** (`hex.ts`): flat-top hexes, odd-r — rows are contiguous horizontally. Doubled-width coords `(dcol, row)`. Directions are E/W horizontal.

**Refactor plan** exists (nb 179) with specific TODOs for every file, but was **never executed**. This means:
- `hex.ts` needs `(dcol, row)` → `(col, drow)`, direction offsets rewritten
- `hex.test.ts` needs all tests rewritten
- `render.ts` needs transform updates
- All 61 tests would need updating

This is prerequisite work before the board/pieces can be built on the correct foundation.

---

## What Exists in Code

```
proto01/src/
  hex.ts          — Hex coordinate system (doubled-width, odd-r — needs refactor to odd-q)
  hex.test.ts     — 47 tests for hex coords (need rewrite after refactor)
  render.ts       — Canvas rendering (hexToPixel, pixelToHex, drawHexagon, render)
  main.ts         — Entry point, canvas setup, click handler
  pieces/
    types.ts      — Player, PieceType, PieceVariant, Piece, constructors, display
    types.test.ts — 14 tests for piece types
    index.ts      — Re-exports
```

All 61 tests pass. Dev server runs on port 5888.

---

## What Exists in Docs (not yet in code)

| Doc | nb | Content |
|-----|-----|---------|
| Board data structure | 166 | Diagrams, neighbor tables for odd-q board |
| Hex orientation decision | 170 | Flat-top odd-q, terminology |
| Hex refactor plan | 179 | Line-by-line TODO for orientation change |
| Piece movement spec | 180 | JSON schema for step/ride/leap (format only, values TBD) |
| Starting position format | 181 | Visual string notation spec |
| Starting position next steps | 188 | TDD test cases sketched, parser tasks listed |

---

## The Gap to "Pieces on Screen"

1. **Fix orientation** — Execute refactor plan (nb 179) so code matches decisions. Or re-decide to keep odd-r.
2. **Board data structure** (PROTO-01.3) — A `Map<string, Piece>` connecting hexes to pieces.
3. **Starting position** (PROTO-01.5) — Hardcode piece placements or build the string parser.
4. **Render pieces on hexes** — `pieceSymbol()` exists but isn't wired to the draw loop.

## The Gap to "Playable" (Full PROTO-01)

5. **Click-to-move** (PROTO-01.8) — Select source, select destination, execute.
6. **Turn tracking** (PROTO-01.9) — Alternate white/black.
7. **Capture** (PROTO-01.8) — Remove opponent piece on landing.
8. **Wire it together** (PROTO-01.10) — Full game loop.

Note: PROTO-01 has **no move validation** — any piece can move anywhere. Legal moves come in PROTO-03/04.

---

## Open Decisions

| Question | Impact | Options | Notes |
|----------|--------|---------|-------|
| **Orientation refactor** | Blocks everything | Execute nb 179 plan, or re-decide to keep odd-r | Code/decision mismatch |
| **Board size** | Affects layout, parser, game feel | 7x7 (current default), 9x9, or other | |
| **Row 0 orientation** | Affects string parser & display | Top or bottom | |
| **Variant encoding** | Affects parser complexity | `N` vs `Na` | |
| **Actual piece layout** | Needed for starting position | Not designed yet | Game design question |
| **Keep TS types.ts?** | Code may duplicate JSON spec | Keep both, or revert TS in favor of spec/ | Flagged in worklog nb 184 |

---

## Process Learnings (from retros)

- **Decision chain traceability** (nb 178, 187): Decisions form chains (orientation → offset → doubled-width). When one node changes, agents need explicit links to check related nodes. The orientation/doubled-width gap was caught by user, not agent.
- **Design before code** (nb 184): Agent #17.0.0 jumped to implementing TS types before discussing data format. User corrected: "back up and think through." Cross-language projects need specs, not just code.
- **Separation of concerns** (nb 173): User caught board centering conflated with coordinate origin. Now properly layered.
- **Human preferences** (nb 162): Design before implementation; proposals in nb for review; tight task scope; visual formats for editability; TDD thinking.

---

## Code Health

- All 61 tests pass
- Clean architecture: functional stateless rendering
- Known technical debt: orientation mismatch between code and decisions

---

Written-by: agent #20.0.0 claude-opus-4-6 via claude-code 2026-02-05T19:03:00Z
Edited-by: agent #20.0.0 claude-opus-4-6 via claude-code 2026-02-05T19:10:00Z (added decisions, orientation gap, doc inventory, process learnings from nb review)
