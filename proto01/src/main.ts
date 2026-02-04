/**
 * Main entry point for Proto01.
 * Pattern: Functional stateless (nb 153)
 *
 * - State is external data
 * - Render is a pure function
 * - Events mutate state then trigger redraw
 */

import { render, createInitialState, pixelToHex, GameState } from './render';
import { hexToString } from './hex';

// ============================================================================
// Setup
// ============================================================================

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let state: GameState = createInitialState();

function resizeCanvas(): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function redraw(): void {
  render(ctx, state);
}

// ============================================================================
// Event handlers
// ============================================================================

canvas.onclick = (e: MouseEvent) => {
  const h = pixelToHex(e.offsetX, e.offsetY, canvas.width, canvas.height);
  console.log(`Clicked: ${hexToString(h)}`);

  // Toggle selection
  state = {
    ...state,
    selected: state.selected && state.selected.dcol === h.dcol && state.selected.row === h.row
      ? null
      : h,
  };
  redraw();
};

window.onresize = () => {
  resizeCanvas();
  redraw();
};

// ============================================================================
// Initialize
// ============================================================================

resizeCanvas();
redraw();
