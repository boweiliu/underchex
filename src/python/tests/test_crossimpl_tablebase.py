"""
Cross-Implementation Tablebase Test Runner

Runs test cases from spec/tests/tablebase_validation.json to verify
Python tablebase implementation matches the shared spec.

NOTE: Full tablebase tests are SLOW and skipped by default.
Run with FULL_TABLEBASE=1 pytest to enable all tests.

Signed-by: agent #41 claude-sonnet-4 via amp 20260122T10:32:31
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Optional

import pytest

from underchex.board import is_valid_cell
from underchex.types import (
    HexCoord,
    Piece,
    Color,
    PieceType,
    LanceVariant,
    coord_to_string,
    BoardState,
)
from underchex.moves import apply_move, generate_all_legal_moves
from underchex.tablebase import (
    detect_configuration,
    probe_tablebase,
    get_tablebase_move,
    initialize_tablebases,
    clear_tablebases,
    get_loaded_tablebases,
    generate_tablebase,
    set_tablebase,
    TablebaseConfig,
)

# Check if full tablebase tests are enabled
FULL_TABLEBASE = os.environ.get("FULL_TABLEBASE") == "1"


# ============================================================================
# Test Suite Loading
# ============================================================================

def load_test_suite() -> dict[str, Any]:
    """Load the tablebase test suite from spec directory."""
    spec_path = Path(__file__).parent.parent.parent.parent / "spec" / "tests" / "tablebase_validation.json"
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
# Fixtures
# ============================================================================

@pytest.fixture(scope="module")
def test_suite() -> dict[str, Any]:
    """Load the test suite once per module."""
    return load_test_suite()


@pytest.fixture(scope="module", autouse=True)
def setup_tablebases():
    """Set up tablebases before tests run."""
    clear_tablebases()
    
    if FULL_TABLEBASE:
        initialize_tablebases()
    else:
        # Only generate KvK for fast tests
        kvk_config = TablebaseConfig(stronger_side=[], weaker_side=[], name="KvK")
        kvk_tablebase = generate_tablebase(kvk_config)
        set_tablebase(kvk_tablebase)
    
    yield
    
    clear_tablebases()


# ============================================================================
# Configuration Detection Tests
# ============================================================================

class TestTablebaseConfigDetection:
    """Test tablebase configuration detection."""
    
    def test_kvk_detection(self) -> None:
        """tb_config_001: KvK configuration detection."""
        board = build_board_from_spec({
            "pieces": [
                {"piece": "king", "color": "white", "q": 0, "r": 0},
                {"piece": "king", "color": "black", "q": 0, "r": -3},
            ]
        })
        config = detect_configuration(board)
        assert config is not None
        assert config.name == "KvK"
    
    def test_kqvk_detection(self) -> None:
        """tb_config_002: KQvK configuration detection."""
        board = build_board_from_spec({
            "pieces": [
                {"piece": "king", "color": "white", "q": 0, "r": 0},
                {"piece": "queen", "color": "white", "q": 2, "r": 0},
                {"piece": "king", "color": "black", "q": 0, "r": -3},
            ]
        })
        config = detect_configuration(board)
        assert config is not None
        assert config.name == "KQvK"
    
    def test_all_config_tests_from_spec(self, test_suite: dict[str, Any]) -> None:
        """Run all tablebaseConfig tests from spec."""
        config_tests = [tc for tc in test_suite["testCases"] if tc["type"] == "tablebaseConfig"]
        
        for tc in config_tests:
            board = build_board_from_spec(tc["setup"])
            config = detect_configuration(board)
            
            if tc["expected"]["supported"]:
                assert config is not None, f'{tc["id"]}: {tc["description"]} - should be supported'
                if "config" in tc["expected"]:
                    assert config.name == tc["expected"]["config"], \
                        f'{tc["id"]}: {tc["description"]} - expected {tc["expected"]["config"]}, got {config.name}'
            else:
                # Not supported means either null config or complex position
                is_unsupported = config is None or len(config.stronger_side) > 2
                assert is_unsupported, f'{tc["id"]}: {tc["description"]} - should not be supported'


# ============================================================================
# WDL Lookup Tests
# ============================================================================

class TestTablebaseWDL:
    """Test tablebase WDL lookups."""
    
    def test_kvk_is_always_draw(self) -> None:
        """tb_wdl_001: KvK is always a draw."""
        board = build_board_from_spec({
            "pieces": [
                {"piece": "king", "color": "white", "q": 0, "r": 0},
                {"piece": "king", "color": "black", "q": 0, "r": -3},
            ]
        })
        result = probe_tablebase(board, "white")
        assert result.found is True
        assert result.entry is not None
        assert result.entry.wdl == "draw"
    
    def test_kvk_draw_for_black(self) -> None:
        """tb_wdl_002: KvK is draw for black too."""
        board = build_board_from_spec({
            "pieces": [
                {"piece": "king", "color": "white", "q": 0, "r": 0},
                {"piece": "king", "color": "black", "q": 0, "r": -3},
            ]
        })
        result = probe_tablebase(board, "black")
        assert result.found is True
        assert result.entry is not None
        assert result.entry.wdl == "draw"
    
    @pytest.mark.skipif(not FULL_TABLEBASE, reason="Requires full tablebase generation")
    def test_kqvk_queen_side_wins(self) -> None:
        """tb_wdl_003: KQvK - queen side to move is winning."""
        board = build_board_from_spec({
            "pieces": [
                {"piece": "king", "color": "white", "q": 0, "r": 0},
                {"piece": "queen", "color": "white", "q": 2, "r": 0},
                {"piece": "king", "color": "black", "q": 0, "r": -4},
            ]
        })
        result = probe_tablebase(board, "white")
        assert result.found is True
        assert result.entry is not None
        assert result.entry.wdl == "win"
    
    @pytest.mark.skipif(not FULL_TABLEBASE, reason="Requires full tablebase generation")
    def test_kqvk_lone_king_loses(self) -> None:
        """tb_wdl_004: KQvK - lone king to move is losing."""
        board = build_board_from_spec({
            "pieces": [
                {"piece": "king", "color": "white", "q": 0, "r": 0},
                {"piece": "queen", "color": "white", "q": 2, "r": 0},
                {"piece": "king", "color": "black", "q": 0, "r": -4},
            ]
        })
        result = probe_tablebase(board, "black")
        assert result.found is True
        assert result.entry is not None
        assert result.entry.wdl == "loss"
    
    @pytest.mark.skipif(not FULL_TABLEBASE, reason="Requires full tablebase generation")
    def test_knvk_knight_alone_is_draw(self) -> None:
        """tb_wdl_006: KNvK - knight alone cannot checkmate (draw)."""
        board = build_board_from_spec({
            "pieces": [
                {"piece": "king", "color": "white", "q": 0, "r": 0},
                {"piece": "knight", "color": "white", "q": 2, "r": 0},
                {"piece": "king", "color": "black", "q": 0, "r": -3},
            ]
        })
        result = probe_tablebase(board, "white")
        assert result.found is True
        assert result.entry is not None
        assert result.entry.wdl == "draw"
    
    @pytest.mark.skipif(not FULL_TABLEBASE, reason="Requires full tablebase generation")
    def test_all_wdl_tests_from_spec(self, test_suite: dict[str, Any]) -> None:
        """Run all tablebaseWDL tests from spec."""
        wdl_tests = [tc for tc in test_suite["testCases"] if tc["type"] == "tablebaseWDL"]
        
        for tc in wdl_tests:
            board = build_board_from_spec(tc["setup"])
            turn: Color = tc["setup"]["turn"]
            
            result = probe_tablebase(board, turn)
            
            assert result.found, f'{tc["id"]}: {tc["description"]} - should find position'
            assert result.entry is not None
            assert result.entry.wdl == tc["expected"]["wdl"], \
                f'{tc["id"]}: {tc["description"]} - expected WDL={tc["expected"]["wdl"]}, got {result.entry.wdl}'
            
            if "dtm" in tc["expected"]:
                assert result.entry.dtm == tc["expected"]["dtm"], \
                    f'{tc["id"]}: {tc["description"]} - expected DTM={tc["expected"]["dtm"]}, got {result.entry.dtm}'


# ============================================================================
# Move Suggestion Tests
# ============================================================================

class TestTablebaseMove:
    """Test tablebase move suggestions."""
    
    def test_kvk_no_winning_move(self) -> None:
        """tb_move_002: KvK - no winning move available (draw)."""
        board = build_board_from_spec({
            "pieces": [
                {"piece": "king", "color": "white", "q": 0, "r": 0},
                {"piece": "king", "color": "black", "q": 0, "r": -3},
            ]
        })
        # For KvK, it's always a draw - no winning move
        result = probe_tablebase(board, "white")
        assert result.entry is not None
        assert result.entry.wdl == "draw"
    
    @pytest.mark.skipif(not FULL_TABLEBASE, reason="Requires full tablebase generation")
    def test_kqvk_has_winning_move(self) -> None:
        """tb_move_001: KQvK winning position has a winning move."""
        board = build_board_from_spec({
            "pieces": [
                {"piece": "king", "color": "white", "q": 0, "r": 0},
                {"piece": "queen", "color": "white", "q": 2, "r": 0},
                {"piece": "king", "color": "black", "q": 0, "r": -4},
            ]
        })
        move = get_tablebase_move(board, "white")
        assert move is not None
        
        # Verify the move preserves the win
        new_board = apply_move(board, move)
        new_result = probe_tablebase(new_board, "black")
        assert new_result.entry is not None
        assert new_result.entry.wdl == "loss"
    
    @pytest.mark.skipif(not FULL_TABLEBASE, reason="Requires full tablebase generation")
    def test_all_move_tests_from_spec(self, test_suite: dict[str, Any]) -> None:
        """Run all tablebaseMove tests from spec."""
        move_tests = [tc for tc in test_suite["testCases"] if tc["type"] == "tablebaseMove"]
        
        for tc in move_tests:
            board = build_board_from_spec(tc["setup"])
            turn: Color = tc["setup"]["turn"]
            
            move = get_tablebase_move(board, turn)
            
            if tc["expected"]["hasMove"]:
                assert move is not None, f'{tc["id"]}: {tc["description"]} - should have move'
                
                if tc["expected"].get("preservesWin") and move:
                    # Verify the move preserves the win
                    new_board = apply_move(board, move)
                    opponent: Color = "black" if turn == "white" else "white"
                    new_result = probe_tablebase(new_board, opponent)
                    assert new_result.found, \
                        f'{tc["id"]}: {tc["description"]} - resulting position should be in tablebase'
                    assert new_result.entry is not None
                    assert new_result.entry.wdl == "loss", \
                        f'{tc["id"]}: {tc["description"]} - opponent should be losing'
            else:
                # For draws, check that the position is indeed a draw
                result = probe_tablebase(board, turn)
                assert result.entry is not None
                assert result.entry.wdl == "draw", \
                    f'{tc["id"]}: {tc["description"]} - should be draw if no winning move'


# ============================================================================
# Symmetry Tests
# ============================================================================

class TestTablebaseSymmetry:
    """Test tablebase symmetry (color-agnostic)."""
    
    @pytest.mark.skipif(not FULL_TABLEBASE, reason="Requires full tablebase generation")
    def test_black_queen_vs_white_king_queen_wins(self) -> None:
        """tb_symmetric_001: Black queen vs white king - queen side wins."""
        board = build_board_from_spec({
            "pieces": [
                {"piece": "king", "color": "white", "q": 0, "r": 4},
                {"piece": "queen", "color": "black", "q": 2, "r": 0},
                {"piece": "king", "color": "black", "q": 0, "r": 0},
            ]
        })
        result = probe_tablebase(board, "black")
        assert result.found is True
        assert result.entry is not None
        assert result.entry.wdl == "win"
    
    @pytest.mark.skipif(not FULL_TABLEBASE, reason="Requires full tablebase generation")
    def test_black_queen_vs_white_king_lone_king_loses(self) -> None:
        """tb_symmetric_002: Black queen vs white king - lone king loses."""
        board = build_board_from_spec({
            "pieces": [
                {"piece": "king", "color": "white", "q": 0, "r": 4},
                {"piece": "queen", "color": "black", "q": 2, "r": 0},
                {"piece": "king", "color": "black", "q": 0, "r": 0},
            ]
        })
        result = probe_tablebase(board, "white")
        assert result.found is True
        assert result.entry is not None
        assert result.entry.wdl == "loss"


# ============================================================================
# Coverage Report
# ============================================================================

class TestCoverageReport:
    """Report test coverage statistics."""
    
    def test_coverage_report(self, test_suite: dict[str, Any]) -> None:
        """Print coverage statistics."""
        config_tests = [tc for tc in test_suite["testCases"] if tc["type"] == "tablebaseConfig"]
        wdl_tests = [tc for tc in test_suite["testCases"] if tc["type"] == "tablebaseWDL"]
        move_tests = [tc for tc in test_suite["testCases"] if tc["type"] == "tablebaseMove"]
        
        print("\n=== Tablebase Spec Test Coverage Report (Python) ===")
        print(f"Configuration detection tests: {len(config_tests)}")
        print(f"WDL lookup tests: {len(wdl_tests)}")
        print(f"Move suggestion tests: {len(move_tests)}")
        print(f"Total tablebase spec tests: {len(test_suite['testCases'])}")
        print(f"Loaded tablebases: {', '.join(get_loaded_tablebases())}")
        print("=====================================================\n")
        
        assert len(test_suite["testCases"]) > 0
