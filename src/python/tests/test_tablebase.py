"""
Endgame Tablebase Tests

Ported from TypeScript test suite.
Signed-by: agent #34 claude-sonnet-4 via opencode 20260122T09:10:55
"""

import pytest

from underchex import (
    HexCoord,
    Piece,
    Color,
    Move,
    coord_to_string,
    string_to_coord,
    opposite_color,
    get_starting_position,
    create_board_from_placements,
    generate_all_legal_moves,
    apply_move,
    is_in_check,
    find_king,
)

from underchex.types import BoardState

from underchex.tablebase import (
    WDLOutcome,
    TablebaseEntry,
    TablebaseConfig,
    TablebaseMetadata,
    PieceTablebase,
    TablebaseProbeResult,
    detect_configuration,
    generate_tablebase,
    probe_tablebase,
    get_tablebase_move,
    get_tablebase_score,
    initialize_tablebases,
    generate_tablebase_on_demand,
    get_loaded_tablebases,
    clear_tablebases,
    get_tablebase_statistics,
    format_tablebase_statistics,
    serialize_tablebase,
    deserialize_tablebase,
    export_tablebase_to_json,
    import_tablebase_from_json,
    get_tablebase,
    set_tablebase,
)

from underchex.ai import CHECKMATE_VALUE


# ============================================================================
# Test Helpers
# ============================================================================

def create_board(pieces: list[dict]) -> BoardState:
    """Create a minimal board with just the pieces specified."""
    board: BoardState = {}
    for p in pieces:
        piece = Piece(
            type=p["type"],
            color=p["color"],
            variant=p.get("variant"),
        )
        board[coord_to_string(HexCoord(q=p["q"], r=p["r"]))] = piece
    return board


# ============================================================================
# Configuration Detection Tests
# ============================================================================

class TestConfigurationDetection:
    def test_detects_kvk_configuration(self):
        board = create_board([
            {"type": "king", "color": "white", "q": 0, "r": 0},
            {"type": "king", "color": "black", "q": 2, "r": -2},
        ])
        
        config = detect_configuration(board)
        assert config is not None
        assert config.name == "KvK"
        assert config.stronger_side == []
        assert config.weaker_side == []
    
    def test_detects_kqvk_configuration(self):
        board = create_board([
            {"type": "king", "color": "white", "q": 0, "r": 0},
            {"type": "queen", "color": "white", "q": 1, "r": 0},
            {"type": "king", "color": "black", "q": 3, "r": -3},
        ])
        
        config = detect_configuration(board)
        assert config is not None
        assert config.name == "KQvK"
        assert "queen" in config.stronger_side
    
    def test_detects_klvk_configuration(self):
        board = create_board([
            {"type": "king", "color": "white", "q": 0, "r": 0},
            {"type": "lance", "color": "white", "q": 1, "r": 0, "variant": "A"},
            {"type": "king", "color": "black", "q": 3, "r": -3},
        ])
        
        config = detect_configuration(board)
        assert config is not None
        assert config.name == "KLvK"
    
    def test_detects_kcvk_configuration(self):
        board = create_board([
            {"type": "king", "color": "white", "q": 0, "r": 0},
            {"type": "chariot", "color": "white", "q": 1, "r": 0},
            {"type": "king", "color": "black", "q": 3, "r": -3},
        ])
        
        config = detect_configuration(board)
        assert config is not None
        assert config.name == "KCvK"
    
    def test_detects_knvk_configuration(self):
        board = create_board([
            {"type": "king", "color": "white", "q": 0, "r": 0},
            {"type": "knight", "color": "white", "q": 1, "r": 0},
            {"type": "king", "color": "black", "q": 3, "r": -3},
        ])
        
        config = detect_configuration(board)
        assert config is not None
        assert config.name == "KNvK"
    
    def test_returns_none_for_too_many_pieces(self):
        board = create_board([
            {"type": "king", "color": "white", "q": 0, "r": 0},
            {"type": "queen", "color": "white", "q": 1, "r": 0},
            {"type": "queen", "color": "white", "q": 2, "r": 0},
            {"type": "queen", "color": "white", "q": 3, "r": 0},
            {"type": "chariot", "color": "white", "q": -1, "r": 0},
            {"type": "king", "color": "black", "q": -3, "r": 3},
        ])
        
        # 6 pieces total (2 kings + 4 non-kings) exceeds the 5-piece limit
        config = detect_configuration(board)
        assert config is None
    
    def test_handles_black_being_stronger_side(self):
        board = create_board([
            {"type": "king", "color": "white", "q": 0, "r": 0},
            {"type": "king", "color": "black", "q": 3, "r": -3},
            {"type": "queen", "color": "black", "q": 2, "r": -2},
        ])
        
        config = detect_configuration(board)
        assert config is not None
        assert config.name == "KQvK"


