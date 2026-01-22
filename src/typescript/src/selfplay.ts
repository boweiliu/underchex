/**
 * Underchex Self-Play Module
 * 
 * Runs AI vs AI games for:
 * - Testing game balance
 * - Analyzing piece values
 * - Generating training data
 * - Validating AI strength
 * 
 * Signed-by: agent #4 claude-sonnet-4 via opencode 20260122T02:42:41
 */

import {
  GameState,
  Move,
  Color,
  oppositeColor,
  coordToString,
} from './types';

import {
  createNewGame,
} from './game';

import {
  generateAllLegalMoves,
  applyMove,
  isInCheck,
} from './moves';

import {
  AIDifficulty,
  getAIMove,
  findBestMove,
  PIECE_VALUES,
  evaluatePosition,
  SearchStats,
} from './ai';

// ============================================================================
// Self-Play Types
// ============================================================================

/**
 * Result of a single self-play game.
 */
export interface GameResult {
  /** Winner color, or null for draw */
  winner: Color | null;
  /** How the game ended */
  endReason: 'checkmate' | 'stalemate' | 'draw_by_repetition' | 'draw_by_fifty_moves' | 'max_moves';
  /** Total number of moves (plies) */
  totalMoves: number;
  /** Full move history */
  moves: Move[];
  /** Final position evaluation from white's perspective */
  finalEval: number;
  /** Average nodes searched per move */
  avgNodesPerMove: number;
  /** Total time in milliseconds */
  totalTimeMs: number;
}

/**
 * Statistics from multiple self-play games.
 */
export interface SelfPlayStats {
  /** Total games played */
  totalGames: number;
  /** Number of white wins */
  whiteWins: number;
  /** Number of black wins */
  blackWins: number;
  /** Number of draws */
  draws: number;
  /** Average game length (moves) */
  avgGameLength: number;
  /** Shortest game length */
  minGameLength: number;
  /** Longest game length */
  maxGameLength: number;
  /** Win by checkmate count */
  checkmateCount: number;
  /** Win by stalemate count */
  stalemateCount: number;
  /** Games that hit max move limit */
  maxMovesCount: number;
  /** Individual game results */
  games: GameResult[];
  /** Total time for all games */
  totalTimeMs: number;
}

/**
 * Configuration for self-play.
 */
export interface SelfPlayConfig {
  /** Number of games to play */
  numGames: number;
  /** AI difficulty for white */
  whiteDifficulty: AIDifficulty;
  /** AI difficulty for black */
  blackDifficulty: AIDifficulty;
  /** Maximum moves per game (to prevent infinite games) */
  maxMoves: number;
  /** Enable 50-move draw rule */
  fiftyMoveRule: boolean;
  /** Enable threefold repetition draw */
  repetitionDraw: boolean;
  /** Callback after each game (for progress reporting) */
  onGameComplete?: (result: GameResult, gameIndex: number) => void;
}

// ============================================================================
// Self-Play Implementation
// ============================================================================

/**
 * Default self-play configuration.
 */
export const DEFAULT_SELFPLAY_CONFIG: SelfPlayConfig = {
  numGames: 10,
  whiteDifficulty: 'medium',
  blackDifficulty: 'medium',
  maxMoves: 200,
  fiftyMoveRule: true,
  repetitionDraw: false, // Not implemented yet - would need position hashing
  onGameComplete: undefined,
};

/**
 * Convert board state to a hash for repetition detection.
 * Simple implementation - could be improved with Zobrist hashing.
 */
function boardToHash(state: GameState): string {
  const pieces: string[] = [];
  for (const [pos, piece] of state.board.entries()) {
    pieces.push(`${pos}:${piece.color[0]}${piece.type[0]}`);
  }
  pieces.sort();
  return `${state.turn}-${pieces.join(',')}`;
}

/**
 * Play a single AI vs AI game.
 */
