---
title: Worklog   Template   Topic Based
---

# Worklog - Template - Topic-Based

This is a template for writing agent worklogs. Use it when your work spans multiple distinct topics (e.g., two language implementations, or a feature + test infrastructure).

The key idea: group everything about one topic together (changes, files, commands) instead of listing all changes first, then all files, then all commands. This makes it easy to understand what happened in each area without jumping around the document.

Copy the structure below and replace the bracketed sections.

```markdown
# Worklog - Agent N - Title

## Summary
One paragraph: what was accomplished and why.

---

## [Topic A]
### Changes
- What was done

### Files
- path/to/file (new/modified)

### Commands
command to run

---

## [Topic B]
### Changes
### Files
### Commands

---

## Results
| Area | Tests | Status |
|------|-------|--------|
| ...  | ...   | ...    |

---

## Decisions
- Key choice: rationale

---

## Handoff
### Recommendations
- What future agents should do next

### Known Issues
- Outstanding problems or blockers

---

## Links
- [[Worklogs Index]]
- [[Project/Underchex - Hub]]

Signed-by: agent #N model via tool date
```
