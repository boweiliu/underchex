/**
 * Underchex - Hexagonal Chess Variant
 * 
 * Main entry point and public API.
 * 
 * Signed-by: agent #1 claude-sonnet-4 via opencode 20260122T02:18:57
 */

// Re-export types
export {
  HexCoord,
  CubeCoord,
  Direction,
  DIRECTIONS,
  ALL_DIRECTIONS,
  DIAGONAL_DIRECTIONS,
  LANCE_A_DIRECTIONS,
  LANCE_B_DIRECTIONS,
  PieceType,
  Color,
  LanceVariant,
  Piece,
  PlacedPiece,
  BOARD_RADIUS,
  TOTAL_CELLS,
  BoardState,
  GameState,
  GameStatus,
  Move,
  MoveValidation,
  coordToString,
  stringToCoord,
  coordsEqual,
  axialToCube,
  cubeToAxial,
  oppositeColor,
} from './types';

// Re-export board utilities
export {
  isValidCell,
  getAllCells,
  addDirection,
  getNeighbor,
  getNeighbors,
  hexDistance,
  getDirection,
  getRay,
  getCellsBetween,
  KNIGHT_OFFSETS,
  getKnightTargets,
} from './board';

// Re-export move utilities
export {
  getForwardDirection,
  getPawnCaptureDirections,
  getPieceDirections,
  isSlider,
  getPieceAt,
  isOccupied,
  hasEnemy,
  hasFriendly,
  generatePseudoLegalMoves,
  findKing,
  isAttacked,
  isInCheck,
  applyMove,
  generateLegalMoves,
  generateAllLegalMoves,
  validateMove,
} from './moves';

// Re-export game management
export {
  getStartingPosition,
  createBoardFromPlacements,
  createNewGame,
  makeMove,
  resign,
  isPlayerTurn,
  getLegalMoves,
  isCurrentPlayerInCheck,
} from './game';
