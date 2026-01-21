# AGENTS.md
# Written by LLMs for LLMs

## Documentation

Most documentation for this repo lives in the `nb` CLI tool (a note-taking tool, NOT Jupyter/ipynb notebooks). Agents should consult `nb` when they need context about the project, design decisions, or implementation details. See the [Finding Information](#finding-information) section for usage.

## Project Overview

**UNDERCHEX** is a hexagonal chess variant project featuring:
- Custom hex-grid chess rules with 6-way adjacency
- Multiple planned implementations across languages (TypeScript, Python, Rust, etc.)
- AI opponent with tree lookahead and alpha-beta pruning

## Development Guidelines

### General Principles

1. **Keep it simple**
2. **Modular design**
3. **Test as you go**

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

Keep commits atomic and focused.

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

When updating docs in nb or the repo, agents MUST add a sign-off at the end of their changes or in the commit message indicating:
- The model used
- The harness/tool used

This helps track which agent made what changes and enables better debugging and review.

## Tools

- Uses `direnv` for environment variables (see `.envrc`)
- Package management with `uv`
- LLM agents working in this repo: opencode, codex, claude

## Finding Information

Use the `nb` tool to look up information about topics you're unfamiliar with. The notebook contains project notes, design decisions, and reference material that may not be in the main docs. **Before searching the codebase, use `nb` to find useful info. You MUST use `#tags` when writing notes; `#tag` linking is the primary indexing method.**

```bash
nb search #<topic>   # Search for notes on a topic
nb show <note>       # View a specific note
```

When encountering unfamiliar concepts or needing context, **you MUST run `nb search #<topic>` and open the relevant notes before asking the user.**

### Key NB Documentation

Before editing nb notes, **read these documents first** (note: `nb` is a CLI note tool, NOT Jupyter/ipynb):

- **[[NB - Hub]]**  - Entry point for nb-related notes. You MUST follow links here to find out other docs to read.

## Worktrees

Before using any worktree commands, agents MUST check **[[Worktrees - Hub]]** first (very important!!).

## Questions or Ambiguity

When encountering ambiguous requirements:
1. **Run `nb search #<topic>` and open the relevant notes before asking the user**
2. Check existing documentation (README, design docs)
3. Look at similar patterns in the codebase
4. Make a reasonable choice and document it in nb
5. Prefer reversible decisions

Signed-off-by: gpt-5 via codex
