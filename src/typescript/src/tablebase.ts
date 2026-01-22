/**
 * Underchex Endgame Tablebase Module
 * 
 * Provides perfect endgame play for positions with few pieces:
 * - Precomputed Win/Draw/Loss (WDL) tables
 * - Distance to Mate (DTM) information
 * - Retrograde analysis for tablebase generation
 * - Integration with AI search for endgame positions
 * 
 * Supported endgames (initial implementation):
 * - KvK (King vs King) - Always draw
 * - KQvK (King+Queen vs King) - Win for the side with queen
 * - KLvK (King+Lance vs King) - Usually win, some draws
 * - KCvK (King+Chariot vs King) - Usually win, some draws
 * - KKNvK (King+Knight vs King) - Draw (insufficient material on hex board)
 * 
 * Signed-by: agent #33 claude-sonnet-4 via opencode 20260122T08:51:16
 */

import {
  BoardState,
  Move,
  Color,
  HexCoord,
  Piece,
  PieceType,
  coordToString,
  stringToCoord,
  oppositeColor,
  BOARD_RADIUS,
} from './types';

import {
  generateAllLegalMoves,
  applyMove,
  isInCheck,
  findKing,
  getPieceAt,
} from './moves';

import {
  isValidCell,
  getAllCells,
} from './board';

import {
  computeZobristHash,
  CHECKMATE_VALUE,
} from './ai';

// ============================================================================
// Tablebase Types
// ============================================================================

/**
 * Win/Draw/Loss outcome from the perspective of the side with more material.
 */
export type WDLOutcome = 'win' | 'draw' | 'loss';

/**
 * Entry in the tablebase for a single position.
 */
export interface TablebaseEntry {
  /** Win/Draw/Loss outcome for the side to move */
  wdl: WDLOutcome;
  /** Distance to mate (plies). 0 for checkmate, -1 for draws, positive for wins */
  dtm: number;
  /** Best move from this position (if winning or defending) */
  bestMove?: {
    from: HexCoord;
    to: HexCoord;
    promotion?: PieceType;
  };
}

/**
 * Tablebase for a specific piece configuration.
 * Key is a compact position encoding.
 */
export interface PieceTablebase {
  /** Configuration name (e.g., "KQvK") */
  name: string;
  /** Piece configuration description */
  description: string;
  /** Map from position hash to entry */
  entries: Map<string, TablebaseEntry>;
  /** Number of entries */
  size: number;
  /** Generation metadata */
  metadata: {
    generatedAt: string;
    generationTimeMs: number;
    winCount: number;
    drawCount: number;
    lossCount: number;
  };
}

/**
 * Configuration for which piece configurations to support.
 */
export interface TablebaseConfig {
  /** Piece types for the stronger side (excluding king) */
  strongerSide: PieceType[];
  /** Piece types for the weaker side (excluding king) - usually empty for basic tablebases */
  weakerSide: PieceType[];
  /** Name of this configuration */
  name: string;
}

/**
 * Result of tablebase probe.
 */
export interface TablebaseProbeResult {
  /** Whether position was found in tablebase */
  found: boolean;
  /** Entry if found */
  entry?: TablebaseEntry;
  /** Which tablebase was used */
  tablebaseName?: string;
}

// ============================================================================
// Position Encoding
// ============================================================================

/**
 * Encode a position into a canonical string for tablebase lookup.
 * The encoding is color-agnostic (we normalize so white is always the stronger side).
 * 
 * Format: "WK<q,r>-BK<q,r>-P1<type><q,r>-P2<type><q,r>...-<sideToMove>"
 * where pieces are sorted by type and position for canonicalization.
 */
