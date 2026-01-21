# Task: CLI Enhancements

## Context

You are working on `winow`, a CLI tool for managing AI agent sessions. The CLI skeleton exists with noop commands. Your task is to enhance the CLI interface.

Working directory: `tools-llm/winow/`

Read these files first:
- `winow/cli.py` - Current CLI implementation
- `README.md` - CLI documentation
- `PLAN1_UNREVIEWED.LLM.md` - Full plan context

## Tasks

### 1. Add command aliases

Add these aliases so both names work:
- `create` -> alias for `start`
- `list` -> alias for `ps`

Use Click's recommended pattern for aliases.

### 2. Make `start`/`create` more ergonomic

Current: `winow start <agent> <prompt>`

Change to:
- `winow start "<prompt>"` - agent defaults to "opencode"
- `winow start -a claude "<prompt>"` - explicit agent
- `winow start --agent codex "<prompt>"` - long form

The prompt should be the only required positional argument.

### 3. Add `-p`/`--prompt` flag as alternative

Allow: `winow start -p "fix the bugs"` as equivalent to `winow start "fix the bugs"`

Both forms should work.

### 4. Auto-print help when `start`/`create` called with no args

If user runs `winow start` with no arguments, show help instead of an error.

## Constraints

- Keep the noop behavior for now (just print what would happen)
- Update docstrings to reflect new interface
- Do NOT modify `pyproject.toml` dependencies
- Do NOT create new files except tests if needed
- Follow existing code style

## Deliverables

1. Updated `winow/cli.py` with all enhancements

## Verification Criteria

Run these commands and confirm expected output:

```bash
# 1. Help shows all commands including aliases
uv run winow --help
# Expected: Shows start, create, ps, list, send, attach

# 2. Start help shows new interface
uv run winow start --help
# Expected: Shows PROMPT as required arg, -a/--agent as optional

# 3. Start with just prompt (default agent)
uv run winow start "fix the bugs"
# Expected: [noop] Would start opencode with: fix the bugs

# 4. Start with explicit agent
uv run winow start -a claude "fix the bugs"
# Expected: [noop] Would start claude with: fix the bugs

# 5. Start with --prompt flag
uv run winow start -p "fix the bugs"
# Expected: [noop] Would start opencode with: fix the bugs

# 6. Create alias works same as start
uv run winow create "test prompt"
# Expected: [noop] Would start opencode with: test prompt

# 7. List alias works same as ps
uv run winow list
# Expected: [noop] Would list sessions

# 8. No args shows help (not error)
uv run winow start
# Expected: Shows help text, exit code 0 (not "Missing argument" error)
```

## Sign-off

Include sign-off in any commits: `Signed-off-by: <model> via <harness>`
