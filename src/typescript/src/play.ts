/**
 * Underchex Terminal Play CLI
 * 
 * Interactive terminal interface for playing Underchex against the AI.
 * 
 * Usage:
 *   npx tsx src/play.ts [options]
 * 
 * Options:
 *   -d, --difficulty LEVEL   AI difficulty: easy|medium|hard (default: medium)
 *   -c, --color COLOR        Play as: white|black (default: white)
 *   --ai-vs-ai               Watch AI play against itself
 *   -h, --help               Show help
 * 
 * Signed-by: agent #16 claude-sonnet-4 via opencode 20260122T05:33:11
 */

import * as readline from 'readline';

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
  coordsEqual,
  oppositeColor,
  BOARD_RADIUS,
  PROMOTION_TARGETS,
  LanceVariant,
} from './types';

import {
  isValidCell,
  getAllCells,
} from './board';

import {
  createNewGame,
  makeMove,
  getLegalMoves,
  isCurrentPlayerInCheck,
  resign,
} from './game';

import {
  getAIMove,
  AIDifficulty,
  evaluatePosition,
} from './ai';

import {
  applyMove,
  generateAllLegalMoves,
  getPieceAt,
} from './moves';

// ============================================================================
// ANSI Color Codes
// ============================================================================

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

// Piece colors
const WHITE_PIECE = '\x1b[97m';  // Bright white
const BLACK_PIECE = '\x1b[30m';  // Black

// Background colors for hex cells
const LIGHT_HEX = '\x1b[47m';    // Light gray background
const DARK_HEX = '\x1b[100m';    // Dark gray background
const HIGHLIGHT_HEX = '\x1b[43m'; // Yellow background for selected/legal moves

// Status colors
const CHECK_COLOR = '\x1b[91m';  // Red
const INFO_COLOR = '\x1b[96m';   // Cyan
const SUCCESS_COLOR = '\x1b[92m'; // Green
const ERROR_COLOR = '\x1b[91m';  // Red

// ============================================================================
// Piece Symbols
// ============================================================================

const PIECE_SYMBOLS: Record<PieceType, string> = {
  king: 'K',
  queen: 'Q',
  lance: 'L',
  chariot: 'C',
  knight: 'N',
  pawn: 'P',
};

const PIECE_NAMES: Record<PieceType, string> = {
  king: 'King',
  queen: 'Queen',
  lance: 'Lance',
  chariot: 'Chariot',
  knight: 'Knight',
  pawn: 'Pawn',
};

// ============================================================================
// Board Rendering
// ============================================================================

/**
 * Get the "color" of a hex cell for alternating pattern.
 * Uses a simple modular pattern based on q + r.
 */
function getHexCellColor(coord: HexCoord): 'light' | 'dark' {
  const sum = coord.q + coord.r;
  return sum % 2 === 0 ? 'light' : 'dark';
}

/**
 * Render a piece as a colored character.
 */
function renderPiece(piece: Piece | undefined): string {
  if (!piece) return '  ';
  
  const symbol = PIECE_SYMBOLS[piece.type];
  const colorCode = piece.color === 'white' ? WHITE_PIECE : BLACK_PIECE;
  
  // Add variant indicator for lances
  if (piece.type === 'lance' && piece.variant) {
    return `${colorCode}${symbol}${piece.variant}${RESET}`;
  }
  
  return `${colorCode}${symbol} ${RESET}`;
}

/**
 * Render the board as ASCII art.
 * Uses axial coordinate display with hex grid layout.
 */