# ============================================================================
# Tablebase Generation Tests
# ============================================================================

class TestTablebaseGeneration:
    def setup_method(self):
        clear_tablebases()
    
    def test_generates_kvk_tablebase_all_draws(self):
        config = TablebaseConfig(stronger_side=[], weaker_side=[], name="KvK")
        tablebase = generate_tablebase(config)
        
        assert tablebase.name == "KvK"
        assert tablebase.size > 0
        
        # KvK should be all draws (insufficient material)
        assert tablebase.metadata.win_count == 0
        assert tablebase.metadata.loss_count == 0
        assert tablebase.metadata.draw_count == tablebase.size
    
    def test_generates_kvk_tablebase_with_valid_dtm_values(self):
        config = TablebaseConfig(stronger_side=[], weaker_side=[], name="KvK")
        tablebase = generate_tablebase(config)
        
        # Check that all entries have valid WDL and DTM
        for key, entry in tablebase.entries.items():
            assert entry.wdl in ("win", "draw", "loss")
            
            if entry.wdl in ("win", "loss"):
                assert entry.dtm >= 0
            else:
                assert entry.dtm == -1  # Draws have DTM = -1
    
    def test_generates_kvk_tablebase_quickly(self):
        config = TablebaseConfig(stronger_side=[], weaker_side=[], name="KvK")
        tablebase = generate_tablebase(config)
        
        # KvK should complete in under 5 seconds (Python is slower than TS)
        assert tablebase.metadata.generation_time_ms < 5000


# ============================================================================
# Tablebase Probe Tests
# ============================================================================

class TestTablebaseProbing:
    @pytest.fixture(autouse=True)
    def setup(self):
        clear_tablebases()
        # Only generate KvK for fast tests
        kvk_config = TablebaseConfig(stronger_side=[], weaker_side=[], name="KvK")
        kvk_tablebase = generate_tablebase(kvk_config)
        set_tablebase(kvk_tablebase)
    
    def test_probes_kvk_position_as_draw(self):
        board = create_board([
            {"type": "king", "color": "white", "q": 0, "r": 0},
            {"type": "king", "color": "black", "q": 3, "r": -3},
        ])
        
        result = probe_tablebase(board, "white")
        assert result.found is True
        assert result.entry is not None
        assert result.entry.wdl == "draw"
    
    def test_returns_not_found_for_unloaded_tablebase(self):
        # KQvK tablebase is not loaded in fast test mode
        board = create_board([
            {"type": "king", "color": "white", "q": 0, "r": 0},
            {"type": "queen", "color": "white", "q": 1, "r": 0},
            {"type": "king", "color": "black", "q": 3, "r": -3},
        ])
        
        result = probe_tablebase(board, "white")
        # Should return not found since KQvK is not loaded
        assert result.found is False
    
    def test_returns_not_found_for_full_starting_position(self):
        # Full starting position is not in tablebase
        board = create_board_from_placements(get_starting_position())
        
        result = probe_tablebase(board, "white")
        assert result.found is False


# ============================================================================
# Tablebase Score Tests
# ============================================================================

class TestTablebaseScore:
    @pytest.fixture(autouse=True)
    def setup(self):
        clear_tablebases()
        # Only generate KvK for fast tests
        kvk_config = TablebaseConfig(stronger_side=[], weaker_side=[], name="KvK")
        kvk_tablebase = generate_tablebase(kvk_config)
        set_tablebase(kvk_tablebase)
    
    def test_returns_zero_for_drawn_kvk_position(self):
        board = create_board([
            {"type": "king", "color": "white", "q": 0, "r": 0},
            {"type": "king", "color": "black", "q": 3, "r": -3},
        ])
        
        score = get_tablebase_score(board, "white")
        assert score == 0
    
    def test_returns_none_for_position_not_in_tablebase(self):
        board = create_board_from_placements(get_starting_position())
        score = get_tablebase_score(board, "white")
        assert score is None


# ============================================================================
# Tablebase Move Tests
# ============================================================================

