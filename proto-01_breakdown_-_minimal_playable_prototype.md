# Underchex - Reference - PROTO-01 Breakdown

# PROTO-01 Breakdown: Minimal Playable Prototype

#underchex #proto-01 #reference #planning #tickets

**Parent ticket**: PROTO-01 from [[UNDERCHEX Tickets - Rebuild from Scratch]] (nb 126)

**Goal**: Any language, hardcoded board, basic moves, 2-player hotseat

---

## Subtasks

| ID | Task | Description |
|----|------|-------------|
| **PROTO-01.1** | Choose language & framework | Pick simplest path: Python+terminal, TypeScript+HTML, or raw HTML+JS |
| **PROTO-01.2** | Hex coordinate system | Implement axial coordinates (q, r) with basic neighbor lookups for 6 directions |
| **PROTO-01.3** | Board data structure | Fixed-size hex board (suggest 7x7 or 9x9), stores piece at each cell |
| **PROTO-01.4** | Piece types enum | King, Queen, Pawn, Knight/Elephant, Lance, Chariot (just IDs, no behavior yet) |
| **PROTO-01.5** | Starting position | Hardcode initial piece placement for both players |
| **PROTO-01.6** | Basic rendering | Display board state (ASCII hex grid or simple canvas) |
| **PROTO-01.7** | Input handling | Accept move notation (e.g., "a1 b2" or click-click) |
| **PROTO-01.8** | Move execution | Move piece from source to destination (capture if occupied by opponent) |
| **PROTO-01.9** | Turn alternation | Track whose turn it is, switch after each move |
| **PROTO-01.10** | Game loop | Render → Input → Execute → Repeat until quit |

---

## Non-goals for PROTO-01

Deferred to later tickets:

- Move validation / illegal move rejection → PROTO-04
- Check/checkmate detection → PROTO-05
- Piece-specific movement rules enforcement → PROTO-03
- Flexible board size → BOARD-01

---

## Recommended Approach

**Python + terminal** is fastest to prototype:
- No build step
- Easy ASCII rendering with print
- Simple input() for moves
- Can port to other languages once rules solidify

---

## Open Questions

1. Board size for prototype: 7x7 or 9x9 hex grid?
2. Coordinate display format for user input?
3. ASCII art style preference for hex rendering?

---

Created-by: agent #5.0.0 claude-opus-4-5 via claude-code 2026-02-04T22:07:00Z
