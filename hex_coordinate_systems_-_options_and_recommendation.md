# Hex Coordinate Systems - Options and Recommendation

# Hex Coordinate Systems - Options and Recommendation

#underchex #proto-01 #coordinates #reference

**Related tickets**: PROTO-01.2, BOARD-03

This doc explains the common hex coordinate systems and recommends one for UNDERCHEX.

---

## Overview

There are three main coordinate systems for hex grids. All are mathematically equivalent but differ in:
- Ease of implementation
- Neighbor calculation complexity
- Storage efficiency
- Intuitive-ness for debugging

---

## 1. Offset Coordinates

**How it works**: Traditional (col, row) like a square grid, but even/odd rows are offset.

```
  0   1   2   3   4       <- col
   ___     ___     ___
  /   \___/   \___/   \   row 0
  \___/   \___/   \___/
  /   \___/   \___/   \   row 1  (offset by half)
  \___/   \___/   \___/
```

**Two variants**:
- **odd-r**: Odd rows shifted right
- **even-r**: Even rows shifted right
- (Also odd-q/even-q for pointy-top hexes)

**Pros**:
- Maps directly to 2D arrays: `board[row][col]`
- Familiar to developers used to square grids

**Cons**:
- **Neighbor calculation is ugly** - depends on whether row is odd/even:
```python
# odd-r neighbors for cell (col, row)
if row % 2 == 0:
    neighbors = [(col-1, row), (col+1, row), (col, row-1), (col+1, row-1), (col-1, row+1), (col, row+1)]
else:
    neighbors = [(col-1, row), (col+1, row), (col-1, row-1), (col, row-1), (col, row+1), (col+1, row+1)]
```
- Distance calculations require conversion to another system
- Movement patterns (diagonals, lines) are complex to express

---

## 2. Axial Coordinates (q, r)

**How it works**: Two axes at 60° angle. Drop the third axis of cube coordinates.

```
        ___
       /0,0\___
       \___/1,0\___
       /0,1\___/2,0\
       \___/1,1\___/
       /0,2\___/2,1\
       \___/1,2\___/
           \___/
```

- **q**: Diagonal axis (↗ direction)
- **r**: Vertical axis (↓ direction)

**Neighbor offsets** (constant, no even/odd branching!):
```python
AXIAL_NEIGHBORS = [
    (+1,  0),  # E
    (+1, -1),  # NE
    ( 0, -1),  # NW
    (-1,  0),  # W
    (-1, +1),  # SW
    ( 0, +1),  # SE
]
```

**Pros**:
- Clean neighbor calculation (just add offsets)
- Only 2 values to store per cell
- Easy conversion to/from cube coords: `s = -q - r`
- Lines and diagonals are simple (just vary one coordinate)

**Cons**:
- Doesn't map directly to rectangular array without wasted space
- Visual layout in code can be confusing initially

---

## 3. Cube Coordinates (x, y, z)

**How it works**: Three axes at 60° angles with constraint: `x + y + z = 0`

```
      +y
       \
        \___
       /    \
  +x--<      >--
       \____/
        /
       /
     +z
```

**Neighbor offsets**:
```python
CUBE_NEIGHBORS = [
    (+1, -1,  0),  # E
    (+1,  0, -1),  # NE
    ( 0, +1, -1),  # NW
    (-1, +1,  0),  # W
    (-1,  0, +1),  # SW
    ( 0, -1, +1),  # SE
]
```

**Pros**:
- **Distance is trivial**: `dist = max(abs(x), abs(y), abs(z))`
- Rotation is elegant (cycle coordinates, negate for direction)
- Range/ring algorithms are cleanest
- Line drawing: just lerp and round (with constraint fix)

**Cons**:
- Redundant storage (3 values, only 2 degrees of freedom)
- Constraint `x + y + z = 0` must be maintained

---

## Comparison Table

| Feature | Offset | Axial | Cube |
|---------|--------|-------|------|
| Storage per cell | 2 | 2 | 3 |
| Neighbor calculation | Complex (even/odd) | Simple | Simple |
| Distance calculation | Convert first | Convert to cube | Trivial |
| Array mapping | Direct | Needs offset | Needs offset |
| Movement lines | Complex | Medium | Simple |
| Rotation | Very complex | Medium | Simple |
| Learning curve | Familiar | Moderate | Moderate |

---

## Decision: Offset Coordinates

**Chosen**: Offset coordinates (flat-top, odd-r or even-r variant TBD)

**Rationale**: In chess, N/S (forward/backward) movement is fundamentally different from sideways movement:
- Pawns only move forward
- Promotion happens at the far rank
- Castling is sideways
- "Ahead" vs "behind" matters for strategy

Offset coords preserve this directional asymmetry naturally - rows are rows, and the N/S axis is clearly distinguished. Axial/cube treat all 6 directions more symmetrically, which is elegant but obscures the chess-relevant distinction.

