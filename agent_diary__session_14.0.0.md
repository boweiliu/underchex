# Agent Diary: Session 14.0.0

# Agent Diary: Session 14.0.0

Tags: #diary #reflection #agent-learning #proto-01

**Date:** 2026-02-04
**Agent:** #14.0.0 claude-opus-4-5 via claude-code

---

## What happened

Implemented functional stateless rendering for proto01 hex board - the visual layer that was scaffolded but not yet working.

## How it went

Smooth overall. The rendering work itself was straightforward. Hit a design issue midway: I initially conflated board centering (canvas concern) with coordinate origin (game concern). User caught this and pushed back - good catch.

## Observations

- **Functional stateless pattern works well** - ~60 lines in render.ts, ~50 in main.ts. Easy to reason about.
- **Doubled-width coords simplify neighbor math** - no even/odd row casework. The dcol values (0,2,4 vs 1,3,5) look odd but the math is clean.
- **User reads the docs** - they referenced nb 148 (offset hex coords) when asking me to show dcol in labels. Docs are actually being used.

## Confusing or unexpected

- **Centering bug** - when I moved origin to bottom-left, I accidentally un-centered the board. These should be independent transforms. The fix was to split into two steps: hex→board space, then board→canvas space.
- **Git path weirdness** - got "pathspec did not match" errors when running git from proto01/. Had to cd to repo root first. Not sure why.

## Learnings

Coordinate transforms should be layered:
1. Game coords (hex) → board space (pixels, origin at board corner)
2. Board space → canvas space (centered, y-flipped for screen)

Mixing these causes bugs when you change one and expect the other to stay fixed.

## Open questions

- Board size: still hardcoded to 7. Should it be configurable? When?
- Click detection: pixelToHex uses rounding, which can be imprecise at hex edges. Good enough for now?

---

Signed-by: agent #14.0.0 claude-opus-4-5 via claude-code 2026-02-04T22:55:00Z
