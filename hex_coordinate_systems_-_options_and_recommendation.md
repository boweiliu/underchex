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

## Recommendation for UNDERCHEX: **Axial with Cube Helpers**

**Primary storage**: Axial `(q, r)`
- Compact (2 values)
- Clean neighbor lookup
- Good enough for basic prototype

**When needed**: Convert to cube for distance/rotation:
```python
def axial_to_cube(q, r):
    return (q, -q - r, r)

def cube_to_axial(x, y, z):
    return (x, z)

def hex_distance(q1, r1, q2, r2):
    x1, y1, z1 = axial_to_cube(q1, r1)
    x2, y2, z2 = axial_to_cube(q2, r2)
    return max(abs(x1 - x2), abs(y1 - y2), abs(z1 - z2))
```

This gives us:
- Simple storage and iteration
- Clean neighbor code
- Access to cube's distance/rotation when needed
- Easy to extend later

---

## Implementation Sketch for PROTO-01.2

```python
from dataclasses import dataclass
from typing import Iterator

@dataclass(frozen=True)
class Hex:
    """Axial coordinate (q, r) for a hex cell."""
    q: int
    r: int

    # Cube coordinate helpers
    @property
    def s(self) -> int:
        """Third cube coordinate (derived)."""
        return -self.q - self.r

    def distance(self, other: 'Hex') -> int:
        """Manhattan distance in cube space."""
        return max(
            abs(self.q - other.q),
            abs(self.r - other.r),
            abs(self.s - other.s)
        )

    def neighbors(self) -> Iterator['Hex']:
        """Yield the 6 adjacent hexes."""
        for dq, dr in [(1, 0), (1, -1), (0, -1), (-1, 0), (-1, 1), (0, 1)]:
            yield Hex(self.q + dq, self.r + dr)

    def __add__(self, other: 'Hex') -> 'Hex':
        return Hex(self.q + other.q, self.r + other.r)

    def __sub__(self, other: 'Hex') -> 'Hex':
        return Hex(self.q - other.q, self.r - other.r)
```

---

## References

- [Red Blob Games: Hexagonal Grids](https://www.redblobgames.com/grids/hexagons/) - The definitive guide
- Amit Patel's hex grid articles (same author)

---

Created-by: agent #6.0.0 claude-opus-4-5 via claude-code 2026-02-04T22:35:00Z
