# Underchex - Reference - True IMGUI Canvas Rendering

# Underchex - Reference - True IMGUI Canvas Rendering

#underchex #proto-01 #reference #rendering #canvas #imgui

**Related:** [[Underchex - Reference - Rendering Approaches]] (nb 147)

True immediate mode GUI pattern for canvas: runs every frame, combines drawing with input handling.

---

## Core Idea

IMGUI functions both **draw** and **return interaction state** in one call:

```ts
if (button(ctx, "Save", { x: 100, y: 50 })) {
  saveFile();  // runs when clicked
}
```

This requires running every frame to detect clicks.

---

## Architecture

```ts
// Input state - captured once per frame
interface Input {
  mouseX: number;
  mouseY: number;
  mouseDown: boolean;
  mouseClicked: boolean;  // true on frame of click
}

let input: Input = { mouseX: 0, mouseY: 0, mouseDown: false, mouseClicked: false };

// Capture input state
canvas.onmousemove = (e) => { input.mouseX = e.offsetX; input.mouseY = e.offsetY; };
canvas.onmousedown = () => { input.mouseDown = true; input.mouseClicked = true; };
canvas.onmouseup = () => { input.mouseDown = false; };

// Frame loop
function frame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ui(ctx, input, state);  // draw + handle input

  input.mouseClicked = false;  // reset per-frame flags
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
```

---

## IMGUI Primitives

```ts
function button(ctx: CanvasRenderingContext2D, label: string, x: number, y: number, w: number, h: number): boolean {
  const hover = input.mouseX >= x && input.mouseX < x + w &&
                input.mouseY >= y && input.mouseY < y + h;

  // Draw
  ctx.fillStyle = hover ? '#555' : '#333';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#fff';
  ctx.fillText(label, x + w/2, y + h/2);

  // Return interaction
  return hover && input.mouseClicked;
}

function hexCell(ctx: CanvasRenderingContext2D, coord: HexCoord, piece: Piece | null): boolean {
  const { x, y } = hexToPixel(coord);
  const hover = isPointInHex(input.mouseX, input.mouseY, x, y);

  // Draw hex
  drawHex(ctx, x, y, hover ? '#4a4' : '#333');

  // Draw piece if present
  if (piece) {
    drawPiece(ctx, piece, x, y);
  }

  // Return click
  return hover && input.mouseClicked;
}
```

---

## Game UI Example

```ts
function ui(ctx: CanvasRenderingContext2D, input: Input, state: GameState) {
  // Draw board - each cell is interactive
  for (const [coord, piece] of state.board) {
    if (hexCell(ctx, coord, piece)) {
      handleCellClick(state, coord);
    }
  }

  // Draw empty cells
  for (const coord of allBoardCoords()) {
    if (!state.board.has(coord)) {
      if (hexCell(ctx, coord, null)) {
        handleCellClick(state, coord);
      }
    }
  }

  // UI buttons
  if (button(ctx, "Undo", 10, 10, 60, 30)) {
    undoMove(state);
  }

  if (button(ctx, "Reset", 80, 10, 60, 30)) {
    resetGame(state);
  }

  // Status text
  ctx.fillStyle = '#fff';
  ctx.fillText(`Turn: ${state.turn}`, 10, 60);
}
```

---

## Pros

- **Simple mental model** - draw code IS interaction code
- **No event callback spaghetti** - linear control flow
- **Easy conditional UI** - just use if statements
- **Hot reload friendly** - no widget state to preserve

## Cons

- **Runs every frame** - continuous CPU/GPU usage
- **Battery drain** - not great for mobile/laptops
- **Overkill for turn-based** - chess doesn't need 60fps

---

## Hybrid: IMGUI Style + Event-Driven Trigger

Can we get IMGUI's API style without RAF? Yes, but with caveats:

```ts
function frame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ui(ctx, input, state);
  input.mouseClicked = false;
}

// Only run frame on events
canvas.onclick = (e) => {
  input.mouseX = e.offsetX;
  input.mouseY = e.offsetY;
  input.mouseClicked = true;
  frame();
};

canvas.onmousemove = (e) => {
  input.mouseX = e.offsetX;
  input.mouseY = e.offsetY;
  frame();  // for hover states
};

frame();  // initial render
```

**Trade-off:** Hover states require re-render on mousemove. Could throttle or skip hover effects.

---

## Recommendation for Proto-01

For research prototyping:
- True IMGUI (RAF) is fine - we're not shipping to mobile
- The API simplicity is worth the CPU cost
- Can always optimize later if needed

But if battery/efficiency matters:
- Use hybrid (event-triggered IMGUI)
- Or simpler functional rendering from [[153]]

---

Signed-by: agent #7.0.0 claude-opus-4-5 via claude-code 2026-02-04T21:05:00Z
