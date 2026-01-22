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
 * - Piece-Square Tables (PST) for nuanced positional evaluation (added by agent #6)
 * - Zobrist hashing for fast transposition table lookups (added by agent #6)
 * - Endgame detection for king PST switching (added by agent #6)
 * 
 * Signed-by: agent #3 claude-sonnet-4 via opencode 20260122T02:35:07
 * Edited-by: agent #5 claude-sonnet-4 via opencode 20260122T02:52:21
 * Edited-by: agent #6 claude-sonnet-4 via opencode 20260122T03:06:11
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
// Zobrist Hashing
// ============================================================================

/**
 * Zobrist hashing provides fast, incremental board hashing.
 * Each piece-position combination has a unique random number.
 * The hash is computed by XORing all active piece-position values.
 * 
 * Benefits over string hashing:
 * - O(1) incremental updates when making/unmaking moves
 * - Numeric keys for faster Map operations
 * - Lower memory overhead
 * 
 * Signed-by: agent #6 claude-sonnet-4 via opencode 20260122T03:06:11
 */

/**
 * All piece types for Zobrist table indexing.
 */
const PIECE_TYPES: readonly PieceType[] = ['pawn', 'knight', 'lance', 'chariot', 'queen', 'king'];

/**
 * Piece colors for Zobrist table indexing.
 */
const COLORS: readonly Color[] = ['white', 'black'];

/**
 * Lance variants for Zobrist table.
 */
const LANCE_VARIANTS: readonly (string | undefined)[] = [undefined, 'A', 'B'];

/**
 * Simple seeded PRNG for reproducible random numbers.
 * Uses xorshift32 algorithm for speed and simplicity.
 */
function createRNG(seed: number): () => number {
  let state = seed;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return state >>> 0; // Convert to unsigned 32-bit
  };
}

/**
 * Zobrist hash table structure.
 * Maps: position -> pieceType -> color -> variant -> randomValue
 */
export interface ZobristTable {
  /** Piece-position values: [position][pieceIndex] -> hash value */
  pieces: Map<string, number[]>;
  /** Side to move value (XOR when black to move) */
  sideToMove: number;
}

/**
 * Get piece index for Zobrist table.
 * Encodes pieceType + color + variant into a single index.
 */
function getPieceIndex(piece: Piece): number {
  const typeIndex = PIECE_TYPES.indexOf(piece.type);
  const colorIndex = piece.color === 'white' ? 0 : 1;
  const variantIndex = piece.type === 'lance' 
    ? (piece.variant === 'A' ? 1 : piece.variant === 'B' ? 2 : 0)
    : 0;
  
  // 6 piece types * 2 colors * 3 variants = 36 possible indices
  return typeIndex * 6 + colorIndex * 3 + variantIndex;
}

/**
 * Total number of piece indices (for array sizing).
 */
const NUM_PIECE_INDICES = 36;

/**
 * Initialize Zobrist hash table with random values.
 * Uses a fixed seed for reproducibility across runs.
 */
export function initZobristTable(): ZobristTable {
  const rng = createRNG(0x12345678); // Fixed seed for determinism
  
  const pieces = new Map<string, number[]>();
  
  // Generate random values for each position-piece combination
  for (let q = -BOARD_RADIUS; q <= BOARD_RADIUS; q++) {
    for (let r = -BOARD_RADIUS; r <= BOARD_RADIUS; r++) {
      const s = -q - r;
      if (Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) <= BOARD_RADIUS) {
        const posKey = `${q},${r}`;
        const values: number[] = [];
        for (let i = 0; i < NUM_PIECE_INDICES; i++) {
          values.push(rng());
        }
        pieces.set(posKey, values);
      }
    }
  }
  
  return {
    pieces,
    sideToMove: rng(),
  };
}

/**
 * Global Zobrist table instance (initialized on first use).
 */
let zobristTable: ZobristTable | null = null;

/**
 * Get the Zobrist table, initializing if needed.
 */
export function getZobristTable(): ZobristTable {
  if (!zobristTable) {
    zobristTable = initZobristTable();
  }
  return zobristTable;
}

/**
 * Compute full Zobrist hash for a board position.
 * For incremental updates during search, use zobristUpdate().
 */
export function computeZobristHash(board: BoardState): number {
  const table = getZobristTable();
  let hash = 0;
  
  for (const [posStr, piece] of board.entries()) {
    const pieceValues = table.pieces.get(posStr);
    if (pieceValues) {
      const pieceIndex = getPieceIndex(piece);
      hash ^= pieceValues[pieceIndex]!;
    }
  }
  
  return hash;
}

/**
 * Update Zobrist hash incrementally for a move.
 * XOR out the old position, XOR in the new position.
 * 
 * @param hash Current hash value
 * @param move The move being made
 * @returns Updated hash value
 */
export function zobristUpdate(hash: number, move: Move): number {
  const table = getZobristTable();
  
  const fromKey = `${move.from.q},${move.from.r}`;
  const toKey = `${move.to.q},${move.to.r}`;
  
  const fromValues = table.pieces.get(fromKey);
  const toValues = table.pieces.get(toKey);
  
  if (!fromValues || !toValues) {
    return hash; // Shouldn't happen with valid moves
  }
  
  const pieceIndex = getPieceIndex(move.piece);
  
  // Remove piece from 'from' position
  hash ^= fromValues[pieceIndex]!;
  
  // If there's a capture, remove the captured piece
  if (move.captured) {
    const capturedIndex = getPieceIndex(move.captured);
    hash ^= toValues[capturedIndex]!;
  }
  
  // Add piece to 'to' position (with promotion if applicable)
  if (move.promotion) {
    const promotedPiece: Piece = { 
      type: move.promotion, 
      color: move.piece.color,
      // For lance promotions, we'd need to handle variant - simplified here
      variant: move.promotion === 'lance' ? 'A' : undefined,
    };
    const promotedIndex = getPieceIndex(promotedPiece);
    hash ^= toValues[promotedIndex]!;
  } else {
    hash ^= toValues[pieceIndex]!;
  }
  
  return hash;
}

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
 * Now uses Zobrist hashing for better performance.
 * Returns a string for Map compatibility.
 * 
 * @deprecated Use computeZobristHash() directly for numeric hash.
 */
export function generateBoardHash(board: BoardState): string {
  // Use Zobrist hash converted to string for backward compatibility
  return String(computeZobristHash(board));
}

/**
 * Global transposition table.
 * Now uses numeric Zobrist hashes as keys for faster lookups.
 */
const transpositionTable = new Map<number, TTEntry>();

/**
 * Maximum transposition table size (entries).
 * Clear oldest entries when exceeded.
 */
const MAX_TT_SIZE = 100000;

/**
 * Store a position in the transposition table.
 * Uses Zobrist hashing for fast numeric key lookups.
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
  
  const hash = computeZobristHash(board);
  const existing = transpositionTable.get(hash);
  
  // Only replace if new entry has equal or greater depth
  if (!existing || existing.depth <= depth) {
    transpositionTable.set(hash, { score, depth, type, bestMove });
  }
}

/**
 * Probe the transposition table for a position.
 * Uses Zobrist hashing for fast numeric key lookups.
 */
export function ttProbe(board: BoardState): TTEntry | undefined {
  const hash = computeZobristHash(board);
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
// Piece-Square Tables (PST)
// ============================================================================

/**
 * Piece-Square Tables give positional bonuses for each piece on each cell.
 * Tables are from white's perspective - flip for black.
 * 
 * Design principles for hex board:
 * - Pawns: Encourage advancement and central control
 * - Knights: Prefer central positions with good mobility
 * - Lances/Chariots: Control key files and diagonals
 * - Queen: Central control but not too early
 * - King: Safe positions on the back rank early, more central in endgame
 * 
 * Signed-by: agent #6 claude-sonnet-4 via opencode 20260122T03:06:11
 */

/**
 * PST data type - maps coord string to bonus value in centipawns.
 */
export type PieceSquareTable = Map<string, number>;

/**
 * Generate a coordinate key for PST lookup.
 */
function pstKey(q: number, r: number): string {
  return `${q},${r}`;
}

/**
 * Build a PST from a scoring function that takes (q, r) and returns bonus.
 * Only includes valid board cells.
 */
function buildPST(scoreFn: (q: number, r: number) => number): PieceSquareTable {
  const pst = new Map<string, number>();
  for (let q = -BOARD_RADIUS; q <= BOARD_RADIUS; q++) {
    for (let r = -BOARD_RADIUS; r <= BOARD_RADIUS; r++) {
      const s = -q - r;
      if (Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) <= BOARD_RADIUS) {
        pst.set(pstKey(q, r), scoreFn(q, r));
      }
    }
  }
  return pst;
}

/**
 * Get the mirrored position for black (flip across horizontal axis).
 * Black's perspective: r is negated.
 */
function mirrorForBlack(coord: HexCoord): HexCoord {
  return { q: coord.q, r: -coord.r };
}

/**
 * Calculate hex distance from center (0,0).
 */
function distanceFromCenter(q: number, r: number): number {
  const s = -q - r;
  return Math.max(Math.abs(q), Math.abs(r), Math.abs(s));
}

// ============================================================================
// PST Definitions
// ============================================================================

/**
 * Pawn PST: Encourage advancement and central control.
 * - Big bonuses for advanced pawns (near promotion)
 * - Slight central bias
 * - Small penalty for edge pawns
 */
export const PAWN_PST: PieceSquareTable = buildPST((q, r) => {
  // r = -4 is promotion zone for white, r = 4 is start
  // Advancement bonus: exponential as pawn gets closer to promotion
  const rank = BOARD_RADIUS - r; // 0 at r=4, 8 at r=-4
  const advancementBonus = Math.floor((rank / 8) * (rank / 8) * 40);
  
  // Central file bonus (q = 0 is center)
  const fileBonus = Math.max(0, 10 - Math.abs(q) * 3);
  
  // Slight penalty for edge positions
  const dist = distanceFromCenter(q, r);
  const edgePenalty = dist >= BOARD_RADIUS ? -5 : 0;
  
  return advancementBonus + fileBonus + edgePenalty;
});

/**
 * Knight PST: Prefer central positions with good hop range.
 * - Strong central bonus
 * - Penalty for edge positions (fewer targets)
 */
export const KNIGHT_PST: PieceSquareTable = buildPST((q, r) => {
  const dist = distanceFromCenter(q, r);
  
  // Central knights are very strong
  if (dist === 0) return 25;
  if (dist === 1) return 20;
  if (dist === 2) return 15;
  if (dist === 3) return 5;
  
  // Edge knights are weak
  return -10;
});

/**
 * Lance PST: Control key files (N-S and diagonals).
 * - Bonus for controlling open ranks
 * - Slight central preference
 */
export const LANCE_PST: PieceSquareTable = buildPST((q, r) => {
  const dist = distanceFromCenter(q, r);
  
  // Central lanes are good
  if (Math.abs(q) <= 1) return 10;
  
  // Moderate center preference
  if (dist <= 2) return 5;
  
  return 0;
});

/**
 * Chariot PST: Control diagonal lines.
 * - Bonus for central positions (more targets)
 * - Long diagonals are valuable
 */
export const CHARIOT_PST: PieceSquareTable = buildPST((q, r) => {
  const dist = distanceFromCenter(q, r);
  
  // Central chariots dominate
  if (dist === 0) return 15;
  if (dist === 1) return 12;
  if (dist === 2) return 8;
  
  return 0;
});

/**
 * Queen PST: Central but not overextended.
 * - Strong central bonuses
 * - Safe positions in mid-ring
 */
export const QUEEN_PST: PieceSquareTable = buildPST((q, r) => {
  const dist = distanceFromCenter(q, r);
  
  // Queen loves the center
  if (dist === 0) return 15;
  if (dist === 1) return 12;
  if (dist === 2) return 8;
  if (dist === 3) return 4;
  
  return 0;
});

/**
 * King PST for middlegame: Safe, back-rank positions.
 * - Penalize central exposure
 * - Bonus for back rank (r=3,4 for white)
 */
export const KING_MG_PST: PieceSquareTable = buildPST((q, r) => {
  const dist = distanceFromCenter(q, r);
  
  // Back rank is safe for white (r >= 2)
  if (r >= 3) {
    // Corner-ish positions are safest
    if (Math.abs(q) >= 2) return 20;
    return 10;
  }
  
  if (r >= 2) return 5;
  
  // Central king is dangerous in middlegame
  if (dist <= 1) return -30;
  if (dist === 2) return -15;
  
  return -5;
});

/**
 * King PST for endgame: Central, active king.
 * - Strong central bonus
 * - King should be active
 */
export const KING_EG_PST: PieceSquareTable = buildPST((q, r) => {
  const dist = distanceFromCenter(q, r);
  
  // Active central king in endgame
  if (dist === 0) return 25;
  if (dist === 1) return 20;
  if (dist === 2) return 12;
  if (dist === 3) return 5;
  
  return 0;
});

/**
 * Map from piece type to PST (middlegame).
 */
export const PIECE_SQUARE_TABLES: Record<PieceType, PieceSquareTable> = {
  pawn: PAWN_PST,
  knight: KNIGHT_PST,
  lance: LANCE_PST,
  chariot: CHARIOT_PST,
  queen: QUEEN_PST,
  king: KING_MG_PST,
};

// ============================================================================
// Position Evaluation
// ============================================================================

/**
 * Get PST bonus for a piece at a position.
 * Automatically mirrors for black pieces.
 * 
 * @param piece The piece to evaluate
 * @param coord The position on the board
 * @param isEndgame Whether we're in the endgame (affects king PST)
 * @returns Bonus in centipawns
 */
export function getPSTBonus(piece: Piece, coord: HexCoord, isEndgame: boolean = false): number {
  // Select the appropriate PST
  let pst: PieceSquareTable;
  if (piece.type === 'king') {
    pst = isEndgame ? KING_EG_PST : KING_MG_PST;
  } else {
    pst = PIECE_SQUARE_TABLES[piece.type];
  }
  
  // For black pieces, mirror the position
  const lookupCoord = piece.color === 'white' ? coord : mirrorForBlack(coord);
  const key = pstKey(lookupCoord.q, lookupCoord.r);
  
  return pst.get(key) ?? 0;
}

/**
 * Detect if position is likely an endgame.
 * Simple heuristic: endgame if total material (excluding kings) < threshold.
 */
export function isEndgame(board: BoardState): boolean {
  let totalMaterial = 0;
  for (const piece of board.values()) {
    if (piece.type !== 'king') {
      totalMaterial += PIECE_VALUES[piece.type];
    }
  }
  // Endgame threshold: roughly when each side has < queen + minor piece
  return totalMaterial < 2400;
}

/**
 * Calculate centrality bonus for a position.
 * Pieces closer to the center are generally stronger on a hex board.
 * Returns value in centipawns.
 * 
 * @deprecated Use getPSTBonus instead for piece-specific positional evaluation.
 */
export function getCentralityBonus(coord: HexCoord): number {
  const distanceFromCtr = hexDistance(coord, { q: 0, r: 0 });
  // Max distance is BOARD_RADIUS (4), so bonus decreases from center
  const centralityScore = BOARD_RADIUS - distanceFromCtr;
  return centralityScore * 5; // 5 centipawns per ring closer to center
}

/**
 * Calculate pawn advancement bonus.
 * Pawns that are closer to promotion are more valuable.
 * 
 * @deprecated Integrated into PAWN_PST.
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
 * Now uses Piece-Square Tables for more nuanced positional evaluation.
 */
export function getPiecePositionBonus(piece: Piece, coord: HexCoord, boardState?: BoardState): number {
  const endgame = boardState ? isEndgame(boardState) : false;
  return getPSTBonus(piece, coord, endgame);
}

/**
 * Evaluate material balance for a board position.
 * Returns value from white's perspective in centipawns.
 * Uses piece-square tables for positional bonuses.
 */
export function evaluateMaterial(board: BoardState): number {
  let score = 0;
  const endgame = isEndgame(board);
  
  for (const [posStr, piece] of board.entries()) {
    const value = PIECE_VALUES[piece.type];
    const parts = posStr.split(',').map(Number);
    const coord: HexCoord = { q: parts[0] ?? 0, r: parts[1] ?? 0 };
    const positionBonus = getPSTBonus(piece, coord, endgame);
    
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
