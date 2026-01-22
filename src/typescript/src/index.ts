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
  estimateMoveValueWithSEE,
  orderMoves,
  orderMovesWithSEE,
  SearchStats,
  SearchResult,
  findBestMove,
  findBestMoveIterative,
  AIDifficulty,
  AIOptions,
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
  // History heuristic exports (added by agent #7)
  HistoryTable,
  historyUpdate,
  historyScore,
  historyClear,
  historyAge,
  historySize,
  // Null move pruning exports (added by agent #7)
  nullMoveReduction,
  hasNullMoveMaterial,
  shouldTryNullMove,
  // Killer move heuristic exports (added by agent #8)
  KillerTable,
  killerStore,
  killerGet,
  isKillerMove,
  killerScore,
  killerClear,
  killerCount,
  // Late Move Reductions exports (added by agent #9)
  lmrReduction,
  shouldApplyLMR,
  adjustLMRReduction,
  // Aspiration Windows exports (added by agent #11)
  ASPIRATION_WINDOW,
  ASPIRATION_WINDOW_EXPANSION,
  ASPIRATION_MIN_DEPTH,
  // Futility Pruning exports (added by agent #12)
  FUTILITY_MAX_DEPTH,
  FUTILITY_MARGINS,
  canFutilityPrune,
  // Static Exchange Evaluation exports (added by agent #13)
  getAttackers,
  staticExchangeEvaluation,
  isWinningCapture,
  isLosingCapture,
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

// Re-export puzzle generation (added by agent #14)
export {
  PuzzleDifficulty,
  PuzzleTheme,
  Puzzle,
  PuzzleGeneratorConfig,
  PuzzleGenerationResult,
  DEFAULT_PUZZLE_CONFIG,
  classifyDifficulty,
  identifyThemes,
  extractPrincipalVariation,
  validatePuzzle,
  generatePuzzlesFromGame,
  generatePuzzlesFromGames,
  createPuzzleFromPosition,
  checkPuzzleMove,
  getPuzzlePositionAfterMoves,
  getPuzzleHint,
  serializePuzzle,
  deserializePuzzle,
  formatPuzzle,
  formatPuzzleReport,
} from './puzzles';

// Re-export opening book (added by agent #27)
export {
  BookMoveStats,
  BookEntry,
  OpeningBook,
  BookLookupOptions,
  BookLookupResult,
  GameForBook,
  BookGenerationOptions,
  SerializedOpeningBook,
  BookStatistics,
  getOpeningBook,
  setOpeningBook,
  clearOpeningBook,
  getBookEntry,
  isInBook,
  getBookSize,
  calculateWinRate,
  lookupBookMove,
  addGameToBook,
  generateOpeningBook,
  pruneBook,
  serializeBook,
  deserializeBook,
  exportBookToJSON,
  importBookFromJSON,
  loadBookFromJSON,
  getBookStatistics,
  formatBookEntry,
} from './openingbook';
