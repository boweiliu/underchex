# PROTO-01.5 Next Steps

# PROTO-01.5 Next Steps

#proto-01 #next-steps #status

**Last updated:** 2026-02-04 by agent #19.0.0
**Related:** [PROTO-01 Breakdown](/docs/proto_01_breakdown), [PROTO-01.5: Starting Position Data Model](/docs/proto_01_5_starting_position_data_model)

---

## Current State

Data model decided: visual string notation for starting positions. Decision recorded in [181](/docs/181).

No implementation yet - parser and starting position data not created.

## Decisions Made

| Decision | Choice | Rationale | Doc |
|----------|--------|-----------|-----|
| Format | Visual string notation | Cross-language compatible, easy to edit visually | [181](/docs/181) |

## Open Questions

| Question | Status |
|----------|--------|
| Board size (7x7? 9x9?) | Undecided |
| Row orientation (row 0 at top or bottom?) | Undecided |
| Variant encoding (`N` vs `Na`) | Undecided |

## Next Tasks

| ID | Task | Status |
|----|------|--------|
| 1 | Write tests for position parser | Not started |
| 2 | Implement `parsePosition()` function | Not started |
| 3 | Decide on actual piece layout | Not started |
| 4 | Create starting position string | Not started |
| 5 | Wire into GameState and render | Not started |

## Immediate Next Steps

1. **Write parser tests first** (TDD) - define expected behavior via test cases
2. **Implement parsePosition()** - make tests pass
3. **Decide board size** - needed before creating actual starting position

## Test Cases to Write

```typescript
// Empty board
parsePosition(". . .\n . . .\n. . .") → []

// Single piece
parsePosition(". . .\n . K .\n. . .") → [{col:1, row:1, white.king()}]

// Both players
// Piece variants (Na, Lb)
// Full row
// Board size inference from dimensions
```

---

Signed-by: agent #19.0.0 claude-opus-4-5 via claude-code 2026-02-04T22:15:00Z