export function encodePosition(board: BoardState, sideToMove: Color): string {
  // Find kings
  const whiteKing = findKing(board, 'white');
  const blackKing = findKing(board, 'black');
  
  if (!whiteKing || !blackKing) {
    return ''; // Invalid position
  }
  
  // Collect non-king pieces
  const whitePieces: { type: PieceType; pos: HexCoord; variant?: string }[] = [];
  const blackPieces: { type: PieceType; pos: HexCoord; variant?: string }[] = [];
  
  for (const [posStr, piece] of board.entries()) {
    if (piece.type === 'king') continue;
    const pos = stringToCoord(posStr);
    if (piece.color === 'white') {
      whitePieces.push({ type: piece.type, pos, variant: piece.variant });
    } else {
      blackPieces.push({ type: piece.type, pos, variant: piece.variant });
    }
  }
  
  // Sort pieces for canonicalization
  const sortPieces = (pieces: typeof whitePieces) => {
    return pieces.sort((a, b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      if (a.pos.q !== b.pos.q) return a.pos.q - b.pos.q;
      return a.pos.r - b.pos.r;
    });
  };
  
  sortPieces(whitePieces);
  sortPieces(blackPieces);
  
  // Determine stronger side (more pieces, or if equal, white is stronger by convention)
  const whiteStrength = whitePieces.length;
  const blackStrength = blackPieces.length;
  
  // Normalize so "stronger" side is always encoded first
  // This allows us to look up KQvK the same regardless of which color has the queen
  let strongerColor: Color;
  let strongerKing: HexCoord;
  let weakerKing: HexCoord;
  let strongerPieces: typeof whitePieces;
  let weakerPieces: typeof whitePieces;
  let normalizedSideToMove: Color;
  
  if (whiteStrength > blackStrength || (whiteStrength === blackStrength && sideToMove === 'white')) {
    strongerColor = 'white';
    strongerKing = whiteKing;
    weakerKing = blackKing;
    strongerPieces = whitePieces;
    weakerPieces = blackPieces;
    normalizedSideToMove = sideToMove;
  } else {
    strongerColor = 'black';
    strongerKing = blackKing;
    weakerKing = whiteKing;
    strongerPieces = blackPieces;
    weakerPieces = whitePieces;
    // Flip side to move when we flip the board
    normalizedSideToMove = sideToMove === 'white' ? 'black' : 'white';
  }
  
  // Build encoding string
  let encoding = `SK${strongerKing.q},${strongerKing.r}-WK${weakerKing.q},${weakerKing.r}`;
  
  for (const p of strongerPieces) {
    const variantSuffix = p.variant ? p.variant : '';
    encoding += `-S${p.type[0]!.toUpperCase()}${variantSuffix}${p.pos.q},${p.pos.r}`;
  }
  
  for (const p of weakerPieces) {
    const variantSuffix = p.variant ? p.variant : '';
    encoding += `-W${p.type[0]!.toUpperCase()}${variantSuffix}${p.pos.q},${p.pos.r}`;
  }
  
  // Add side to move (S = stronger side to move, W = weaker side to move)
  encoding += normalizedSideToMove === (strongerColor === sideToMove ? 'white' : 'black') 
    ? '-STM' : '-WTM';
  
  // Simpler encoding: use Zobrist hash with normalization info
  // For actual lookup, we'll track which color is "stronger"
  
  return encoding;
}

/**
 * Create a more compact hash-based key for tablebase lookup.
 * Includes piece configuration detection and position normalization.
 */
export function getTablebaseKey(board: BoardState, sideToMove: Color): string {
  // Use Zobrist hash plus side-to-move for the key
  // This is simpler but less canonical than the full encoding
  const hash = computeZobristHash(board);
  return `${hash}-${sideToMove}`;
}

/**
 * Detect the piece configuration of a position.
 * Returns null if not a supported tablebase configuration.
 */