class TestTablebaseMove:
    @pytest.fixture(autouse=True)
    def setup(self):
        clear_tablebases()
        # Only generate KvK for fast tests
        kvk_config = TablebaseConfig(stronger_side=[], weaker_side=[], name="KvK")
        kvk_tablebase = generate_tablebase(kvk_config)
        set_tablebase(kvk_tablebase)
    
    def test_returns_none_for_drawn_kvk_position(self):
        board = create_board([
            {"type": "king", "color": "white", "q": 0, "r": 0},
            {"type": "king", "color": "black", "q": 3, "r": -3},
        ])
        
        # KvK is always draw, so there's no best move with a winning line
        # The tablebase stores draws with dtm=-1 and no bestMove
        move = get_tablebase_move(board, "white")
        # For drawn positions, bestMove may be null (no winning continuation)
        # This is expected behavior - either None or a legal move
        if move is not None:
            # Verify it's a legal move
            legal_moves = generate_all_legal_moves(board, "white")
            legal_positions = [(m.from_coord, m.to_coord) for m in legal_moves]
            assert (move.from_coord, move.to_coord) in legal_positions


# ============================================================================
# Serialization Tests
# ============================================================================

class TestTablebaseSerialization:
    def test_serializes_and_deserializes_correctly(self):
        config = TablebaseConfig(stronger_side=[], weaker_side=[], name="KvK")
        original = generate_tablebase(config)
        
        serialized = serialize_tablebase(original)
        deserialized = deserialize_tablebase(serialized)
        
        assert deserialized.name == original.name
        assert deserialized.size == original.size
        assert deserialized.metadata.win_count == original.metadata.win_count
        assert deserialized.metadata.draw_count == original.metadata.draw_count
        assert deserialized.metadata.loss_count == original.metadata.loss_count
    
    def test_exports_and_imports_json_correctly(self):
        config = TablebaseConfig(stronger_side=[], weaker_side=[], name="KvK")
        original = generate_tablebase(config)
        
        json_str = export_tablebase_to_json(original)
        assert isinstance(json_str, str)
        
        imported = import_tablebase_from_json(json_str)
        assert imported.name == original.name
        assert imported.size == original.size


# ============================================================================
# Statistics Tests
# ============================================================================

class TestTablebaseStatistics:
    @pytest.fixture(autouse=True)
    def setup(self):
        clear_tablebases()
        # Only generate KvK for fast tests
        kvk_config = TablebaseConfig(stronger_side=[], weaker_side=[], name="KvK")
        kvk_tablebase = generate_tablebase(kvk_config)
        set_tablebase(kvk_tablebase)
    
    def test_returns_correct_statistics(self):
        stats = get_tablebase_statistics()
        
        assert stats["totalEntries"] > 0
        assert len(stats["tablebases"]) > 0
        
        for tb in stats["tablebases"]:
            assert tb["size"] > 0
            assert tb["wins"] + tb["draws"] + tb["losses"] == tb["size"]
    
    def test_formats_statistics_as_string(self):
        formatted = format_tablebase_statistics()
        
        assert isinstance(formatted, str)
        assert "Endgame Tablebase Statistics" in formatted
        assert "KvK" in formatted


# ============================================================================
# On-Demand Generation Tests
# ============================================================================

class TestOnDemandGeneration:
    def setup_method(self):
        clear_tablebases()
    
    def test_generates_tablebase_on_demand(self):
        # Generate KvK on demand
        tablebase = generate_tablebase_on_demand("KvK")
        
        assert tablebase is not None
        assert tablebase.name == "KvK"
        assert tablebase.size > 0
        
        # Should be loaded now
        assert "KvK" in get_loaded_tablebases()
    
    def test_returns_none_for_invalid_name(self):
        tablebase = generate_tablebase_on_demand("InvalidName")
        assert tablebase is None


# ============================================================================
# Integration Tests (slow - skip by default)
# ============================================================================

@pytest.mark.skip(reason="Slow test - requires full tablebase generation")
class TestTablebaseIntegration:
    @pytest.fixture(autouse=True)
    def setup(self):
        clear_tablebases()
        initialize_tablebases()
    
    def test_loaded_tablebases_include_basic_endgames(self):
        loaded = get_loaded_tablebases()
        
        assert "KvK" in loaded
        assert "KQvK" in loaded
        assert "KLvK" in loaded
        assert "KCvK" in loaded
        assert "KNvK" in loaded
    
    def test_knvk_is_mostly_draws(self):
        tablebase = get_tablebase("KNvK")
        assert tablebase is not None
        
        # Knight alone cannot deliver checkmate on hex board
        # Most positions should be draws
        draw_percentage = tablebase.metadata.draw_count / tablebase.size
        assert draw_percentage > 0.9  # At least 90% draws
    
    def test_kqvk_has_many_wins(self):
        tablebase = get_tablebase("KQvK")
        assert tablebase is not None
        
        # Queen can deliver checkmate
        # Most positions should be wins for the queen side
        win_percentage = tablebase.metadata.win_count / tablebase.size
        assert win_percentage > 0.5  # At least 50% wins
