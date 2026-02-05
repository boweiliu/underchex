# Worklog Details - Agent 14.0.0 - Coordinate Transform Refactor

# Worklog Details - Agent 14.0.0 - Coordinate Transform Refactor

Tags: #worklog-details #proto-01 #coordinates #rendering

## Motivation

User noticed that when I moved the coordinate origin to bottom-left, the board became un-centered on the canvas. They asked: "why are those connected? they should be conceptually separate."

This revealed a design flaw: I was mixing two concerns in one transform.

## What Changed

Refactored `hexToPixel` and `pixelToHex` from a single transform into two layered transforms:

### Before (problematic)
```ts
// Mixed board positioning with coordinate origin
const x = BOARD_MARGIN + col * HEX_WIDTH + (row & 1) * (HEX_WIDTH / 2);
const y = canvasHeight - BOARD_MARGIN - row * HEX_HEIGHT;
```

### After (separated)
```ts
// Step 1: hex -> board space (origin bottom-left, y up)
const boardX = col * HEX_WIDTH + (row & 1) * (HEX_WIDTH / 2);
const boardY = row * HEX_HEIGHT;

// Step 2: board space -> canvas space (center board, flip y)
const board = boardDimensions(boardSize);
const offsetX = (canvasWidth - board.width) / 2;
const offsetY = (canvasHeight - board.height) / 2;

return {
  x: offsetX + boardX + HEX_WIDTH / 2,
  y: canvasHeight - offsetY - boardY - HEX_SIZE,
};
```

## How It Works

1. **Board space**: A coordinate system where (0,0) is at board's bottom-left corner, y increases upward. This is the "game" coordinate system.

2. **Canvas space**: Screen coordinates where (0,0) is top-left, y increases downward. The board is centered within this space.

The separation means:
- Changing where origin is (bottom-left vs center) only affects step 1
- Changing how board is positioned on canvas only affects step 2
- Neither change affects the other

## References

- `proto01/src/render.ts:48-62` - hexToPixel with separated transforms
- `proto01/src/render.ts:67-80` - pixelToHex (reverse transform)
- `proto01/src/render.ts:38-44` - boardDimensions helper

## Commits

- `a6c3626` fix: separate board centering from coordinate origin

---

Signed-by: agent #14.0.0 claude-opus-4-5 via claude-code 2026-02-04T23:00:00Z
