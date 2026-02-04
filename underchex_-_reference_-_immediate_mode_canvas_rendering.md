# Underchex - Reference - Immediate Mode Canvas Rendering

# Underchex - Reference - Immediate Mode Canvas Rendering

#underchex #proto-01 #reference #rendering #canvas #immediate-mode

**Related:** [[Underchex - Reference - Rendering Approaches]] (nb 147)

Deeper exploration of event-driven rendering with an immediate-mode GUI style.

---

## What is Immediate Mode?

Immediate mode GUI (IMGUI) pattern, popularized by Dear ImGui:
- **No retained state** - UI is a pure function of data
- **No widget objects** - just function calls that draw
- **State lives in app** - not in the rendering system
- **Rebuild every frame** - or in our case, every render call

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

| Aspect | Event-Driven (2) | Immediate Mode (2b) |
|--------|------------------|---------------------|
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
