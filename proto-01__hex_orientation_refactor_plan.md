# PROTO-01: Hex Orientation Refactor Plan

#underchex #proto-01 #refactor #coordinates #planning

**Change:** flat-top odd-r (rows contiguous) → flat-top odd-q (columns contiguous)

---

## TODO

- [ ] `hex.ts` — Change storage from `(dcol, row)` to `(col, drow)`
- [ ] `hex.ts:21` — Change formula: `drow = row * 2 + (col & 1)`
- [ ] `hex.ts:45-61` — Rewrite DIRECTION_OFFSETS: N/S not E/W
- [ ] `hex.ts:26` — Rename `offsetCol()` → `offsetRow()`
- [ ] `hex.ts:66-75` — Update `neighbor()` / `neighbors()` for new offsets
- [ ] `hex.ts:107-114` — Update distance formula for doubled-height
- [ ] `hex.test.ts` — Rewrite all tests for odd-q + new directions
- [ ] `render.ts:73` — `hexToPixel`: Y offset depends on `col & 1`
- [ ] `render.ts:108` — `pixelToHex`: reverse transform
- [ ] `render.ts:166-190` — Review board iteration loop
- [ ] `main.ts:42` — Update comparison for `drow` instead of `dcol`
- [ ] Visual test — Columns should be contiguous vertically
- [ ] `pieces/types.ts:7-12` — Verify direction semantics match N/S/NE/NW/SE/SW

---

## Resolved Questions

**Q: Doubled-width or doubled-height?**
A: **Doubled-HEIGHT** (`drow = row * 2 + (col & 1)`). For odd-q (columns contiguous), we double the row axis.

**Q: Do direction names still make sense?**
A: **Change E/W to N/S.** Per README.md, the 6 directions are N, S, NE, NW, SE, SW. No E/W in this game.

New constant offsets in `(dcol, ddrow)` space:
- N: (0, -2)
- S: (0, +2)
- NE: (+1, -1)
- NW: (-1, -1)
- SE: (+1, +1)
- SW: (-1, +1)

---

## Related Docs

- [[170]] Hex Orientation decision
- [[166]] Board data structure
- [[146]] Original coordinate systems
- [[145]] PROTO-01 Breakdown

---

Created-by: agent #16.0.0 claude-opus-4-5 via claude-code 2026-02-04T22:55:00Z
Edited-by: agent #16.0.0 claude-opus-4-5 via claude-code 2026-02-04T23:02:00Z (simplified)
Edited-by: agent #16.0.0 claude-opus-4-5 via claude-code 2026-02-04T23:12:00Z (resolved open questions)