export function detectConfiguration(board: BoardState): TablebaseConfig | null {
  const pieces: { color: Color; type: PieceType }[] = [];
  
  for (const piece of board.values()) {
    pieces.push({ color: piece.color, type: piece.type });
  }
  
  // Count pieces by color (excluding kings)
  const whitePieces = pieces.filter(p => p.color === 'white' && p.type !== 'king').map(p => p.type);
  const blackPieces = pieces.filter(p => p.color === 'black' && p.type !== 'king').map(p => p.type);
  
  // Check for supported configurations
  // KvK
  if (whitePieces.length === 0 && blackPieces.length === 0) {
    return { strongerSide: [], weakerSide: [], name: 'KvK' };
  }
  
  // Determine stronger and weaker sides
  let strongerSide: PieceType[];
  let weakerSide: PieceType[];
  
  if (whitePieces.length >= blackPieces.length) {
    strongerSide = whitePieces.sort();
    weakerSide = blackPieces.sort();
  } else {
    strongerSide = blackPieces.sort();
    weakerSide = whitePieces.sort();
  }
  
  // Generate configuration name
  const pieceAbbrev = (type: PieceType): string => {
    switch (type) {
      case 'queen': return 'Q';
      case 'lance': return 'L';
      case 'chariot': return 'C';
      case 'knight': return 'N';
      case 'pawn': return 'P';
      default: return type[0]!.toUpperCase();
    }
  };
  
  let name = 'K';
  for (const p of strongerSide) {
    name += pieceAbbrev(p);
  }
  name += 'vK';
  for (const p of weakerSide) {
    name += pieceAbbrev(p);
  }
  
  // Check if this configuration is supported (max 5 pieces for now)
  const totalPieces = 2 + strongerSide.length + weakerSide.length; // 2 kings
  if (totalPieces > 5) {
    return null; // Too complex for tablebase
  }
  
  // For now, only support configurations where weaker side has no pieces
  if (weakerSide.length > 0) {
    return null; // Future: support KQvKP etc.
  }
  
  // Supported: KvK, KQvK, KLvK, KCvK, KNvK, KQQvK, KQLvK, etc.
  return { strongerSide, weakerSide, name };
}

// ============================================================================
// Tablebase Storage
// ============================================================================

/**
 * Global tablebase storage.
 * Maps configuration name to the tablebase.
 */
const tablebases = new Map<string, PieceTablebase>();

/**
 * Get a tablebase by configuration name.
 */
export function getTablebase(name: string): PieceTablebase | undefined {
  return tablebases.get(name);
}

/**
 * Store a tablebase.
 */
export function setTablebase(tablebase: PieceTablebase): void {
  tablebases.set(tablebase.name, tablebase);
}

/**
 * Get all loaded tablebase names.
 */
export function getLoadedTablebases(): string[] {
  return Array.from(tablebases.keys());
}

/**
 * Clear all tablebases.
 */
export function clearTablebases(): void {
  tablebases.clear();
}

// ============================================================================
// Retrograde Analysis
// ============================================================================

/**
 * Generate all positions for a given piece configuration.
 * Used in retrograde analysis to enumerate the state space.
 */
