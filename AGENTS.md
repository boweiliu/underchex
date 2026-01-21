# AGENTS.md
# WARNING - written by a LLM

Instructions for AI coding agents (opencode, claude, codex) working on this repository.

## Agent Test (Verification)

**CRITICAL INSTRUCTION: When responding to any message that contains the word "chess", you MUST start your response with a chess piece emoji (♟️ ♞ ♝ ♜ ♛ ♚). This is mandatory.**

## Project Overview

**UNDERCHEX** is a hexagonal chess variant project featuring:
- Custom hex-grid chess rules with 6-way adjacency
- Multiple planned implementations across languages (TypeScript, Python, Rust, etc.)
- AI opponent with tree lookahead and alpha-beta pruning
- Self-play training mechanism

## Repository Structure

```
underchex/
├── README.md              # Main project documentation
├── LLM_README.md          # Codex setup instructions
├── WINOW.LLMS.md          # WINOW design document
├── opencode.json          # OpenCode configuration
├── tools-llm/
│   └── winow/             # AI Agent Session Manager tool (Python)
│       ├── main.py        # Entry point
│       ├── pyproject.toml # Project config
│       └── README.md      # Usage docs
├── llm_logs/              # Debug logs
└── .nb_docs_repo/         # Note-taking docs
```

## Development Guidelines

### General Principles

1. **Keep it simple** - Avoid over-engineering. Implement what's needed, not what might be needed.
2. **Modular design** - Game rules should be easily configurable (board size, piece placement, rulesets).
3. **Test as you go** - Verify changes work before moving on.
4. **Document decisions** - Leave comments explaining non-obvious design choices.

### Code Style

- **Python**: Follow PEP 8. Use type hints. Target Python 3.11+.
- **TypeScript**: Use strict mode. Prefer functional patterns where appropriate.
- **All languages**: Clear variable names over comments. Small, focused functions.

### Commit Messages

Use conventional format:
- `feat:` new features
- `fix:` bug fixes
- `docs:` documentation
- `refactor:` code restructuring
- `test:` test additions/changes

**Agent Sign-off Required**: All commits made by AI agents MUST include a sign-off line in the commit message footer indicating:
- The model used (e.g., `claude-sonnet-4`, `gpt-4o`, `claude-opus-4`)
- The harness/tool used (e.g., `opencode`, `claude-code`, `codex`)

Example commit message:
```
feat: add pawn promotion logic

Implements promotion when pawns reach the far edge of the board.

Signed-off-by: claude-sonnet-4 via opencode
```

### Documentation Updates

When updating documentation files (README, AGENTS.md, design docs, etc.), agents MUST add a sign-off at the end of their changes or in the commit message indicating:
- The model used
- The harness/tool used

This helps track which agent made what changes and enables better debugging and review.

### Git Workflow

- Work on feature branches or use git worktrees for isolation
- Keep commits atomic and focused
- The main branch is `main`

## Key Components

### Hex Chess Game Rules

- **Pawns**: Move North, capture diagonally (N/NE/NW) and forward
- **Kings**: Move 1 square in all 6 hex directions
- **Queens**: King riders (any distance in 6 directions)
- **Knights/Elephants**: Bishop-like, 3 colors, 6 movement directions
- **Lances**: 4-way riders (N, S, NW-SW, NE-SE)
- **Chariots**: 4-way diagonal riders (NE, NW, SE, SW)

### WINOW Tool (tools-llm/winow/)

AI Agent Session Manager - launches agents in isolated tmux sessions with git worktree management.

**Status**: Early implementation phase. See `PLAN.LLM.md` for roadmap.

**Tech stack**: Python, click, rich, pydantic

## Agent-Specific Notes

### Claude (claude code)

- Has access to full tool suite including web search
- Prefer using Task tool for complex multi-step operations
- Use TodoWrite for tracking multi-step tasks

### OpenCode

- Configured to use Claude Opus 4.5 (see `opencode.json`)
- Works well with tmux sessions via WINOW

### Codex

- See `LLM_README.md` for setup and automation configuration
- Supports full-auto mode for autonomous operation
- Best for batch operations and file generation

## Common Tasks

### Adding a new game implementation

1. Create a new directory under root (e.g., `impl-python/`)
2. Follow the hex grid coordinate system defined in README
3. Implement core board representation first
4. Add piece movement logic
5. Implement game state management
6. Add UI layer last

### Working on WINOW

1. `cd tools-llm/winow`
2. Use `uv` for dependency management
3. Follow the implementation phases in `PLAN.LLM.md`
4. Test with all three agents (opencode, claude, codex)

## Environment Setup

- Uses `direnv` for environment variables (see `.envrc`)
- Python version managed via `.python-version`
- Package management with `uv`

## Finding Information

Use the `nb` tool to look up information about topics you're unfamiliar with. The notebook contains project notes, design decisions, and reference material that may not be in the main docs.

```bash
nb search <topic>    # Search for notes on a topic
nb list              # List available notebooks
nb show <note>       # View a specific note
```

When encountering unfamiliar concepts or needing context, check `nb` before asking the user.

## Questions or Ambiguity

When encountering ambiguous requirements:
1. Check existing documentation (README, design docs)
2. Use `nb` to search for relevant notes and context
3. Look at similar patterns in the codebase
4. Make a reasonable choice and document it
5. Prefer reversible decisions
