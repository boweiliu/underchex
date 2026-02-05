# Underchex - Reference - Offset Hex Coords

# Offset Hex Coords - Cleaner Representations

#underchex #proto-01 #coordinates #reference

**Parent decision**: [Underchex - Decision - Hex Coordinate System](/docs/underchex_decision_hex_coordinate_system)

**Context**: We've chosen offset coordinates for UNDERCHEX because N/S directions are semantically special in chess. The problem: standard offset coords have ugly even/odd row casework for neighbor calculations.

**Goal**: Find a representation that keeps offset's intuitive row-based structure but avoids casework.

---

## Summary

| Option | Casework? | Familiar API? | Clean Math? | Complexity |
|--------|-----------|---------------|-------------|------------|
| A: Lookup table | Hidden | Yes | No | Low |
| **B: Doubled-width** | **No** | No | **Yes** | **Low** |
| C: Axial internal | No | Yes | Yes | Medium |
| D: Direction enum | Hidden | Yes | No | Medium |
| E: Hybrid | No | Yes | Yes | Medium |

---

## Agent Recommendation: Option B (Pure Doubled-Width)

Go with **Option B** — pure doubled-width coordinates, no hybrid wrapper.

**Why not Option E (hybrid)?** The hybrid adds indirection to preserve "familiar" column numbers, but:
- We're building something new. There's no existing user base expecting specific column numbers.
- The abstraction layer adds complexity for a benefit (familiar cols) that doesn't matter yet.
- If we later need pretty display, we can add a formatting function. We don't need it baked into the core data structure.

**Why Option B works:**
- Zero casework. Neighbors are just `[(+2,0), (-2,0), (+1,-1), (-1,-1), (+1,+1), (-1,+1)]`.
- Low complexity — it's just a coordinate system, not an abstraction layer.
- Row axis stays meaningful for chess (N/S direction).
- Sparse columns (0,2,4 vs 1,3,5) are a minor debugging quirk, not a real problem.

Start simple. Add abstraction only when we have a concrete reason.

Recommendation-by: agent #6.0.0 claude-opus-4-5 via claude-code 2026-02-04T22:55:00Z

---

## The Problem

Standard offset neighbor calculation:

```python
# Flat-top, odd-r offset
if row % 2 == 0:
    neighbors = [(col-1, row), (col+1, row), (col, row-1), (col+1, row-1), (col-1, row+1), (col, row+1)]
else:
    neighbors = [(col-1, row), (col+1, row), (col-1, row-1), (col, row-1), (col, row+1), (col+1, row+1)]
```

This branching:
- Is error-prone (easy to get the wrong list)
- Makes movement code harder to read
- Propagates into distance, line-drawing, and range calculations

---

## Option A: Lookup Table

Hide the casework in data instead of code:

```python
NEIGHBOR_OFFSETS = [
    # even rows: E, W, NE, NW, SE, SW
    [(+1,0), (-1,0), (0,-1), (-1,-1), (0,+1), (-1,+1)],
    # odd rows: E, W, NE, NW, SE, SW
    [(+1,0), (-1,0), (+1,-1), (0,-1), (+1,+1), (0,+1)],
]

def neighbors(col, row):
    return [(col + dc, row + dr) for dc, dr in NEIGHBOR_OFFSETS[row & 1]]
```

**Pros**:
- Simple to implement
- No change to coordinate system

**Cons**:
- Casework still exists, just moved to data
- Still need parity checks for distance, lines, etc.
- Doesn't help with understanding movement patterns

**Verdict**: Lipstick on a pig. Hides complexity without removing it.

---

## Option B: Doubled-Width Coordinates

Double the column values so the half-step becomes a full step:

```
Standard offset:              Doubled-width:
     0   1   2   3                 0   2   4   6
row 0: A   B   C   D          row 0: A   B   C   D
row 1:   E   F   G   H        row 1:   E   F   G   H  (cols 1,3,5,7)
row 2: I   J   K   L          row 2: I   J   K   L
```

Conversion: `doubled_col = col * 2 + (row & 1)`

Now ALL neighbors are constant offsets:

```python
DOUBLED_NEIGHBORS = [
    (+2,  0),  # E
    (-2,  0),  # W
    (+1, -1),  # NE
    (-1, -1),  # NW
    (+1, +1),  # SE
    (-1, +1),  # SW
]

def neighbors(dcol, row):
    return [(dcol + ddc, row + dr) for ddc, dr in DOUBLED_NEIGHBORS]
```

**Pros**:
- No casework anywhere
- Neighbors, distance, lines all become simple
- Row axis still clearly represents N/S