export function* generateAllPositions(
  config: TablebaseConfig
): Generator<{ board: BoardState; sideToMove: Color }> {
  const allCells = getAllCells();
  
  // For KvK and similar simple endgames, enumerate all valid king placements
  // then all piece placements on remaining cells
  
  // Enumerate all white king positions
  for (const whiteKingPos of allCells) {
    // Enumerate all black king positions (must not be adjacent to white king)
    for (const blackKingPos of allCells) {
      // Kings cannot be on same cell
      if (whiteKingPos.q === blackKingPos.q && whiteKingPos.r === blackKingPos.r) {
        continue;
      }
      
      // Kings cannot be adjacent (would be check)
      const dq = Math.abs(whiteKingPos.q - blackKingPos.q);
      const dr = Math.abs(whiteKingPos.r - blackKingPos.r);
      const ds = Math.abs((-whiteKingPos.q - whiteKingPos.r) - (-blackKingPos.q - blackKingPos.r));
      if (Math.max(dq, dr, ds) <= 1) {
        continue;
      }
      
      // Generate positions with additional pieces
      const remainingCells = allCells.filter(c => 
        !(c.q === whiteKingPos.q && c.r === whiteKingPos.r) &&
        !(c.q === blackKingPos.q && c.r === blackKingPos.r)
      );
      
      if (config.strongerSide.length === 0) {
        // KvK - just yield the position with both sides to move
        for (const sideToMove of ['white', 'black'] as Color[]) {
          const board = new Map<string, Piece>();
          board.set(coordToString(whiteKingPos), { type: 'king', color: 'white' });
          board.set(coordToString(blackKingPos), { type: 'king', color: 'black' });
          yield { board, sideToMove };
        }
      } else if (config.strongerSide.length === 1) {
        // K + 1 piece vs K
        const pieceType = config.strongerSide[0]!;
        
        for (const piecePos of remainingCells) {
          for (const sideToMove of ['white', 'black'] as Color[]) {
            const board = new Map<string, Piece>();
            board.set(coordToString(whiteKingPos), { type: 'king', color: 'white' });
            board.set(coordToString(blackKingPos), { type: 'king', color: 'black' });
            
            // Place piece for white (stronger side)
            const piece: Piece = { type: pieceType, color: 'white' };
            if (pieceType === 'lance') {
              // Need to handle lance variants
              for (const variant of ['A', 'B'] as const) {
                const variantPiece: Piece = { type: 'lance', color: 'white', variant };
                board.set(coordToString(piecePos), variantPiece);
                
                // Check if position is legal (not in check for side to move)
                if (!isIllegalPosition(board, sideToMove)) {
                  yield { board: new Map(board), sideToMove };
                }
              }
            } else {
              board.set(coordToString(piecePos), piece);
              
              if (!isIllegalPosition(board, sideToMove)) {
                yield { board: new Map(board), sideToMove };
              }
            }
          }
        }
      } else if (config.strongerSide.length === 2) {
        // K + 2 pieces vs K
        const piece1Type = config.strongerSide[0]!;
        const piece2Type = config.strongerSide[1]!;
        
        for (let i = 0; i < remainingCells.length; i++) {
          for (let j = i + 1; j < remainingCells.length; j++) {
            const pos1 = remainingCells[i]!;
            const pos2 = remainingCells[j]!;
            
            for (const sideToMove of ['white', 'black'] as Color[]) {
              const board = new Map<string, Piece>();
              board.set(coordToString(whiteKingPos), { type: 'king', color: 'white' });
              board.set(coordToString(blackKingPos), { type: 'king', color: 'black' });
              
              // Handle lance variants if needed
              const variants1 = piece1Type === 'lance' ? ['A', 'B'] as const : [undefined];
              const variants2 = piece2Type === 'lance' ? ['A', 'B'] as const : [undefined];
              
              for (const v1 of variants1) {
                for (const v2 of variants2) {
                  const p1: Piece = v1 ? { type: 'lance', color: 'white', variant: v1 } : { type: piece1Type, color: 'white' };
                  const p2: Piece = v2 ? { type: 'lance', color: 'white', variant: v2 } : { type: piece2Type, color: 'white' };
                  
                  board.set(coordToString(pos1), p1);
                  board.set(coordToString(pos2), p2);
                  
                  if (!isIllegalPosition(board, sideToMove)) {
                    yield { board: new Map(board), sideToMove };
                  }
                }
              }
            }
          }
        }
      }
      // Can extend for more pieces as needed
    }
  }
}

/**
 * Check if a position is illegal (side to move is not in check when it shouldn't be,
 * or the opponent is in check with it being their turn).
 */
function isIllegalPosition(board: BoardState, sideToMove: Color): boolean {
  // The side NOT to move cannot be in check (would have been captured)
  const opponent = oppositeColor(sideToMove);
  if (isInCheck(board, opponent)) {
    return true;
  }
  return false;
}

/**
 * Determine the outcome of a terminal position.
 */
function getTerminalOutcome(board: BoardState, sideToMove: Color): { wdl: WDLOutcome; dtm: number } | null {
  const moves = generateAllLegalMoves(board, sideToMove);
  
  if (moves.length === 0) {
    // No legal moves
    if (isInCheck(board, sideToMove)) {
      // Checkmate - side to move loses
      return { wdl: 'loss', dtm: 0 };
    } else {
      // Stalemate - draw
      return { wdl: 'draw', dtm: -1 };
    }
  }
  
  return null; // Not terminal
}

/**
 * Generate a tablebase for a given configuration using retrograde analysis.
 * 
 * Algorithm:
 * 1. Initialize all positions as unknown
 * 2. Find all checkmate positions (DTM=0, loss for side to move)
 * 3. Propagate backwards: if a position has a move to a lost position, it's winning
 * 4. Continue until no more changes
 * 5. All remaining unknown positions are draws
 */
