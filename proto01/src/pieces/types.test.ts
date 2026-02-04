/**
 * Tests for piece types.
 * PROTO-01.4
 */

import { describe, it, expect } from 'vitest';
import {
  Player,
  oppositePlayer,
  PieceType,
  piece,
  white,
  black,
  pieceSymbol,
  pieceName,
} from './types';

describe('Player', () => {
  it('has two values', () => {
    expect(Player.White).toBe(0);
    expect(Player.Black).toBe(1);
  });

  it('oppositePlayer flips correctly', () => {
    expect(oppositePlayer(Player.White)).toBe(Player.Black);
    expect(oppositePlayer(Player.Black)).toBe(Player.White);
  });
});

describe('PieceType', () => {
  it('has six piece types', () => {
    expect(PieceType.King).toBe(0);
    expect(PieceType.Queen).toBe(1);
    expect(PieceType.Pawn).toBe(2);
    expect(PieceType.Knight).toBe(3);
    expect(PieceType.Lance).toBe(4);
    expect(PieceType.Chariot).toBe(5);
  });
});

describe('piece constructor', () => {
  it('creates piece without variant', () => {
    const p = piece(Player.White, PieceType.King);
    expect(p.owner).toBe(Player.White);
    expect(p.type).toBe(PieceType.King);
    expect(p.variant).toBeNull();
  });

  it('creates piece with variant', () => {
    const p = piece(Player.Black, PieceType.Knight, 'B');
    expect(p.owner).toBe(Player.Black);
    expect(p.type).toBe(PieceType.Knight);
    expect(p.variant).toBe('B');
  });
});

describe('convenience constructors', () => {
  it('white.king creates white king', () => {
    const p = white.king();
    expect(p.owner).toBe(Player.White);
    expect(p.type).toBe(PieceType.King);
    expect(p.variant).toBeNull();
  });

  it('black.queen creates black queen', () => {
    const p = black.queen();
    expect(p.owner).toBe(Player.Black);
    expect(p.type).toBe(PieceType.Queen);
  });

  it('white.knight requires variant', () => {
    const p = white.knight('A');
    expect(p.type).toBe(PieceType.Knight);
    expect(p.variant).toBe('A');
  });

  it('black.lance requires variant', () => {
    const p = black.lance('B');
    expect(p.type).toBe(PieceType.Lance);
    expect(p.variant).toBe('B');
  });

  it('white.chariot has no variant', () => {
    const p = white.chariot();
    expect(p.type).toBe(PieceType.Chariot);
    expect(p.variant).toBeNull();
  });
});

describe('pieceSymbol', () => {
  it('returns uppercase for white', () => {
    expect(pieceSymbol(white.king())).toBe('K');
    expect(pieceSymbol(white.queen())).toBe('Q');
    expect(pieceSymbol(white.pawn())).toBe('P');
    expect(pieceSymbol(white.knight('A'))).toBe('N');
    expect(pieceSymbol(white.lance('A'))).toBe('L');
    expect(pieceSymbol(white.chariot())).toBe('C');
  });

  it('returns lowercase for black', () => {
    expect(pieceSymbol(black.king())).toBe('k');
    expect(pieceSymbol(black.queen())).toBe('q');
    expect(pieceSymbol(black.pawn())).toBe('p');
    expect(pieceSymbol(black.knight('B'))).toBe('n');
    expect(pieceSymbol(black.lance('B'))).toBe('l');
    expect(pieceSymbol(black.chariot())).toBe('c');
  });
});

describe('pieceName', () => {
  it('formats pieces without variant', () => {
    expect(pieceName(white.king())).toBe('White King');
    expect(pieceName(black.queen())).toBe('Black Queen');
  });

  it('includes variant in name when present', () => {
    expect(pieceName(white.knight('A'))).toBe('White Knight (A)');
    expect(pieceName(black.lance('B'))).toBe('Black Lance (B)');
  });
});
