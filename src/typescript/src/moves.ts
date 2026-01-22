/**
 * Underchex Move Generation and Validation
 * 
 * Signed-by: agent #1 claude-sonnet-4 via opencode 20260122T02:18:57
 */

import {
  HexCoord,
  Direction,
  ALL_DIRECTIONS,
  DIAGONAL_DIRECTIONS,
  LANCE_A_DIRECTIONS,
  LANCE_B_DIRECTIONS,
  PieceType,
  Piece,
  Color,
  BoardState,
  GameState,
  Move,
  MoveValidation,
  coordToString,
  coordsEqual,
  oppositeColor,
} from './types';

import {
  isValidCell,
  getNeighbor,
  getDirection,
  getRay,
  getCellsBetween,
  getKnightTargets,
} from './board';

// ============================================================================
// Piece Movement Patterns
// ============================================================================

/**
 * Get the forward direction for a color.
 */
export function getForwardDirection(color: Color): Direction {
  return color === 'white' ? 'N' : 'S';
}

/**
 * Get pawn capture directions for a color.
 */
export function getPawnCaptureDirections(color: Color): readonly Direction[] {
  return color === 'white' ? ['N', 'NE', 'NW'] : ['S', 'SE', 'SW'];
}

/**
 * Get directions a piece can move in.
 */
export function getPieceDirections(piece: Piece): readonly Direction[] {
  switch (piece.type) {
    case 'king':
    case 'queen':
      return ALL_DIRECTIONS;
    case 'chariot':
      return DIAGONAL_DIRECTIONS;
    case 'lance':
      return piece.variant === 'A' ? LANCE_A_DIRECTIONS : LANCE_B_DIRECTIONS;
    default:
      return [];
  }
}

/**
 * Check if a piece is a slider (can move multiple squares).
 */
export function isSlider(pieceType: PieceType): boolean {
  return pieceType === 'queen' || pieceType === 'lance' || pieceType === 'chariot';
}

// ============================================================================
// Move Generation
// ============================================================================

/**
 * Get piece at a position, or undefined if empty.
 */
export function getPieceAt(board: BoardState, coord: HexCoord): Piece | undefined {
  return board.get(coordToString(coord));
}

/**
 * Check if a cell is occupied.
 */
export function isOccupied(board: BoardState, coord: HexCoord): boolean {
  return board.has(coordToString(coord));
}

/**
 * Check if a cell has an enemy piece.
 */
export function hasEnemy(board: BoardState, coord: HexCoord, color: Color): boolean {
  const piece = getPieceAt(board, coord);
  return piece !== undefined && piece.color !== color;
}

/**
 * Check if a cell has a friendly piece.
 */
export function hasFriendly(board: BoardState, coord: HexCoord, color: Color): boolean {
  const piece = getPieceAt(board, coord);
  return piece !== undefined && piece.color === color;
}

/**
 * Generate pseudo-legal moves for a piece (doesn't check for leaving king in check).
 */
export function generatePseudoLegalMoves(
  board: BoardState,
  piece: Piece,
  from: HexCoord
): Move[] {
  const moves: Move[] = [];
  
  switch (piece.type) {
    case 'pawn':
      generatePawnMoves(board, piece, from, moves);
      break;
    case 'king':
      generateKingMoves(board, piece, from, moves);
      break;
    case 'knight':
      generateKnightMoves(board, piece, from, moves);
      break;
    case 'queen':
    case 'lance':
    case 'chariot':
      generateSliderMoves(board, piece, from, moves);
      break;
  }
  
  return moves;
}

function generatePawnMoves(
  board: BoardState,
  piece: Piece,
  from: HexCoord,
  moves: Move[]
): void {
  const forwardDir = getForwardDirection(piece.color);
  const captureDirections = getPawnCaptureDirections(piece.color);
  
  // Forward move (non-capture)
  const forward = getNeighbor(from, forwardDir);
  if (forward && !isOccupied(board, forward)) {
    moves.push(createMove(piece, from, forward));
  }
  
  // Captures (including forward capture)
  for (const dir of captureDirections) {
    const target = getNeighbor(from, dir);
    if (target && hasEnemy(board, target, piece.color)) {
      const captured = getPieceAt(board, target)!;
      moves.push(createMove(piece, from, target, captured));
    }
  }
}

function generateKingMoves(
  board: BoardState,
  piece: Piece,
  from: HexCoord,
  moves: Move[]
): void {
  for (const dir of ALL_DIRECTIONS) {
    const target = getNeighbor(from, dir);
    if (target && !hasFriendly(board, target, piece.color)) {
      const captured = getPieceAt(board, target);
      moves.push(createMove(piece, from, target, captured));
    }
  }
}

function generateKnightMoves(
  board: BoardState,
  piece: Piece,
  from: HexCoord,
  moves: Move[]
): void {
  for (const target of getKnightTargets(from)) {
    if (!hasFriendly(board, target, piece.color)) {
      const captured = getPieceAt(board, target);
      moves.push(createMove(piece, from, target, captured));
    }
  }
}

function generateSliderMoves(
  board: BoardState,
  piece: Piece,
  from: HexCoord,
  moves: Move[]
): void {
  const directions = getPieceDirections(piece);
  
  for (const dir of directions) {
    const ray = getRay(from, dir);
    for (const target of ray) {
      if (hasFriendly(board, target, piece.color)) {
        break; // Blocked by friendly piece
      }
      const captured = getPieceAt(board, target);
      moves.push(createMove(piece, from, target, captured));
      if (captured) {
        break; // Can't move past a captured piece
      }
    }
  }
}

