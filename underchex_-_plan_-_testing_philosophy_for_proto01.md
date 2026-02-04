# Underchex - Plan - Testing Philosophy for proto01

#underchex #proto-01 #testing #plan

**Related tickets**: PROTO-01.2 (hex coordinate system)

---

## Testing Philosophy

### Core Principles

1. **Test behavior, not implementation** - Tests should verify what the code does, not how it does it. If we refactor hex.ts internals, tests should still pass.

2. **Property-based thinking** - For coordinate systems, focus on invariants:
   - Roundtrip: `offsetCol(hex(col, row)) === col` for all valid inputs
   - Symmetry: `hexEquals(a, b) === hexEquals(b, a)`
   - Distance: `hexDistance(a, a) === 0` and `hexDistance(a, b) === hexDistance(b, a)`

3. **Edge cases over happy paths** - The happy path usually works. Test:
   - Negative coordinates
   - Zero/origin
   - Parity boundaries (even vs odd rows)
   - Large values

4. **Fast and isolated** - Unit tests should run in milliseconds with no external deps.

5. **Document expected behavior** - Tests are executable documentation. Name them to describe what they prove.

6. **Readable and progressive** - Tests should be readable by humans first:
   - Start each test group with the simplest, most obvious example
   - Build complexity incrementally - each test should be slightly harder than the last
   - Use concrete, meaningful values (not random numbers) that tell a story
   - A reader should understand the API just by reading the tests top-to-bottom
   - Example progression for distance:
     ```
     same hex → 0
     one step east → 1
     two steps east → 2
     one step diagonal → 1
     mixed movement → derive from first principles
     ```

---

## Framework Choice: Vitest

**Rationale:**
- Zero config with Vite (already using Vite)
- Same API as Jest (familiar)
- Native TypeScript support
- Fast (uses esbuild)
- Watch mode for TDD

**Alternative considered:** Node test runner - requires more config for TS, less ergonomic.

---

## Test Structure

```
proto01/
├── src/
│   ├── hex.ts
│   └── hex.test.ts    # Co-located with source
├── vitest.config.ts   # Minimal config
└── package.json       # Add vitest + test script
```

**Co-location rationale:** Tests live next to source for easy navigation, clear ownership, simpler imports.

---

## Test Categories for hex.ts

### 1. Coordinate Creation & Conversion
- `hex(col, row)` creates correct doubled-width coords
- `hexFromDoubled(dcol, row)` passthrough works
- `offsetCol(h)` reverses `hex()` correctly
- Roundtrip property: `offsetCol(hex(c, r)) === c`

### 2. Neighbor Calculations
- `neighbors(h)` returns exactly 6 hexes
- `neighbors(h)` returns them in documented order (E, W, NE, NW, SE, SW)
- `neighbor(h, dir)` matches corresponding index in `neighbors(h)`
- Neighbors are adjacent (distance 1)
- No duplicate neighbors

### 3. Distance Calculations
- Same hex → distance 0
- Adjacent hexes → distance 1
- Pure E/W movement → distance = |Δcol|
- Pure N/S movement → distance = |Δrow|
- Diagonal movement → correct hex distance
- Symmetry: `hexDistance(a, b) === hexDistance(b, a)`

### 4. Equality & Keys
- `hexEquals` reflexive, symmetric
- Different hexes are not equal
- `hexKey` produces unique keys for different hexes
- `hexKey` produces same key for equal hexes

### 5. Edge Cases
- Origin: `hex(0, 0)`
- Negative coords: `hex(-3, -2)`
- Odd/even row parity
- Large values: `hex(1000, 1000)`

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `proto01/vitest.config.ts` | Create | Vitest configuration |
| `proto01/package.json` | Edit | Add vitest dep + test script |
| `proto01/src/hex.test.ts` | Create | Unit tests for hex.ts |

---

## Implementation Steps

1. Add vitest to devDependencies
2. Add `"test": "vitest"` script
3. Create minimal vitest.config.ts
4. Write hex.test.ts with all test categories
5. Run tests, verify they pass
6. Remove console.log test from game.ts (optional)

---

## Verification

```bash
cd proto01
npm install
npm test        # Should run vitest
npm test -- --coverage  # Optional: check coverage
```

Expected: All tests pass, coverage >90% on hex.ts.

---

## Decision: Example-Based Tests Only

Start with traditional example-based unit tests. Property-based testing (fast-check) can be added later if we find bugs that slipped through.

---

Created-by: agent #11.0.0 claude-opus-4-5 via claude-code 2026-02-04T20:45:00Z
Edited-by: agent #11.0.0 claude-opus-4-5 via claude-code 2026-02-04T20:50:00Z
