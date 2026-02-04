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

> **UPDATED**: See [[Hex Orientation]] (nb 170) for the corrected orientation decision.

Per [[Hex Orientation]] (nb 170), this project uses **Offset Coordinates (col, row)** with:
- **Flat-top hexes** (horizontal edges at top/bottom)
- **Odd-q offset** (odd columns shifted down)
- Columns (files) are contiguous vertically — matches chess file intuition

---

## Example: 5-column × 4-row Board (Flat-top, Odd-q)

Each column is a contiguous vertical stack. Odd columns are shifted down.

```
    COLUMN 0        COLUMN 1        COLUMN 2        COLUMN 3        COLUMN 4
    (file a)        (file b)        (file c)        (file d)        (file e)
       ___             ___             ___             ___             ___
      /   \           /   \           /   \           /   \           /   \
r0   | 0,0 |         | 2,0 |         | 4,0 |         ...
      \___/   ___     \___/   ___     \___/
      /   \  /   \    /   \  /   \    /   \
r1   | 0,1 || 1,0 |  | 2,1 || 3,0 |  | 4,1 |
      \___/  \___/    \___/  \___/    \___/
      /   \  /   \    /   \  /   \    /   \
r2   | 0,2 || 1,1 |  | 2,2 || 3,1 |  | 4,2 |
      \___/  \___/    \___/  \___/    \___/
      /   \  /   \    /   \  /   \    /   \
r3   | 0,3 || 1,2 |  | 2,3 || 3,2 |  | 4,3 |
      \___/  \___/    \___/  \___/    \___/
             /   \           /   \
r4          | 1,3 |         | 3,3 |
             \___/           \___/

        ^       ^       ^       ^       ^
      file    file    file    file    file
    (contiguous vertically)
```

**Notation**: `(col, row)` — col = file (vertical), row = rank-ish (horizontal)

**Key**:
- Flat-top hexes (horizontal edges `___` at top/bottom)
- Odd columns (1, 3) shifted DOWN by half a hex
- Each column is contiguous vertically — like chess files

---

## Neighbor Example

From cell `(0,1)` (in an even column), the 6 neighbors are:

```
         ___
        /   \
       | 0,0 |  <- N
        \___/   ___
        /   \  /   \
       | 0,1 || 1,0 |  <- center + NE neighbor
        \___/  \___/
        /   \  /   \
       | 0,2 || 1,1 |  <- S + SE neighbor
        \___/  \___/
```

**Neighbor offsets for even column** (col % 2 == 0):
| Direction | From (0,1) | Offset (dcol, drow) |
|-----------|------------|---------------------|
| N         | (0, 0)     | (0, -1)             |
| S         | (0, 2)     | (0, +1)             |
| NE        | (1, 0)     | (+1, 0)             |
| SE        | (1, 1)     | (+1, +1)            |
| NW        | (-1, 0)    | (-1, 0)             |
| SW        | (-1, 1)    | (-1, +1)            |

**Neighbor offsets for odd column** (col % 2 == 1):
| Direction | Offset (dcol, drow) |
|-----------|---------------------|
| N         | (0, -1)             |
| S         | (0, +1)             |
| NE        | (+1, -1)            |
| SE        | (+1, 0)             |
| NW        | (-1, -1)            |
| SW        | (-1, 0)             |

See [[Hex Orientation]] (nb 170) for full details.

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
Edited-by: agent #16.0.0 claude-opus-4-5 via claude-code 2026-02-04T22:05:00Z
Edited-by: agent #16.0.0 claude-opus-4-5 via claude-code 2026-02-04T22:20:00Z (corrected to odd-q per [[170]])
Edited-by: agent #16.0.0 claude-opus-4-5 via claude-code 2026-02-04T22:28:00Z (corrected to flat-top per user)
