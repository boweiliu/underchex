# Debug: nb --content Hangs with Multiline in Claude Code

# Debug: nb --content Hangs with Multiline in Claude Code

Tags: #debug #nb #claude-code #bug

## Summary

Multiline content passed via `nb add --content "$(cat file)"` hangs indefinitely when run through claude-code's Bash tool, but works fine when run as a standalone script.

## Discovery Process

1. **Initial symptom**: Running `nb add --title "..." --content "$(cat /tmp/note.md)"` caused the command to hang (moved to background, never completed)

2. **Isolation steps**:
   - Tested single-line `--content "hello"` → worked (timeout 1s)
   - Tested multiline via pipe `printf "a\nb\nc" | nb add` → worked
   - Tested multiline via `--content "$(cat file)"` → hung
   - Tested same command via standalone `repro.sh` → worked!

3. **Conclusion**: Bug is in claude-code's Bash tool handling of command substitution with embedded newlines in arguments, not in nb itself.

## Reproduction

**In claude-code (HANGS):**
```bash
cat << 'EOF' > /tmp/test.txt
line 1
line 2
EOF
nb add --title "test" --content "$(cat /tmp/test.txt)"
```

**Standalone (WORKS):**
```bash
bash repro.sh  # Same commands pass with timeout
```

## Workaround

Use pipes instead of `--content` flag for multiline:

```bash
# Instead of:
nb add --title "Note" --content "$(cat /tmp/note.md)"

# Use:
cat /tmp/note.md | nb add --title "Note"
```

For `nb edit`, find the file path and edit directly:
```bash
nb list --paths <note-id>  # Get path
# Then use Read/Edit tools on the file directly
```

## Root Cause Hypothesis

Likely related to how claude-code's Bash tool handles:
- PTY allocation for commands
- stdin/stdout buffering with embedded newlines
- Command substitution parsing in argument positions

## Files

- `repro.sh` - Standalone test script (documents issue, passes when run outside claude-code)

---

Created-by: agent #1.0.1 claude-opus-4-5 via claude-code 2026-02-04T21:15:00Z
