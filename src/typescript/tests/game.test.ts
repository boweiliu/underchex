/**
 * Tests for game state management
 * 
 * Signed-by: agent #1 claude-sonnet-4 via opencode 20260122T02:18:57
 */

import { describe, it, expect } from 'vitest';
import {
  createNewGame,
  makeMove,
  getLegalMoves,
  isCurrentPlayerInCheck,
  resign,
} from '../src/game';
import { coordToString } from '../src/types';

describe('createNewGame', () => {
  it('creates a game with white to move first', () => {
    const game = createNewGame();
    expect(game.turn).toBe('white');
  });

  it('creates a game with 28 pieces (14 per side)', () => {
    const game = createNewGame();
    expect(game.board.size).toBe(28);
  });

  it('places white king at (0, 4)', () => {
    const game = createNewGame();
    const piece = game.board.get(coordToString({ q: 0, r: 4 }));
    expect(piece?.type).toBe('king');
    expect(piece?.color).toBe('white');
  });

  it('places black king at (0, -4)', () => {
    const game = createNewGame();
    const piece = game.board.get(coordToString({ q: 0, r: -4 }));
    expect(piece?.type).toBe('king');
    expect(piece?.color).toBe('black');
  });

  it('starts with ongoing status', () => {
    const game = createNewGame();
    expect(game.status.type).toBe('ongoing');
  });
});

describe('makeMove', () => {
  it('returns new game state after valid move', () => {
    const game = createNewGame();
    
    // Move a white pawn forward
    const newGame = makeMove(game, { q: 0, r: 2 }, { q: 0, r: 1 });
    
    expect(newGame).not.toBeNull();
    expect(newGame?.turn).toBe('black');
  });

  it('returns null for invalid move', () => {
    const game = createNewGame();
    
    // Try to move a pawn 3 squares (invalid)
    const newGame = makeMove(game, { q: 0, r: 2 }, { q: 0, r: -1 });
    
    expect(newGame).toBeNull();
  });

  it('returns null when trying to move opponent piece', () => {
    const game = createNewGame();
    
    // Try to move a black pawn on white's turn
    const newGame = makeMove(game, { q: 0, r: -2 }, { q: 0, r: -1 });
    
    expect(newGame).toBeNull();
  });

  it('updates move history', () => {
    const game = createNewGame();
    const newGame = makeMove(game, { q: 0, r: 2 }, { q: 0, r: 1 });
    
    expect(newGame?.history.length).toBe(1);
    expect(newGame?.history[0].from).toEqual({ q: 0, r: 2 });
    expect(newGame?.history[0].to).toEqual({ q: 0, r: 1 });
  });

  it('resets half-move clock on pawn move', () => {
    const game = createNewGame();
    
    // Move knight first (not a pawn) - knight at (-2, 3) can jump
    let state = makeMove(game, { q: -2, r: 3 }, { q: -3, r: 2 });
    expect(state?.halfMoveClock).toBe(1);
    
    // Then move a black pawn
    state = makeMove(state!, { q: 0, r: -2 }, { q: 0, r: -1 });
    expect(state?.halfMoveClock).toBe(0);
  });
});

describe('getLegalMoves', () => {
  it('returns moves for initial position', () => {
    const game = createNewGame();
    const moves = getLegalMoves(game);
    
    // Should have many legal moves in starting position
    expect(moves.length).toBeGreaterThan(10);
  });

  it('returns empty array when game is over', () => {
    let game = createNewGame();
    game = resign(game, 'white');
    
    const moves = getLegalMoves(game);
    expect(moves.length).toBe(0);
  });
});

describe('resign', () => {
  it('sets winner to opponent', () => {
    const game = createNewGame();
    const resigned = resign(game, 'white');
    
    expect(resigned.status.type).toBe('resigned');
    if (resigned.status.type === 'resigned') {
      expect(resigned.status.winner).toBe('black');
    }
  });
});
