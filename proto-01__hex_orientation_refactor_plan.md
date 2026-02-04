# PROTO-01: Hex Orientation Refactor Plan

# PROTO-01: Hex Orientation Refactor Plan

#underchex #proto-01 #refactor #coordinates #planning

**Related docs:**
- [[170]] Hex Orientation decision (the "what" — flat-top, odd-q, columns contiguous)
- [[146]] Original coordinate systems doc
- [[166]] Board data structure
- [[145]] PROTO-01 Breakdown (parent ticket)

---

## Summary

The codebase currently implements **flat-top, odd-r** (rows contiguous, odd rows shifted right).

We need to change to **flat-top, odd-q** (columns contiguous, odd columns shifted down).

This is a **transpose operation** — swapping which axis is contiguous vs staggered.

---

## Current vs Target

| Aspect | Current (odd-r) | Target (odd-q) |
|--------|-----------------|----------------|
| Contiguous axis | Rows (horizontal) | Columns (vertical) |
| Staggered axis | Columns | Rows |
| Offset rule | Odd rows shifted right | Odd columns shifted down |
| Parity check | `row & 1` | `col & 1` |
| Chess feel | Ranks are contiguous | Files are contiguous |

---

## Affected Files

### 1. `proto01/src/hex.ts` — CRITICAL

**Current implementation:**
- Doubled-width formula: `dcol = col * 2 + (row & 1)` (line 21)
- Direction offsets assume odd-r (lines 45-61)

**What changes:**
- Formula becomes: `drow = row * 2 + (col & 1)` — doubled-HEIGHT instead
- Or keep doubled-width but change the parity: `dcol = col * 2 + (col & 1)` — wait, that doesn't make sense
- Need to rethink: for odd-q, the *row* position depends on column parity, not the other way around

**Revised approach:**
- Keep `(col, row)` as external API
- Internal storage: `(col, drow)` where `drow = row * 2 + (col & 1)`
- Neighbor offsets change to odd-q variant

**Key lines to change:**
- Line 21: Creation formula
- Lines 45-61: DIRECTION_OFFSETS table
- Line 26: `offsetCol` → need `offsetRow` equivalent

---

### 2. `proto01/src/hex.test.ts` — CRITICAL

**Current tests:**
- All hardcoded for odd-r behavior
- Neighbor tests verify specific offsets
- Distance tests assume odd-r geometry

**What changes:**
- Every test case needs review
- Neighbor direction tests need new expected values
- Distance formula may change

**Key lines:** 26-368 (entire test file)

---

### 3. `proto01/src/render.ts` — HIGH

**Current implementation:**
- `hexToPixel()` (lines 63-85): `boardX = col * HEX_WIDTH + (row & 1) * (HEX_WIDTH / 2)`
- `pixelToHex()` (lines 91-112): Reverses with same parity logic
- Board iteration: `row < boardSize`, `col < boardSize`

**What changes:**
- `hexToPixel()`: Y offset depends on `col & 1`, not `row & 1`
  - `boardY = row * HEX_HEIGHT + (col & 1) * (HEX_HEIGHT / 2)`
- `pixelToHex()`: Same change in reverse
- Board iteration: May need to change iteration order or bounds

**Key lines:**
- 73, 108: Row parity offset → column parity offset
- 166-190: Board rendering loop

---

### 4. `proto01/src/main.ts` — MEDIUM

**Current implementation:**
- Click handler uses `pixelToHex()` (line 36)
- Selection comparison uses `dcol` and `row` (line 42)

**What changes:**
- If we change to `drow` storage, comparisons need updating
- Otherwise, just relies on hex.ts and render.ts being correct

**Key lines:** 35-46

---

### 5. `proto01/src/pieces/types.ts` — HIGH (but not yet implemented)

**Current implementation:**
- Design notes about knight/lance colors tied to direction pairs
- Not yet coded, just documented

**What changes:**
- Direction semantics change — "NE" in odd-r vs odd-q means different things
- Color assignments may need rethinking

**Key lines:** 7-12

---

## Refactor Sequence

### Phase 1: Core Coordinate System

**Order matters:** Fix hex.ts first, then tests, then rendering.

1. **hex.ts** — Change internal representation
   - Decide: doubled-height (`drow`) or keep doubled-width with new formula?
   - Update creation function
   - Update DIRECTION_OFFSETS for odd-q
   - Update `neighbor()` and `neighbors()`
   - Update `distance()` formula

2. **hex.test.ts** — Update all tests
   - Don't try to make old tests pass with new code
   - Rewrite tests for odd-q expected behavior
   - Verify with manual calculation

### Phase 2: Rendering

3. **render.ts** — Fix coordinate transforms
   - `hexToPixel()`: Change parity offset to column-based
   - `pixelToHex()`: Same change in reverse
   - Board dimensions may need adjustment

4. **main.ts** — Should work if hex.ts and render.ts are correct
   - Verify click handling still works

### Phase 3: Verification

5. **Visual verification**
   - Board should display with columns contiguous
   - Clicking should select correct hexes
   - Neighbors should be correct

6. **pieces/types.ts** — Review direction semantics
   - Ensure color assignments still make sense

---

## Open Questions

1. **Doubled-width or doubled-height?**
   - Current: doubled-width `dcol = col * 2 + (row & 1)`
   - Option A: Switch to doubled-height `drow = row * 2 + (col & 1)`
   - Option B: Keep doubled-width but different formula?
   - Need to think through which is cleaner for odd-q

2. **Direction naming:**
   - Do NE/NW/SE/SW still make sense after transpose?
   - Or should we rename to match new geometry?

3. **Test strategy:**
   - Rewrite all tests from scratch?
   - Or update expected values one by one?

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Off-by-one errors | High | High | Manual verification with diagrams |
| Direction confusion | Medium | High | Draw before/after diagrams |
| Render misalignment | Medium | Medium | Visual testing |
| Distance formula wrong | Medium | High | Unit tests with hand-calculated values |

---

Created-by: agent #16.0.0 claude-opus-4-5 via claude-code 2026-02-04T22:55:00Z
