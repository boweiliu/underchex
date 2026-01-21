# WINOW - AI Agent Session Manager
# (Written by LLM, not accurate)

Design document for `winow`, a CLI tool that simplifies launching AI coding agents in isolated tmux sessions with automatic git worktree management.

## Overview

**Purpose**: Make the flow of "launch AI in a tmux and chat to it" much easier.

**Implementation**: Python with `uv` for dependency management

## CLI Interface

Subcommand-style interface:

```bash
# Start a new agent session
winow start <agent> "<prompt>"
winow start opencode "fix the type errors in src/game.ts"
echo "fix the bug" | winow start codex

# List all sessions with status
winow list

# Send follow-up message to a session
winow send <session> "<message>"
echo "now run the tests" | winow send my-session

# Attach to a tmux session
winow attach <session>
```

## Supported Agents

Initial support for:
- `opencode` - OpenCode CLI
- `claude` - Claude Code CLI  
- `codex` - OpenAI Codex CLI

## Core Behavior

### Session Startup
1. Auto-create a new git worktree from current branch
2. Create a new git branch for the session
3. Launch tmux session in the worktree directory
4. Start the specified agent inside tmux
5. Send the initial prompt as keystrokes

### Naming Convention
- Branch/worktree names derived from prompt text
- Sanitized to be git-safe (lowercase, hyphens, no special chars)
- Collision-resistant (append short hash or timestamp if needed)
- Example: `winow/fix-type-errors-abc12`

### Session Completion
- Archives tmux session output to a file
- Leaves git worktree and branch intact for review
- Tmux session remains but marked as archived

### Status Detection
- Agent-specific regex patterns to identify state:
  - **thinking**: Agent is processing/generating output
  - **idle**: Agent is waiting for user input
- Parse tmux pane content to match patterns
- Each agent has its own detection config

## State Storage

Location: `~/.config/winow/<repo-identifier>/`

Where `<repo-identifier>` is derived from the repo's root path (e.g., hashed or path-encoded).

Contents:
- `sessions.json` - Active session metadata
- `archive/` - Archived session logs
- `config.toml` - Per-repo configuration overrides

### Session Metadata

```json
{
  "sessions": {
    "fix-type-errors-abc12": {
      "agent": "opencode",
      "tmux_session": "winow-fix-type-errors-abc12",
      "worktree_path": "/path/to/repo/.worktrees/winow-fix-type-errors-abc12",
      "branch": "winow/fix-type-errors-abc12",
      "created_at": "2026-01-20T10:30:00Z",
      "initial_prompt": "fix the type errors in src/game.ts",
      "status": "idle"
    }
  }
}
```

## Agent Configuration

Each agent needs:
- Command to launch (e.g., `opencode`, `claude`, `codex`)
- Idle detection pattern (regex matching prompt/waiting state)
- Thinking detection pattern (regex matching active processing)

Example patterns:
```toml
[agents.opencode]
command = "opencode"
idle_pattern = "^>"  # OpenCode shows ">" when waiting
thinking_pattern = "thinking|generating"

[agents.claude]
command = "claude"
idle_pattern = "^claude>"
thinking_pattern = "..."

[agents.codex]
command = "codex"
idle_pattern = "^codex>"
thinking_pattern = "working"
```

## Commands Detail

### `winow start <agent> "<prompt>"`
1. Validate agent is supported
2. Generate session name from prompt
3. Create git worktree: `git worktree add <path> -b <branch>`
4. Create tmux session: `tmux new-session -d -s <name> -c <worktree-path>`
5. Send agent launch command: `tmux send-keys "<agent>" Enter`
6. Wait for agent to initialize
7. Send prompt: `tmux send-keys "<prompt>" Enter`
8. Record session metadata
9. Print session name and status

### `winow list`
1. Load session metadata
2. For each session, query tmux and detect status
3. Display table:
   ```
   SESSION                  AGENT      STATUS    AGE
   fix-type-errors-abc12    opencode   thinking  5m
   add-tests-def34          codex      idle      2h
   ```

### `winow send <session> "<message>"`
1. Look up session metadata
2. Verify tmux session exists
3. Send keystrokes: `tmux send-keys -t <session> "<message>" Enter`

### `winow attach <session>`
1. Look up session metadata
2. Attach to tmux: `tmux attach-session -t <session>`

## Future Considerations (Not in Initial Scope)

- `winow kill <session>` - Terminate a session
- `winow archive <session>` - Manually archive a session
- `winow cleanup` - Remove old worktrees/branches
- Web UI for monitoring multiple sessions
- Webhook/notification when agent goes idle
- Session templates for common tasks
