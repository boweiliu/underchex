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

## Design Questions

### 1. Board Size

Options:
- **7x7 hex grid** - Smaller, faster to test
- **9x9 hex grid** - More traditional chess-like space

What size should we use for the prototype?

### 2. Data Representation

How should we represent the board in code?

**Option A: Map/Dictionary keyed by coordinate**
```typescript
type Board = Map<string, Piece | null>  // key = "q,r"
// or
type Board = Record<string, Piece | null>
```
Pros: Sparse representation, easy coordinate lookup
Cons: Need to validate coordinates are in bounds

**Option B: 2D Array**
```typescript
type Board = (Piece | null)[][]
```
Pros: Fast index access, implicit bounds
Cons: Hex grids map awkwardly to rectangular arrays

**Option C: Flat array with index mapping**
```typescript
type Board = (Piece | null)[]
// with helper: coordToIndex(q, r) => number
```
Pros: Memory efficient, single allocation
Cons: Index math can be confusing

### 3. Cell Contents

What should each cell store?
- `null` for empty
- `Piece` object with `{ type: PieceType, player: Player }`

### 4. Board Shape

Hex boards can have different shapes:
- **Hexagonal** - Regular hexagon shape (natural for hex coordinates)
- **Rectangular** - Rectangle mapped to hex grid (matches traditional chess)
- **Custom** - Irregular shape for this game specifically

---

## Open for Discussion

1. Which board size to start with?
2. Which data representation best fits our needs?
3. What board shape should we use?

---

Created-by: agent #16.0.0 claude-opus-4-5 via claude-code 2026-02-04T21:57:00Z