export function renderBoard(
  board: BoardState,
  highlightCells: Set<string> = new Set(),
  selectedCell?: HexCoord
): string {
  const lines: string[] = [];
  
  // Title
  lines.push('');
  lines.push(`${BOLD}${INFO_COLOR}    Underchex Board${RESET}`);
  lines.push('');
  
  // Render the hex board row by row
  // The hex grid spans r from -BOARD_RADIUS to +BOARD_RADIUS
  // For each row, q ranges based on the hex constraint
  
  for (let r = -BOARD_RADIUS; r <= BOARD_RADIUS; r++) {
    // Calculate indentation for hex appearance
    const indent = Math.abs(r) * 2;
    let line = ' '.repeat(indent);
    
    // Determine valid q range for this row
    const qMin = Math.max(-BOARD_RADIUS, -BOARD_RADIUS - r);
    const qMax = Math.min(BOARD_RADIUS, BOARD_RADIUS - r);
    
    for (let q = qMin; q <= qMax; q++) {
      const coord = { q, r };
      const coordStr = coordToString(coord);
      const piece = board.get(coordStr);
      
      // Determine background color
      let bgColor = getHexCellColor(coord) === 'light' ? LIGHT_HEX : DARK_HEX;
      
      // Highlight selected cell or legal move targets
      if (selectedCell && coordsEqual(coord, selectedCell)) {
        bgColor = '\x1b[42m'; // Green for selected
      } else if (highlightCells.has(coordStr)) {
        bgColor = HIGHLIGHT_HEX;
      }
      
      const pieceStr = renderPiece(piece);
      line += `${bgColor}${pieceStr}${RESET} `;
    }
    
    // Add row coordinate label
    line += ` ${DIM}r=${r}${RESET}`;
    
    lines.push(line);
  }
  
  // Add column (q) labels at the bottom
  lines.push('');
  const qLabelLine = ' '.repeat(8); // Initial indent
  lines.push(qLabelLine + `${DIM}q: -4  -3  -2  -1   0   1   2   3   4${RESET}`);
  
  return lines.join('\n');
}

/**
 * Render board with coordinate grid for reference.
 */
function renderBoardWithCoords(
  board: BoardState,
  highlightCells: Set<string> = new Set(),
  selectedCell?: HexCoord
): string {
  const boardStr = renderBoard(board, highlightCells, selectedCell);
  
  const coordHelp = `
${DIM}Coordinate format: q,r  (e.g., "0,2" or "-1,3")
Move format: from to  (e.g., "0,2 0,1")${RESET}`;
  
  return boardStr + coordHelp;
}

// ============================================================================
// Move Input Parsing
// ============================================================================

/**
 * Parse a coordinate string like "0,2" or "0, 2" or "0 2".
 */
export function parseCoord(input: string): HexCoord | null {
  // Remove whitespace and try to parse
  const cleaned = input.trim();
  
  // Try comma-separated
  if (cleaned.includes(',')) {
    const parts = cleaned.split(',').map(s => s.trim());
    if (parts.length === 2 && parts[0] !== undefined && parts[1] !== undefined) {
      const q = parseInt(parts[0], 10);
      const r = parseInt(parts[1], 10);
      if (!isNaN(q) && !isNaN(r)) {
        const coord = { q, r };
        if (isValidCell(coord)) {
          return coord;
        }
      }
    }
  }
  
  // Try space-separated
  const spaceParts = cleaned.split(/\s+/);
  if (spaceParts.length === 2 && spaceParts[0] !== undefined && spaceParts[1] !== undefined) {
    const q = parseInt(spaceParts[0], 10);
    const r = parseInt(spaceParts[1], 10);
    if (!isNaN(q) && !isNaN(r)) {
      const coord = { q, r };
      if (isValidCell(coord)) {
        return coord;
      }
    }
  }
  
  return null;
}

/**
 * Parse a move string like "0,2 0,1" or "0,2 to 0,1".
 */
export function parseMoveInput(input: string): { from: HexCoord; to: HexCoord } | null {
  const cleaned = input.toLowerCase().trim();
  
  // Remove "to" if present
  const withoutTo = cleaned.replace(/\s+to\s+/, ' ');
  
  // Split into two parts
  // Try to find the split point - look for space between two coordinate groups
  const match = withoutTo.match(/(-?\d+\s*,?\s*-?\d+)\s+(-?\d+\s*,?\s*-?\d+)/);
  if (match && match[1] && match[2]) {
    const from = parseCoord(match[1]);
    const to = parseCoord(match[2]);
    if (from && to) {
      return { from, to };
    }
  }
  
  return null;
}

