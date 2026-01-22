/**
 * Underchex Core Types
 * 
 * Signed-by: agent #1 claude-sonnet-4 via opencode 20260122T02:18:57
 */

// ============================================================================
// Coordinate System
// ============================================================================

/**
 * Axial coordinates for hex grid.
 * The third coordinate s = -q - r is implicit.
 */
export interface HexCoord {
  readonly q: number;
  readonly r: number;
}

/**
 * Cube coordinates for hex grid (useful for algorithms).
 * Invariant: x + y + z = 0
 */
export interface CubeCoord {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * Direction vectors in axial coordinates.
 */
export type Direction = 'N' | 'S' | 'NE' | 'SW' | 'NW' | 'SE';

export const DIRECTIONS: Record<Direction, HexCoord> = {
  N:  { q:  0, r: -1 },
  S:  { q:  0, r:  1 },
  NE: { q:  1, r: -1 },
  SW: { q: -1, r:  1 },
  NW: { q: -1, r:  0 },
  SE: { q:  1, r:  0 },
} as const;

export const ALL_DIRECTIONS: readonly Direction[] = ['N', 'S', 'NE', 'SW', 'NW', 'SE'];
export const DIAGONAL_DIRECTIONS: readonly Direction[] = ['NE', 'NW', 'SE', 'SW'];
export const LANCE_A_DIRECTIONS: readonly Direction[] = ['N', 'S', 'NW', 'SE'];
export const LANCE_B_DIRECTIONS: readonly Direction[] = ['N', 'S', 'NE', 'SW'];

// ============================================================================
// Pieces
// ============================================================================

export type PieceType = 'pawn' | 'king' | 'queen' | 'knight' | 'lance' | 'chariot';
export type Color = 'white' | 'black';
export type LanceVariant = 'A' | 'B';

export interface Piece {
  readonly type: PieceType;
  readonly color: Color;
  readonly variant?: LanceVariant; // Only for lances
}

/**
 * A piece placed on the board.
 */
export interface PlacedPiece extends Piece {
  readonly position: HexCoord;
}

// ============================================================================
// Board State
// ============================================================================

export const BOARD_RADIUS = 4;
export const TOTAL_CELLS = 61; // For radius 4 hex board

/**
 * Promotion zone: White promotes at r=-4, Black promotes at r=4
 */
export function isPromotionZone(coord: HexCoord, color: Color): boolean {
  const targetR = color === 'white' ? -BOARD_RADIUS : BOARD_RADIUS;
  return coord.r === targetR;
}

/**
 * Board state as a map from position string to piece.
 * Position string format: "q,r"
 */
export type BoardState = Map<string, Piece>;

/**
 * Full game state.
 */
export interface GameState {
  readonly board: BoardState;
  readonly turn: Color;
  readonly moveNumber: number;
  readonly halfMoveClock: number; // For 50-move rule
  readonly history: readonly Move[];
  readonly status: GameStatus;
}

export type GameStatus = 
  | { type: 'ongoing' }
  | { type: 'checkmate'; winner: Color }
  | { type: 'stalemate' }
  | { type: 'draw'; reason: string }
  | { type: 'resigned'; winner: Color };

// ============================================================================
// Moves
// ============================================================================

export interface Move {
  readonly from: HexCoord;
  readonly to: HexCoord;
  readonly piece: Piece;
  readonly captured?: Piece;
  readonly promotion?: PieceType; // For pawn promotion (queen, chariot, lance, knight)
}

/**
 * Valid promotion targets for pawns.
 * Note: Lance promotion requires a variant to be specified separately.
 */
export const PROMOTION_TARGETS: readonly PieceType[] = ['queen', 'chariot', 'lance', 'knight'];

export interface MoveValidation {
  readonly legal: boolean;
  readonly reason?: string;
  readonly capture?: boolean;
}

// ============================================================================
// Utility Functions (Type Guards)
// ============================================================================

export function coordToString(coord: HexCoord): string {
  return `${coord.q},${coord.r}`;
}

export function stringToCoord(str: string): HexCoord {
  const parts = str.split(',').map(Number);
  const q = parts[0] ?? 0;
  const r = parts[1] ?? 0;
  return { q, r };
}

export function coordsEqual(a: HexCoord, b: HexCoord): boolean {
  return a.q === b.q && a.r === b.r;
}

/**
 * Convert axial to cube coordinates.
 */
export function axialToCube(coord: HexCoord): CubeCoord {
  return {
    x: coord.q,
    y: -coord.q - coord.r,
    z: coord.r,
  };
}

/**
 * Convert cube to axial coordinates.
 */
export function cubeToAxial(coord: CubeCoord): HexCoord {
  return {
    q: coord.x,
    r: coord.z,
  };
}

/**
 * Get opposite color.
 */
export function oppositeColor(color: Color): Color {
  return color === 'white' ? 'black' : 'white';
}