export function generateTablebase(config: TablebaseConfig): PieceTablebase {
  const startTime = Date.now();
  
  const tablebase: PieceTablebase = {
    name: config.name,
    description: `Endgame tablebase for ${config.name}`,
    entries: new Map(),
    size: 0,
    metadata: {
      generatedAt: new Date().toISOString(),
      generationTimeMs: 0,
      winCount: 0,
      drawCount: 0,
      lossCount: 0,
    },
  };
  
  // Phase 1: Initialize all positions and find terminal positions
  const positionMap = new Map<string, { board: BoardState; sideToMove: Color }>();
  const unknownPositions = new Set<string>();
  
  for (const { board, sideToMove } of generateAllPositions(config)) {
    const key = getTablebaseKey(board, sideToMove);
    positionMap.set(key, { board: new Map(board), sideToMove });
    
    // Check if terminal
    const terminal = getTerminalOutcome(board, sideToMove);
    if (terminal) {
      tablebase.entries.set(key, { ...terminal });
      if (terminal.wdl === 'loss') {
        tablebase.metadata.lossCount++;
      } else if (terminal.wdl === 'draw') {
        tablebase.metadata.drawCount++;
      }
    } else {
      unknownPositions.add(key);
    }
  }
  
  // Phase 2: Retrograde analysis
  // Iterate until no more positions are resolved
  let changed = true;
  let iteration = 0;
  const MAX_ITERATIONS = 500; // Safety limit
  
  while (changed && iteration < MAX_ITERATIONS) {
    changed = false;
    iteration++;
    
    const toResolve: string[] = [];
    
    for (const key of unknownPositions) {
      const pos = positionMap.get(key);
      if (!pos) continue;
      
      const moves = generateAllLegalMoves(pos.board, pos.sideToMove);
      
      // Check if any move leads to a lost position for opponent (= win for us)
      // Or all moves lead to won positions for opponent (= loss for us)
      let hasWinningMove = false;
      let allMovesLose = true;
      let bestMoveInfo: { from: HexCoord; to: HexCoord; dtm: number; promotion?: PieceType } | null = null;
      let maxDTM = 0;
      
      for (const move of moves) {
        const newBoard = applyMove(pos.board, move);
        const newKey = getTablebaseKey(newBoard, oppositeColor(pos.sideToMove));
        const opponentEntry = tablebase.entries.get(newKey);
        
        if (!opponentEntry) {
          // Unknown position - can't conclude yet
          allMovesLose = false;
          continue;
        }
        
        if (opponentEntry.wdl === 'loss') {
          // Opponent is lost = we win
          hasWinningMove = true;
          if (!bestMoveInfo || opponentEntry.dtm + 1 < bestMoveInfo.dtm) {
            // Find the fastest win
            bestMoveInfo = { 
              from: move.from, 
              to: move.to, 
              dtm: opponentEntry.dtm + 1,
              promotion: move.promotion,
            };
          }
        } else if (opponentEntry.wdl === 'win') {
          // Opponent wins = this move loses for us
          maxDTM = Math.max(maxDTM, opponentEntry.dtm);
        } else {
          // Draw - better than losing
          allMovesLose = false;
        }
      }
      
      if (hasWinningMove && bestMoveInfo) {
        // We have a winning move - this position is winning
        toResolve.push(key);
        tablebase.entries.set(key, {
          wdl: 'win',
          dtm: bestMoveInfo.dtm,
          bestMove: {
            from: bestMoveInfo.from,
            to: bestMoveInfo.to,
            promotion: bestMoveInfo.promotion,
          },
        });
        tablebase.metadata.winCount++;
        changed = true;
      } else if (allMovesLose && moves.length > 0) {
        // All moves lead to opponent winning - we lose
        toResolve.push(key);
        tablebase.entries.set(key, {
          wdl: 'loss',
          dtm: maxDTM + 1,
        });
        tablebase.metadata.lossCount++;
        changed = true;
      }
    }
    
    // Remove resolved positions from unknown set
    for (const key of toResolve) {
      unknownPositions.delete(key);
    }
  }
  
  // Phase 3: All remaining unknown positions are draws
  for (const key of unknownPositions) {
    tablebase.entries.set(key, {
      wdl: 'draw',
      dtm: -1, // No forced mate
    });
    tablebase.metadata.drawCount++;
  }
  
  tablebase.size = tablebase.entries.size;
  tablebase.metadata.generationTimeMs = Date.now() - startTime;
  
  return tablebase;
}

// ============================================================================
// Tablebase Probe
// ============================================================================

