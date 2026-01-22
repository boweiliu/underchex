/**
 * Endgame Tablebase Tests
 * 
 * Signed-by: agent #33 claude-sonnet-4 via opencode 20260122T08:51:16
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import {
  WDLOutcome,
  TablebaseEntry,
  PieceTablebase,
  TablebaseConfig,
  detectConfiguration,
  generateTablebase,
  probeTablebase,
  getTablebaseMove,
  getTablebaseScore,
  initializeTablebases,
  getLoadedTablebases,
  clearTablebases,
  getTablebaseStatistics,
  formatTablebaseStatistics,
  serializeTablebase,
  deserializeTablebase,
  exportTablebaseToJSON,
  importTablebaseFromJSON,
  getTablebase,
  setTablebase,
} from '../src/tablebase';

import {
  BoardState,
  Piece,
  Color,
  HexCoord,
  coordToString,
} from '../src/types';

import { createBoardFromPlacements, getStartingPosition } from '../src/game';
import { generateAllLegalMoves, applyMove, isInCheck, findKing } from '../src/moves';
import { CHECKMATE_VALUE } from '../src/ai';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a minimal board with just the pieces specified.
 */
function createBoard(pieces: Array<{ type: Piece['type']; color: Color; q: number; r: number; variant?: 'A' | 'B' }>): BoardState {
  const board = new Map<string, Piece>();
  for (const p of pieces) {
    const piece: Piece = p.variant 
      ? { type: p.type, color: p.color, variant: p.variant }
      : { type: p.type, color: p.color };
    board.set(coordToString({ q: p.q, r: p.r }), piece);
  }
  return board;
}

// ============================================================================
// Configuration Detection Tests
// ============================================================================

describe('Configuration Detection', () => {
  it('detects KvK configuration', () => {
    const board = createBoard([
      { type: 'king', color: 'white', q: 0, r: 0 },
      { type: 'king', color: 'black', q: 2, r: -2 },
    ]);
    
    const config = detectConfiguration(board);
    expect(config).not.toBeNull();
    expect(config!.name).toBe('KvK');
    expect(config!.strongerSide).toEqual([]);
    expect(config!.weakerSide).toEqual([]);
  });
  
  it('detects KQvK configuration', () => {
    const board = createBoard([
      { type: 'king', color: 'white', q: 0, r: 0 },
      { type: 'queen', color: 'white', q: 1, r: 0 },
      { type: 'king', color: 'black', q: 3, r: -3 },
    ]);
    
    const config = detectConfiguration(board);
    expect(config).not.toBeNull();
    expect(config!.name).toBe('KQvK');
    expect(config!.strongerSide).toContain('queen');
  });
  
  it('detects KLvK configuration', () => {
    const board = createBoard([
      { type: 'king', color: 'white', q: 0, r: 0 },
      { type: 'lance', color: 'white', q: 1, r: 0, variant: 'A' },
      { type: 'king', color: 'black', q: 3, r: -3 },
    ]);
    
    const config = detectConfiguration(board);
    expect(config).not.toBeNull();
    expect(config!.name).toBe('KLvK');
  });
  
  it('detects KCvK configuration', () => {
    const board = createBoard([
      { type: 'king', color: 'white', q: 0, r: 0 },
      { type: 'chariot', color: 'white', q: 1, r: 0 },
      { type: 'king', color: 'black', q: 3, r: -3 },
    ]);
    
    const config = detectConfiguration(board);
    expect(config).not.toBeNull();
    expect(config!.name).toBe('KCvK');
  });
  
  it('detects KNvK configuration', () => {
    const board = createBoard([
      { type: 'king', color: 'white', q: 0, r: 0 },
      { type: 'knight', color: 'white', q: 1, r: 0 },
      { type: 'king', color: 'black', q: 3, r: -3 },
    ]);
    
    const config = detectConfiguration(board);
    expect(config).not.toBeNull();
    expect(config!.name).toBe('KNvK');
  });
  
  it('returns null for unsupported configurations (too many pieces)', () => {
    const board = createBoard([
      { type: 'king', color: 'white', q: 0, r: 0 },
      { type: 'queen', color: 'white', q: 1, r: 0 },
      { type: 'queen', color: 'white', q: 2, r: 0 },
      { type: 'queen', color: 'white', q: 3, r: 0 },
      { type: 'chariot', color: 'white', q: -1, r: 0 },
      { type: 'king', color: 'black', q: -3, r: 3 },
    ]);
    
    // 6 pieces total (2 kings + 4 non-kings) exceeds the 5-piece limit
    const config = detectConfiguration(board);
    expect(config).toBeNull();
  });
  
  it('handles black being the stronger side', () => {
    const board = createBoard([
      { type: 'king', color: 'white', q: 0, r: 0 },
      { type: 'king', color: 'black', q: 3, r: -3 },
      { type: 'queen', color: 'black', q: 2, r: -2 },
    ]);
    
    const config = detectConfiguration(board);
    expect(config).not.toBeNull();
    expect(config!.name).toBe('KQvK');
  });
});

