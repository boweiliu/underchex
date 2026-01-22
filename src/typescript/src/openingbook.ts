/**
 * Underchex Opening Book Module
 * 
 * Provides opening book functionality for the AI:
 * - Store and lookup opening book positions
 * - Generate opening book from self-play games
 * - Probabilistic move selection based on win rates
 * 
 * Opening book format:
 * - Positions are keyed by Zobrist hash
 * - Each position stores a list of candidate moves with statistics
 * - Moves are selected probabilistically based on win rate and play count
 * 
 * Signed-by: agent #27 claude-sonnet-4 via opencode 20260122T07:49:00
 */

import {
  BoardState,
  Move,
  Color,
  HexCoord,
  PieceType,
  coordToString,
  oppositeColor,
} from './types';

import {
  computeZobristHash,
  PIECE_VALUES,
} from './ai';

import {
  generateAllLegalMoves,
  applyMove,
} from './moves';

import {
  getStartingPosition as getStartingPlacements,
  createBoardFromPlacements,
} from './game';

// ============================================================================
// Opening Book Types
// ============================================================================

/**
 * Statistics for a single move in the opening book.
 */
export interface BookMoveStats {
  /** Move from position */
  from: HexCoord;
  /** Move to position */
  to: HexCoord;
  /** Number of times this move was played */
  playCount: number;
  /** Number of times this move led to a win for the side that played it */
  wins: number;
  /** Number of draws when this move was played */
  draws: number;
  /** Average score from positions after this move (from the moving side's perspective) */
  avgScore: number;
  /** Promotion piece type if this is a promotion move */
  promotion?: PieceType;
}

/**
 * Entry in the opening book for a single position.
 */
export interface BookEntry {
  /** Zobrist hash of the position */
  hash: number;
  /** Candidate moves with their statistics */
  moves: BookMoveStats[];
  /** Total times this position was reached */
  totalVisits: number;
}

/**
 * The full opening book structure.
 */
export interface OpeningBook {
  /** Map from Zobrist hash to book entry */
  entries: Map<number, BookEntry>;
  /** Metadata */
  metadata: {
    /** When the book was created/updated */
    createdAt: string;
    /** Number of games used to generate the book */
    gamesCount: number;
    /** Maximum depth (ply) of positions in the book */
    maxDepth: number;
  };
}

/**
 * Options for opening book lookup.
 */
export interface BookLookupOptions {
  /** Minimum play count for a move to be considered (default: 3) */
  minPlayCount?: number;
  /** Temperature for probabilistic selection (0 = always best, higher = more random) */
  temperature?: number;
  /** Whether to use win rate weighting (default: true) */
  useWinRateWeight?: boolean;
  /** Random seed for deterministic selection (optional) */
  seed?: number;
}

/**
 * Result of opening book lookup.
 */
export interface BookLookupResult {
  /** Selected move, or null if no book move available */
  move: Move | null;
  /** Book entry for the position (for debugging/UI) */
  entry: BookEntry | null;
  /** Whether the move was found in the book */
  inBook: boolean;
}

// ============================================================================
// Opening Book Implementation
// ============================================================================

/**
 * Default opening book (starts empty, populated by generateBook or loadBook).
 */
let openingBook: OpeningBook = {
  entries: new Map(),
  metadata: {
    createdAt: new Date().toISOString(),
    gamesCount: 0,
    maxDepth: 0,
  },
};

/**
 * Get the current opening book.
 */
export function getOpeningBook(): OpeningBook {
  return openingBook;
}

/**
 * Set/replace the opening book.
 */
export function setOpeningBook(book: OpeningBook): void {
  openingBook = book;
}

/**
 * Clear the opening book.
 */
export function clearOpeningBook(): void {
  openingBook = {
    entries: new Map(),
    metadata: {
      createdAt: new Date().toISOString(),
      gamesCount: 0,
      maxDepth: 0,
    },
  };
}

/**
 * Get book entry for a position.
 */
export function getBookEntry(board: BoardState): BookEntry | null {
  const hash = computeZobristHash(board);
  return openingBook.entries.get(hash) ?? null;
}

/**
 * Check if a position is in the opening book.
 */
export function isInBook(board: BoardState): boolean {
  return getBookEntry(board) !== null;
}

/**
 * Get the number of positions in the book.
 */
export function getBookSize(): number {
  return openingBook.entries.size;
}

