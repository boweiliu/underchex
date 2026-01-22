/**
 * Underchex Balance Testing CLI
 * 
 * Runs self-play games and generates balance analysis reports.
 * 
 * Usage:
 *   npx tsx src/balance.ts [--games N] [--difficulty LEVEL]
 * 
 * Signed-by: agent #10 claude-sonnet-4 via opencode 20260122T04:04:25
 */

import {
  runSelfPlay,
  formatSelfPlayReport,
  analyzeCaptureFrequency,
  analyzeGamePhases,
  SelfPlayConfig,
} from './selfplay';

import { PIECE_VALUES, AIDifficulty } from './ai';

// ============================================================================
// CLI Argument Parsing
// ============================================================================

function parseArgs(): Partial<SelfPlayConfig> & { verbose: boolean } {
  const args = process.argv.slice(2);
  const config: Partial<SelfPlayConfig> & { verbose: boolean } = {
    verbose: false,
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];
    
    switch (arg) {
      case '--games':
      case '-n':
        config.numGames = parseInt(nextArg || '10', 10);
        i++;
        break;
      case '--difficulty':
      case '-d':
        config.whiteDifficulty = (nextArg as AIDifficulty) || 'medium';
        config.blackDifficulty = (nextArg as AIDifficulty) || 'medium';
        i++;
        break;
      case '--white-difficulty':
        config.whiteDifficulty = (nextArg as AIDifficulty) || 'medium';
        i++;
        break;
      case '--black-difficulty':
        config.blackDifficulty = (nextArg as AIDifficulty) || 'medium';
        i++;
        break;
      case '--max-moves':
        config.maxMoves = parseInt(nextArg || '200', 10);
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
Underchex Balance Testing CLI

Usage:
  npx tsx src/balance.ts [options]

Options:
  -n, --games N           Number of games to play (default: 10)
  -d, --difficulty LEVEL  Difficulty for both AIs: easy|medium|hard (default: medium)
  --white-difficulty LEVEL  Difficulty for white AI
  --black-difficulty LEVEL  Difficulty for black AI
  --max-moves N           Maximum moves per game (default: 200)
  -v, --verbose           Show detailed output per game
  -h, --help              Show this help message

Examples:
  npx tsx src/balance.ts --games 20 --difficulty hard
  npx tsx src/balance.ts -n 5 --white-difficulty easy --black-difficulty medium
`);
}

// ============================================================================
// Analysis Functions
// ============================================================================

/**
 * Format capture frequency analysis as readable text.
 */
function formatCaptureAnalysis(analysis: ReturnType<typeof analyzeCaptureFrequency>): string {
  const lines: string[] = ['=== Capture Frequency Analysis ===', ''];
  
  const pieceTypes = ['pawn', 'knight', 'lance', 'chariot', 'queen', 'king'] as const;
  
  for (const pieceType of pieceTypes) {
    const data = analysis[pieceType];
    if (!data || data.captured === 0) continue;
    
    const value = PIECE_VALUES[pieceType];
    lines.push(`${pieceType.charAt(0).toUpperCase() + pieceType.slice(1)} (value: ${value})`);
    lines.push(`  Total captured: ${data.captured}`);
    
    const capturedBy = Object.entries(data.capturedBy)
      .sort(([, a], [, b]) => (b as number) - (a as number));
    
    if (capturedBy.length > 0) {
      lines.push('  Captured by:');
      for (const [attacker, count] of capturedBy) {
        lines.push(`    ${attacker}: ${count}`);
      }
    }
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * Format game phase analysis.
 */
function formatPhaseAnalysis(phases: ReturnType<typeof analyzeGamePhases>): string {
  return [
    '=== Game Phase Analysis ===',
    '',
    `Average Opening Length: ${phases.openingLength.toFixed(1)} plies`,
    `Average Middlegame Length: ${phases.middlegameLength.toFixed(1)} plies`,
    `Average Endgame Length: ${phases.endgameLength.toFixed(1)} plies`,
  ].join('\n');
}

/**
 * Calculate win rate balance score.
 * Returns a value from 0 (perfectly balanced) to 1 (completely imbalanced).
 */
function calculateBalanceScore(stats: { whiteWins: number; blackWins: number; draws: number }): number {
  const totalDecisive = stats.whiteWins + stats.blackWins;
  if (totalDecisive === 0) return 0; // All draws = perfectly balanced
  
  const whitePct = stats.whiteWins / totalDecisive;
  // 0.5 = perfectly balanced, 0 or 1 = completely imbalanced
  return Math.abs(whitePct - 0.5) * 2;
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const args = parseArgs();
  const config: SelfPlayConfig = {
    numGames: args.numGames ?? 10,
    whiteDifficulty: args.whiteDifficulty ?? 'medium',
    blackDifficulty: args.blackDifficulty ?? 'medium',
    maxMoves: args.maxMoves ?? 200,
    fiftyMoveRule: true,
    repetitionDraw: false,
    onGameComplete: args.verbose 
      ? (result, idx) => {
          const winner = result.winner ? `${result.winner} wins` : 'Draw';
          console.log(`Game ${idx + 1}: ${winner} (${result.endReason}, ${result.totalMoves} moves)`);
        }
      : undefined,
  };
  
  console.log('Underchex Balance Testing');
  console.log('=========================');
  console.log('');
  console.log(`Games: ${config.numGames}`);
  console.log(`White difficulty: ${config.whiteDifficulty}`);
  console.log(`Black difficulty: ${config.blackDifficulty}`);
  console.log(`Max moves: ${config.maxMoves}`);
  console.log('');
  console.log('Running self-play...');
  console.log('');
  
  const startTime = Date.now();
  const stats = runSelfPlay(config);
  const elapsed = Date.now() - startTime;
  
  // Print results
  console.log(formatSelfPlayReport(stats));
  console.log('');
  
  // Print capture analysis
  const captureAnalysis = analyzeCaptureFrequency(stats);
  console.log(formatCaptureAnalysis(captureAnalysis));
  
  // Print phase analysis
  const phases = analyzeGamePhases(stats);
  console.log(formatPhaseAnalysis(phases));
  console.log('');
  
  // Print balance score
  const balanceScore = calculateBalanceScore(stats);
  console.log('=== Balance Assessment ===');
  console.log('');
  console.log(`Balance Score: ${(1 - balanceScore).toFixed(2)} (1.0 = perfect, 0.0 = completely imbalanced)`);
  
  if (balanceScore < 0.1) {
    console.log('Assessment: EXCELLENT - Game is very well balanced');
  } else if (balanceScore < 0.2) {
    console.log('Assessment: GOOD - Minor first-move advantage acceptable');
  } else if (balanceScore < 0.3) {
    console.log('Assessment: FAIR - Some balance issues but playable');
  } else {
    console.log('Assessment: NEEDS WORK - Significant balance issues detected');
  }
  
  console.log('');
  console.log(`Avg time per game: ${(elapsed / config.numGames / 1000).toFixed(2)}s`);
}

main().catch(console.error);
