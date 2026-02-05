# Underchex - Proposal - Piece Movement Spec

#underchex #proposal #spec #pieces #movement #proto-01

**Task**: PROTO-01.4 Piece types
**Goal**: Define piece movement rules in language-agnostic JSON.

---

## Core Concepts

**Directions** (6-way hex adjacency):
- `N`, `S` - vertical
- `NE`, `NW`, `SE`, `SW` - diagonals

**Movement types**:
- **Step**: Move exactly 1 square (King)
- **Ride**: Move any number of squares in a line (Queen, Lance, Chariot)
- **Leap**: Jump to specific offset, ignoring intervening squares (Knight)

**Move vs Capture**: Some pieces move and capture differently (Pawn).

---

## Recommendation: Direction-Based Schema

> **NOTE**: The movesets below are ILLUSTRATIVE EXAMPLES ONLY. The actual piece movements for Underchex are not yet finalized and these values are intentionally wrong. This section demonstrates the schema format, not the game rules.

```json
{
  "version": "0.1",
  "directions": ["N", "S", "NE", "NW", "SE", "SW"],
  "pieces": {
    "king": {
      "moves": [
        { "type": "step", "dirs": ["N", "S", "NE", "NW", "SE", "SW"] }
      ]
    },
    "queen": {
      "moves": [
        { "type": "ride", "dirs": ["N", "S", "NE", "NW", "SE", "SW"] }
      ]
    },
    "pawn": {
      "moves": [
        { "type": "step", "dirs": ["N"], "mode": "move" },
        { "type": "step", "dirs": ["N", "NE", "NW"], "mode": "capture" }
      ]
    },
    "knight": {
      "variants": {
        "A": { "moves": [{ "type": "leap", "offsets": ["N+NW", "S+SE"] }] },
        "B": { "moves": [{ "type": "leap", "offsets": ["N+NE", "S+SW"] }] },
        "C": { "moves": [{ "type": "leap", "offsets": ["NW+SW", "NE+SE"] }] }
      }
    },
    "lance": {
      "variants": {
        "A": { "moves": [{ "type": "ride", "dirs": ["N", "S", "NW", "SE"] }] },
        "B": { "moves": [{ "type": "ride", "dirs": ["N", "S", "NE", "SW"] }] }
      }
    },
    "chariot": {
      "moves": [
        { "type": "ride", "dirs": ["NE", "NW", "SE", "SW"] }
      ]
    }
  }
}
```

**Key points:**
- `type`: step (1 square), ride (any distance), leap (specific offset)
- `dirs`: which of the 6 directions
- `mode`: "move", "capture", or "both" (default)
- `variants`: pieces with color-locked movement get nested definitions
- Knight offsets like `"N+NW"` mean "go N then NW" (the elephant leap)

---

## Alternative A: Offset-Based (More Explicit)

> **NOTE**: Example movesets only - not actual game rules.

```json
{
  "pieces": {
    "king": {
      "moves": [
        { "offset": [0, -1], "range": 1 },
        { "offset": [0, +1], "range": 1 },
        { "offset": [+1, -1], "range": 1 },
        { "offset": [-1, -1], "range": 1 },
        { "offset": [+1, +1], "range": 1 },
        { "offset": [-1, +1], "range": 1 }
      ]
    },
    "queen": {
      "moves": [
        { "offset": [0, -1], "range": "unlimited" },
        { "offset": [+1, -1], "range": "unlimited" }
      ]
    }
  }
}
```

**Pros:** Unambiguous, works for any coordinate system
**Cons:** Verbose, harder to read, tied to specific coord representation

---

## Alternative B: Fairy Chess Betza Notation

> **NOTE**: Example movesets only - not actual game rules.

```json
{
  "pieces": {
    "king": "K",
    "queen": "Q",
    "pawn": "fW/fcF",
    "knight": { "A": "A(N-NW)", "B": "A(N-NE)", "C": "A(E-W)" },
    "lance": { "A": "R(N,S,NW,SE)", "B": "R(N,S,NE,SW)" },
    "chariot": "B"
  }
}
```

**Pros:** Compact, familiar to chess variant designers
**Cons:** Requires parser, learning curve, less self-documenting

---

## Open Questions

1. **Knight leap representation**: `"N+NW"` vs explicit offsets `[dcol, drow]`?
   - String is readable but needs parsing
   - Offsets are unambiguous but verbose

2. **Move/capture separation**: Inline `mode` field vs separate `moves`/`captures` arrays?

3. **How to handle promotion?** Pawns reaching far rank - separate spec or inline?

4. **Special moves**: Any castling/en-passant equivalents? Defer for now.

---

Drafted-by: agent #17.0.0 claude-opus-4-5 via claude-code 2026-02-04T21:50:00Z
Edited-by: agent #17.0.0 claude-opus-4-5 via claude-code 2026-02-04T21:55:00Z
