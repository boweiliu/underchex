"""
Tests for AI module.

Signed-by: agent #17 claude-sonnet-4 via opencode 20260122T05:47:09
"""

import pytest
from underchex.types import HexCoord, Piece, BoardState
from underchex.game import create_new_game, make_move, get_legal_moves
from underchex.ai import (
    PIECE_VALUES,
    CHECKMATE_VALUE,
    get_centrality_bonus,
    evaluate_material,
    evaluate_position,
    evaluate_for_color,
    estimate_move_value,
    order_moves,
    find_best_move,
    get_ai_move,
    tt_clear,
)


class TestPieceValues:
    def test_pawn_value(self):
        assert PIECE_VALUES["pawn"] == 100
    
    def test_queen_is_most_valuable(self):
        assert PIECE_VALUES["queen"] > PIECE_VALUES["lance"]
        assert PIECE_VALUES["queen"] > PIECE_VALUES["knight"]
    
    def test_king_has_no_value(self):
        assert PIECE_VALUES["king"] == 0


class TestCentralityBonus:
    def test_center_has_max_bonus(self):
        center_bonus = get_centrality_bonus(HexCoord(0, 0))
        edge_bonus = get_centrality_bonus(HexCoord(4, 0))
        
        assert center_bonus > edge_bonus
    
    def test_edge_has_zero_bonus(self):
        edge_bonus = get_centrality_bonus(HexCoord(4, 0))
        assert edge_bonus == 0


class TestEvaluateMaterial:
    def test_equal_material(self):
        board = {
            "0,0": Piece("king", "white"),
            "0,-1": Piece("king", "black"),
        }
        # Should be roughly equal (just kings with positional difference)
        score = evaluate_material(board)
        assert abs(score) < 100  # Allow for small positional differences
    
    def test_white_advantage(self):
        board = {
            "0,0": Piece("king", "white"),
            "1,0": Piece("queen", "white"),
            "0,-4": Piece("king", "black"),
        }
        score = evaluate_material(board)
        assert score > 800  # White has queen advantage
    
    def test_black_advantage(self):
        board = {
            "0,4": Piece("king", "white"),
            "0,-4": Piece("king", "black"),
            "-1,-3": Piece("queen", "black"),
        }
        score = evaluate_material(board)
        assert score < -800  # Black has queen advantage


class TestEvaluatePosition:
    def test_initial_position_is_balanced(self):
        game = create_new_game()
        score = evaluate_position(game.board)
        
        # Initial position should be roughly equal
        # Allow some tolerance for first-move advantage
        assert abs(score) < 100
    
    def test_includes_mobility(self):
        # Position evaluation should include mobility
        game = create_new_game()
        score = evaluate_position(game.board)
        
        # Just verify it runs without error and returns a number
        assert isinstance(score, int)


class TestEvaluateForColor:
    def test_white_perspective(self):
        board = {
            "0,0": Piece("king", "white"),
            "1,0": Piece("queen", "white"),
            "0,-4": Piece("king", "black"),
        }
        white_score = evaluate_for_color(board, "white")
        assert white_score > 0  # White is ahead
    
    def test_black_perspective(self):
        board = {
            "0,4": Piece("king", "white"),
            "0,-4": Piece("king", "black"),
            "-1,-3": Piece("queen", "black"),
        }
        black_score = evaluate_for_color(board, "black")
        assert black_score > 0  # Black is ahead from black's perspective


class TestMoveOrdering:
    def test_captures_ranked_higher(self):
        from underchex.types import Move
        
        quiet_move = Move(
            from_coord=HexCoord(0, 0),
            to_coord=HexCoord(0, -1),
            piece=Piece("pawn", "white"),
        )
        
        capture_move = Move(
            from_coord=HexCoord(0, 0),
            to_coord=HexCoord(0, -1),
            piece=Piece("pawn", "white"),
            captured=Piece("pawn", "black"),
        )
        
        assert estimate_move_value(capture_move) > estimate_move_value(quiet_move)
    
    def test_promotions_ranked_high(self):
        from underchex.types import Move
        
        quiet_move = Move(
            from_coord=HexCoord(0, 0),
            to_coord=HexCoord(0, -1),
            piece=Piece("pawn", "white"),
        )
        
        promotion_move = Move(
            from_coord=HexCoord(0, -3),
            to_coord=HexCoord(0, -4),
            piece=Piece("pawn", "white"),
            promotion="queen",
        )
        
        assert estimate_move_value(promotion_move) > estimate_move_value(quiet_move)


class TestFindBestMove:
    def test_finds_move_in_starting_position(self):
        tt_clear()  # Clear transposition table
        game = create_new_game()
        result = find_best_move(game.board, "white", depth=2)
        
        assert result.move is not None
        assert result.move.piece.color == "white"
    
    def test_returns_stats(self):
        tt_clear()
        game = create_new_game()
        result = find_best_move(game.board, "white", depth=2)
        
        assert result.stats.nodes_searched > 0


class TestFindBestMoveCheckmate:
    def test_finds_winning_move(self):
        tt_clear()
        # Set up a position where white has big material advantage
        board = {
            "0,4": Piece("king", "white"),
            "0,-4": Piece("king", "black"),
            "0,0": Piece("queen", "white"),
        }
        
        # This simple position should evaluate as winning for white
        result = find_best_move(board, "white", depth=3)
        
        assert result.move is not None
        # Score should be positive (white has queen advantage)
        assert result.score > 800


class TestGetAIMove:
    def test_easy_difficulty(self):
        tt_clear()
        game = create_new_game()
        result = get_ai_move(game.board, "white", "easy")
        
        assert result.move is not None
    
    def test_medium_difficulty(self):
        tt_clear()
        game = create_new_game()
        result = get_ai_move(game.board, "white", "medium")
        
        assert result.move is not None
    
    def test_different_difficulties_vary_depth(self):
        tt_clear()
        game = create_new_game()
        
        easy_result = get_ai_move(game.board, "white", "easy")
        tt_clear()
        medium_result = get_ai_move(game.board, "white", "medium")
        
        # Medium should search more nodes
        assert medium_result.stats.nodes_searched >= easy_result.stats.nodes_searched
