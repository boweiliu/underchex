/**
 * Underchex AI - Alpha-Beta Search Implementation
 * 
 * Implements:
 * - Piece value evaluation
 * - Positional bonuses (centrality, mobility)
 * - Alpha-beta pruning with iterative deepening
 * - Move ordering for better pruning
 * - Transposition table for caching evaluations (added by agent #5)
 * - Quiescence search for tactical accuracy (added by agent #5)
 * 
 * Signed-by: agent #3 claude-sonnet-4 via opencode 20260122T02:35:07
 * Edited-by: agent #5 claude-sonnet-4 via opencode 20260122T02:52:21
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
// Transposition Table
// ============================================================================

/**
 * Entry types for transposition table.
 * - EXACT: The stored score is the exact minimax value
 * - LOWER: The stored score is a lower bound (beta cutoff)
 * - UPPER: The stored score is an upper bound (alpha cutoff)
 */
export type TTEntryType = 'exact' | 'lower' | 'upper';

/**
 * Transposition table entry.
 */
export interface TTEntry {
  score: number;
  depth: number;
  type: TTEntryType;
  bestMove: Move | null;
}

/**
 * Generate a hash key for a board position.
 * Simple string-based hash - good enough for moderate table sizes.
 */
export function generateBoardHash(board: BoardState): string {
  const entries: string[] = [];
  for (const [pos, piece] of board.entries()) {
    entries.push(`${pos}:${piece.type}${piece.color[0]}${piece.variant ?? ''}`);
  }
  // Sort for deterministic ordering
  entries.sort();
  return entries.join('|');
}

/**
 * Global transposition table.
 * Using a Map with string keys for simplicity.
 * In production, you'd use Zobrist hashing with a fixed-size array.
 */
const transpositionTable = new Map<string, TTEntry>();

/**
 * Maximum transposition table size (entries).
 * Clear oldest entries when exceeded.
 */
const MAX_TT_SIZE = 100000;

/**
 * Store a position in the transposition table.
 */
export function ttStore(
  board: BoardState,
  depth: number,
  score: number,
  type: TTEntryType,
  bestMove: Move | null
): void {
  // Simple size management - clear half the table when full
  if (transpositionTable.size >= MAX_TT_SIZE) {
    const keysToDelete = Array.from(transpositionTable.keys()).slice(0, MAX_TT_SIZE / 2);
    for (const key of keysToDelete) {
      transpositionTable.delete(key);
    }
  }
  
  const hash = generateBoardHash(board);
  const existing = transpositionTable.get(hash);
  
  // Only replace if new entry has equal or greater depth
  if (!existing || existing.depth <= depth) {
    transpositionTable.set(hash, { score, depth, type, bestMove });
  }
}

/**
 * Probe the transposition table for a position.
 */
export function ttProbe(board: BoardState): TTEntry | undefined {
  const hash = generateBoardHash(board);
  return transpositionTable.get(hash);
}

/**
 * Clear the transposition table.
 */
export function ttClear(): void {
  transpositionTable.clear();
}

/**
 * Get transposition table size (for stats).
 */
export function ttSize(): number {
  return transpositionTable.size;
}

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
// Quiescence Search
// ============================================================================

/**
 * Maximum depth for quiescence search.
 * Prevents explosion in positions with many captures.
 */
const MAX_QUIESCENCE_DEPTH = 8;

/**
 * Check if a move is a capture or promotion (tactical move).
 */
export function isTacticalMove(move: Move): boolean {
  return move.captured !== undefined || move.promotion !== undefined;
}

/**
 * Generate only tactical moves (captures and promotions).
 */
export function generateTacticalMoves(board: BoardState, color: Color): Move[] {
  const allMoves = generateAllLegalMoves(board, color);
  return allMoves.filter(isTacticalMove);
}

