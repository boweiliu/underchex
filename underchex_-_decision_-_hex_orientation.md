# Underchex - Decision - Hex Orientation

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
WRONG (flat-top, odd-r):

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

**Pointy-top hexes with column-based offset** (odd-q):
- Columns are contiguous vertically (like chess files a-h)
- Odd columns shifted down
- Rows are staggered/alternating

```
CORRECT (pointy-top, odd-q):

              col 0   col 1   col 2   col 3   col 4

               /\      /\      /\      /\      /\
 row 0:       /  \    /  \    /  \    /  \    /  \
              \  /    \  /    \  /    \  /    \  /
               \/  /\  \/  /\  \/  /\  \/  /\  \/
 row 1:           /  \    /  \    /  \    /  \
                  \  /    \  /    \  /    \  /
               /\  \/  /\  \/  /\  \/  /\  \/  /\
 row 2:       /  \    /  \    /  \    /  \    /  \
              \  /    \  /    \  /    \  /    \  /
               \/      \/      \/      \/      \/
```

**Key difference**:
- A column (file) is a vertical line of adjacent hexes
- Odd columns are offset downward by half a hex height
- This matches chess intuition: files (a-h) are vertical, ranks (1-8) are horizontal-ish

---

## Terminology

| Term | Meaning |
|------|---------|
| **File** | A contiguous vertical column (col 0, col 1, ...) — like chess files a-h |
| **Rank** | A staggered horizontal row — cells alternate between two y-positions |
| **Pointy-top** | Hex orientation with vertices pointing up/down |
| **Flat-top** | Hex orientation with flat edges at top/bottom |
| **Odd-q offset** | Odd columns shifted down by half a hex |

---

## Coordinate System (Corrected)

Using **offset coordinates (col, row)** with **pointy-top, odd-q**:

```
        col:    0       1       2       3       4

                /\              /\              /\
               /  \            /  \            /  \
 row 0:       |0,0 |          |2,0 |          |4,0 |
               \  /    /\      \  /    /\      \  /
                \/    /  \      \/    /  \      \/
 row 1:              |1,1 |          |3,1 |
                /\    \  /    /\      \  /    /\
               /  \    \/    /  \      \/    /  \
 row 2:       |0,2 |          |2,2 |          |4,2 |
               \  /    /\      \  /    /\      \  /
                \/    /  \      \/    /  \      \/
 row 3:              |1,3 |          |3,3 |
                      \  /            \  /
                       \/              \/
```

Wait — this doesn't look right either. Let me reconsider...

Actually with odd-q offset, **all rows exist for all columns**, but odd columns are shifted down:

```
        col:    0       1       2       3       4

                /\      /\      /\      /\      /\
               /  \    /  \    /  \    /  \    /  \
 row 0:       |0,0 |  |1,0 |  |2,0 |  |3,0 |  |4,0 |
               \  /    \  /    \  /    \  /    \  /
                \/  /\  \/  /\  \/  /\  \/  /\  \/
                   /  \    /  \    /  \    /  \
 row 1:       |0,1 |  |1,1 |  |2,1 |  |3,1 |  |4,1 |
               \  /    \  /    \  /    \  /    \  /
                \/  /\  \/  /\  \/  /\  \/  /\  \/
                   /  \    /  \    /  \    /  \
 row 2:       |0,2 |  |1,2 |  |2,2 |  |3,2 |  |4,2 |
               \  /    \  /    \  /    \  /    \  /
                \/      \/      \/      \/      \/
```

**Key**: Odd columns (1, 3, ...) are shifted DOWN by half a hex height.

---

## Neighbor Offsets (Pointy-top, Odd-q)

From cell `(col, row)`:

**Even column (col % 2 == 0)**:
| Direction | Offset (dcol, drow) |
|-----------|---------------------|
| N         | (0, -1)             |
| S         | (0, +1)             |
| NE        | (+1, -1)            |
| SE        | (+1, 0)             |
| NW        | (-1, -1)            |
| SW        | (-1, 0)             |

**Odd column (col % 2 == 1)**:
| Direction | Offset (dcol, drow) |
|-----------|---------------------|
| N         | (0, -1)             |
| S         | (0, +1)             |
| NE        | (+1, 0)             |
| SE        | (+1, +1)            |
| NW        | (-1, 0)             |
| SW        | (-1, +1)            |

---

## Why This Matters for Chess

- **Files (columns)** are the primary axis for piece movement (rooks move along files)
- **Forward/backward** maps naturally to row +/-
- **Pawn promotion** happens at the far row (row 0 or row N)
- Contiguous columns = cleaner file-based logic

---

## Decision

**Use pointy-top hexes with odd-q column offset.**

- Columns (files) are contiguous vertically
- Odd columns shifted down
- Coordinates: `(col, row)` where col = file, row = rank-ish

---

Created-by: agent #16.0.0 claude-opus-4-5 via claude-code 2026-02-04T22:15:00Z