// ============================================================================
// Move Selection
// ============================================================================

/**
 * Simple seeded PRNG for deterministic random selection.
 * Uses xorshift32 algorithm.
 */
function createSeededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0xFFFFFFFF; // Returns 0-1
  };
}

/**
 * Calculate win rate for a book move.
 * Returns value between 0 and 1.
 */
export function calculateWinRate(stats: BookMoveStats): number {
  const total = stats.wins + stats.draws + (stats.playCount - stats.wins - stats.draws);
  if (total === 0) return 0.5; // No data, assume neutral
  // Draws count as half a win
  return (stats.wins + stats.draws * 0.5) / total;
}

/**
 * Calculate selection weight for a book move.
 * Combines play count and win rate.
 */
function calculateMoveWeight(
  stats: BookMoveStats,
  options: BookLookupOptions
): number {
  const useWinRate = options.useWinRateWeight ?? true;
  const temperature = options.temperature ?? 1.0;
  
  // Base weight from play count (popularity)
  let weight = Math.sqrt(stats.playCount);
  
  // Adjust by win rate if enabled
  if (useWinRate) {
    const winRate = calculateWinRate(stats);
    // Scale win rate to 0.5-1.5 range to adjust weight
    const winRateMultiplier = 0.5 + winRate;
    weight *= winRateMultiplier;
  }
  
  // Apply temperature (higher temperature = more randomness)
  if (temperature > 0) {
    weight = Math.pow(weight, 1.0 / temperature);
  }
  
  return weight;
}

/**
 * Select a move from book moves probabilistically.
 */
function selectBookMove(
  moves: BookMoveStats[],
  options: BookLookupOptions,
  rng: () => number
): BookMoveStats | null {
  const minPlayCount = options.minPlayCount ?? 3;
  
  // Filter moves by minimum play count
  const eligibleMoves = moves.filter(m => m.playCount >= minPlayCount);
  
  if (eligibleMoves.length === 0) {
    return null;
  }
  
  // Calculate weights for all eligible moves
  const weights = eligibleMoves.map(m => calculateMoveWeight(m, options));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  
  if (totalWeight === 0) {
    return null;
  }
  
  // Weighted random selection
  let random = rng() * totalWeight;
  for (let i = 0; i < eligibleMoves.length; i++) {
    random -= weights[i]!;
    if (random <= 0) {
      return eligibleMoves[i]!;
    }
  }
  
  // Fallback to last move (shouldn't happen normally)
  return eligibleMoves[eligibleMoves.length - 1]!;
}

/**
 * Find a move from the book entry that matches the given coordinates.
 */
function findMatchingMove(
  legalMoves: Move[],
  bookStats: BookMoveStats
): Move | null {
  for (const move of legalMoves) {
    if (
      move.from.q === bookStats.from.q &&
      move.from.r === bookStats.from.r &&
      move.to.q === bookStats.to.q &&
      move.to.r === bookStats.to.r &&
      move.promotion === bookStats.promotion
    ) {
      return move;
    }
  }
  return null;
}

/**
 * Lookup a move from the opening book for the given position.
 * 
 * @param board The current board position
 * @param color The side to move
 * @param options Lookup options for move selection
 * @returns BookLookupResult with selected move (or null if not in book)
 */
export function lookupBookMove(
  board: BoardState,
  color: Color,
  options: BookLookupOptions = {}
): BookLookupResult {
  const entry = getBookEntry(board);
  
  if (!entry || entry.moves.length === 0) {
    return { move: null, entry: null, inBook: false };
  }
  
  // Create RNG for selection
  const seed = options.seed ?? Date.now();
  const rng = createSeededRandom(seed);
  
  // Select a book move
  const selectedStats = selectBookMove(entry.moves, options, rng);
  
  if (!selectedStats) {
    return { move: null, entry, inBook: true };
  }
  
  // Get legal moves and find the matching one
  const legalMoves = generateAllLegalMoves(board, color);
  const move = findMatchingMove(legalMoves, selectedStats);
  
  return { move, entry, inBook: true };
}

// ============================================================================
// Book Generation from Self-Play
// ============================================================================

/**
 * Game result for book generation.
 */
export interface GameForBook {
  /** Sequence of moves played */
  moves: Move[];
  /** Game result: 1 = white win, 0 = draw, -1 = black win */
  result: 1 | 0 | -1;
  /** Optional: position evaluations after each move */
  evaluations?: number[];
}

