# 5 Whys Retro: Forgotten Decision Migration

# 5 Whys Retro: Forgotten Decision Migration

Tags: #retro #5whys #process #documentation #underchex

**Date:** 2026-02-04
**Agent:** #18.0.0 claude-opus-4-5 via claude-code

---

## The Incident

When agent #16.0.0 created [[170]] (Hex Orientation) to supersede parts of [[146]] (Hex Coordinate Systems), the doubled-width coordinate decision was not migrated over. The user had to remind the agent about this missing decision.

User's words: *"we didn't migrate over the offset philosophy - double-width coords was selected because we wanted clean logic for neighbors"*

---

## 5 Whys Analysis

### Why #1: Why was the doubled-width coordinate decision missing from [[170]]?

**Answer:** The agent focused on the new hex orientation decision (flat-top with odd-q) and didn't review what other decisions from [[146]] should carry forward.

### Why #2: Why didn't the agent review what decisions from [[146]] should carry forward?

**Answer:** The agent was in a reactive mode — responding to user corrections about orientation — rather than proactively doing a completeness check. The task felt "done" once the orientation was documented correctly.

### Why #3: Why did the task feel "done" without a completeness check?

**Answer:** There's no explicit checklist or process step that says "when superseding a doc, enumerate what's being kept vs. dropped vs. modified." The agent relied on implicit judgment about what was relevant.

### Why #4: Why is there no checklist for doc supersession?

**Answer:** The process for creating/updating decision docs hasn't been formally defined. Agents learn by doing and by observing human feedback, but there's no institutional memory of this specific failure mode.

### Why #5: Why hasn't this failure mode been documented before?

**Answer:** This is likely the first time it's happened (or the first time it was noticed and flagged). The feedback loop from user corrections to process improvements is ad-hoc rather than systematic.

---

## Root Causes Identified

1. **No "supersession checklist"** — When doc A supersedes doc B, there's no prompt to audit what from B needs to carry forward.

2. **Reactive vs. proactive mode** — Correction cycles put the agent in "fix what the user said" mode rather than "what else might be missing" mode.

3. **Implicit knowledge** — The relationship between decisions (e.g., "offset coords" implies "doubled-width for clean math") was in the agent's context during [[146]] creation but not explicitly flagged as a dependency.

---

## Prevention Strategies

### Strategy 1: Supersession Checklist (Process)

When creating a doc that supersedes or refines another doc:

1. **List what's being superseded** — Which sections/decisions from the old doc does this replace?
2. **List what's being kept** — Which decisions from the old doc remain valid and should be restated?
3. **List what's unchanged** — Which parts of the old doc are not addressed (and why)?
4. **Add a "Related Decisions" section** — Cross-reference kept decisions explicitly.

### Strategy 2: Decision Dependencies (Documentation Pattern)

In decision docs, add a "Dependencies" or "Requires" section:

```markdown
## Dependencies

This decision assumes/requires:
- [[146]] §Option E: Doubled-width internal coords (for clean neighbor math)
- Board is hex-based (not square)
```

When superseding, this makes it explicit what must be brought forward.

### Strategy 3: Self-Review Prompt (Agent Behavior)

Before finalizing a doc that supersedes another, agents should ask themselves:
- "What decisions from the superseded doc are still valid?"
- "Have I restated or cross-referenced all kept decisions?"
- "Would someone reading only this new doc have complete context?"

### Strategy 4: User-Side Flag (Process)

When a user points out a missing migration, that's a signal to:
1. Fix the immediate issue
2. Document the failure mode (this retro)
3. Update process guidance for future agents

---

## Recommended Actions

1. **Add to CLAUDE.md or a skill**: A "when superseding docs" checklist.

2. **Template update**: Add a "Supersedes / Keeps / Drops" section to decision doc templates.

3. **Create a skill or pattern**: "Doc Migration Checklist" — agents invoke when creating replacement docs.

4. **Knowledge base entry**: Document this failure mode with prevention strategies (this doc).

---

## Takeaway

The core issue is **implicit vs. explicit knowledge transfer**. Decisions don't exist in isolation — they form a web. When refactoring that web (superseding one doc with another), the connections need to be audited explicitly, not assumed.

---

Signed-by: agent #18.0.0 claude-opus-4-5 via claude-code 2026-02-04T21:55:00Z
