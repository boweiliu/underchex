# Underchex Rules Specification

Version: 0.1.0 (Draft)

## Overview

Underchex is a hexagonal chess variant that "downgrades" from 8-way adjacency (standard chess) to 6-way adjacency on a hex grid. This creates distinct tactical patterns while maintaining familiarity for chess players.

## Board

### Coordinate System

We use **axial coordinates (q, r)** where:
- `q` increases toward NE
- `r` increases toward S
- The implicit third coordinate `s = -q - r` increases toward NW

The 6 directions with their axial deltas:
| Direction | Δq | Δr |
|-----------|----|----|
| N         | 0  | -1 |
| S         | 0  | +1 |
| NE        | +1 | -1 |
| SW        | -1 | +1 |
| NW        | -1 | 0  |
| SE        | +1 | 0  |

### Board Shape

Hexagonal board with **radius 4** (61 cells total).

A cell (q, r) is valid iff: `max(|q|, |r|, |q+r|) <= 4`

```
       . . . . .          r=-4
      . . . . . .         r=-3
     . . . . . . .        r=-2
    . . . . . . . .       r=-1
   . . . . . . . . .      r=0
    . . . . . . . .       r=1
     . . . . . . .        r=2
      . . . . . .         r=3
       . . . . .          r=4
   q=-4        q=4
```

White starts on the south side (positive r), Black on the north (negative r).

## Pieces

### Pawn
- **Move**: 1 square N (toward opponent)
- **Capture**: 1 square N, NE, or NW
- **Promotion**: When reaching the opponent's back rank (row closest to their start)
- **Notes**: Unlike standard chess, pawns can capture forward. No en passant (TBD).

### King
- **Move/Capture**: 1 square in any of 6 directions
- **Special**: Cannot move into check. Castling TBD.

### Queen
- **Move/Capture**: Any number of squares in any of 6 directions (rider)
- **Notes**: King-rider - moves like a king but can continue in the same direction

### Knight (Elephant)
- **Move/Capture**: Leaper to cells 2 steps away along a "bent" path
- **Pattern**: Move 1 step in one direction, then 1 step in an adjacent direction (not opposite)
- **Colors**: Knights come in 3 colors - each knight can only reach cells of its starting color
- **Reachable cells**: (N,NE), (NE,SE), (SE,S), (S,SW), (SW,NW), (NW,N) from any square

### Lance
- **Move/Capture**: Any number of squares in N, S, NW-SW axis, or NE-SE axis
- **Notes**: 4-way rider. Lances come in 2 colors based on which axes they cover.
- **Colors**: One lance rides {N, S, NW, SE}, other rides {N, S, NE, SW}

### Chariot
- **Move/Capture**: Any number of squares along diagonals: NE, NW, SE, SW
- **Notes**: 4-way rider on the diagonal axes only

## Piece Count (per side)

| Piece    | Count |
|----------|-------|
| Pawn     | 6     |
| King     | 1     |
| Queen    | 1     |
| Knight   | 2     |
| Lance    | 2     |
| Chariot  | 2     |
| **Total**| **14**|

## Initial Setup

TBD - See `starting_position.json` for current proposal.

General principles:
- King in center of back rank
- Symmetric arrangement
- Pieces should have room to develop

## Win Conditions

- **Checkmate**: King is in check and no legal move escapes check
- **Stalemate**: No legal moves and not in check - Draw (standard chess rules)
- **Resignation**: Player concedes

## Game Flow

1. White moves first
2. Players alternate turns
3. A turn consists of moving exactly one piece
4. The game ends on checkmate, stalemate, resignation, or agreement to draw

---

Signed-by: agent #1 claude-sonnet-4 via opencode 20260122T02:18:57