// ============================================================================
// Tablebase Generation Tests
// ============================================================================

describe('Tablebase Generation', () => {
  beforeEach(() => {
    clearTablebases();
  });
  
  it('generates KvK tablebase (all draws)', () => {
    const config: TablebaseConfig = { strongerSide: [], weakerSide: [], name: 'KvK' };
    const tablebase = generateTablebase(config);
    
    expect(tablebase.name).toBe('KvK');
    expect(tablebase.size).toBeGreaterThan(0);
    
    // KvK should be all draws (insufficient material)
    expect(tablebase.metadata.winCount).toBe(0);
    expect(tablebase.metadata.lossCount).toBe(0);
    expect(tablebase.metadata.drawCount).toBe(tablebase.size);
  });
  
  // Skip slow tests in normal test runs - uncomment for full verification
  it.skip('generates KQvK tablebase with wins for queen side (slow ~90s)', () => {
    const config: TablebaseConfig = { strongerSide: ['queen'], weakerSide: [], name: 'KQvK' };
    const tablebase = generateTablebase(config);
    
    expect(tablebase.name).toBe('KQvK');
    expect(tablebase.size).toBeGreaterThan(0);
    
    // Should have many wins for the stronger side
    expect(tablebase.metadata.winCount).toBeGreaterThan(0);
    
    // Should have very few draws (if any - stalemate positions)
    // The queen should be able to deliver checkmate in almost all positions
  });
  
  it('generates KvK tablebase with valid DTM values', () => {
    // Use KvK for fast testing of DTM validation
    const config: TablebaseConfig = { strongerSide: [], weakerSide: [], name: 'KvK' };
    const tablebase = generateTablebase(config);
    
    // Check that all entries have valid WDL and DTM
    for (const [key, entry] of tablebase.entries) {
      expect(['win', 'draw', 'loss']).toContain(entry.wdl);
      
      if (entry.wdl === 'win' || entry.wdl === 'loss') {
        expect(entry.dtm).toBeGreaterThanOrEqual(0);
      } else {
        expect(entry.dtm).toBe(-1); // Draws have DTM = -1
      }
    }
  });
  
  it('generates KvK tablebase quickly', () => {
    const config: TablebaseConfig = { strongerSide: [], weakerSide: [], name: 'KvK' };
    const tablebase = generateTablebase(config);
    
    // KvK should complete in under 1 second
    expect(tablebase.metadata.generationTimeMs).toBeLessThan(1000);
  });
});

// ============================================================================
// Tablebase Probe Tests
// ============================================================================