/**
 * Format a move for display.
 */
export function formatMove(move: Move): string {
  const from = `${move.from.q},${move.from.r}`;
  const to = `${move.to.q},${move.to.r}`;
  const piece = PIECE_NAMES[move.piece.type];
  const capture = move.captured ? ` x ${PIECE_NAMES[move.captured.type]}` : '';
  const promotion = move.promotion ? ` =${PIECE_NAMES[move.promotion]}` : '';
  return `${piece} ${from} -> ${to}${capture}${promotion}`;
}

/**
 * Format a coordinate for display.
 */
export function formatCoord(coord: HexCoord): string {
  return `${coord.q},${coord.r}`;
}

// ============================================================================
// Game Status Display
// ============================================================================

function renderGameStatus(state: GameState): string {
  const lines: string[] = [];
  
  // Turn indicator
  const turnColor = state.turn === 'white' ? WHITE_PIECE : BLACK_PIECE;
  lines.push(`${BOLD}Turn: ${turnColor}${state.turn.toUpperCase()}${RESET}  Move: ${state.moveNumber}`);
  
  // Check indicator
  if (state.status.type === 'ongoing' && isCurrentPlayerInCheck(state)) {
    lines.push(`${CHECK_COLOR}${BOLD}CHECK!${RESET}`);
  }
  
  // Game over status
  switch (state.status.type) {
    case 'checkmate':
      lines.push(`${SUCCESS_COLOR}${BOLD}CHECKMATE! ${state.status.winner.toUpperCase()} wins!${RESET}`);
      break;
    case 'stalemate':
      lines.push(`${INFO_COLOR}${BOLD}STALEMATE! Game is a draw.${RESET}`);
      break;
    case 'draw':
      lines.push(`${INFO_COLOR}${BOLD}DRAW: ${state.status.reason}${RESET}`);
      break;
    case 'resigned':
      lines.push(`${SUCCESS_COLOR}${BOLD}${state.status.winner.toUpperCase()} wins by resignation!${RESET}`);
      break;
  }
  
  // Evaluation (for debugging/interest)
  if (state.status.type === 'ongoing') {
    const eval_ = evaluatePosition(state.board);
    // Flip sign for black's perspective
    const evalFromPerspective = state.turn === 'white' ? eval_ : -eval_;
    const evalStr = evalFromPerspective > 0 ? `+${(evalFromPerspective / 100).toFixed(2)}` : `${(evalFromPerspective / 100).toFixed(2)}`;
    lines.push(`${DIM}Position eval: ${evalStr}${RESET}`);
  }
  
  return lines.join('\n');
}

// ============================================================================
// CLI Argument Parsing
// ============================================================================

interface CLIOptions {
  difficulty: AIDifficulty;
  playerColor: Color;
  aiVsAi: boolean;
  help: boolean;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    difficulty: 'medium',
    playerColor: 'white',
    aiVsAi: false,
    help: false,
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];
    
    switch (arg) {
      case '-d':
      case '--difficulty':
        if (nextArg && ['easy', 'medium', 'hard'].includes(nextArg)) {
          options.difficulty = nextArg as AIDifficulty;
        }
        i++;
        break;
      case '-c':
      case '--color':
        if (nextArg && ['white', 'black'].includes(nextArg)) {
          options.playerColor = nextArg as Color;
        }
        i++;
        break;
      case '--ai-vs-ai':
        options.aiVsAi = true;
        break;
      case '-h':
      case '--help':
        options.help = true;
        break;
    }
  }
  
  return options;
}

