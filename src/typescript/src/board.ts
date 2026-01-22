/**
 * Underchex Board Operations
 * 
 * Signed-by: agent #1 claude-sonnet-4 via opencode 20260122T02:18:57
 */

import {
  HexCoord,
  Direction,
  DIRECTIONS,
  BOARD_RADIUS,
  coordToString,
  coordsEqual,
} from './types';

// ============================================================================
// Board Validation
// ============================================================================

/**
 * Check if a coordinate is within the hexagonal board.
 * A cell (q, r) is valid iff: max(|q|, |r|, |q+r|) <= BOARD_RADIUS
 */
export function isValidCell(coord: HexCoord): boolean {
  const { q, r } = coord;
  const s = -q - r;
  return Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) <= BOARD_RADIUS;
}

/**
 * Get all valid cells on the board.
 */
export function getAllCells(): HexCoord[] {
  const cells: HexCoord[] = [];
  for (let q = -BOARD_RADIUS; q <= BOARD_RADIUS; q++) {
    for (let r = -BOARD_RADIUS; r <= BOARD_RADIUS; r++) {
      const coord = { q, r };
      if (isValidCell(coord)) {
        cells.push(coord);
      }
    }
  }
  return cells;
}

// ============================================================================
// Coordinate Operations
// ============================================================================

/**
 * Add a direction vector to a coordinate.
 */
export function addDirection(coord: HexCoord, direction: Direction): HexCoord {
  const delta = DIRECTIONS[direction];
  return {
    q: coord.q + delta.q,
    r: coord.r + delta.r,
  };
}

/**
 * Get the neighbor in a given direction, or null if off-board.
 */
export function getNeighbor(coord: HexCoord, direction: Direction): HexCoord | null {
  const neighbor = addDirection(coord, direction);
  return isValidCell(neighbor) ? neighbor : null;
}

/**
 * Get all valid neighbors of a cell.
 */
export function getNeighbors(coord: HexCoord): HexCoord[] {
  const neighbors: HexCoord[] = [];
  for (const dir of Object.keys(DIRECTIONS) as Direction[]) {
    const neighbor = getNeighbor(coord, dir);
    if (neighbor) {
      neighbors.push(neighbor);
    }
  }
  return neighbors;
}

/**
 * Calculate hex distance between two coordinates.
 */
export function hexDistance(a: HexCoord, b: HexCoord): number {
  const dq = Math.abs(a.q - b.q);
  const dr = Math.abs(a.r - b.r);
  const ds = Math.abs((-a.q - a.r) - (-b.q - b.r));
  return Math.max(dq, dr, ds);
}

/**
 * Get the direction from one cell to another (if aligned), or null if not aligned.
 */
export function getDirection(from: HexCoord, to: HexCoord): Direction | null {
  const dq = to.q - from.q;
  const dr = to.r - from.r;
  
  if (dq === 0 && dr === 0) return null;
  
  // Check if the delta matches a direction (scaled)
  for (const [dir, delta] of Object.entries(DIRECTIONS) as [Direction, HexCoord][]) {
    // Check if (dq, dr) is a positive multiple of (delta.q, delta.r)
    if (delta.q === 0 && delta.r === 0) continue;
    
    if (delta.q === 0) {
      if (dq === 0 && Math.sign(dr) === Math.sign(delta.r)) {
        return dir;
      }
    } else if (delta.r === 0) {
      if (dr === 0 && Math.sign(dq) === Math.sign(delta.q)) {
        return dir;
      }
    } else {
      // Both non-zero, check ratio
      const ratioQ = dq / delta.q;
      const ratioR = dr / delta.r;
      if (ratioQ === ratioR && ratioQ > 0 && Number.isInteger(ratioQ)) {
        return dir;
      }
    }
  }
  
  return null;
}

/**
 * Get all cells along a direction from a starting point (exclusive of start).
 */
export function getRay(start: HexCoord, direction: Direction): HexCoord[] {
  const cells: HexCoord[] = [];
  let current = start;
  
  while (true) {
    const next = addDirection(current, direction);
    if (!isValidCell(next)) break;
    cells.push(next);
    current = next;
  }
  
  return cells;
}

/**
 * Get all cells between two aligned points (exclusive of both endpoints).
 */
export function getCellsBetween(from: HexCoord, to: HexCoord): HexCoord[] | null {
  const direction = getDirection(from, to);
  if (!direction) return null;
  
  const cells: HexCoord[] = [];
  let current = from;
  
  while (true) {
    current = addDirection(current, direction);
    if (coordsEqual(current, to)) break;
    if (!isValidCell(current)) return null; // Shouldn't happen if to is valid
    cells.push(current);
  }
  
  return cells;
}

// ============================================================================
// Knight Movement
// ============================================================================

/**
 * Knight leap targets from a given position.
 * Knight moves 1 step in one direction, then 1 step in an adjacent (non-opposite) direction.
 */
export const KNIGHT_OFFSETS: readonly HexCoord[] = [
  { q:  1, r: -2 }, // N then NE, or NE then N
  { q: -1, r: -1 }, // N then NW, or NW then N
  { q:  2, r: -1 }, // NE then SE, or SE then NE
  { q:  1, r:  1 }, // SE then S, or S then SE
  { q: -1, r:  2 }, // S then SW, or SW then S
  { q: -2, r:  1 }, // SW then NW, or NW then SW
] as const;

/**
 * Get all valid knight moves from a position.
 */
export function getKnightTargets(from: HexCoord): HexCoord[] {
  const targets: HexCoord[] = [];
  for (const offset of KNIGHT_OFFSETS) {
    const target = { q: from.q + offset.q, r: from.r + offset.r };
    if (isValidCell(target)) {
      targets.push(target);
    }
  }
  return targets;
}
