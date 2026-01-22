/**
 * Tests for move generation and validation
 * 
 * Signed-by: agent #1 claude-sonnet-4 via opencode 20260122T02:18:57
 */

import { describe, it, expect } from 'vitest';
import {
  generatePseudoLegalMoves,
  generateLegalMoves,
  isInCheck,
  isAttacked,
  validateMove,
  getPieceAt,
} from '../src/moves';
import { BoardState, Piece, HexCoord, coordToString } from '../src/types';

// Helper to create a board state from piece placements
function createBoard(placements: { piece: Piece; pos: HexCoord }[]): BoardState {
  const board: BoardState = new Map();
  for (const { piece, pos } of placements) {
    board.set(coordToString(pos), piece);
  }
  return board;
}

describe('King moves', () => {
  it('can move to adjacent empty cell', () => {
    const board = createBoard([
      { piece: { type: 'king', color: 'white' }, pos: { q: 0, r: 0 } },
    ]);
    
    const moves = generatePseudoLegalMoves(
      board,
      { type: 'king', color: 'white' },
      { q: 0, r: 0 }
    );
    
    expect(moves.length).toBe(6); // All 6 directions are valid
    expect(moves.some(m => m.to.q === 1 && m.to.r === 0)).toBe(true);
  });

  it('cannot move 2 squares', () => {
    const board = createBoard([
      { piece: { type: 'king', color: 'white' }, pos: { q: 0, r: 0 } },
    ]);
    
    const moves = generatePseudoLegalMoves(
      board,
      { type: 'king', color: 'white' },
      { q: 0, r: 0 }
    );
    
    // No move should go 2 squares
    expect(moves.some(m => m.to.q === 2 && m.to.r === 0)).toBe(false);
  });

  it('can capture enemy piece', () => {
    const board = createBoard([
      { piece: { type: 'king', color: 'white' }, pos: { q: 0, r: 0 } },
      { piece: { type: 'pawn', color: 'black' }, pos: { q: 1, r: 0 } },
    ]);
    
    const moves = generatePseudoLegalMoves(
      board,
      { type: 'king', color: 'white' },
      { q: 0, r: 0 }
    );
    
    const captureMove = moves.find(m => m.to.q === 1 && m.to.r === 0);
    expect(captureMove).toBeDefined();
    expect(captureMove?.captured).toBeDefined();
    expect(captureMove?.captured?.type).toBe('pawn');
  });

  it('cannot capture friendly piece', () => {
    const board = createBoard([
      { piece: { type: 'king', color: 'white' }, pos: { q: 0, r: 0 } },
      { piece: { type: 'pawn', color: 'white' }, pos: { q: 1, r: 0 } },
    ]);
    
    const moves = generatePseudoLegalMoves(
      board,
      { type: 'king', color: 'white' },
      { q: 0, r: 0 }
    );
    
    expect(moves.some(m => m.to.q === 1 && m.to.r === 0)).toBe(false);
  });
});

describe('Queen moves', () => {
  it('can slide multiple squares', () => {
    const board = createBoard([
      { piece: { type: 'queen', color: 'white' }, pos: { q: 0, r: 0 } },
    ]);
    
    const moves = generatePseudoLegalMoves(
      board,
      { type: 'queen', color: 'white' },
      { q: 0, r: 0 }
    );
    
    // Should be able to reach (0, -3) going North
    expect(moves.some(m => m.to.q === 0 && m.to.r === -3)).toBe(true);
  });

  it('cannot jump over pieces', () => {
    const board = createBoard([
      { piece: { type: 'queen', color: 'white' }, pos: { q: 0, r: 0 } },
      { piece: { type: 'pawn', color: 'white' }, pos: { q: 0, r: -1 } },
    ]);
    
    const moves = generatePseudoLegalMoves(
      board,
      { type: 'queen', color: 'white' },
      { q: 0, r: 0 }
    );
    
    // Cannot reach cells past the blocking pawn
    expect(moves.some(m => m.to.q === 0 && m.to.r === -3)).toBe(false);
  });
});

