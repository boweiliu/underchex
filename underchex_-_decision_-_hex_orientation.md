# Underchex - Decision - Hex Orientation

#underchex #proto-01 #coordinates #decision #orientation

**Related**: [[Hex Coordinate Systems]] (nb 146), [[PROTO-01.3 Board Data Structure]] (nb 166)

---

## The Issue

Previous docs assumed **flat-top hexes with row-based offset** (odd-r):
- Rows are contiguous horizontally
- Odd rows shifted right
- Columns are staggered/alternating

```
WRONG (flat-top, odd-r — rows contiguous):

          col:  0     1     2     3     4
              ___   ___   ___   ___   ___
 row 0:      /   \ /   \ /   \ /   \ /   \    <- row is contiguous
             \___/ \___/ \___/ \___/ \___/
                \___/ \___/ \___/ \___/
 row 1:         /   \ /   \ /   \ /   \       <- row shifted right
                \___/ \___/ \___/ \___/
```

---

## What We Actually Want

**Flat-top hexes with column-based offset** (odd-q):
- Columns are contiguous vertically (like chess files a-h)
- Odd columns shifted down
- Rows are staggered/alternating

```
CORRECT (flat-top, odd-q — columns contiguous):

        col 0       col 1       col 2       col 3       col 4
          |           |           |           |           |
          v           v           v           v           v
         ___         ___         ___         ___         ___
        /   \       /   \       /   \       /   \       /   \
 r0    | 0,0 |     | 1,0 |     | 2,0 |     | 3,0 |     | 4,0 |
        \___/       \___/       \___/       \___/       \___/
        /   \   ___/   \___     /   \   ___/   \___     /   \
 r1    | 0,1 | /   \   /   \   | 2,1 | /   \   /   \   | 4,1 |
        \___/ | 1,1 | | 3,1 |   \___/ | 1,1 | | 3,1 |   \___/
        /   \ \___/ | \___/     /   \ \___/   \___/     /   \
 r2    | 0,2 |       |         | 2,2 |                 | 4,2 |
        \___/       ...        \___/                    \___/
```

Hmm, that's hard to draw. Simpler version — a single column is a vertical stack:

```
    COLUMN 0 (file "a")      COLUMN 1 (file "b") — shifted down half hex
         ___
        /   \                      ___
       | 0,0 |                    /   \
        \___/                    | 1,0 |
        /   \                     \___/
       | 0,1 |                    /   \
        \___/                    | 1,1 |
        /   \                     \___/
       | 0,2 |                    /   \
        \___/                    | 1,2 |
        /   \                     \___/
       | 0,3 |                    /   \
        \___/                    | 1,3 |
                                  \___/
         ^                          ^
     contiguous                 contiguous
      vertically                vertically
```

---

## Terminology

