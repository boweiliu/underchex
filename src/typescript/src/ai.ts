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
 * - Null Move Pruning for faster search (added by agent #7)
 * - History Heuristic for improved move ordering (added by agent #7)
 * - Killer Move Heuristic for improved move ordering at each ply (added by agent #8)
 * - Late Move Reductions (LMR) for faster search with adaptive reduction (added by agent #9)
 * - Principal Variation Search (PVS) for faster search (added by agent #11)
 * - Aspiration Windows for faster iterative deepening (added by agent #11)
 * - Futility Pruning for faster search at shallow depths (added by agent #12)
 * - Static Exchange Evaluation (SEE) for accurate capture ordering (added by agent #13)
 * - Opening Book for faster and more varied opening play (added by agent #27)
 * - Endgame Tablebase for perfect endgame play (added by agent #33)
 * 
 * Signed-by: agent #3 claude-sonnet-4 via opencode 20260122T02:35:07
 * Edited-by: agent #5 claude-sonnet-4 via opencode 20260122T02:52:21
 * Edited-by: agent #6 claude-sonnet-4 via opencode 20260122T03:06:11
 * Edited-by: agent #7 claude-sonnet-4 via opencode 20260122T03:17:17
 * Edited-by: agent #8 claude-sonnet-4 via opencode 20260122T03:31:32
 * Edited-by: agent #9 claude-sonnet-4 via opencode 20260122T03:45:57
 * Edited-by: agent #11 claude-sonnet-4 via opencode 20260122T04:18:42
 * Edited-by: agent #13 claude-sonnet-4 via opencode 20260122T04:52:31
 * Edited-by: agent #27 claude-sonnet-4 via opencode 20260122T07:49:00
 * Edited-by: agent #33 claude-sonnet-4 via opencode 20260122T08:51:16
 */

import {
  HexCoord,
  Piece,
  PieceType,
  Color,
  BoardState,
  GameState,
  Move,
  Direction,
  ALL_DIRECTIONS,
  BOARD_RADIUS,
  coordToString,
  oppositeColor,
} from './types';

import {
  generateAllLegalMoves,
  applyMove,
  isInCheck,
  getPieceAt,
  getPieceDirections,
  isSlider,
  getPawnCaptureDirections,
} from './moves';

import { isValidCell, hexDistance, getNeighbor, getRay, getKnightTargets } from './board';

import { lookupBookMove } from './openingbook';

import { probeTablebase, getTablebaseMove, getTablebaseScore } from './tablebase';

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
// Aspiration Window Constants
// ============================================================================

/**
 * Aspiration windows narrow the alpha-beta search window based on the 
 * previous depth's score. If the search fails outside the window, we
 * re-search with a wider window.
 * 
 * Benefits:
 * - Significantly more cutoffs when the score is accurate
 * - Faster search in stable positions
 * - Minimal overhead in tactical positions (re-search is needed anyway)
 * 
 * Signed-by: agent #11 claude-sonnet-4 via opencode 20260122T04:18:42
 */

/**
 * Initial aspiration window size in centipawns.
 * A value around 50 is common - large enough to avoid frequent re-searches,
 * small enough to provide good pruning.
 */
export const ASPIRATION_WINDOW = 50;

/**
 * Multiplier for expanding the window when a search fails outside bounds.
 * Each failure widens the window exponentially.
 */
export const ASPIRATION_WINDOW_EXPANSION = 4;

/**
 * Minimum depth before applying aspiration windows.
 * At shallow depths, the score isn't stable enough to benefit.
 */
export const ASPIRATION_MIN_DEPTH = 3;

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
// History Heuristic
// ============================================================================

/**
 * History Heuristic tracks how often moves cause beta cutoffs.
 * Moves that historically cause more cutoffs are tried earlier.
 * This improves alpha-beta pruning efficiency.
 * 
 * Table structure: [color][fromPos][toPos] -> score
 * 
 * Signed-by: agent #7 claude-sonnet-4 via opencode 20260122T03:17:17
 */

/**
 * History table type - maps from-to string to score for each color.
 */
export interface HistoryTable {
  white: Map<string, number>;
  black: Map<string, number>;
}

/**
 * Global history table.
 */
const historyTable: HistoryTable = {
  white: new Map(),
  black: new Map(),
};

/**
 * Maximum history score (prevents overflow).
 */
const MAX_HISTORY_SCORE = 1000000;

/**
 * Generate key for history table lookup.
 */
function historyKey(from: HexCoord, to: HexCoord): string {
  return `${from.q},${from.r}-${to.q},${to.r}`;
}

/**
 * Update history table when a move causes a beta cutoff.
 * Score is increased by depth^2 (deeper cutoffs are more valuable).
 */
export function historyUpdate(move: Move, depth: number): void {
  const key = historyKey(move.from, move.to);
  const table = historyTable[move.piece.color];
  const current = table.get(key) ?? 0;
  const bonus = depth * depth;
  const newScore = Math.min(current + bonus, MAX_HISTORY_SCORE);
  table.set(key, newScore);
}

/**
 * Get history score for a move.
 */
export function historyScore(move: Move): number {
  const key = historyKey(move.from, move.to);
  const table = historyTable[move.piece.color];
  return table.get(key) ?? 0;
}

/**
 * Clear history table (e.g., at start of new game).
 */
export function historyClear(): void {
  historyTable.white.clear();
  historyTable.black.clear();
}

/**
 * Age history scores by halving them.
 * Called between iterations to prevent old history from dominating.
 */
export function historyAge(): void {
  for (const table of [historyTable.white, historyTable.black]) {
    for (const [key, value] of table.entries()) {
      table.set(key, Math.floor(value / 2));
    }
  }
}

/**
 * Get history table size (for stats).
 */
export function historySize(): number {
  return historyTable.white.size + historyTable.black.size;
}

// ============================================================================
// Killer Move Heuristic
// ============================================================================

/**
 * Killer Move Heuristic stores moves that caused beta cutoffs at each ply.
 * Unlike history heuristic which accumulates across the search, killer moves
 * are stored per-ply and are more specific to the current search tree.
 * 
 * Key insight: A move that causes a cutoff at depth D in one branch of the
 * tree often causes a cutoff at depth D in sibling branches too.
 * 
 * We store 2 killer moves per ply (standard in chess engines).
 * 
 * Signed-by: agent #8 claude-sonnet-4 via opencode 20260122T03:31:32
 */

/**
 * Number of killer moves to store per ply.
 */
const NUM_KILLERS = 2;

/**
 * Maximum depth for killer move storage.
 */
const MAX_KILLER_DEPTH = 64;

/**
 * Killer move table structure.
 * Indexed by ply depth, each entry contains up to NUM_KILLERS moves.
 */
export interface KillerTable {
  moves: (Move | null)[][];
}

/**
 * Global killer move table.
 */
const killerTable: KillerTable = {
  moves: Array.from({ length: MAX_KILLER_DEPTH }, () => Array(NUM_KILLERS).fill(null)),
};

/**
 * Check if two moves are the same (same from/to coordinates).
 */
function movesEqual(a: Move, b: Move): boolean {
  return (
    a.from.q === b.from.q &&
    a.from.r === b.from.r &&
    a.to.q === b.to.q &&
    a.to.r === b.to.r
  );
}

/**
 * Store a killer move for a given ply depth.
 * Uses replacement scheme: new killer replaces slot 0, old slot 0 moves to slot 1.
 * Only stores quiet moves (non-captures, non-promotions).
 */
export function killerStore(move: Move, ply: number): void {
  if (ply >= MAX_KILLER_DEPTH) return;
  
  // Don't store captures or promotions as killers
  if (move.captured || move.promotion) return;
  
  const killers = killerTable.moves[ply]!;
  
  // Don't store if it's already the primary killer
  if (killers[0] && movesEqual(killers[0], move)) {
    return;
  }
  
  // Check if it's already the secondary killer
  if (killers[1] && movesEqual(killers[1], move)) {
    // Promote to primary
    killers[1] = killers[0] ?? null;
    killers[0] = move;
    return;
  }
  
  // Standard replacement: new -> slot 0, old slot 0 -> slot 1
  killers[1] = killers[0] ?? null;
  killers[0] = move;
}

/**
 * Get killer moves for a given ply depth.
 * Returns array of killer moves (may contain nulls).
 */
export function killerGet(ply: number): (Move | null)[] {
  if (ply >= MAX_KILLER_DEPTH) return [];
  return killerTable.moves[ply]!;
}

/**
 * Check if a move is a killer move at the given ply.
 */
export function isKillerMove(move: Move, ply: number): boolean {
  if (ply >= MAX_KILLER_DEPTH) return false;
  
  const killers = killerTable.moves[ply]!;
  for (const killer of killers) {
    if (killer && movesEqual(killer, move)) {
      return true;
    }
  }
  return false;
}

/**
 * Get killer move score bonus for move ordering.
 * Primary killer gets higher bonus than secondary.
 */
export function killerScore(move: Move, ply: number): number {
  if (ply >= MAX_KILLER_DEPTH) return 0;
  
  const killers = killerTable.moves[ply]!;
  
  // Primary killer gets 8000 (below captures/promotions, above history)
  if (killers[0] && movesEqual(killers[0], move)) {
    return 8000;
  }
  
  // Secondary killer gets 7000
  if (killers[1] && movesEqual(killers[1], move)) {
    return 7000;
  }
  
  return 0;
}

/**
 * Clear all killer moves.
 * Called at the start of a new search or game.
 */
export function killerClear(): void {
  for (let i = 0; i < MAX_KILLER_DEPTH; i++) {
    killerTable.moves[i] = Array(NUM_KILLERS).fill(null);
  }
}

/**
 * Get total number of stored killer moves (for stats).
 */
export function killerCount(): number {
  let count = 0;
  for (const plyKillers of killerTable.moves) {
    for (const killer of plyKillers) {
      if (killer) count++;
    }
  }
  return count;
}

// ============================================================================
// Null Move Pruning
// ============================================================================

/**
 * Null Move Pruning (NMP) is an aggressive pruning technique.
 * 
 * Idea: If giving the opponent an extra move still results in a position
 * that beats beta, then the current position is likely very good and
 * we can prune this branch.
 * 
 * Conditions for null move:
 * - Not in check (can't pass when in check)
 * - Not already doing a null move (no consecutive null moves)
 * - Has at least one non-pawn piece (zugzwang risk in endgames)
 * - Depth is sufficient (null move at shallow depths is wasteful)
 * 
 * Signed-by: agent #7 claude-sonnet-4 via opencode 20260122T03:17:17
 */

/**
 * Depth reduction for null move search (R value).
 * Standard values are 2-3. We use 2 + depth/6 (adaptive).
 */
export function nullMoveReduction(depth: number): number {
  return 2 + Math.floor(depth / 6);
}

/**
 * Minimum depth required to try null move pruning.
 */
const NULL_MOVE_MIN_DEPTH = 3;

/**
 * Check if position has sufficient material for null move pruning.
 * Null move is risky in positions with only pawns (zugzwang risk).
 */
export function hasNullMoveMaterial(board: BoardState, color: Color): boolean {
  let nonPawnPieces = 0;
  for (const piece of board.values()) {
    if (piece.color === color && piece.type !== 'pawn' && piece.type !== 'king') {
      nonPawnPieces++;
    }
  }
  // Need at least one non-pawn/non-king piece
  return nonPawnPieces >= 1;
}

/**
 * Check if null move pruning should be attempted.
 */
export function shouldTryNullMove(
  board: BoardState,
  color: Color,
  depth: number,
  doingNullMove: boolean,
  inCheck: boolean
): boolean {
  // Don't do consecutive null moves
  if (doingNullMove) return false;
  
  // Can't do null move when in check
  if (inCheck) return false;
  
  // Don't do null move at shallow depths
  if (depth < NULL_MOVE_MIN_DEPTH) return false;
  
  // Check for sufficient material (avoid zugzwang)
  if (!hasNullMoveMaterial(board, color)) return false;
  
  return true;
}

// ============================================================================
// Late Move Reductions (LMR)
// ============================================================================

/**
 * Late Move Reductions (LMR) is a search optimization technique.
 * 
 * Idea: Moves that appear later in the move ordering are less likely to be good.
 * Instead of searching them at full depth, we search with reduced depth first.
 * If the reduced search suggests the move might be good (fails high), we re-search
 * at full depth to verify.
 * 
 * Conditions for LMR:
 * - Not in check (need full depth to escape check)
 * - Not a capture or promotion (tactical moves need full depth)
 * - Sufficient depth remaining (LMR at low depth is wasteful)
 * - Move is late enough in the move list (first few moves need full depth)
 * 
 * The reduction amount is typically log-based: R = log(depth) * log(moveIndex)
 * This means deeper searches and later moves get more reduction.
 * 
 * Signed-by: agent #9 claude-sonnet-4 via opencode 20260122T03:45:57
 */

/**
 * Minimum depth required to apply LMR.
 */
const LMR_MIN_DEPTH = 3;

/**
 * Minimum move index to apply LMR (first N moves searched at full depth).
 * The first few moves (typically hash move, killers, good captures) shouldn't be reduced.
 */
const LMR_FULL_DEPTH_MOVES = 4;

/**
 * Pre-computed LMR reduction table.
 * Using log-based formula: reduction = floor(ln(depth) * ln(moveIndex) / 2)
 * Max reduction is capped at depth - 1 (must search at least depth 1).
 */
const LMR_MAX_DEPTH = 64;
const LMR_MAX_MOVES = 64;

/**
 * LMR reduction table: [depth][moveIndex] -> reduction amount
 */
const lmrTable: number[][] = [];

/**
 * Initialize LMR reduction table with log-based values.
 */
function initLMRTable(): void {
  for (let depth = 0; depth < LMR_MAX_DEPTH; depth++) {
    lmrTable[depth] = [];
    for (let move = 0; move < LMR_MAX_MOVES; move++) {
      if (depth < LMR_MIN_DEPTH || move < LMR_FULL_DEPTH_MOVES) {
        lmrTable[depth]![move] = 0;
      } else {
        // Standard log-based LMR formula
        // Divide by 2.0 to be slightly conservative
        const reduction = Math.floor(
          Math.log(depth) * Math.log(move) / 2.0
        );
        // Cap reduction at depth - 1 (must search at least 1 ply)
        lmrTable[depth]![move] = Math.min(reduction, depth - 1);
      }
    }
  }
}

// Initialize the table on module load
initLMRTable();

/**
 * Get LMR reduction amount for a given depth and move index.
 * 
 * @param depth Current search depth
 * @param moveIndex Index of move in ordered move list (0-based)
 * @returns Number of plies to reduce by
 */
export function lmrReduction(depth: number, moveIndex: number): number {
  if (depth >= LMR_MAX_DEPTH) depth = LMR_MAX_DEPTH - 1;
  if (moveIndex >= LMR_MAX_MOVES) moveIndex = LMR_MAX_MOVES - 1;
  return lmrTable[depth]?.[moveIndex] ?? 0;
}

/**
 * Check if LMR should be applied to a move.
 * 
 * @param move The move to check
 * @param depth Current search depth
 * @param moveIndex Index in the ordered move list
 * @param inCheck Whether the moving side is in check
 * @param isPV Whether this is a principal variation node
 * @returns true if LMR should be applied
 */
export function shouldApplyLMR(
  move: Move,
  depth: number,
  moveIndex: number,
  inCheck: boolean,
  isPV: boolean = false
): boolean {
  // Don't reduce in check - need full depth to escape
  if (inCheck) return false;
  
  // Don't reduce at shallow depths
  if (depth < LMR_MIN_DEPTH) return false;
  
  // Don't reduce first few moves (best candidates)
  if (moveIndex < LMR_FULL_DEPTH_MOVES) return false;
  
  // Don't reduce captures (tactical)
  if (move.captured) return false;
  
  // Don't reduce promotions (tactical)
  if (move.promotion) return false;
  
  // More conservative in PV nodes
  if (isPV && moveIndex < LMR_FULL_DEPTH_MOVES * 2) return false;
  
  return true;
}

/**
 * Adjust LMR reduction based on various factors.
 * Can increase or decrease the base reduction.
 * 
 * @param baseReduction The base reduction from lmrReduction()
 * @param move The move being reduced
 * @param isKiller Whether this is a killer move
 * @param historyScore The history heuristic score for this move
 * @returns Adjusted reduction amount
 */
export function adjustLMRReduction(
  baseReduction: number,
  move: Move,
  isKiller: boolean,
  historyScoreValue: number
): number {
  let reduction = baseReduction;
  
  // Reduce less for killer moves (they've caused cutoffs before)
  if (isKiller) {
    reduction = Math.max(0, reduction - 1);
  }
  
  // Reduce less for moves with high history scores
  // Threshold is somewhat arbitrary but tuned for typical history values
  if (historyScoreValue > 1000) {
    reduction = Math.max(0, reduction - 1);
  }
  
  // Reduce more for moves with very low history
  if (historyScoreValue === 0 && baseReduction > 0) {
    reduction = Math.min(reduction + 1, LMR_MAX_DEPTH - 1);
  }
  
  return reduction;
}

// ============================================================================
// Futility Pruning
// ============================================================================

/**
 * Futility Pruning skips moves at low depths (frontier nodes) that have no
 * reasonable chance of raising alpha. The idea is: if the static evaluation
 * plus a margin is still below alpha, the position is so bad that even a
 * significant improvement won't help.
 * 
 * Benefits:
 * - Significantly reduces search tree at low depths
 * - Minimal risk since we use conservative margins
 * - Works well with other pruning techniques (LMR, NMP)
 * 
 * Signed-by: agent #12 claude-sonnet-4 via opencode 20260122T04:41:51
 */

/**
 * Maximum depth for futility pruning.
 * Typically 2-3 plies from the horizon.
 */
export const FUTILITY_MAX_DEPTH = 3;

/**
 * Futility margins by depth (in centipawns).
 * Depth 1: ~2 pawns (can miss a pawn capture)
 * Depth 2: ~3 pawns (can miss a minor piece capture)
 * Depth 3: ~5 pawns (can miss larger captures)
 * 
 * These margins are conservative to avoid pruning too aggressively.
 */
export const FUTILITY_MARGINS: Record<number, number> = {
  1: 200,   // Frontier node
  2: 350,   // Pre-frontier node
  3: 500,   // Pre-pre-frontier node
};

/**
 * Determine if a position can be futility pruned.
 * 
 * We don't apply futility pruning when:
 * - Depth is too high (beyond FUTILITY_MAX_DEPTH)
 * - The side to move is in check (can't skip when threatened)
 * - The move is a capture or promotion (tactical move - might raise score significantly)
 * - This is the first move in the move list (never prune PV candidate)
 * - Score is near mate (endgame positions require full search)
 * 
 * @param staticEval Static evaluation of the position (from current side's perspective)
 * @param alpha Current alpha bound
 * @param depth Current search depth
 * @param inCheck Whether the side to move is in check
 * @param move The move being considered
 * @param moveIndex Index of the move in ordered move list
 * @param maximizing Whether current player is maximizing
 * @returns True if the position can be futility pruned
 */
export function canFutilityPrune(
  staticEval: number,
  alpha: number,
  beta: number,
  depth: number,
  inCheck: boolean,
  move: Move,
  moveIndex: number,
  maximizing: boolean
): boolean {
  // Only at shallow depths
  if (depth > FUTILITY_MAX_DEPTH || depth <= 0) {
    return false;
  }
  
  // Don't prune when in check
  if (inCheck) {
    return false;
  }
  
  // Don't prune captures or promotions (tactical moves)
  if (move.captured || move.promotion) {
    return false;
  }
  
  // Don't prune the first move (PV candidate)
  if (moveIndex === 0) {
    return false;
  }
  
  // Don't prune near mate scores
  const mateThreshold = CHECKMATE_VALUE - 1000;
  if (Math.abs(staticEval) > mateThreshold || 
      Math.abs(alpha) > mateThreshold ||
      Math.abs(beta) > mateThreshold) {
    return false;
  }
  
  // Get the margin for this depth
  const margin = FUTILITY_MARGINS[depth] ?? FUTILITY_MARGINS[FUTILITY_MAX_DEPTH]!;
  
  // Futility condition: static eval + margin is still below/above the bound
  if (maximizing) {
    // For maximizing player, if eval + margin <= alpha, prune
    return staticEval + margin <= alpha;
  } else {
    // For minimizing player, if eval - margin >= beta, prune
    return staticEval - margin >= beta;
  }
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
// Static Exchange Evaluation (SEE)
// ============================================================================

/**
 * Static Exchange Evaluation (SEE) determines if a capture is winning material
 * by simulating the sequence of recaptures on a square.
 * 
 * This is more accurate than MVV-LVA because it considers the full exchange:
 * - PxQ might look good (MVV-LVA score = +900), but if the pawn is recaptured
 *   by another pawn, the net is +900 - 100 = +800
 * - QxP protected by Q results in: +100 - 900 = -800 (bad trade)
 * 
 * Benefits:
 * - Better capture ordering in quiescence search
 * - Can prune losing captures in quiescence
 * - Helps with move ordering in main search
 * 
 * Signed-by: agent #13 claude-sonnet-4 via opencode 20260122T04:52:31
 */

/**
 * Piece value array ordered by value (for SEE attacker selection).
 * We want to use the least valuable attacker first.
 */
const SEE_PIECE_ORDER: PieceType[] = ['pawn', 'knight', 'lance', 'chariot', 'queen', 'king'];

/**
 * Get the opposite direction.
 */
function seeGetOppositeDirection(dir: Direction): Direction {
  const opposites: Record<Direction, Direction> = {
    N: 'S', S: 'N',
    NE: 'SW', SW: 'NE',
    NW: 'SE', SE: 'NW',
  };
  return opposites[dir];
}

/**
 * Attacker info for SEE calculation.
 */
interface AttackerInfo {
  piece: Piece;
  position: HexCoord;
  value: number;
}

/**
 * Get all attackers of a square by a given color, sorted by piece value (ascending).
 * Returns attackers in order from least valuable to most valuable.
 * 
 * @param board The board state
 * @param target The square being attacked
 * @param byColor The attacking color
 * @returns Array of attackers sorted by value (least valuable first)
 */
export function getAttackers(
  board: BoardState,
  target: HexCoord,
  byColor: Color
): AttackerInfo[] {
  const attackers: AttackerInfo[] = [];
  
  // Check for pawn attackers
  const pawnCaptureDirections = getPawnCaptureDirections(byColor);
  for (const dir of pawnCaptureDirections) {
    // Check in reverse direction from target to find attacking pawn
    const reverseDir = seeGetOppositeDirection(dir);
    const attackerPos = getNeighbor(target, reverseDir);
    if (attackerPos) {
      const piece = getPieceAt(board, attackerPos);
      if (piece?.type === 'pawn' && piece.color === byColor) {
        attackers.push({
          piece,
          position: attackerPos,
          value: PIECE_VALUES['pawn'],
        });
      }
    }
  }
  
  // Check for knight attackers
  for (const attackerPos of getKnightTargets(target)) {
    const piece = getPieceAt(board, attackerPos);
    if (piece?.type === 'knight' && piece.color === byColor) {
      attackers.push({
        piece,
        position: attackerPos,
        value: PIECE_VALUES['knight'],
      });
    }
  }
  
  // Check for king attackers (adjacent squares)
  for (const dir of ALL_DIRECTIONS) {
    const attackerPos = getNeighbor(target, dir);
    if (attackerPos) {
      const piece = getPieceAt(board, attackerPos);
      if (piece?.type === 'king' && piece.color === byColor) {
        attackers.push({
          piece,
          position: attackerPos,
          value: PIECE_VALUES['king'] || 20000, // King has infinite value for SEE
        });
      }
    }
  }
  
  // Check for slider attackers (queen, lance, chariot)
  for (const dir of ALL_DIRECTIONS) {
    const ray = getRay(target, dir);
    for (const pos of ray) {
      const piece = getPieceAt(board, pos);
      if (!piece) continue;
      if (piece.color !== byColor) break; // Blocked by enemy piece
      
      // Check if this piece can attack along this direction
      const pieceDirections = getPieceDirections(piece);
      const reverseDir = seeGetOppositeDirection(dir);
      if ((pieceDirections as readonly Direction[]).includes(reverseDir) && isSlider(piece.type)) {
        attackers.push({
          piece,
          position: pos,
          value: PIECE_VALUES[piece.type],
        });
      }
      break; // Blocked by this piece
    }
  }
  
  // Sort by value (least valuable first)
  attackers.sort((a, b) => a.value - b.value);
  
  return attackers;
}

/**
 * Calculate the Static Exchange Evaluation for a capture move.
 * Returns the material gain/loss from the perspective of the side making the capture.
 * 
 * Standard SEE Algorithm:
 * 1. gain[d] = value of piece captured by side-to-move at depth d
 * 2. Negamax: gain[d] = max(0, gain[d] - gain[d+1])
 *    Meaning: "I capture and get gain[d], but opponent gets gain[d+1], so net is gain[d] - gain[d+1]"
 *    The max(0, ...) means I can choose not to capture if it would lose material.
 * 3. For the initial capture (d=0), we don't have the option not to capture
 *    (that's the move we're evaluating), so the final result is gain[0] - gain[1]
 * 
 * Example: White QxP defended by Black Q
 * - gain[0] = 100 (pawn captured by white queen)
 * - gain[1] = 900 (white queen captured by black queen)
 * - gain[2] = (no more white attackers, so 0)
 * - Negamax: gain[1] = max(0, 900 - 0) = 900
 * - Result: gain[0] - gain[1] = 100 - 900 = -800
 * 
 * @param board The board state before the capture
 * @param move The capture move to evaluate
 * @returns Material gain (positive = good for attacker, negative = bad)
 */
export function staticExchangeEvaluation(board: BoardState, move: Move): number {
  if (!move.captured) {
    return 0; // Not a capture
  }
  
  const target = move.to;
  const attackerColor = move.piece.color;
  const defenderColor = oppositeColor(attackerColor);
  
  // gain[d] = value of piece captured at depth d
  const gain: number[] = [];
  gain.push(PIECE_VALUES[move.captured.type]); // Depth 0: initial target
  
  // Track removed pieces (for x-ray attacks)
  const removedPieces = new Set<string>();
  removedPieces.add(coordToString(move.from)); // Initial attacker leaves its square
  
  // Track the piece currently on target (will be captured next)
  let pieceOnTarget = move.piece;
  let currentColor = defenderColor;
  
  const MAX_SEE_DEPTH = 32;
  
  // Build the gain array
  for (let depth = 1; depth < MAX_SEE_DEPTH; depth++) {
    // Find attackers for current side
    const attackers = getAttackersWithExclusions(board, target, currentColor, removedPieces);
    
    if (attackers.length === 0) {
      break; // No more attackers
    }
    
    // Select least valuable attacker
    const attacker = attackers[0]!;
    
    // The gain at this depth is the value of the piece being captured
    gain.push(PIECE_VALUES[pieceOnTarget.type]);
    
    // Remove this attacker (it moves to target)
    removedPieces.add(coordToString(attacker.position));
    
    // Update piece on target
    pieceOnTarget = attacker.piece;
    
    // Switch sides
    currentColor = oppositeColor(currentColor);
  }
  
  // Negamax from the end
  // At each depth (from end to beginning), the side can choose whether to capture
  // gain[d] after negamax = the best result for the side-to-move at depth d
  for (let d = gain.length - 2; d >= 0; d--) {
    // At depth d, if we capture, we get gain[d] but opponent then gets gain[d+1]
    // Net result: gain[d] - gain[d+1]
    // We choose max(0, ...) because we can always choose not to capture
    // EXCEPT at depth 0 - the initial capture is mandatory (that's the move being evaluated)
    if (d > 0) {
      gain[d] = Math.max(0, gain[d]! - (gain[d + 1] ?? 0));
    } else {
      // At depth 0, we must make the capture
      gain[d] = gain[d]! - (gain[d + 1] ?? 0);
    }
  }
  
  return gain[0] ?? 0;
}

/**
 * Get attackers excluding pieces that have been removed during SEE simulation.
 */
function getAttackersWithExclusions(
  board: BoardState,
  target: HexCoord,
  byColor: Color,
  excludedPositions: Set<string>
): AttackerInfo[] {
  const attackers: AttackerInfo[] = [];
  
  // Check for pawn attackers
  const pawnCaptureDirections = getPawnCaptureDirections(byColor);
  for (const dir of pawnCaptureDirections) {
    const reverseDir = seeGetOppositeDirection(dir);
    const attackerPos = getNeighbor(target, reverseDir);
    if (attackerPos && !excludedPositions.has(coordToString(attackerPos))) {
      const piece = getPieceAt(board, attackerPos);
      if (piece?.type === 'pawn' && piece.color === byColor) {
        attackers.push({
          piece,
          position: attackerPos,
          value: PIECE_VALUES['pawn'],
        });
      }
    }
  }
  
  // Check for knight attackers
  for (const attackerPos of getKnightTargets(target)) {
    if (!excludedPositions.has(coordToString(attackerPos))) {
      const piece = getPieceAt(board, attackerPos);
      if (piece?.type === 'knight' && piece.color === byColor) {
        attackers.push({
          piece,
          position: attackerPos,
          value: PIECE_VALUES['knight'],
        });
      }
    }
  }
  
  // Check for king attackers
  for (const dir of ALL_DIRECTIONS) {
    const attackerPos = getNeighbor(target, dir);
    if (attackerPos && !excludedPositions.has(coordToString(attackerPos))) {
      const piece = getPieceAt(board, attackerPos);
      if (piece?.type === 'king' && piece.color === byColor) {
        attackers.push({
          piece,
          position: attackerPos,
          value: 20000, // King has very high value for SEE
        });
      }
    }
  }
  
  // Check for slider attackers, considering X-ray attacks through excluded pieces
  for (const dir of ALL_DIRECTIONS) {
    const ray = getRay(target, dir);
    for (const pos of ray) {
      // Skip excluded positions (they've been "removed" in simulation)
      if (excludedPositions.has(coordToString(pos))) continue;
      
      const piece = getPieceAt(board, pos);
      if (!piece) continue;
      if (piece.color !== byColor) break; // Blocked by enemy piece
      
      // Check if this piece can attack along this direction
      const pieceDirections = getPieceDirections(piece);
      const reverseDir = seeGetOppositeDirection(dir);
      if ((pieceDirections as readonly Direction[]).includes(reverseDir) && isSlider(piece.type)) {
        attackers.push({
          piece,
          position: pos,
          value: PIECE_VALUES[piece.type],
        });
      }
      break; // Blocked by this piece (even if it's a slider that could attack)
    }
  }
  
  // Sort by value (least valuable first)
  attackers.sort((a, b) => a.value - b.value);
  
  return attackers;
}

/**
 * Check if a capture is a winning capture according to SEE.
 * A winning capture has SEE >= 0.
 * 
 * @param board The board state
 * @param move The capture move to check
 * @returns True if SEE >= 0 (capture wins or breaks even)
 */
export function isWinningCapture(board: BoardState, move: Move): boolean {
  return staticExchangeEvaluation(board, move) >= 0;
}

/**
 * Check if a capture is a losing capture according to SEE.
 * A losing capture has SEE < 0.
 * 
 * @param board The board state
 * @param move The capture move to check
 * @returns True if SEE < 0 (capture loses material)
 */
export function isLosingCapture(board: BoardState, move: Move): boolean {
  return staticExchangeEvaluation(board, move) < 0;
}

// ============================================================================
// Move Ordering
// ============================================================================

/**
 * Estimate move value for ordering (higher is better).
 * Good move ordering improves alpha-beta pruning efficiency.
 * Uses killer moves and history heuristic for quiet moves.
 * 
 * @param move The move to evaluate
 * @param ply Current ply depth (for killer move lookup)
 */
export function estimateMoveValue(move: Move, ply: number = 0): number {
  let score = 0;
  
  // Captures: MVV-LVA (Most Valuable Victim - Least Valuable Attacker)
  // Captures get priority over quiet moves via high base score
  if (move.captured) {
    const victimValue = PIECE_VALUES[move.captured.type];
    const attackerValue = PIECE_VALUES[move.piece.type];
    score += 10000 + victimValue * 10 - attackerValue; // Prioritize capturing valuable pieces
  }
  
  // Promotions are very valuable
  if (move.promotion) {
    score += 9000 + PIECE_VALUES[move.promotion] - PIECE_VALUES['pawn'];
  }
  
  // Killer moves (quiet moves that caused cutoffs at this ply)
  // Killer bonus (7000-8000) is below captures/promotions but above history
  score += killerScore(move, ply);
  
  // History heuristic for quiet moves
  // Scaled down to not overshadow captures/promotions/killers
  const history = historyScore(move);
  score += Math.min(history / 100, 1000);
  
  // Centrality bonus for destination (small tie-breaker)
  score += getCentralityBonus(move.to);
  
  return score;
}

/**
 * Estimate move value using SEE for captures (more accurate but slower).
 * Uses SEE to properly evaluate capture sequences instead of simple MVV-LVA.
 * 
 * @param board The current board state (needed for SEE calculation)
 * @param move The move to evaluate
 * @param ply Current ply depth (for killer move lookup)
 */
export function estimateMoveValueWithSEE(board: BoardState, move: Move, ply: number = 0): number {
  let score = 0;
  
  // Captures: Use SEE for accurate capture evaluation
  if (move.captured) {
    const seeValue = staticExchangeEvaluation(board, move);
    // Winning captures (SEE >= 0) get high priority
    // Losing captures (SEE < 0) get lower priority than quiet moves
    if (seeValue >= 0) {
      score += 10000 + seeValue; // Winning captures ordered by SEE value
    } else {
      score += seeValue; // Losing captures (negative score)
    }
  }
  
  // Promotions are very valuable
  if (move.promotion) {
    score += 9000 + PIECE_VALUES[move.promotion] - PIECE_VALUES['pawn'];
  }
  
  // Killer moves (quiet moves that caused cutoffs at this ply)
  score += killerScore(move, ply);
  
  // History heuristic for quiet moves
  const history = historyScore(move);
  score += Math.min(history / 100, 1000);
  
  // Centrality bonus for destination (small tie-breaker)
  score += getCentralityBonus(move.to);
  
  return score;
}

/**
 * Sort moves by estimated value using SEE for captures (best first).
 * More accurate than orderMoves but requires board state.
 * 
 * @param board The current board state
 * @param moves Array of moves to sort
 * @param ply Current ply depth (for killer move lookup)
 */
export function orderMovesWithSEE(board: BoardState, moves: Move[], ply: number = 0): Move[] {
  return [...moves].sort((a, b) => 
    estimateMoveValueWithSEE(board, b, ply) - estimateMoveValueWithSEE(board, a, ply)
  );
}

/**
 * Sort moves by estimated value (best first).
 * 
 * @param moves Array of moves to sort
 * @param ply Current ply depth (for killer move lookup)
 */
export function orderMoves(moves: Move[], ply: number = 0): Move[] {
  return [...moves].sort((a, b) => estimateMoveValue(b, ply) - estimateMoveValue(a, ply));
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
  
  // Order moves using SEE (more accurate than MVV-LVA)
  const orderedMoves = orderMovesWithSEE(board, tacticalMoves, 0);
  
  if (maximizing) {
    for (const move of orderedMoves) {
      // SEE pruning: skip losing captures in quiescence
      // This is safe because we already have stand-pat as a baseline
      if (move.captured && staticExchangeEvaluation(board, move) < 0) {
        stats.seePrunes++;
        continue;
      }
      
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
      // SEE pruning: skip losing captures in quiescence
      if (move.captured && staticExchangeEvaluation(board, move) < 0) {
        stats.seePrunes++;
        continue;
      }
      
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
  nullMoveCutoffs: number;
  nullMoveAttempts: number;
  lmrReductions: number;
  lmrResearches: number;
  pvsResearches: number;
  aspirationResearches: number;
  futilityPrunes: number;
  seePrunes: number; // Captures pruned by SEE in quiescence search
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
 * Alpha-beta search with pruning, transposition table, quiescence search,
 * null move pruning, killer moves, and history heuristic.
 * 
 * @param board Current board state
 * @param depth Remaining search depth
 * @param alpha Best score for maximizing player
 * @param beta Best score for minimizing player
 * @param maximizing True if current player is maximizing (white)
 * @param stats Statistics object to update
 * @param ply Current ply from root (for killer move table)
 * @param useTT Whether to use transposition table (default true)
 * @param useQuiescence Whether to use quiescence search (default true)
 * @param useNullMove Whether to use null move pruning (default true)
 * @param doingNullMove Whether this is a null move search (to prevent consecutive null moves)
 * @returns Evaluation score
 */
function alphaBeta(
  board: BoardState,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  stats: SearchStats,
  ply: number = 0,
  useTT: boolean = true,
  useQuiescence: boolean = true,
  useNullMove: boolean = true,
  doingNullMove: boolean = false
): number {
  stats.nodesSearched++;
  
  const originalAlpha = alpha;
  const color: Color = maximizing ? 'white' : 'black';
  const inCheck = isInCheck(board, color);
  
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
    if (inCheck) {
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
  
  // Null Move Pruning
  // If giving the opponent an extra move still results in a position >= beta,
  // we can prune this branch.
  if (useNullMove && shouldTryNullMove(board, color, depth, doingNullMove, inCheck)) {
    stats.nullMoveAttempts++;
    const R = nullMoveReduction(depth);
    
    // Do a reduced-depth search with the opponent to move
    // (simulating passing our turn)
    const nullScore = alphaBeta(
      board, // Same board - we "pass"
      depth - 1 - R, // Reduced depth
      maximizing ? -beta : -beta, // Inverted bounds for null window
      maximizing ? -beta + 1 : -beta + 1,
      !maximizing, // Opponent's turn
      stats,
      ply + 1, // Increment ply
      useTT,
      useQuiescence,
      false, // Don't do null move in verification search
      true // Mark that we're doing a null move
    );
    
    // If null move fails high, we can prune
    if (maximizing) {
      if (-nullScore >= beta) {
        stats.nullMoveCutoffs++;
        return beta;
      }
    } else {
      if (-nullScore <= alpha) {
        stats.nullMoveCutoffs++;
        return alpha;
      }
    }
  }
  
  // Calculate static evaluation for futility pruning
  // Only needed at low depths where we might apply futility pruning
  let staticEval: number | null = null;
  if (depth <= FUTILITY_MAX_DEPTH && !inCheck) {
    staticEval = evaluatePosition(board);
    // Convert to perspective of current player
    if (!maximizing) {
      staticEval = -staticEval;
    }
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
      orderedMoves = [ttEntry.bestMove, ...orderMoves(otherMoves, ply)];
    } else {
      orderedMoves = orderMoves(moves, ply);
    }
  } else {
    orderedMoves = orderMoves(moves, ply);
  }
  
  let bestMove: Move | null = null;
  
  if (maximizing) {
    let maxEval = -Infinity;
    
    for (let moveIndex = 0; moveIndex < orderedMoves.length; moveIndex++) {
      const move = orderedMoves[moveIndex]!;
      
      // Futility Pruning: Skip quiet moves that can't raise alpha
      if (staticEval !== null && 
          canFutilityPrune(staticEval, alpha, beta, depth, inCheck, move, moveIndex, maximizing)) {
        stats.futilityPrunes++;
        continue;
      }
      
      const newBoard = applyMove(board, move);
      
      let evalScore: number;
      
      // Principal Variation Search (PVS) with Late Move Reductions (LMR)
      // First move: search with full window
      // Later moves: search with null window, re-search if needed
      if (moveIndex === 0) {
        // First move - search with full window
        evalScore = alphaBeta(newBoard, depth - 1, alpha, beta, false, stats, ply + 1, useTT, useQuiescence, useNullMove, false);
      } else {
        // Late Move Reductions (LMR)
        // Search late moves with reduced depth first
        let reduction = 0;
        if (shouldApplyLMR(move, depth, moveIndex, inCheck)) {
          const baseReduction = lmrReduction(depth, moveIndex);
          const isKiller = isKillerMove(move, ply);
          const histScore = historyScore(move);
          reduction = adjustLMRReduction(baseReduction, move, isKiller, histScore);
        }
        
        // PVS: Use null window search (with optional LMR reduction)
        const searchDepth = reduction > 0 
          ? Math.max(1, depth - 1 - reduction) 
          : depth - 1;
        
        if (reduction > 0) {
          stats.lmrReductions++;
        }
        
        // Null window search
        evalScore = alphaBeta(
          newBoard, 
          searchDepth,
          alpha, 
          alpha + 1, // Null window
          false, 
          stats, 
          ply + 1, 
          useTT, 
          useQuiescence, 
          useNullMove, 
          false
        );
        
        // If null window search fails high, re-search with full window
        if (evalScore > alpha && evalScore < beta) {
          if (reduction > 0) {
            stats.lmrResearches++;
          } else {
            stats.pvsResearches++;
          }
          evalScore = alphaBeta(newBoard, depth - 1, alpha, beta, false, stats, ply + 1, useTT, useQuiescence, useNullMove, false);
        }
      }
      
      if (evalScore > maxEval) {
        maxEval = evalScore;
        bestMove = move;
      }
      alpha = Math.max(alpha, evalScore);
      
      if (beta <= alpha) {
        stats.cutoffs++;
        // Update killer and history for the cutoff move (quiet moves only)
        if (!move.captured && !move.promotion) {
          killerStore(move, ply);
          historyUpdate(move, depth);
        }
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
    
    for (let moveIndex = 0; moveIndex < orderedMoves.length; moveIndex++) {
      const move = orderedMoves[moveIndex]!;
      
      // Futility Pruning: Skip quiet moves that can't lower beta
      if (staticEval !== null && 
          canFutilityPrune(staticEval, alpha, beta, depth, inCheck, move, moveIndex, maximizing)) {
        stats.futilityPrunes++;
        continue;
      }
      
      const newBoard = applyMove(board, move);
      
      let evalScore: number;
      
      // Principal Variation Search (PVS) with Late Move Reductions (LMR)
      // First move: search with full window
      // Later moves: search with null window, re-search if needed
      if (moveIndex === 0) {
        // First move - search with full window
        evalScore = alphaBeta(newBoard, depth - 1, alpha, beta, true, stats, ply + 1, useTT, useQuiescence, useNullMove, false);
      } else {
        // Late Move Reductions (LMR)
        // Search late moves with reduced depth first
        let reduction = 0;
        if (shouldApplyLMR(move, depth, moveIndex, inCheck)) {
          const baseReduction = lmrReduction(depth, moveIndex);
          const isKiller = isKillerMove(move, ply);
          const histScore = historyScore(move);
          reduction = adjustLMRReduction(baseReduction, move, isKiller, histScore);
        }
        
        // PVS: Use null window search (with optional LMR reduction)
        const searchDepth = reduction > 0 
          ? Math.max(1, depth - 1 - reduction) 
          : depth - 1;
        
        if (reduction > 0) {
          stats.lmrReductions++;
        }
        
        // Null window search
        evalScore = alphaBeta(
          newBoard, 
          searchDepth,
          beta - 1, // Null window
          beta, 
          true, 
          stats, 
          ply + 1, 
          useTT, 
          useQuiescence, 
          useNullMove, 
          false
        );
        
        // If null window search fails low, re-search with full window
        if (evalScore < beta && evalScore > alpha) {
          if (reduction > 0) {
            stats.lmrResearches++;
          } else {
            stats.pvsResearches++;
          }
          evalScore = alphaBeta(newBoard, depth - 1, alpha, beta, true, stats, ply + 1, useTT, useQuiescence, useNullMove, false);
        }
      }
      
      if (evalScore < minEval) {
        minEval = evalScore;
        bestMove = move;
      }
      beta = Math.min(beta, evalScore);
      
      if (beta <= alpha) {
        stats.cutoffs++;
        // Update killer and history for the cutoff move (quiet moves only)
        if (!move.captured && !move.promotion) {
          killerStore(move, ply);
          historyUpdate(move, depth);
        }
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
 * @param useNullMove Whether to use null move pruning
 * @param clearKillers Whether to clear killer table at start (default true for new searches)
 * @param initialAlpha Initial alpha bound for aspiration windows (default -Infinity)
 * @param initialBeta Initial beta bound for aspiration windows (default +Infinity)
 * @returns Best move and evaluation
 */
export function findBestMove(
  board: BoardState,
  color: Color,
  depth: number = 4,
  useTT: boolean = true,
  useQuiescence: boolean = true,
  useNullMove: boolean = true,
  clearKillers: boolean = true,
  initialAlpha: number = -Infinity,
  initialBeta: number = Infinity
): SearchResult {
  const stats: SearchStats = {
    nodesSearched: 0,
    cutoffs: 0,
    maxDepthReached: depth,
    ttHits: 0,
    quiescenceNodes: 0,
    nullMoveCutoffs: 0,
    nullMoveAttempts: 0,
    lmrReductions: 0,
    lmrResearches: 0,
    pvsResearches: 0,
    aspirationResearches: 0,
    futilityPrunes: 0,
    seePrunes: 0,
  };
  
  // Clear killer moves at start of new search
  if (clearKillers) {
    killerClear();
  }
  
  const moves = generateAllLegalMoves(board, color);
  
  if (moves.length === 0) {
    return { move: null, score: 0, stats };
  }
  
  const maximizing = color === 'white';
  
  // Check TT for best move from previous search
  // Root is ply 0
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
      orderedMoves = [ttEntry.bestMove, ...orderMoves(otherMoves, 0)];
    } else {
      orderedMoves = orderMoves(moves, 0);
    }
  } else {
    orderedMoves = orderMoves(moves, 0);
  }
  
  let bestMove = orderedMoves[0]!;
  let bestScore = maximizing ? -Infinity : Infinity;
  let alpha = initialAlpha;
  let beta = initialBeta;
  
  for (const move of orderedMoves) {
    const newBoard = applyMove(board, move);
    // Root is ply 0, so first recursive call is ply 1
    const evalScore = alphaBeta(newBoard, depth - 1, alpha, beta, !maximizing, stats, 1, useTT, useQuiescence, useNullMove, false);
    
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
 * History table is aged between iterations to prevent stale data.
 * Killer moves are preserved across iterations (they're still useful).
 * 
 * @param board Current board state
 * @param color Color to find best move for
 * @param maxDepth Maximum search depth
 * @param timeLimitMs Time limit in milliseconds (optional)
 * @param useTT Whether to use transposition table
 * @param useQuiescence Whether to use quiescence search
 * @param useNullMove Whether to use null move pruning
 * @returns Best move found
 */
export function findBestMoveIterative(
  board: BoardState,
  color: Color,
  maxDepth: number = 6,
  timeLimitMs: number = 5000,
  useTT: boolean = true,
  useQuiescence: boolean = true,
  useNullMove: boolean = true
): SearchResult {
  const startTime = Date.now();
  let bestResult: SearchResult = { 
    move: null, 
    score: 0, 
    stats: { 
      nodesSearched: 0, 
      cutoffs: 0, 
      maxDepthReached: 0, 
      ttHits: 0, 
      quiescenceNodes: 0,
      nullMoveCutoffs: 0,
      nullMoveAttempts: 0,
      lmrReductions: 0,
      lmrResearches: 0,
      pvsResearches: 0,
      aspirationResearches: 0,
      futilityPrunes: 0,
      seePrunes: 0,
    } 
  };
  
  // Accumulate stats across all depths
  let totalNodes = 0;
  let totalCutoffs = 0;
  let totalTTHits = 0;
  let totalQNodes = 0;
  let totalNullCutoffs = 0;
  let totalNullAttempts = 0;
  let totalLMRReductions = 0;
  let totalLMRResearches = 0;
  let totalPVSResearches = 0;
  let totalAspirationResearches = 0;
  let totalFutilityPrunes = 0;
  let totalSEEPrunes = 0;
  
  // Helper to accumulate stats from a search result
  const accumulateStats = (result: SearchResult) => {
    totalNodes += result.stats.nodesSearched;
    totalCutoffs += result.stats.cutoffs;
    totalTTHits += result.stats.ttHits;
    totalQNodes += result.stats.quiescenceNodes;
    totalNullCutoffs += result.stats.nullMoveCutoffs;
    totalNullAttempts += result.stats.nullMoveAttempts;
    totalLMRReductions += result.stats.lmrReductions;
    totalLMRResearches += result.stats.lmrResearches;
    totalPVSResearches += result.stats.pvsResearches;
    totalAspirationResearches += result.stats.aspirationResearches;
    totalFutilityPrunes += result.stats.futilityPrunes;
    totalSEEPrunes += result.stats.seePrunes;
  };
  
  // Get initial moves quickly at depth 1
  // clearKillers=true for first iteration
  const initialResult = findBestMove(board, color, 1, useTT, useQuiescence, useNullMove, true);
  bestResult = initialResult;
  accumulateStats(initialResult);
  
  // Track previous score for aspiration windows
  let previousScore = initialResult.score;
  
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
    
    // Age history between iterations to prevent stale data from dominating
    historyAge();
    
    let result: SearchResult;
    
    // Use aspiration windows for deeper searches
    if (depth >= ASPIRATION_MIN_DEPTH && Math.abs(previousScore) < CHECKMATE_VALUE - 1000) {
      // Start with a narrow window around the previous score
      let windowSize = ASPIRATION_WINDOW;
      let alpha = previousScore - windowSize;
      let beta = previousScore + windowSize;
      
      // Search with aspiration window, widening if needed
      while (true) {
        result = findBestMove(board, color, depth, useTT, useQuiescence, useNullMove, false, alpha, beta);
        accumulateStats(result);
        
        // Check if search failed outside window
        if (result.score <= alpha) {
          // Failed low - widen alpha
          totalAspirationResearches++;
          windowSize *= ASPIRATION_WINDOW_EXPANSION;
          alpha = Math.max(result.score - windowSize, -Infinity);
        } else if (result.score >= beta) {
          // Failed high - widen beta
          totalAspirationResearches++;
          windowSize *= ASPIRATION_WINDOW_EXPANSION;
          beta = Math.min(result.score + windowSize, Infinity);
        } else {
          // Search succeeded within window
          break;
        }
        
        // Safety check: if window is huge, just do full search
        if (windowSize > CHECKMATE_VALUE) {
          result = findBestMove(board, color, depth, useTT, useQuiescence, useNullMove, false);
          accumulateStats(result);
          break;
        }
        
        // Check time limit during re-searches
        const reElapsed = Date.now() - startTime;
        if (reElapsed > timeLimitMs) {
          break;
        }
      }
    } else {
      // Full window search for shallow depths or near-mate positions
      result = findBestMove(board, color, depth, useTT, useQuiescence, useNullMove, false);
      accumulateStats(result);
    }
    
    bestResult = result;
    previousScore = result.score;
    
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
  bestResult.stats.nullMoveCutoffs = totalNullCutoffs;
  bestResult.stats.nullMoveAttempts = totalNullAttempts;
  bestResult.stats.lmrReductions = totalLMRReductions;
  bestResult.stats.lmrResearches = totalLMRResearches;
  bestResult.stats.pvsResearches = totalPVSResearches;
  bestResult.stats.aspirationResearches = totalAspirationResearches;
  bestResult.stats.futilityPrunes = totalFutilityPrunes;
  bestResult.stats.seePrunes = totalSEEPrunes;
  
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
 * Options for getAIMove.
 */
export interface AIOptions {
  /** AI difficulty level (default: 'medium') */
  difficulty?: AIDifficulty;
  /** Whether to clear transposition, history, and killer tables (default: false, set true for new games) */
  clearTables?: boolean;
  /** Whether to use opening book (default: true) */
  useOpeningBook?: boolean;
  /** Opening book lookup options */
  bookOptions?: {
    minPlayCount?: number;
    temperature?: number;
    useWinRateWeight?: boolean;
  };
  /** Whether to use endgame tablebase (default: true) */
  useTablebase?: boolean;
}

/**
 * Get AI move for current game state.
 * 
 * Priority order:
 * 1. Opening book (if in book and enabled)
 * 2. Endgame tablebase (if position is in tablebase and enabled)
 * 3. Alpha-beta search
 * 
 * @param state Current game state
 * @param difficulty AI difficulty level (deprecated, use options.difficulty instead)
 * @param clearTables Whether to clear tables (deprecated, use options.clearTables instead)
 * @param options AI options including book settings
 * @returns Best move or null if game is over
 */
export function getAIMove(
  state: GameState,
  difficulty: AIDifficulty = 'medium',
  clearTables: boolean = false,
  options?: AIOptions
): SearchResult {
  // Merge options with legacy parameters
  const useBook = options?.useOpeningBook ?? true;
  const useTablebase = options?.useTablebase ?? true;
  const actualDifficulty = options?.difficulty ?? difficulty;
  const actualClearTables = options?.clearTables ?? clearTables;
  
  const emptyStats: SearchStats = { 
    nodesSearched: 0, 
    cutoffs: 0, 
    maxDepthReached: 0, 
    ttHits: 0, 
    quiescenceNodes: 0,
    nullMoveCutoffs: 0,
    nullMoveAttempts: 0,
    lmrReductions: 0,
    lmrResearches: 0,
    pvsResearches: 0,
    aspirationResearches: 0,
    futilityPrunes: 0,
    seePrunes: 0,
  };
  
  if (state.status.type !== 'ongoing') {
    return { move: null, score: 0, stats: emptyStats };
  }
  
  if (actualClearTables) {
    ttClear();
    historyClear();
    killerClear();
  }
  
  // Try opening book first (if enabled and available)
  if (useBook) {
    const bookResult = lookupBookMove(state.board, state.turn, options?.bookOptions);
    if (bookResult.move) {
      // Return book move with zero search stats (instant move)
      return { move: bookResult.move, score: 0, stats: emptyStats };
    }
  }
  
  // Try endgame tablebase (if enabled and position is in tablebase)
  if (useTablebase) {
    const tbMove = getTablebaseMove(state.board, state.turn);
    if (tbMove) {
      const tbScore = getTablebaseScore(state.board, state.turn) ?? 0;
      // Return tablebase move with zero search stats (perfect play)
      return { move: tbMove, score: tbScore, stats: emptyStats };
    }
  }
  
  // Fall back to search
  const params = getDifficultyParams(actualDifficulty);
  return findBestMoveIterative(state.board, state.turn, params.depth, params.timeLimit);
}