/**
 * Options for book generation.
 */
export interface BookGenerationOptions {
  /** Maximum depth (ply) to include in the book (default: 20) */
  maxDepth?: number;
  /** Minimum times a position must be seen to be included (default: 2) */
  minPositionCount?: number;
}

/**
 * Add a single game to the opening book.
 * 
 * @param game The game to add
 * @param startingBoard The starting position (for replay)
 * @param options Generation options
 */
export function addGameToBook(
  game: GameForBook,
  startingBoard: BoardState,
  options: BookGenerationOptions = {}
): void {
  const maxDepth = options.maxDepth ?? 20;
  
  let currentBoard = new Map(startingBoard);
  let currentColor: Color = 'white';
  
  for (let ply = 0; ply < Math.min(game.moves.length, maxDepth); ply++) {
    const move = game.moves[ply]!;
    const hash = computeZobristHash(currentBoard);
    
    // Get or create book entry for this position
    let entry = openingBook.entries.get(hash);
    if (!entry) {
      entry = {
        hash,
        moves: [],
        totalVisits: 0,
      };
      openingBook.entries.set(hash, entry);
    }
    
    entry.totalVisits++;
    
    // Find or create move stats
    let moveStats = entry.moves.find(
      m => m.from.q === move.from.q &&
           m.from.r === move.from.r &&
           m.to.q === move.to.q &&
           m.to.r === move.to.r &&
           m.promotion === move.promotion
    );
    
    if (!moveStats) {
      moveStats = {
        from: { q: move.from.q, r: move.from.r },
        to: { q: move.to.q, r: move.to.r },
        playCount: 0,
        wins: 0,
        draws: 0,
        avgScore: 0,
        promotion: move.promotion,
      };
      entry.moves.push(moveStats);
    }
    
    moveStats.playCount++;
    
    // Update win/draw stats based on game result
    // Win for the side that played the move
    if (game.result === 1 && currentColor === 'white') {
      moveStats.wins++;
    } else if (game.result === -1 && currentColor === 'black') {
      moveStats.wins++;
    } else if (game.result === 0) {
      moveStats.draws++;
    }
    
    // Update average score if evaluations provided
    if (game.evaluations && game.evaluations[ply] !== undefined) {
      const eval_ = game.evaluations[ply]!;
      // Convert to moving side's perspective
      const sideEval = currentColor === 'white' ? eval_ : -eval_;
      // Running average
      moveStats.avgScore = 
        (moveStats.avgScore * (moveStats.playCount - 1) + sideEval) / moveStats.playCount;
    }
    
    // Apply the move
    currentBoard = applyMove(currentBoard, move);
    currentColor = oppositeColor(currentColor);
    
    // Update max depth in metadata
    if (ply + 1 > openingBook.metadata.maxDepth) {
      openingBook.metadata.maxDepth = ply + 1;
    }
  }
  
  openingBook.metadata.gamesCount++;
}

/**
 * Generate an opening book from multiple games.
 * 
 * @param games Array of games to include
 * @param startingBoard The starting position
 * @param options Generation options
 * @returns The generated opening book
 */
export function generateOpeningBook(
  games: GameForBook[],
  startingBoard: BoardState,
  options: BookGenerationOptions = {}
): OpeningBook {
  // Clear and reset
  clearOpeningBook();
  
  // Add all games
  for (const game of games) {
    addGameToBook(game, startingBoard, options);
  }
  
  // Prune positions with too few visits
  const minCount = options.minPositionCount ?? 2;
  pruneBook(minCount);
  
  openingBook.metadata.createdAt = new Date().toISOString();
  
  return openingBook;
}

/**
 * Remove positions with fewer than minCount visits.
 */
export function pruneBook(minCount: number): void {
  const entries = openingBook.entries;
  const toDelete: number[] = [];
  
  for (const [hash, entry] of entries) {
    if (entry.totalVisits < minCount) {
      toDelete.push(hash);
    } else {
      // Also prune moves with too few plays within each entry
      entry.moves = entry.moves.filter(m => m.playCount >= Math.max(1, Math.floor(minCount / 2)));
    }
  }
  
  for (const hash of toDelete) {
    entries.delete(hash);
  }
}

// ============================================================================
// Book Serialization
// ============================================================================

/**
 * Serialized format for book entry (JSON-compatible).
 */
