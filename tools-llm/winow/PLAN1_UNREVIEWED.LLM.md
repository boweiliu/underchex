# PLAN.LLM.md - Winow Implementation Plan

## Human Plan (Incorporated)

> 1. Add the good cli tool builder dependencies
> 2. Write a spec for the cli interface. it should be very similar to the `docker` interface, like `winow start "blah prompt here"`, `winow ps`, `winow send "follow up prompt here"`, `winow attach <id>`.
> 3. Have the spec pass peer review
> 4. Implement the commands in the spec but have them be noops
> 5. Start setting up a test framework - install necessary deps, write a failing and a passing test, etc.
> 6. Write reasonable test flows

---

## Current State

- `main.py` - Empty stub
- `pyproject.toml` - Basic project config, no deps
- `README.md` - Documents intended CLI interface
- Design doc at `../../WINOW.LLMS.md`

---

## Phase 1: Dependencies & CLI Spec

### 1.1 Add Dependencies

```toml
[project]
dependencies = [
    "click>=8.0",      # CLI framework
    "rich>=13.0",      # Pretty terminal output
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-mock>=3.0",
]
```

Keep it minimal. No pydantic yet - start with dataclasses.

### 1.2 CLI Spec (Docker-like)

```bash
winow start <agent> "<prompt>"   # Like `docker run`
winow ps                         # Like `docker ps`
winow send <session> "<msg>"     # Like `docker exec`
winow attach <session>           # Like `docker attach`
```

**Review checkpoint**: Get spec approved before implementation.

---

## Phase 2: Skeleton Implementation (No-ops)

### 2.1 Module Structure

```
tools-llm/winow/
├── pyproject.toml
├── README.md
├── PLAN.human.md
├── PLAN.LLM.md
├── winow/
│   ├── __init__.py
│   ├── cli.py          # Click commands (entry point)
│   ├── core.py         # Session operations (start, list, send, attach)
│   ├── git.py          # Git worktree helpers
│   ├── tmux.py         # Tmux helpers
│   └── config.py       # Agent registry + paths
└── tests/
    ├── __init__.py
    ├── conftest.py     # Fixtures
    └── test_cli.py     # CLI integration tests
```

**Design principles**:
- `cli.py` is thin - just Click decorators, delegates to `core.py`
- `core.py` orchestrates git/tmux operations
- `git.py` and `tmux.py` are pure wrappers around shell commands
- `config.py` holds agent definitions and path conventions

### 2.2 Implement No-op Commands

```python
# winow/cli.py
import click

@click.group()
def cli():
    """AI Agent Session Manager"""
    pass

@cli.command()
@click.argument('agent')
@click.argument('prompt')
def start(agent: str, prompt: str):
    """Start a new agent session"""
    click.echo(f"[noop] Would start {agent} with: {prompt}")

@cli.command()
def ps():
    """List active sessions"""
    click.echo("[noop] Would list sessions")

@cli.command()
@click.argument('session')
@click.argument('message')
def send(session: str, message: str):
    """Send message to a session"""
    click.echo(f"[noop] Would send to {session}: {message}")

@cli.command()
@click.argument('session')
def attach(session: str):
    """Attach to a session"""
    click.echo(f"[noop] Would attach to {session}")
```

### 2.3 Entry Point

```toml
[project.scripts]
winow = "winow.cli:cli"
```

---

## Phase 3: Test Framework

### 3.1 Install Test Dependencies

```bash
uv add --dev pytest pytest-mock
```

### 3.2 Write Trivial Tests

```python
# tests/test_cli.py
from click.testing import CliRunner
from winow.cli import cli

def test_cli_help():
    """CLI shows help without error"""
    runner = CliRunner()
    result = runner.invoke(cli, ['--help'])
    assert result.exit_code == 0
    assert 'AI Agent Session Manager' in result.output

def test_start_noop():
    """Start command runs (noop)"""
    runner = CliRunner()
    result = runner.invoke(cli, ['start', 'opencode', 'fix bugs'])
    assert result.exit_code == 0
    assert 'noop' in result.output

def test_ps_noop():
    """Ps command runs (noop)"""
    runner = CliRunner()
    result = runner.invoke(cli, ['ps'])
    assert result.exit_code == 0

def test_failing_placeholder():
    """Placeholder - remove when real tests added"""
    assert False, "Replace with real tests"
```

One passing, one failing - proves the framework works.

---

## Phase 4: Real Implementation

### 4.1 Config Module

```python
# winow/config.py
from dataclasses import dataclass
from pathlib import Path
import hashlib

@dataclass
class Agent:
    name: str
    command: str
    idle_pattern: str
    thinking_pattern: str

AGENTS = {
    'opencode': Agent('opencode', 'opencode', r'^>', r'thinking|generating'),
    'claude': Agent('claude', 'claude', r'^claude>', r'\.\.\.'),
    'codex': Agent('codex', 'codex', r'^codex>', r'working'),
}

def get_config_dir(repo_root: Path) -> Path:
    """~/.config/winow/<repo-hash>/"""
    repo_hash = hashlib.sha256(str(repo_root).encode()).hexdigest()[:12]
    return Path.home() / '.config' / 'winow' / repo_hash

def get_worktree_dir(repo_root: Path) -> Path:
    """<repo>/.worktrees/"""
    return repo_root / '.worktrees'
```