export function playSingleGame(
  whiteDifficulty: AIDifficulty,
  blackDifficulty: AIDifficulty,
  maxMoves: number = 200,
  fiftyMoveRule: boolean = true
): GameResult {
  const startTime = Date.now();
  let state = createNewGame();
  const moves: Move[] = [];
  let totalNodes = 0;
  let moveCount = 0;
  const positionHashes: Map<string, number> = new Map();
  
  while (state.status.type === 'ongoing' && moveCount < maxMoves) {
    // Check for 50-move draw
    if (fiftyMoveRule && state.halfMoveClock >= 100) {
      // 50 moves = 100 half-moves
      return {
        winner: null,
        endReason: 'draw_by_fifty_moves',
        totalMoves: moveCount,
        moves,
        finalEval: evaluatePosition(state.board),
        avgNodesPerMove: moveCount > 0 ? totalNodes / moveCount : 0,
        totalTimeMs: Date.now() - startTime,
      };
    }
    
    // Check for threefold repetition
    const hash = boardToHash(state);
    const repetitions = (positionHashes.get(hash) ?? 0) + 1;
    positionHashes.set(hash, repetitions);
    
    if (repetitions >= 3) {
      return {
        winner: null,
        endReason: 'draw_by_repetition',
        totalMoves: moveCount,
        moves,
        finalEval: evaluatePosition(state.board),
        avgNodesPerMove: moveCount > 0 ? totalNodes / moveCount : 0,
        totalTimeMs: Date.now() - startTime,
      };
    }
    
    // Get AI move
    const difficulty = state.turn === 'white' ? whiteDifficulty : blackDifficulty;
    const result = getAIMove(state, difficulty);
    
    if (!result.move) {
      // No legal moves - game should have ended
      break;
    }
    
    totalNodes += result.stats.nodesSearched;
    moves.push(result.move);
    
    // Apply move
    const newBoard = applyMove(state.board, result.move);
    const nextTurn = oppositeColor(state.turn);
    const legalMoves = generateAllLegalMoves(newBoard, nextTurn);
    
    // Check for game end
    if (legalMoves.length === 0) {
      if (isInCheck(newBoard, nextTurn)) {
        // Checkmate
        return {
          winner: state.turn,
          endReason: 'checkmate',
          totalMoves: moveCount + 1,
          moves,
          finalEval: evaluatePosition(newBoard),
          avgNodesPerMove: (moveCount + 1) > 0 ? totalNodes / (moveCount + 1) : 0,
          totalTimeMs: Date.now() - startTime,
        };
      } else {
        // Stalemate
        return {
          winner: null,
          endReason: 'stalemate',
          totalMoves: moveCount + 1,
          moves,
          finalEval: evaluatePosition(newBoard),
          avgNodesPerMove: (moveCount + 1) > 0 ? totalNodes / (moveCount + 1) : 0,
          totalTimeMs: Date.now() - startTime,
        };
      }
    }
    
    // Update state
    const captured = result.move.captured;
    const piece = result.move.piece;
    state = {
      board: newBoard,
      turn: nextTurn,
      moveNumber: state.turn === 'black' ? state.moveNumber + 1 : state.moveNumber,
      halfMoveClock: (piece.type === 'pawn' || captured) ? 0 : state.halfMoveClock + 1,
      history: [...state.history, result.move],
      status: { type: 'ongoing' },
    };
    
    moveCount++;
  }
  
  // Hit max moves - declare draw
  return {
    winner: null,
    endReason: 'max_moves',
    totalMoves: moveCount,
    moves,
    finalEval: evaluatePosition(state.board),
    avgNodesPerMove: moveCount > 0 ? totalNodes / moveCount : 0,
    totalTimeMs: Date.now() - startTime,
  };
}

/**
 * Run multiple self-play games and collect statistics.
 */
export function runSelfPlay(config: Partial<SelfPlayConfig> = {}): SelfPlayStats {
  const cfg: SelfPlayConfig = { ...DEFAULT_SELFPLAY_CONFIG, ...config };
  const startTime = Date.now();
  
  const stats: SelfPlayStats = {
    totalGames: cfg.numGames,
    whiteWins: 0,
    blackWins: 0,
    draws: 0,
    avgGameLength: 0,
    minGameLength: Infinity,
    maxGameLength: 0,
    checkmateCount: 0,
    stalemateCount: 0,
    maxMovesCount: 0,
    games: [],
    totalTimeMs: 0,
  };
  
  let totalMoves = 0;
  
  for (let i = 0; i < cfg.numGames; i++) {
    const result = playSingleGame(
      cfg.whiteDifficulty,
      cfg.blackDifficulty,
      cfg.maxMoves,
      cfg.fiftyMoveRule
    );
    
    stats.games.push(result);
    totalMoves += result.totalMoves;
    
    // Update win counts
    if (result.winner === 'white') {
      stats.whiteWins++;
    } else if (result.winner === 'black') {
      stats.blackWins++;
    } else {
      stats.draws++;
    }
    
    // Update game length stats
    stats.minGameLength = Math.min(stats.minGameLength, result.totalMoves);
    stats.maxGameLength = Math.max(stats.maxGameLength, result.totalMoves);
    
    // Update end reason counts
    switch (result.endReason) {
      case 'checkmate':
        stats.checkmateCount++;
        break;
      case 'stalemate':
        stats.stalemateCount++;
        break;
      case 'max_moves':
        stats.maxMovesCount++;
        break;
    }
    
    // Progress callback
    if (cfg.onGameComplete) {
      cfg.onGameComplete(result, i);
    }
  }
  
  stats.avgGameLength = cfg.numGames > 0 ? totalMoves / cfg.numGames : 0;
  stats.totalTimeMs = Date.now() - startTime;
  
  // Handle edge case where no games were played
  if (cfg.numGames === 0) {
    stats.minGameLength = 0;
  }
  
  return stats;
}

