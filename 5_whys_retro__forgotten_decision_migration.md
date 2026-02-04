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

1. **Forgot the "why" behind doubled-width** — The agent remembered "we're using offset coords" but forgot *why* we chose doubled-width in [[146]]: to eliminate the ugly even/odd casework that raw offset coords require. Without remembering the motivation, doubled-width looked like an optional implementation detail rather than the essential fix.

2. **No traceable decision chain in the docs** — There's an implicit chain of decisions:
   ```
   orientation (flat/pointy)
     → coordinate system (offset vs axial)
       → offset's problem (even/odd casework)
         → solution (doubled-width)
   ```
   But this chain wasn't explicit in the docs. [[146]] didn't say "if you're revisiting orientation, also check the doubled-width decision." [[170]] didn't trace backward to see what depended on offset choice.

3. **Missing backlinks** — [[146]] should have had forward pointers: "Decisions that depend on this: doubled-width (§Option E)". [[170]] should have traced: "I'm writing about offset coords → what other decisions in [[146]] relate to offset? → doubled-width exists because of offset's weakness."

---

## Prevention Strategies

### Strategy 1: Decision Chain Links (Documentation Pattern)

Document the decision chain explicitly with forward and backward links:

**In [[146]] (the source doc):**
```markdown
## Decision Chain

This doc covers:
- Coordinate system choice (offset) → see §Decision
- Offset's weakness (even/odd casework) → see §Investigation
- Fix for offset (doubled-width) → see §Option E

**Forward links** — if revisiting these topics, also check:
- Orientation changes → doubled-width still applies (it fixes offset, not orientation)
- Coordinate system changes → would invalidate doubled-width
```

**In [[170]] (the superseding doc):**
```markdown
## Backlinks Traced

Before writing, I checked [[146]] for related decisions:
- §Decision: offset coords ✓ (still using)
- §Option E: doubled-width ✓ (still needed — fixes offset's even/odd problem)
- §Neighbor tables: need to update for odd-q
```

### Strategy 2: "Affects / Affected-by" Sections

Each decision doc should have:

```markdown
## Affects
- Neighbor calculation logic (requires doubled-width if using offset)
- Board rendering (hex placement math)

## Affected-by
- Orientation choice (flat vs pointy) — changes neighbor directions
- Coordinate system (offset vs axial) — we chose offset
```

When touching any node in the chain, these links prompt you to trace related decisions.

### Strategy 3: Problem-Solution Pairing

Always document the problem next to the solution:

```markdown
## Doubled-Width Coordinates

**Problem**: Offset coords have ugly even/odd casework for neighbors.
**Solution**: Double the column values so offsets become constant.

☝️ If you're using offset coords, you probably want this.
```

The problem statement makes it clear *when* the solution applies — anyone writing about offset coords sees the prompt.

### Strategy 4: Trace Backlinks When Superseding

Before finalizing a doc that refines another:
1. List all sections/decisions in the source doc
2. For each: "Does my new doc affect this? Does this affect my new doc?"
3. Explicitly state what's kept, refined, or dropped

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

### Example 2: What [[146]] Should Have Had (Forward Links)

[[146]] documented doubled-width but didn't flag when it matters:

**What [[146]] had:**
```markdown
## Recommendation: Option E (Doubled Internal, Offset External)

This gives us:
1. Familiar offset display
2. Clean neighbor math
3. N/S preserved as special
```

**What [[146]] should have had:**
```markdown
## Recommendation: Option E (Doubled Internal, Offset External)

**Problem solved**: Offset coords have ugly even/odd casework for neighbors.
**Solution**: Doubled-width internal storage with constant offsets.

### When This Applies

If you're using offset coordinates (which we are), you almost certainly want
doubled-width. This decision is **coupled to** the offset choice, not to
orientation (flat/pointy) or offset variant (odd-r/odd-q).

### Forward Links

If revisiting coordinate-related decisions, check:
- Changing to axial/cube? → doubled-width no longer needed
- Changing orientation? → doubled-width still applies (it fixes offset, not orientation)
- Changing offset variant? → doubled-width still applies, just update neighbor tables
```

This explicit "when this applies" + "forward links" would have prompted agent #16.0.0 to keep doubled-width when changing orientation.

---

### Example 3: Backlinks Section in [[170]]

**What [[170]] was missing:** No explicit trace of what it checked in [[146]].

**What it should have had:**
```markdown
## Backlinks Traced

Before writing, I reviewed [[146]] for related decisions:

| Section in [[146]]     | Relevant? | Action                          |
|------------------------|-----------|----------------------------------|
| §Decision (offset)     | ✅ Yes    | Still using offset — restated   |
| §Option E (doubled-width) | ✅ Yes | Still needed — restated below   |
| §Neighbor tables       | 🔄 Update | Changed for odd-q               |
| §Axial/Cube comparison | ❌ No     | Not using those                 |
```

This table forces enumeration — doubled-width can't be missed.

---

### Example 4: Decision Section with "Carried Forward"

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

### Example 5: Agent Self-Review Checklist

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

The fix is **traceable decision chains**:

1. **Source docs** ([[146]]): Add forward links — "if changing X, also check Y"
2. **Superseding docs** ([[170]]): Trace backlinks — enumerate what's in source, decide fate of each
3. **Problem-solution pairing**: State the problem next to the solution so readers know *when* it applies

If [[146]] had said "doubled-width applies whenever you use offset coords (regardless of orientation)" and [[170]] had a "Backlinks Traced" table, the decision couldn't have been missed.

---

## Recommended Actions

1. **Add to CLAUDE.md or a skill**: A "when superseding docs" checklist.

2. **Template update**: Add a "Supersedes / Keeps / Drops" section to decision doc templates.

3. **Create a skill or pattern**: "Doc Migration Checklist" — agents invoke when creating replacement docs.

4. **Knowledge base entry**: Document this failure mode with prevention strategies (this doc).

---

## Takeaway

The core issue is **untraceable decision chains**. Decisions form a graph:

```
orientation → coordinate system → offset's problem → doubled-width fix
```

Without explicit links along this chain, an agent touching one node doesn't know to check related nodes. The fix is **documentation structure** — forward/backward links, affects/affected-by sections, problem-solution pairings.

**Lesson**: Document the chain, not just the decisions. When a doc says "if you change X, also check Y," the agent gets prompted automatically.

---

Signed-by: agent #18.0.0 claude-opus-4-5 via claude-code 2026-02-04T21:55:00Z
Edited-by: agent #18.0.0 claude-opus-4-5 via claude-code 2026-02-04T22:05:00Z (added concrete examples)
Edited-by: agent #18.0.0 claude-opus-4-5 via claude-code 2026-02-04T22:08:00Z (spelled out A/B specifics)
Edited-by: agent #18.0.0 claude-opus-4-5 via claude-code 2026-02-04T22:12:00Z (revised root causes per user feedback — forgot "why" not just "what")
Edited-by: agent #18.0.0 claude-opus-4-5 via claude-code 2026-02-04T22:18:00Z (refocused on doc structure — decision chains, backlinks, traceability)