function createMove(
  piece: Piece,
  from: HexCoord,
  to: HexCoord,
  captured?: Piece
): Move {
  return { piece, from, to, captured };
}

// ============================================================================
// Check Detection
// ============================================================================

/**
 * Find the king of a given color.
 */
export function findKing(board: BoardState, color: Color): HexCoord | null {
  for (const [posStr, piece] of board.entries()) {
    if (piece.type === 'king' && piece.color === color) {
      const parts = posStr.split(',').map(Number);
      const q = parts[0] ?? 0;
      const r = parts[1] ?? 0;
      return { q, r };
    }
  }
  return null;
}

/**
 * Check if a square is attacked by any piece of the given color.
 */
export function isAttacked(
  board: BoardState,
  target: HexCoord,
  byColor: Color
): boolean {
  // Check for pawn attacks
  const pawnCaptureDirections = getPawnCaptureDirections(byColor);
  for (const dir of pawnCaptureDirections) {
    // Check in reverse direction from target
    const reverseDir = getOppositeDirection(dir);
    const attacker = getNeighbor(target, reverseDir);
    if (attacker) {
      const piece = getPieceAt(board, attacker);
      if (piece?.type === 'pawn' && piece.color === byColor) {
        return true;
      }
    }
  }
  
  // Check for king attacks
  for (const dir of ALL_DIRECTIONS) {
    const attacker = getNeighbor(target, dir);
    if (attacker) {
      const piece = getPieceAt(board, attacker);
      if (piece?.type === 'king' && piece.color === byColor) {
        return true;
      }
    }
  }
  
  // Check for knight attacks
  for (const attackerPos of getKnightTargets(target)) {
    const piece = getPieceAt(board, attackerPos);
    if (piece?.type === 'knight' && piece.color === byColor) {
      return true;
    }
  }
  
  // Check for slider attacks (queen, lance, chariot)
  for (const dir of ALL_DIRECTIONS) {
    const ray = getRay(target, dir);
    for (const pos of ray) {
      const piece = getPieceAt(board, pos);
      if (!piece) continue;
      if (piece.color !== byColor) break;
      
      // Check if this piece can attack along this direction
      const pieceDirections = getPieceDirections(piece);
      const reverseDir = getOppositeDirection(dir);
      if ((pieceDirections as readonly Direction[]).includes(reverseDir) && isSlider(piece.type)) {
        return true;
      }
      break; // Blocked by this piece either way
    }
  }
  
  return false;
}

function getOppositeDirection(dir: Direction): Direction {
  const opposites: Record<Direction, Direction> = {
    N: 'S', S: 'N',
    NE: 'SW', SW: 'NE',
    NW: 'SE', SE: 'NW',
  };
  return opposites[dir];
}

/**
 * Check if the king of a given color is in check.
 */
export function isInCheck(board: BoardState, color: Color): boolean {
  const kingPos = findKing(board, color);
  if (!kingPos) return false; // No king - shouldn't happen in valid game
  return isAttacked(board, kingPos, oppositeColor(color));
}

// ============================================================================
// Legal Move Generation
// ============================================================================

/**
 * Apply a move to a board state (returns new board state).
 */
export function applyMove(board: BoardState, move: Move): BoardState {
  const newBoard = new Map(board);
  newBoard.delete(coordToString(move.from));
  newBoard.set(coordToString(move.to), move.piece);
  return newBoard;
}

/**
 * Generate all legal moves for a piece.
 */
export function generateLegalMoves(
  board: BoardState,
  piece: Piece,
  from: HexCoord
): Move[] {
  const pseudoLegal = generatePseudoLegalMoves(board, piece, from);
  
  return pseudoLegal.filter(move => {
    const newBoard = applyMove(board, move);
    return !isInCheck(newBoard, piece.color);
  });
}

/**
 * Generate all legal moves for a player.
 */
export function generateAllLegalMoves(board: BoardState, color: Color): Move[] {
  const moves: Move[] = [];
  
  for (const [posStr, piece] of board.entries()) {
    if (piece.color !== color) continue;
    const parts = posStr.split(',').map(Number);
    const q = parts[0] ?? 0;
    const r = parts[1] ?? 0;
    const from = { q, r };
    moves.push(...generateLegalMoves(board, piece, from));
  }
  
  return moves;
}

// ============================================================================
// Move Validation
// ============================================================================

/**
 * Validate a specific move.
 */
export function validateMove(
  board: BoardState,
  from: HexCoord,
  to: HexCoord,
  turn: Color
): MoveValidation {
  const piece = getPieceAt(board, from);
  
  if (!piece) {
    return { legal: false, reason: 'noPieceAtSource' };
  }
  
  if (piece.color !== turn) {
    return { legal: false, reason: 'notYourPiece' };
  }
  
  if (!isValidCell(to)) {
    return { legal: false, reason: 'invalidDestination' };
  }
  
  const legalMoves = generateLegalMoves(board, piece, from);
  const matchingMove = legalMoves.find(m => coordsEqual(m.to, to));
  
  if (!matchingMove) {
    // Check if it would leave king in check
    const pseudoLegal = generatePseudoLegalMoves(board, piece, from);
    const pseudoMatch = pseudoLegal.find(m => coordsEqual(m.to, to));
    
    if (pseudoMatch) {
      return { legal: false, reason: 'movesIntoCheck' };
    }
    
    return { legal: false, reason: 'illegalMove' };
  }
  
  return { 
    legal: true, 
    capture: matchingMove.captured !== undefined 
  };
}
