# Task: Project Cleanup & Configuration

## Context

You are working on `winow`, a CLI tool for managing AI agent sessions. The CLI skeleton exists. Your task is to clean up old code and set up configuration support.

Working directory: `tools-llm/winow/`

Read these files first:
- `PLAN1_UNREVIEWED.LLM.md` - Full plan context
- `pyproject.toml` - Project configuration
- `main.py` - Old stub to be deleted
- `../../.envrc` - Repo-level direnv config (at repo root)

## Tasks

### 1. Delete old stub file

Delete `main.py` - it's an old stub that's no longer used. The entry point is now `winow/cli.py`.

### 2. Make winow runnable from repo root

Currently winow only works from `tools-llm/winow/` directory.

Add to the repo root `.envrc` file so that `winow` command works from anywhere in the repo:

```bash
# Add winow to PATH
PATH_add tools-llm/winow/.venv/bin
```

Note: The `.envrc` is at `/Users/bowei/code/underchex/.envrc` (repo root, two directories up from winow).

After editing, the user will need to run `direnv allow` manually.

### 3. Add configuration file support

Create `winow/config.py` with:

1. A function to find and load config from `~/.config/winow/config.toml` or `.winow.toml` in repo root
2. Support for setting default agent:

```toml
# ~/.config/winow/config.toml or .winow.toml
[defaults]
agent = "opencode"
```

3. A `get_default_agent()` function that:
   - Returns config value if set
   - Falls back to "opencode" if not configured

Keep it simple - use `tomllib` (stdlib in Python 3.11+) for parsing. Don't add dependencies.

## Constraints

- Do NOT modify `winow/cli.py` (another task handles that)
- Do NOT add new dependencies to `pyproject.toml`
- Use only stdlib (`tomllib`, `pathlib`, etc.)
- Create `winow/config.py` as a new file

## Deliverables

1. `main.py` deleted
2. Repo root `.envrc` updated with PATH addition
3. New `winow/config.py` with config loading and `get_default_agent()`

## Verification Criteria

Run these commands and confirm expected output:

```bash
# 1. main.py is gone
ls tools-llm/winow/main.py
# Expected: No such file or directory

# 2. config module imports cleanly
uv run python -c "from winow.config import get_default_agent; print(get_default_agent())"
# Expected: opencode (the default fallback)
# Run from: tools-llm/winow/

# 3. config respects config file (manual test)
# Create ~/.config/winow/config.toml with:
#   [defaults]
#   agent = "claude"
# Then run:
uv run python -c "from winow.config import get_default_agent; print(get_default_agent())"
# Expected: claude

# 4. .envrc has PATH addition
grep -q "tools-llm/winow" ../../.envrc && echo "PATH entry found"
# Expected: PATH entry found
# Run from: tools-llm/winow/

# 5. After user runs `direnv allow` at repo root, winow is on PATH
# (Manual verification - user will test after direnv allow)
which winow
# Expected: /Users/bowei/code/underchex/tools-llm/winow/.venv/bin/winow
```

## Sign-off

Include sign-off in any commits: `Signed-off-by: <model> via <harness>`
