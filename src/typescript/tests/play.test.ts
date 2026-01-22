/**
 * Tests for Terminal Play CLI functions
 * 
 * Signed-by: agent #16 claude-sonnet-4 via opencode 20260122T05:33:11
 */

import { describe, it, expect } from 'vitest';
import { parseCoord, parseMoveInput, formatCoord, formatMove, renderBoard } from '../src/play';
import { Move, BoardState, Piece } from '../src/types';
import { createNewGame } from '../src/game';

describe('Play CLI - Coordinate Parsing', () => {
  describe('parseCoord', () => {
    it('should parse comma-separated coordinates', () => {
      expect(parseCoord('0,0')).toEqual({ q: 0, r: 0 });
      expect(parseCoord('1,2')).toEqual({ q: 1, r: 2 });
      expect(parseCoord('-1,-2')).toEqual({ q: -1, r: -2 });
      expect(parseCoord('2, 1')).toEqual({ q: 2, r: 1 }); // valid: |q|=2, |r|=1, |q+r|=3
      expect(parseCoord('-3 , 1')).toEqual({ q: -3, r: 1 }); // valid: |q|=3, |r|=1, |q+r|=2
    });

    it('should parse space-separated coordinates', () => {
      expect(parseCoord('0 0')).toEqual({ q: 0, r: 0 });
      expect(parseCoord('1 2')).toEqual({ q: 1, r: 2 });
      expect(parseCoord('-1 -2')).toEqual({ q: -1, r: -2 });
    });

    it('should handle whitespace', () => {
      expect(parseCoord('  0,0  ')).toEqual({ q: 0, r: 0 });
      expect(parseCoord('  1 , 2  ')).toEqual({ q: 1, r: 2 });
    });

    it('should reject invalid coordinates', () => {
      expect(parseCoord('abc')).toBeNull();
      expect(parseCoord('')).toBeNull();
      expect(parseCoord('1')).toBeNull();
      expect(parseCoord('1,2,3')).toBeNull();
    });

    it('should reject out-of-bounds coordinates', () => {
      // Board radius is 4, so |q|, |r|, |q+r| must all be <= 4
      expect(parseCoord('5,0')).toBeNull();
      expect(parseCoord('0,5')).toBeNull();
      expect(parseCoord('3,3')).toBeNull(); // |q+r| = 6 > 4
    });

    it('should accept valid edge coordinates', () => {
      expect(parseCoord('4,0')).toEqual({ q: 4, r: 0 });
      expect(parseCoord('0,4')).toEqual({ q: 0, r: 4 });
      expect(parseCoord('-4,0')).toEqual({ q: -4, r: 0 });
      expect(parseCoord('2,2')).toEqual({ q: 2, r: 2 });
      expect(parseCoord('-2,-2')).toEqual({ q: -2, r: -2 });
    });
  });

  describe('parseMoveInput', () => {
    it('should parse basic move format', () => {
      expect(parseMoveInput('0,2 0,1')).toEqual({
        from: { q: 0, r: 2 },
        to: { q: 0, r: 1 },
      });
    });

    it('should parse move with "to" keyword', () => {
      expect(parseMoveInput('0,2 to 0,1')).toEqual({
        from: { q: 0, r: 2 },
        to: { q: 0, r: 1 },
      });
      expect(parseMoveInput('0,2 TO 0,1')).toEqual({
        from: { q: 0, r: 2 },
        to: { q: 0, r: 1 },
      });
    });

    it('should handle negative coordinates', () => {
      expect(parseMoveInput('-1,-2 -1,-3')).toEqual({
        from: { q: -1, r: -2 },
        to: { q: -1, r: -3 },
      });
    });

    it('should handle mixed spacing', () => {
      expect(parseMoveInput('0,2  0,1')).toEqual({
        from: { q: 0, r: 2 },
        to: { q: 0, r: 1 },
      });
    });

    it('should reject invalid move formats', () => {
      expect(parseMoveInput('0,2')).toBeNull();
      expect(parseMoveInput('abc')).toBeNull();
      expect(parseMoveInput('')).toBeNull();
    });

    it('should reject moves with out-of-bounds coordinates', () => {
      expect(parseMoveInput('5,0 0,0')).toBeNull();
      expect(parseMoveInput('0,0 5,0')).toBeNull();
    });
  });
});

