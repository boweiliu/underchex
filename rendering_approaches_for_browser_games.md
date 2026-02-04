# Underchex - Reference - Rendering Approaches

# Rendering Approaches for Browser Games

#underchex #proto-01 #reference #rendering #canvas #performance

Exploration of rendering strategies for Underchex prototypes.

## Options

### 1. requestAnimationFrame (RAF) Loop

```ts
const loop = () => {
  update();
  render();
  requestAnimationFrame(loop);
};
```

**Pros:**
- Smooth 60fps animations
- Syncs with display refresh
- Standard for real-time games

**Cons:**
- Continuous CPU/GPU usage even when idle
- Overkill for turn-based games
- Battery drain on mobile

**Best for:** Real-time games, continuous animations

---

### 2. Event-Driven Rendering

```ts
function render() {
  // Only called when needed
  ctx.clearRect(0, 0, w, h);
  drawBoard();
  drawPieces();
}

canvas.addEventListener('click', (e) => {
  handleClick(e);
  render(); // Re-render after state change
});
```

**Pros:**
- Zero CPU when idle
- Perfect for turn-based games
- Battery friendly
- Simpler mental model

**Cons:**
- No smooth animations without extra work
- Must manually trigger renders

**Best for:** Chess, board games, turn-based strategy

---

### 3. Hybrid: Event-Driven + RAF for Animations

```ts
let animating = false;

function render() {
  drawBoard();
  drawPieces();
}

function animateMove(from, to, onComplete) {
  animating = true;
  const start = performance.now();
  const duration = 200;

  const frame = (now) => {
    const t = Math.min((now - start) / duration, 1);
    drawBoard();
    drawPieceAtLerp(from, to, t);

    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      animating = false;
      onComplete();
      render();
    }
  };
  requestAnimationFrame(frame);
}
```

**Pros:**
- Idle when nothing happening
- Smooth animations when needed
- Best of both worlds

**Cons:**
- More complex state management

**Best for:** Board games with animated moves

---

### 4. CSS/DOM-Based Rendering

```ts
// Use DOM elements instead of canvas
const piece = document.createElement('div');
piece.className = 'piece knight white';
piece.style.transform = `translate(${x}px, ${y}px)`;
board.appendChild(piece);

// Animate with CSS
piece.style.transition = 'transform 0.2s ease';
piece.style.transform = `translate(${newX}px, ${newY}px)`;
```

**Pros:**
- Browser handles animations (compositor thread)
- No JS during animations
- Easier accessibility
- Native event handling per element

**Cons:**
- DOM manipulation overhead for many elements
- Less control over rendering details
- Harder for complex visual effects

**Best for:** Simple board games, prototypes

---

### 5. OffscreenCanvas + Worker

```ts
// main.ts
const offscreen = canvas.transferControlToOffscreen();
const worker = new Worker('render-worker.ts');
worker.postMessage({ canvas: offscreen }, [offscreen]);

// render-worker.ts
self.onmessage = (e) => {
  const ctx = e.data.canvas.getContext('2d');
  // Render in background thread
};
```

**Pros:**
- Main thread stays responsive
- Good for heavy rendering

**Cons:**
- Complex message passing
- Overkill for simple games

**Best for:** Performance-critical applications

---

## Recommendation for Underchex

**Use Event-Driven + Animation Hybrid (#3)**

Rationale:
- Chess is turn-based: no need to render 60fps continuously
- Piece movement animations improve UX
- Minimal battery/CPU usage
- Clean separation: static renders vs animated transitions

## Implementation Sketch

```ts
class Renderer {
  private dirty = true;
  private animationId: number | null = null;

  markDirty() {
    if (this.dirty) return;
    this.dirty = true;
    this.scheduleRender();
  }

  private scheduleRender() {
    if (this.animationId) return;
    this.animationId = requestAnimationFrame(() => {
      this.animationId = null;
      if (this.dirty) {
        this.dirty = false;
        this.render();
      }
    });
  }

  render() {
    // Actual drawing
  }

  animateMove(piece: Piece, from: Pos, to: Pos): Promise<void> {
    return new Promise((resolve) => {
      // RAF loop just for this animation
      // resolve() when done
    });
  }
}
```

---

## Deep Dive: Immediate Mode Canvas (Option 2b)

User wants something like (2) but "more immediate GUI style". Exploring what that means.

### What is Immediate Mode?

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

### Immediate Mode for Canvas

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

### Key Properties

1. **No Renderer class** - just a function
2. **No dirty tracking** - always full redraw
3. **No internal state** - all state passed in
4. **Predictable** - same state = same output

### Why This Fits Prototyping

- **Minimal ceremony** - no framework setup
- **Easy to debug** - state is inspectable, render is deterministic
- **Easy to change** - no widget lifecycle to manage
- **Fast iteration** - change render function, see results

### Comparison

| Aspect | Event-Driven (2) | Immediate Mode (2b) |
|--------|------------------|---------------------|
| State location | In Renderer class | External, passed in |
| Render trigger | `this.render()` | `render(ctx, state)` |
| Dirty tracking | Optional | None (always full) |
| Mental model | Object with methods | Pure function |

### When Full Redraw is Fine

For a hex board game:
- ~100 hexes max
- ~32 pieces max
- Canvas 2D can easily draw this in <1ms
- No need to optimize with dirty rects

### Minimal Implementation

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

Signed-by: agent #7.0.0 claude-opus-4-5 via claude-code 2026-02-04T20:15:00Z
Edited-by: agent #9.0.0 claude-opus-4-5 via claude-code 2026-02-04T20:25:00Z
Edited-by: agent #7.0.0 claude-opus-4-5 via claude-code 2026-02-04T20:50:00Z
