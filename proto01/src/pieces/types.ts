/**
 * Piece type definitions for Underchex.
 *
 * Task: PROTO-01.4
 * Decision: Minimal enums for piece identity. Movement rules deferred to PROTO-03.
 *
 * Key insight from README:
 * - Underchex is a DOWNGRADE from 8-way to 6-way adjacency
 * - Some pieces break 6-way symmetry intentionally (Lance, Chariot come in "colors")
 * - Knights/Elephants come in 3 colors (6 diagonal directions pair into 3)
 * - Lances come in 2 colors (the two 4-way subsets of 6-way movement)
 */

// ============================================================================
// Player / Color
// ============================================================================

export enum Player {
  White = 0,
  Black = 1,
}

export function oppositePlayer(p: Player): Player {
  return p === Player.White ? Player.Black : Player.White;
}

// ============================================================================
// Piece Types
// ============================================================================

/**
 * The kind of piece, independent of which player owns it.
 *
 * Design note: We use a flat enum rather than subclasses because:
 * 1. Pieces are data, not behavior (movement rules live elsewhere)
 * 2. Easy serialization (just a number)
 * 3. Pattern matching with switch exhaustiveness
 */
export enum PieceType {
  King = 0,
  Queen = 1,
  Pawn = 2,
  Knight = 3,    // aka Elephant - 3 color variants exist
  Lance = 4,     // 2 color variants exist
  Chariot = 5,
}

/**
 * For pieces with color variants (Knight, Lance), which variant.
 *
 * Knights have 3 colors (the 6 diagonal directions pair into 3 opposite pairs):
 *   - Color A: N-NW / S-SE axis
 *   - Color B: N-NE / S-SW axis
 *   - Color C: NW-SW / NE-SE axis (pure horizontal diagonals)
 *
 * Lances have 2 colors (two ways to pick 4 of 6 directions):
 *   - Color A: N, S, NW, SE (the "\" riders)
 *   - Color B: N, S, NE, SW (the "/" riders)
 *
 * Pieces without color variants (King, Queen, Pawn, Chariot) use null.
 */
export type PieceVariant = 'A' | 'B' | 'C' | null;

// ============================================================================
// Piece Instance
// ============================================================================

/**
 * A piece on the board.
 *
 * Immutable value object. Position is NOT stored here - that's the Board's job.
 * This represents the identity of a piece: who owns it, what type, what variant.
 */
export interface Piece {
  readonly owner: Player;
  readonly type: PieceType;
  readonly variant: PieceVariant;  // null for pieces without color variants
}

/**
 * Create a piece. Most pieces don't need a variant.
 */
export function piece(owner: Player, type: PieceType, variant?: PieceVariant): Piece {
  return {
    owner,
    type,
    variant: variant ?? null,
  };
}

// ============================================================================
// Convenience constructors
// ============================================================================

export const white = {
  king: (): Piece => piece(Player.White, PieceType.King),
  queen: (): Piece => piece(Player.White, PieceType.Queen),
  pawn: (): Piece => piece(Player.White, PieceType.Pawn),
  knight: (v: 'A' | 'B' | 'C'): Piece => piece(Player.White, PieceType.Knight, v),
  lance: (v: 'A' | 'B'): Piece => piece(Player.White, PieceType.Lance, v),
  chariot: (): Piece => piece(Player.White, PieceType.Chariot),
};

export const black = {
  king: (): Piece => piece(Player.Black, PieceType.King),
  queen: (): Piece => piece(Player.Black, PieceType.Queen),
  pawn: (): Piece => piece(Player.Black, PieceType.Pawn),
  knight: (v: 'A' | 'B' | 'C'): Piece => piece(Player.Black, PieceType.Knight, v),
  lance: (v: 'A' | 'B'): Piece => piece(Player.Black, PieceType.Lance, v),
  chariot: (): Piece => piece(Player.Black, PieceType.Chariot),
};

// ============================================================================
// Display
// ============================================================================

const PIECE_SYMBOLS: Record<PieceType, [string, string]> = {
  [PieceType.King]: ['K', 'k'],
  [PieceType.Queen]: ['Q', 'q'],
  [PieceType.Pawn]: ['P', 'p'],
  [PieceType.Knight]: ['N', 'n'],   // N for kNight (chess tradition)
  [PieceType.Lance]: ['L', 'l'],
  [PieceType.Chariot]: ['C', 'c'],
};

/**
 * Single character representation (uppercase = white, lowercase = black).
 */
export function pieceSymbol(p: Piece): string {
  const [white, black] = PIECE_SYMBOLS[p.type];
  return p.owner === Player.White ? white : black;
}

/**
 * Full name for display.
 */
export function pieceName(p: Piece): string {
  const owner = p.owner === Player.White ? 'White' : 'Black';
  const names: Record<PieceType, string> = {
    [PieceType.King]: 'King',
    [PieceType.Queen]: 'Queen',
    [PieceType.Pawn]: 'Pawn',
    [PieceType.Knight]: 'Knight',
    [PieceType.Lance]: 'Lance',
    [PieceType.Chariot]: 'Chariot',
  };
  const name = names[p.type];
  const variantSuffix = p.variant ? ` (${p.variant})` : '';
  return `${owner} ${name}${variantSuffix}`;
}
