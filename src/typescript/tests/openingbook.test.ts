/**
 * Tests for Underchex Opening Book Module
 * 
 * Signed-by: agent #27 claude-sonnet-4 via opencode 20260122T07:49:00
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  // Book types and functions
  BookMoveStats,
  BookEntry,
  OpeningBook,
  BookLookupOptions,
  GameForBook,
  getOpeningBook,
  setOpeningBook,
  clearOpeningBook,
  getBookEntry,
  isInBook,
  getBookSize,
  calculateWinRate,
  lookupBookMove,
  addGameToBook,
  generateOpeningBook,
  pruneBook,
  serializeBook,
  deserializeBook,
  exportBookToJSON,
  importBookFromJSON,
  loadBookFromJSON,
  getBookStatistics,
  formatBookEntry,
} from '../src/openingbook';

import {
  getStartingPosition as getStartingPlacements,
  createBoardFromPlacements,
  createNewGame,
  makeMove,
} from '../src/game';

// Helper to get starting board state
function getStartingBoard() {
  return createBoardFromPlacements(getStartingPlacements());
}

import {
  generateAllLegalMoves,
  applyMove,
} from '../src/moves';

import {
  computeZobristHash,
  getAIMove,
} from '../src/ai';

import {
  BoardState,
  Move,
} from '../src/types';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a simple game with known moves for testing.
 */
function createTestGame(): { moves: Move[], result: 1 | 0 | -1 } {
  const startingBoard = getStartingBoard();
  
  // Just take first 3 moves for each side
  const moves: Move[] = [];
  let board = startingBoard;
  let color: 'white' | 'black' = 'white';
  
  for (let i = 0; i < 6; i++) {
    const legalMoves = generateAllLegalMoves(board, color);
    if (legalMoves.length === 0) break;
    const move = legalMoves[0]!;
    moves.push(move);
    board = applyMove(board, move);
    color = color === 'white' ? 'black' : 'white';
  }
  
  return { moves, result: 1 }; // White wins
}

// ============================================================================
// Basic Book Operations
// ============================================================================

describe('Opening Book - Basic Operations', () => {
  beforeEach(() => {
    clearOpeningBook();
  });

  it('should start with empty book', () => {
    expect(getBookSize()).toBe(0);
    const book = getOpeningBook();
    expect(book.entries.size).toBe(0);
    expect(book.metadata.gamesCount).toBe(0);
  });

  it('should clear book correctly', () => {
    // Add some data
    const startingBoard = getStartingBoard();
    const game = createTestGame();
    addGameToBook({ moves: game.moves, result: 1 }, startingBoard);
    
    expect(getBookSize()).toBeGreaterThan(0);
    
    // Clear
    clearOpeningBook();
    expect(getBookSize()).toBe(0);
  });

  it('should check if position is in book', () => {
    const startingBoard = getStartingBoard();
    
    // Before adding game
    expect(isInBook(startingBoard)).toBe(false);
    
    // After adding game
    const game = createTestGame();
    addGameToBook({ moves: game.moves, result: 1 }, startingBoard);
    
    expect(isInBook(startingBoard)).toBe(true);
  });
});

// ============================================================================
// Win Rate Calculation
// ============================================================================

describe('Opening Book - Win Rate Calculation', () => {
  it('should calculate 100% win rate correctly', () => {
    const stats: BookMoveStats = {
      from: { q: 0, r: 0 },
      to: { q: 0, r: -1 },
      playCount: 10,
      wins: 10,
      draws: 0,
      avgScore: 100,
    };
    expect(calculateWinRate(stats)).toBe(1.0);
  });

  it('should calculate 0% win rate correctly', () => {
    const stats: BookMoveStats = {
      from: { q: 0, r: 0 },
      to: { q: 0, r: -1 },
      playCount: 10,
      wins: 0,
      draws: 0,
      avgScore: -100,
    };
    expect(calculateWinRate(stats)).toBe(0.0);
  });

  it('should calculate 50% win rate with all draws', () => {
    const stats: BookMoveStats = {
      from: { q: 0, r: 0 },
      to: { q: 0, r: -1 },
      playCount: 10,
      wins: 0,
      draws: 10,
      avgScore: 0,
    };
    expect(calculateWinRate(stats)).toBe(0.5);
  });

  it('should calculate mixed win rate correctly', () => {
    const stats: BookMoveStats = {
      from: { q: 0, r: 0 },
      to: { q: 0, r: -1 },
      playCount: 10,
      wins: 6, // 6 wins
      draws: 2, // 2 draws = 1 equivalent win
      avgScore: 50,
    };
    // Total: 10 games, 7 "equivalent wins" = 70%
    expect(calculateWinRate(stats)).toBe(0.7);
  });
});

