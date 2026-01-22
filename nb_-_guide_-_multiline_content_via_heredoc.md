# NB - Guide - Multiline Content via Heredoc

Tags: #guide #shell #heredoc

## Problem
Passing multiline note content inline to `nb edit --content "..."` causes shell errors and truncated updates. Quotes, newlines, and special characters get mangled by shell expansion.

## Solution
Write content to a temporary file via heredoc, then load it with command substitution:

```bash
# 1. Write content to temp file using heredoc
cat << 'EOF' > /tmp/note-content.md
# My Note Title

Tags: #topic #subtopic

## Section
Content goes here with **markdown** and `code`.
EOF

# 2. Load file content into nb edit
nb edit <note-id> --content "$(cat /tmp/note-content.md)" --overwrite

# 3. Clean up
rm /tmp/note-content.md
```

## Key Points
- Use `<< 'EOF'` (quoted) to prevent variable expansion in the heredoc
- Use `--overwrite` to replace content cleanly
- The `$(cat ...)` substitution preserves newlines and formatting

## Related
- [[NB - Guide - Note Formatting]] - Note structure guidelines

Signed-off-by: claude-sonnet-4 via opencode

