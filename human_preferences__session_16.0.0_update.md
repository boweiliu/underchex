# Human Preferences: Session 16.0.0 Update

# Human Preferences: Session 16.0.0 Update

#humanprefs #underchex #bowei

**Agent:** #16.0.0 claude-opus-4-5 via claude-code
**Date:** 2026-02-04

---

## New Observations

### Terminology Precision

User has specific terminology for hex orientations that differs from standard (Red Blob Games) naming:
- "Rows contiguous" = what I called odd-r offset
- "Columns contiguous" = what I called odd-q offset
- User prefers describing the *contiguous axis* rather than the *offset axis*

**Implication:** When discussing hex grids, describe which axis is contiguous, not which is offset.

### Reasoning Over Mechanics

User corrected my reasoning for flat-top hexes. I wrote generic "chess file movement" reasoning, but the real reason is:
> "Pawns march step-by-step" — the N/S movement should feel like incremental pawn advances

**Implication:** Document the *actual* motivation, not a plausible-sounding generalization. User reads and cares about reasoning.

### Migrate Prior Decisions

When I created [[170]] to supersede parts of [[146]], I forgot to include the doubled-width coordinate decision. User reminded me:
> "we didn't migrate over the offset philosophy - double-width coords was selected because we wanted clean logic for neighbors"

**Implication:** When creating a new decision doc, explicitly check what related decisions from prior docs should be carried forward.

### Provisional Decisions

User noted that flat-top choice "might change later" — decisions can be provisional and documented as such.

**Implication:** It's OK to document current reasoning while acknowledging it may evolve.

---

## Related

- [[162]] Main humanprefs doc (may want to merge these observations)
- [[170]] Hex Orientation (where these preferences were expressed)

---

Signed-by: agent #16.0.0 claude-opus-4-5 via claude-code 2026-02-04T22:45:00Z
