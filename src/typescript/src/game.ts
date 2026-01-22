/**
 * Underchex Game State Management
 * 
 * Signed-by: agent #1 claude-sonnet-4 via opencode 20260122T02:18:57
 */

import {
  HexCoord,
  Piece,
  PieceType,
  Color,
  BoardState,
  GameState,
  GameStatus,
  Move,
  coordToString,
  coordsEqual,
  oppositeColor,
} from './types';

import {
  applyMove,
  generateAllLegalMoves,
  isInCheck,
  validateMove,
} from './moves';

// ============================================================================
// Initial Setup
// ============================================================================

interface PiecePlacement {
  piece: Piece;
  position: HexCoord;
}

/**
 * Standard starting position for Underchex.
 */
export function getStartingPosition(): PiecePlacement[] {
  const pieces: PiecePlacement[] = [];
  
  // White pieces
  pieces.push({ piece: { type: 'king', color: 'white' }, position: { q: 0, r: 4 } });
  pieces.push({ piece: { type: 'queen', color: 'white' }, position: { q: 1, r: 3 } });
  pieces.push({ piece: { type: 'chariot', color: 'white' }, position: { q: -2, r: 4 } });
  pieces.push({ piece: { type: 'chariot', color: 'white' }, position: { q: 2, r: 3 } });
  pieces.push({ piece: { type: 'lance', color: 'white', variant: 'A' }, position: { q: -1, r: 4 } });
  pieces.push({ piece: { type: 'lance', color: 'white', variant: 'B' }, position: { q: 1, r: 4 } });
  pieces.push({ piece: { type: 'knight', color: 'white' }, position: { q: -2, r: 3 } });
  pieces.push({ piece: { type: 'knight', color: 'white' }, position: { q: 2, r: 4 } });
  
  // White pawns
  const whitePawnPositions: HexCoord[] = [
    { q: -3, r: 3 },
    { q: -2, r: 2 },
    { q: -1, r: 2 },
    { q: 0, r: 2 },
    { q: 1, r: 2 },
    { q: 2, r: 2 },
  ];
  for (const pos of whitePawnPositions) {
    pieces.push({ piece: { type: 'pawn', color: 'white' }, position: pos });
  }
  
  // Black pieces (point reflection of white)
  pieces.push({ piece: { type: 'king', color: 'black' }, position: { q: 0, r: -4 } });
  pieces.push({ piece: { type: 'queen', color: 'black' }, position: { q: -1, r: -3 } });
  pieces.push({ piece: { type: 'chariot', color: 'black' }, position: { q: 2, r: -4 } });
  pieces.push({ piece: { type: 'chariot', color: 'black' }, position: { q: -2, r: -3 } });
  pieces.push({ piece: { type: 'lance', color: 'black', variant: 'A' }, position: { q: 1, r: -4 } });
  pieces.push({ piece: { type: 'lance', color: 'black', variant: 'B' }, position: { q: -1, r: -4 } });
  pieces.push({ piece: { type: 'knight', color: 'black' }, position: { q: 2, r: -3 } });
  pieces.push({ piece: { type: 'knight', color: 'black' }, position: { q: -2, r: -4 } });
  
  // Black pawns
  const blackPawnPositions: HexCoord[] = [
    { q: 3, r: -3 },
    { q: 2, r: -2 },
    { q: 1, r: -2 },
    { q: 0, r: -2 },
    { q: -1, r: -2 },
    { q: -2, r: -2 },
  ];
  for (const pos of blackPawnPositions) {
    pieces.push({ piece: { type: 'pawn', color: 'black' }, position: pos });
  }
  
  return pieces;
}

/**
 * Create initial board state from piece placements.
 */
export function createBoardFromPlacements(placements: PiecePlacement[]): BoardState {
  const board: BoardState = new Map();
  for (const { piece, position } of placements) {
    board.set(coordToString(position), piece);
  }
  return board;
}

/**
 * Create a new game with standard starting position.
 */
export function createNewGame(): GameState {
  const placements = getStartingPosition();
  const board = createBoardFromPlacements(placements);
  
  return {
    board,
    turn: 'white',
    moveNumber: 1,
    halfMoveClock: 0,
    history: [],
    status: { type: 'ongoing' },
  };
}

// ============================================================================
// Game State Updates
// ============================================================================

/**
 * Determine game status after a move.
 */
function determineStatus(board: BoardState, nextTurn: Color): GameStatus {
  const legalMoves = generateAllLegalMoves(board, nextTurn);
  
  if (legalMoves.length === 0) {
    if (isInCheck(board, nextTurn)) {
      return { type: 'checkmate', winner: oppositeColor(nextTurn) };
    } else {
      return { type: 'stalemate' };
    }
  }
  
  return { type: 'ongoing' };
}

/**
 * Make a move and return the new game state.
 * Returns null if the move is invalid.
 */
export function makeMove(
  state: GameState,
  from: HexCoord,
  to: HexCoord
): GameState | null {
  if (state.status.type !== 'ongoing') {
    return null; // Game is over
  }
  
  const validation = validateMove(state.board, from, to, state.turn);
  if (!validation.legal) {
    return null;
  }
  
  const piece = state.board.get(coordToString(from))!;
  const captured = state.board.get(coordToString(to));
  
  const move: Move = {
    piece,
    from,
    to,
    captured,
  };
  
  const newBoard = applyMove(state.board, move);
  const nextTurn = oppositeColor(state.turn);
  const status = determineStatus(newBoard, nextTurn);
  
  // Update half-move clock (reset on pawn move or capture)
  const halfMoveClock = (piece.type === 'pawn' || captured) 
    ? 0 
    : state.halfMoveClock + 1;
  
  // Increment move number when black moves
  const moveNumber = state.turn === 'black' 
    ? state.moveNumber + 1 
    : state.moveNumber;
  
  return {
    board: newBoard,
    turn: nextTurn,
    moveNumber,
    halfMoveClock,
    history: [...state.history, move],
    status,
  };
}

/**
 * Resign the game.
 */
export function resign(state: GameState, color: Color): GameState {
  return {
    ...state,
    status: { type: 'resigned', winner: oppositeColor(color) },
  };
}

// ============================================================================
// Game Queries
// ============================================================================

/**
 * Check if it's a specific player's turn.
 */
export function isPlayerTurn(state: GameState, color: Color): boolean {
  return state.status.type === 'ongoing' && state.turn === color;
}

/**
 * Get all legal moves for the current player.
 */
export function getLegalMoves(state: GameState): Move[] {
  if (state.status.type !== 'ongoing') {
    return [];
  }
  return generateAllLegalMoves(state.board, state.turn);
}

/**
 * Check if the current player is in check.
 */
export function isCurrentPlayerInCheck(state: GameState): boolean {
  return isInCheck(state.board, state.turn);
}
