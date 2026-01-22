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
  isPromotionZone,
  PROMOTION_TARGETS,
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

// Re-export AI
export {
  PIECE_VALUES,
  CHECKMATE_VALUE,
  STALEMATE_VALUE,
  // Piece-Square Tables (PST) exports
  PieceSquareTable,
  PAWN_PST,
  KNIGHT_PST,
  LANCE_PST,
  CHARIOT_PST,
  QUEEN_PST,
  KING_MG_PST,
  KING_EG_PST,
  PIECE_SQUARE_TABLES,
  getPSTBonus,
  isEndgame,
  // Legacy position evaluation (deprecated but kept for compatibility)
  getCentralityBonus,
  getPawnAdvancementBonus,
  getPiecePositionBonus,
  evaluateMaterial,
  evaluateMobility,
  evaluatePosition,
  evaluateForColor,
  estimateMoveValue,
  orderMoves,
  SearchStats,
  SearchResult,
  findBestMove,
  findBestMoveIterative,
  AIDifficulty,
  getDifficultyParams,
  getAIMove,
  // Zobrist hashing exports
  ZobristTable,
  initZobristTable,
  getZobristTable,
  computeZobristHash,
  zobristUpdate,
  // Transposition table exports
  TTEntryType,
  TTEntry,
  generateBoardHash,
  ttStore,
  ttProbe,
  ttClear,
  ttSize,
  // Quiescence search exports
  isTacticalMove,
  generateTacticalMoves,
} from './ai';

// Re-export self-play
export {
  GameResult,
  SelfPlayStats,
  SelfPlayConfig,
  DEFAULT_SELFPLAY_CONFIG,
  playSingleGame,
  runSelfPlay,
  formatSelfPlayReport,
  moveToNotation,
  exportGameHistory,
  analyzeCaptureFrequency,
  analyzeGamePhases,
} from './selfplay';
