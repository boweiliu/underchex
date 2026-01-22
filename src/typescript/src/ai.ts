/**
 * Underchex AI - Alpha-Beta Search Implementation
 * 
 * Implements:
 * - Piece value evaluation
 * - Positional bonuses (centrality, mobility)
 * - Alpha-beta pruning with iterative deepening
 * - Move ordering for better pruning
 * 
 * Signed-by: agent #3 claude-sonnet-4 via opencode 20260122T02:35:07
 */

import {
  HexCoord,
  Piece,
  PieceType,
  Color,
  BoardState,
  GameState,
  Move,
  BOARD_RADIUS,
  coordToString,
  oppositeColor,
} from './types';

import {
  generateAllLegalMoves,
  applyMove,
  isInCheck,
  getPieceAt,
} from './moves';

import { isValidCell, hexDistance } from './board';

// ============================================================================
// Piece Values
// ============================================================================

/**
 * Base material values for pieces (in centipawns).
 * Values are similar to standard chess but adjusted for hex mechanics.
 */
export const PIECE_VALUES: Record<PieceType, number> = {
  pawn: 100,
  knight: 300,   // Slightly weaker than standard (limited movement patterns)
  lance: 450,    // Between knight and queen (4 directions, infinite range)
  chariot: 450,  // Same as lance (4 diagonal directions)
  queen: 900,    // Strong piece (6 directions, infinite range)
  king: 0,       // King has no material value (game ends on capture)
};

/**
 * Value for checkmate (high enough to always prefer it).
 */
export const CHECKMATE_VALUE = 100000;

/**
 * Value for stalemate (draw).
 */
export const STALEMATE_VALUE = 0;

// ============================================================================
// Position Evaluation
// ============================================================================

/**
 * Calculate centrality bonus for a position.
 * Pieces closer to the center are generally stronger on a hex board.
 * Returns value in centipawns.
 */
export function getCentralityBonus(coord: HexCoord): number {
  const distanceFromCenter = hexDistance(coord, { q: 0, r: 0 });
  // Max distance is BOARD_RADIUS (4), so bonus decreases from center
  const centralityScore = BOARD_RADIUS - distanceFromCenter;
  return centralityScore * 5; // 5 centipawns per ring closer to center
}

/**
 * Calculate pawn advancement bonus.
 * Pawns that are closer to promotion are more valuable.
 */
export function getPawnAdvancementBonus(coord: HexCoord, color: Color): number {
  // White advances toward r=-4, black toward r=4
  const targetR = color === 'white' ? -BOARD_RADIUS : BOARD_RADIUS;
  const startR = color === 'white' ? BOARD_RADIUS : -BOARD_RADIUS;
  
  // Calculate progress (0 to 1)
  const totalDistance = Math.abs(targetR - startR);
  const distanceFromStart = Math.abs(coord.r - startR);
  const progress = distanceFromStart / totalDistance;
  
  // Exponential bonus for advanced pawns
  return Math.floor(progress * progress * 50);
}

/**
 * Evaluate piece position bonus (beyond material).
 */
export function getPiecePositionBonus(piece: Piece, coord: HexCoord): number {
  let bonus = getCentralityBonus(coord);
  
  if (piece.type === 'pawn') {
    bonus += getPawnAdvancementBonus(coord, piece.color);
  }
  
  // King safety: penalize central king in early/mid game
  // (This is a simplification - could be enhanced with game phase detection)
  if (piece.type === 'king') {
    const distFromCenter = hexDistance(coord, { q: 0, r: 0 });
    if (distFromCenter < 2) {
      bonus -= 30; // Penalize exposed king
    }
  }
  
  return bonus;
}

/**
 * Evaluate material balance for a board position.
 * Returns value from white's perspective in centipawns.
 */
export function evaluateMaterial(board: BoardState): number {
  let score = 0;
  
  for (const [posStr, piece] of board.entries()) {
    const value = PIECE_VALUES[piece.type];
    const parts = posStr.split(',').map(Number);
    const coord: HexCoord = { q: parts[0] ?? 0, r: parts[1] ?? 0 };
    const positionBonus = getPiecePositionBonus(piece, coord);
    
    const totalValue = value + positionBonus;
    
    if (piece.color === 'white') {
      score += totalValue;
    } else {
      score -= totalValue;
    }
  }
  
  return score;
}

