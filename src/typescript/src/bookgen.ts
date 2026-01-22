/**
 * Underchex Opening Book Generator CLI
 * 
 * Generates an opening book by running self-play games and collecting
 * position-move statistics from the games.
 * 
 * Usage:
 *   npx tsx src/bookgen.ts [--games N] [--depth D] [--difficulty LEVEL] [--output FILE]
 * 
 * Signed-by: agent #27 claude-sonnet-4 via opencode 20260122T07:49:00
 */

import {
  runSelfPlay,
  SelfPlayConfig,
  GameResult,
} from './selfplay';

import {
  GameForBook,
  generateOpeningBook,
  exportBookToJSON,
  getBookStatistics,
  BookGenerationOptions,
} from './openingbook';

import { getStartingPosition as getStartingPlacements, createBoardFromPlacements } from './game';
import { AIDifficulty } from './ai';
import { Move } from './types';
import * as fs from 'fs';

// ============================================================================
// CLI Argument Parsing
// ============================================================================

interface BookGenConfig {
  numGames: number;
  maxBookDepth: number;
  difficulty: AIDifficulty;
  outputFile: string;
  minPositionCount: number;
  verbose: boolean;
}

function parseArgs(): BookGenConfig {
  const args = process.argv.slice(2);
  const config: BookGenConfig = {
    numGames: 50,
    maxBookDepth: 20,
    difficulty: 'hard',
    outputFile: 'openingbook.json',
    minPositionCount: 3,
    verbose: false,
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];
    
    switch (arg) {
      case '--games':
      case '-n':
        config.numGames = parseInt(nextArg || '50', 10);
        i++;
        break;
      case '--depth':
      case '-d':
        config.maxBookDepth = parseInt(nextArg || '20', 10);
        i++;
        break;
      case '--difficulty':
        config.difficulty = (nextArg as AIDifficulty) || 'hard';
        i++;
        break;
      case '--output':
      case '-o':
        config.outputFile = nextArg || 'openingbook.json';
        i++;
        break;
      case '--min-count':
        config.minPositionCount = parseInt(nextArg || '3', 10);
        i++;
        break;
      case '--verbose':
      case '-v':
        config.verbose = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }
  
  return config;
}

function printHelp(): void {
  console.log(`
Underchex Opening Book Generator

Usage:
  npx tsx src/bookgen.ts [options]

Options:
  -n, --games N         Number of games to play (default: 50)
  -d, --depth D         Maximum book depth in plies (default: 20)
  --difficulty LEVEL    AI difficulty: easy|medium|hard (default: hard)
  -o, --output FILE     Output file path (default: openingbook.json)
  --min-count N         Minimum position visits to include (default: 3)
  -v, --verbose         Show detailed output
  -h, --help            Show this help message

Examples:
  npx tsx src/bookgen.ts --games 100 --difficulty hard
  npx tsx src/bookgen.ts -n 50 -d 15 -o mybook.json
`);
}

// ============================================================================
// Book Generation
// ============================================================================

/**
 * Convert self-play GameResult to GameForBook format.
 */
function convertGameResult(result: GameResult): GameForBook {
  // Map winner to numeric result
  let numericResult: 1 | 0 | -1;
  if (result.winner === 'white') {
    numericResult = 1;
  } else if (result.winner === 'black') {
    numericResult = -1;
  } else {
    numericResult = 0;
  }
  
  return {
    moves: result.moves,
    result: numericResult,
    // Note: We don't have per-move evaluations from self-play,
    // but could add them in a future enhancement
  };
}

/**
 * Run the book generation process.
 */
async function generateBook(config: BookGenConfig): Promise<void> {
  console.log('='.repeat(60));
  console.log('Underchex Opening Book Generator');
  console.log('='.repeat(60));
  console.log(`\nConfiguration:`);
  console.log(`  Games to play: ${config.numGames}`);
  console.log(`  Max book depth: ${config.maxBookDepth} plies`);
  console.log(`  AI difficulty: ${config.difficulty}`);
  console.log(`  Output file: ${config.outputFile}`);
  console.log(`  Min position count: ${config.minPositionCount}`);
  console.log('');
  
  // Run self-play games
  console.log('Running self-play games...');
  const startTime = Date.now();
  
  const selfPlayConfig: Partial<SelfPlayConfig> = {
    numGames: config.numGames,
    whiteDifficulty: config.difficulty,
    blackDifficulty: config.difficulty,
    maxMoves: 200,
  };
  
  const selfPlayStats = runSelfPlay(selfPlayConfig);
  
  const gamesTime = Date.now() - startTime;
  console.log(`Completed ${selfPlayStats.totalGames} games in ${(gamesTime / 1000).toFixed(1)}s`);
  console.log(`  White wins: ${selfPlayStats.whiteWins}`);
  console.log(`  Black wins: ${selfPlayStats.blackWins}`);
  console.log(`  Draws: ${selfPlayStats.draws}`);
  console.log(`  Avg game length: ${selfPlayStats.avgGameLength.toFixed(1)} moves`);
  console.log('');
  
  // Convert games to book format
  console.log('Converting games to book format...');
  const gamesForBook: GameForBook[] = selfPlayStats.games.map(convertGameResult);
  
  // Generate the opening book
  console.log('Generating opening book...');
  const bookOptions: BookGenerationOptions = {
    maxDepth: config.maxBookDepth,
    minPositionCount: config.minPositionCount,
  };
  
  const startingBoard = createBoardFromPlacements(getStartingPlacements());
  const book = generateOpeningBook(gamesForBook, startingBoard, bookOptions);
  
  // Get statistics
  const stats = getBookStatistics();
  console.log(`\nBook Statistics:`);
  console.log(`  Positions: ${stats.positionCount}`);
  console.log(`  Total move entries: ${stats.totalMoveEntries}`);
  console.log(`  Avg moves per position: ${stats.avgMovesPerPosition.toFixed(2)}`);
  console.log(`  Max depth: ${stats.maxDepth} plies`);
  console.log(`  Highest play count: ${stats.highestPlayCount}`);
  
  // Export to JSON
  console.log(`\nSaving to ${config.outputFile}...`);
  const json = exportBookToJSON(book);
  fs.writeFileSync(config.outputFile, json, 'utf-8');
  
  const fileSize = (json.length / 1024).toFixed(1);
  console.log(`Saved ${fileSize} KB`);
  
  const totalTime = Date.now() - startTime;
  console.log(`\nTotal time: ${(totalTime / 1000).toFixed(1)}s`);
  console.log('Done!');
}

// ============================================================================
// Main
// ============================================================================

const config = parseArgs();
generateBook(config).catch(console.error);
