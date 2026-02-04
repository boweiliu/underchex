# UNDERCHEX Tickets - Rebuild from Scratch

#tickets #underchex #planning

**Related:** [[Agent Diary: Session 4.0.0]] (nb 127) | [[Human Preferences: bowei]] (nb 128)

> **Stack rank by editing. Highest priority at top.**

---

## Playable Prototypes
- [ ] PROTO-01: Minimal playable prototype - any language, hardcoded board, basic moves, 2-player hotseat
- [ ] PROTO-02: Add visual hex board rendering (web canvas or terminal ASCII)
- [ ] PROTO-03: Implement all piece types from README with configurable movement vectors
- [ ] PROTO-04: Add move validation and illegal move rejection
- [ ] PROTO-05: Add check/checkmate detection

## Board & Geometry Research
- [ ] BOARD-01: Experiment with different board sizes (7x7, 9x9, 11x11 hex grids)
- [ ] BOARD-02: Try different board shapes (hexagon, rectangle, diamond)
- [ ] BOARD-03: Compare coordinate systems (axial vs cube vs offset) for implementation ergonomics
- [ ] BOARD-04: Prototype starting position variations and evaluate balance

## Piece Design Research
- [ ] PIECE-01: Prototype the 3-color knight/elephant and evaluate if it's fun
- [ ] PIECE-02: Prototype lances (2-color rook-like) and evaluate gameplay impact
- [ ] PIECE-03: Prototype chariots and compare to lances
- [ ] PIECE-04: Test Y-rider and Charger (3-way asymmetric) - keep or discard?
- [ ] PIECE-05: Experiment with pawn promotion rules (what can they promote to?)
- [ ] PIECE-06: Design and test castling equivalent (or decide it's not needed)

## AI & Analysis
- [ ] AI-01: Implement random move AI for testing
- [ ] AI-02: Implement greedy capture AI
- [ ] AI-03: Implement minimax with basic material evaluation
- [ ] AI-04: Run AI vs AI games to detect degenerate strategies or broken pieces
- [ ] AI-05: Build position evaluation metrics for hex geometry

## Self-Play & Balance
- [ ] BALANCE-01: Self-play framework to generate game statistics
- [ ] BALANCE-02: Measure win rates by color to detect first-move advantage
- [ ] BALANCE-03: Measure piece value empirically through game outcomes
- [ ] BALANCE-04: Identify and fix broken/overpowered piece configurations

## Multi-Implementation
- [ ] IMPL-01: Second implementation in different language for cross-validation
- [ ] IMPL-02: Shared test format that both implementations can run
- [ ] IMPL-03: Rust+WASM for performant browser play
- [ ] IMPL-04: Elixir server for multiplayer/telnet

## Infrastructure
- [ ] INFRA-01: Simple way to tweak rules and replay without code changes (config file?)
- [ ] INFRA-02: Game recording/replay for analyzing interesting positions
- [ ] INFRA-03: Position editor for setting up test scenarios

---

Edited-by: agent #4.0.0 claude-opus-4-5 via claude-code 2026-02-04T18:22:00Z
Edited-by: agent #1.0.3 claude-opus-4-5 via claude-code 2026-02-04T22:15:00Z
