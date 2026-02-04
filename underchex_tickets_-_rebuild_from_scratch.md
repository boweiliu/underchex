# UNDERCHEX Tickets - Rebuild from Scratch

# UNDERCHEX Tickets - Rebuild from Scratch

#tickets #underchex #planning

> **Stack rank these tickets by editing priorities.** Move highest priority to top.

---

## Phase 1: Specification & Core Design

### TICKET-001: Write formal game rules document
**Priority:** [TO BE RANKED]
**Estimate:** Medium

Define the complete game rules in `spec/rules.md`:
- Board geometry (hexagonal grid, 6-way adjacency)
- Piece definitions with exact movement patterns
- Capture rules
- Victory conditions (checkmate/stalemate)
- Special rules (castling equivalent? en passant equivalent?)
- Turn order and game flow

Dependencies: None

---

### TICKET-002: Define board specification
**Priority:** [TO BE RANKED]
**Estimate:** Small

Create `spec/board.json`:
- Board dimensions and shape
- Coordinate system (axial? cube? offset?)
- Cell adjacency definitions
- Visual representation conventions

Dependencies: TICKET-001 (partial - need basic geometry decisions)

---

### TICKET-003: Define piece specifications
**Priority:** [TO BE RANKED]
**Estimate:** Medium

Create `spec/pieces.json`:
- All piece types with movement vectors
- Piece colors/teams
- Starting counts per side
- Special movement conditions

Pieces from README:
- Pawns (N move, N/NE/NW capture)
- Kings (6-way, 1 square)
- Queens (6-way rider)
- Knights/Elephants (3 colors, bishop-like leap)
- Lances (4-way: N/S/NW-SW/NE-SE riders, 2 colors)
- Chariots (4-way: NE/NW/SE/SW riders)

Dependencies: TICKET-001, TICKET-002

---

### TICKET-004: Define starting position
**Priority:** [TO BE RANKED]
**Estimate:** Small

Create `spec/starting_position.json`:
- Initial piece placement for both sides
- Board size for standard game

Dependencies: TICKET-002, TICKET-003

---

### TICKET-005: Create cross-implementation test cases
**Priority:** [TO BE RANKED]
**Estimate:** Medium

Create `spec/tests/`:
- `move_validation.json` - Test cases for valid/invalid moves
- `checkmate_tests.json` - Victory condition scenarios
- `edge_cases.json` - Board boundaries, special situations

Dependencies: TICKET-001, TICKET-002, TICKET-003

---

## Phase 2: First Implementation (Pick One)

### TICKET-010: TypeScript core implementation
**Priority:** [TO BE RANKED]
**Estimate:** Large

Implement in `src/typescript/`:
- Board representation
- Move generation
- Move validation
- Game state management
- Unit tests passing spec tests

Dependencies: Phase 1 complete

---

### TICKET-011: Python core implementation
**Priority:** [TO BE RANKED]
**Estimate:** Large

Implement in `src/python/`:
- Board representation
- Move generation
- Move validation
- Game state management
- Unit tests passing spec tests

Dependencies: Phase 1 complete

---

## Phase 3: User Interface

### TICKET-020: Web UI (React + TypeScript)
**Priority:** [TO BE RANKED]
**Estimate:** Large

Build visual board and game interface:
- Hex grid rendering
- Piece display
- Move input (click/drag)
- Game state display
- Move history

Dependencies: TICKET-010

---

### TICKET-021: Terminal UI (Python/curses)
**Priority:** [TO BE RANKED]
**Estimate:** Medium

Build terminal-based interface:
- ASCII hex grid rendering
- Keyboard navigation
- Move input
- Game state display

Dependencies: TICKET-011

---

### TICKET-022: Raw HTML/JS (no deps)
**Priority:** [TO BE RANKED]
**Estimate:** Medium

Build zero-dependency web version:
- Pure HTML/CSS/JS
- Canvas or SVG rendering
- Self-contained single file

Dependencies: Phase 1 complete

---

## Phase 4: AI Engine

### TICKET-030: Basic AI - Random/Greedy
**Priority:** [TO BE RANKED]
**Estimate:** Small

Implement baseline AI:
- Random legal move selection
- Greedy material capture

Dependencies: One core implementation complete

---

### TICKET-031: AI - Minimax with Alpha-Beta
**Priority:** [TO BE RANKED]
**Estimate:** Medium

Implement tree search:
- Minimax algorithm
- Alpha-beta pruning
- Configurable depth
- Basic evaluation function

Dependencies: TICKET-030

---

### TICKET-032: AI - Position Evaluation
**Priority:** [TO BE RANKED]
**Estimate:** Medium

Implement evaluation function:
- Material counting
- Piece positioning
- King safety
- Mobility metrics

Dependencies: TICKET-031

---

### TICKET-033: Tablebase generation
**Priority:** [TO BE RANKED]
**Estimate:** Large

Implement endgame tablebases:
- Retrograde analysis
- Storage format
- Lookup integration

Dependencies: TICKET-031

---

## Phase 5: Self-Play & Training

### TICKET-040: Self-play framework
**Priority:** [TO BE RANKED]
**Estimate:** Medium

Implement automated game playing:
- Match runner
- Result collection
- Statistics generation

Dependencies: TICKET-031

---

### TICKET-041: Opening book generation
**Priority:** [TO BE RANKED]
**Estimate:** Medium

Generate opening theory:
- Self-play analysis
- Book format
- Integration with AI

Dependencies: TICKET-040

---

## Phase 6: Additional Implementations

### TICKET-050: Rust + WASM implementation
**Priority:** [TO BE RANKED]
**Estimate:** Large

Port core logic to Rust with WASM compilation.

Dependencies: Spec complete, one reference implementation

---

### TICKET-051: Kotlin/JVM implementation
**Priority:** [TO BE RANKED]
**Estimate:** Large

Port core logic to Kotlin.

Dependencies: Spec complete, one reference implementation

---

### TICKET-052: C + ncurses implementation
**Priority:** [TO BE RANKED]
**Estimate:** Large

Port core logic to C with terminal UI.

Dependencies: Spec complete, one reference implementation

---

### TICKET-053: Elixir/OTP telnet server
**Priority:** [TO BE RANKED]
**Estimate:** Large

Implement multiplayer server with telnet clients.

Dependencies: Spec complete, one reference implementation

---

## Infrastructure & Tooling

### TICKET-060: Cross-implementation test runner
**Priority:** [TO BE RANKED]
**Estimate:** Medium

Build tool to run spec tests against all implementations.

Dependencies: Multiple implementations exist

---

### TICKET-061: CI/CD pipeline
**Priority:** [TO BE RANKED]
**Estimate:** Small

Set up automated testing and builds.

Dependencies: One implementation with tests

---

## Open Questions

- [ ] What board size? (README doesn't specify)
- [ ] Are there castling/en-passant equivalents?
- [ ] Pawn promotion rules?
- [ ] Draw conditions beyond stalemate?
- [ ] Y-rider and Charger pieces - include or skip?

---

Signed-by: agent #4.0.0 claude-opus-4-5 via claude-code 2026-02-04T18:18:00Z
