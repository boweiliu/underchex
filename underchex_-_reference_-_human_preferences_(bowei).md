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
- **Session artifacts** — expects diary, humanprefs, worklog, and worklog details docs at end of session

## Communication

- Prefers direct, concise communication
- Explains reasoning when disagreeing — open to pushback if well-reasoned
- Values having opinions challenged with good arguments

## Code Design

- **Separation of concerns** — caught when I conflated board centering with coordinate origin. Asked "why are those connected?" — expects transforms to be layered and independent.
- **References docs during review** — mentioned nb 148 when asking for doubled-width coords in display. Actually reads and uses the knowledge base.
- **Show internal state for debugging** — prefers seeing actual internal representation (dcol) rather than derived values (col) during development.

## Development Process

- **Design before implementation** — especially for data structures. When I jumped straight to TypeScript types, user said "back up and think through."
- **Cross-language awareness** — README lists 8 language targets. Shared data should be in language-agnostic formats (JSON, plain text), not hardcoded in one language.
- **Spec format vs spec content** — approved the JSON schema format while noting the example values were intentionally wrong placeholders. Separates "how to express" from "what to express."
- **Proposals in nb** — prefers seeing design proposals as nb docs for review before implementation.
- **Tight task scope** — when asked about "starting position data model", that's not the same as "board data structure". Corrected agent twice when scope expanded beyond the specific task.
- **Visual formats for editability** — chose visual string notation over programmatic formats. Likes being able to see and edit layouts at a glance.
- **TDD thinking** — asked "what would you do if I asked for tests first?" as teaching moment. Expects agents to think through test-first approach.

## Retro and Analysis

- **Push for deeper root causes** — first answer is often too shallow. Expects multiple refinement passes.
- **Specificity over abstraction** — prefers concrete examples ("[[146]] and [[170]]") over abstract ("doc A supersedes doc B")
- **Focus on doc structure** — when analyzing failures, prefers "how could docs have prevented this?" over "how should agent have behaved differently?"
- **Decision chain traceability** — decisions form chains (orientation → offset → doubled-width). Wants explicit forward/backward links so agents touching one node know to check related nodes.

---

## Related

- [[157]] Testing Philosophy
- [[161]] Agent Diary: Session 11.0.0 (context for these preferences)

---

Created-by: agent #11.0.0 claude-opus-4-5 via claude-code 2026-02-04T21:08:00Z
Edited-by: agent #15.0.0 claude-opus-4-5 via claude-code 2026-02-04T21:40:00Z
Edited-by: agent #14.0.0 claude-opus-4-5 via claude-code 2026-02-04T23:05:00Z
Edited-by: agent #17.0.0 claude-opus-4-5 via claude-code 2026-02-04T22:08:00Z
Edited-by: agent #18.0.0 claude-opus-4-5 via claude-code 2026-02-04T22:35:00Z (added Retro and Analysis section)
Edited-by: agent #19.0.0 claude-opus-4-5 via claude-code 2026-02-04T22:20:00Z (added tight task scope, visual formats, TDD thinking)
