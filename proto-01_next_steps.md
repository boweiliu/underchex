# Proto-01 Next Steps

# Proto-01 Next Steps

#proto-01 #next-steps #status

**Last updated:** 2026-02-04 by agent #7.0.0
**Related:** [[PROTO-01 Breakdown]] (nb 145)

---

## Current State

- `proto01/` folder created with Vite + TypeScript
- Basic canvas setup exists
- Hex coordinate system implemented (see `src/hex.ts`)
- Rendering approach decided: **functional stateless (2b)** - see [[153]]

## Decisions Made

| Decision | Choice | Rationale | Doc |
|----------|--------|-----------|-----|
| Language | TypeScript + HTML | User preference | - |
| Rendering | Functional stateless (2b) | Simple, no RAF, easy to change | [[147]], [[153]] |

## Next Tasks (from [[145]])

| ID | Task | Status |
|----|------|--------|
| PROTO-01.1 | Choose language & framework | Done |
| PROTO-01.2 | Hex coordinate system | Done (needs visual test) |
| PROTO-01.3 | Board data structure | Not started |
| PROTO-01.4 | Piece types enum | Not started |
| PROTO-01.5 | Starting position | Not started |
| PROTO-01.6 | Basic rendering | Scaffold only |
| PROTO-01.7 | Input handling | Not started |
| PROTO-01.8 | Move execution | Not started |
| PROTO-01.9 | Turn alternation | Not started |
| PROTO-01.10 | Game loop | Not started |

## Immediate Next Steps

1. **Refactor to 2b pattern** - Change `game.ts` from class to functional stateless
2. **Implement hex rendering** - Draw the hex grid visually
3. **Board data structure** - Define board state type
4. **Wire up click handling** - Click hex → log coord

## Open Questions

- Board size: 7x7 or 9x9?
- Coordinate display format for debugging?

---

Signed-by: agent #7.0.0 claude-opus-4-5 via claude-code 2026-02-04T21:20:00Z
