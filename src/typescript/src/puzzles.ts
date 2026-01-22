/**
 * Underchex Puzzle Generator
 * 
 * Generates tactical puzzles from game positions. Puzzles are positions where:
 * - One side has a clear winning move (or sequence of moves)
 * - The solution involves tactics (captures, threats, checkmate patterns)
 * - The puzzle has a unique best solution
 * 
 * Features:
 * - Extract puzzles from self-play games
 * - Classify puzzle difficulty based on solution depth
 * - Validate puzzles through AI analysis
 * - Export puzzles in various formats
 * 
 * Signed-by: agent #14 claude-sonnet-4 via opencode 20260122T05:08:42
 */

import {
  HexCoord,
  Piece,
  PieceType,
  Color,
  BoardState,
  GameState,
  Move,
  coordToString,
  stringToCoord,
  oppositeColor,
} from './types';

import {
  generateAllLegalMoves,
  applyMove,
  isInCheck,
  getPieceAt,
} from './moves';

import { createNewGame } from './game';

import {
  findBestMove,
  findBestMoveIterative,
  evaluatePosition,
  CHECKMATE_VALUE,
  PIECE_VALUES,
  SearchResult,
  ttClear,
  historyClear,
  killerClear,
} from './ai';

import { GameResult, moveToNotation } from './selfplay';

// ============================================================================
// Puzzle Types
// ============================================================================

/**
 * Difficulty levels for puzzles.
 */
export type PuzzleDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

/**
 * Type of tactical theme in a puzzle.
 */
export type PuzzleTheme = 
  | 'checkmate'        // Forced checkmate
  | 'winning_capture'  // Win material
  | 'fork'             // Attack two pieces at once
  | 'pin'              // Piece is pinned to king or valuable piece
  | 'skewer'           // Attack piece through another
  | 'discovered_attack'// Move one piece to reveal attack from another
  | 'deflection'       // Force enemy piece away from defense
  | 'promotion'        // Promote a pawn
  | 'defensive'        // Find the only move to not lose
  | 'tactical';        // General tactical puzzle

/**
 * A single puzzle with position and solution.
 */
export interface Puzzle {
  /** Unique puzzle ID */
  id: string;
  
  /** Board position at start of puzzle */
  position: BoardState;
  
  /** Side to move */
  toMove: Color;
  
  /** Expected solution moves (best continuation) */
  solution: Move[];
  
  /** Themes/tags for the puzzle */
  themes: PuzzleTheme[];
  
  /** Difficulty rating */
  difficulty: PuzzleDifficulty;
  
  /** Evaluation gain from solution (in centipawns) */
  evalGain: number;
  
  /** Solution depth (number of moves to find) */
  solutionDepth: number;
  
  /** Optional source game info */
  sourceGame?: {
    gameId?: string;
    moveNumber: number;
  };
}

/**
 * Configuration for puzzle generation.
 */
export interface PuzzleGeneratorConfig {
  /** Minimum evaluation swing to be considered a puzzle (centipawns) */
  minEvalSwing: number;
  
  /** Minimum search depth for validation */
  validationDepth: number;
  
  /** Maximum puzzles to generate per game */
  maxPuzzlesPerGame: number;
  
  /** Skip first N moves of game (opening is less tactical) */
  skipOpeningMoves: number;
  
  /** Include defensive puzzles (find only move) */
  includeDefensive: boolean;
  
  /** Minimum solution depth for inclusion */
  minSolutionDepth: number;
  
  /** Maximum solution depth for inclusion */
  maxSolutionDepth: number;
}

/**
 * Result from puzzle generation.
 */