**Cons**:
- Column values are sparse (even rows use 0,2,4; odd rows use 1,3,5)
- Array indexing needs `dcol // 2` to get storage index
- Slightly unfamiliar when debugging

**Verdict**: Genuinely removes casework. Trade-off is sparse columns.

---

## Option C: Internal Axial, External Offset

Store offset for display, convert to axial for computation:

```python
def offset_to_axial(col, row):
    q = col - (row - (row & 1)) // 2
    r = row
    return (q, r)

def axial_to_offset(q, r):
    col = q + (r - (r & 1)) // 2
    row = r
    return (col, row)

# Neighbor calculation in axial (constant offsets)
AXIAL_NEIGHBORS = [(+1, 0), (+1, -1), (0, -1), (-1, 0), (-1, +1), (0, +1)]
```

**Pros**:
- Familiar offset for users
- Clean axial math internally
- Well-documented approach (Red Blob Games)

**Cons**:
- Two coordinate systems to keep track of
- Conversion formulas are fiddly and easy to mess up
- Context-switching overhead ("am I in axial or offset right now?")

**Verdict**: Viable but adds cognitive load. Best if we need heavy use of both systems.

---

## Option D: Direction Enum Abstraction

Hide coordinates entirely behind directional semantics:

```python
from enum import Enum

class HexDir(Enum):
    E = "east"
    W = "west"
    NE = "northeast"
    NW = "northwest"
    SE = "southeast"
    SW = "southwest"

class Hex:
    def __init__(self, col, row):
        self.col = col
        self.row = row

    def step(self, direction: HexDir) -> 'Hex':
        """Return adjacent hex in given direction."""
        # Internal casework, but caller never sees it
        if self.row & 1 == 0:
            offsets = {HexDir.E: (1,0), HexDir.W: (-1,0), ...}
        else:
            offsets = {HexDir.E: (1,0), HexDir.W: (-1,0), ...}
        dc, dr = offsets[direction]
        return Hex(self.col + dc, self.row + dr)
```

**Pros**:
- Caller code reads naturally: `pos.step(HexDir.N)`
- Casework fully encapsulated
- Easy to add chess-specific directions later (e.g., `FORWARD` that depends on player)

**Cons**:
- Casework still exists internally
- Overhead for simple operations
- Harder to do bulk operations (ranges, lines)

**Verdict**: Good API design, but doesn't solve the underlying complexity.

---

## Option E: Doubled Internal, Offset External (Hybrid)

Store doubled-width internally for clean math, expose offset externally for familiarity:

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class Hex:
    """Hex coordinate with doubled-width internal storage."""
    _dcol: int  # doubled column (internal)
    row: int

    @classmethod
    def from_offset(cls, col: int, row: int) -> 'Hex':
        """Create from familiar offset coordinates."""
        return cls(col * 2 + (row & 1), row)

    @property
    def col(self) -> int:
        """Display column (offset coordinates)."""
        return self._dcol // 2

    def __repr__(self):
        return f"Hex({self.col}, {self.row})"

    # Clean internal math - no casework!
    _NEIGHBORS = [(+2, 0), (-2, 0), (+1, -1), (-1, -1), (+1, +1), (-1, +1)]

    def neighbors(self):
        for ddcol, drow in self._NEIGHBORS:
            yield Hex(self._dcol + ddcol, self.row + drow)

    def distance(self, other: 'Hex') -> int:
        # Convert to cube coords for distance
        # (doubled-width to cube is straightforward)
        dcol_diff = abs(self._dcol - other._dcol)
        row_diff = abs(self.row - other.row)
        return (dcol_diff + max(0, row_diff - dcol_diff // 2))  # simplified
```

**Pros**:
- External API uses familiar offset: `Hex.from_offset(3, 2)`
- Internal math has no casework
- Single coordinate system (just two views of it)
- Easy to extend with direction enums later

**Cons**:
- Slight indirection (`col` is a property, not stored directly)
- Need to be careful about which representation to use in debug output

**Verdict**: Best balance. Clean internals, familiar interface.

---

## Open Questions

1. Which offset variant? (odd-r vs even-r) - affects which row has the "shifted" columns
2. Board orientation - which side is "north" (row 0 or row max)?
3. Should we add direction enums later for piece movement code?

---

Created-by: agent #6.0.0 claude-opus-4-5 via claude-code 2026-02-04T22:50:00Z
Edited-by: agent #6.0.0 claude-opus-4-5 via claude-code 2026-02-04T22:55:00Z
Edited-by: agent #9.0.0 claude-opus-4-5 via claude-code 2026-02-04T20:25:00Z
