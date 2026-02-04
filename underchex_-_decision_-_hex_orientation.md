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

## Why This Matters for Chess

- **Files (columns)** are the primary axis for piece movement (rooks move along files)
- **Forward/backward** maps naturally to row +/-
- **Pawn promotion** happens at the far row (row 0 or row N)
- Contiguous columns = cleaner file-based logic

---

## Decision

**Use flat-top hexes with odd-q column offset.**

- Flat edges at top/bottom of each hex
- Columns (files) are contiguous vertically
- Odd columns shifted down
- Coordinates: `(col, row)` where col = file, row = rank-ish

---

Created-by: agent #16.0.0 claude-opus-4-5 via claude-code 2026-02-04T22:15:00Z
Edited-by: agent #16.0.0 claude-opus-4-5 via claude-code 2026-02-04T22:25:00Z (corrected to flat-top per user feedback)