export interface PuzzleGenerationResult {
  puzzles: Puzzle[];
  gamesAnalyzed: number;
  positionsAnalyzed: number;
  generationTimeMs: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_PUZZLE_CONFIG: PuzzleGeneratorConfig = {
  minEvalSwing: 200,        // At least 2 pawns swing
  validationDepth: 5,       // Search depth for validation
  maxPuzzlesPerGame: 5,     // Max puzzles per game
  skipOpeningMoves: 8,      // Skip first 8 moves (16 plies)
  includeDefensive: true,   // Include defensive puzzles
  minSolutionDepth: 1,      // At least 1 move solution
  maxSolutionDepth: 5,      // At most 5 moves solution
};

// ============================================================================
// Puzzle Generation
// ============================================================================

/**
 * Classify puzzle difficulty based on solution depth and complexity.
 */
export function classifyDifficulty(
  solutionDepth: number,
  evalGain: number,
  themes: PuzzleTheme[]
): PuzzleDifficulty {
  // Checkmate in 1 is beginner
  if (themes.includes('checkmate') && solutionDepth === 1) {
    return 'beginner';
  }
  
  // Simple captures
  if (solutionDepth === 1 && evalGain < 400) {
    return 'beginner';
  }
  
  // Checkmate in 2-3
  if (themes.includes('checkmate') && solutionDepth <= 3) {
    return 'intermediate';
  }
  
  // Deeper tactics
  if (solutionDepth <= 2) {
    return 'intermediate';
  }
  
  if (solutionDepth <= 4) {
    return 'advanced';
  }
  
  return 'expert';
}

/**
 * Identify tactical themes in a puzzle.
 */
export function identifyThemes(
  position: BoardState,
  solution: Move[],
  initialEval: number,
  finalEval: number,
  toMove: Color
): PuzzleTheme[] {
  const themes: PuzzleTheme[] = [];
  
  if (solution.length === 0) return ['tactical'];
  
  const firstMove = solution[0]!;
  
  // Check for checkmate
  let testBoard = position;
  for (const move of solution) {
    testBoard = applyMove(testBoard, move);
  }
  const opponent = oppositeColor(solution[solution.length - 1]!.piece.color);
  if (isInCheck(testBoard, opponent) && generateAllLegalMoves(testBoard, opponent).length === 0) {
    themes.push('checkmate');
    return themes; // Checkmate is the primary theme
  }
  
  // Check for winning capture
  if (firstMove.captured) {
    const capturedValue = PIECE_VALUES[firstMove.captured.type];
    if (capturedValue >= 300) {
      themes.push('winning_capture');
    }
  }
  
  // Check for promotion
  if (firstMove.promotion) {
    themes.push('promotion');
  }
  
  // Check for defensive puzzle (we were losing, now we're not)
  const evalFromSide = toMove === 'white' ? initialEval : -initialEval;
  if (evalFromSide < -200) {
    themes.push('defensive');
  }
  
  // Default to tactical if no specific theme
  if (themes.length === 0) {
    themes.push('tactical');
  }
  
  return themes;
}

/**
 * Extract the principal variation (best line) from a position.
 */
export function extractPrincipalVariation(
  position: BoardState,
  toMove: Color,
  depth: number
): Move[] {
  const pv: Move[] = [];
  let board = position;
  let color = toMove;
  
  // Clear tables for fresh analysis
  ttClear();
  historyClear();
  killerClear();
  
  for (let i = 0; i < depth; i++) {
    const result = findBestMove(board, color, Math.max(1, depth - i), true, true, true, false);
    
    if (!result.move) break;
    
    pv.push(result.move);
    board = applyMove(board, result.move);
    color = oppositeColor(color);
    
    // Stop if game is over
    const moves = generateAllLegalMoves(board, color);
    if (moves.length === 0) break;
  }
  
  return pv;
}

/**
 * Validate that a puzzle has a clear solution.
 * Returns true if the best move is significantly better than alternatives.
 */
export function validatePuzzle(
  position: BoardState,
  toMove: Color,
  expectedMove: Move,
  depth: number
): { valid: boolean; evalGap: number; alternativeMoves: Move[] } {
  // Clear tables for fresh analysis
  ttClear();
  historyClear();
  killerClear();
  
  const moves = generateAllLegalMoves(position, toMove);
  if (moves.length === 0) {
    return { valid: false, evalGap: 0, alternativeMoves: [] };
  }
  
  // Evaluate all moves
  const moveEvals: { move: Move; eval: number }[] = [];
  
  for (const move of moves) {
    const newBoard = applyMove(position, move);
    const result = findBestMove(newBoard, oppositeColor(toMove), depth - 1, true, true, true, false);
    
    // Evaluation is from perspective of opponent, so negate
    const evalScore = toMove === 'white' ? -result.score : result.score;
    moveEvals.push({ move, eval: evalScore });
  }
  
  // Sort by evaluation (best first for the side to move)
  moveEvals.sort((a, b) => {
    return toMove === 'white' ? b.eval - a.eval : a.eval - b.eval;
  });
  
  const bestMove = moveEvals[0]!;
  const secondBest = moveEvals[1];
  
  // Check if expected move matches best move
  const expectedMatchesBest = 
    expectedMove.from.q === bestMove.move.from.q &&
    expectedMove.from.r === bestMove.move.from.r &&
    expectedMove.to.q === bestMove.move.to.q &&
    expectedMove.to.r === bestMove.move.to.r;
  
  // Calculate eval gap between best and second best
  const evalGap = secondBest 
    ? Math.abs(bestMove.eval - secondBest.eval)
    : Math.abs(bestMove.eval);
  
  // Puzzle is valid if:
  // 1. Expected move matches best move
  // 2. There's a significant gap to second best (at least 100 cp)
  const valid = expectedMatchesBest && evalGap >= 100;
  
  // Get alternative moves that are close to the best
  const alternativeMoves = moveEvals
    .slice(1)
    .filter(m => Math.abs(bestMove.eval - m.eval) < 50)
    .map(m => m.move);
  
  return { valid, evalGap, alternativeMoves };
}

/**
 * Generate puzzles from a single game.
 */
export function generatePuzzlesFromGame(
  moves: Move[],
  config: Partial<PuzzleGeneratorConfig> = {},
  gameId?: string
): Puzzle[] {
  const cfg = { ...DEFAULT_PUZZLE_CONFIG, ...config };
  const puzzles: Puzzle[] = [];
  
  // Start from initial position
  let state = createNewGame();
  let board = state.board;
  
  // Evaluate initial position
  let prevEval = evaluatePosition(board);
  
  // Skip opening moves
  const startPly = cfg.skipOpeningMoves * 2;
  
  for (let ply = 0; ply < moves.length && puzzles.length < cfg.maxPuzzlesPerGame; ply++) {
    const move = moves[ply]!;
    const toMove: Color = ply % 2 === 0 ? 'white' : 'black';
    
    // Apply move
    const newBoard = applyMove(board, move);
    const newEval = evaluatePosition(newBoard);
    
    // Calculate eval swing
    const evalSwing = Math.abs(newEval - prevEval);
    
    // Check if this position is a candidate for a puzzle
    // We look at the position BEFORE the move was made
    if (ply >= startPly && evalSwing >= cfg.minEvalSwing) {
      // The move that was actually played caused a big eval swing
      // This could be:
      // 1. A great move (puzzle: find this move)
      // 2. A blunder (puzzle: find the best response)
      
      // Case 1: Check if the move played was the best move
      ttClear();
      historyClear();
      killerClear();
      
      const bestResult = findBestMove(board, toMove, cfg.validationDepth, true, true, true, true);
      
      if (bestResult.move) {
        const playedIsBest = 
          move.from.q === bestResult.move.from.q &&
          move.from.r === bestResult.move.from.r &&
          move.to.q === bestResult.move.to.q &&
          move.to.r === bestResult.move.to.r;
        
        if (playedIsBest) {
          // The played move was the best - this is a puzzle!
          const pv = extractPrincipalVariation(board, toMove, cfg.maxSolutionDepth);
          
          if (pv.length >= cfg.minSolutionDepth && pv.length <= cfg.maxSolutionDepth) {
            // Validate the puzzle
            const validation = validatePuzzle(board, toMove, pv[0]!, cfg.validationDepth);
            
            if (validation.valid) {
              const themes = identifyThemes(board, pv, prevEval, newEval, toMove);
              const difficulty = classifyDifficulty(pv.length, validation.evalGap, themes);
              
              const puzzle: Puzzle = {
                id: `puzzle_${gameId ?? 'unknown'}_${ply}`,
                position: new Map(board),
                toMove,
                solution: pv,
                themes,
                difficulty,
                evalGain: validation.evalGap,
                solutionDepth: pv.length,
                sourceGame: {
                  gameId,
                  moveNumber: Math.floor(ply / 2) + 1,
                },
              };
              
              puzzles.push(puzzle);
            }
          }
        }
      }
    }
    
    // Update for next iteration
    board = newBoard;
    prevEval = newEval;
  }
  
  return puzzles;
}

/**
 * Generate puzzles from multiple game results.
 */
export function generatePuzzlesFromGames(
  games: GameResult[],
  config: Partial<PuzzleGeneratorConfig> = {}
): PuzzleGenerationResult {
  const startTime = Date.now();
  const allPuzzles: Puzzle[] = [];
  let positionsAnalyzed = 0;
  
  for (let i = 0; i < games.length; i++) {
    const game = games[i]!;
    positionsAnalyzed += game.moves.length;
    
    const puzzles = generatePuzzlesFromGame(game.moves, config, `game_${i}`);
    allPuzzles.push(...puzzles);
  }
  
  return {
    puzzles: allPuzzles,
    gamesAnalyzed: games.length,
    positionsAnalyzed,
    generationTimeMs: Date.now() - startTime,
  };
}

// ============================================================================
// Puzzle Creation from Custom Positions
// ============================================================================

/**
 * Create a puzzle from a custom position.
 * Validates that the position has a clear solution.
 */
export function createPuzzleFromPosition(
  position: BoardState,
  toMove: Color,
  config: Partial<PuzzleGeneratorConfig> = {}
): Puzzle | null {
  const cfg = { ...DEFAULT_PUZZLE_CONFIG, ...config };
  
  // Clear tables
  ttClear();
  historyClear();
  killerClear();
  
  // Find best move
  const result = findBestMove(position, toMove, cfg.validationDepth, true, true, true, true);
  
  if (!result.move) return null;
  
  // Extract principal variation
  const pv = extractPrincipalVariation(position, toMove, cfg.maxSolutionDepth);
  
  if (pv.length < cfg.minSolutionDepth) return null;
  
  // Validate
  const validation = validatePuzzle(position, toMove, pv[0]!, cfg.validationDepth);
  
  if (!validation.valid) return null;
  
  const themes = identifyThemes(position, pv, 0, result.score, toMove);
  const difficulty = classifyDifficulty(pv.length, validation.evalGap, themes);
  
  return {
    id: `custom_${Date.now()}`,
    position: new Map(position),
    toMove,
    solution: pv,
    themes,
    difficulty,
    evalGain: validation.evalGap,
    solutionDepth: pv.length,
  };
}

// ============================================================================
// Puzzle Analysis and Solving
// ============================================================================

/**
 * Check if a move is the correct solution to a puzzle.
 */
export function checkPuzzleMove(
  puzzle: Puzzle,
  move: Move,
  moveIndex: number = 0
): { correct: boolean; message: string } {
  if (moveIndex >= puzzle.solution.length) {
    return { correct: false, message: 'Puzzle already solved' };
  }
  
  const expectedMove = puzzle.solution[moveIndex]!;
  
  const isCorrect = 
    move.from.q === expectedMove.from.q &&
    move.from.r === expectedMove.from.r &&
    move.to.q === expectedMove.to.q &&
    move.to.r === expectedMove.to.r;
  
  if (isCorrect) {
    if (moveIndex === puzzle.solution.length - 1) {
      return { correct: true, message: 'Puzzle solved!' };
    }
    return { correct: true, message: 'Correct! Continue...' };
  }
  
  return { correct: false, message: 'Incorrect. Try again.' };
}

/**
 * Get the position after applying moves from the puzzle solution.
 */
export function getPuzzlePositionAfterMoves(
  puzzle: Puzzle,
  numMoves: number
): BoardState {
  let board = new Map(puzzle.position);
  
  for (let i = 0; i < numMoves && i < puzzle.solution.length; i++) {
    board = applyMove(board, puzzle.solution[i]!);
  }
  
  return board;
}

/**
 * Get hint for puzzle at current move.
 */
export function getPuzzleHint(
  puzzle: Puzzle,
  moveIndex: number = 0,
  hintLevel: 'piece' | 'square' | 'full' = 'piece'
): string {
  if (moveIndex >= puzzle.solution.length) {
    return 'Puzzle already solved';
  }
  
  const move = puzzle.solution[moveIndex]!;
  
  switch (hintLevel) {
    case 'piece':
      return `Move your ${move.piece.type}`;
    case 'square':
      return `Move from (${move.from.q},${move.from.r})`;
    case 'full':
      return `${move.piece.type} from (${move.from.q},${move.from.r}) to (${move.to.q},${move.to.r})`;
  }
}

// ============================================================================
// Puzzle Export/Import
// ============================================================================

/**
 * Serialize a puzzle to JSON-compatible format.
 */
export function serializePuzzle(puzzle: Puzzle): object {
  const pieces: { pos: string; piece: { type: string; color: string; variant?: string } }[] = [];
  
  for (const [pos, piece] of puzzle.position.entries()) {
    pieces.push({
      pos,
      piece: {
        type: piece.type,
        color: piece.color,
        variant: piece.variant,
      },
    });
  }
  
  const solution = puzzle.solution.map(move => ({
    from: { q: move.from.q, r: move.from.r },
    to: { q: move.to.q, r: move.to.r },
    piece: { type: move.piece.type, color: move.piece.color, variant: move.piece.variant },
    captured: move.captured ? { type: move.captured.type, color: move.captured.color } : undefined,
    promotion: move.promotion,
  }));
  
  return {
    id: puzzle.id,
    position: pieces,
    toMove: puzzle.toMove,
    solution,
    themes: puzzle.themes,
    difficulty: puzzle.difficulty,
    evalGain: puzzle.evalGain,
    solutionDepth: puzzle.solutionDepth,
    sourceGame: puzzle.sourceGame,
  };
}

/**
 * Deserialize a puzzle from JSON format.
 */
export function deserializePuzzle(data: any): Puzzle {
  const position: BoardState = new Map();
  
  for (const { pos, piece } of data.position) {
    position.set(pos, {
      type: piece.type as PieceType,
      color: piece.color as Color,
      variant: piece.variant,
    });
  }
  
  const solution: Move[] = data.solution.map((m: any) => ({
    from: { q: m.from.q, r: m.from.r },
    to: { q: m.to.q, r: m.to.r },
    piece: { type: m.piece.type as PieceType, color: m.piece.color as Color, variant: m.piece.variant },
    captured: m.captured ? { type: m.captured.type as PieceType, color: m.captured.color as Color } : undefined,
    promotion: m.promotion as PieceType | undefined,
  }));
  
  return {
    id: data.id,
    position,
    toMove: data.toMove,
    solution,
    themes: data.themes,
    difficulty: data.difficulty,
    evalGain: data.evalGain,
    solutionDepth: data.solutionDepth,
    sourceGame: data.sourceGame,
  };
}

/**
 * Format puzzle as human-readable text.
 */
export function formatPuzzle(puzzle: Puzzle): string {
  const lines: string[] = [];
  
  lines.push(`=== Puzzle: ${puzzle.id} ===`);
  lines.push(`Difficulty: ${puzzle.difficulty}`);
  lines.push(`Themes: ${puzzle.themes.join(', ')}`);
  lines.push(`To move: ${puzzle.toMove}`);
  lines.push(`Solution depth: ${puzzle.solutionDepth} moves`);
  lines.push(`Eval gain: ${puzzle.evalGain} centipawns`);
  lines.push('');
  lines.push('Position:');
  
  // Simple text representation of position
  for (let r = -4; r <= 4; r++) {
    let row = '';
    for (let q = -4; q <= 4; q++) {
      const s = -q - r;
      if (Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) <= 4) {
        const piece = puzzle.position.get(`${q},${r}`);
        if (piece) {
          const symbol = piece.type[0]!.toUpperCase();
          row += piece.color === 'white' ? symbol : symbol.toLowerCase();
        } else {
          row += '.';
        }
      } else {
        row += ' ';
      }
      row += ' ';
    }
    lines.push(`  ${row.trim()}`);
  }
  
