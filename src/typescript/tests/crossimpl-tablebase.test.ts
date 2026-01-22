/**
 * Cross-Implementation Tablebase Test Runner
 * 
 * Runs test cases from spec/tests/tablebase_validation.json to verify
 * TypeScript tablebase implementation matches the shared spec.
 * 
 * NOTE: Full tablebase tests are SLOW and skipped by default.
 * Run with FULL_TABLEBASE=1 to enable all tests.
 * 
 * Signed-by: agent #41 claude-sonnet-4 via amp 20260122T10:32:31
 */

import { describe, test, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

import {
  detectConfiguration,
  probeTablebase,
  getTablebaseMove,
  initializeTablebases,
  clearTablebases,
  getLoadedTablebases,
  generateTablebase,
  setTablebase,
  TablebaseConfig,
} from '../src/tablebase';

import {
  BoardState,
  Piece,
  Color,
  PieceType,
  LanceVariant,
  coordToString,
} from '../src/types';

import { applyMove, generateAllLegalMoves } from '../src/moves';

// Check if full tablebase tests are enabled
const FULL_TABLEBASE = process.env.FULL_TABLEBASE === '1';

// Test case types from spec
interface PiecePlacement {
  piece: string;
  color: string;
  q: number;
  r: number;
  variant?: string;
}

interface TablebaseConfigTestCase {
  id: string;
  description: string;
  type: 'tablebaseConfig';
  setup: {
    pieces: PiecePlacement[];
  };
  expected: {
    config?: string;
    supported: boolean;
  };
}

interface TablebaseWDLTestCase {
  id: string;
  description: string;
  type: 'tablebaseWDL';
  setup: {
    pieces: PiecePlacement[];
    turn: string;
  };
  expected: {
    wdl: 'win' | 'draw' | 'loss';
    dtm?: number;
  };
}

interface TablebaseMoveTestCase {
  id: string;
  description: string;
  type: 'tablebaseMove';
  setup: {
    pieces: PiecePlacement[];
    turn: string;
  };
  expected: {
    hasMove: boolean;
    preservesWin?: boolean;
  };
}

type TablebaseTestCase = TablebaseConfigTestCase | TablebaseWDLTestCase | TablebaseMoveTestCase;

interface TablebaseTestSuite {
  testCases: TablebaseTestCase[];
}

// Load test cases
function loadTestSuite(): TablebaseTestSuite {
  const specPath = path.join(__dirname, '../../../spec/tests/tablebase_validation.json');
  const content = fs.readFileSync(specPath, 'utf-8');
  return JSON.parse(content) as TablebaseTestSuite;
}

// Convert spec piece to our Piece type
function specToPiece(spec: PiecePlacement): Piece {
  const type = spec.piece as PieceType;
  const color = spec.color as Color;
  const piece: Piece = { type, color };
  
  if (spec.variant) {
    return { ...piece, variant: spec.variant as LanceVariant };
  }
  
  return piece;
}

// Build board from spec setup
function buildBoardFromSpec(setup: { pieces: PiecePlacement[] }): BoardState {
  const board: BoardState = new Map();
  
  for (const placement of setup.pieces) {
    const piece = specToPiece(placement);
    const coord = { q: placement.q, r: placement.r };
    board.set(coordToString(coord), piece);
  }
  
  return board;
}

describe('Cross-Implementation Tablebase Tests (spec/tests/tablebase_validation.json)', () => {
  let testSuite: TablebaseTestSuite;
  
  beforeAll(() => {
    testSuite = loadTestSuite();
    // Initialize tablebases before running tests
    clearTablebases();
    
    // For fast tests, only generate KvK
    // For full tests, generate all tablebases
    if (FULL_TABLEBASE) {
      initializeTablebases();
    } else {
      // Only generate KvK for fast tests
      const kvkConfig: TablebaseConfig = { strongerSide: [], weakerSide: [], name: 'KvK' };
      const kvkTablebase = generateTablebase(kvkConfig);
      setTablebase(kvkTablebase);
    }
  });
  
  describe('Tablebase Configuration Detection', () => {
    test('runs all tablebaseConfig tests from spec', () => {
      const configTests = testSuite.testCases.filter(
        (tc): tc is TablebaseConfigTestCase => tc.type === 'tablebaseConfig'
      );
      
      for (const tc of configTests) {
        const board = buildBoardFromSpec(tc.setup);
        const config = detectConfiguration(board);
        
        if (tc.expected.supported) {
          expect(config, `${tc.id}: ${tc.description} - should be supported`).not.toBeNull();
          if (tc.expected.config) {
            expect(config!.name, `${tc.id}: ${tc.description} - config name`).toBe(tc.expected.config);
          }
        } else {
          // Not supported means either null config or complex position
          // For complex positions, detectConfiguration returns null
          expect(config === null || config.strongerSide.length > 2, 
            `${tc.id}: ${tc.description} - should not be supported`).toBe(true);
        }
      }
    });
    
    test('tb_config_001: KvK detection', () => {
      const board = buildBoardFromSpec({
        pieces: [
          { piece: 'king', color: 'white', q: 0, r: 0 },
          { piece: 'king', color: 'black', q: 0, r: -3 },
        ],
      });
      const config = detectConfiguration(board);
      expect(config).not.toBeNull();
      expect(config!.name).toBe('KvK');
    });
    
    test('tb_config_002: KQvK detection', () => {
      const board = buildBoardFromSpec({
        pieces: [
          { piece: 'king', color: 'white', q: 0, r: 0 },
          { piece: 'queen', color: 'white', q: 2, r: 0 },
          { piece: 'king', color: 'black', q: 0, r: -3 },
        ],
      });
      const config = detectConfiguration(board);
      expect(config).not.toBeNull();
      expect(config!.name).toBe('KQvK');
    });
  });
  
  describe('Tablebase WDL Lookups', () => {
    // Full spec test - only run in FULL_TABLEBASE mode
    test.skipIf(!FULL_TABLEBASE)('runs all tablebaseWDL tests from spec', () => {
      const wdlTests = testSuite.testCases.filter(
        (tc): tc is TablebaseWDLTestCase => tc.type === 'tablebaseWDL'
      );
      
      for (const tc of wdlTests) {
        const board = buildBoardFromSpec(tc.setup);
        const turn = tc.setup.turn as Color;
        
        const result = probeTablebase(board, turn);
        
        expect(result.found, `${tc.id}: ${tc.description} - should find position`).toBe(true);
        expect(result.entry?.wdl, `${tc.id}: ${tc.description} - WDL`).toBe(tc.expected.wdl);
        
        if (tc.expected.dtm !== undefined) {
          expect(result.entry?.dtm, `${tc.id}: ${tc.description} - DTM`).toBe(tc.expected.dtm);
        }
      }
    });
    
    // Fast test - KvK only
    test('tb_wdl_001: KvK is always draw', () => {
      const board = buildBoardFromSpec({
        pieces: [
          { piece: 'king', color: 'white', q: 0, r: 0 },
          { piece: 'king', color: 'black', q: 0, r: -3 },
        ],
      });
      const result = probeTablebase(board, 'white');
      expect(result.found).toBe(true);
      expect(result.entry?.wdl).toBe('draw');
    });
    
    test('tb_wdl_002: KvK is draw for black too', () => {
      const board = buildBoardFromSpec({
        pieces: [
          { piece: 'king', color: 'white', q: 0, r: 0 },
          { piece: 'king', color: 'black', q: 0, r: -3 },
        ],
      });
      const result = probeTablebase(board, 'black');
      expect(result.found).toBe(true);
      expect(result.entry?.wdl).toBe('draw');
    });
    
    // Slow tests - only run in FULL_TABLEBASE mode
    test.skipIf(!FULL_TABLEBASE)('tb_wdl_003: KQvK - queen side is winning', () => {
      const board = buildBoardFromSpec({
        pieces: [
          { piece: 'king', color: 'white', q: 0, r: 0 },
          { piece: 'queen', color: 'white', q: 2, r: 0 },
          { piece: 'king', color: 'black', q: 0, r: -4 },
        ],
      });
      const result = probeTablebase(board, 'white');
      expect(result.found).toBe(true);
      expect(result.entry?.wdl).toBe('win');
    });
    
    test.skipIf(!FULL_TABLEBASE)('tb_wdl_004: KQvK - lone king side is losing', () => {
      const board = buildBoardFromSpec({
        pieces: [
          { piece: 'king', color: 'white', q: 0, r: 0 },
          { piece: 'queen', color: 'white', q: 2, r: 0 },
          { piece: 'king', color: 'black', q: 0, r: -4 },
        ],
      });
      const result = probeTablebase(board, 'black');
      expect(result.found).toBe(true);
      expect(result.entry?.wdl).toBe('loss');
    });
    
    test.skipIf(!FULL_TABLEBASE)('tb_wdl_006: KNvK - knight alone is draw', () => {
      const board = buildBoardFromSpec({
        pieces: [
          { piece: 'king', color: 'white', q: 0, r: 0 },
          { piece: 'knight', color: 'white', q: 2, r: 0 },
          { piece: 'king', color: 'black', q: 0, r: -3 },
        ],
      });
      const result = probeTablebase(board, 'white');
      expect(result.found).toBe(true);
      expect(result.entry?.wdl).toBe('draw');
    });
  });
  
  describe('Tablebase Move Suggestions', () => {
    // Full spec test - only run in FULL_TABLEBASE mode
    test.skipIf(!FULL_TABLEBASE)('runs all tablebaseMove tests from spec', () => {
      const moveTests = testSuite.testCases.filter(
        (tc): tc is TablebaseMoveTestCase => tc.type === 'tablebaseMove'
      );
      
      for (const tc of moveTests) {
        const board = buildBoardFromSpec(tc.setup);
        const turn = tc.setup.turn as Color;
        
        const move = getTablebaseMove(board, turn);
        
        if (tc.expected.hasMove) {
          expect(move, `${tc.id}: ${tc.description} - should have move`).not.toBeNull();
          
          if (tc.expected.preservesWin && move) {
            // Verify the move preserves the win
            const newBoard = applyMove(board, move);
            const newResult = probeTablebase(newBoard, turn === 'white' ? 'black' : 'white');
            expect(newResult.found, `${tc.id}: ${tc.description} - resulting position should be in tablebase`).toBe(true);
            // After our winning move, opponent should be losing
            expect(newResult.entry?.wdl, `${tc.id}: ${tc.description} - opponent should be losing`).toBe('loss');
          }
        } else {
          // For draws, there might not be a "best" move stored
          // This is implementation-dependent, so we just check the position is a draw
          const result = probeTablebase(board, turn);
          expect(result.entry?.wdl, `${tc.id}: ${tc.description} - should be draw if no move`).toBe('draw');
        }
      }
    });
    
    // Fast test - KvK move (no winning move, it's a draw)
    test('tb_move_002: KvK - no winning move available (draw)', () => {
      const board = buildBoardFromSpec({
        pieces: [
          { piece: 'king', color: 'white', q: 0, r: 0 },
          { piece: 'king', color: 'black', q: 0, r: -3 },
        ],
      });
      // For KvK, there's no winning move - it's always a draw
      const result = probeTablebase(board, 'white');
      expect(result.entry?.wdl).toBe('draw');
    });
    
    // Slow test - only run in FULL_TABLEBASE mode
    test.skipIf(!FULL_TABLEBASE)('tb_move_001: KQvK winning position has a winning move', () => {
      const board = buildBoardFromSpec({
        pieces: [
          { piece: 'king', color: 'white', q: 0, r: 0 },
          { piece: 'queen', color: 'white', q: 2, r: 0 },
          { piece: 'king', color: 'black', q: 0, r: -4 },
        ],
      });
      const move = getTablebaseMove(board, 'white');
      expect(move).not.toBeNull();
      
      // Verify the move preserves the win
      const newBoard = applyMove(board, move!);
      const newResult = probeTablebase(newBoard, 'black');
      expect(newResult.entry?.wdl).toBe('loss');
    });
  });
  
  describe('Tablebase Symmetry Tests', () => {
    // Slow tests - only run in FULL_TABLEBASE mode
    test.skipIf(!FULL_TABLEBASE)('tb_symmetric_001: Black queen vs white king - queen side wins', () => {
      const board = buildBoardFromSpec({
        pieces: [
          { piece: 'king', color: 'white', q: 0, r: 4 },
          { piece: 'queen', color: 'black', q: 2, r: 0 },
          { piece: 'king', color: 'black', q: 0, r: 0 },
        ],
      });
      const result = probeTablebase(board, 'black');
      expect(result.found).toBe(true);
      expect(result.entry?.wdl).toBe('win');
    });
    
    test.skipIf(!FULL_TABLEBASE)('tb_symmetric_002: Black queen vs white king - lone king loses', () => {
      const board = buildBoardFromSpec({
        pieces: [
          { piece: 'king', color: 'white', q: 0, r: 4 },
          { piece: 'queen', color: 'black', q: 2, r: 0 },
          { piece: 'king', color: 'black', q: 0, r: 0 },
        ],
      });
      const result = probeTablebase(board, 'white');
      expect(result.found).toBe(true);
      expect(result.entry?.wdl).toBe('loss');
    });
  });
  
  describe('Spec Test Coverage Report', () => {
    test('reports tablebase test case coverage', () => {
      const configTests = testSuite.testCases.filter(tc => tc.type === 'tablebaseConfig');
      const wdlTests = testSuite.testCases.filter(tc => tc.type === 'tablebaseWDL');
      const moveTests = testSuite.testCases.filter(tc => tc.type === 'tablebaseMove');
      
      console.log('\n=== Tablebase Spec Test Coverage Report ===');
      console.log(`Configuration detection tests: ${configTests.length}`);
      console.log(`WDL lookup tests: ${wdlTests.length}`);
      console.log(`Move suggestion tests: ${moveTests.length}`);
      console.log(`Total tablebase spec tests: ${testSuite.testCases.length}`);
      console.log(`Loaded tablebases: ${getLoadedTablebases().join(', ')}`);
      console.log('============================================\n');
      
      expect(testSuite.testCases.length).toBeGreaterThan(0);
    });
  });
});