/**
 * Evaluate mobility (number of legal moves).
 * More mobility generally means a stronger position.
 */
export function evaluateMobility(board: BoardState, color: Color): number {
  const moves = generateAllLegalMoves(board, color);
  // 2 centipawns per legal move
  return moves.length * 2;
}

/**
 * Full position evaluation.
 * Returns value from white's perspective in centipawns.
 */
export function evaluatePosition(board: BoardState): number {
  let score = evaluateMaterial(board);
  
  // Add mobility difference
  const whiteMobility = evaluateMobility(board, 'white');
  const blackMobility = evaluateMobility(board, 'black');
  score += whiteMobility - blackMobility;
  
  // Check bonus (being in check is bad)
  if (isInCheck(board, 'white')) {
    score -= 50;
  }
  if (isInCheck(board, 'black')) {
    score += 50;
  }
  
  return score;
}

/**
 * Evaluate position from the perspective of a specific color.
 */
export function evaluateForColor(board: BoardState, color: Color): number {
  const whiteScore = evaluatePosition(board);
  return color === 'white' ? whiteScore : -whiteScore;
}

// ============================================================================
// Move Ordering
// ============================================================================

/**
 * Estimate move value for ordering (higher is better).
 * Good move ordering improves alpha-beta pruning efficiency.
 */
export function estimateMoveValue(move: Move): number {
  let score = 0;
  
  // Captures: MVV-LVA (Most Valuable Victim - Least Valuable Attacker)
  if (move.captured) {
    const victimValue = PIECE_VALUES[move.captured.type];
    const attackerValue = PIECE_VALUES[move.piece.type];
    score += victimValue * 10 - attackerValue; // Prioritize capturing valuable pieces
  }
  
  // Promotions are very valuable
  if (move.promotion) {
    score += PIECE_VALUES[move.promotion] - PIECE_VALUES['pawn'];
  }
  
  // Centrality bonus for destination
  score += getCentralityBonus(move.to);
  
  return score;
}

/**
 * Sort moves by estimated value (best first).
 */
export function orderMoves(moves: Move[]): Move[] {
  return [...moves].sort((a, b) => estimateMoveValue(b) - estimateMoveValue(a));
}

// ============================================================================
// Alpha-Beta Search
// ============================================================================

/**
 * Search statistics for debugging/tuning.
 */
export interface SearchStats {
  nodesSearched: number;
  cutoffs: number;
  maxDepthReached: number;
}

/**
 * Search result containing best move and evaluation.
 */
export interface SearchResult {
  move: Move | null;
  score: number;
  stats: SearchStats;
}

/**
 * Alpha-beta search with pruning.
 * 
 * @param board Current board state
 * @param depth Remaining search depth
 * @param alpha Best score for maximizing player
 * @param beta Best score for minimizing player
 * @param maximizing True if current player is maximizing (white)
 * @param stats Statistics object to update
 * @returns Evaluation score
 */
function alphaBeta(
  board: BoardState,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  stats: SearchStats
): number {
  stats.nodesSearched++;
  stats.maxDepthReached = Math.max(stats.maxDepthReached, stats.nodesSearched);
  
  const color: Color = maximizing ? 'white' : 'black';
  const moves = generateAllLegalMoves(board, color);
  
  // Terminal node checks
  if (moves.length === 0) {
    if (isInCheck(board, color)) {
      // Checkmate - very bad for the current player
      return maximizing ? -CHECKMATE_VALUE + stats.nodesSearched : CHECKMATE_VALUE - stats.nodesSearched;
    } else {
      // Stalemate
      return STALEMATE_VALUE;
    }
  }
  
  // Leaf node - evaluate position
  if (depth === 0) {
    return evaluatePosition(board);
  }
  
  // Order moves for better pruning
  const orderedMoves = orderMoves(moves);
  
  if (maximizing) {
    let maxEval = -Infinity;
    
    for (const move of orderedMoves) {
      const newBoard = applyMove(board, move);
      const evalScore = alphaBeta(newBoard, depth - 1, alpha, beta, false, stats);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      
      if (beta <= alpha) {
        stats.cutoffs++;
        break; // Beta cutoff
      }
    }
    
    return maxEval;
  } else {
    let minEval = Infinity;
    
    for (const move of orderedMoves) {
      const newBoard = applyMove(board, move);
      const evalScore = alphaBeta(newBoard, depth - 1, alpha, beta, true, stats);
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      
      if (beta <= alpha) {
        stats.cutoffs++;
        break; // Alpha cutoff
      }
    }
    
    return minEval;
  }
}

