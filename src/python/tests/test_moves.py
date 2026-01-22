"""
Tests for move generation and validation.

Signed-by: agent #17 claude-sonnet-4 via opencode 20260122T05:47:09
"""

import pytest
from underchex.types import HexCoord, Piece, Color, BoardState, coord_to_string
from underchex.moves import (
    get_forward_direction,
    get_pawn_capture_directions,
    get_piece_directions,
    is_slider,
    get_piece_at,
    is_occupied,
    has_enemy,
    has_friendly,
    generate_pseudo_legal_moves,
    find_king,
    is_attacked,
    is_in_check,
    apply_move,
    generate_legal_moves,
    generate_all_legal_moves,
    validate_move,
)


class TestPieceDirections:
    def test_forward_direction_white(self):
        assert get_forward_direction("white") == "N"
    
    def test_forward_direction_black(self):
        assert get_forward_direction("black") == "S"
    
    def test_pawn_capture_directions_white(self):
        dirs = get_pawn_capture_directions("white")
        assert "N" in dirs
        assert "NE" in dirs
        assert "NW" in dirs
    
    def test_pawn_capture_directions_black(self):
        dirs = get_pawn_capture_directions("black")
        assert "S" in dirs
        assert "SE" in dirs
        assert "SW" in dirs
    
    def test_king_directions(self):
        dirs = get_piece_directions(Piece("king", "white"))
        assert len(dirs) == 6
    
    def test_queen_directions(self):
        dirs = get_piece_directions(Piece("queen", "white"))
        assert len(dirs) == 6
    
    def test_chariot_directions(self):
        dirs = get_piece_directions(Piece("chariot", "white"))
        assert len(dirs) == 4
        assert "NE" in dirs
        assert "NW" in dirs
        assert "SE" in dirs
        assert "SW" in dirs
    
    def test_lance_a_directions(self):
        dirs = get_piece_directions(Piece("lance", "white", "A"))
        assert len(dirs) == 4
        assert "N" in dirs
        assert "S" in dirs
        assert "NW" in dirs
        assert "SE" in dirs
    
    def test_lance_b_directions(self):
        dirs = get_piece_directions(Piece("lance", "white", "B"))
        assert len(dirs) == 4
        assert "N" in dirs
        assert "S" in dirs
        assert "NE" in dirs
        assert "SW" in dirs


class TestIsSlider:
    def test_queen_is_slider(self):
        assert is_slider("queen") is True
    
    def test_lance_is_slider(self):
        assert is_slider("lance") is True
    
    def test_chariot_is_slider(self):
        assert is_slider("chariot") is True
    
    def test_king_is_not_slider(self):
        assert is_slider("king") is False
    
    def test_pawn_is_not_slider(self):
        assert is_slider("pawn") is False
    
    def test_knight_is_not_slider(self):
        assert is_slider("knight") is False


class TestBoardQueries:
    @pytest.fixture
    def sample_board(self) -> BoardState:
        return {
            "0,0": Piece("king", "white"),
            "1,0": Piece("pawn", "black"),
        }
    
    def test_get_piece_at_occupied(self, sample_board):
        piece = get_piece_at(sample_board, HexCoord(0, 0))
        assert piece is not None
        assert piece.type == "king"
        assert piece.color == "white"
    
    def test_get_piece_at_empty(self, sample_board):
        piece = get_piece_at(sample_board, HexCoord(2, 0))
        assert piece is None
    
    def test_is_occupied(self, sample_board):
        assert is_occupied(sample_board, HexCoord(0, 0)) is True
        assert is_occupied(sample_board, HexCoord(2, 0)) is False
    
    def test_has_enemy(self, sample_board):
        assert has_enemy(sample_board, HexCoord(1, 0), "white") is True
        assert has_enemy(sample_board, HexCoord(0, 0), "white") is False
    
    def test_has_friendly(self, sample_board):
        assert has_friendly(sample_board, HexCoord(0, 0), "white") is True
        assert has_friendly(sample_board, HexCoord(1, 0), "white") is False


class TestFindKing:
    def test_find_white_king(self):
        board = {"0,0": Piece("king", "white")}
        king_pos = find_king(board, "white")
        assert king_pos is not None
        assert king_pos.q == 0 and king_pos.r == 0
    
    def test_find_black_king(self):
        board = {"2,-1": Piece("king", "black")}
        king_pos = find_king(board, "black")
        assert king_pos is not None
        assert king_pos.q == 2 and king_pos.r == -1
    
    def test_no_king(self):
        board = {"0,0": Piece("pawn", "white")}
        assert find_king(board, "white") is None


class TestIsAttacked:
    def test_pawn_attack(self):
        # White pawn at 0,0 attacks N, NE, NW
        # So square at 0,-1 is attacked
        board = {"0,0": Piece("pawn", "white")}
        assert is_attacked(board, HexCoord(0, -1), "white") is True
        assert is_attacked(board, HexCoord(0, 1), "white") is False
    
    def test_knight_attack(self):
        # Knight at center attacks knight jump squares
        board = {"0,0": Piece("knight", "white")}
        # Knight offset: (1, -2) is one target
        assert is_attacked(board, HexCoord(1, -2), "white") is True
        assert is_attacked(board, HexCoord(0, -1), "white") is False


class TestIsInCheck:
    def test_king_in_check_by_queen(self):
        board = {
            "0,0": Piece("king", "white"),
            "0,-2": Piece("queen", "black"),
        }
        assert is_in_check(board, "white") is True
    
    def test_king_not_in_check(self):
        board = {
            "0,0": Piece("king", "white"),
            "2,2": Piece("queen", "black"),  # Not aligned
        }
        assert is_in_check(board, "white") is False


class TestApplyMove:
    def test_simple_move(self):
        board = {"0,0": Piece("king", "white")}
        from underchex.types import Move
        move = Move(
            from_coord=HexCoord(0, 0),
            to_coord=HexCoord(0, -1),
            piece=Piece("king", "white"),
        )
        new_board = apply_move(board, move)
        
        assert "0,0" not in new_board
        assert "0,-1" in new_board
        assert new_board["0,-1"].type == "king"
    
    def test_capture_move(self):
        board = {
            "0,0": Piece("king", "white"),
            "0,-1": Piece("pawn", "black"),
        }
        from underchex.types import Move
        move = Move(
            from_coord=HexCoord(0, 0),
            to_coord=HexCoord(0, -1),
            piece=Piece("king", "white"),
            captured=Piece("pawn", "black"),
        )
        new_board = apply_move(board, move)
        
        assert new_board["0,-1"].type == "king"
        assert new_board["0,-1"].color == "white"


class TestGenerateLegalMoves:
    def test_king_moves_from_center(self):
        board = {"0,0": Piece("king", "white")}
        moves = generate_legal_moves(board, Piece("king", "white"), HexCoord(0, 0))
        # King should have 6 moves from center (all directions)
        assert len(moves) == 6


class TestValidateMove:
    def test_valid_move(self):
        board = {"0,0": Piece("king", "white")}
        result = validate_move(board, HexCoord(0, 0), HexCoord(0, -1), "white")
        assert result.legal is True
    
    def test_no_piece_at_source(self):
        board = {"0,0": Piece("king", "white")}
        result = validate_move(board, HexCoord(1, 0), HexCoord(1, -1), "white")
        assert result.legal is False
        assert result.reason == "noPieceAtSource"
    
    def test_not_your_piece(self):
        board = {"0,0": Piece("king", "black")}
        result = validate_move(board, HexCoord(0, 0), HexCoord(0, -1), "white")
        assert result.legal is False
        assert result.reason == "notYourPiece"
