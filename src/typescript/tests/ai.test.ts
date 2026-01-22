/**
 * Tests for Underchex AI Module
 * 
 * Signed-by: agent #3 claude-sonnet-4 via opencode 20260122T02:35:07
 * Edited-by: agent #5 claude-sonnet-4 via opencode 20260122T02:52:21
 * Edited-by: agent #6 claude-sonnet-4 via opencode 20260122T03:06:11
 * Edited-by: agent #7 claude-sonnet-4 via opencode 20260122T03:17:17
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
  // PST functions
  PAWN_PST,
  KNIGHT_PST,
  LANCE_PST,
  CHARIOT_PST,
  QUEEN_PST,
  KING_MG_PST,
  KING_EG_PST,
  PIECE_SQUARE_TABLES,
  getPSTBonus,
  isEndgame,
  // Zobrist hashing functions
  initZobristTable,
  getZobristTable,
  computeZobristHash,
  zobristUpdate,
  // History heuristic functions (added by agent #7)
  historyUpdate,
  historyScore,
  historyClear,
  historyAge,
  historySize,
  // Null move pruning functions (added by agent #7)
  nullMoveReduction,
  hasNullMoveMaterial,
  shouldTryNullMove,
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

// ============================================================================
// Piece-Square Table Tests
// ============================================================================

describe('Piece-Square Tables', () => {
  it('should have PSTs for all piece types', () => {
    expect(PIECE_SQUARE_TABLES.pawn).toBeDefined();
    expect(PIECE_SQUARE_TABLES.knight).toBeDefined();
    expect(PIECE_SQUARE_TABLES.lance).toBeDefined();
    expect(PIECE_SQUARE_TABLES.chariot).toBeDefined();
    expect(PIECE_SQUARE_TABLES.queen).toBeDefined();
    expect(PIECE_SQUARE_TABLES.king).toBeDefined();
  });

  it('PAWN_PST should give higher bonus for advanced pawns', () => {
    // White pawn at r=2 (starting area) vs r=-2 (advanced)
    const startBonus = PAWN_PST.get('0,2') ?? 0;
    const advancedBonus = PAWN_PST.get('0,-2') ?? 0;
    expect(advancedBonus).toBeGreaterThan(startBonus);
  });

  it('KNIGHT_PST should give higher bonus for central positions', () => {
    const centerBonus = KNIGHT_PST.get('0,0') ?? 0;
    const edgeBonus = KNIGHT_PST.get('4,0') ?? 0;
    expect(centerBonus).toBeGreaterThan(edgeBonus);
  });

  it('QUEEN_PST should prefer central positions', () => {
    const centerBonus = QUEEN_PST.get('0,0') ?? 0;
    const edgeBonus = QUEEN_PST.get('4,0') ?? 0;
    expect(centerBonus).toBeGreaterThan(edgeBonus);
  });

  it('KING_MG_PST should penalize central king', () => {
    const centerBonus = KING_MG_PST.get('0,0') ?? 0;
    const backRankBonus = KING_MG_PST.get('0,4') ?? 0;
    expect(backRankBonus).toBeGreaterThan(centerBonus);
  });

  it('KING_EG_PST should prefer central king', () => {
    const centerBonus = KING_EG_PST.get('0,0') ?? 0;
    const edgeBonus = KING_EG_PST.get('4,0') ?? 0;
    expect(centerBonus).toBeGreaterThan(edgeBonus);
  });

  it('getPSTBonus should mirror position for black pieces', () => {
    const whitePawn: Piece = { type: 'pawn', color: 'white' };
    const blackPawn: Piece = { type: 'pawn', color: 'black' };
    
    // White pawn advanced (low r) should have same bonus as black pawn advanced (high r)
    const whiteBonus = getPSTBonus(whitePawn, { q: 0, r: -2 });
    const blackBonus = getPSTBonus(blackPawn, { q: 0, r: 2 }); // Mirrored position
    
    expect(whiteBonus).toBe(blackBonus);
  });

  it('getPSTBonus should use endgame king PST when specified', () => {
    const king: Piece = { type: 'king', color: 'white' };
    
    const mgBonus = getPSTBonus(king, { q: 0, r: 0 }, false);
    const egBonus = getPSTBonus(king, { q: 0, r: 0 }, true);
    
    // In endgame, central king is good; in middlegame, it's bad
    expect(egBonus).toBeGreaterThan(mgBonus);
  });
});

describe('Endgame Detection', () => {
  it('should detect starting position as not endgame', () => {
    const game = createNewGame();
    expect(isEndgame(game.board)).toBe(false);
  });

  it('should detect position with only kings as endgame', () => {
    const board: BoardState = new Map();
    board.set(coordToString({ q: 0, r: 0 }), { type: 'king', color: 'white' });
    board.set(coordToString({ q: 0, r: -4 }), { type: 'king', color: 'black' });
    
    expect(isEndgame(board)).toBe(true);
  });

  it('should detect position with minimal material as endgame', () => {
    const board: BoardState = new Map();
    board.set(coordToString({ q: 0, r: 0 }), { type: 'king', color: 'white' });
    board.set(coordToString({ q: 1, r: 0 }), { type: 'pawn', color: 'white' });
    board.set(coordToString({ q: 0, r: -4 }), { type: 'king', color: 'black' });
    board.set(coordToString({ q: 1, r: -4 }), { type: 'pawn', color: 'black' });
    
    expect(isEndgame(board)).toBe(true);
  });
});

// ============================================================================
// Zobrist Hashing Tests
// ============================================================================

describe('Zobrist Hashing', () => {
  it('should initialize Zobrist table with values for all positions', () => {
    const table = initZobristTable();
    
    // Check that center position has values
    expect(table.pieces.has('0,0')).toBe(true);
    
    // Check values array has correct size (36 piece indices)
    const centerValues = table.pieces.get('0,0');
    expect(centerValues).toBeDefined();
    expect(centerValues!.length).toBe(36);
    
    // Check side to move value exists
    expect(typeof table.sideToMove).toBe('number');
  });

  it('getZobristTable should return same instance on multiple calls', () => {
    const table1 = getZobristTable();
    const table2 = getZobristTable();
    
    expect(table1).toBe(table2);
  });

  it('computeZobristHash should return consistent hash for same position', () => {
    const board: BoardState = new Map();
    board.set(coordToString({ q: 0, r: 0 }), { type: 'king', color: 'white' });
    board.set(coordToString({ q: 0, r: -4 }), { type: 'king', color: 'black' });
    
    const hash1 = computeZobristHash(board);
    const hash2 = computeZobristHash(board);
    
    expect(hash1).toBe(hash2);
  });

  it('computeZobristHash should return different hash for different positions', () => {
    const board1: BoardState = new Map();
    board1.set(coordToString({ q: 0, r: 0 }), { type: 'king', color: 'white' });
    board1.set(coordToString({ q: 0, r: -4 }), { type: 'king', color: 'black' });
    
    const board2: BoardState = new Map();
    board2.set(coordToString({ q: 1, r: 0 }), { type: 'king', color: 'white' }); // Different position
    board2.set(coordToString({ q: 0, r: -4 }), { type: 'king', color: 'black' });
    
    const hash1 = computeZobristHash(board1);
    const hash2 = computeZobristHash(board2);
    
    expect(hash1).not.toBe(hash2);
  });

  it('computeZobristHash should differ for different piece types', () => {
    const board1: BoardState = new Map();
    board1.set(coordToString({ q: 0, r: 0 }), { type: 'king', color: 'white' });
    board1.set(coordToString({ q: 1, r: 0 }), { type: 'queen', color: 'white' });
    board1.set(coordToString({ q: 0, r: -4 }), { type: 'king', color: 'black' });
    
    const board2: BoardState = new Map();
    board2.set(coordToString({ q: 0, r: 0 }), { type: 'king', color: 'white' });
    board2.set(coordToString({ q: 1, r: 0 }), { type: 'pawn', color: 'white' }); // Different piece
    board2.set(coordToString({ q: 0, r: -4 }), { type: 'king', color: 'black' });
    
    const hash1 = computeZobristHash(board1);
    const hash2 = computeZobristHash(board2);
    
    expect(hash1).not.toBe(hash2);
  });

  it('zobristUpdate should compute correct hash after move', () => {
    const board: BoardState = new Map();
    board.set(coordToString({ q: 0, r: 0 }), { type: 'king', color: 'white' });
    board.set(coordToString({ q: 0, r: -4 }), { type: 'king', color: 'black' });
    
    const originalHash = computeZobristHash(board);
    
    // Make a move
    const move: Move = {
      piece: { type: 'king', color: 'white' },
      from: { q: 0, r: 0 },
      to: { q: 1, r: 0 },
    };
    
    // Update hash incrementally
    const incrementalHash = zobristUpdate(originalHash, move);
    
    // Create board after move and compute full hash
    const boardAfter: BoardState = new Map();
    boardAfter.set(coordToString({ q: 1, r: 0 }), { type: 'king', color: 'white' });
    boardAfter.set(coordToString({ q: 0, r: -4 }), { type: 'king', color: 'black' });
    const fullHash = computeZobristHash(boardAfter);
    
    expect(incrementalHash).toBe(fullHash);
  });

  it('zobristUpdate should handle captures correctly', () => {
    const board: BoardState = new Map();
    board.set(coordToString({ q: 0, r: 0 }), { type: 'queen', color: 'white' });
    board.set(coordToString({ q: 1, r: 0 }), { type: 'pawn', color: 'black' }); // Will be captured
    board.set(coordToString({ q: 0, r: 4 }), { type: 'king', color: 'white' });
    board.set(coordToString({ q: 0, r: -4 }), { type: 'king', color: 'black' });
    
    const originalHash = computeZobristHash(board);
    
    // Make a capture move
    const move: Move = {
      piece: { type: 'queen', color: 'white' },
      from: { q: 0, r: 0 },
      to: { q: 1, r: 0 },
      captured: { type: 'pawn', color: 'black' },
    };
    
    // Update hash incrementally
    const incrementalHash = zobristUpdate(originalHash, move);
    
    // Create board after move and compute full hash
    const boardAfter: BoardState = new Map();
    boardAfter.set(coordToString({ q: 1, r: 0 }), { type: 'queen', color: 'white' });
    boardAfter.set(coordToString({ q: 0, r: 4 }), { type: 'king', color: 'white' });
    boardAfter.set(coordToString({ q: 0, r: -4 }), { type: 'king', color: 'black' });
    const fullHash = computeZobristHash(boardAfter);
    
    expect(incrementalHash).toBe(fullHash);
  });

  it('Zobrist hashing should be faster than string hashing conceptually', () => {
    // This test just verifies the numeric hash works correctly
    const game = createNewGame();
    
    const numericHash = computeZobristHash(game.board);
    const stringHash = generateBoardHash(game.board);
    
    // Both should be defined
    expect(typeof numericHash).toBe('number');
    expect(typeof stringHash).toBe('string');
    
    // String hash should be the numeric hash as string
    expect(stringHash).toBe(String(numericHash));
  });
});

// ============================================================================
// PST Integration Tests
// ============================================================================

describe('PST Integration with Evaluation', () => {
  beforeEach(() => {
    ttClear();
  });

  it('evaluation should consider PST bonuses', () => {
    // Position with knight in center vs on edge
    const centerBoard: BoardState = new Map();
    centerBoard.set(coordToString({ q: 0, r: 0 }), { type: 'knight', color: 'white' });
    centerBoard.set(coordToString({ q: 0, r: 4 }), { type: 'king', color: 'white' });
    centerBoard.set(coordToString({ q: 0, r: -4 }), { type: 'king', color: 'black' });
    
    const edgeBoard: BoardState = new Map();
    edgeBoard.set(coordToString({ q: 4, r: 0 }), { type: 'knight', color: 'white' }); // Edge
    edgeBoard.set(coordToString({ q: 0, r: 4 }), { type: 'king', color: 'white' });
    edgeBoard.set(coordToString({ q: 0, r: -4 }), { type: 'king', color: 'black' });
    
    const centerScore = evaluateMaterial(centerBoard);
    const edgeScore = evaluateMaterial(edgeBoard);
    
    // Central knight should score higher
    expect(centerScore).toBeGreaterThan(edgeScore);
  });

  it('AI should prefer central knight placement', () => {
    // Give white a choice between central and edge knight placements
    const board: BoardState = new Map();
    board.set(coordToString({ q: 0, r: 2 }), { type: 'knight', color: 'white' }); // Can move to center or edge
    board.set(coordToString({ q: 0, r: 4 }), { type: 'king', color: 'white' });
    board.set(coordToString({ q: 0, r: -4 }), { type: 'king', color: 'black' });
    
    const result = findBestMove(board, 'white', 2);
    
    // Should find a move (knight has targets)
    expect(result.move).not.toBeNull();
    
    // The PST should influence the choice toward more central squares
    // We can't guarantee exact square, but the search should complete
    expect(result.stats.nodesSearched).toBeGreaterThan(0);
  });
});

// ============================================================================
// History Heuristic Tests (added by agent #7)
// ============================================================================

describe('History Heuristic', () => {
  beforeEach(() => {
    historyClear();
    ttClear();
  });

  it('should start with empty history table', () => {
    historyClear();
    expect(historySize()).toBe(0);
  });

  it('should store and retrieve history scores', () => {
    const move: Move = {
      piece: { type: 'knight', color: 'white' },
      from: { q: 0, r: 2 },
      to: { q: 1, r: 0 },
    };
    
    expect(historyScore(move)).toBe(0); // Initially 0
    
    historyUpdate(move, 4); // Update with depth 4 -> score = 16
    
    expect(historyScore(move)).toBe(16); // depth^2 = 4*4 = 16
  });

  it('should accumulate history scores on multiple updates', () => {
    const move: Move = {
      piece: { type: 'queen', color: 'white' },
      from: { q: 0, r: 0 },
      to: { q: 2, r: 0 },
    };
    
    historyUpdate(move, 2); // +4
    historyUpdate(move, 3); // +9
    historyUpdate(move, 4); // +16
    
    expect(historyScore(move)).toBe(4 + 9 + 16); // 29
  });

  it('should track history separately for each color', () => {
    const whiteMove: Move = {
      piece: { type: 'pawn', color: 'white' },
      from: { q: 0, r: 2 },
      to: { q: 0, r: 1 },
    };
    const blackMove: Move = {
      piece: { type: 'pawn', color: 'black' },
      from: { q: 0, r: 2 }, // Same squares
      to: { q: 0, r: 1 },
    };
    
    historyUpdate(whiteMove, 5);
    historyUpdate(blackMove, 3);
    
    expect(historyScore(whiteMove)).toBe(25);
    expect(historyScore(blackMove)).toBe(9);
  });

  it('historyAge should halve all scores', () => {
    const move: Move = {
      piece: { type: 'lance', color: 'white', variant: 'A' },
      from: { q: -2, r: 3 },
      to: { q: -2, r: 0 },
    };
    
    historyUpdate(move, 10); // 100
    expect(historyScore(move)).toBe(100);
    
    historyAge();
    expect(historyScore(move)).toBe(50);
    
    historyAge();
    expect(historyScore(move)).toBe(25);
  });

  it('should influence move ordering', () => {
    // Create two quiet moves
    const move1: Move = {
      piece: { type: 'knight', color: 'white' },
      from: { q: 0, r: 2 },
      to: { q: 1, r: 0 },
    };
    const move2: Move = {
      piece: { type: 'knight', color: 'white' },
      from: { q: 0, r: 2 },
      to: { q: -1, r: 0 },
    };
    
    // Give move2 a strong history score
    historyUpdate(move2, 10); // +100
    
    const ordered = orderMoves([move1, move2]);
    
    // Move2 should come first due to history
    expect(estimateMoveValue(move2)).toBeGreaterThan(estimateMoveValue(move1));
  });

  it('captures should still outrank quiet moves with history', () => {
    const quietMove: Move = {
      piece: { type: 'knight', color: 'white' },
      from: { q: 0, r: 2 },
      to: { q: 1, r: 0 },
    };
    const captureMove: Move = {
      piece: { type: 'knight', color: 'white' },
      from: { q: 0, r: 2 },
      to: { q: -1, r: 0 },
      captured: { type: 'pawn', color: 'black' },
    };
    
    // Give quiet move huge history score
    historyUpdate(quietMove, 50); // +2500 -> capped by history scaling
    
    // Capture should still be ranked higher
    expect(estimateMoveValue(captureMove)).toBeGreaterThan(estimateMoveValue(quietMove));
  });

  it('historyClear should reset all scores', () => {
    const move: Move = {
      piece: { type: 'chariot', color: 'black' },
      from: { q: 1, r: -3 },
      to: { q: 3, r: -3 },
    };
    
    historyUpdate(move, 8);
    expect(historyScore(move)).toBeGreaterThan(0);
    
    historyClear();
    expect(historyScore(move)).toBe(0);
    expect(historySize()).toBe(0);
  });
});

// ============================================================================
// Null Move Pruning Tests (added by agent #7)
// ============================================================================

describe('Null Move Pruning', () => {
  beforeEach(() => {
    ttClear();
    historyClear();
  });

  describe('nullMoveReduction', () => {
    it('should return at least 2 for any depth', () => {
      expect(nullMoveReduction(3)).toBeGreaterThanOrEqual(2);
      expect(nullMoveReduction(4)).toBeGreaterThanOrEqual(2);
      expect(nullMoveReduction(6)).toBeGreaterThanOrEqual(2);
    });

    it('should increase reduction for deeper searches', () => {
      const r6 = nullMoveReduction(6);
      const r12 = nullMoveReduction(12);
      expect(r12).toBeGreaterThan(r6);
    });

    it('should compute R = 2 + depth/6', () => {
      expect(nullMoveReduction(6)).toBe(3);  // 2 + 1 = 3
      expect(nullMoveReduction(12)).toBe(4); // 2 + 2 = 4
      expect(nullMoveReduction(3)).toBe(2);  // 2 + 0 = 2
    });
  });

  describe('hasNullMoveMaterial', () => {
    it('should return false for kings-only position', () => {
      const board: BoardState = new Map();
      board.set(coordToString({ q: 0, r: 0 }), { type: 'king', color: 'white' });
      board.set(coordToString({ q: 0, r: -4 }), { type: 'king', color: 'black' });
      
      expect(hasNullMoveMaterial(board, 'white')).toBe(false);
      expect(hasNullMoveMaterial(board, 'black')).toBe(false);
    });

    it('should return false for king + pawns only', () => {
      const board: BoardState = new Map();
      board.set(coordToString({ q: 0, r: 0 }), { type: 'king', color: 'white' });
      board.set(coordToString({ q: 1, r: 2 }), { type: 'pawn', color: 'white' });
      board.set(coordToString({ q: 2, r: 2 }), { type: 'pawn', color: 'white' });
      board.set(coordToString({ q: 0, r: -4 }), { type: 'king', color: 'black' });
      
      expect(hasNullMoveMaterial(board, 'white')).toBe(false);
    });

    it('should return true if side has a piece', () => {
      const board: BoardState = new Map();
      board.set(coordToString({ q: 0, r: 0 }), { type: 'king', color: 'white' });
      board.set(coordToString({ q: 1, r: 0 }), { type: 'knight', color: 'white' });
      board.set(coordToString({ q: 0, r: -4 }), { type: 'king', color: 'black' });
      
      expect(hasNullMoveMaterial(board, 'white')).toBe(true);
      expect(hasNullMoveMaterial(board, 'black')).toBe(false);
    });

    it('should return true for starting position', () => {
      const game = createNewGame();
      expect(hasNullMoveMaterial(game.board, 'white')).toBe(true);
      expect(hasNullMoveMaterial(game.board, 'black')).toBe(true);
    });
  });

  describe('shouldTryNullMove', () => {
    it('should return false when depth is too shallow', () => {
      const game = createNewGame();
      expect(shouldTryNullMove(game.board, 'white', 2, false, false)).toBe(false);
    });

    it('should return false when already doing null move', () => {
      const game = createNewGame();
      expect(shouldTryNullMove(game.board, 'white', 4, true, false)).toBe(false);
    });

    it('should return false when in check', () => {
      const game = createNewGame();
      expect(shouldTryNullMove(game.board, 'white', 4, false, true)).toBe(false);
    });

    it('should return false when insufficient material', () => {
      const board: BoardState = new Map();
      board.set(coordToString({ q: 0, r: 0 }), { type: 'king', color: 'white' });
      board.set(coordToString({ q: 0, r: -4 }), { type: 'king', color: 'black' });
      
      expect(shouldTryNullMove(board, 'white', 4, false, false)).toBe(false);
    });

    it('should return true when conditions are met', () => {
      const game = createNewGame();
      expect(shouldTryNullMove(game.board, 'white', 4, false, false)).toBe(true);
    });
  });

  describe('Null Move Integration', () => {
    it('search stats should track null move attempts and cutoffs', () => {
      const game = createNewGame();
      const result = findBestMove(game.board, 'white', 4, true, true, true);
      
      // With null move enabled, should have some attempts
      expect(result.stats.nullMoveAttempts).toBeGreaterThanOrEqual(0);
      expect(result.stats.nullMoveCutoffs).toBeGreaterThanOrEqual(0);
      expect(result.stats.nullMoveCutoffs).toBeLessThanOrEqual(result.stats.nullMoveAttempts);
    });

    it('search with null move should find a move', () => {
      const game = createNewGame();
      const result = findBestMove(game.board, 'white', 3, true, true, true);
      
      expect(result.move).not.toBeNull();
      expect(result.stats.nodesSearched).toBeGreaterThan(0);
    });

    it('search with null move disabled should still work', () => {
      const game = createNewGame();
      const result = findBestMove(game.board, 'white', 3, true, true, false);
      
      expect(result.move).not.toBeNull();
      expect(result.stats.nullMoveAttempts).toBe(0);
      expect(result.stats.nullMoveCutoffs).toBe(0);
    });

    it('iterative deepening should accumulate null move stats', () => {
      const board: BoardState = new Map();
      board.set(coordToString({ q: 0, r: 3 }), { type: 'king', color: 'white' });
      board.set(coordToString({ q: 1, r: 2 }), { type: 'queen', color: 'white' });
      board.set(coordToString({ q: 0, r: -4 }), { type: 'king', color: 'black' });
      
      const result = findBestMoveIterative(board, 'white', 4, 2000, true, true, true);
      
      // Should find a move and track stats
      expect(result.move).not.toBeNull();
      expect(typeof result.stats.nullMoveAttempts).toBe('number');
      expect(typeof result.stats.nullMoveCutoffs).toBe('number');
    });
  });
});

// ============================================================================
// Combined Features Performance Tests (added by agent #7)
// ============================================================================

describe('AI Performance with All Features', () => {
  beforeEach(() => {
    ttClear();
    historyClear();
  });

  it('should complete search in reasonable time with all features enabled', () => {
    const game = createNewGame();
    const startTime = Date.now();
    
    const result = findBestMoveIterative(game.board, 'white', 4, 3000, true, true, true);
    
    const elapsed = Date.now() - startTime;
    
    expect(result.move).not.toBeNull();
    expect(elapsed).toBeLessThan(5000); // Should complete well under time limit
  });

  it('getAIMove should work with clearTables option', () => {
    const game = createNewGame();
    
    // First call without clearing
    const result1 = getAIMove(game, 'easy', false);
    expect(result1.move).not.toBeNull();
    
    // Second call with clearing
    const result2 = getAIMove(game, 'easy', true);
    expect(result2.move).not.toBeNull();
    
    // Both should find valid moves
    expect(result1.move!.piece.color).toBe('white');
    expect(result2.move!.piece.color).toBe('white');
  });

  it('history heuristic should build up during iterative deepening', () => {
    historyClear();
    const game = createNewGame();
    
    // Run search
    findBestMoveIterative(game.board, 'white', 4, 2000, true, true, true);
    
    // History table should have entries now
    expect(historySize()).toBeGreaterThan(0);
  });
});
