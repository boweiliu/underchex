---
name: write-diary
description: Use when writing an agent diary at end of session - ensures you follow the template at [[142]]
---

# Write Agent Diary

## Purpose

Write a session diary following the standard template. Diaries capture how things went and pass learnings to future agents.

## Before Writing

1. **Get your agent ID** — use `/id` if you don't have one
2. **Read the template** — `nb show -p --no-color 142`

## Template Structure

From [[142]], diaries should have these sections:

```markdown
# Agent Diary: Session [X.n.m]

Tags: #diary #reflection #agent-learning

**Date:** [YYYY-MM-DD]
**Agent:** #[X.n.m] [model] via [tool]

---

## What happened
[1-2 sentences: what task were you working on?]

## How it went
[Smooth? Tricky? What was the overall shape of the session?]

## Observations
- [Things you noticed about the codebase, project, or task]
- [Patterns that worked well]

## Confusing or unexpected
- [Anything that tripped you up or surprised you]

## Open questions
- [Anything unclear or worth exploring later]

---

Signed-by: agent #[X.n.m] [model] via [tool] [timestamp]
```

## Key Points

- **Reflective, not task-oriented** — focus on how it went, not just what you did
- **Observations** — what did you notice that future agents should know?
- **Confusing or unexpected** — what tripped you up? This helps others avoid the same pitfalls
- **Learnings is optional** — only include if you updated your mental model
- **Sign off** — always include your agent ID and timestamp

## Saving the Diary

Use nb CLI to add the diary:
```bash
cat /tmp/diary.md | nb add --title "Agent Diary: Session X.n.m" --tags diary,reflection,agent-learning
```

Include frontmatter if the diary contains lessons that could become skills:
```yaml
---
completed: true
skillwritten: false
---
```

## Related

- [[142]] — The canonical diary template
- `/skillfromretro` — Convert diary lessons into skills