/**
 * Format self-play statistics as a human-readable report.
 */
export function formatSelfPlayReport(stats: SelfPlayStats): string {
  const lines: string[] = [
    '=== Self-Play Report ===',
    '',
    `Total Games: ${stats.totalGames}`,
    `Total Time: ${(stats.totalTimeMs / 1000).toFixed(2)}s`,
    '',
    '--- Results ---',
    `White Wins: ${stats.whiteWins} (${(100 * stats.whiteWins / stats.totalGames).toFixed(1)}%)`,
    `Black Wins: ${stats.blackWins} (${(100 * stats.blackWins / stats.totalGames).toFixed(1)}%)`,
    `Draws: ${stats.draws} (${(100 * stats.draws / stats.totalGames).toFixed(1)}%)`,
    '',
    '--- Game Length ---',
    `Average: ${stats.avgGameLength.toFixed(1)} moves`,
    `Shortest: ${stats.minGameLength} moves`,
    `Longest: ${stats.maxGameLength} moves`,
    '',
    '--- End Reasons ---',
    `Checkmate: ${stats.checkmateCount}`,
    `Stalemate: ${stats.stalemateCount}`,
    `Max moves reached: ${stats.maxMovesCount}`,
  ];
  
  return lines.join('\n');
}

/**
 * Move notation helper for game recording.
 */
export function moveToNotation(move: Move): string {
  const pieceSymbol = move.piece.type[0]?.toUpperCase() ?? 'P';
  const from = coordToString(move.from);
  const to = coordToString(move.to);
  const capture = move.captured ? 'x' : '-';
  const promotion = move.promotion ? `=${move.promotion[0]?.toUpperCase()}` : '';
  
  return `${pieceSymbol}${from}${capture}${to}${promotion}`;
}

/**
 * Export game history in a simple text format.
 */
export function exportGameHistory(result: GameResult): string {
  const lines: string[] = [
    `Result: ${result.winner ? `${result.winner} wins` : 'Draw'}`,
    `End: ${result.endReason}`,
    `Moves: ${result.totalMoves}`,
    `Final Eval: ${result.finalEval}`,
    '',
    'Move History:',
  ];
  
  for (let i = 0; i < result.moves.length; i++) {
    const move = result.moves[i]!;
    const moveNum = Math.floor(i / 2) + 1;
    const notation = moveToNotation(move);
    
    if (i % 2 === 0) {
      lines.push(`${moveNum}. ${notation}`);
    } else {
      lines[lines.length - 1] += ` ${notation}`;
    }
  }
  
  return lines.join('\n');
}

// ============================================================================
// Analysis Utilities
// ============================================================================

/**
 * Analyze piece capture frequency across games.
 * Helps tune piece values.
 */
export function analyzeCaptureFrequency(stats: SelfPlayStats): Record<string, { captured: number; capturedBy: Record<string, number> }> {
  const analysis: Record<string, { captured: number; capturedBy: Record<string, number> }> = {
    pawn: { captured: 0, capturedBy: {} },
    knight: { captured: 0, capturedBy: {} },
    lance: { captured: 0, capturedBy: {} },
    chariot: { captured: 0, capturedBy: {} },
    queen: { captured: 0, capturedBy: {} },
    king: { captured: 0, capturedBy: {} },
  };
  
  for (const game of stats.games) {
    for (const move of game.moves) {
      if (move.captured) {
        const victim = move.captured.type;
        const attacker = move.piece.type;
        
        analysis[victim]!.captured++;
        analysis[victim]!.capturedBy[attacker] = (analysis[victim]!.capturedBy[attacker] ?? 0) + 1;
      }
    }
  }
  
  return analysis;
}

/**
 * Calculate average game phase lengths.
 * Opening = first 10 moves, middlegame = moves 11-40, endgame = 40+
 */
export function analyzeGamePhases(stats: SelfPlayStats): { openingLength: number; middlegameLength: number; endgameLength: number } {
  let totalOpening = 0;
  let totalMiddlegame = 0;
  let totalEndgame = 0;
  
  for (const game of stats.games) {
    totalOpening += Math.min(game.totalMoves, 20); // 10 moves = 20 plies
    totalMiddlegame += Math.max(0, Math.min(game.totalMoves - 20, 60)); // moves 11-40
    totalEndgame += Math.max(0, game.totalMoves - 80);
  }
  
  const numGames = stats.totalGames || 1;
  return {
    openingLength: totalOpening / numGames,
    middlegameLength: totalMiddlegame / numGames,
    endgameLength: totalEndgame / numGames,
  };
}
