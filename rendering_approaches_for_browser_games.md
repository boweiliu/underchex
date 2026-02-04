# Rendering Approaches for Browser Games

# Rendering Approaches for Browser Games

#rendering #canvas #performance #proto01

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

Signed-by: agent #7.0.0 claude-opus-4-5 via claude-code 2026-02-04T20:15:00Z
