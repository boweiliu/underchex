/**
 * Unit tests for hex coordinate system.
 *
 * Following testing philosophy from nb 157:
 * - Test behavior, not implementation
 * - Readable and progressive (simple → complex)
 * - Verify independently (concrete values worked by hand, not recomputing formulas)
 * - Hierarchical naming
 */

import { describe, it, expect } from 'vitest';
import {
  hex,
  hexFromDoubled,
  offsetCol,
  neighbors,
  neighbor,
  hexEquals,
  hexKey,
  hexDistance,
  hexToString,
  Direction,
  DIRECTION_OFFSETS,
} from './hex';

describe('hex', () => {
  describe('creation', () => {
    it('creates hex at origin', () => {
      const h = hex(0, 0);
      expect(h.dcol).toBe(0);
      expect(h.row).toBe(0);
    });

    it('converts even row offset to doubled-width', () => {
      // Row 0 (even): col 3 → dcol = 3*2 + 0 = 6
      const h = hex(3, 0);
      expect(h.dcol).toBe(6);
      expect(h.row).toBe(0);
    });

    it('converts odd row offset to doubled-width', () => {
      // Row 1 (odd): col 3 → dcol = 3*2 + 1 = 7
      const h = hex(3, 1);
      expect(h.dcol).toBe(7);
      expect(h.row).toBe(1);
    });

    it('handles row 2 (even again)', () => {
      // Row 2 (even): col 2 → dcol = 2*2 + 0 = 4
      const h = hex(2, 2);
      expect(h.dcol).toBe(4);
      expect(h.row).toBe(2);
    });

    it('handles negative coordinates', () => {
      // Row -2 (even): col -3 → dcol = -3*2 + 0 = -6
      const h = hex(-3, -2);
      expect(h.dcol).toBe(-6);
      expect(h.row).toBe(-2);
    });

    it('handles odd negative row', () => {
      // Row -1 (odd): col 2 → dcol = 2*2 + 1 = 5
      const h = hex(2, -1);
      expect(h.dcol).toBe(5);
      expect(h.row).toBe(-1);
    });
  });

  describe('hexFromDoubled', () => {
    it('creates hex directly from doubled coords', () => {
      const h = hexFromDoubled(7, 3);
      expect(h.dcol).toBe(7);
      expect(h.row).toBe(3);
    });
  });

  describe('offsetCol', () => {
    it('returns 0 for origin', () => {
      expect(offsetCol(hex(0, 0))).toBe(0);
    });

    it('roundtrips col for even row', () => {
      // hex(3, 0) has dcol=6, offsetCol should return 3
      expect(offsetCol(hex(3, 0))).toBe(3);
    });

    it('roundtrips col for odd row', () => {
      // hex(3, 1) has dcol=7, offsetCol should return 3
      expect(offsetCol(hex(3, 1))).toBe(3);
    });

    it('roundtrips negative col', () => {
      expect(offsetCol(hex(-3, -2))).toBe(-3);
    });

    it('roundtrips for various positions', () => {
      // Property: offsetCol(hex(col, row)) === col
      const testCases: [number, number][] = [
        [0, 0],
        [5, 0],
        [5, 1],
        [-2, 3],
        [10, 10],
      ];
      for (const [col, row] of testCases) {
        expect(offsetCol(hex(col, row))).toBe(col);
      }
    });
  });

  describe('neighbors', () => {
    it('returns exactly 6 neighbors', () => {
      const h = hex(2, 2);
      expect(neighbors(h)).toHaveLength(6);
    });

    it('returns neighbors in direction order: E, W, NE, NW, SE, SW', () => {
      // Starting from hex(2, 2) which has dcol=4, row=2
      // E:  dcol+2, row+0 → (6, 2) → col 3
      // W:  dcol-2, row+0 → (2, 2) → col 1
      // NE: dcol+1, row-1 → (5, 1) → col 2
      // NW: dcol-1, row-1 → (3, 1) → col 1
      // SE: dcol+1, row+1 → (5, 3) → col 2
      // SW: dcol-1, row+1 → (3, 3) → col 1
      const h = hex(2, 2); // dcol=4, row=2
      const ns = neighbors(h);

      expect(ns[0]).toEqual({ dcol: 6, row: 2 }); // E
      expect(ns[1]).toEqual({ dcol: 2, row: 2 }); // W
      expect(ns[2]).toEqual({ dcol: 5, row: 1 }); // NE
      expect(ns[3]).toEqual({ dcol: 3, row: 1 }); // NW
      expect(ns[4]).toEqual({ dcol: 5, row: 3 }); // SE
      expect(ns[5]).toEqual({ dcol: 3, row: 3 }); // SW
    });

    it('neighbors at origin', () => {
      // From hex(0, 0) which has dcol=0, row=0
      const h = hex(0, 0);
      const ns = neighbors(h);

      expect(ns[0]).toEqual({ dcol: 2, row: 0 }); // E
      expect(ns[1]).toEqual({ dcol: -2, row: 0 }); // W
      expect(ns[2]).toEqual({ dcol: 1, row: -1 }); // NE
      expect(ns[3]).toEqual({ dcol: -1, row: -1 }); // NW
      expect(ns[4]).toEqual({ dcol: 1, row: 1 }); // SE
      expect(ns[5]).toEqual({ dcol: -1, row: 1 }); // SW
    });

    it('all neighbors are at distance 1', () => {
      const h = hex(3, 3);
      for (const n of neighbors(h)) {
        expect(hexDistance(h, n)).toBe(1);
      }
    });

    it('neighbors are unique', () => {
      const h = hex(2, 2);
      const ns = neighbors(h);
      const keys = ns.map(hexKey);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(6);
    });
  });

  describe('neighbor', () => {
    it('matches neighbors array', () => {
      const h = hex(2, 2);
      const allNeighbors = neighbors(h);

      expect(neighbor(h, Direction.E)).toEqual(allNeighbors[0]);
      expect(neighbor(h, Direction.W)).toEqual(allNeighbors[1]);
      expect(neighbor(h, Direction.NE)).toEqual(allNeighbors[2]);
      expect(neighbor(h, Direction.NW)).toEqual(allNeighbors[3]);
      expect(neighbor(h, Direction.SE)).toEqual(allNeighbors[4]);
      expect(neighbor(h, Direction.SW)).toEqual(allNeighbors[5]);
    });
  });

  describe('hexEquals', () => {
    it('same hex equals itself', () => {
      const h = hex(2, 3);
      expect(hexEquals(h, h)).toBe(true);
    });

    it('equivalent hexes are equal', () => {
      const a = hex(2, 3);
      const b = hex(2, 3);
      expect(hexEquals(a, b)).toBe(true);
    });

    it('different col is not equal', () => {
      expect(hexEquals(hex(2, 3), hex(3, 3))).toBe(false);
    });

    it('different row is not equal', () => {
      expect(hexEquals(hex(2, 3), hex(2, 4))).toBe(false);
    });

    it('is symmetric', () => {
      const a = hex(2, 3);
      const b = hex(4, 5);
      expect(hexEquals(a, b)).toBe(hexEquals(b, a));
    });
  });

  describe('hexKey', () => {
    it('produces string key', () => {
      const h = hex(2, 3); // dcol=5, row=3
      expect(hexKey(h)).toBe('5,3');
    });

    it('same position produces same key', () => {
      const a = hex(2, 3);
      const b = hex(2, 3);
      expect(hexKey(a)).toBe(hexKey(b));
    });

    it('different positions produce different keys', () => {
      const a = hex(2, 3);
      const b = hex(3, 2);
      expect(hexKey(a)).not.toBe(hexKey(b));
    });

    it('handles negative coords', () => {
      const h = hex(-2, -3); // dcol=-3, row=-3
      expect(hexKey(h)).toBe('-3,-3');
    });
  });

  describe('hexDistance', () => {
    it('same hex has distance 0', () => {
      const h = hex(2, 2);
      expect(hexDistance(h, h)).toBe(0);
    });

    it('one step east is distance 1', () => {
      // From (2, 2) to (3, 2) - one step E
      const a = hex(2, 2);
      const b = hex(3, 2);
      expect(hexDistance(a, b)).toBe(1);
    });

    it('two steps east is distance 2', () => {
      const a = hex(2, 2);
      const b = hex(4, 2);
      expect(hexDistance(a, b)).toBe(2);
    });

    it('one step west is distance 1', () => {
      const a = hex(2, 2);
      const b = hex(1, 2);
      expect(hexDistance(a, b)).toBe(1);
    });

    it('one step NE is distance 1', () => {
      // NE from (2, 2) → row decreases by 1
      // On even row 2, NE neighbor has same col
      const a = hex(2, 2); // dcol=4, row=2
      const ne = neighbor(a, Direction.NE); // dcol=5, row=1
      expect(hexDistance(a, ne)).toBe(1);
    });

    it('one step SW is distance 1', () => {
      const a = hex(2, 2);
      const sw = neighbor(a, Direction.SW);
      expect(hexDistance(a, sw)).toBe(1);
    });

    it('two steps north is distance 2', () => {
      // Going north twice: row 2 → row 0
      // From hex(2, 2) go NE then NW (or NW then NE)
      const a = hex(2, 2); // dcol=4, row=2
      // Two steps north: dcol stays 4 (NE+NW cancel), row goes to 0
      const b = hexFromDoubled(4, 0);
      expect(hexDistance(a, b)).toBe(2);
    });

    it('is symmetric', () => {
      const a = hex(0, 0);
      const b = hex(3, 2);
      expect(hexDistance(a, b)).toBe(hexDistance(b, a));
    });

    it('diagonal plus horizontal movement', () => {
      // From origin to (3, 2)
      // dcol=0→6, row=0→2
      // Minimum path: SE, E, SE, E (4 steps)
      //   SE: dcol 0→1, row 0→1
      //   E:  dcol 1→3, row 1
      //   SE: dcol 3→4, row 1→2
      //   E:  dcol 4→6, row 2
      const a = hex(0, 0); // dcol=0, row=0
      const b = hex(3, 2); // dcol=6, row=2
      expect(hexDistance(a, b)).toBe(4);
    });

    it('pure north/south movement', () => {
      // From row 0 to row 4, staying in same column
      // hex(2, 0) dcol=4 → hex(2, 4) dcol=4
      const a = hex(2, 0);
      const b = hex(2, 4);
      expect(hexDistance(a, b)).toBe(4);
    });

    it('more horizontal than vertical', () => {
      // ddcol=8, drow=2 → 2 diagonals + 3 horizontals = 5
      const a = hex(0, 0); // dcol=0, row=0
      const b = hex(4, 2); // dcol=8, row=2
      expect(hexDistance(a, b)).toBe(5);
    });

    it('more vertical than horizontal', () => {
      // ddcol=2, drow=4 → all diagonals (zigzag), 4 steps
      const a = hex(0, 0); // dcol=0, row=0
      const b = hex(1, 4); // dcol=2, row=4
      expect(hexDistance(a, b)).toBe(4);
    });

    it('equal horizontal and vertical', () => {
      // ddcol=4, drow=4 → all diagonals, 4 steps
      const a = hex(0, 0); // dcol=0, row=0
      const b = hex(2, 4); // dcol=4, row=4
      expect(hexDistance(a, b)).toBe(4);
    });
  });

  describe('hexToString', () => {
    it('formats as offset coordinates', () => {
      const h = hex(3, 2);
      expect(hexToString(h)).toBe('(3, 2)');
    });

    it('handles negative coordinates', () => {
      const h = hex(-2, -3);
      expect(hexToString(h)).toBe('(-2, -3)');
    });

    it('handles origin', () => {
      expect(hexToString(hex(0, 0))).toBe('(0, 0)');
    });
  });

  describe('DIRECTION_OFFSETS', () => {
    it('has 6 directions', () => {
      expect(DIRECTION_OFFSETS).toHaveLength(6);
    });

    it('E/W are horizontal (row unchanged)', () => {
      expect(DIRECTION_OFFSETS[Direction.E][1]).toBe(0);
      expect(DIRECTION_OFFSETS[Direction.W][1]).toBe(0);
    });

    it('E/W move dcol by 2', () => {
      expect(DIRECTION_OFFSETS[Direction.E][0]).toBe(2);
      expect(DIRECTION_OFFSETS[Direction.W][0]).toBe(-2);
    });

    it('diagonals move dcol by 1 and row by 1', () => {
      // NE, NW go up (row -1)
      expect(DIRECTION_OFFSETS[Direction.NE]).toEqual([1, -1]);
      expect(DIRECTION_OFFSETS[Direction.NW]).toEqual([-1, -1]);
      // SE, SW go down (row +1)
      expect(DIRECTION_OFFSETS[Direction.SE]).toEqual([1, 1]);
      expect(DIRECTION_OFFSETS[Direction.SW]).toEqual([-1, 1]);
    });
  });
});
