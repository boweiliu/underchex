# Retro: Skill Generator System - Claude Code Hooks Implementation

# Retro: Skill Generator System - Claude Code Hooks Implementation

**Date:** 2026-01-30  
**Agent:** Agent handling skill generation automation

## Problem Statement

User wanted a system to automatically generate Claude Code skills from documentation files (in `docs/docs/` or `.nb_docs_repo/home/`) that contain a `## Triggers` section. The system needed to:

1. Be testable as a standalone script
2. Work as a Claude Code subagent process (agent does all file operations)
3. Eventually run automatically via hooks when docs are written
4. Avoid duplicate suggestions during incremental edits

## Initial Approach (Failed)

**Attempt 1: Pure Python Script**
- Created `generate_skill_from_doc.py` that parsed MD files and generated skills directly
- Problem: User wanted this to be an *agent* that uses Claude Code tools (Read, Write), not a Python script doing file I/O
- Lesson: When building for Claude Code, the agent should do the work, not external scripts

**Attempt 2: Python Script Invoking CLI Agent**
- Modified script to call `subprocess.run(['claude-code', 'agent', prompt])`
- Problem: No such CLI command exists - agents can ONLY be invoked from within a Claude Code session
- Lesson: Claude Code agents (including subagents via Task tool) can only be spawned from active sessions, not from shell scripts

## Final Architecture (Success)

### Components Created:

1. **`scripts/skill_generator_prompt.md`**
   - Template with instructions for subagent to follow
   - Uses `{INPUT_FILE_PATH}` placeholder
   - Tells agent to use Read/Write tools to generate skills

2. **`scripts/check_doc_for_triggers.py`**
   - Hook script that runs after Write tool
   - Checks if file should trigger skill generation
   - Outputs suggestion message for main agent to see

3. **`.claude/settings.json`**
   - Configures PostToolUse hook for Write tool
   - Passes `{{file_path}}` to hook script

4. **`scripts/README_SKILL_GENERATOR.md`**
   - Complete documentation of the system

### Key Design Decisions:

**Hook Script Responsibilities:**
- Filter: Only docs in target directories
- Filter: Only `.md` files
- Filter: Only files with `## Triggers` section
- Filter: Only if skill doesn't already exist (prevents duplicates)
- Output: Suggestion message with file path

**Main Agent Responsibilities:**
- See hook output in conversation
- Decide to invoke Task tool
- Pass skill generator prompt to subagent
- Monitor subagent output
- Verify skill was created

**Subagent Responsibilities:**
- Read the doc file
- Extract: title, tags, triggers, overview
- Generate skill name (kebab-case)
- Write skill to `.claude/skills/{name}/SKILL.md`

## Problems Encountered

### Problem 1: Settings Format Evolution

**Issue:** Claude Code hooks format changed between versions

**Errors encountered:**
```
PostToolUse: Expected array, but received object
matcher: Expected string, but received object
```

**Failed formats:**
```json
// Attempt 1 (old format)
"PostToolUse": {
  "matcher": "Write",
  "command": "..."
}

// Attempt 2 (wrong new format)
"PostToolUse": [{
  "matcher": {"tools": ["Write"]},
  "hooks": [...]
}]
```

**Working format:**
```json
"PostToolUse": [{
  "matcher": "Write",  // String, not object!
  "hooks": [{
    "type": "command",
    "command": "..."
  }]
}]
```

**Solution:** Web search for current documentation, fixed to array format with string matcher

### Problem 2: Absolute vs Relative Paths

**Issue:** Hook receives absolute path from Claude Code, but script checks for relative path prefixes

**Initial check:**
```python
if not file_path.startswith('docs/docs/'):  # Fails for absolute paths!
```

**Solution:** Convert absolute paths to relative before checking
```python
path_obj = Path(file_path)
if path_obj.is_absolute():
    file_path = str(path_obj.relative_to(Path.cwd()))
```

### Problem 3: Debugging Hook Execution

**Issue:** Hook runs silently - hard to debug why it doesn't fire

**Solution:** Added debug mode
```python
debug = '--debug' in sys.argv
if debug:
    print(f"[DEBUG] {msg}", file=sys.stderr)
```

Usage: `python3 scripts/check_doc_for_triggers.py path/to/file.md --debug`

### Problem 4: Preventing Spam During Incremental Edits

**Issue:** Writer agent might edit file 10+ times, triggering hook each time

**Solution:** Check if skill already exists
```python
if skill_exists(skill_name):
    sys.exit(0)  # Silent exit
```

This means:
- First write with triggers → suggestion appears
- Subsequent edits → no suggestion (already exists)
- Or if no triggers yet → no suggestion (silent exit)

## Lessons Learned

### 1. Claude Code Agent Invocation Model
- **No CLI for spawning agents** - must be in active session
- **Task tool is the way** - spawn subagents from within sessions
- **Hooks output text** - main agent sees it and decides to act

### 2. Hook Architecture Pattern
```
Write tool → Hook fires → Script checks → Output suggestion → Agent sees → Agent uses Task tool → Subagent works
```

The hook doesn't invoke the agent - it suggests, and the main agent decides.

### 3. Settings Format Changes
- Always check official docs for current format
- Format evolved from simple object to array-based with matchers
- Matcher is a string, not an object (common mistake)

### 4. Path Handling in Hooks
- `{{file_path}}` may be absolute or relative
- Always normalize before checking prefixes
- Use `Path.relative_to(Path.cwd())` for conversion

### 5. Debugging Hooks
- Add opt-in debug logging (via `--debug` flag or env var)
- Log to stderr to separate from hook output
- Log each decision point (✓/❌) for clarity

### 6. Preventing Hook Spam
- Check if work already done (idempotency)
- Silent early exits for non-matching files
- Fast filtering at top of script (cheap checks first)

## Testing Strategy

**Manual testing:**
```bash
# Test hook script directly
python3 scripts/check_doc_for_triggers.py docs/docs/test.md --debug

# Test in Claude Code session
# 1. Start new session (hooks load at session start)
# 2. Ask agent to write doc with triggers
# 3. Watch for hook output
# 4. Invoke skill generation manually
```

**Key insight:** Settings changes require session restart

## Future Improvements

1. **Cooldown timer** - Prevent suggestions within N minutes of last suggestion
2. **Marker-based triggering** - Writer agent adds `<!-- SKILL_READY -->` when done
3. **Hook for Edit tool** - Currently only fires on Write, not Edit
4. **Better error handling** - Currently silently exits on errors
5. **Logging to file** - Persistent debug log instead of stderr

## Documentation Created

- `scripts/README_SKILL_GENERATOR.md` - Complete system overview
- `scripts/skill_generator_prompt.md` - Subagent instructions
- `.claude/settings.json` - Hook configuration
- This retro - Lessons learned and troubleshooting guide

## Tags

#claude-code #hooks #PostToolUse #skill-generation #automation #retro #debugging #settings.json #subagent #Task-tool
