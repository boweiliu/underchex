# PLAN.LLM.md - Winow Implementation Plan

## Current State

The project has a skeleton structure:
- `main.py` - Empty stub with hello world
- `pyproject.toml` - Basic project config, no dependencies
- `README.md` - Documents the intended CLI interface
- Design doc at `../../WINOW.LLMS.md`

## Implementation Plan

### Phase 1: Project Foundation

**1.1 Add Dependencies**
- Add `click` for CLI framework
- Add `rich` for terminal output (tables, colors)
- Add `pydantic` for data validation and settings

**1.2 Create Package Structure**
```
winow/
├── __init__.py
├── cli.py           # Click CLI entry points
├── session.py       # Session management logic
├── agents.py        # Agent configurations and patterns
├── git.py           # Git worktree operations
├── tmux.py          # Tmux operations
├── config.py        # Configuration management
└── state.py         # Session state persistence
```

**1.3 Setup Entry Point**
- Update `pyproject.toml` with `[project.scripts]` for `winow` command

---

### Phase 2: Core Infrastructure

**2.1 Configuration System (`config.py`)**
- Config location: `~/.config/winow/`
- Per-repo config: `~/.config/winow/<repo-hash>/config.toml`
- Global agent definitions with idle/thinking patterns
- Pydantic models for validation

**2.2 State Management (`state.py`)**
- JSON-based session storage at `~/.config/winow/<repo-hash>/sessions.json`
- Session dataclass/model with: agent, tmux_session, worktree_path, branch, created_at, initial_prompt, status
- Load/save utilities
- Repo identifier from git root path (hash)

**2.3 Agent Registry (`agents.py`)**
- Dataclass for agent config: command, idle_pattern, thinking_pattern
- Built-in agents: opencode, claude, codex
- Pattern matching utilities for status detection

---

### Phase 3: External Tool Integration

**3.1 Git Operations (`git.py`)**
- `get_repo_root()` - Find git repo root
- `get_current_branch()` - Get current branch name
- `create_worktree(path, branch)` - Create new worktree with branch
- `delete_worktree(path)` - Remove worktree (future cleanup)
- Error handling for git failures

**3.2 Tmux Operations (`tmux.py`)**
- `create_session(name, working_dir)` - Create detached tmux session
- `session_exists(name)` - Check if session exists
- `send_keys(session, text)` - Send keystrokes to session
- `capture_pane(session)` - Get current pane content
- `attach_session(session)` - Attach to session (replaces current process)
- `kill_session(session)` - Kill session (future)

---

### Phase 4: CLI Commands

**4.1 `winow start <agent> "<prompt>"`**
1. Validate agent exists
2. Generate session name from prompt (sanitize, add hash suffix)
3. Create git worktree with new branch
4. Create tmux session in worktree directory
5. Launch agent inside tmux
6. Wait briefly for agent to initialize
7. Send initial prompt
8. Save session metadata
9. Output session name

**4.2 `winow list`**
1. Load all sessions for current repo
2. For each: check tmux exists, capture pane, detect status
3. Render table with: SESSION, AGENT, STATUS, AGE

**4.3 `winow send <session> "<message>"`**
1. Load session metadata
2. Verify tmux session exists
3. Send message as keystrokes
4. Output confirmation

**4.4 `winow attach <session>`**
1. Load session metadata
2. Exec into tmux attach (replace process)

---

### Phase 5: Polish & Edge Cases

**5.1 Error Handling**
- Not in a git repo
- Agent not found
- Session not found
- Tmux not installed
- Git worktree failures

**5.2 Session Naming**
- Sanitize prompt to git-safe name
- Truncate long prompts
- Add short hash suffix for uniqueness
- Prefix with `winow/` for branch names

**5.3 Stdin Support**
- Allow `echo "prompt" | winow start opencode`
- Read from stdin if prompt not provided as arg

---

## Task Breakdown (Ordered)

1. [ ] Add dependencies to `pyproject.toml` (click, rich, pydantic)
2. [ ] Create package structure with `winow/` directory
3. [ ] Implement `config.py` - paths, repo identifier
4. [ ] Implement `agents.py` - agent registry with patterns
5. [ ] Implement `state.py` - session persistence
6. [ ] Implement `git.py` - worktree operations
7. [ ] Implement `tmux.py` - session operations
8. [ ] Implement `session.py` - high-level session management
9. [ ] Implement `cli.py` - Click commands
10. [ ] Update `pyproject.toml` entry point
11. [ ] Test `winow start` end-to-end
12. [ ] Test `winow list` end-to-end
13. [ ] Test `winow send` end-to-end
14. [ ] Test `winow attach` end-to-end
15. [ ] Add error handling and edge cases
16. [ ] Add stdin support for prompts

---

## Questions / Decisions Needed

1. **Worktree location**: Use `.worktrees/` in repo root or a central location?
   - Design doc suggests `.worktrees/` in repo
   
2. **Session name generation**: How aggressive should truncation be?
   - Suggestion: Max 40 chars from prompt, then 5-char hash suffix
   
3. **Agent init wait time**: How long to wait before sending prompt?
   - Suggestion: 2-3 seconds default, configurable per agent

4. **Status detection frequency**: For `list`, how fresh should status be?
   - Suggestion: Capture pane content on-demand for each list call

5. **Archive behavior**: Should we implement archiving in Phase 1?
   - Suggestion: Defer to future, focus on core flow first