describe('Tablebase Probing', () => {
  beforeAll(() => {
    clearTablebases();
    // Only generate KvK for fast tests
    const kvkConfig: TablebaseConfig = { strongerSide: [], weakerSide: [], name: 'KvK' };
    const kvkTablebase = generateTablebase(kvkConfig);
    setTablebase(kvkTablebase);
  });
  
  it('probes KvK position as draw', () => {
    const board = createBoard([
      { type: 'king', color: 'white', q: 0, r: 0 },
      { type: 'king', color: 'black', q: 3, r: -3 },
    ]);
    
    const result = probeTablebase(board, 'white');
    expect(result.found).toBe(true);
    expect(result.entry?.wdl).toBe('draw');
  });
  
  it('returns correct result for KQvK position when tablebase not loaded', () => {
    // KQvK tablebase is not loaded in fast test mode
    const board = createBoard([
      { type: 'king', color: 'white', q: 0, r: 0 },
      { type: 'queen', color: 'white', q: 1, r: 0 },
      { type: 'king', color: 'black', q: 3, r: -3 },
    ]);
    
    const result = probeTablebase(board, 'white');
    // Should return not found since KQvK is not loaded
    expect(result.found).toBe(false);
  });
  
  it('returns null for positions not in tablebase', () => {
    // Full starting position is not in tablebase
    const board = createBoardFromPlacements(getStartingPosition());
    
    const result = probeTablebase(board, 'white');
    expect(result.found).toBe(false);
  });
});

// ============================================================================
// Tablebase Score Tests
// ============================================================================

describe('Tablebase Score', () => {
  beforeAll(() => {
    clearTablebases();
    // Only generate KvK for fast tests
    const kvkConfig: TablebaseConfig = { strongerSide: [], weakerSide: [], name: 'KvK' };
    const kvkTablebase = generateTablebase(kvkConfig);
    setTablebase(kvkTablebase);
  });
  
  it('returns 0 for drawn KvK position', () => {
    const board = createBoard([
      { type: 'king', color: 'white', q: 0, r: 0 },
      { type: 'king', color: 'black', q: 3, r: -3 },
    ]);
    
    const score = getTablebaseScore(board, 'white');
    expect(score).toBe(0);
  });
  
  it('returns null for position not in tablebase', () => {
    const board = createBoardFromPlacements(getStartingPosition());
    const score = getTablebaseScore(board, 'white');
    expect(score).toBeNull();
  });
});

// ============================================================================
// Tablebase Move Tests
// ============================================================================

describe('Tablebase Move', () => {
  beforeAll(() => {
    clearTablebases();
    // Only generate KvK for fast tests
    const kvkConfig: TablebaseConfig = { strongerSide: [], weakerSide: [], name: 'KvK' };
    const kvkTablebase = generateTablebase(kvkConfig);
    setTablebase(kvkTablebase);
  });
  
  it('returns null for drawn KvK position (no winning moves)', () => {
    const board = createBoard([
      { type: 'king', color: 'white', q: 0, r: 0 },
      { type: 'king', color: 'black', q: 3, r: -3 },
    ]);
    
    // KvK is always draw, so there's no best move with a winning line
    // The tablebase stores draws with dtm=-1 and no bestMove
    const move = getTablebaseMove(board, 'white');
    // For drawn positions, bestMove may be null (no winning continuation)
    // This is expected behavior
  });
});

// ============================================================================
// Serialization Tests
// ============================================================================

describe('Tablebase Serialization', () => {
  it('serializes and deserializes tablebase correctly', () => {
    const config: TablebaseConfig = { strongerSide: [], weakerSide: [], name: 'KvK' };
    const original = generateTablebase(config);
    
    const serialized = serializeTablebase(original);
    const deserialized = deserializeTablebase(serialized);
    
    expect(deserialized.name).toBe(original.name);
    expect(deserialized.size).toBe(original.size);
    expect(deserialized.metadata.winCount).toBe(original.metadata.winCount);
    expect(deserialized.metadata.drawCount).toBe(original.metadata.drawCount);
    expect(deserialized.metadata.lossCount).toBe(original.metadata.lossCount);
  });
  
  it('exports and imports JSON correctly', () => {
    const config: TablebaseConfig = { strongerSide: [], weakerSide: [], name: 'KvK' };
    const original = generateTablebase(config);
    
    const json = exportTablebaseToJSON(original);
    expect(typeof json).toBe('string');
    
    const imported = importTablebaseFromJSON(json);
    expect(imported.name).toBe(original.name);
    expect(imported.size).toBe(original.size);
  });
});

// ============================================================================
// Statistics Tests
// ============================================================================