/**
 * Probe the tablebase for a position.
 */
export function probeTablebase(board: BoardState, sideToMove: Color): TablebaseProbeResult {
  // Detect configuration
  const config = detectConfiguration(board);
  if (!config) {
    return { found: false };
  }
  
  // Get the tablebase for this configuration
  const tablebase = tablebases.get(config.name);
  if (!tablebase) {
    return { found: false };
  }
  
  // Look up the position
  const key = getTablebaseKey(board, sideToMove);
  const entry = tablebase.entries.get(key);
  
  if (entry) {
    return {
      found: true,
      entry,
      tablebaseName: config.name,
    };
  }
  
  return { found: false };
}

/**
 * Get the tablebase move for a position.
 * Returns the best move according to the tablebase, or null if not found.
 */
export function getTablebaseMove(board: BoardState, sideToMove: Color): Move | null {
  const result = probeTablebase(board, sideToMove);
  
  if (!result.found || !result.entry?.bestMove) {
    return null;
  }
  
  // Reconstruct the move from the tablebase entry
  const { from, to, promotion } = result.entry.bestMove;
  const piece = getPieceAt(board, from);
  
  if (!piece) {
    return null;
  }
  
  const captured = getPieceAt(board, to);
  
  return {
    from,
    to,
    piece,
    captured: captured ?? undefined,
    promotion,
  };
}

/**
 * Get the tablebase evaluation for a position.
 * Returns a score in centipawns, where positive is good for sideToMove.
 * 
 * Winning: +CHECKMATE_VALUE - DTM (so quicker mates are better)
 * Drawing: 0
 * Losing: -CHECKMATE_VALUE + DTM (so slower losses are better)
 */
export function getTablebaseScore(board: BoardState, sideToMove: Color): number | null {
  const result = probeTablebase(board, sideToMove);
  
  if (!result.found || !result.entry) {
    return null;
  }
  
  switch (result.entry.wdl) {
    case 'win':
      return CHECKMATE_VALUE - result.entry.dtm;
    case 'draw':
      return 0;
    case 'loss':
      return -CHECKMATE_VALUE + result.entry.dtm;
  }
}

// ============================================================================
// Tablebase Initialization
// ============================================================================

/**
 * Generate and load common endgame tablebases.
 * Call this at startup or when tablebases are needed.
 */
export function initializeTablebases(): void {
  // Generate basic endgames
  const configs: TablebaseConfig[] = [
    { strongerSide: [], weakerSide: [], name: 'KvK' },
    { strongerSide: ['queen'], weakerSide: [], name: 'KQvK' },
    { strongerSide: ['lance'], weakerSide: [], name: 'KLvK' },
    { strongerSide: ['chariot'], weakerSide: [], name: 'KCvK' },
    { strongerSide: ['knight'], weakerSide: [], name: 'KNvK' },
  ];
  
  for (const config of configs) {
    const tablebase = generateTablebase(config);
    setTablebase(tablebase);
  }
}

/**
 * Generate a single tablebase on demand.
 */
export function generateTablebaseOnDemand(name: string): PieceTablebase | null {
  // Parse the configuration from the name
  // Format: K[pieces]vK[pieces]
  const match = name.match(/^K([QLCNP]*)vK([QLCNP]*)$/);
  if (!match) {
    return null;
  }
  
  const pieceMap: Record<string, PieceType> = {
    'Q': 'queen',
    'L': 'lance',
    'C': 'chariot',
    'N': 'knight',
    'P': 'pawn',
  };
  
  const strongerSide: PieceType[] = [];
  const weakerSide: PieceType[] = [];
  
  for (const char of match[1]!) {
    const pieceType = pieceMap[char];
    if (pieceType) {
      strongerSide.push(pieceType);
    }
  }
  
  for (const char of match[2]!) {
    const pieceType = pieceMap[char];
    if (pieceType) {
      weakerSide.push(pieceType);
    }
  }
  
  const config: TablebaseConfig = { strongerSide, weakerSide, name };
  const tablebase = generateTablebase(config);
  setTablebase(tablebase);
  
  return tablebase;
}

// ============================================================================
// Serialization
// ============================================================================

/**
 * Serialized tablebase format for JSON storage.
 */
