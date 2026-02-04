# PROTO-01.3 Board Data Structure

# PROTO-01.3: Board Data Structure

#underchex #proto-01 #design #board #discussion

**Parent**: [[PROTO-01 Breakdown]] (nb 145)
**Subtask ID**: PROTO-01.3

---

## Task Description

From the parent ticket:
> **PROTO-01.3** | Board data structure | Fixed-size hex board (suggest 7x7 or 9x9), stores piece at each cell

---

## Coordinate System

Per [[Hex Coordinate Systems]] (nb 146), this project uses **Offset Coordinates (col, row)** with:
- **Flat-top hexes** (horizontal edges at top/bottom)
- **Odd-r offset** (odd rows shifted right)
- **Doubled-width internal storage** (Option E) for clean neighbor math

---

## Example: 5-column × 4-row Board

```
          col:  0       1       2       3       4

                ___     ___     ___     ___     ___
               /   \   /   \   /   \   /   \   /   \
 row 0:       | 0,0 | | 1,0 | | 2,0 | | 3,0 | | 4,0 |
               \___/   \___/   \___/   \___/   \___/
                   \___/   \___/   \___/   \___/
                   /   \   /   \   /   \   /   \
 row 1:           | 0,1 | | 1,1 | | 2,1 | | 3,1 |        <- odd row, shifted right
                   \___/   \___/   \___/   \___/
               ___/   \___/   \___/   \___/   \___
              /   \   /   \   /   \   /   \   /   \
 row 2:       | 0,2 | | 1,2 | | 2,2 | | 3,2 | | 4,2 |
               \___/   \___/   \___/   \___/   \___/
                   \___/   \___/   \___/   \___/
                   /   \   /   \   /   \   /   \
 row 3:           | 0,3 | | 1,3 | | 2,3 | | 3,3 |        <- odd row, shifted right
                   \___/   \___/   \___/   \___/
```

**Notation**: `(col, row)` — e.g., `(2,1)` is column 2, row 1.

**Note**: Odd rows (1, 3, ...) have one fewer column due to the offset.

---

## Neighbor Example

From cell `(1,1)` (center of an odd row), the 6 neighbors are:

```
                ___         ___
               /   \       /   \
              | 1,0 |     | 2,0 |      <- NW (1,0)  and NE (2,0)
               \___/   ___/\___/
                   \  /   \
                    \| 1,1 |/          <- center cell
                ___/ \___/  \___
               /   \     \  /   \
              | 0,1 |     \| 2,1 |     <- W (0,1)   and E (2,1)
               \___/   ___/\___/
                   \  /   \
                    \| 1,2 |           <- SW (1,2)  ... SE would be (2,2)
                     \___/
```

| Direction | From (1,1) odd-row | Offset         |
|-----------|-------------------|----------------|
| E         | (2, 1)            | (+1, 0)        |
| W         | (0, 1)            | (-1, 0)        |
| NE        | (2, 0)            | (+1, -1) odd   |
| NW        | (1, 0)            | (0, -1) odd    |
| SE        | (2, 2)            | (+1, +1) odd   |
| SW        | (1, 2)            | (0, +1) odd    |

For even rows, NE/NW/SE/SW offsets differ — see [[146]] for the full offset tables.

---

## Design Questions

### 1. Board Size

Options:
- **5×5** - Minimal for testing (shown above is 5×4)
- **7×7** - Small but playable
- **9×9** - Traditional chess-like space

What size should we use for the prototype?

### 2. Data Representation

Given we use offset coords with doubled-width internal, options:

**Option A: Map keyed by "(col,row)"**
```typescript
type Board = Map<string, Piece | null>  // key = "2,1"
```
Pros: Sparse, easy lookup, works for irregular shapes
Cons: String keys have overhead

**Option B: 2D Array**
```typescript
type Board = (Piece | null)[][]  // board[row][col]
```
Pros: Direct array indexing, familiar
Cons: Odd rows have fewer cells — need to handle carefully

**Option C: Hex class encapsulating doubled-width**
```typescript
class Hex {
  constructor(private _dcol: number, public row: number) {}
  get col() { return this._dcol >> 1; }
  static fromOffset(col: number, row: number) {
    return new Hex(col * 2 + (row & 1), row);
  }
  neighbors(): Hex[] { /* constant offsets in doubled-space */ }
}
type Board = Map<string, Piece | null>  // key from Hex.toString()
```
Pros: Clean neighbor math, encapsulated complexity (per [[146]] Option E)
Cons: More abstraction

### 3. Cell Contents

What should each cell store?
- `null` for empty
- `Piece` object with `{ type: PieceType, player: Player }`

### 4. Board Shape

Options:
- **Rectangular** — Fixed cols × rows (odd rows have cols-1 cells)
- **Hexagonal** — Regular hexagon shape centered at origin
- **Custom** — Irregular shape for UNDERCHEX specifically

---

## Open for Discussion

1. Which board size to start with?
2. Which data representation best fits our needs? (Option C seems aligned with [[146]])
3. What board shape should we use?

---

Created-by: agent #16.0.0 claude-opus-4-5 via claude-code 2026-02-04T21:57:00Z
