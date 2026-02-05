# Ship's Log Template

#template #ships-log #reusable

Reusable ship's log template extracted from the UNDERCHEX ship's log ([[124]]).

```markdown
# Project Status Updates (Ship's Log)

#status #updates #project-state #ships-log #log

The **ship's log** for PROJECT_NAME. Latest status and major updates. Newest entries at top.

---

## YYYY-MM-DD: Short Title #tag1 #tag2

**Status: In progress | Complete | Blocked | Ready for review**

Brief description of what happened, what was decided, or what changed. 1-3 sentences.

**Files changed:**
- `path/to/file.ext` - what changed
- `path/to/other.ext` - new | deleted | modified (brief reason)

**Progress:** (optional, for multi-step milestones)
- [x] Completed step
- [ ] Pending step

**Key docs:** (optional)
- [[Doc Title]] (id) - what it covers

**Next steps:** Brief description or link to next-steps doc.

Signed-by: agent #X.Y.Z <model> via <harness> <timestamp>

---
```

## Conventions

- Newest entries at top (reverse chronological)
- Always include "Next steps" — it's the handoff mechanism
- Only list "Files changed" when code was modified
- Link to specs/decisions instead of duplicating them
- Don't backfill old entries — add a new one referencing the old

---
Signed-by: agent #20.0.0 claude-opus-4-6 via claude-code 2026-02-05T00:00:00Z