/**
 * Quiescence search - extends search until position is "quiet".
 * Prevents horizon effect where the AI misses obvious captures.
 * 
 * @param board Current board state
 * @param alpha Best score for maximizing player
 * @param beta Best score for minimizing player
 * @param maximizing True if current player is maximizing (white)
 * @param stats Statistics object to update
 * @param qDepth Current quiescence depth
 * @returns Evaluation score
 */
function quiescenceSearch(
  board: BoardState,
  alpha: number,
  beta: number,
  maximizing: boolean,
  stats: SearchStats,
  qDepth: number = 0
): number {
  stats.nodesSearched++;
  stats.quiescenceNodes++;
  
  // Stand-pat score (evaluation if we don't make any tactical move)
  const standPat = evaluatePosition(board);
  
  if (maximizing) {
    if (standPat >= beta) {
      return beta; // Beta cutoff
    }
    alpha = Math.max(alpha, standPat);
  } else {
    if (standPat <= alpha) {
      return alpha; // Alpha cutoff
    }
    beta = Math.min(beta, standPat);
  }
  
  // Stop if we've searched too deep in quiescence
  if (qDepth >= MAX_QUIESCENCE_DEPTH) {
    return standPat;
  }
  
  const color: Color = maximizing ? 'white' : 'black';
  const tacticalMoves = generateTacticalMoves(board, color);
  
  // No tactical moves - position is quiet
  if (tacticalMoves.length === 0) {
    return standPat;
  }
  
  // Order moves (captures of valuable pieces first)
  const orderedMoves = orderMoves(tacticalMoves);
  
  if (maximizing) {
    for (const move of orderedMoves) {
      const newBoard = applyMove(board, move);
      const score = quiescenceSearch(newBoard, alpha, beta, false, stats, qDepth + 1);
      
      if (score >= beta) {
        stats.cutoffs++;
        return beta;
      }
      alpha = Math.max(alpha, score);
    }
    return alpha;
  } else {
    for (const move of orderedMoves) {
      const newBoard = applyMove(board, move);
      const score = quiescenceSearch(newBoard, alpha, beta, true, stats, qDepth + 1);
      
      if (score <= alpha) {
        stats.cutoffs++;
        return alpha;
      }
      beta = Math.min(beta, score);
    }
    return beta;
  }
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
  ttHits: number;
  quiescenceNodes: number;
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
 * Alpha-beta search with pruning, transposition table, and quiescence search.
 * 
 * @param board Current board state
 * @param depth Remaining search depth
 * @param alpha Best score for maximizing player
 * @param beta Best score for minimizing player
 * @param maximizing True if current player is maximizing (white)
 * @param stats Statistics object to update
 * @param useTT Whether to use transposition table (default true)
 * @param useQuiescence Whether to use quiescence search (default true)
 * @returns Evaluation score
 */
function alphaBeta(
  board: BoardState,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  stats: SearchStats,
  useTT: boolean = true,
  useQuiescence: boolean = true
): number {
  stats.nodesSearched++;
  
  const originalAlpha = alpha;
  const color: Color = maximizing ? 'white' : 'black';
  
  // Probe transposition table
  if (useTT) {
    const ttEntry = ttProbe(board);
    if (ttEntry && ttEntry.depth >= depth) {
      stats.ttHits++;
      if (ttEntry.type === 'exact') {
        return ttEntry.score;
      } else if (ttEntry.type === 'lower') {
        alpha = Math.max(alpha, ttEntry.score);
      } else if (ttEntry.type === 'upper') {
        beta = Math.min(beta, ttEntry.score);
      }
      
      if (alpha >= beta) {
        return ttEntry.score;
      }
    }
  }
  
  const moves = generateAllLegalMoves(board, color);
  
  // Terminal node checks
  if (moves.length === 0) {
    if (isInCheck(board, color)) {
      // Checkmate - very bad for the current player
      // Add depth bonus to prefer quicker mates
      return maximizing ? -CHECKMATE_VALUE + depth : CHECKMATE_VALUE - depth;
    } else {
      // Stalemate
      return STALEMATE_VALUE;
    }
  }
  
  // Leaf node - use quiescence search or static evaluation
  if (depth === 0) {
    if (useQuiescence) {
      return quiescenceSearch(board, alpha, beta, maximizing, stats);
    }
    return evaluatePosition(board);
  }
  
  // Order moves for better pruning
  // If we have a TT hit with a best move, try that first
  let orderedMoves: Move[];
  if (useTT) {
    const ttEntry = ttProbe(board);
    if (ttEntry?.bestMove) {
      // Put TT best move first
      const otherMoves = moves.filter(m => 
        m.from.q !== ttEntry.bestMove!.from.q || 
        m.from.r !== ttEntry.bestMove!.from.r ||
        m.to.q !== ttEntry.bestMove!.to.q ||
        m.to.r !== ttEntry.bestMove!.to.r
      );
      orderedMoves = [ttEntry.bestMove, ...orderMoves(otherMoves)];
    } else {
      orderedMoves = orderMoves(moves);
    }
  } else {
    orderedMoves = orderMoves(moves);
  }
  
  let bestMove: Move | null = null;
  
  if (maximizing) {
    let maxEval = -Infinity;
    
    for (const move of orderedMoves) {
      const newBoard = applyMove(board, move);
      const evalScore = alphaBeta(newBoard, depth - 1, alpha, beta, false, stats, useTT, useQuiescence);
      
      if (evalScore > maxEval) {
        maxEval = evalScore;
        bestMove = move;
      }
      alpha = Math.max(alpha, evalScore);
      
      if (beta <= alpha) {
        stats.cutoffs++;
        break; // Beta cutoff
      }
    }
    
    // Store in transposition table
    if (useTT) {
      const ttType: TTEntryType = maxEval <= originalAlpha ? 'upper' 
        : maxEval >= beta ? 'lower' 
        : 'exact';
      ttStore(board, depth, maxEval, ttType, bestMove);
    }
    
    return maxEval;
  } else {
    let minEval = Infinity;
    
    for (const move of orderedMoves) {
      const newBoard = applyMove(board, move);
      const evalScore = alphaBeta(newBoard, depth - 1, alpha, beta, true, stats, useTT, useQuiescence);
      
      if (evalScore < minEval) {
        minEval = evalScore;
        bestMove = move;
      }
      beta = Math.min(beta, evalScore);
      
      if (beta <= alpha) {
        stats.cutoffs++;
        break; // Alpha cutoff
      }
    }
    
    // Store in transposition table
    if (useTT) {
      const ttType: TTEntryType = minEval >= beta ? 'lower'
        : minEval <= originalAlpha ? 'upper'
        : 'exact';
      ttStore(board, depth, minEval, ttType, bestMove);
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
 * @param useTT Whether to use transposition table
 * @param useQuiescence Whether to use quiescence search
 * @returns Best move and evaluation
 */
export function findBestMove(
  board: BoardState,
  color: Color,
  depth: number = 4,
  useTT: boolean = true,
  useQuiescence: boolean = true
): SearchResult {
  const stats: SearchStats = {
    nodesSearched: 0,
    cutoffs: 0,
    maxDepthReached: depth,
    ttHits: 0,
    quiescenceNodes: 0,
  };
  
  const moves = generateAllLegalMoves(board, color);
  
  if (moves.length === 0) {
    return { move: null, score: 0, stats };
  }
  
  const maximizing = color === 'white';
  
  // Check TT for best move from previous search
  let orderedMoves: Move[];
  if (useTT) {
    const ttEntry = ttProbe(board);
    if (ttEntry?.bestMove) {
      const otherMoves = moves.filter(m => 
        m.from.q !== ttEntry.bestMove!.from.q || 
        m.from.r !== ttEntry.bestMove!.from.r ||
        m.to.q !== ttEntry.bestMove!.to.q ||
        m.to.r !== ttEntry.bestMove!.to.r
      );
      orderedMoves = [ttEntry.bestMove, ...orderMoves(otherMoves)];
    } else {
      orderedMoves = orderMoves(moves);
    }
  } else {
    orderedMoves = orderMoves(moves);
  }
  
  let bestMove = orderedMoves[0]!;
  let bestScore = maximizing ? -Infinity : Infinity;
  let alpha = -Infinity;
  let beta = Infinity;
  
  for (const move of orderedMoves) {
    const newBoard = applyMove(board, move);
    const evalScore = alphaBeta(newBoard, depth - 1, alpha, beta, !maximizing, stats, useTT, useQuiescence);
    
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
  
  // Store the best move in TT for the root position
  if (useTT) {
    ttStore(board, depth, bestScore, 'exact', bestMove);
  }
  
  return { move: bestMove, score: bestScore, stats };
}

/**
 * Find best move using iterative deepening.
 * Searches at increasing depths until time limit is reached.
 * Transposition table is preserved across depths for better move ordering.
 * 
 * @param board Current board state
 * @param color Color to find best move for
 * @param maxDepth Maximum search depth
 * @param timeLimitMs Time limit in milliseconds (optional)
 * @param useTT Whether to use transposition table
 * @param useQuiescence Whether to use quiescence search
 * @returns Best move found
 */
export function findBestMoveIterative(
  board: BoardState,
  color: Color,
  maxDepth: number = 6,
  timeLimitMs: number = 5000,
  useTT: boolean = true,
  useQuiescence: boolean = true
): SearchResult {
  const startTime = Date.now();
  let bestResult: SearchResult = { 
    move: null, 
    score: 0, 
    stats: { nodesSearched: 0, cutoffs: 0, maxDepthReached: 0, ttHits: 0, quiescenceNodes: 0 } 
  };
  
  // Accumulate stats across all depths
  let totalNodes = 0;
  let totalCutoffs = 0;
  let totalTTHits = 0;
  let totalQNodes = 0;
  
  // Get initial moves quickly at depth 1
  const initialResult = findBestMove(board, color, 1, useTT, useQuiescence);
  bestResult = initialResult;
  totalNodes += initialResult.stats.nodesSearched;
  totalCutoffs += initialResult.stats.cutoffs;
  totalTTHits += initialResult.stats.ttHits;
  totalQNodes += initialResult.stats.quiescenceNodes;
  
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
    
    const result = findBestMove(board, color, depth, useTT, useQuiescence);
    bestResult = result;
    totalNodes += result.stats.nodesSearched;
    totalCutoffs += result.stats.cutoffs;
    totalTTHits += result.stats.ttHits;
    totalQNodes += result.stats.quiescenceNodes;
    
    // If we found a winning move, stop searching
    if (Math.abs(result.score) > CHECKMATE_VALUE - 1000) {
      break;
    }
  }
  
  // Update stats with totals
  bestResult.stats.nodesSearched = totalNodes;
  bestResult.stats.cutoffs = totalCutoffs;
  bestResult.stats.ttHits = totalTTHits;
  bestResult.stats.quiescenceNodes = totalQNodes;
  
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
 * @param clearTT Whether to clear transposition table (default false, set true for new games)
 * @returns Best move or null if game is over
 */
export function getAIMove(
  state: GameState,
  difficulty: AIDifficulty = 'medium',
  clearTT: boolean = false
): SearchResult {
  if (state.status.type !== 'ongoing') {
    return { 
      move: null, 
      score: 0, 
      stats: { nodesSearched: 0, cutoffs: 0, maxDepthReached: 0, ttHits: 0, quiescenceNodes: 0 } 
    };
  }
  
  if (clearTT) {
    ttClear();
  }
  
  const params = getDifficultyParams(difficulty);
  return findBestMoveIterative(state.board, state.turn, params.depth, params.timeLimit);
}
