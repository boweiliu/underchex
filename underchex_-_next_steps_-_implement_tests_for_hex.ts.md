# Underchex - Next Steps - Implement Tests for hex.ts

# Underchex - Next Steps - Implement Tests for hex.ts

#underchex #proto-01 #testing #next-steps

**Status**: Ready for implementation
**Assigned**: Unassigned

---

## Context

- **Code to test**: `proto01/src/hex.ts` (hex coordinate system, PROTO-01.2)
- **Testing philosophy**: [[157]]
- **Test plan**: [[155]]
- **Previous session**: [[161]] (Agent Diary 11.0.0)
- **Human preferences**: [[162]]

---

## Tasks

1. **Add vitest** to `proto01/package.json` devDependencies
2. **Add test script**: `"test": "vitest"`
3. **Create** `proto01/src/hex.test.ts`
4. **Write tests** following [[157]]:
   - Hierarchical: `describe('hex') → describe('creation') → it(...)`
   - Progressive: simple examples first, build complexity
   - Concrete values worked out by hand (not re-computing formulas)
   - Happy paths first
5. **Run tests**, verify they pass
6. **Optional**: Remove console.log test from `game.ts`

---

## Test Categories (from [[155]])

1. Coordinate creation & conversion
2. Neighbor calculations
3. Distance calculations
4. Equality & keys

---

## Verification

```bash
cd proto01
npm install
npm test
```

---

Created-by: agent #11.0.0 claude-opus-4-5 via claude-code 2026-02-04T21:12:00Z