### 4.2 Git Module

```python
# winow/git.py
import subprocess
from pathlib import Path

def get_repo_root() -> Path:
    """Get git repo root, raise if not in a repo"""
    result = subprocess.run(
        ['git', 'rev-parse', '--show-toplevel'],
        capture_output=True, text=True, check=True
    )
    return Path(result.stdout.strip())

def get_current_branch() -> str:
    result = subprocess.run(
        ['git', 'branch', '--show-current'],
        capture_output=True, text=True, check=True
    )
    return result.stdout.strip()

def create_worktree(path: Path, branch: str, base_branch: str) -> None:
    """Create worktree at path with new branch from base"""
    subprocess.run(
        ['git', 'worktree', 'add', str(path), '-b', branch, base_branch],
        check=True
    )

def delete_worktree(path: Path) -> None:
    subprocess.run(['git', 'worktree', 'remove', str(path)], check=True)
```

### 4.3 Tmux Module

```python
# winow/tmux.py
import subprocess
from pathlib import Path

def create_session(name: str, working_dir: Path) -> None:
    """Create detached tmux session"""
    subprocess.run(
        ['tmux', 'new-session', '-d', '-s', name, '-c', str(working_dir)],
        check=True
    )

def session_exists(name: str) -> bool:
    result = subprocess.run(
        ['tmux', 'has-session', '-t', name],
        capture_output=True
    )
    return result.returncode == 0

def send_keys(session: str, text: str) -> None:
    subprocess.run(
        ['tmux', 'send-keys', '-t', session, text, 'Enter'],
        check=True
    )

def capture_pane(session: str) -> str:
    result = subprocess.run(
        ['tmux', 'capture-pane', '-t', session, '-p'],
        capture_output=True, text=True, check=True
    )
    return result.stdout

def attach_session(session: str) -> None:
    """Replace current process with tmux attach"""
    import os
    os.execvp('tmux', ['tmux', 'attach-session', '-t', session])
```

### 4.4 Core Module

```python
# winow/core.py
import json
import re
import time
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path

from . import git, tmux, config

@dataclass
class Session:
    name: str
    agent: str
    tmux_session: str
    worktree_path: str
    branch: str
    created_at: str
    initial_prompt: str

def sanitize_name(prompt: str) -> str:
    """Convert prompt to git-safe name"""
    import hashlib
    # Lowercase, replace non-alnum with hyphen, truncate
    clean = re.sub(r'[^a-z0-9]+', '-', prompt.lower()).strip('-')[:40]
    suffix = hashlib.sha256(prompt.encode()).hexdigest()[:5]
    return f"{clean}-{suffix}"

def load_sessions(config_dir: Path) -> dict[str, Session]:
    sessions_file = config_dir / 'sessions.json'
    if not sessions_file.exists():
        return {}
    data = json.loads(sessions_file.read_text())
    return {k: Session(**v) for k, v in data.get('sessions', {}).items()}

def save_sessions(config_dir: Path, sessions: dict[str, Session]) -> None:
    config_dir.mkdir(parents=True, exist_ok=True)
    sessions_file = config_dir / 'sessions.json'
    data = {'sessions': {k: asdict(v) for k, v in sessions.items()}}
    sessions_file.write_text(json.dumps(data, indent=2))

def start_session(agent_name: str, prompt: str) -> Session:
    """Create worktree, tmux session, launch agent, send prompt"""
    if agent_name not in config.AGENTS:
        raise ValueError(f"Unknown agent: {agent_name}")
    
    agent = config.AGENTS[agent_name]
    repo_root = git.get_repo_root()
    base_branch = git.get_current_branch()
    
    session_name = sanitize_name(prompt)
    branch = f"winow/{session_name}"
    worktree_path = config.get_worktree_dir(repo_root) / session_name
    tmux_name = f"winow-{session_name}"
    
    # Create worktree and tmux
    git.create_worktree(worktree_path, branch, base_branch)
    tmux.create_session(tmux_name, worktree_path)
    
    # Launch agent and send prompt
    tmux.send_keys(tmux_name, agent.command)
    time.sleep(2)  # Wait for agent to start
    tmux.send_keys(tmux_name, prompt)
    
    # Save session
    session = Session(
        name=session_name,
        agent=agent_name,
        tmux_session=tmux_name,
        worktree_path=str(worktree_path),
        branch=branch,
        created_at=datetime.now().isoformat(),
        initial_prompt=prompt,
    )
    
    config_dir = config.get_config_dir(repo_root)
    sessions = load_sessions(config_dir)
    sessions[session_name] = session
    save_sessions(config_dir, sessions)
    
    return session

def list_sessions() -> list[dict]:
    """List all sessions with current status"""
    repo_root = git.get_repo_root()
    config_dir = config.get_config_dir(repo_root)
    sessions = load_sessions(config_dir)
    
    results = []
    for session in sessions.values():
        status = "unknown"
        if tmux.session_exists(session.tmux_session):
            pane = tmux.capture_pane(session.tmux_session)
            agent = config.AGENTS.get(session.agent)
            if agent:
                if re.search(agent.idle_pattern, pane, re.MULTILINE):
                    status = "idle"
                elif re.search(agent.thinking_pattern, pane, re.IGNORECASE):
                    status = "thinking"
        else:
            status = "dead"
        
        results.append({
            'name': session.name,
            'agent': session.agent,
            'status': status,
            'created_at': session.created_at,
        })
    
    return results

def send_message(session_name: str, message: str) -> None:
    """Send message to session"""
    repo_root = git.get_repo_root()
    config_dir = config.get_config_dir(repo_root)
    sessions = load_sessions(config_dir)
    
    if session_name not in sessions:
        raise ValueError(f"Session not found: {session_name}")
    
    session = sessions[session_name]
    if not tmux.session_exists(session.tmux_session):
        raise RuntimeError(f"Tmux session dead: {session.tmux_session}")
    
    tmux.send_keys(session.tmux_session, message)

def attach(session_name: str) -> None:
    """Attach to session (replaces current process)"""
    repo_root = git.get_repo_root()
    config_dir = config.get_config_dir(repo_root)
    sessions = load_sessions(config_dir)
    
    if session_name not in sessions:
        raise ValueError(f"Session not found: {session_name}")
    
    session = sessions[session_name]
    tmux.attach_session(session.tmux_session)  # Does not return
```

