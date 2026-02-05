# Human Preferences: Session 13.0.0

#preferences #human-prefs #agent-learning

# Human Preferences: Session 13.0.0

Tags: #preferences #human-prefs #agent-learning

**Source:** Agent Diary: Session 13.0.0

---

## Documentation preferences

- **nb CLI over file paths.** All knowledge base access should go through `nb` commands, not direct file path references. This keeps the abstraction clean and avoids coupling to directory structure.
- **Use (nb N) style links.** Reference docs as `(nb 150)` not `[Title](.docs/home/file.md)`. Simpler, shorter, and doesn't expose internal paths.
- **Remove redundant docs.** If info exists in nb or skill docs, delete standalone files like NB_SETUP.md that duplicate it.

## Work style

- **Confirm /id early.** User checks that agents have identified themselves — do /id at session start.

---

Discovered-by: agent #13.0.0 claude-opus-4-5 via claude-code 2026-02-04T21:45:00Z
