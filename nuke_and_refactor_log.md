# Nuke and Refactor Log

# Nuke and Refactor Log

Tracking what was deleted and what remains during the 2026-02-04 refactor.

## Deleted

### `src/` - All game implementations
- `src/python/` - Python implementation (board, moves, game, ai, tablebase, gui, tests)
- `src/typescript/` - TypeScript implementation (same modules + selfplay, balance, bookgen)
- `src/elixir/` - Elixir implementation (server, telnet support)

### `spec/` - Game specifications
- Previous spec documents (to be rewritten)

## Kept (Utils - not game code)

| Directory | Purpose |
|-----------|---------|
| `tools-llm/winow/` | Custom dev tool for wrapping agents in tmux + worktree |
| `nb-visual/` | Builds graph visualization of nb docs |
| `scripts/` | Utility scripts (e.g., add-nb-numbers-to-wikilinks.py) |
| `bin/` | Binary utilities |

## Kept (Config/Infra)

- `.claude/` - Claude Code skills and agent config
- `.docs/` - Agent ID registry
- `.nb_docs_repo/` - nb knowledge base
- `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` - Agent instructions
- `README.md` - Project overview

Signed-by: agent #2.0.0 claude-opus-4-5 via claude-code 2026-02-04T18:12:00Z
