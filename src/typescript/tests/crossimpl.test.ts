/**
 * Cross-Implementation Test Runner
 * 
 * Runs test cases from spec/tests/move_validation.json to verify
 * TypeScript implementation matches the shared spec.
 * 
 * Signed-by: agent #28 claude-sonnet-4 via opencode 20260122T08:04:58
 */

import { describe, test, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

import {
  isValidCell,
  validateMove,
  BoardState,
  Piece,
  Color,
  PieceType,
  LanceVariant,
  coordToString,
} from '../src/index';

// Test case types from spec
interface BoardValidationTestCase {
  id: string;
  description: string;
  type: 'boardValidation';
  input: { q: number; r: number };
  expected: { valid: boolean };
}

interface MoveValidationTestCase {
  id: string;
  description: string;
  type: 'moveValidation';
  setup: {
    pieces: Array<{
      piece: string;
      color: string;
      q: number;
      r: number;
      variant?: string;
    }>;
    turn: string;
  };
  move: {
    from: { q: number; r: number };
    to: { q: number; r: number };
  };
  expected: {
    legal: boolean;
    capture?: boolean;
    reason?: string;
  };
}

type TestCase = BoardValidationTestCase | MoveValidationTestCase;

interface TestSuite {
  testCases: TestCase[];
}

// Load test cases
function loadTestSuite(): TestSuite {
  const specPath = path.join(__dirname, '../../../spec/tests/move_validation.json');
  const content = fs.readFileSync(specPath, 'utf-8');
  return JSON.parse(content) as TestSuite;
}

// Convert spec piece to our Piece type
function specToPiece(spec: { piece: string; color: string; variant?: string }): Piece {
  const type = spec.piece as PieceType;
  const color = spec.color as Color;
  const piece: Piece = { type, color };
  
  if (spec.variant) {
    return { ...piece, variant: spec.variant as LanceVariant };
  }
  
  return piece;
}

// Build board from spec setup
function buildBoardFromSpec(setup: MoveValidationTestCase['setup']): BoardState {
  const board: BoardState = new Map();
  
  for (const placement of setup.pieces) {
    const piece = specToPiece(placement);
    const coord = { q: placement.q, r: placement.r };
    board.set(coordToString(coord), piece);
  }
  
  return board;
}

describe('Cross-Implementation Tests (spec/tests/move_validation.json)', () => {
  let testSuite: TestSuite;
  
  beforeAll(() => {
    testSuite = loadTestSuite();
  });
  
  describe('Board Validation Tests', () => {
    test.each([
      { id: 'board_001', q: 0, r: 0, valid: true, desc: 'Center cell is valid' },
      { id: 'board_002', q: 4, r: 0, valid: true, desc: 'Corner cell at max radius is valid' },
      { id: 'board_003', q: 5, r: 0, valid: false, desc: 'Cell outside board is invalid' },
      { id: 'board_004', q: 3, r: 3, valid: false, desc: 'Cell violating q+r constraint is invalid' },
    ])('$id: $desc', ({ q, r, valid }) => {
      const result = isValidCell({ q, r });
      expect(result).toBe(valid);
    });
    
    test('runs all board validation tests from spec', () => {
      const boardTests = testSuite.testCases.filter(
        (tc): tc is BoardValidationTestCase => tc.type === 'boardValidation'
      );
      
      for (const tc of boardTests) {
        const result = isValidCell(tc.input);
        expect(result, `${tc.id}: ${tc.description}`).toBe(tc.expected.valid);
      }
    });
  });
  
  describe('Move Validation Tests', () => {
    test('runs all move validation tests from spec', () => {
      const moveTests = testSuite.testCases.filter(
        (tc): tc is MoveValidationTestCase => tc.type === 'moveValidation'
      );
      
      for (const tc of moveTests) {
        const board = buildBoardFromSpec(tc.setup);
        const turn = tc.setup.turn as Color;
        
        const result = validateMove(board, tc.move.from, tc.move.to, turn);
        
        // Check legal/illegal
        expect(result.legal, `${tc.id}: ${tc.description} - legal`).toBe(tc.expected.legal);
        
        // If legal and capture is specified, check it
        if (tc.expected.legal && tc.expected.capture !== undefined) {
          expect(result.capture, `${tc.id}: ${tc.description} - capture`).toBe(tc.expected.capture);
        }
        
        // If illegal with specific reason, check it
        if (!tc.expected.legal && tc.expected.reason) {
          expect(result.reason, `${tc.id}: ${tc.description} - reason`).toBe(tc.expected.reason);
        }
      }
    });
    
    // Individual test cases for better error reporting
    test('king_001: King can move to adjacent empty cell', () => {
      const board = buildBoardFromSpec({
        pieces: [{ piece: 'king', color: 'white', q: 0, r: 0 }],
        turn: 'white',
      });
      const result = validateMove(board, { q: 0, r: 0 }, { q: 1, r: 0 }, 'white');
      expect(result.legal).toBe(true);
    });
    
    test('king_002: King cannot move 2 squares', () => {
      const board = buildBoardFromSpec({
        pieces: [{ piece: 'king', color: 'white', q: 0, r: 0 }],
        turn: 'white',
      });
      const result = validateMove(board, { q: 0, r: 0 }, { q: 2, r: 0 }, 'white');
      expect(result.legal).toBe(false);
    });
    
    test('king_003: King can capture enemy piece', () => {
      const board = buildBoardFromSpec({
        pieces: [
          { piece: 'king', color: 'white', q: 0, r: 0 },
          { piece: 'pawn', color: 'black', q: 1, r: 0 },
        ],
        turn: 'white',
      });
      const result = validateMove(board, { q: 0, r: 0 }, { q: 1, r: 0 }, 'white');
      expect(result.legal).toBe(true);
      expect(result.capture).toBe(true);
    });
    
    test('queen_001: Queen can slide multiple squares', () => {
      const board = buildBoardFromSpec({
        pieces: [{ piece: 'queen', color: 'white', q: 0, r: 0 }],
        turn: 'white',
      });
      const result = validateMove(board, { q: 0, r: 0 }, { q: 0, r: -3 }, 'white');
      expect(result.legal).toBe(true);
    });
    
    test('queen_002: Queen cannot jump over pieces', () => {
      const board = buildBoardFromSpec({
        pieces: [
          { piece: 'queen', color: 'white', q: 0, r: 0 },
          { piece: 'pawn', color: 'white', q: 0, r: -1 },
        ],
        turn: 'white',
      });
      const result = validateMove(board, { q: 0, r: 0 }, { q: 0, r: -3 }, 'white');
      expect(result.legal).toBe(false);
    });
    
    test('pawn_001: White pawn moves north', () => {
      const board = buildBoardFromSpec({
        pieces: [{ piece: 'pawn', color: 'white', q: 0, r: 2 }],
        turn: 'white',
      });
      const result = validateMove(board, { q: 0, r: 2 }, { q: 0, r: 1 }, 'white');
      expect(result.legal).toBe(true);
    });
    
    test('pawn_002: White pawn cannot move south', () => {
      const board = buildBoardFromSpec({
        pieces: [{ piece: 'pawn', color: 'white', q: 0, r: 2 }],
        turn: 'white',
      });
      const result = validateMove(board, { q: 0, r: 2 }, { q: 0, r: 3 }, 'white');
      expect(result.legal).toBe(false);
    });
    
    test('pawn_003: White pawn captures forward (north)', () => {
      const board = buildBoardFromSpec({
        pieces: [
          { piece: 'pawn', color: 'white', q: 0, r: 2 },
          { piece: 'pawn', color: 'black', q: 0, r: 1 },
        ],
        turn: 'white',
      });
      const result = validateMove(board, { q: 0, r: 2 }, { q: 0, r: 1 }, 'white');
      expect(result.legal).toBe(true);
      expect(result.capture).toBe(true);
    });
    
    test('pawn_004: White pawn captures diagonally NE', () => {
      const board = buildBoardFromSpec({
        pieces: [
          { piece: 'pawn', color: 'white', q: 0, r: 2 },
          { piece: 'pawn', color: 'black', q: 1, r: 1 },
        ],
        turn: 'white',
      });
      const result = validateMove(board, { q: 0, r: 2 }, { q: 1, r: 1 }, 'white');
      expect(result.legal).toBe(true);
      expect(result.capture).toBe(true);
    });
    
    test('knight_001: Knight leaps to valid target', () => {
      const board = buildBoardFromSpec({
        pieces: [{ piece: 'knight', color: 'white', q: 0, r: 0 }],
        turn: 'white',
      });
      const result = validateMove(board, { q: 0, r: 0 }, { q: 1, r: -2 }, 'white');
      expect(result.legal).toBe(true);
    });
    
    test('knight_002: Knight can jump over pieces', () => {
      const board = buildBoardFromSpec({
        pieces: [
          { piece: 'knight', color: 'white', q: 0, r: 0 },
          { piece: 'pawn', color: 'white', q: 0, r: -1 },
          { piece: 'pawn', color: 'black', q: 1, r: -1 },
        ],
        turn: 'white',
      });
      const result = validateMove(board, { q: 0, r: 0 }, { q: 1, r: -2 }, 'white');
      expect(result.legal).toBe(true);
    });
    
    test('lance_001: Lance A slides north', () => {
      const board = buildBoardFromSpec({
        pieces: [{ piece: 'lance', color: 'white', q: 0, r: 2, variant: 'A' }],
        turn: 'white',
      });
      const result = validateMove(board, { q: 0, r: 2 }, { q: 0, r: -2 }, 'white');
      expect(result.legal).toBe(true);
    });
    
    test('lance_002: Lance A cannot move NE (not in its directions)', () => {
      const board = buildBoardFromSpec({
        pieces: [{ piece: 'lance', color: 'white', q: 0, r: 2, variant: 'A' }],
        turn: 'white',
      });
      const result = validateMove(board, { q: 0, r: 2 }, { q: 2, r: 0 }, 'white');
      expect(result.legal).toBe(false);
    });
    
    test('chariot_001: Chariot slides NE', () => {
      const board = buildBoardFromSpec({
        pieces: [{ piece: 'chariot', color: 'white', q: 0, r: 0 }],
        turn: 'white',
      });
      const result = validateMove(board, { q: 0, r: 0 }, { q: 3, r: -3 }, 'white');
      expect(result.legal).toBe(true);
    });
    
    test('chariot_002: Chariot cannot move north (not diagonal)', () => {
      const board = buildBoardFromSpec({
        pieces: [{ piece: 'chariot', color: 'white', q: 0, r: 0 }],
        turn: 'white',
      });
      const result = validateMove(board, { q: 0, r: 0 }, { q: 0, r: -2 }, 'white');
      expect(result.legal).toBe(false);
    });
    
    test('check_001: King cannot move into check', () => {
      const board = buildBoardFromSpec({
        pieces: [
          { piece: 'king', color: 'white', q: 0, r: 0 },
          { piece: 'queen', color: 'black', q: 1, r: -4 },
        ],
        turn: 'white',
      });
      const result = validateMove(board, { q: 0, r: 0 }, { q: 1, r: 0 }, 'white');
      expect(result.legal).toBe(false);
      expect(result.reason).toBe('movesIntoCheck');
    });
  });
  
  describe('Spec Test Coverage Report', () => {
    test('reports test case coverage', () => {
      const boardTests = testSuite.testCases.filter(tc => tc.type === 'boardValidation');
      const moveTests = testSuite.testCases.filter(tc => tc.type === 'moveValidation');
      
      console.log('\n=== Spec Test Coverage Report ===');
      console.log(`Board validation tests: ${boardTests.length}`);
      console.log(`Move validation tests: ${moveTests.length}`);
      console.log(`Total spec tests: ${testSuite.testCases.length}`);
      console.log('=================================\n');
      
      expect(testSuite.testCases.length).toBeGreaterThan(0);
    });
  });
});