  lines.push('');
  lines.push('Solution:');
  for (let i = 0; i < puzzle.solution.length; i++) {
    const move = puzzle.solution[i]!;
    lines.push(`  ${i + 1}. ${moveToNotation(move)}`);
  }
  
  return lines.join('\n');
}

/**
 * Format puzzle generation results as a report.
 */
export function formatPuzzleReport(result: PuzzleGenerationResult): string {
  const lines: string[] = [];
  
  lines.push('=== Puzzle Generation Report ===');
  lines.push('');
  lines.push(`Games analyzed: ${result.gamesAnalyzed}`);
  lines.push(`Positions analyzed: ${result.positionsAnalyzed}`);
  lines.push(`Puzzles generated: ${result.puzzles.length}`);
  lines.push(`Generation time: ${(result.generationTimeMs / 1000).toFixed(2)}s`);
  lines.push('');
  
  // Difficulty breakdown
  const difficulties = { beginner: 0, intermediate: 0, advanced: 0, expert: 0 };
  for (const puzzle of result.puzzles) {
    difficulties[puzzle.difficulty]++;
  }
  
  lines.push('Difficulty breakdown:');
  lines.push(`  Beginner: ${difficulties.beginner}`);
  lines.push(`  Intermediate: ${difficulties.intermediate}`);
  lines.push(`  Advanced: ${difficulties.advanced}`);
  lines.push(`  Expert: ${difficulties.expert}`);
  lines.push('');
  
  // Theme breakdown
  const themes: Record<string, number> = {};
  for (const puzzle of result.puzzles) {
    for (const theme of puzzle.themes) {
      themes[theme] = (themes[theme] ?? 0) + 1;
    }
  }
  
  lines.push('Theme breakdown:');
  for (const [theme, count] of Object.entries(themes).sort((a, b) => b[1] - a[1])) {
    lines.push(`  ${theme}: ${count}`);
  }
  
  return lines.join('\n');
}