interface SerializedBookEntry {
  hash: number;
  moves: BookMoveStats[];
  totalVisits: number;
}

/**
 * Serialized format for opening book (JSON-compatible).
 */
export interface SerializedOpeningBook {
  entries: SerializedBookEntry[];
  metadata: OpeningBook['metadata'];
}

/**
 * Serialize opening book to JSON-compatible format.
 */
export function serializeBook(book: OpeningBook = openingBook): SerializedOpeningBook {
  const entries: SerializedBookEntry[] = [];
  
  for (const [hash, entry] of book.entries) {
    entries.push({
      hash,
      moves: entry.moves,
      totalVisits: entry.totalVisits,
    });
  }
  
  return {
    entries,
    metadata: book.metadata,
  };
}

/**
 * Deserialize opening book from JSON format.
 */
export function deserializeBook(data: SerializedOpeningBook): OpeningBook {
  const entries = new Map<number, BookEntry>();
  
  for (const entry of data.entries) {
    entries.set(entry.hash, {
      hash: entry.hash,
      moves: entry.moves,
      totalVisits: entry.totalVisits,
    });
  }
  
  return {
    entries,
    metadata: data.metadata,
  };
}

/**
 * Export opening book to JSON string.
 */
export function exportBookToJSON(book: OpeningBook = openingBook): string {
  return JSON.stringify(serializeBook(book), null, 2);
}

/**
 * Import opening book from JSON string.
 */
export function importBookFromJSON(json: string): OpeningBook {
  const data = JSON.parse(json) as SerializedOpeningBook;
  return deserializeBook(data);
}

/**
 * Load opening book from JSON string and set as active book.
 */
export function loadBookFromJSON(json: string): void {
  const book = importBookFromJSON(json);
  setOpeningBook(book);
}

// ============================================================================
// Book Statistics
// ============================================================================

/**
 * Statistics about the opening book.
 */
export interface BookStatistics {
  /** Total number of positions */
  positionCount: number;
  /** Total number of move entries (across all positions) */
  totalMoveEntries: number;
  /** Average moves per position */
  avgMovesPerPosition: number;
  /** Maximum depth in the book */
  maxDepth: number;
  /** Number of games used to generate */
  gamesCount: number;
  /** Most visited position hash */
  mostVisitedPosition: number | null;
  /** Highest play count for any single move */
  highestPlayCount: number;
}

/**
 * Get statistics about the current opening book.
 */
export function getBookStatistics(): BookStatistics {
  let totalMoveEntries = 0;
  let mostVisitedPosition: number | null = null;
  let mostVisits = 0;
  let highestPlayCount = 0;
  
  for (const [hash, entry] of openingBook.entries) {
    totalMoveEntries += entry.moves.length;
    
    if (entry.totalVisits > mostVisits) {
      mostVisits = entry.totalVisits;
      mostVisitedPosition = hash;
    }
    
    for (const move of entry.moves) {
      if (move.playCount > highestPlayCount) {
        highestPlayCount = move.playCount;
      }
    }
  }
  
  const positionCount = openingBook.entries.size;
  
  return {
    positionCount,
    totalMoveEntries,
    avgMovesPerPosition: positionCount > 0 ? totalMoveEntries / positionCount : 0,
    maxDepth: openingBook.metadata.maxDepth,
    gamesCount: openingBook.metadata.gamesCount,
    mostVisitedPosition,
    highestPlayCount,
  };
}

/**
 * Format book entry for display (debugging/UI).
 */
export function formatBookEntry(entry: BookEntry): string {
  const lines: string[] = [];
  lines.push(`Position hash: ${entry.hash} (visited ${entry.totalVisits} times)`);
  lines.push('Moves:');
  
  // Sort by play count
  const sortedMoves = [...entry.moves].sort((a, b) => b.playCount - a.playCount);
  
  for (const move of sortedMoves) {
    const winRate = calculateWinRate(move);
    const fromStr = coordToString(move.from);
    const toStr = coordToString(move.to);
    const promo = move.promotion ? ` (=${move.promotion})` : '';
    lines.push(
      `  ${fromStr}-${toStr}${promo}: ` +
      `played=${move.playCount}, wins=${move.wins}, draws=${move.draws}, ` +
      `winRate=${(winRate * 100).toFixed(1)}%`
    );
  }
  
  return lines.join('\n');
}
