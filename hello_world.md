# Project/Underchex - Reference - Structure
Tags: #project #underchex #reference #structure

## Overview
```
underchex/
├── spec/                    # Shared game specification (language-agnostic)
│   ├── rules.md            # Game rules documentation
│   ├── board.json          # Board definition (hex grid specs)
│   ├── pieces.json         # Piece definitions and movement rules
│   └── tests/              # Shared test cases (input/expected output)
│       └── move_validation.json
│
├── src/                     # Language implementations
│   ├── typescript/         # TypeScript + React web
│   ├── typescript-vanilla/ # Raw HTML + JS (no dependencies)
│   ├── python/             # Python GUI
│   ├── kotlin/             # Kotlin/Java GUI
│   ├── c/                  # C + curses terminal
│   ├── rust/               # Rust + WASM
│   └── elixir/             # Elixir telnet server
│
└── tools-llm/              # LLM tooling
```

## Conventions
- spec/: Language-agnostic game rules and test cases. All implementations should pass the shared tests.
- src/{lang}/: Each implementation is self-contained with its own build system. AI engines are implemented per-project.
- Interoperability: Implementations should be able to communicate (protocol TBD).

## Files Created
### spec/rules.md
Game rules extracted from README:
- Board: Hexagonal grid with 6-way adjacency (N, S, NE, NW, SE, SW)
- Pieces: Pawns, Kings, Queens, Knights (Elephants), Lances, Chariots
- Movement patterns documented for each piece type

### spec/board.json
Board definition placeholder with:
- Grid type: hexagonal
- Adjacency directions: N, S, NE, NW, SE, SW
- Size: TBD based on playtesting

### spec/pieces.json
Piece definitions including:
- Pawn: moves N, captures N/NE/NW (Chinese chess inspired forward capture)
- King: 1 square in any of 6 directions
- Queen: kingrider (unlimited range in 6 directions)
- Knight: elephant-like, 3 colors, diagonal leaper
- Lance: 4-way rider (N, S, NW-SW, NE-SE), 2 colors
- Chariot: 4-way diagonal rider (NE, NW, SE, SW)

### spec/tests/move_validation.json
Shared test case format for cross-implementation validation. Example test case structure provided.

### src/{lang}/.gitkeep
Empty placeholder directories for each planned implementation.

Signed-off-by: gpt-5 via codex
