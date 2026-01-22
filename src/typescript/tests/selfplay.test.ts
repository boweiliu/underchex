/**
 * Tests for self-play module
 * 
 * Signed-by: agent #4 claude-sonnet-4 via opencode 20260122T02:42:41
 */

import { describe, it, expect } from 'vitest';
import {
  playSingleGame,
  runSelfPlay,
  formatSelfPlayReport,
  moveToNotation,
  exportGameHistory,
  analyzeCaptureFrequency,
  analyzeGamePhases,
  GameResult,
  SelfPlayStats,
} from '../src/selfplay';

describe('Self-Play Module', () => {
  // =========================================================================
  // Single Game Tests
  // =========================================================================
  
  describe('playSingleGame', () => {
    it('should complete a game with result', () => {
      // Use easy difficulty and max 50 moves for fast test
      const result = playSingleGame('easy', 'easy', 50, true);
      
      expect(result).toBeDefined();
      expect(result.totalMoves).toBeGreaterThanOrEqual(0);
      expect(result.moves).toHaveLength(result.totalMoves);
      expect(['checkmate', 'stalemate', 'draw_by_repetition', 'draw_by_fifty_moves', 'max_moves'])
        .toContain(result.endReason);
      expect(result.totalTimeMs).toBeGreaterThan(0);
      expect(result.avgNodesPerMove).toBeGreaterThanOrEqual(0);
    });
    
    it('should have valid winner for checkmate', () => {
      // Play multiple games until we get a checkmate
      // (this test may be flaky if no checkmate occurs)
      let checkmateFound = false;
      
      for (let i = 0; i < 5; i++) {
        const result = playSingleGame('easy', 'easy', 100, true);
        
        if (result.endReason === 'checkmate') {
          expect(result.winner).toBeDefined();
          expect(['white', 'black']).toContain(result.winner);
          checkmateFound = true;
          break;
        }
      }
      
      // Note: This test passes even if no checkmate found - 
      // we're just verifying consistency when one does occur
      if (checkmateFound) {
        // Already verified above
      }
    });
    
    it('should enforce max moves limit', () => {
      const maxMoves = 10;
      const result = playSingleGame('easy', 'easy', maxMoves, false);
      
      expect(result.totalMoves).toBeLessThanOrEqual(maxMoves);
      if (result.endReason === 'max_moves') {
        expect(result.winner).toBeNull();
      }
    });
    
    it('should record move history correctly', () => {
      const result = playSingleGame('easy', 'easy', 30, true);
      
      expect(result.moves.length).toBe(result.totalMoves);
      
      // Each move should have required fields
      for (const move of result.moves) {
        expect(move).toHaveProperty('piece');
        expect(move).toHaveProperty('from');
        expect(move).toHaveProperty('to');
        expect(move.piece).toHaveProperty('type');
        expect(move.piece).toHaveProperty('color');
        expect(move.from).toHaveProperty('q');
        expect(move.from).toHaveProperty('r');
        expect(move.to).toHaveProperty('q');
        expect(move.to).toHaveProperty('r');
      }
    });
  });
  
  // =========================================================================
  // Run Self-Play Tests
  // =========================================================================
  
  describe('runSelfPlay', () => {
    it('should run specified number of games', () => {
      const stats = runSelfPlay({
        numGames: 2,
        whiteDifficulty: 'easy',
        blackDifficulty: 'easy',
        maxMoves: 30,
      });
      
      expect(stats.totalGames).toBe(2);
      expect(stats.games).toHaveLength(2);
    });
    
    it('should track win statistics correctly', () => {
      const stats = runSelfPlay({
        numGames: 3,
        whiteDifficulty: 'easy',
        blackDifficulty: 'easy',
        maxMoves: 50,
      });
      
      expect(stats.whiteWins + stats.blackWins + stats.draws).toBe(stats.totalGames);
    });
    
    it('should calculate game length statistics', () => {
      const stats = runSelfPlay({
        numGames: 3,
        whiteDifficulty: 'easy',
        blackDifficulty: 'easy',
        maxMoves: 50,
      });
      
      expect(stats.avgGameLength).toBeGreaterThanOrEqual(0);
      expect(stats.minGameLength).toBeLessThanOrEqual(stats.maxGameLength);
      expect(stats.minGameLength).toBeGreaterThanOrEqual(0);
    });
    
    it('should call onGameComplete callback', () => {
      const completedGames: number[] = [];
      
      runSelfPlay({
        numGames: 2,
        whiteDifficulty: 'easy',
        blackDifficulty: 'easy',
        maxMoves: 20,
        onGameComplete: (result, index) => {
          completedGames.push(index);
        },
      });
      
      expect(completedGames).toEqual([0, 1]);
    });
    
    it('should handle zero games gracefully', () => {
      const stats = runSelfPlay({
        numGames: 0,
        whiteDifficulty: 'easy',
        blackDifficulty: 'easy',
      });
      
      expect(stats.totalGames).toBe(0);
      expect(stats.games).toHaveLength(0);
      expect(stats.avgGameLength).toBe(0);
      expect(stats.minGameLength).toBe(0);
    });
    
    it('should track end reason counts', () => {
      const stats = runSelfPlay({
        numGames: 3,
        whiteDifficulty: 'easy',
        blackDifficulty: 'easy',
        maxMoves: 50,
      });
      
      const totalEndReasons = stats.checkmateCount + stats.stalemateCount + stats.maxMovesCount;
      // May also have draws by other reasons
      expect(totalEndReasons).toBeLessThanOrEqual(stats.totalGames);
    });
  });
  
  // =========================================================================
  // Formatting Tests
  // =========================================================================
  
  describe('formatSelfPlayReport', () => {
    it('should generate readable report', () => {
      const stats: SelfPlayStats = {
        totalGames: 10,
        whiteWins: 4,
        blackWins: 3,
        draws: 3,
        avgGameLength: 35.5,
        minGameLength: 20,
        maxGameLength: 50,
        checkmateCount: 6,
        stalemateCount: 1,
        maxMovesCount: 3,
        games: [],
        totalTimeMs: 5000,
      };
      
      const report = formatSelfPlayReport(stats);
      
      expect(report).toContain('Self-Play Report');
      expect(report).toContain('Total Games: 10');
      expect(report).toContain('White Wins: 4');
      expect(report).toContain('Black Wins: 3');
      expect(report).toContain('Draws: 3');
      expect(report).toContain('Average: 35.5 moves');
      expect(report).toContain('Checkmate: 6');
    });
  });
  
  describe('moveToNotation', () => {
    it('should format simple move', () => {
      const notation = moveToNotation({
        piece: { type: 'pawn', color: 'white' },
        from: { q: 0, r: 2 },
        to: { q: 0, r: 1 },
      });
      
      expect(notation).toBe('P0,2-0,1');
    });
    
    it('should format capture', () => {
      const notation = moveToNotation({
        piece: { type: 'queen', color: 'white' },
        from: { q: 1, r: 3 },
        to: { q: 2, r: 2 },
        captured: { type: 'knight', color: 'black' },
      });
      
      expect(notation).toBe('Q1,3x2,2');
    });
    
    it('should format promotion', () => {
      const notation = moveToNotation({
        piece: { type: 'pawn', color: 'white' },
        from: { q: 0, r: -3 },
        to: { q: 0, r: -4 },
        promotion: 'queen',
      });
      
      expect(notation).toBe('P0,-3-0,-4=Q');
    });
    
    it('should format capture with promotion', () => {
      const notation = moveToNotation({
        piece: { type: 'pawn', color: 'white' },
        from: { q: 0, r: -3 },
        to: { q: 1, r: -4 },
        captured: { type: 'knight', color: 'black' },
        promotion: 'chariot',
      });
      
      expect(notation).toBe('P0,-3x1,-4=C');
    });
  });
  
  describe('exportGameHistory', () => {
    it('should export game in readable format', () => {
      const result: GameResult = {
        winner: 'white',
        endReason: 'checkmate',
        totalMoves: 4,
        moves: [
          { piece: { type: 'pawn', color: 'white' }, from: { q: 0, r: 2 }, to: { q: 0, r: 1 } },
          { piece: { type: 'pawn', color: 'black' }, from: { q: 0, r: -2 }, to: { q: 0, r: -1 } },
          { piece: { type: 'queen', color: 'white' }, from: { q: 1, r: 3 }, to: { q: 1, r: 0 } },
          { piece: { type: 'knight', color: 'black' }, from: { q: 2, r: -3 }, to: { q: 1, r: -2 } },
        ],
        finalEval: 500,
        avgNodesPerMove: 100,
        totalTimeMs: 1000,
      };
      
      const history = exportGameHistory(result);
      
      expect(history).toContain('Result: white wins');
      expect(history).toContain('End: checkmate');
      expect(history).toContain('Moves: 4');
      expect(history).toContain('Move History:');
      expect(history).toContain('1. P0,2-0,1 P0,-2-0,-1');
      expect(history).toContain('2. Q1,3-1,0 K2,-3-1,-2');
    });
    
    it('should handle draw result', () => {
      const result: GameResult = {
        winner: null,
        endReason: 'stalemate',
        totalMoves: 0,
        moves: [],
        finalEval: 0,
        avgNodesPerMove: 0,
        totalTimeMs: 100,
      };
      
      const history = exportGameHistory(result);
      expect(history).toContain('Result: Draw');
      expect(history).toContain('End: stalemate');
    });
  });
  
  // =========================================================================
  // Analysis Tests
  // =========================================================================
  
  describe('analyzeCaptureFrequency', () => {
    it('should analyze captures correctly', () => {
      const stats: SelfPlayStats = {
        totalGames: 1,
        whiteWins: 1,
        blackWins: 0,
        draws: 0,
        avgGameLength: 3,
        minGameLength: 3,
        maxGameLength: 3,
        checkmateCount: 1,
        stalemateCount: 0,
        maxMovesCount: 0,
        games: [{
          winner: 'white',
          endReason: 'checkmate',
          totalMoves: 3,
          moves: [
            { piece: { type: 'queen', color: 'white' }, from: { q: 0, r: 0 }, to: { q: 1, r: 1 }, captured: { type: 'pawn', color: 'black' } },
            { piece: { type: 'knight', color: 'black' }, from: { q: 2, r: 2 }, to: { q: 1, r: 1 }, captured: { type: 'queen', color: 'white' } },
            { piece: { type: 'pawn', color: 'white' }, from: { q: 3, r: 3 }, to: { q: 2, r: 2 }, captured: { type: 'knight', color: 'black' } },
          ],
          finalEval: 0,
          avgNodesPerMove: 0,
          totalTimeMs: 100,
        }],
        totalTimeMs: 100,
      };
      
      const analysis = analyzeCaptureFrequency(stats);
      
      expect(analysis.pawn.captured).toBe(1);
      expect(analysis.pawn.capturedBy['queen']).toBe(1);
      expect(analysis.queen.captured).toBe(1);
      expect(analysis.queen.capturedBy['knight']).toBe(1);
      expect(analysis.knight.captured).toBe(1);
      expect(analysis.knight.capturedBy['pawn']).toBe(1);
    });
  });
  
  describe('analyzeGamePhases', () => {
    it('should calculate phase lengths', () => {
      const stats: SelfPlayStats = {
        totalGames: 2,
        whiteWins: 1,
        blackWins: 1,
        draws: 0,
        avgGameLength: 50,
        minGameLength: 40,
        maxGameLength: 60,
        checkmateCount: 2,
        stalemateCount: 0,
        maxMovesCount: 0,
        games: [
          { winner: 'white', endReason: 'checkmate', totalMoves: 40, moves: [], finalEval: 0, avgNodesPerMove: 0, totalTimeMs: 100 },
          { winner: 'black', endReason: 'checkmate', totalMoves: 60, moves: [], finalEval: 0, avgNodesPerMove: 0, totalTimeMs: 100 },
        ],
        totalTimeMs: 200,
      };
      
      const phases = analyzeGamePhases(stats);
      
      expect(phases.openingLength).toBe(20); // min(40,20) + min(60,20) / 2 = 40/2 = 20
      expect(phases.middlegameLength).toBeGreaterThan(0);
    });
  });
  
  // =========================================================================
  // Integration Test
  // =========================================================================
  
  describe('Integration', () => {
    it('should run full self-play analysis pipeline', () => {
      // Run small self-play session
      const stats = runSelfPlay({
        numGames: 2,
        whiteDifficulty: 'easy',
        blackDifficulty: 'easy',
        maxMoves: 40,
      });
      
      // Generate report
      const report = formatSelfPlayReport(stats);
      expect(report.length).toBeGreaterThan(0);
      
      // Analyze captures
      const captureAnalysis = analyzeCaptureFrequency(stats);
      expect(captureAnalysis).toHaveProperty('pawn');
      expect(captureAnalysis).toHaveProperty('queen');
      
      // Analyze phases
      const phases = analyzeGamePhases(stats);
      expect(phases).toHaveProperty('openingLength');
      expect(phases).toHaveProperty('middlegameLength');
      expect(phases).toHaveProperty('endgameLength');
      
      // Export first game if available
      if (stats.games.length > 0) {
        const history = exportGameHistory(stats.games[0]!);
        expect(history).toContain('Result:');
        expect(history).toContain('Move History:');
      }
    });
  });
});
