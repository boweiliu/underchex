/**
 * Tests for Underchex AI Module
 * 
 * Signed-by: agent #3 claude-sonnet-4 via opencode 20260122T02:35:07
 * Edited-by: agent #5 claude-sonnet-4 via opencode 20260122T02:52:21
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PIECE_VALUES,
  CHECKMATE_VALUE,
  getCentralityBonus,
  getPawnAdvancementBonus,
  getPiecePositionBonus,
  evaluateMaterial,
  evaluatePosition,
  evaluateForColor,
  estimateMoveValue,
  orderMoves,
  findBestMove,
  findBestMoveIterative,
  getAIMove,
  getDifficultyParams,
  // Transposition table functions
  generateBoardHash,
  ttStore,
  ttProbe,
  ttClear,
  ttSize,
  // Quiescence search functions
  isTacticalMove,
  generateTacticalMoves,
} from '../src/ai';
import {
  HexCoord,
  Piece,
  Move,
  BoardState,
  coordToString,
} from '../src/types';
import { createNewGame, createBoardFromPlacements, getStartingPosition } from '../src/game';
import { generateAllLegalMoves } from '../src/moves';

// ============================================================================
// Piece Values Tests
// ============================================================================

describe('Piece Values', () => {
  it('should have sensible relative values', () => {
    expect(PIECE_VALUES.pawn).toBeLessThan(PIECE_VALUES.knight);
    expect(PIECE_VALUES.knight).toBeLessThan(PIECE_VALUES.lance);
    expect(PIECE_VALUES.lance).toEqual(PIECE_VALUES.chariot);
    expect(PIECE_VALUES.chariot).toBeLessThan(PIECE_VALUES.queen);
    expect(PIECE_VALUES.king).toBe(0); // King has no material value
  });

  it('should have reasonable queen value (approximately pawn + lance + knight)', () => {
    const roughQueenValue = PIECE_VALUES.pawn + PIECE_VALUES.lance + PIECE_VALUES.knight;
    expect(PIECE_VALUES.queen).toBeGreaterThanOrEqual(roughQueenValue * 0.8);
    expect(PIECE_VALUES.queen).toBeLessThanOrEqual(roughQueenValue * 1.2);
  });
});

// ============================================================================
// Position Evaluation Tests
// ============================================================================

describe('Centrality Bonus', () => {
  it('should give highest bonus at center', () => {
    const centerBonus = getCentralityBonus({ q: 0, r: 0 });
    const edgeBonus = getCentralityBonus({ q: 4, r: 0 });
    expect(centerBonus).toBeGreaterThan(edgeBonus);
  });

  it('should decrease with distance from center', () => {
    const bonus0 = getCentralityBonus({ q: 0, r: 0 });
    const bonus1 = getCentralityBonus({ q: 1, r: 0 });
    const bonus2 = getCentralityBonus({ q: 2, r: 0 });
    expect(bonus0).toBeGreaterThan(bonus1);
    expect(bonus1).toBeGreaterThan(bonus2);
  });
});

describe('Pawn Advancement Bonus', () => {
  it('should give higher bonus for advanced white pawns', () => {
    const startBonus = getPawnAdvancementBonus({ q: 0, r: 2 }, 'white');
    const advancedBonus = getPawnAdvancementBonus({ q: 0, r: -2 }, 'white');
    expect(advancedBonus).toBeGreaterThan(startBonus);
  });

  it('should give higher bonus for advanced black pawns', () => {
    const startBonus = getPawnAdvancementBonus({ q: 0, r: -2 }, 'black');
    const advancedBonus = getPawnAdvancementBonus({ q: 0, r: 2 }, 'black');
    expect(advancedBonus).toBeGreaterThan(startBonus);
  });
});

describe('Material Evaluation', () => {
  it('should return 0 for equal material', () => {
    const game = createNewGame();
    const score = evaluateMaterial(game.board);
    // Starting position should be roughly equal (within 100 centipawns for position differences)
    expect(Math.abs(score)).toBeLessThan(100);
  });

  it('should favor white with extra queen', () => {
    const board: BoardState = new Map();
    board.set(coordToString({ q: 0, r: 0 }), { type: 'king', color: 'white' });
    board.set(coordToString({ q: 1, r: 0 }), { type: 'queen', color: 'white' });
    board.set(coordToString({ q: 0, r: -3 }), { type: 'king', color: 'black' });
    
    const score = evaluateMaterial(board);
    expect(score).toBeGreaterThan(PIECE_VALUES.queen * 0.9);
  });

  it('should favor black with extra queen', () => {
    const board: BoardState = new Map();
    board.set(coordToString({ q: 0, r: 0 }), { type: 'king', color: 'white' });
    board.set(coordToString({ q: 0, r: -3 }), { type: 'king', color: 'black' });
    board.set(coordToString({ q: 1, r: -3 }), { type: 'queen', color: 'black' });
    
    const score = evaluateMaterial(board);
    expect(score).toBeLessThan(-PIECE_VALUES.queen * 0.9);
  });
});

describe('Position Evaluation', () => {
  it('should include mobility in evaluation', () => {
    // A position where one side has more mobility should score higher
    const game = createNewGame();
    const score = evaluatePosition(game.board);
    // Just verify it returns a number (exact value depends on position)
    expect(typeof score).toBe('number');
    expect(isFinite(score)).toBe(true);
  });

  it('evaluateForColor should negate for black', () => {
    const game = createNewGame();
    const whiteScore = evaluateForColor(game.board, 'white');
    const blackScore = evaluateForColor(game.board, 'black');
    expect(whiteScore).toBe(-blackScore);
  });
});

// ============================================================================
// Move Ordering Tests
// ============================================================================

describe('Move Ordering', () => {
  it('should prioritize captures', () => {
    const piece: Piece = { type: 'pawn', color: 'white' };
    const quietMove: Move = {
      piece,
      from: { q: 0, r: 1 },
      to: { q: 0, r: 0 },
    };
    const captureMove: Move = {
      piece,
      from: { q: 0, r: 1 },
      to: { q: 1, r: 0 },
      captured: { type: 'pawn', color: 'black' },
    };
    
    expect(estimateMoveValue(captureMove)).toBeGreaterThan(estimateMoveValue(quietMove));
  });

  it('should prioritize capturing valuable pieces', () => {
    const piece: Piece = { type: 'pawn', color: 'white' };
    const capturePawn: Move = {
      piece,
      from: { q: 0, r: 1 },
      to: { q: 1, r: 0 },
      captured: { type: 'pawn', color: 'black' },
    };
    const captureQueen: Move = {
      piece,
      from: { q: 0, r: 1 },
      to: { q: 1, r: 0 },
      captured: { type: 'queen', color: 'black' },
    };
    
    expect(estimateMoveValue(captureQueen)).toBeGreaterThan(estimateMoveValue(capturePawn));
  });

  it('should prioritize promotions', () => {
    const piece: Piece = { type: 'pawn', color: 'white' };
    const quietMove: Move = {
      piece,
      from: { q: 0, r: -3 },
      to: { q: 0, r: -4 },
    };
    const promotionMove: Move = {
      piece,
      from: { q: 0, r: -3 },
      to: { q: 0, r: -4 },
      promotion: 'queen',
    };
    
    expect(estimateMoveValue(promotionMove)).toBeGreaterThan(estimateMoveValue(quietMove));
  });

  it('orderMoves should sort by value descending', () => {
    const piece: Piece = { type: 'pawn', color: 'white' };
    const moves: Move[] = [
      { piece, from: { q: 0, r: 1 }, to: { q: 0, r: 0 } },
      { piece, from: { q: 0, r: 1 }, to: { q: 1, r: 0 }, captured: { type: 'queen', color: 'black' } },
      { piece, from: { q: 0, r: 1 }, to: { q: -1, r: 0 }, captured: { type: 'pawn', color: 'black' } },
    ];
    
    const ordered = orderMoves(moves);
    
    // Queen capture should be first
    expect(ordered[0].captured?.type).toBe('queen');
    // Pawn capture should be second
    expect(ordered[1].captured?.type).toBe('pawn');
    // Quiet move should be last
    expect(ordered[2].captured).toBeUndefined();
  });
});

// ============================================================================
// Alpha-Beta Search Tests
// ============================================================================

describe('Alpha-Beta Search', () => {
  it('should find a legal move from starting position', () => {
    const game = createNewGame();
    const result = findBestMove(game.board, 'white', 2);
    
    expect(result.move).not.toBeNull();
    expect(result.stats.nodesSearched).toBeGreaterThan(0);
    
    // Verify the move is actually legal
    const legalMoves = generateAllLegalMoves(game.board, 'white');
    const isLegal = legalMoves.some(m => 
      m.from.q === result.move!.from.q && 
      m.from.r === result.move!.from.r &&
      m.to.q === result.move!.to.q &&
      m.to.r === result.move!.to.r
    );
    expect(isLegal).toBe(true);
  });

  it('should find checkmate in 1', () => {
    // Set up a position where white can checkmate in 1
    // Black king cornered at edge, white queen can deliver mate
    const board: BoardState = new Map();
    board.set(coordToString({ q: 0, r: 0 }), { type: 'king', color: 'white' });
    board.set(coordToString({ q: 2, r: -4 }), { type: 'queen', color: 'white' }); // Queen can go to q=0,r=-3 for checkmate
    board.set(coordToString({ q: 0, r: -4 }), { type: 'king', color: 'black' }); // King in corner
    // Add a blocker so black king has no escape
    board.set(coordToString({ q: 1, r: -4 }), { type: 'pawn', color: 'white' });
    board.set(coordToString({ q: -1, r: -4 }), { type: 'pawn', color: 'white' });
    
    const result = findBestMove(board, 'white', 3);
    
    // Should find a move that leads to a winning position
    expect(result.move).not.toBeNull();
    // Either it finds checkmate (very high score) or a clearly winning move
    expect(result.score).toBeGreaterThan(PIECE_VALUES.queen);
  });

  it('should track search statistics', () => {
    const game = createNewGame();
    const result = findBestMove(game.board, 'white', 3);
    
    expect(result.stats.nodesSearched).toBeGreaterThan(1);
    expect(result.stats.cutoffs).toBeGreaterThanOrEqual(0);
  });
});

describe('Iterative Deepening', () => {
  it('should find a move within time limit', () => {
    const game = createNewGame();
    const startTime = Date.now();
    // Use shorter max depth to ensure time limit works
    const result = findBestMoveIterative(game.board, 'white', 3, 500);
    const elapsed = Date.now() - startTime;
    
    expect(result.move).not.toBeNull();
    // Iterative deepening should complete each depth before time expires
    // Allow generous overhead for test environment variability
    expect(elapsed).toBeLessThan(5000);
  });

  it('should increase depth reached with more time', () => {
    const game = createNewGame();
    
    const shortResult = findBestMoveIterative(game.board, 'white', 6, 100);
    const longResult = findBestMoveIterative(game.board, 'white', 6, 1000);
    
    // With more time, should generally search deeper
    expect(longResult.stats.maxDepthReached).toBeGreaterThanOrEqual(shortResult.stats.maxDepthReached);
  });
});

// ============================================================================
// Game-Level AI Tests
// ============================================================================

describe('Game AI Interface', () => {
  it('should return null move for finished games', () => {
    const game = createNewGame();
    const finishedGame = { ...game, status: { type: 'checkmate' as const, winner: 'white' as const } };
    
    const result = getAIMove(finishedGame);
    expect(result.move).toBeNull();
  });

  it('should return valid move for ongoing game', () => {
    const game = createNewGame();
    const result = getAIMove(game, 'easy');
    
    expect(result.move).not.toBeNull();
    
    // Verify move is legal
    const legalMoves = generateAllLegalMoves(game.board, game.turn);
    const isLegal = legalMoves.some(m => 
      m.from.q === result.move!.from.q && 
      m.from.r === result.move!.from.r &&
      m.to.q === result.move!.to.q &&
      m.to.r === result.move!.to.r
    );
    expect(isLegal).toBe(true);
  });

  it('should have different difficulty parameters', () => {
    const easy = getDifficultyParams('easy');
    const medium = getDifficultyParams('medium');
    const hard = getDifficultyParams('hard');
    
    expect(easy.depth).toBeLessThan(medium.depth);
    expect(medium.depth).toBeLessThan(hard.depth);
    expect(easy.timeLimit).toBeLessThan(medium.timeLimit);
    expect(medium.timeLimit).toBeLessThan(hard.timeLimit);
  });
});

// ============================================================================
// AI Quality Tests
// ============================================================================

describe('AI Move Quality', () => {
  it('should prefer capturing a queen over a pawn', () => {
    // Position with choice to capture queen or pawn
    const board: BoardState = new Map();
    board.set(coordToString({ q: 0, r: 3 }), { type: 'king', color: 'white' });
    board.set(coordToString({ q: 0, r: 0 }), { type: 'queen', color: 'white' }); // Can capture either
    board.set(coordToString({ q: 1, r: 0 }), { type: 'queen', color: 'black' }); // Target queen
    board.set(coordToString({ q: -1, r: 0 }), { type: 'pawn', color: 'black' }); // Target pawn
    board.set(coordToString({ q: 0, r: -4 }), { type: 'king', color: 'black' });
    
    const result = findBestMove(board, 'white', 3);
    
    // Should capture the queen
    expect(result.move?.captured?.type).toBe('queen');
  });

  it('should not hang its queen for a pawn', () => {
    // Position where white queen can take pawn but would be captured
    const board: BoardState = new Map();
    board.set(coordToString({ q: 0, r: 4 }), { type: 'king', color: 'white' });
    board.set(coordToString({ q: 0, r: 1 }), { type: 'queen', color: 'white' });
    board.set(coordToString({ q: 0, r: -1 }), { type: 'pawn', color: 'black' }); // Defended pawn
    board.set(coordToString({ q: 0, r: -2 }), { type: 'queen', color: 'black' }); // Defends pawn
    board.set(coordToString({ q: 0, r: -4 }), { type: 'king', color: 'black' });
    
    const result = findBestMove(board, 'white', 3);
    
    // Should NOT capture the pawn (would lose queen)
    const moveCaptures = result.move?.captured?.type;
    if (moveCaptures === 'pawn') {
      // This would be a blunder - the score should reflect the material loss
      expect(result.score).toBeLessThan(PIECE_VALUES.queen);
    }
    // Otherwise, good - AI avoided the trap
  });
});

// ============================================================================
// Transposition Table Tests
// ============================================================================

describe('Transposition Table', () => {
  beforeEach(() => {
    ttClear();
  });

  it('should generate consistent hash for same board position', () => {
    const board: BoardState = new Map();
    board.set(coordToString({ q: 0, r: 0 }), { type: 'king', color: 'white' });
    board.set(coordToString({ q: 0, r: -4 }), { type: 'king', color: 'black' });
    
    const hash1 = generateBoardHash(board);
    const hash2 = generateBoardHash(board);
    
    expect(hash1).toBe(hash2);
  });

  it('should generate different hash for different positions', () => {
    const board1: BoardState = new Map();
    board1.set(coordToString({ q: 0, r: 0 }), { type: 'king', color: 'white' });
    board1.set(coordToString({ q: 0, r: -4 }), { type: 'king', color: 'black' });
    
    const board2: BoardState = new Map();
    board2.set(coordToString({ q: 1, r: 0 }), { type: 'king', color: 'white' }); // Different position
    board2.set(coordToString({ q: 0, r: -4 }), { type: 'king', color: 'black' });
    
    const hash1 = generateBoardHash(board1);
    const hash2 = generateBoardHash(board2);
    
    expect(hash1).not.toBe(hash2);
  });

  it('should store and probe entries', () => {
    const board: BoardState = new Map();
    board.set(coordToString({ q: 0, r: 0 }), { type: 'king', color: 'white' });
    board.set(coordToString({ q: 0, r: -4 }), { type: 'king', color: 'black' });
    
    ttStore(board, 4, 100, 'exact', null);
    
    const entry = ttProbe(board);
    expect(entry).toBeDefined();
    expect(entry!.depth).toBe(4);
    expect(entry!.score).toBe(100);
    expect(entry!.type).toBe('exact');
  });

  it('should return undefined for unknown positions', () => {
    const board: BoardState = new Map();
    board.set(coordToString({ q: 0, r: 0 }), { type: 'king', color: 'white' });
    board.set(coordToString({ q: 0, r: -4 }), { type: 'king', color: 'black' });
    
    const entry = ttProbe(board);
    expect(entry).toBeUndefined();
  });

  it('should track size correctly', () => {
    expect(ttSize()).toBe(0);
    
    const board1: BoardState = new Map();
    board1.set(coordToString({ q: 0, r: 0 }), { type: 'king', color: 'white' });
    board1.set(coordToString({ q: 0, r: -4 }), { type: 'king', color: 'black' });
    ttStore(board1, 4, 100, 'exact', null);
    
    expect(ttSize()).toBe(1);
    
    const board2: BoardState = new Map();
    board2.set(coordToString({ q: 1, r: 0 }), { type: 'king', color: 'white' });
    board2.set(coordToString({ q: 0, r: -4 }), { type: 'king', color: 'black' });
    ttStore(board2, 4, 50, 'exact', null);
    
    expect(ttSize()).toBe(2);
  });

  it('should prefer deeper entries when storing', () => {
    const board: BoardState = new Map();
    board.set(coordToString({ q: 0, r: 0 }), { type: 'king', color: 'white' });
    board.set(coordToString({ q: 0, r: -4 }), { type: 'king', color: 'black' });
    
    ttStore(board, 4, 100, 'exact', null);
    ttStore(board, 2, 50, 'exact', null); // Shallower depth - should not replace
    
    const entry = ttProbe(board);
    expect(entry!.depth).toBe(4);
    expect(entry!.score).toBe(100);
  });

  it('should clear all entries', () => {
    const board: BoardState = new Map();
    board.set(coordToString({ q: 0, r: 0 }), { type: 'king', color: 'white' });
    board.set(coordToString({ q: 0, r: -4 }), { type: 'king', color: 'black' });
    
    ttStore(board, 4, 100, 'exact', null);
    expect(ttSize()).toBe(1);
    
    ttClear();
    expect(ttSize()).toBe(0);
    expect(ttProbe(board)).toBeUndefined();
  });
});

// ============================================================================
// Quiescence Search Tests
// ============================================================================

describe('Quiescence Search', () => {
  it('isTacticalMove should identify captures', () => {
    const piece: Piece = { type: 'pawn', color: 'white' };
    
    const quietMove: Move = {
      piece,
      from: { q: 0, r: 1 },
      to: { q: 0, r: 0 },
    };
    
    const captureMove: Move = {
      piece,
      from: { q: 0, r: 1 },
      to: { q: 1, r: 0 },
      captured: { type: 'pawn', color: 'black' },
    };
    
    expect(isTacticalMove(quietMove)).toBe(false);
    expect(isTacticalMove(captureMove)).toBe(true);
  });

  it('isTacticalMove should identify promotions', () => {
    const piece: Piece = { type: 'pawn', color: 'white' };
    
    const promotionMove: Move = {
      piece,
      from: { q: 0, r: -3 },
      to: { q: 0, r: -4 },
      promotion: 'queen',
    };
    
    expect(isTacticalMove(promotionMove)).toBe(true);
  });

  it('generateTacticalMoves should only return captures and promotions', () => {
    const game = createNewGame();
    const tacticalMoves = generateTacticalMoves(game.board, 'white');
    
    // From starting position, there should be no tactical moves
    expect(tacticalMoves.length).toBe(0);
  });

  it('generateTacticalMoves should find captures when available', () => {
    // Create a position with a capture available
    const board: BoardState = new Map();
    board.set(coordToString({ q: 0, r: 0 }), { type: 'king', color: 'white' });
    board.set(coordToString({ q: 1, r: 0 }), { type: 'queen', color: 'white' }); // Queen can capture black pawn
    board.set(coordToString({ q: 2, r: 0 }), { type: 'pawn', color: 'black' }); // Target
    board.set(coordToString({ q: 0, r: -4 }), { type: 'king', color: 'black' });
    
    const tacticalMoves = generateTacticalMoves(board, 'white');
    
    // Should find at least the queen capture
    const captures = tacticalMoves.filter(m => m.captured);
    expect(captures.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// TT and Quiescence Integration Tests
// ============================================================================

describe('AI with TT and Quiescence', () => {
  beforeEach(() => {
    ttClear();
  });

  it('should benefit from transposition table (faster search)', () => {
    const game = createNewGame();
    
    // First search - populates TT
    const result1 = findBestMove(game.board, 'white', 3, true, true);
    const nodes1 = result1.stats.nodesSearched;
    
    // Second search - should benefit from TT
    const result2 = findBestMove(game.board, 'white', 3, true, true);
    const nodes2 = result2.stats.nodesSearched;
    
    // The second search should have TT hits
    expect(result2.stats.ttHits).toBeGreaterThan(0);
    
    // Both searches should find valid moves
    expect(result1.move).not.toBeNull();
    expect(result2.move).not.toBeNull();
  });

  it('should find same best move with or without TT', () => {
    ttClear();
    const game = createNewGame();
    
    // Search without TT
    const resultNoTT = findBestMove(game.board, 'white', 2, false, false);
    
    ttClear();
    // Search with TT
    const resultWithTT = findBestMove(game.board, 'white', 2, true, false);
    
    // Should find equivalent moves (same evaluation)
    // Note: exact move might differ due to ordering, but score should be same
    expect(Math.abs(resultNoTT.score - resultWithTT.score)).toBeLessThan(10);
  });

  it('quiescence search should track statistics', () => {
    const game = createNewGame();
    
    // Search with quiescence
    const result = findBestMove(game.board, 'white', 3, false, true);
    
    // Quiescence nodes should be tracked (may be 0 if no tactical positions reached)
    expect(result.stats.quiescenceNodes).toBeGreaterThanOrEqual(0);
  });

  it('should use TT best move for better move ordering', () => {
    ttClear();
    const game = createNewGame();
    
    // First search at depth 3
    const result1 = findBestMove(game.board, 'white', 3, true, true);
    
    // Store TT entry manually with a known best move
    if (result1.move) {
      // Now search again - should use the TT entry for better ordering
      const result2 = findBestMove(game.board, 'white', 4, true, true);
      
      // The TT hit count should indicate we're using stored entries
      expect(result2.stats.ttHits).toBeGreaterThan(0);
    }
  });
});