| Term | Meaning |
|------|---------|
| **File** | A contiguous vertical column (col 0, col 1, ...) — like chess files a-h |
| **Rank** | A staggered horizontal row — cells alternate between two y-positions |
| **Flat-top** | Hex orientation with flat edges at top/bottom (`___`) |
| **Pointy-top** | Hex orientation with vertices pointing up/down (`/\`) |
| **Odd-q offset** | Odd columns shifted down by half a hex height |
| **Odd-r offset** | Odd rows shifted right by half a hex width (NOT what we want) |

---

## Coordinate System

Using **offset coordinates (col, row)** with **flat-top, odd-q**:
- `col` = file (0, 1, 2, ...) — vertical, contiguous
- `row` = rank-ish (0, 1, 2, ...) — horizontal, staggered

```
        col:    0       1       2       3       4
               ___             ___             ___
              /   \           /   \           /   \
 row 0:      | 0,0 |         | 2,0 |         | 4,0 |
              \___/   ___     \___/   ___     \___/
              /   \  /   \    /   \  /   \    /   \
 row 1:      | 0,1 || 1,0 |  | 2,1 || 3,0 |  | 4,1 |
              \___/  \___/    \___/  \___/    \___/
              /   \  /   \    /   \  /   \    /   \
 row 2:      | 0,2 || 1,1 |  | 2,2 || 3,1 |  | 4,2 |
              \___/  \___/    \___/  \___/    \___/
              /   \  /   \    /   \  /   \    /   \
 row 3:      | 0,3 || 1,2 |  | 2,3 || 3,2 |  | 4,3 |
              \___/  \___/    \___/  \___/    \___/
                     /   \           /   \
 row 4:             | 1,3 |         | 3,3 |
                     \___/           \___/
```

**Key observations**:
- Even columns (0, 2, 4) align vertically
- Odd columns (1, 3) are shifted down half a hex
- Each column is contiguous top-to-bottom

---

## Neighbor Offsets (Flat-top, Odd-q)

From cell `(col, row)`:

**Even column (col % 2 == 0)**:
| Direction | Offset (dcol, drow) |
|-----------|---------------------|
| N         | (0, -1)             |
| S         | (0, +1)             |
| NE        | (+1, 0)             |
| SE        | (+1, +1)            |
| NW        | (-1, 0)             |
| SW        | (-1, +1)            |

**Odd column (col % 2 == 1)**:
| Direction | Offset (dcol, drow) |
|-----------|---------------------|
| N         | (0, -1)             |
| S         | (0, +1)             |
| NE        | (+1, -1)            |
| SE        | (+1, 0)             |
| NW        | (-1, -1)            |
| SW        | (-1, 0)             |

---

## Why Flat-Top?

**Pawns march step-by-step.** In chess, pawns advance one square at a time — a satisfying, incremental march forward. With flat-top hexes and contiguous columns:
- Moving N or S is a single step along the file
- Pawns advance row-by-row in a natural, chess-like rhythm
- "Forward" is visually and logically clear

(This may change later, but it's the reasoning for now.)

---

## Doubled-HEIGHT Internal Coordinates

**Problem**: Offset coordinates have ugly even/odd casework for neighbor calculations.

**Solution**: Store **doubled-height** coordinates internally for clean neighbor math.

For odd-q (columns contiguous), we double the ROW axis, not the column axis:

```typescript
interface Hex {
  col: number;   // standard column
  drow: number;  // doubled row = row * 2 + (col & 1)
}

function hex(col: number, row: number): Hex {
  return { col, drow: row * 2 + (col & 1) };
}

function offsetRow(h: Hex): number {
  return h.drow >> 1;  // recover display row
}
```

**Constant neighbor offsets** (no even/odd branching):

| Direction | Offset (dcol, ddrow) |
|-----------|----------------------|
| N         | (0, -2)              |
| S         | (0, +2)              |
| NE        | (+1, -1)             |
| NW        | (-1, -1)             |
| SE        | (+1, +1)             |
| SW        | (-1, +1)             |

**Note:** The 6 directions are **N, S, NE, NW, SE, SW** — no E/W. This matches the game design in README.md.

**Why this works**:
- Odd columns are shifted down by half a hex → in doubled space, that's +1 to drow
- N/S moves change drow by ±2 (full row step)
- Diagonal moves change col by ±1 and drow by ±1
- All offsets are constant — no `if (col % 2)` branching

---

## Decision

**Use flat-top hexes with odd-q column offset and doubled-HEIGHT internal storage.**

- Flat edges at top/bottom of each hex
- Columns (files) are contiguous vertically
- Odd columns shifted down
- External coordinates: `(col, row)` where col = file, row = rank
- Internal storage: `(col, drow)` where `drow = row * 2 + (col & 1)`
- 6 directions: N, S, NE, NW, SE, SW (no E/W)

---

Created-by: agent #16.0.0 claude-opus-4-5 via claude-code 2026-02-04T22:15:00Z
Edited-by: agent #16.0.0 claude-opus-4-5 via claude-code 2026-02-04T22:25:00Z (corrected to flat-top per user feedback)
Edited-by: agent #16.0.0 claude-opus-4-5 via claude-code 2026-02-04T22:35:00Z (fixed reasoning, added doubled-width section)
Edited-by: agent #16.0.0 claude-opus-4-5 via claude-code 2026-02-04T23:10:00Z (doubled-HEIGHT not width; directions N/S not E/W)
