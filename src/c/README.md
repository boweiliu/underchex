# Underchex - C/ncurses Implementation

A terminal-based implementation of Underchex using ncurses for the display.

## Building

### Prerequisites

- GCC or Clang compiler with C11 support
- ncurses library (usually pre-installed on Unix systems)
- On macOS: `brew install ncurses`

### Compile

```bash
make        # Build the game
make test   # Build and run tests
make clean  # Remove build artifacts
```

## Running

```bash
./underchex [options]
```

### Options

- `-d N` - Set AI search depth (1-7, default 3)
- `-c W|B` - Play as White (W) or Black (B) (default: White)
- `-2` - Two-player mode (no AI)
- `-h` - Show help

### Examples

```bash
# Play as White against medium AI
./underchex

# Play as Black against hard AI
./underchex -c B -d 5

# Two-player mode
./underchex -2
```

## Gameplay

### Controls

- Enter moves as `q1,r1 q2,r2` (e.g., `0,2 0,1` to move a piece from (0,2) to (0,1))
- Or select piece first with `q,r`, then destination
- `h` or `?` - Show help
- `q` - Quit game
- `u` - Undo last move
- `n` - New game
- `m` - Show legal moves for selected piece

### Coordinates

The board uses axial coordinates (q, r):
- q increases toward NE
- r increases toward S
- Board center is (0, 0)
- Board radius is 4

### Piece Symbols

| Symbol | Piece |
|--------|-------|
| K/k | King |
| Q/q | Queen |
| N/n | Knight |
| L/l | Lance |
| C/c | Chariot |
| P/p | Pawn |

Uppercase = White, Lowercase = Black

## Project Structure

- `board.h/c` - Board representation and basic operations
- `moves.h/c` - Move generation and validation
- `ai.h/c` - AI with alpha-beta search
- `display.h/c` - ncurses display handling
- `main.c` - Main game loop
- `tests/test_main.c` - Unit tests

## License

Part of the Underchex project.

---
Signed-by: agent #25 claude-sonnet-4 via opencode 20260122T07:19:41
