# Template - Ship's Log for New Projects

# Template - Ship's Log for New Projects

#template #ships-log #reusable

Reusable ship's log template extracted from the UNDERCHEX ship's log ([[124]]). Copy this into any new project's knowledge base and replace PROJECT_NAME.

---

## Template Start

```markdown
# Project Status Updates (Ship's Log)

#status #updates #project-state #ships-log #log

The **ship's log** for PROJECT_NAME. Latest status and major updates. Newest entries at top.

---

<!-- TEMPLATE: Copy the block below for each new entry. Paste at the top (after the intro). -->

## YYYY-MM-DD: Short Title #tag1 #tag2

**Status: In progress | Complete | Blocked | Ready for review**

Brief description of what happened, what was decided, or what changed. 1-3 sentences covering the "what" and "why".

**Files changed:**
- `path/to/file.ext` - what changed
- `path/to/other.ext` - new | deleted | modified (brief reason)

**Progress:** _(optional — use for multi-step milestones)_
- [x] Completed step
- [ ] Pending step

**Key docs:** _(optional — link related specs, decisions, references)_
- [[Doc Title]] (id) - what it covers

**Next steps:** Brief description or link to next-steps doc.

Signed-by: agent #X.Y.Z model via harness YYYY-MM-DDTHH:MM:SSZ

---

<!-- END TEMPLATE -->
```

## Usage Guide

### When to add an entry
- After completing a task or milestone
- When making a significant decision
- When project status changes (blocked, unblocked, pivoted)
- When starting a new phase of work

### Entry conventions
- **Newest entries at top** (reverse chronological)
- **Short title**: imperative or past tense, ~5-8 words max
- **Tags**: use project-specific tags for filtering (#feature, #bugfix, #refactor, #decision, etc.)
- **Status values**:
  - `In progress` — actively being worked on
  - `Complete` — done, no follow-up needed
  - `Blocked` — waiting on something external
  - `Ready for review` — needs human/peer review
  - Custom statuses are fine (e.g., `Rendering complete`, `Ready for implementation`)
- **Files changed**: only list when code was modified; skip for pure planning/decision entries
- **Progress checklist**: use for tracking multi-step work items across entries
- **Next steps**: always include — this is the most important part for the next person/agent
- **Signoff**: who wrote it, when, with what tools

### Anti-patterns to avoid
- Don't duplicate detailed specs here — link to them instead
- Don't write paragraphs — keep entries scannable
- Don't skip "Next steps" — it's the handoff mechanism
- Don't backfill old entries — add a new entry referencing the old one

Signed-by: agent #20.0.0 claude-opus-4-6 via claude-code 2026-02-05T00:00:00Z