// ============================================================================
// Book Generation from Games
// ============================================================================

describe('Opening Book - Generation', () => {
  beforeEach(() => {
    clearOpeningBook();
  });

  it('should add single game to book', () => {
    const startingBoard = getStartingBoard();
    const game = createTestGame();
    
    addGameToBook({ moves: game.moves, result: 1 }, startingBoard);
    
    // Should have starting position
    expect(isInBook(startingBoard)).toBe(true);
    
    // Book should have at least one position
    expect(getBookSize()).toBeGreaterThan(0);
    
    // Should have metadata updated
    const book = getOpeningBook();
    expect(book.metadata.gamesCount).toBe(1);
  });

  it('should track move statistics correctly', () => {
    const startingBoard = getStartingBoard();
    const game = createTestGame();
    
    // Add same game twice (as if played twice)
    addGameToBook({ moves: game.moves, result: 1 }, startingBoard);
    addGameToBook({ moves: game.moves, result: 1 }, startingBoard);
    
    // Starting position should have move with playCount = 2
    const entry = getBookEntry(startingBoard);
    expect(entry).not.toBeNull();
    expect(entry!.totalVisits).toBe(2);
    
    // First move should have been played twice
    const firstMove = game.moves[0]!;
    const moveStats = entry!.moves.find(m => 
      m.from.q === firstMove.from.q &&
      m.from.r === firstMove.from.r &&
      m.to.q === firstMove.to.q &&
      m.to.r === firstMove.to.r
    );
    expect(moveStats).not.toBeUndefined();
    expect(moveStats!.playCount).toBe(2);
    expect(moveStats!.wins).toBe(2); // Both were white wins
  });

  it('should generate book from multiple games', () => {
    const startingBoard = getStartingBoard();
    const games: GameForBook[] = [];
    
    // Create 5 simple games
    for (let i = 0; i < 5; i++) {
      const game = createTestGame();
      games.push({
        moves: game.moves,
        result: (i % 3 === 0) ? 1 : (i % 3 === 1) ? -1 : 0, // Mix of results
      });
    }
    
    generateOpeningBook(games, startingBoard, { maxDepth: 10, minPositionCount: 1 });
    
    expect(getBookSize()).toBeGreaterThan(0);
    expect(getOpeningBook().metadata.gamesCount).toBe(5);
  });

  it('should respect maxDepth option', () => {
    const startingBoard = getStartingBoard();
    const game = createTestGame();
    
    // Generate with depth 2 (should only have first 2 positions)
    generateOpeningBook([{ moves: game.moves, result: 1 }], startingBoard, { 
      maxDepth: 2,
      minPositionCount: 1,
    });
    
    expect(getOpeningBook().metadata.maxDepth).toBeLessThanOrEqual(2);
  });

  it('should prune positions with too few visits', () => {
    const startingBoard = getStartingBoard();
    const game = createTestGame();
    
    // Add one game
    addGameToBook({ moves: game.moves, result: 1 }, startingBoard);
    
    // Prune requiring 2 visits
    pruneBook(2);
    
    // All positions should be removed (only visited once)
    expect(getBookSize()).toBe(0);
  });
});

// ============================================================================
// Book Lookup
// ============================================================================