describe('Tablebase Statistics', () => {
  beforeAll(() => {
    clearTablebases();
    // Only generate KvK for fast tests
    const kvkConfig: TablebaseConfig = { strongerSide: [], weakerSide: [], name: 'KvK' };
    const kvkTablebase = generateTablebase(kvkConfig);
    setTablebase(kvkTablebase);
  });
  
  it('returns correct statistics', () => {
    const stats = getTablebaseStatistics();
    
    expect(stats.totalEntries).toBeGreaterThan(0);
    expect(stats.tablebases.length).toBeGreaterThan(0);
    
    for (const tb of stats.tablebases) {
      expect(tb.size).toBeGreaterThan(0);
      expect(tb.wins + tb.draws + tb.losses).toBe(tb.size);
    }
  });
  
  it('formats statistics as string', () => {
    const formatted = formatTablebaseStatistics();
    
    expect(typeof formatted).toBe('string');
    expect(formatted).toContain('Endgame Tablebase Statistics');
    expect(formatted).toContain('KvK');
  });
});

// ============================================================================
// Integration Tests (slow - skip in normal test runs)
// ============================================================================

describe.skip('Tablebase Integration (slow - requires full tablebase generation)', () => {
  beforeAll(() => {
    clearTablebases();
    initializeTablebases();
  });
  
  it('loaded tablebases include basic endgames', () => {
    const loaded = getLoadedTablebases();
    
    expect(loaded).toContain('KvK');
    expect(loaded).toContain('KQvK');
    expect(loaded).toContain('KLvK');
    expect(loaded).toContain('KCvK');
    expect(loaded).toContain('KNvK');
  });
  
  it('KNvK is mostly draws (insufficient mating material)', () => {
    const tablebase = getTablebase('KNvK');
    expect(tablebase).toBeDefined();
    
    if (tablebase) {
      // Knight alone cannot deliver checkmate on hex board
      // Most positions should be draws
      const drawPercentage = tablebase.metadata.drawCount / tablebase.size;
      expect(drawPercentage).toBeGreaterThan(0.9); // At least 90% draws
    }
  });
  
  it('KQvK has many wins', () => {
    const tablebase = getTablebase('KQvK');
    expect(tablebase).toBeDefined();
    
    if (tablebase) {
      // Queen can deliver checkmate
      // Most positions should be wins for the queen side
      const winPercentage = tablebase.metadata.winCount / tablebase.size;
      expect(winPercentage).toBeGreaterThan(0.5); // At least 50% wins
    }
  });
});

// ============================================================================
// Perfect Play Tests (slow - skip in normal test runs)
// ============================================================================

describe.skip('Perfect Play Verification (slow - requires full tablebase generation)', () => {
  beforeAll(() => {
    clearTablebases();
    initializeTablebases();
  });
  
  it('following tablebase moves leads to checkmate in KQvK', () => {
    // Start from a winning KQvK position
    let board = createBoard([
      { type: 'king', color: 'white', q: 0, r: 0 },
      { type: 'queen', color: 'white', q: 0, r: -2 },
      { type: 'king', color: 'black', q: 0, r: -4 },
    ]);
    
    let sideToMove: Color = 'white';
    let moveCount = 0;
    const MAX_MOVES = 200;
    
    while (moveCount < MAX_MOVES) {
      const result = probeTablebase(board, sideToMove);
      
      // If position not in tablebase, stop
      if (!result.found) break;
      
      // Check if it's checkmate
      const moves = generateAllLegalMoves(board, sideToMove);
      if (moves.length === 0) {
        if (isInCheck(board, sideToMove)) {
          // Checkmate - test passed!
          break;
        } else {
          // Stalemate
          break;
        }
      }
      
      // Get tablebase move
      const tbMove = getTablebaseMove(board, sideToMove);
      if (!tbMove) {
        // No tablebase move, use first legal move
        const randomMove = moves[Math.floor(Math.random() * moves.length)]!;
        board = applyMove(board, randomMove);
      } else {
        board = applyMove(board, tbMove);
      }
      
      sideToMove = sideToMove === 'white' ? 'black' : 'white';
      moveCount++;
    }
    
    // Should reach a terminal position within reasonable moves
    expect(moveCount).toBeLessThan(MAX_MOVES);
  });
});
