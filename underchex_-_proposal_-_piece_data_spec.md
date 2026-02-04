# Underchex - Proposal - Piece Data Spec

# Underchex - Proposal - Piece Data Spec

#underchex #proposal #spec #pieces #proto-01

**Task**: PROTO-01.4 Piece types
**Goal**: Define piece types in language-agnostic JSON for cross-implementation use.

---

## Recommendation: Minimal Flat Schema

```json
{
  "$schema": "pieces.schema.json",
  "version": "0.1",
  "pieces": [
    { "id": "king",    "symbol": "K", "name": "King" },
    { "id": "queen",   "symbol": "Q", "name": "Queen" },
    { "id": "pawn",    "symbol": "P", "name": "Pawn" },
    { "id": "knight",  "symbol": "N", "name": "Knight",  "variants": ["A", "B", "C"] },
    { "id": "lance",   "symbol": "L", "name": "Lance",   "variants": ["A", "B"] },
    { "id": "chariot", "symbol": "C", "name": "Chariot" }
  ]
}
```

**Why this approach:**
- Array preserves ordering (useful for UI, serialization)
- String IDs are readable in JSON game states: `{"piece": "knight", "variant": "A"}`
- `variants` only present when needed (null/absent = no variants)
- Minimal fields - movement rules go in separate file later (PROTO-03)
- Version field for future schema evolution

**A piece on the board would reference this as:**
```json
{ "piece": "knight", "variant": "A", "owner": "white" }
```

---

## Alternative A: Numeric IDs

```json
{
  "pieces": [
    { "id": 0, "key": "king",   "symbol": "K", "name": "King" },
    { "id": 1, "key": "queen",  "symbol": "Q", "name": "Queen" },
    { "id": 2, "key": "pawn",   "symbol": "P", "name": "Pawn" },
    { "id": 3, "key": "knight", "symbol": "N", "name": "Knight", "variants": ["A", "B", "C"] },
    { "id": 4, "key": "lance",  "symbol": "L", "name": "Lance",  "variants": ["A", "B"] },
    { "id": 5, "key": "chariot","symbol": "C", "name": "Chariot" }
  ]
}
```

**Pros:** Compact board state (just numbers), fast comparisons
**Cons:** Less readable, need lookup table everywhere

---

## Alternative B: Object Map (not array)

```json
{
  "pieces": {
    "king":    { "symbol": "K", "name": "King" },
    "queen":   { "symbol": "Q", "name": "Queen" },
    "knight":  { "symbol": "N", "name": "Knight", "variants": ["A", "B", "C"] }
  }
}
```

**Pros:** Direct key lookup
**Cons:** No guaranteed order (matters for UI lists, canonical serialization)

---

## Alternative C: Rich Variant Descriptions

```json
{
  "pieces": [
    {
      "id": "knight",
      "symbol": "N",
      "name": "Knight",
      "variants": {
        "A": { "name": "Knight-Alpha", "description": "Moves on N-NW / S-SE diagonal axis" },
        "B": { "name": "Knight-Beta",  "description": "Moves on N-NE / S-SW diagonal axis" },
        "C": { "name": "Knight-Gamma", "description": "Moves on NW-SW / NE-SE axis" }
      }
    }
  ]
}
```

**Pros:** Self-documenting, UI can show descriptions
**Cons:** More complex, movement info arguably belongs in movement spec

---

## Open Questions

1. **Variants as letters or numbers?** `["A", "B", "C"]` vs `[0, 1, 2]`
   - Letters more readable, numbers more compact

2. **Owner in piece spec or separate?**
   - Recommend separate: piece spec defines types, board state defines ownership

3. **Include movement here or separate file?**
   - Recommend separate `movement.json` for PROTO-03
   - Keeps piece identity separate from behavior

4. **File location:** `spec/pieces.json` at repo root?

---

Drafted-by: agent #17.0.0 claude-opus-4-5 via claude-code 2026-02-04T21:45:00Z