describe('Opening Book - Lookup', () => {
  beforeEach(() => {
    clearOpeningBook();
  });

  it('should return null for position not in book', () => {
    const startingBoard = getStartingBoard();
    const result = lookupBookMove(startingBoard, 'white');
    
    expect(result.move).toBeNull();
    expect(result.inBook).toBe(false);
    expect(result.entry).toBeNull();
  });

  it('should return move for position in book', () => {
    const startingBoard = getStartingBoard();
    const game = createTestGame();
    
    // Add game multiple times to meet minPlayCount
    for (let i = 0; i < 5; i++) {
      addGameToBook({ moves: game.moves, result: 1 }, startingBoard);
    }
    
    const result = lookupBookMove(startingBoard, 'white', { minPlayCount: 1 });
    
    expect(result.inBook).toBe(true);
    expect(result.entry).not.toBeNull();
    expect(result.move).not.toBeNull();
  });

  it('should respect minPlayCount option', () => {
    const startingBoard = getStartingBoard();
    const game = createTestGame();
    
    // Add game only once
    addGameToBook({ moves: game.moves, result: 1 }, startingBoard);
    
    // Lookup with high minPlayCount
    const result = lookupBookMove(startingBoard, 'white', { minPlayCount: 10 });
    
    // Should be in book but no move selected
    expect(result.inBook).toBe(true);
    expect(result.entry).not.toBeNull();
    expect(result.move).toBeNull();
  });

  it('should return valid legal move', () => {
    const startingBoard = getStartingBoard();
    const game = createTestGame();
    
    for (let i = 0; i < 5; i++) {
      addGameToBook({ moves: game.moves, result: 1 }, startingBoard);
    }
    
    const result = lookupBookMove(startingBoard, 'white', { minPlayCount: 1 });
    
    if (result.move) {
      // Verify it's a legal move
      const legalMoves = generateAllLegalMoves(startingBoard, 'white');
      const isLegal = legalMoves.some(m =>
        m.from.q === result.move!.from.q &&
        m.from.r === result.move!.from.r &&
        m.to.q === result.move!.to.q &&
        m.to.r === result.move!.to.r
      );
      expect(isLegal).toBe(true);
    }
  });

  it('should produce deterministic results with seed', () => {
    const startingBoard = getStartingBoard();
    const game = createTestGame();
    
    for (let i = 0; i < 10; i++) {
      addGameToBook({ moves: game.moves, result: 1 }, startingBoard);
    }
    
    // Multiple lookups with same seed should return same move
    const seed = 12345;
    const result1 = lookupBookMove(startingBoard, 'white', { seed, minPlayCount: 1 });
    const result2 = lookupBookMove(startingBoard, 'white', { seed, minPlayCount: 1 });
    
    if (result1.move && result2.move) {
      expect(result1.move.from.q).toBe(result2.move.from.q);
      expect(result1.move.from.r).toBe(result2.move.from.r);
      expect(result1.move.to.q).toBe(result2.move.to.q);
      expect(result1.move.to.r).toBe(result2.move.to.r);
    }
  });
});

// ============================================================================
// Serialization
// ============================================================================