function printHelp(): void {
  console.log(`
${BOLD}Underchex Terminal Play CLI${RESET}

Play hexagonal chess against an AI opponent in your terminal.

${BOLD}Usage:${RESET}
  npx tsx src/play.ts [options]

${BOLD}Options:${RESET}
  -d, --difficulty LEVEL   AI difficulty: easy|medium|hard (default: medium)
  -c, --color COLOR        Play as: white|black (default: white)
  --ai-vs-ai               Watch AI play against itself
  -h, --help               Show this help message

${BOLD}Commands during game:${RESET}
  <from> <to>              Make a move (e.g., "0,2 0,1" or "0,2 to 0,1")
  moves                    Show all legal moves
  moves <coord>            Show legal moves for piece at coordinate
  resign                   Resign the game
  help                     Show command help
  quit                     Exit the game

${BOLD}Coordinate System:${RESET}
  Coordinates are in axial format: q,r
  q increases to the right (east)
  r increases downward (south)
  Center of board is 0,0
  Board radius is ${BOARD_RADIUS} (valid coords: -${BOARD_RADIUS} to +${BOARD_RADIUS})

${BOLD}Pieces:${RESET}
  K = King      Q = Queen     N = Knight
  L = Lance     C = Chariot   P = Pawn
  
  White pieces shown in white, Black pieces in dark.
  Lance variants shown as LA or LB.

${BOLD}Examples:${RESET}
  npx tsx src/play.ts                     # Play as white vs medium AI
  npx tsx src/play.ts -d hard             # Play vs hard AI
  npx tsx src/play.ts -c black -d easy    # Play as black vs easy AI
  npx tsx src/play.ts --ai-vs-ai          # Watch AI vs AI
`);
}

// ============================================================================
// Game Loop
// ============================================================================

async function promptForPromotion(rl: readline.Interface): Promise<PieceType> {
  return new Promise((resolve) => {
    console.log(`\n${INFO_COLOR}Pawn promotion! Choose piece:${RESET}`);
    console.log('  1. Queen');
    console.log('  2. Chariot');
    console.log('  3. Lance');
    console.log('  4. Knight');
    
    const ask = () => {
      rl.question('Enter choice (1-4): ', (answer) => {
        const choice = parseInt(answer.trim(), 10);
        switch (choice) {
          case 1: resolve('queen'); break;
          case 2: resolve('chariot'); break;
          case 3: resolve('lance'); break;
          case 4: resolve('knight'); break;
          default:
            console.log(`${ERROR_COLOR}Invalid choice. Try again.${RESET}`);
            ask();
        }
      });
    };
    ask();
  });
}

async function promptForLanceVariant(rl: readline.Interface): Promise<LanceVariant> {
  return new Promise((resolve) => {
    console.log(`\n${INFO_COLOR}Choose lance variant:${RESET}`);
    console.log('  A. Lance A (moves N, S, NW, SE)');
    console.log('  B. Lance B (moves N, S, NE, SW)');
    
    const ask = () => {
      rl.question('Enter choice (A/B): ', (answer) => {
        const choice = answer.trim().toUpperCase();
        if (choice === 'A' || choice === 'B') {
          resolve(choice as LanceVariant);
        } else {
          console.log(`${ERROR_COLOR}Invalid choice. Try again.${RESET}`);
          ask();
        }
      });
    };
    ask();
  });
}

