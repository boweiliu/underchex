/**
 * Hex coordinate system using doubled-width offset coordinates.
 *
 * Decision: nb 146, 148
 * - Stores (dcol, row) where dcol = col * 2 + (row % 2)
 * - Neighbor offsets are constant (no even/odd casework)
 * - Preserves N/S directional asymmetry for chess
 */

export interface Hex {
  readonly dcol: number;  // doubled column
  readonly row: number;
}

/**
 * Create a Hex from standard offset coordinates (col, row).
 * Internally converts to doubled-width storage.
 */
export function hex(col: number, row: number): Hex {
  return {
    dcol: col * 2 + (row & 1),
    row,
  };
}

/**
 * Create a Hex directly from doubled-width coordinates.
 * Use when you already have dcol (e.g., from neighbor calculation).
 */
export function hexFromDoubled(dcol: number, row: number): Hex {
  return { dcol, row };
}

/**
 * Get the display column (standard offset) from a Hex.
 */
export function offsetCol(h: Hex): number {
  return h.dcol >> 1;
}

/**
 * Direction offsets in doubled-width coordinates.
 * Order: E, W, NE, NW, SE, SW
 */
export const DIRECTION_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [+2,  0],  // E  (east)
  [-2,  0],  // W  (west)
  [+1, -1],  // NE (northeast)
  [-1, -1],  // NW (northwest)
  [+1, +1],  // SE (southeast)
  [-1, +1],  // SW (southwest)
];

export enum Direction {
  E = 0,
  W = 1,
  NE = 2,
  NW = 3,
  SE = 4,
  SW = 5,
}

/**
 * Get all 6 neighbors of a hex.
 */
export function neighbors(h: Hex): Hex[] {
  return DIRECTION_OFFSETS.map(([ddcol, drow]) =>
    hexFromDoubled(h.dcol + ddcol, h.row + drow)
  );
}

/**
 * Get neighbor in a specific direction.
 */
export function neighbor(h: Hex, dir: Direction): Hex {
  const [ddcol, drow] = DIRECTION_OFFSETS[dir];
  return hexFromDoubled(h.dcol + ddcol, h.row + drow);
}

/**
 * Check if two hexes are the same position.
 */
export function hexEquals(a: Hex, b: Hex): boolean {
  return a.dcol === b.dcol && a.row === b.row;
}

/**
 * Create a unique string key for a hex (useful for Map/Set).
 */
export function hexKey(h: Hex): string {
  return `${h.dcol},${h.row}`;
}

/**
 * Calculate distance between two hexes.
 * Uses conversion to cube coordinates internally.
 */
export function hexDistance(a: Hex, b: Hex): number {
  // Convert doubled-width to cube: x = dcol, z = row, y = -x - z
  // But we need to account for the doubling...
  // Actually for doubled coords: distance = (|Δdcol| + |Δrow| + |Δdcol - Δrow|) / 2
  // Simplified: max(|Δdcol|/2, |Δrow|, ceil(|Δdcol - Δrow| / 2))

  const ddcol = Math.abs(a.dcol - b.dcol);
  const drow = Math.abs(a.row - b.row);

  // In doubled coords, distance formula:
  // Each E/W step changes dcol by 2, row by 0
  // Each diagonal step changes dcol by 1, row by 1
  // So: distance = max(ddcol/2, drow) when ddcol >= drow*2
  //     distance = drow when drow >= ddcol (all diagonals)
  //     distance = (ddcol + drow) / 2 otherwise (mix)

  return Math.max(Math.ceil(ddcol / 2), drow);
}

/**
 * Format hex for display/debugging.
 */
export function hexToString(h: Hex): string {
  return `(${offsetCol(h)}, ${h.row})`;
}
