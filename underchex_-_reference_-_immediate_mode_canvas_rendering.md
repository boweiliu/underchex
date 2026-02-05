# Underchex - Reference - Functional Stateless Rendering

#underchex #proto-01 #reference #rendering #canvas #functional

**Related:**
- [Underchex - Reference - Rendering Approaches](/docs/underchex_reference_rendering_approaches)
- [Agent Diary: Session 7.0.0](/docs/agent_diary_session_7_0_0) - decision context

Event-driven rendering with pure functions and external state. Option 2b. **CHOSEN for proto-01.**

**Note:** This is NOT true IMGUI. True IMGUI runs every frame and combines drawing with input handling. See [Underchex - Reference - True IMGUI Canvas Rendering](/docs/underchex_reference_true_imgui_canvas_rendering) for that pattern.

---

## What This Pattern Is

Borrows ideas from IMGUI but stays event-driven:
- **No retained state** - render is a pure function of data
- **External state** - passed in, not stored in renderer
- **Event-driven** - render only on state change, not every frame
- **Separate concerns** - input handlers are separate from render

Contrast with **retained mode**:
- Create sprite/widget objects
- Mutate their properties
- Framework tracks what changed
- Framework decides what to redraw

---

## Immediate Mode for Canvas

```ts
// State is just data
interface GameState {
  board: Map<HexCoord, Piece>;
  selected: HexCoord | null;
  turn: 'white' | 'black';
}

// Render is a pure function
function render(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  drawBoard(ctx);

  for (const [coord, piece] of state.board) {
    const pos = hexToPixel(coord);
    drawPiece(ctx, piece, pos);
  }

  if (state.selected) {
    drawSelection(ctx, state.selected);
  }
}

// Events mutate state, then render
canvas.onclick = (e) => {
  const coord = pixelToHex(e.offsetX, e.offsetY);
  state = handleClick(state, coord);  // returns new state
  render(ctx, state);
};
```

---

## Key Properties

1. **No Renderer class** - just a function
2. **No dirty tracking** - always full redraw
3. **No internal state** - all state passed in
4. **Predictable** - same state = same output

---

## Why This Fits Prototyping

- **Minimal ceremony** - no framework setup
- **Easy to debug** - state is inspectable, render is deterministic
- **Easy to change** - no widget lifecycle to manage
- **Fast iteration** - change render function, see results

---

## Comparison with Event-Driven Class

| Aspect | Event-Driven Class (2) | Functional Stateless (2b) |
|--------|------------------------|---------------------------|
| State location | In Renderer class | External, passed in |
| Render trigger | `this.render()` | `render(ctx, state)` |
| Dirty tracking | Optional | None (always full) |
| Mental model | Object with methods | Pure function |

---

## When Full Redraw is Fine

For a hex board game:
- ~100 hexes max
- ~32 pieces max
- Canvas 2D can easily draw this in <1ms
- No need to optimize with dirty rects

---

## Minimal Implementation

```ts
// main.ts
const state: GameState = createInitialState();

function redraw() {
  render(ctx, state);
}

canvas.onclick = (e) => {
  const coord = pixelToHex(e.offsetX, e.offsetY);
  handleClick(state, coord);  // mutates state
  redraw();
};

window.onresize = () => {
  resizeCanvas();
  redraw();
};

redraw();  // initial render
```

That's the whole rendering system. ~15 lines.

---

Signed-by: agent #7.0.0 claude-opus-4-5 via claude-code 2026-02-04T20:55:00Z
Edited-by: agent #7.0.0 claude-opus-4-5 via claude-code 2026-02-04T21:10:00Z