function showLegalMoves(state: GameState, coord?: HexCoord): void {
  const moves = getLegalMoves(state);
  
  if (coord) {
    const pieceMoves = moves.filter(m => coordsEqual(m.from, coord));
    if (pieceMoves.length === 0) {
      const piece = state.board.get(coordToString(coord));
      if (!piece) {
        console.log(`${ERROR_COLOR}No piece at ${formatCoord(coord)}${RESET}`);
      } else if (piece.color !== state.turn) {
        console.log(`${ERROR_COLOR}That's not your piece!${RESET}`);
      } else {
        console.log(`${INFO_COLOR}No legal moves for piece at ${formatCoord(coord)}${RESET}`);
      }
      return;
    }
    
    console.log(`\n${INFO_COLOR}Legal moves for piece at ${formatCoord(coord)}:${RESET}`);
    for (const move of pieceMoves) {
      console.log(`  ${formatMove(move)}`);
    }
  } else {
    if (moves.length === 0) {
      console.log(`${INFO_COLOR}No legal moves available${RESET}`);
      return;
    }
    
    console.log(`\n${INFO_COLOR}All legal moves (${moves.length}):${RESET}`);
    // Group by piece position
    const byFrom = new Map<string, Move[]>();
    for (const move of moves) {
      const key = coordToString(move.from);
      if (!byFrom.has(key)) byFrom.set(key, []);
      byFrom.get(key)!.push(move);
    }
    
    for (const [from, pieceMoves] of byFrom) {
      const coord = stringToCoord(from);
      const piece = state.board.get(from)!;
      console.log(`  ${BOLD}${PIECE_NAMES[piece.type]} at ${from}:${RESET}`);
      for (const move of pieceMoves) {
        const toStr = formatCoord(move.to);
        const capture = move.captured ? ` (captures ${PIECE_NAMES[move.captured.type]})` : '';
        console.log(`    -> ${toStr}${capture}`);
      }
    }
  }
}

async function humanTurn(
  state: GameState,
  rl: readline.Interface
): Promise<GameState | 'quit' | 'resign'> {
  // Show board
  console.clear();
  console.log(renderBoardWithCoords(state.board));
  console.log('');
  console.log(renderGameStatus(state));
  console.log('');
  
  return new Promise((resolve) => {
    const ask = () => {
      rl.question(`${state.turn}'s move: `, async (input) => {
        const trimmed = input.trim().toLowerCase();
        
        // Handle special commands
        if (trimmed === 'quit' || trimmed === 'exit' || trimmed === 'q') {
          resolve('quit');
          return;
        }
        
        if (trimmed === 'resign') {
          resolve('resign');
          return;
        }
        
        if (trimmed === 'help' || trimmed === '?') {
          console.log(`
${BOLD}Commands:${RESET}
  <from> <to>     Make a move (e.g., "0,2 0,1")
  moves           Show all legal moves
  moves <coord>   Show legal moves for a piece
  resign          Resign the game
  quit            Exit
`);
          ask();
          return;
        }
        
        if (trimmed === 'moves') {
          showLegalMoves(state);
          ask();
          return;
        }
        
        if (trimmed.startsWith('moves ')) {
          const coordStr = trimmed.slice(6).trim();
          const coord = parseCoord(coordStr);
          if (coord) {
            showLegalMoves(state, coord);
          } else {
            console.log(`${ERROR_COLOR}Invalid coordinate: ${coordStr}${RESET}`);
          }
          ask();
          return;
        }
        
        // Try to parse as a move
        const move = parseMoveInput(trimmed);
        if (!move) {
          console.log(`${ERROR_COLOR}Invalid move format. Use: <q,r> <q,r> (e.g., "0,2 0,1")${RESET}`);
          ask();
          return;
        }
        
        // Check if there's a piece at from
        const piece = state.board.get(coordToString(move.from));
        if (!piece) {
          console.log(`${ERROR_COLOR}No piece at ${formatCoord(move.from)}${RESET}`);
          ask();
          return;
        }
        
        if (piece.color !== state.turn) {
          console.log(`${ERROR_COLOR}That's not your piece!${RESET}`);
          ask();
          return;
        }
        
        // Check if move is legal
        const legalMoves = getLegalMoves(state);
        const matchingMove = legalMoves.find(
          m => coordsEqual(m.from, move.from) && coordsEqual(m.to, move.to)
        );
        
        if (!matchingMove) {
          console.log(`${ERROR_COLOR}Illegal move. Type 'moves ${formatCoord(move.from)}' to see legal moves.${RESET}`);
          ask();
          return;
        }
        
        // Apply move
        const newState = makeMove(state, move.from, move.to);
        if (!newState) {
          console.log(`${ERROR_COLOR}Move failed unexpectedly.${RESET}`);
          ask();
          return;
        }
        
        console.log(`${SUCCESS_COLOR}Played: ${formatMove(matchingMove)}${RESET}`);
        resolve(newState);
      });
    };
    
    ask();
  });
}

