/**
 * Functional stateless rendering for Underchex.
 * Pattern: nb 153 (Functional Stateless Rendering)
 *
 * Pure function that renders game state to canvas.
 * No internal state - all state passed in.
 */

import { Hex, hex, offsetCol, hexKey } from './hex';

// ============================================================================
// Layout constants
// ============================================================================

/** Hex cell radius (center to vertex) */
export const HEX_SIZE = 32;

/** Horizontal spacing between hex centers */
const HEX_WIDTH = HEX_SIZE * Math.sqrt(3);

/** Vertical spacing between hex centers */
const HEX_HEIGHT = HEX_SIZE * 1.5;

// ============================================================================
// Game state types
// ============================================================================

export interface GameState {
  boardSize: number;        // Board radius (7 = 7x7 hex grid)
  selected: Hex | null;     // Currently selected hex
  // Future: board: Map<string, Piece>
}

export function createInitialState(): GameState {
  return {
    boardSize: 7,
    selected: null,
  };
}

// ============================================================================
// Coordinate conversion
// ============================================================================

/** Board margin from canvas edge */
const BOARD_MARGIN = 60;

/**
 * Convert hex coordinate to pixel position (center of hex).
 * Origin (0,0) is at bottom-left.
 */
export function hexToPixel(h: Hex, canvasWidth: number, canvasHeight: number): { x: number; y: number } {
  const col = offsetCol(h);
  const row = h.row;

  // Offset coords: odd rows shift right by half
  const x = BOARD_MARGIN + col * HEX_WIDTH + (row & 1) * (HEX_WIDTH / 2);
  // Flip y-axis: row 0 at bottom
  const y = canvasHeight - BOARD_MARGIN - row * HEX_HEIGHT;

  return { x, y };
}

/**
 * Convert pixel position to hex coordinate.
 * Returns nearest hex.
 */
export function pixelToHex(px: number, py: number, canvasWidth: number, canvasHeight: number): Hex {
  // Reverse the transform from hexToPixel
  const x = px - BOARD_MARGIN;
  // Flip y-axis back
  const y = canvasHeight - BOARD_MARGIN - py;

  // Approximate row first
  const row = Math.round(y / HEX_HEIGHT);

  // Then col, accounting for row offset
  const rowOffset = (row & 1) * (HEX_WIDTH / 2);
  const col = Math.round((x - rowOffset) / HEX_WIDTH);

  return hex(col, row);
}

// ============================================================================
// Drawing helpers
// ============================================================================

/**
 * Draw a single hexagon at the given center position.
 */
function drawHexagon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  fill: string,
  stroke: string
): void {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    // Flat-top orientation: start at 30 degrees
    const angle = (Math.PI / 6) + (Math.PI / 3) * i;
    const vx = cx + size * Math.cos(angle);
    const vy = cy + size * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(vx, vy);
    } else {
      ctx.lineTo(vx, vy);
    }
  }
  ctx.closePath();

  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
}

// ============================================================================
// Main render function
// ============================================================================

/**
 * Render the entire game state to the canvas.
 * Pure function - same state always produces same output.
 */
export function render(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { width, height } = ctx.canvas;

  // Clear canvas
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, width, height);

  // Draw hex grid
  const boardRadius = Math.floor(state.boardSize / 2);
  for (let row = 0; row < state.boardSize; row++) {
    for (let col = 0; col < state.boardSize; col++) {
      const h = hex(col, row);
      const { x, y } = hexToPixel(h, width, height);

      // Alternate colors for visual clarity
      const isLight = (col + row) % 2 === 0;
      const fill = isLight ? '#2d3a4a' : '#1e2832';

      // Highlight selected
      const isSelected = state.selected && hexKey(h) === hexKey(state.selected);
      const finalFill = isSelected ? '#4a6fa5' : fill;

      drawHexagon(ctx, x, y, HEX_SIZE - 1, finalFill, '#3d5a80');

      // Draw coordinate label (debug) - show dcol,row (doubled-width coords)
      ctx.fillStyle = '#667';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${h.dcol},${row}`, x, y);
    }
  }

  // Title
  ctx.fillStyle = '#eee';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Proto01 - Underchex (Click a hex)', width / 2, 30);
}