describe('Pawn moves', () => {
  it('white pawn moves north', () => {
    const board = createBoard([
      { piece: { type: 'pawn', color: 'white' }, pos: { q: 0, r: 2 } },
    ]);
    
    const moves = generatePseudoLegalMoves(
      board,
      { type: 'pawn', color: 'white' },
      { q: 0, r: 2 }
    );
    
    expect(moves.some(m => m.to.q === 0 && m.to.r === 1)).toBe(true);
  });

  it('white pawn cannot move south', () => {
    const board = createBoard([
      { piece: { type: 'pawn', color: 'white' }, pos: { q: 0, r: 2 } },
    ]);
    
    const moves = generatePseudoLegalMoves(
      board,
      { type: 'pawn', color: 'white' },
      { q: 0, r: 2 }
    );
    
    expect(moves.some(m => m.to.q === 0 && m.to.r === 3)).toBe(false);
  });

  it('white pawn captures forward', () => {
    const board = createBoard([
      { piece: { type: 'pawn', color: 'white' }, pos: { q: 0, r: 2 } },
      { piece: { type: 'pawn', color: 'black' }, pos: { q: 0, r: 1 } },
    ]);
    
    const moves = generatePseudoLegalMoves(
      board,
      { type: 'pawn', color: 'white' },
      { q: 0, r: 2 }
    );
    
    const captureMove = moves.find(m => m.to.q === 0 && m.to.r === 1);
    expect(captureMove).toBeDefined();
    expect(captureMove?.captured).toBeDefined();
  });

  it('white pawn captures diagonally NE', () => {
    const board = createBoard([
      { piece: { type: 'pawn', color: 'white' }, pos: { q: 0, r: 2 } },
      { piece: { type: 'pawn', color: 'black' }, pos: { q: 1, r: 1 } },
    ]);
    
    const moves = generatePseudoLegalMoves(
      board,
      { type: 'pawn', color: 'white' },
      { q: 0, r: 2 }
    );
    
    const captureMove = moves.find(m => m.to.q === 1 && m.to.r === 1);
    expect(captureMove).toBeDefined();
    expect(captureMove?.captured).toBeDefined();
  });

  it('black pawn moves south', () => {
    const board = createBoard([
      { piece: { type: 'pawn', color: 'black' }, pos: { q: 0, r: -2 } },
    ]);
    
    const moves = generatePseudoLegalMoves(
      board,
      { type: 'pawn', color: 'black' },
      { q: 0, r: -2 }
    );
    
    expect(moves.some(m => m.to.q === 0 && m.to.r === -1)).toBe(true);
  });
});

describe('Knight moves', () => {
  it('leaps to valid target', () => {
    const board = createBoard([
      { piece: { type: 'knight', color: 'white' }, pos: { q: 0, r: 0 } },
    ]);
    
    const moves = generatePseudoLegalMoves(
      board,
      { type: 'knight', color: 'white' },
      { q: 0, r: 0 }
    );
    
    expect(moves.some(m => m.to.q === 1 && m.to.r === -2)).toBe(true);
  });

  it('can jump over pieces', () => {
    const board = createBoard([
      { piece: { type: 'knight', color: 'white' }, pos: { q: 0, r: 0 } },
      { piece: { type: 'pawn', color: 'white' }, pos: { q: 0, r: -1 } },
      { piece: { type: 'pawn', color: 'black' }, pos: { q: 1, r: -1 } },
    ]);
    
    const moves = generatePseudoLegalMoves(
      board,
      { type: 'knight', color: 'white' },
      { q: 0, r: 0 }
    );
    
    // Should still reach (1, -2) despite pieces in the way
    expect(moves.some(m => m.to.q === 1 && m.to.r === -2)).toBe(true);
  });
});

describe('Lance moves', () => {
  it('Lance A slides north', () => {
    const board = createBoard([
      { piece: { type: 'lance', color: 'white', variant: 'A' }, pos: { q: 0, r: 2 } },
    ]);
    
    const moves = generatePseudoLegalMoves(
      board,
      { type: 'lance', color: 'white', variant: 'A' },
      { q: 0, r: 2 }
    );
    
    expect(moves.some(m => m.to.q === 0 && m.to.r === -2)).toBe(true);
  });

  it('Lance A cannot move NE', () => {
    const board = createBoard([
      { piece: { type: 'lance', color: 'white', variant: 'A' }, pos: { q: 0, r: 2 } },
    ]);
    
    const moves = generatePseudoLegalMoves(
      board,
      { type: 'lance', color: 'white', variant: 'A' },
      { q: 0, r: 2 }
    );
    
    // NE direction: +q, -r, so (2, 0) would be NE from (0, 2)
    expect(moves.some(m => m.to.q === 2 && m.to.r === 0)).toBe(false);
  });
});

describe('Chariot moves', () => {
  it('slides NE', () => {
    const board = createBoard([
      { piece: { type: 'chariot', color: 'white' }, pos: { q: 0, r: 0 } },
    ]);
    
    const moves = generatePseudoLegalMoves(
      board,
      { type: 'chariot', color: 'white' },
      { q: 0, r: 0 }
    );
    
    expect(moves.some(m => m.to.q === 3 && m.to.r === -3)).toBe(true);
  });

  it('cannot move north', () => {
    const board = createBoard([
      { piece: { type: 'chariot', color: 'white' }, pos: { q: 0, r: 0 } },
    ]);
    
    const moves = generatePseudoLegalMoves(
      board,
      { type: 'chariot', color: 'white' },
      { q: 0, r: 0 }
    );
    
    // N direction would be (0, -2)
    expect(moves.some(m => m.to.q === 0 && m.to.r === -2)).toBe(false);
  });
});

