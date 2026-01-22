"""
Cross-Implementation Test Runner

Runs test cases from spec/tests/move_validation.json to verify
Python implementation matches the shared spec.

Signed-by: agent #28 claude-sonnet-4 via opencode 20260122T08:04:58
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Optional

import pytest

from underchex.board import is_valid_cell
from underchex.moves import validate_move
from underchex.types import (
    HexCoord,
    Piece,
    Color,
    PieceType,
    LanceVariant,
    coord_to_string,
    BoardState,
)


# ============================================================================
# Test Suite Loading
# ============================================================================

def load_test_suite() -> dict[str, Any]:
    """Load the shared test suite from spec directory."""
    spec_path = Path(__file__).parent.parent.parent.parent / "spec" / "tests" / "move_validation.json"
    with open(spec_path, "r") as f:
        return json.load(f)


def spec_to_piece(spec: dict[str, Any]) -> Piece:
    """Convert spec piece definition to Piece object."""
    piece_type: PieceType = spec["piece"]
    color: Color = spec["color"]
    variant: Optional[LanceVariant] = spec.get("variant")
    return Piece(type=piece_type, color=color, variant=variant)


def build_board_from_spec(setup: dict[str, Any]) -> BoardState:
    """Build a board state from spec setup."""
    board: BoardState = {}
    for placement in setup["pieces"]:
        piece = spec_to_piece(placement)
        coord = HexCoord(q=placement["q"], r=placement["r"])
        board[coord_to_string(coord)] = piece
    return board


# ============================================================================
# Board Validation Tests
# ============================================================================

class TestBoardValidation:
    """Test board cell validation against spec."""
    
    @pytest.fixture(scope="class")
    def test_suite(self) -> dict[str, Any]:
        return load_test_suite()
    
    def test_center_cell_is_valid(self) -> None:
        """board_001: Center cell is valid."""
        assert is_valid_cell(HexCoord(q=0, r=0)) is True
    
    def test_corner_at_max_radius_is_valid(self) -> None:
        """board_002: Corner cell at max radius is valid."""
        assert is_valid_cell(HexCoord(q=4, r=0)) is True
    
    def test_cell_outside_board_is_invalid(self) -> None:
        """board_003: Cell outside board is invalid."""
        assert is_valid_cell(HexCoord(q=5, r=0)) is False
    
    def test_cell_violating_constraint_is_invalid(self) -> None:
        """board_004: Cell violating q+r constraint is invalid."""
        assert is_valid_cell(HexCoord(q=3, r=3)) is False
    
    def test_all_board_validation_from_spec(self, test_suite: dict[str, Any]) -> None:
        """Run all board validation tests from spec."""
        board_tests = [tc for tc in test_suite["testCases"] if tc["type"] == "boardValidation"]
        
        for tc in board_tests:
            coord = HexCoord(q=tc["input"]["q"], r=tc["input"]["r"])
            result = is_valid_cell(coord)
            expected = tc["expected"]["valid"]
            assert result == expected, f'{tc["id"]}: {tc["description"]}'


# ============================================================================
# Move Validation Tests
# ============================================================================

class TestMoveValidation:
    """Test move validation against spec."""
    
    @pytest.fixture(scope="class")
    def test_suite(self) -> dict[str, Any]:
        return load_test_suite()
    
    def test_all_move_validation_from_spec(self, test_suite: dict[str, Any]) -> None:
        """Run all move validation tests from spec."""
        move_tests = [tc for tc in test_suite["testCases"] if tc["type"] == "moveValidation"]
        
        for tc in move_tests:
            board = build_board_from_spec(tc["setup"])
            turn: Color = tc["setup"]["turn"]
            
            from_coord = HexCoord(q=tc["move"]["from"]["q"], r=tc["move"]["from"]["r"])
            to_coord = HexCoord(q=tc["move"]["to"]["q"], r=tc["move"]["to"]["r"])
            
            result = validate_move(board, from_coord, to_coord, turn)
            
            # Check legal/illegal
            assert result.legal == tc["expected"]["legal"], \
                f'{tc["id"]}: {tc["description"]} - expected legal={tc["expected"]["legal"]}, got legal={result.legal}'
            
            # If legal and capture is specified, check it
            if tc["expected"]["legal"] and "capture" in tc["expected"]:
                assert result.capture == tc["expected"]["capture"], \
                    f'{tc["id"]}: {tc["description"]} - expected capture={tc["expected"]["capture"]}, got capture={result.capture}'
            
            # If illegal with specific reason, check it
            if not tc["expected"]["legal"] and "reason" in tc["expected"]:
                assert result.reason == tc["expected"]["reason"], \
                    f'{tc["id"]}: {tc["description"]} - expected reason={tc["expected"]["reason"]}, got reason={result.reason}'


# ============================================================================
# Individual Test Cases (for better error reporting)
# ============================================================================

class TestKingMoves:
    """Test king-specific move validation."""
    
    def test_king_can_move_to_adjacent_empty_cell(self) -> None:
        """king_001: King can move to adjacent empty cell."""
        board: BoardState = {
            "0,0": Piece(type="king", color="white")
        }
        result = validate_move(board, HexCoord(0, 0), HexCoord(1, 0), "white")
        assert result.legal is True
    
    def test_king_cannot_move_two_squares(self) -> None:
        """king_002: King cannot move 2 squares."""
        board: BoardState = {
            "0,0": Piece(type="king", color="white")
        }
        result = validate_move(board, HexCoord(0, 0), HexCoord(2, 0), "white")
        assert result.legal is False
    
    def test_king_can_capture_enemy(self) -> None:
        """king_003: King can capture enemy piece."""
        board: BoardState = {
            "0,0": Piece(type="king", color="white"),
            "1,0": Piece(type="pawn", color="black")
        }
        result = validate_move(board, HexCoord(0, 0), HexCoord(1, 0), "white")
        assert result.legal is True
        assert result.capture is True


class TestQueenMoves:
    """Test queen-specific move validation."""
    
    def test_queen_can_slide_multiple_squares(self) -> None:
        """queen_001: Queen can slide multiple squares."""
        board: BoardState = {
            "0,0": Piece(type="queen", color="white")
        }
        result = validate_move(board, HexCoord(0, 0), HexCoord(0, -3), "white")
        assert result.legal is True
    
    def test_queen_cannot_jump_over_pieces(self) -> None:
        """queen_002: Queen cannot jump over pieces."""
        board: BoardState = {
            "0,0": Piece(type="queen", color="white"),
            "0,-1": Piece(type="pawn", color="white")
        }
        result = validate_move(board, HexCoord(0, 0), HexCoord(0, -3), "white")
        assert result.legal is False


class TestPawnMoves:
    """Test pawn-specific move validation."""
    
    def test_white_pawn_moves_north(self) -> None:
        """pawn_001: White pawn moves north."""
        board: BoardState = {
            "0,2": Piece(type="pawn", color="white")
        }
        result = validate_move(board, HexCoord(0, 2), HexCoord(0, 1), "white")
        assert result.legal is True
    
    def test_white_pawn_cannot_move_south(self) -> None:
        """pawn_002: White pawn cannot move south."""
        board: BoardState = {
            "0,2": Piece(type="pawn", color="white")
        }
        result = validate_move(board, HexCoord(0, 2), HexCoord(0, 3), "white")
        assert result.legal is False


class TestKnightMoves:
    """Test knight-specific move validation."""
    
    def test_knight_leaps_to_valid_target(self) -> None:
        """knight_001: Knight leaps to valid target."""
        board: BoardState = {
            "0,0": Piece(type="knight", color="white")
        }
        result = validate_move(board, HexCoord(0, 0), HexCoord(1, -2), "white")
        assert result.legal is True
    
    def test_knight_can_jump_over_pieces(self) -> None:
        """knight_002: Knight can jump over pieces."""
        board: BoardState = {
            "0,0": Piece(type="knight", color="white"),
            "0,-1": Piece(type="pawn", color="white"),
            "1,-1": Piece(type="pawn", color="black")
        }
        result = validate_move(board, HexCoord(0, 0), HexCoord(1, -2), "white")
        assert result.legal is True


class TestLanceMoves:
    """Test lance-specific move validation."""
    
    def test_lance_a_slides_north(self) -> None:
        """lance_001: Lance A slides north."""
        board: BoardState = {
            "0,2": Piece(type="lance", color="white", variant="A")
        }
        result = validate_move(board, HexCoord(0, 2), HexCoord(0, -2), "white")
        assert result.legal is True
    
    def test_lance_a_cannot_move_ne(self) -> None:
        """lance_002: Lance A cannot move NE (not in its directions)."""
        board: BoardState = {
            "0,2": Piece(type="lance", color="white", variant="A")
        }
        result = validate_move(board, HexCoord(0, 2), HexCoord(2, 0), "white")
        assert result.legal is False


class TestChariotMoves:
    """Test chariot-specific move validation."""
    
    def test_chariot_slides_ne(self) -> None:
        """chariot_001: Chariot slides NE."""
        board: BoardState = {
            "0,0": Piece(type="chariot", color="white")
        }
        result = validate_move(board, HexCoord(0, 0), HexCoord(3, -3), "white")
        assert result.legal is True
    
    def test_chariot_cannot_move_north(self) -> None:
        """chariot_002: Chariot cannot move north (not diagonal)."""
        board: BoardState = {
            "0,0": Piece(type="chariot", color="white")
        }
        result = validate_move(board, HexCoord(0, 0), HexCoord(0, -2), "white")
        assert result.legal is False


class TestCheckValidation:
    """Test check-related move validation."""
    
    def test_king_cannot_move_into_check(self) -> None:
        """check_001: King cannot move into check."""
        board: BoardState = {
            "0,0": Piece(type="king", color="white"),
            "1,-4": Piece(type="queen", color="black")
        }
        result = validate_move(board, HexCoord(0, 0), HexCoord(1, 0), "white")
        assert result.legal is False
        assert result.reason == "movesIntoCheck"


class TestTurnValidation:
    """Test turn-related move validation."""
    
    def test_cannot_move_opponents_piece(self) -> None:
        """turn_001: Cannot move opponent's piece."""
        board: BoardState = {
            "0,-2": Piece(type="pawn", color="black")
        }
        result = validate_move(board, HexCoord(0, -2), HexCoord(0, -1), "white")
        assert result.legal is False
        assert result.reason == "notYourPiece"
    
    def test_cannot_move_from_empty_cell(self) -> None:
        """turn_002: Cannot move from empty cell."""
        board: BoardState = {
            "0,0": Piece(type="king", color="white")
        }
        result = validate_move(board, HexCoord(1, 0), HexCoord(2, 0), "white")
        assert result.legal is False
        assert result.reason == "noPieceAtSource"


# ============================================================================
# Test Coverage Report
# ============================================================================

class TestCoverageReport:
    """Report test coverage statistics."""
    
    @pytest.fixture(scope="class")
    def test_suite(self) -> dict[str, Any]:
        return load_test_suite()
    
    def test_coverage_report(self, test_suite: dict[str, Any]) -> None:
        """Print coverage statistics."""
        board_tests = [tc for tc in test_suite["testCases"] if tc["type"] == "boardValidation"]
        move_tests = [tc for tc in test_suite["testCases"] if tc["type"] == "moveValidation"]
        
        print("\n=== Spec Test Coverage Report (Python) ===")
        print(f"Board validation tests: {len(board_tests)}")
        print(f"Move validation tests: {len(move_tests)}")
        print(f"Total spec tests: {len(test_suite['testCases'])}")
        print("==========================================\n")
        
        assert len(test_suite["testCases"]) > 0