/**
 * Find the best move for the given color using alpha-beta search.
 * 
 * @param board Current board state
 * @param color Color to find best move for
 * @param depth Search depth (higher = stronger but slower)
 * @returns Best move and evaluation
 */
export function findBestMove(
  board: BoardState,
  color: Color,
  depth: number = 4
): SearchResult {
  const stats: SearchStats = {
    nodesSearched: 0,
    cutoffs: 0,
    maxDepthReached: 0,
  };
  
  const moves = generateAllLegalMoves(board, color);
  
  if (moves.length === 0) {
    return { move: null, score: 0, stats };
  }
  
  const maximizing = color === 'white';
  const orderedMoves = orderMoves(moves);
  
  let bestMove = orderedMoves[0]!;
  let bestScore = maximizing ? -Infinity : Infinity;
  let alpha = -Infinity;
  let beta = Infinity;
  
  for (const move of orderedMoves) {
    const newBoard = applyMove(board, move);
    const evalScore = alphaBeta(newBoard, depth - 1, alpha, beta, !maximizing, stats);
    
    if (maximizing) {
      if (evalScore > bestScore) {
        bestScore = evalScore;
        bestMove = move;
      }
      alpha = Math.max(alpha, evalScore);
    } else {
      if (evalScore < bestScore) {
        bestScore = evalScore;
        bestMove = move;
      }
      beta = Math.min(beta, evalScore);
    }
  }
  
  return { move: bestMove, score: bestScore, stats };
}

/**
 * Find best move using iterative deepening.
 * Searches at increasing depths until time limit is reached.
 * 
 * @param board Current board state
 * @param color Color to find best move for
 * @param maxDepth Maximum search depth
 * @param timeLimitMs Time limit in milliseconds (optional)
 * @returns Best move found
 */
export function findBestMoveIterative(
  board: BoardState,
  color: Color,
  maxDepth: number = 6,
  timeLimitMs: number = 5000
): SearchResult {
  const startTime = Date.now();
  let bestResult: SearchResult = { move: null, score: 0, stats: { nodesSearched: 0, cutoffs: 0, maxDepthReached: 0 } };
  
  // Get initial moves quickly at depth 1
  const initialResult = findBestMove(board, color, 1);
  bestResult = initialResult;
  bestResult.stats.maxDepthReached = 1;
  
  for (let depth = 2; depth <= maxDepth; depth++) {
    const elapsed = Date.now() - startTime;
    if (elapsed > timeLimitMs) {
      break;
    }
    
    // Only continue if we have time remaining
    const remainingTime = timeLimitMs - elapsed;
    if (remainingTime < 50) { // Need at least 50ms to do meaningful work
      break;
    }
    
    const result = findBestMove(board, color, depth);
    bestResult = result;
    bestResult.stats.maxDepthReached = depth;
    
    // If we found a winning move, stop searching
    if (Math.abs(result.score) > CHECKMATE_VALUE - 1000) {
      break;
    }
  }
  
  return bestResult;
}

// ============================================================================
// Game-Level AI Interface
// ============================================================================

/**
 * AI difficulty levels.
 */
export type AIDifficulty = 'easy' | 'medium' | 'hard';

/**
 * Get search parameters for difficulty level.
 */
export function getDifficultyParams(difficulty: AIDifficulty): { depth: number; timeLimit: number } {
  switch (difficulty) {
    case 'easy':
      return { depth: 2, timeLimit: 1000 };
    case 'medium':
      return { depth: 4, timeLimit: 3000 };
    case 'hard':
      return { depth: 6, timeLimit: 10000 };
  }
}

/**
 * Get AI move for current game state.
 * 
 * @param state Current game state
 * @param difficulty AI difficulty level
 * @returns Best move or null if game is over
 */
export function getAIMove(
  state: GameState,
  difficulty: AIDifficulty = 'medium'
): SearchResult {
  if (state.status.type !== 'ongoing') {
    return { move: null, score: 0, stats: { nodesSearched: 0, cutoffs: 0, maxDepthReached: 0 } };
  }
  
  const params = getDifficultyParams(difficulty);
  return findBestMoveIterative(state.board, state.turn, params.depth, params.timeLimit);
}