describe('Check detection', () => {
  it('detects king in check from queen', () => {
    const board = createBoard([
      { piece: { type: 'king', color: 'white' }, pos: { q: 0, r: 0 } },
      { piece: { type: 'queen', color: 'black' }, pos: { q: 0, r: -3 } },
    ]);
    
    expect(isInCheck(board, 'white')).toBe(true);
  });

  it('detects king not in check when blocked', () => {
    const board = createBoard([
      { piece: { type: 'king', color: 'white' }, pos: { q: 0, r: 0 } },
      { piece: { type: 'pawn', color: 'white' }, pos: { q: 0, r: -1 } },
      { piece: { type: 'queen', color: 'black' }, pos: { q: 0, r: -3 } },
    ]);
    
    expect(isInCheck(board, 'white')).toBe(false);
  });

  it('king cannot move into check', () => {
    const board = createBoard([
      { piece: { type: 'king', color: 'white' }, pos: { q: 0, r: 0 } },
      { piece: { type: 'queen', color: 'black' }, pos: { q: 1, r: -4 } },
    ]);
    
    const validation = validateMove(board, { q: 0, r: 0 }, { q: 1, r: 0 }, 'white');
    expect(validation.legal).toBe(false);
    expect(validation.reason).toBe('movesIntoCheck');
  });
});

describe('validateMove', () => {
  it('validates legal king move', () => {
    const board = createBoard([
      { piece: { type: 'king', color: 'white' }, pos: { q: 0, r: 0 } },
    ]);
    
    const validation = validateMove(board, { q: 0, r: 0 }, { q: 1, r: 0 }, 'white');
    expect(validation.legal).toBe(true);
  });

  it('rejects move from empty square', () => {
    const board = createBoard([]);
    
    const validation = validateMove(board, { q: 0, r: 0 }, { q: 1, r: 0 }, 'white');
    expect(validation.legal).toBe(false);
    expect(validation.reason).toBe('noPieceAtSource');
  });

  it('rejects moving opponent piece', () => {
    const board = createBoard([
      { piece: { type: 'king', color: 'black' }, pos: { q: 0, r: 0 } },
    ]);
    
    const validation = validateMove(board, { q: 0, r: 0 }, { q: 1, r: 0 }, 'white');
    expect(validation.legal).toBe(false);
    expect(validation.reason).toBe('notYourPiece');
  });
});

describe('Pawn promotion', () => {
  it('white pawn generates promotion moves at r=-4', () => {
    const board = createBoard([
      { piece: { type: 'pawn', color: 'white' }, pos: { q: 0, r: -3 } },
    ]);
    
    const moves = generatePseudoLegalMoves(
      board,
      { type: 'pawn', color: 'white' },
      { q: 0, r: -3 }
    );
    
    // Should generate 4 promotion moves (queen, chariot, lance, knight)
    const promotionMoves = moves.filter(m => m.to.r === -4 && m.promotion);
    expect(promotionMoves.length).toBe(4);
    expect(promotionMoves.some(m => m.promotion === 'queen')).toBe(true);
    expect(promotionMoves.some(m => m.promotion === 'chariot')).toBe(true);
    expect(promotionMoves.some(m => m.promotion === 'lance')).toBe(true);
    expect(promotionMoves.some(m => m.promotion === 'knight')).toBe(true);
  });

  it('black pawn generates promotion moves at r=4', () => {
    const board = createBoard([
      { piece: { type: 'pawn', color: 'black' }, pos: { q: 0, r: 3 } },
    ]);
    
    const moves = generatePseudoLegalMoves(
      board,
      { type: 'pawn', color: 'black' },
      { q: 0, r: 3 }
    );
    
    // Should generate 4 promotion moves
    const promotionMoves = moves.filter(m => m.to.r === 4 && m.promotion);
    expect(promotionMoves.length).toBe(4);
  });

  it('pawn promotion capture also generates multiple moves', () => {
    const board = createBoard([
      { piece: { type: 'pawn', color: 'white' }, pos: { q: 0, r: -3 } },
      { piece: { type: 'knight', color: 'black' }, pos: { q: 1, r: -4 } },
    ]);
    
    const moves = generatePseudoLegalMoves(
      board,
      { type: 'pawn', color: 'white' },
      { q: 0, r: -3 }
    );
    
    // Capture promotion to NE
    const capturePromotions = moves.filter(m => m.to.q === 1 && m.to.r === -4 && m.promotion);
    expect(capturePromotions.length).toBe(4);
    expect(capturePromotions[0].captured?.type).toBe('knight');
  });

  it('non-promotion move does not have promotion field', () => {
    const board = createBoard([
      { piece: { type: 'pawn', color: 'white' }, pos: { q: 0, r: 2 } },
    ]);
    
    const moves = generatePseudoLegalMoves(
      board,
      { type: 'pawn', color: 'white' },
      { q: 0, r: 2 }
    );
    
    // Move to r=1, not promotion zone
    const regularMove = moves.find(m => m.to.r === 1);
    expect(regularMove).toBeDefined();
    expect(regularMove?.promotion).toBeUndefined();
  });
});
