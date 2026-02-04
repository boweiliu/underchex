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

## Concrete Examples: What [[170]] Should Have Looked Like

### Example 1: Header with Supersession Audit Table

**What it had:**
```markdown
**Related**: [[146]], [[166]]

## The Issue
Previous docs assumed flat-top hexes with row-based offset...
```

**What it should have had:**
```markdown
**Related**: [[146]], [[166]]

## Supersession Audit

This doc refines/supersedes parts of [[146]]. Audit:

| From [[146]]                   | Status      | Notes                                     |
|--------------------------------|-------------|-------------------------------------------|
| Offset coords (not axial/cube) | ✅ Kept     | Restated in "Coordinate System" section   |
| Doubled-width internal storage | ✅ Kept     | Restated in "Doubled-Width" section below |
| Flat-top orientation           | 🔄 Refined  | Changed from odd-r to odd-q               |
| Neighbor offset tables         | 🔄 Refined  | Updated for odd-q in this doc             |

## The Issue
...
```

The table forces enumeration — the doubled-width decision can't be missed.

---

### Example 2: Dependencies Section

**What it was missing:** Nothing — no dependencies section existed.

**What it should have had:**
```markdown
## Dependencies

This decision assumes/requires:

1. **Offset coordinate system** ([[146]] main decision)
   - We use (col, row) offset coords, not axial or cube
   - Rationale: Preserves chess-like N/S directional asymmetry

2. **Doubled-width internal storage** ([[146]] Option E)
   - Store `_dcol = col * 2 + (row & 1)` internally
   - Enables constant neighbor offsets (no even/odd branching)
   - External API still uses familiar (col, row)
```

---

### Example 3: Decision Section with "Carried Forward"

**What it had:**
```markdown
## Decision

**Use flat-top hexes with odd-q column offset.**

- Flat edges at top/bottom of each hex
- Columns (files) are contiguous vertically
- Odd columns shifted down
- External coordinates: `(col, row)`
```

**What it should have had:**
```markdown
## Decision

**Use flat-top hexes with odd-q column offset and doubled-width internal storage.**

- Flat edges at top/bottom
- Columns contiguous vertically, odd columns shifted down
- External coordinates: `(col, row)`
- **Internal storage: doubled-width `_dcol`** (from [[146]] Option E)

### Carried Forward from [[146]]

The doubled-width representation remains the chosen approach:

\`\`\`typescript
class Hex {
  constructor(private _dcol: number, public row: number) {}
  get col() { return this._dcol >> 1; }
  static fromOffset(col: number, row: number) {
    return new Hex(col * 2 + (row & 1), row);
  }
}
\`\`\`

**Why keep this**: Constant neighbor offsets — no `if (col % 2)` branching.
```

---

### Example 4: Agent Self-Review Checklist

During doc creation, the agent could use an internal checklist:

```markdown
<!-- SUPERSESSION CHECKLIST (delete before finalizing):
- [x] Read [[146]] completely before writing
- [x] Listed all decisions: offset coords, doubled-width, flat-top, neighbor tables
- [x] For each: keep/refine/drop?
  - offset coords: KEEP
  - doubled-width: KEEP  <-- would have caught this
  - flat-top: REFINE (odd-r → odd-q)
  - neighbor tables: REFINE
- [x] Restated kept decisions explicitly
- [x] Someone reading only THIS doc has complete context
-->
```

---

### Key Pattern

The fix is **explicit enumeration**. The doc structure should force:

1. List everything in the superseded doc
2. Decide keep/refine/drop for each
3. Restate kept decisions (not just reference)
4. Include "Dependencies" or "Carried Forward" section

The doubled-width decision would have been caught at step 1.

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
Edited-by: agent #18.0.0 claude-opus-4-5 via claude-code 2026-02-04T22:05:00Z (added concrete examples)