---

## Phase 5: Test Flows

### 5.1 Unit Tests (Mocked)

```python
# tests/test_core.py
from unittest.mock import patch, MagicMock
from winow import core

def test_sanitize_name():
    assert core.sanitize_name("Fix the bugs!") == "fix-the-bugs-xxxxx"  # hash varies
    assert len(core.sanitize_name("x" * 100)) <= 46  # 40 + hyphen + 5

def test_start_session_calls_git_and_tmux(tmp_path):
    with patch('winow.core.git') as mock_git, \
         patch('winow.core.tmux') as mock_tmux, \
         patch('winow.core.config.get_config_dir') as mock_cfg:
        
        mock_git.get_repo_root.return_value = tmp_path
        mock_git.get_current_branch.return_value = 'main'
        mock_cfg.return_value = tmp_path / '.config'
        
        session = core.start_session('opencode', 'test prompt')
        
        assert mock_git.create_worktree.called
        assert mock_tmux.create_session.called
        assert mock_tmux.send_keys.call_count == 2  # agent + prompt
```

### 5.2 Integration Tests (Real Git/Tmux)

```python
# tests/test_integration.py
import pytest
import subprocess
from pathlib import Path

@pytest.fixture
def temp_git_repo(tmp_path):
    """Create a temporary git repo"""
    subprocess.run(['git', 'init'], cwd=tmp_path, check=True)
    subprocess.run(['git', 'commit', '--allow-empty', '-m', 'init'], cwd=tmp_path, check=True)
    return tmp_path

@pytest.mark.integration
def test_full_flow(temp_git_repo, monkeypatch):
    """End-to-end: start -> ps -> send -> cleanup"""
    monkeypatch.chdir(temp_git_repo)
    # ... real commands against tmux
    pytest.skip("Needs tmux running - manual test")
```

---

## Task Checklist

### Phase 1: Setup
- [ ] Add click, rich to dependencies
- [ ] Add pytest, pytest-mock to dev dependencies
- [ ] Document CLI spec in README

### Phase 2: Skeleton
- [ ] Create `winow/` package structure
- [ ] Implement no-op CLI commands
- [ ] Add entry point to pyproject.toml
- [ ] Verify `winow --help` works

### Phase 3: Tests
- [ ] Create tests/ directory with conftest.py
- [ ] Write passing test (--help)
- [ ] Write failing placeholder test
- [ ] Verify pytest runs

### Phase 4: Implementation
- [ ] Implement config.py (agents, paths)
- [ ] Implement git.py (worktree ops)
- [ ] Implement tmux.py (session ops)
- [ ] Implement core.py (orchestration)
- [ ] Wire CLI to core module
- [ ] Remove no-op stubs

### Phase 5: Real Tests
- [ ] Unit tests for core.py with mocks
- [ ] Integration test skeleton
- [ ] Manual end-to-end verification

---

## Open Questions

1. **`ps` vs `list`**: Human plan says `ps` (docker-like), README says `list`. Recommend: use `ps` for docker consistency, alias `list` to it.

2. **Worktree location**: `.worktrees/` in repo root? Add to `.gitignore`?

3. **Agent startup delay**: Hardcoded 2s or configurable?

---

Signed-off-by: claude-sonnet-4 via opencode
