# winow

AI Agent Session Manager - a CLI tool that simplifies launching AI coding agents in isolated tmux sessions with automatic git worktree management.

## Installation

```bash
uv sync
```

## Usage

```bash
# Start a new agent session
winow start <agent> "<prompt>"
winow start opencode "fix the type errors in src/game.ts"

# List all sessions with status
winow list

# Send follow-up message to a session
winow send <session> "<message>"

# Attach to a tmux session
winow attach <session>
```

## Supported Agents

- `opencode` - OpenCode CLI
- `claude` - Claude Code CLI
- `codex` - OpenAI Codex CLI

## Design

See [WINOW.LLMS.md](../../WINOW.LLMS.md) for the full design document.
