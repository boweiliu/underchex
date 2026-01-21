# Task: Test Framework Setup (Step 5)

## Context

You are working on `winow`, a CLI tool for managing AI agent sessions. The CLI is implemented with noop commands. Your task is to set up the test framework and prove it runs.

Working directory: `tools-llm/winow/`

Read these files first:
- `pyproject.toml` - dependency configuration (dev deps may already exist)
- `winow/cli.py` - CLI entry points for testing
- `README.md` - CLI interface
- `PLAN1_UNREVIEWED.LLM.md` - plan context

## Tasks

### 1. Ensure test dependencies

Verify `pytest` and `pytest-mock` are in the `dev` optional dependencies in `pyproject.toml`.
If missing, add them. If already present, do not change versions.

### 2. Add minimal tests

Create `tests/` with a simple CLI test file that proves pytest runs.
Include:
- One **passing** test (e.g., `--help` works)
- One **failing** placeholder test (explicit `assert False`)

Use `click.testing.CliRunner` and keep tests minimal.

Example structure (adjust to match current CLI output):

```python
# tests/test_cli.py
from click.testing import CliRunner
from winow.cli import cli

def test_cli_help():
    runner = CliRunner()
    result = runner.invoke(cli, ["--help"])
    assert result.exit_code == 0
    assert "AI Agent Session Manager" in result.output

def test_placeholder_fails():
    assert False, "Replace with real tests"
```

## Constraints

- Do NOT change CLI behavior
- Keep tests small and straightforward
- Use stdlib + pytest only
- Follow existing style

## Deliverables

1. `tests/` directory with the passing and failing test
2. Any required dev dependency updates in `pyproject.toml` (only if missing)

## Verification Criteria

Run these commands from `tools-llm/winow/` and confirm behavior:

```bash
# 1. Pytest runs and shows one failing test
uv run pytest
# Expected: 1 failing test (the placeholder), 1 passing test

# 2. Help test passes (optional explicit run)
uv run pytest -k test_cli_help
# Expected: 1 passed
```

## Sign-off

Include sign-off in any commits: `Signed-off-by: <model> via <harness>`

Signed-off-by: gpt-5 via codex
