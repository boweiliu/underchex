# Underchex - Reference - Testing Philosophy

# Underchex - Reference - Testing Philosophy

#underchex #testing #reference #philosophy

**Scope**: Unit testing principles for this project

---

## Core Principles (in priority order)

### 1. Test behavior, not implementation

Tests verify *what* the code does, not *how* it does it. If we refactor internals, tests should still pass.

- Test the public API, not private helpers
- Don't assert on intermediate state
- A passing test means the behavior is correct, regardless of implementation

### 2. Readable and progressive

Tests are for humans first. A reader should understand the API by reading tests top-to-bottom.

- Start each test group with the simplest, most obvious example
- Build complexity incrementally — each test slightly harder than the last
- Use concrete, meaningful values that tell a story (not arbitrary numbers)
- Example progression for distance:
  ```
  same hex → 0
  one step east → 1
  two steps east → 2
  one step diagonal → 1
  mixed movement → derive from geometry
  ```

### 3. Verify independently of the code

Mocks are usually unhelpful — they often result in testing nothing real. The test should exercise a *different logical path* than the implementation.

**Bad**: Recomputing the same formula the code uses
```ts
// Code: dcol = col * 2 + (row & 1)
// Test: expect(hex(3, 2).dcol).toBe(3 * 2 + (2 & 1))  // just re-doing the math
```

**Good**: Using a concrete example you worked out by hand
```ts
// I drew this on paper: col 3, row 2 (even row) → dcol should be 6
expect(hex(3, 2).dcol).toBe(6)
```

Like checking a math problem — re-doing the computation isn't as good as substituting concrete values and verifying the answer independently.

### 4. Hierarchical naming

Organize tests by component, then behavior. Makes it easy to find and understand test coverage.

```ts
describe('hex', () => {
  describe('creation', () => {
    it('converts offset to doubled-width', ...)
    it('handles even rows', ...)
    it('handles odd rows', ...)
  })

  describe('neighbors', () => {
    it('returns 6 neighbors', ...)
    it('returns neighbors in direction order', ...)
  })

  describe('distance', () => {
    it('returns 0 for same hex', ...)
    it('returns 1 for adjacent hex', ...)
  })
})
```

### 5. Happy paths first

For prototypes, focus on normal flows first. Edge cases can wait.

- Get the obvious cases working (great for TDD — they'll fail initially)
- Edge cases are for when the core behavior is solid
- Don't over-test hypothetical scenarios in a prototype

### 6. Property-based thinking (nice to have)

For coordinate systems, invariants are useful sanity checks:
- Roundtrip: `offsetCol(hex(col, row)) === col`
- Symmetry: `hexEquals(a, b) === hexEquals(b, a)`
- Distance: `hexDistance(a, b) === hexDistance(b, a)`

These catch bugs that example-based tests miss, but aren't the priority.

---

Created-by: agent #11.0.0 claude-opus-4-5 via claude-code 2026-02-04T20:55:00Z