describe('Play CLI - Formatting', () => {
  describe('formatCoord', () => {
    it('should format coordinates correctly', () => {
      expect(formatCoord({ q: 0, r: 0 })).toBe('0,0');
      expect(formatCoord({ q: 1, r: 2 })).toBe('1,2');
      expect(formatCoord({ q: -1, r: -2 })).toBe('-1,-2');
    });
  });

  describe('formatMove', () => {
    it('should format basic moves', () => {
      const move: Move = {
        from: { q: 0, r: 2 },
        to: { q: 0, r: 1 },
        piece: { type: 'pawn', color: 'white' },
      };
      expect(formatMove(move)).toBe('Pawn 0,2 -> 0,1');
    });

    it('should format captures', () => {
      const move: Move = {
        from: { q: 0, r: 2 },
        to: { q: 0, r: 1 },
        piece: { type: 'pawn', color: 'white' },
        captured: { type: 'pawn', color: 'black' },
      };
      expect(formatMove(move)).toBe('Pawn 0,2 -> 0,1 x Pawn');
    });

    it('should format promotions', () => {
      const move: Move = {
        from: { q: 0, r: -3 },
        to: { q: 0, r: -4 },
        piece: { type: 'pawn', color: 'white' },
        promotion: 'queen',
      };
      expect(formatMove(move)).toBe('Pawn 0,-3 -> 0,-4 =Queen');
    });

    it('should format all piece types', () => {
      const pieceTypes: Array<{ type: 'king' | 'queen' | 'knight' | 'lance' | 'chariot' | 'pawn', name: string }> = [
        { type: 'king', name: 'King' },
        { type: 'queen', name: 'Queen' },
        { type: 'knight', name: 'Knight' },
        { type: 'lance', name: 'Lance' },
        { type: 'chariot', name: 'Chariot' },
        { type: 'pawn', name: 'Pawn' },
      ];

      for (const { type, name } of pieceTypes) {
        const move: Move = {
          from: { q: 0, r: 0 },
          to: { q: 1, r: 0 },
          piece: { type, color: 'white' },
        };
        expect(formatMove(move)).toContain(name);
      }
    });
  });
});

describe('Play CLI - Board Rendering', () => {
  it('should render without errors', () => {
    const state = createNewGame();
    const rendered = renderBoard(state.board);
    expect(typeof rendered).toBe('string');
    expect(rendered.length).toBeGreaterThan(0);
  });

  it('should contain row indicators', () => {
    const state = createNewGame();
    const rendered = renderBoard(state.board);
    expect(rendered).toContain('r=-4');
    expect(rendered).toContain('r=0');
    expect(rendered).toContain('r=4');
  });

  it('should render pieces', () => {
    const state = createNewGame();
    const rendered = renderBoard(state.board);
    // Board should contain piece symbols
    expect(rendered).toContain('K'); // King
    expect(rendered).toContain('Q'); // Queen
    expect(rendered).toContain('P'); // Pawn
  });

  it('should handle empty board', () => {
    const emptyBoard: BoardState = new Map();
    const rendered = renderBoard(emptyBoard);
    expect(typeof rendered).toBe('string');
    expect(rendered.length).toBeGreaterThan(0);
  });

  it('should handle highlighted cells', () => {
    const state = createNewGame();
    const highlights = new Set(['0,2', '0,1', '0,0']);
    const rendered = renderBoard(state.board, highlights);
    expect(typeof rendered).toBe('string');
    // The highlighted version should differ from non-highlighted
    const nonHighlighted = renderBoard(state.board);
    expect(rendered).not.toBe(nonHighlighted);
  });

  it('should handle selected cell', () => {
    const state = createNewGame();
    const rendered = renderBoard(state.board, new Set(), { q: 0, r: 2 });
    expect(typeof rendered).toBe('string');
    // Selected version should differ
    const nonSelected = renderBoard(state.board);
    expect(rendered).not.toBe(nonSelected);
  });
});
