# PROTO-01: Hex Orientation Refactor Plan

#underchex #proto-01 #refactor #coordinates #planning

**Change:** flat-top odd-r (rows contiguous) → flat-top odd-q (columns contiguous)

---

## TODO

- [ ] `hex.ts:21` — Change creation formula: `row & 1` → `col & 1`
- [ ] `hex.ts:45-61` — Rewrite DIRECTION_OFFSETS for odd-q
- [ ] `hex.ts:26` — Update `offsetCol()` or add `offsetRow()`
- [ ] `hex.ts:66-75` — Verify `neighbor()` / `neighbors()` work
- [ ] `hex.ts:107-114` — Review distance formula
- [ ] `hex.test.ts` — Rewrite all tests for odd-q
- [ ] `render.ts:73` — `hexToPixel` parity: `(row & 1)` → `(col & 1)`
- [ ] `render.ts:108` — `pixelToHex` parity: `(row & 1)` → `(col & 1)`
- [ ] `render.ts:166-190` — Review board iteration loop
- [ ] `main.ts:42` — Verify selection comparison
- [ ] Visual test — Columns should be contiguous vertically
- [ ] `pieces/types.ts:7-12` — Review direction semantics

---

## Open Questions

- Doubled-width (`dcol`) or doubled-height (`drow`) for odd-q?
- Do direction names (NE/NW/SE/SW) still make sense?

---

## Related Docs

- [[170]] Hex Orientation decision
- [[166]] Board data structure
- [[146]] Original coordinate systems
- [[145]] PROTO-01 Breakdown

---

Created-by: agent #16.0.0 claude-opus-4-5 via claude-code 2026-02-04T22:55:00Z
Edited-by: agent #16.0.0 claude-opus-4-5 via claude-code 2026-02-04T23:02:00Z (simplified)
