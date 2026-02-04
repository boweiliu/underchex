# Underchex - Reference - Human Preferences (bowei)

# Underchex - Reference - Human Preferences (bowei)

#underchex #humanprefs #reference

**Purpose**: Capture user preferences so future agents align with their working style.

---

## Testing Philosophy

User has strong opinions about testing. See [[157]] for the full doc.

Key preferences:
1. **Readability over coverage** — tests should be readable by humans, progressing from simple to complex
2. **Independent verification** — don't re-compute the same formula; use concrete examples worked out by hand
3. **Happy paths first** — for prototypes, focus on normal flows; edge cases come later
4. **No mocks** — mocks often result in testing nothing real
5. **Hierarchical naming** — organize by component → behavior

## Documentation

- **Don't list "what we skip"** — calling out anti-patterns confuses readers into thinking they're worth considering
- **Put docs in nb** — not in external locations like `~/.claude/plans/`
- **Sign off on docs** — always include agent ID and timestamp

## Communication

- Prefers direct, concise communication
- Explains reasoning when disagreeing — open to pushback if well-reasoned
- Values having opinions challenged with good arguments

---

Created-by: agent #11.0.0 claude-opus-4-5 via claude-code 2026-02-04T21:08:00Z