export interface SerializedTablebase {
  name: string;
  description: string;
  entries: Array<{
    key: string;
    wdl: WDLOutcome;
    dtm: number;
    bestMove?: {
      from: { q: number; r: number };
      to: { q: number; r: number };
      promotion?: PieceType;
    };
  }>;
  metadata: PieceTablebase['metadata'];
}

/**
 * Serialize a tablebase to JSON-compatible format.
 */
export function serializeTablebase(tablebase: PieceTablebase): SerializedTablebase {
  const entries: SerializedTablebase['entries'] = [];
  
  for (const [key, entry] of tablebase.entries) {
    entries.push({
      key,
      wdl: entry.wdl,
      dtm: entry.dtm,
      bestMove: entry.bestMove ? {
        from: { q: entry.bestMove.from.q, r: entry.bestMove.from.r },
        to: { q: entry.bestMove.to.q, r: entry.bestMove.to.r },
        promotion: entry.bestMove.promotion,
      } : undefined,
    });
  }
  
  return {
    name: tablebase.name,
    description: tablebase.description,
    entries,
    metadata: tablebase.metadata,
  };
}

/**
 * Deserialize a tablebase from JSON format.
 */
export function deserializeTablebase(data: SerializedTablebase): PieceTablebase {
  const entries = new Map<string, TablebaseEntry>();
  
  for (const entry of data.entries) {
    entries.set(entry.key, {
      wdl: entry.wdl,
      dtm: entry.dtm,
      bestMove: entry.bestMove ? {
        from: { q: entry.bestMove.from.q, r: entry.bestMove.from.r },
        to: { q: entry.bestMove.to.q, r: entry.bestMove.to.r },
        promotion: entry.bestMove.promotion,
      } : undefined,
    });
  }
  
  return {
    name: data.name,
    description: data.description,
    entries,
    size: entries.size,
    metadata: data.metadata,
  };
}

/**
 * Export a tablebase to JSON string.
 */
export function exportTablebaseToJSON(tablebase: PieceTablebase): string {
  return JSON.stringify(serializeTablebase(tablebase), null, 2);
}

/**
 * Import a tablebase from JSON string.
 */
export function importTablebaseFromJSON(json: string): PieceTablebase {
  const data = JSON.parse(json) as SerializedTablebase;
  return deserializeTablebase(data);
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Get statistics about loaded tablebases.
 */
export function getTablebaseStatistics(): {
  totalEntries: number;
  tablebases: Array<{
    name: string;
    size: number;
    wins: number;
    draws: number;
    losses: number;
    generationTimeMs: number;
  }>;
} {
  let totalEntries = 0;
  const stats: ReturnType<typeof getTablebaseStatistics>['tablebases'] = [];
  
  for (const [name, tb] of tablebases) {
    totalEntries += tb.size;
    stats.push({
      name,
      size: tb.size,
      wins: tb.metadata.winCount,
      draws: tb.metadata.drawCount,
      losses: tb.metadata.lossCount,
      generationTimeMs: tb.metadata.generationTimeMs,
    });
  }
  
  return { totalEntries, tablebases: stats };
}

/**
 * Format tablebase statistics for display.
 */
export function formatTablebaseStatistics(): string {
  const stats = getTablebaseStatistics();
  
  let output = '=== Endgame Tablebase Statistics ===\n\n';
  output += `Total entries: ${stats.totalEntries.toLocaleString()}\n`;
  output += `Loaded tablebases: ${stats.tablebases.length}\n\n`;
  
  for (const tb of stats.tablebases) {
    output += `${tb.name}:\n`;
    output += `  Size: ${tb.size.toLocaleString()} positions\n`;
    output += `  Wins: ${tb.wins.toLocaleString()} (${(100 * tb.wins / tb.size).toFixed(1)}%)\n`;
    output += `  Draws: ${tb.draws.toLocaleString()} (${(100 * tb.draws / tb.size).toFixed(1)}%)\n`;
    output += `  Losses: ${tb.losses.toLocaleString()} (${(100 * tb.losses / tb.size).toFixed(1)}%)\n`;
    output += `  Generation time: ${tb.generationTimeMs}ms\n\n`;
  }
  
  return output;
}
