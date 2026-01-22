/**
 * Tests for board utilities
 * 
 * Signed-by: agent #1 claude-sonnet-4 via opencode 20260122T02:18:57
 */

import { describe, it, expect } from 'vitest';
import {
  isValidCell,
  getAllCells,
  getNeighbor,
  hexDistance,
  getDirection,
  getRay,
  getKnightTargets,
} from '../src/board';
import { BOARD_RADIUS, TOTAL_CELLS, HexCoord } from '../src/types';

describe('isValidCell', () => {
  it('returns true for center cell', () => {
    expect(isValidCell({ q: 0, r: 0 })).toBe(true);
  });

  it('returns true for corner cells at max radius', () => {
    expect(isValidCell({ q: 4, r: 0 })).toBe(true);
    expect(isValidCell({ q: 0, r: 4 })).toBe(true);
    expect(isValidCell({ q: -4, r: 0 })).toBe(true);
    expect(isValidCell({ q: 0, r: -4 })).toBe(true);
    expect(isValidCell({ q: 4, r: -4 })).toBe(true);
    expect(isValidCell({ q: -4, r: 4 })).toBe(true);
  });

  it('returns false for cells outside the board', () => {
    expect(isValidCell({ q: 5, r: 0 })).toBe(false);
    expect(isValidCell({ q: 0, r: 5 })).toBe(false);
    expect(isValidCell({ q: -5, r: 0 })).toBe(false);
  });

  it('returns false for cells violating q+r constraint', () => {
    // q + r + s = 0, so s = -q - r
    // max(|q|, |r|, |s|) must be <= 4
    expect(isValidCell({ q: 3, r: 3 })).toBe(false); // s = -6
    expect(isValidCell({ q: -3, r: -3 })).toBe(false); // s = 6
  });
});

describe('getAllCells', () => {
  it('returns correct number of cells', () => {
    const cells = getAllCells();
    expect(cells.length).toBe(TOTAL_CELLS);
  });

  it('all returned cells are valid', () => {
    const cells = getAllCells();
    for (const cell of cells) {
      expect(isValidCell(cell)).toBe(true);
    }
  });
});

describe('getNeighbor', () => {
  it('returns correct neighbor for each direction from center', () => {
    const center: HexCoord = { q: 0, r: 0 };
    
    expect(getNeighbor(center, 'N')).toEqual({ q: 0, r: -1 });
    expect(getNeighbor(center, 'S')).toEqual({ q: 0, r: 1 });
    expect(getNeighbor(center, 'NE')).toEqual({ q: 1, r: -1 });
    expect(getNeighbor(center, 'SW')).toEqual({ q: -1, r: 1 });
    expect(getNeighbor(center, 'NW')).toEqual({ q: -1, r: 0 });
    expect(getNeighbor(center, 'SE')).toEqual({ q: 1, r: 0 });
  });

  it('returns null for neighbors off the board', () => {
    // From corner, some directions go off board
    expect(getNeighbor({ q: 4, r: 0 }, 'SE')).toBe(null);
    expect(getNeighbor({ q: 4, r: 0 }, 'NE')).toBe(null);
  });
});

describe('hexDistance', () => {
  it('returns 0 for same cell', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 0 })).toBe(0);
    expect(hexDistance({ q: 2, r: -1 }, { q: 2, r: -1 })).toBe(0);
  });

  it('returns 1 for adjacent cells', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 1, r: 0 })).toBe(1);
    expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 1 })).toBe(1);
    expect(hexDistance({ q: 0, r: 0 }, { q: 1, r: -1 })).toBe(1);
  });

  it('calculates correct distance for longer moves', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 3, r: 0 })).toBe(3);
    expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: -4 })).toBe(4);
    expect(hexDistance({ q: -2, r: 1 }, { q: 2, r: -1 })).toBe(4);
  });
});

describe('getDirection', () => {
  it('returns correct direction for aligned cells', () => {
    expect(getDirection({ q: 0, r: 0 }, { q: 0, r: -2 })).toBe('N');
    expect(getDirection({ q: 0, r: 0 }, { q: 0, r: 3 })).toBe('S');
    expect(getDirection({ q: 0, r: 0 }, { q: 2, r: -2 })).toBe('NE');
    expect(getDirection({ q: 0, r: 0 }, { q: -2, r: 2 })).toBe('SW');
    expect(getDirection({ q: 0, r: 0 }, { q: -3, r: 0 })).toBe('NW');
    expect(getDirection({ q: 0, r: 0 }, { q: 3, r: 0 })).toBe('SE');
  });

  it('returns null for non-aligned cells', () => {
    expect(getDirection({ q: 0, r: 0 }, { q: 1, r: 1 })).toBe(null);
    expect(getDirection({ q: 0, r: 0 }, { q: 2, r: -1 })).toBe(null);
  });

  it('returns null for same cell', () => {
    expect(getDirection({ q: 0, r: 0 }, { q: 0, r: 0 })).toBe(null);
  });
});

describe('getRay', () => {
  it('returns cells in a direction until board edge', () => {
    const ray = getRay({ q: 0, r: 0 }, 'N');
    expect(ray.length).toBe(4);
    expect(ray[0]).toEqual({ q: 0, r: -1 });
    expect(ray[3]).toEqual({ q: 0, r: -4 });
  });

  it('returns empty array from edge in direction off board', () => {
    const ray = getRay({ q: 4, r: 0 }, 'SE');
    expect(ray.length).toBe(0);
  });
});

describe('getKnightTargets', () => {
  it('returns all 6 targets from center', () => {
    const targets = getKnightTargets({ q: 0, r: 0 });
    expect(targets.length).toBe(6);
  });

  it('returns correct knight jump positions', () => {
    const targets = getKnightTargets({ q: 0, r: 0 });
    
    // Check that expected positions are included
    const targetStrings = targets.map(t => `${t.q},${t.r}`);
    expect(targetStrings).toContain('1,-2');
    expect(targetStrings).toContain('-1,-1');
    expect(targetStrings).toContain('2,-1');
    expect(targetStrings).toContain('1,1');
    expect(targetStrings).toContain('-1,2');
    expect(targetStrings).toContain('-2,1');
  });

  it('filters out invalid targets near edge', () => {
    const targets = getKnightTargets({ q: 4, r: -4 });
    // From corner, most knight targets are off board
    for (const target of targets) {
      expect(isValidCell(target)).toBe(true);
    }
  });
});
