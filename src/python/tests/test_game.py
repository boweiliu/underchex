"""
Tests for game state management.

Signed-by: agent #17 claude-sonnet-4 via opencode 20260122T05:47:09
"""

import pytest
from underchex.types import HexCoord, Piece, GameStatusOngoing
from underchex.game import (
    get_starting_position,
    create_board_from_placements,
    create_new_game,
    make_move,
    resign,
    is_player_turn,
    get_legal_moves,
    is_current_player_in_check,
)


class TestStartingPosition:
    def test_has_both_kings(self):
        placements = get_starting_position()
        kings = [p for p in placements if p.piece.type == "king"]
        assert len(kings) == 2
        
        colors = {k.piece.color for k in kings}
        assert "white" in colors
        assert "black" in colors
    
    def test_has_correct_piece_count(self):
        placements = get_starting_position()
        # Each side: 1 king, 1 queen, 2 chariots, 2 lances, 2 knights, 6 pawns = 14
        # Total: 28 pieces
        assert len(placements) == 28
    
    def test_white_pieces_on_correct_side(self):
        placements = get_starting_position()
        white_pieces = [p for p in placements if p.piece.color == "white"]
        # White should be on positive r side (r >= 2)
        for p in white_pieces:
            assert p.position.r >= 2
    
    def test_black_pieces_on_correct_side(self):
        placements = get_starting_position()
        black_pieces = [p for p in placements if p.piece.color == "black"]
        # Black should be on negative r side (r <= -2)
        for p in black_pieces:
            assert p.position.r <= -2


class TestCreateNewGame:
    def test_initial_state(self):
        game = create_new_game()
        
        assert game.turn == "white"
        assert game.move_number == 1
        assert game.half_move_clock == 0
        assert len(game.history) == 0
        assert game.status.type == "ongoing"
    
    def test_board_has_pieces(self):
        game = create_new_game()
        assert len(game.board) == 28


class TestMakeMove:
    def test_simple_move(self):
        game = create_new_game()
        
        # Find a legal pawn move
        legal_moves = get_legal_moves(game)
        pawn_moves = [m for m in legal_moves if m.piece.type == "pawn"]
        assert len(pawn_moves) > 0
        
        move = pawn_moves[0]
        new_game = make_move(game, move.from_coord, move.to_coord)
        
        assert new_game is not None
        assert new_game.turn == "black"
        assert len(new_game.history) == 1
    
    def test_invalid_move_returns_none(self):
        game = create_new_game()
        
        # Try to move from empty square
        new_game = make_move(game, HexCoord(0, 0), HexCoord(0, -1))
        assert new_game is None
    
    def test_move_updates_half_move_clock(self):
        # This would need a specific position where non-pawn, non-capture moves are made
        game = create_new_game()
        
        # Make a pawn move (resets clock)
        legal_moves = get_legal_moves(game)
        pawn_move = next(m for m in legal_moves if m.piece.type == "pawn")
        new_game = make_move(game, pawn_move.from_coord, pawn_move.to_coord)
        
        assert new_game is not None
        assert new_game.half_move_clock == 0


class TestResign:
    def test_white_resigns(self):
        game = create_new_game()
        new_game = resign(game, "white")
        
        assert new_game.status.type == "resigned"
        assert new_game.status.winner == "black"  # type: ignore
    
    def test_black_resigns(self):
        game = create_new_game()
        new_game = resign(game, "black")
        
        assert new_game.status.type == "resigned"
        assert new_game.status.winner == "white"  # type: ignore


class TestGameQueries:
    def test_is_player_turn(self):
        game = create_new_game()
        
        assert is_player_turn(game, "white") is True
        assert is_player_turn(game, "black") is False
    
    def test_get_legal_moves(self):
        game = create_new_game()
        moves = get_legal_moves(game)
        
        # Should have several legal moves for white
        assert len(moves) > 0
        
        # All moves should be for white pieces
        for move in moves:
            assert move.piece.color == "white"
    
    def test_is_current_player_in_check_initial(self):
        game = create_new_game()
        
        # Neither player should be in check at start
        assert is_current_player_in_check(game) is False
