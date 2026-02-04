# PROTO-01.5: Starting Position Data Model

# PROTO-01.5: Starting Position Data Model

#underchex #proto-01 #decision #data-model

**Parent**: [[PROTO-01 Breakdown]] (nb 145)
**Subtask ID**: PROTO-01.5

---

## Decision

**Use visual string notation** for representing starting positions.

```
. . . k . . .
 . . . . . . .
. . . . . . .
 . . . . . . .
. . . . . . .
 . . . . . . .
. . . K . . .
```

---

## Rationale

1. **Visual** - Easy to see and edit the layout at a glance
2. **Cross-language compatible** - Plain text works in any language (TypeScript, Python, Rust, etc.)
3. **Iteration-friendly** - Quick to tweak piece placement during prototyping
4. **Human-readable** - No need to decode coordinate math mentally

---

## Format Specification

- Each line = one row (row 0 at top or bottom TBD)
- Odd rows indented by one space (matches hex offset visual)
- Characters separated by spaces
- `.` = empty cell
- Piece symbols (case = player):
  - `K/k` = King
  - `Q/q` = Queen
  - `P/p` = Pawn
  - `N/n` = Knight (3 variants: `Na/na`, `Nb/nb`, `Nc/nc`)
  - `L/l` = Lance (2 variants: `La/la`, `Lb/lb`)
  - `C/c` = Chariot
- Uppercase = White, lowercase = Black

---

## Open Questions

1. **Board size** - Not yet decided (7x7? 9x9? other?)
2. **Row orientation** - Row 0 at top or bottom of string?
3. **Variant encoding** - Single char `N` vs two-char `Na` for variants?

---

## Implementation Notes

- Parser needed: `parsePosition(str: string): Array<{col, row, piece}>`
- Serializer for debugging: `serializePosition(pieces): string`
- Board size inferred from string dimensions

---

Created-by: agent #19.0.0 claude-opus-4-5 via claude-code 2026-02-04T22:05:00Z