**Challenge**: The even/odd row casework for neighbors is ugly. See investigation below for cleaner approaches.

Decided-by: bowei 2026-02-04
Recorded-by: agent #6.0.0 claude-opus-4-5 via claude-code 2026-02-04T22:40:00Z

---

## Investigation: Cleaner Offset Representations

The goal: keep offset's intuitive row-based structure, but avoid the ugly even/odd neighbor casework.

### Option A: Lookup Table (Minimal Change)

Instead of if/else, use a 2-element array indexed by `row & 1`:

```python
# [even_row_offsets, odd_row_offsets]
NEIGHBOR_OFFSETS = [
    # E,      W,      NE,       NW,       SE,       SW       (even rows)
    [(+1,0), (-1,0), (0,-1),   (-1,-1),  (0,+1),   (-1,+1)],
    # E,      W,      NE,       NW,       SE,       SW       (odd rows)
    [(+1,0), (-1,0), (+1,-1),  (0,-1),   (+1,+1),  (0,+1)],
]

def neighbors(col, row):
    return [(col + dc, row + dr) for dc, dr in NEIGHBOR_OFFSETS[row & 1]]
```

**Verdict**: Still has casework, just hidden in data. No semantic improvement.

### Option B: Doubled-Width Coordinates

Double the column values so the half-step offset becomes a full step:

```
  Offset:     col 0   1   2           Doubled:    col 0  2  4
  row 0:        A   B   C             row 0:        A  B  C
  row 1:         D   E   F            row 1:         D  E  F  (cols 1,3,5)
```

Storage: `(col*2 + row%2, row)` — now neighbors are constant offsets!

```python
# Doubled-width neighbor offsets (constant!)
DOUBLED_NEIGHBORS = [
    (+2,  0),  # E
    (-2,  0),  # W
    (+1, -1),  # NE
    (-1, -1),  # NW
    (+1, +1),  # SE
    (-1, +1),  # SW
]
```

**Pros**: No casework! Clean neighbor math.
**Cons**: Column values are "sparse" (0,2,4 or 1,3,5 depending on row). Array indexing needs `col//2`.

### Option C: Store Offset, Compute in Axial

Keep offset for storage/display, but convert to axial for any neighbor/distance logic:

```python
def offset_to_axial(col, row):
    q = col - (row - (row & 1)) // 2  # or similar formula
    r = row
    return (q, r)

def axial_to_offset(q, r):
    col = q + (r - (r & 1)) // 2
    row = r
    return (col, row)
```

**Pros**: Best of both worlds conceptually.
**Cons**: Conversion overhead, two mental models, easy to get formulas wrong.

### Option D: Direction Enums with Semantic Meaning

Define directions by their chess meaning, hide coord math:

```python
from enum import Enum

class Direction(Enum):
    N = "north"      # toward opponent
    S = "south"      # toward home
    NE = "northeast"
    NW = "northwest"
    SE = "southeast"
    SW = "southwest"

def step(col, row, direction: Direction) -> tuple[int, int]:
    """Move one hex in the given direction."""
    # Internals handle even/odd, caller doesn't care
    ...
```

**Pros**: Caller code reads like chess (`step(pos, Direction.N)`), casework is encapsulated.
**Cons**: Still have casework internally, just hidden.

### Option E: Hybrid - Doubled Storage, Offset Display

Store doubled-width internally (for clean math), but display/input as familiar offset:

```python
@dataclass
class Hex:
    _dcol: int  # doubled column (internal)
    row: int

    @classmethod
    def from_offset(cls, col: int, row: int) -> 'Hex':
        return cls(col * 2 + (row & 1), row)

    @property
    def col(self) -> int:
        """Display column (offset coords)."""
        return self._dcol // 2

    def neighbors(self):
        for ddcol, drow in [(2,0), (-2,0), (1,-1), (-1,-1), (1,1), (-1,1)]:
            yield Hex(self._dcol + ddcol, self.row + drow)
```

**Pros**: Clean internal math, familiar external interface.
**Cons**: Slight complexity in the abstraction layer.

---

## Recommendation: Option E (Doubled Internal, Offset External)

This gives us:
1. **Familiar offset display** - users see (col, row) with rows being ranks
2. **Clean neighbor math** - no casework, just add constant offsets
3. **N/S preserved as special** - row axis is still clearly "forward/backward"
4. **Encapsulated complexity** - the doubling is an implementation detail

Next step: prototype this representation and see how it feels in practice.

---

## References

- [Red Blob Games: Hexagonal Grids](https://www.redblobgames.com/grids/hexagons/) - The definitive guide
- Amit Patel's hex grid articles (same author)

---

Created-by: agent #6.0.0 claude-opus-4-5 via claude-code 2026-02-04T22:35:00Z
Edited-by: agent #6.0.0 claude-opus-4-5 via claude-code 2026-02-04T22:42:00Z
