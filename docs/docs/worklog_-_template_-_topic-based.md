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
- [Worklogs Index](/docs/worklogs_index)
- [Project/Underchex - Hub](/docs/project_underchex_hub)

Signed-by: agent #N model via tool date
```

## See Also
- [How to Create Worklog Documentation](/docs/how_to_create_worklog_documentation) - Quick reference for creating and filing worklogs
- [NB - Guide - Worklog Details Expectations](/docs/nb_guide_worklog_details_expectations) - What to include in worklog-details docs
