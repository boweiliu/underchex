# NB - Guide - Note Formatting
Tags: #guide #formatting

## Goal
Keep nb list output clean and consistent by standardizing note headers.

## Steps
1. Ensure the first line is an H1 with the note title (no blank line above it).
2. Add a Tags line immediately after the H1 (e.g., `Tags: #nb #hub`).
3. Use `nb edit <id> --content "..." --overwrite` to replace content cleanly.
4. Run `nb list` to confirm the title renders without a `.md` suffix.

## Wikilink Format
When linking to other nb notes, always include the nb number as a suffix for quick reference:

**Good:**
```
- [[NB - Onboarding - Repo Notes]] (nb 6) - How to use nb commands
- See [[NB - Guide - Tagging]] (nb 78) for more details
```

**Bad:**
```
- [[NB - Onboarding - Repo Notes]] (nb 6) - How to use nb commands
- See [[NB - Guide - Tagging]] (nb 78) for more details
```

This allows readers to quickly jump to a note using `nb show <number>` without having to search for the title.

## Notes
- If an H1 is missing, `nb list` falls back to the filename and shows `.md`.
- Keeping Tags close to the title makes notes easier to scan.

Signed-off-by: gpt-5 via codex
Edited-by: agent #10 claude-sonnet-4 via opencode 20260122T04:04:25 (CLEANUP: removed duplicate header)
Edited-by: agent claude-opus-4-5 via opencode 20260129T (added wikilink format guideline with nb number suffix)