describe('Opening Book - Serialization', () => {
  beforeEach(() => {
    clearOpeningBook();
  });

  it('should serialize and deserialize book correctly', () => {
    const startingBoard = getStartingBoard();
    const game = createTestGame();
    
    addGameToBook({ moves: game.moves, result: 1 }, startingBoard);
    addGameToBook({ moves: game.moves, result: 0 }, startingBoard);
    
    const originalBook = getOpeningBook();
    const originalSize = getBookSize();
    const originalStats = getBookStatistics();
    
    // Serialize
    const serialized = serializeBook(originalBook);
    
    // Clear and deserialize
    clearOpeningBook();
    expect(getBookSize()).toBe(0);
    
    const restored = deserializeBook(serialized);
    setOpeningBook(restored);
    
    // Verify restored
    expect(getBookSize()).toBe(originalSize);
    expect(getBookStatistics().gamesCount).toBe(originalStats.gamesCount);
  });

  it('should export to JSON and import back', () => {
    const startingBoard = getStartingBoard();
    const game = createTestGame();
    
    addGameToBook({ moves: game.moves, result: 1 }, startingBoard);
    
    // Export
    const json = exportBookToJSON();
    expect(typeof json).toBe('string');
    expect(json.length).toBeGreaterThan(0);
    
    // Parse and verify it's valid JSON
    const parsed = JSON.parse(json);
    expect(parsed.entries).toBeDefined();
    expect(parsed.metadata).toBeDefined();
    
    // Import back
    const imported = importBookFromJSON(json);
    expect(imported.entries.size).toBe(getBookSize());
  });

  it('should load book from JSON', () => {
    const startingBoard = getStartingBoard();
    const game = createTestGame();
    
    addGameToBook({ moves: game.moves, result: 1 }, startingBoard);
    const json = exportBookToJSON();
    
    clearOpeningBook();
    expect(getBookSize()).toBe(0);
    
    loadBookFromJSON(json);
    expect(getBookSize()).toBeGreaterThan(0);
  });
});

// ============================================================================
// Statistics
// ============================================================================

describe('Opening Book - Statistics', () => {
  beforeEach(() => {
    clearOpeningBook();
  });

  it('should calculate statistics for empty book', () => {
    const stats = getBookStatistics();
    
    expect(stats.positionCount).toBe(0);
    expect(stats.totalMoveEntries).toBe(0);
    expect(stats.avgMovesPerPosition).toBe(0);
    expect(stats.gamesCount).toBe(0);
  });

  it('should calculate statistics correctly', () => {
    const startingBoard = getStartingBoard();
    const game = createTestGame();
    
    // Add 3 games
    for (let i = 0; i < 3; i++) {
      addGameToBook({ moves: game.moves, result: 1 }, startingBoard);
    }
    
    const stats = getBookStatistics();
    
    expect(stats.positionCount).toBeGreaterThan(0);
    expect(stats.totalMoveEntries).toBeGreaterThan(0);
    expect(stats.gamesCount).toBe(3);
    expect(stats.maxDepth).toBeGreaterThan(0);
  });

  it('should format book entry for display', () => {
    const startingBoard = getStartingBoard();
    const game = createTestGame();
    
    // Add enough to pass minPositionCount threshold
    for (let i = 0; i < 5; i++) {
      addGameToBook({ moves: game.moves, result: 1 }, startingBoard);
    }
    
    // Don't prune so we can get the entry
    const entry = getBookEntry(startingBoard);
    expect(entry).not.toBeNull();
    
    const formatted = formatBookEntry(entry!);
    expect(typeof formatted).toBe('string');
    expect(formatted.length).toBeGreaterThan(0);
    expect(formatted).toContain('Position hash');
    expect(formatted).toContain('Moves:');
  });
});

// ============================================================================
// Integration with AI
// ============================================================================

describe('Opening Book - AI Integration', () => {
  beforeEach(() => {
    clearOpeningBook();
  });

  it('should be used by getAIMove when enabled', () => {
    const startingBoard = getStartingBoard();
    const game = createTestGame();
    
    // Add game to book multiple times
    for (let i = 0; i < 10; i++) {
      addGameToBook({ moves: game.moves, result: 1 }, startingBoard);
    }
    
    const gameState = createNewGame();
    
    // With book enabled, should return quickly (0 nodes searched)
    const result = getAIMove(gameState, 'medium', false, { 
      useOpeningBook: true,
      bookOptions: { minPlayCount: 1 },
    });
    
    // If book move found, stats should show 0 nodes (instant move)
    if (result.move) {
      expect(result.stats.nodesSearched).toBe(0);
    }
  });

  it('should fall back to search when book disabled', () => {
    const gameState = createNewGame();
    
    // With book disabled, should search
    const result = getAIMove(gameState, 'easy', false, { 
      useOpeningBook: false,
    });
    
    // Should have searched some nodes
    expect(result.stats.nodesSearched).toBeGreaterThan(0);
    expect(result.move).not.toBeNull();
  });
});
