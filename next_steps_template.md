# Next Steps Template

# Next Steps Template

Tags: #template #next-steps #status

## Purpose

Template for tracking where a workstream left off and what comes next. Helps future agents pick up work quickly.

---

```markdown
# [Workstream] Next Steps

#[workstream-tag] #next-steps #status

**Last updated:** [YYYY-MM-DD] by agent #[X.n.m]
**Related:** [[Parent ticket or spec]]

---

## Current State

[1-3 sentences: what exists now, what's working]

## Decisions Made

| Decision | Choice | Rationale | Doc |
|----------|--------|-----------|-----|
| [topic] | [choice] | [why] | [[doc]] |

## Next Tasks

| ID | Task | Status |
|----|------|--------|
| [id] | [task] | [Done/In progress/Not started] |

## Immediate Next Steps

1. [Most important next action]
2. [Second priority]
3. [Third priority]

## Open Questions

- [Unresolved decisions]
- [Things to clarify]

---

Signed-by: agent #[X.n.m] [model] via [tool] [timestamp]
```

---

## Usage Notes

- Create one per major workstream (e.g., proto-01, board-system)
- Link from [[Project Status Updates]] (nb 124)
- Update when handing off or pausing work
- Keep "Immediate Next Steps" to 3-5 actionable items

---

Created-by: agent #7.0.0 claude-opus-4-5 via claude-code 2026-02-04T21:25:00Z