async function aiTurn(
  state: GameState,
  difficulty: AIDifficulty
): Promise<GameState> {
  console.log(`\n${INFO_COLOR}AI (${difficulty}) is thinking...${RESET}`);
  
  const startTime = Date.now();
  const result = getAIMove(state, difficulty);
  const elapsed = Date.now() - startTime;
  
  if (!result.move) {
    console.log(`${ERROR_COLOR}AI could not find a move!${RESET}`);
    return state;
  }
  
  const aiMove = result.move;
  const newState = makeMove(state, aiMove.from, aiMove.to);
  if (!newState) {
    console.log(`${ERROR_COLOR}AI move failed!${RESET}`);
    return state;
  }
  
  console.log(`${INFO_COLOR}AI plays: ${formatMove(aiMove)} (${elapsed}ms)${RESET}`);
  
  return newState;
}

async function playGame(options: CLIOptions): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  let state = createNewGame();
  const aiColor = oppositeColor(options.playerColor);
  
  console.log(`\n${BOLD}${INFO_COLOR}Starting Underchex Game${RESET}`);
  console.log(`You are playing as ${BOLD}${options.playerColor.toUpperCase()}${RESET}`);
  console.log(`AI difficulty: ${BOLD}${options.difficulty}${RESET}`);
  console.log(`\nType 'help' for commands\n`);
  
  // Wait a moment for user to read
  await new Promise(r => setTimeout(r, 1500));
  
  while (state.status.type === 'ongoing') {
    if (state.turn === options.playerColor) {
      // Human turn
      const result = await humanTurn(state, rl);
      
      if (result === 'quit') {
        console.log('\nGoodbye!');
        break;
      }
      
      if (result === 'resign') {
        state = resign(state, options.playerColor);
        console.clear();
        console.log(renderBoardWithCoords(state.board));
        console.log('');
        console.log(renderGameStatus(state));
        break;
      }
      
      state = result;
    } else {
      // AI turn
      state = await aiTurn(state, options.difficulty);
      
      // Small delay so human can see the move
      await new Promise(r => setTimeout(r, 500));
    }
  }
  
  // Show final position
  if (state.status.type !== 'ongoing') {
    console.clear();
    console.log(renderBoardWithCoords(state.board));
    console.log('');
    console.log(renderGameStatus(state));
    console.log('\nGame over!');
  }
  
  rl.close();
}

async function playAiVsAi(options: CLIOptions): Promise<void> {
  console.log(`\n${BOLD}${INFO_COLOR}AI vs AI Mode${RESET}`);
  console.log(`Both AIs playing at ${BOLD}${options.difficulty}${RESET} difficulty`);
  console.log('Press Ctrl+C to stop\n');
  
  let state = createNewGame();
  let moveCount = 0;
  const maxMoves = 200;
  
  while (state.status.type === 'ongoing' && moveCount < maxMoves) {
    console.clear();
    console.log(renderBoard(state.board));
    console.log('');
    console.log(renderGameStatus(state));
    console.log(`\n${DIM}Move ${moveCount + 1}${RESET}`);
    
    state = await aiTurn(state, options.difficulty);
    moveCount++;
    
    // Delay between moves for visibility
    await new Promise(r => setTimeout(r, 1000));
  }
  
  // Final position
  console.clear();
  console.log(renderBoard(state.board));
  console.log('');
  console.log(renderGameStatus(state));
  
  if (state.status.type === 'ongoing') {
    console.log(`\n${INFO_COLOR}Game stopped after ${maxMoves} moves.${RESET}`);
  } else {
    console.log(`\n${SUCCESS_COLOR}Game completed in ${moveCount} moves.${RESET}`);
  }
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const options = parseArgs();
  
  if (options.help) {
    printHelp();
    return;
  }
  
  if (options.aiVsAi) {
    await playAiVsAi(options);
  } else {
    await playGame(options);
  }
}

main().catch(console.error);
