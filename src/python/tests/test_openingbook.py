"""
Tests for the opening book module.

Signed-by: agent #31 claude-sonnet-4 via opencode 20260122T08:36:49
"""
from __future__ import annotations

import json
import pytest

from underchex import (
    HexCoord,
    Piece,
    Move,
    get_starting_position,
    create_board_from_placements,
    generate_all_legal_moves,
)
from underchex.types import BoardState, Color
from underchex.openingbook import (
    BookMoveStats,
    BookEntry,
    BookMetadata,
    OpeningBook,
    BookLookupOptions,
    BookLookupResult,
    GameForBook,
    BookGenerationOptions,
    BookStatistics,
    get_opening_book,
    set_opening_book,
    clear_opening_book,
    get_book_entry,
    is_in_book,
    get_book_size,
    calculate_win_rate,
    lookup_book_move,
    add_game_to_book,
    generate_opening_book,
    prune_book,
    serialize_book,
    deserialize_book,
    export_book_to_json,
    import_book_from_json,
    load_book_from_json,
    get_book_statistics,
    format_book_entry,
)
from underchex.ai import get_ai_move, AIOptions


# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def starting_board() -> BoardState:
    """Get a fresh starting board."""
    return create_board_from_placements(get_starting_position())


@pytest.fixture(autouse=True)
def clear_book_before_each():
    """Clear the opening book before each test."""
    clear_opening_book()
    yield
    clear_opening_book()


# ============================================================================
# Basic Operations Tests
# ============================================================================


class TestBasicOperations:
    """Tests for basic book operations."""
    
    def test_clear_opening_book_resets_state(self):
        """Clearing book should reset to empty state."""
        clear_opening_book()
        book = get_opening_book()
        assert len(book.entries) == 0
        assert book.metadata.games_count == 0
    
    def test_get_book_size_returns_zero_for_empty_book(self):
        """Empty book should have size 0."""
        clear_opening_book()
        assert get_book_size() == 0
    
    def test_is_in_book_returns_false_for_empty_book(self, starting_board):
        """Empty book should not contain any position."""
        clear_opening_book()
        assert is_in_book(starting_board) is False
    
    def test_get_book_entry_returns_none_for_empty_book(self, starting_board):
        """Empty book should return None for any position."""
        clear_opening_book()
        assert get_book_entry(starting_board) is None


# ============================================================================
# Win Rate Calculation Tests
# ============================================================================


class TestWinRateCalculation:
    """Tests for win rate calculation."""
    
    def test_win_rate_with_all_wins(self):
        """All wins should give 100% win rate."""
        stats = BookMoveStats(from_q=0, from_r=0, to_q=0, to_r=-1, play_count=10, wins=10, draws=0)
        assert calculate_win_rate(stats) == 1.0
    
    def test_win_rate_with_all_losses(self):
        """All losses should give 0% win rate."""
        stats = BookMoveStats(from_q=0, from_r=0, to_q=0, to_r=-1, play_count=10, wins=0, draws=0)
        assert calculate_win_rate(stats) == 0.0
    
    def test_win_rate_with_all_draws(self):
        """All draws should give 50% win rate."""
        stats = BookMoveStats(from_q=0, from_r=0, to_q=0, to_r=-1, play_count=10, wins=0, draws=10)
        assert calculate_win_rate(stats) == 0.5
    
    def test_win_rate_mixed_results(self):
        """Mixed results should give correct win rate."""
        # 5 wins, 2 draws, 3 losses = (5 + 2*0.5) / 10 = 6/10 = 0.6
        stats = BookMoveStats(from_q=0, from_r=0, to_q=0, to_r=-1, play_count=10, wins=5, draws=2)
        assert calculate_win_rate(stats) == 0.6
    
    def test_win_rate_with_zero_plays(self):
        """Zero plays should give neutral 50% win rate."""
        stats = BookMoveStats(from_q=0, from_r=0, to_q=0, to_r=-1, play_count=0, wins=0, draws=0)
        assert calculate_win_rate(stats) == 0.5


# ============================================================================
# Book Generation Tests
# ============================================================================


class TestBookGeneration:
    """Tests for book generation from games."""
    
    def test_add_single_game_creates_entries(self, starting_board):
        """Adding a game should create book entries."""
        # Get a legal first move for white
        moves = generate_all_legal_moves(starting_board, "white")
        first_move = moves[0]
        
        game = GameForBook(
            moves=[first_move],
            result=1  # White win
        )
        
        add_game_to_book(game, starting_board)
        
        assert get_book_size() >= 1
        assert is_in_book(starting_board)
    
    def test_add_game_updates_stats(self, starting_board):
        """Adding games should update move statistics."""
        moves = generate_all_legal_moves(starting_board, "white")
        first_move = moves[0]
        
        # Add game with white win
        game1 = GameForBook(moves=[first_move], result=1)
        add_game_to_book(game1, starting_board)
        
        # Add same game with black win
        game2 = GameForBook(moves=[first_move], result=-1)
        add_game_to_book(game2, starting_board)
        
        entry = get_book_entry(starting_board)
        assert entry is not None
        assert entry.total_visits == 2
        
        # Find the move stats
        move_stats = None
        for m in entry.moves:
            if m.from_q == first_move.from_coord.q and m.from_r == first_move.from_coord.r:
                move_stats = m
                break
        
        assert move_stats is not None
        assert move_stats.play_count == 2
        assert move_stats.wins == 1  # Only one white win
    
    def test_generate_opening_book_from_multiple_games(self, starting_board):
        """Generating book from multiple games should work."""
        moves = generate_all_legal_moves(starting_board, "white")
        
        games = [
            GameForBook(moves=[moves[0]], result=1),
            GameForBook(moves=[moves[0]], result=0),
            GameForBook(moves=[moves[1]], result=-1),
        ]
        
        book = generate_opening_book(games, starting_board, BookGenerationOptions(min_position_count=1))
        
        assert book.metadata.games_count == 3
        assert get_book_size() >= 1


# ============================================================================
# Move Lookup Tests
# ============================================================================


class TestMoveLookup:
    """Tests for book move lookup."""
    
    def test_lookup_returns_none_for_empty_book(self, starting_board):
        """Lookup in empty book should return no move."""
        result = lookup_book_move(starting_board, "white")
        
        assert result.move is None
        assert result.entry is None
        assert result.in_book is False
    
    def test_lookup_returns_move_when_in_book(self, starting_board):
        """Lookup should return move when position is in book."""
        moves = generate_all_legal_moves(starting_board, "white")
        first_move = moves[0]
        
        # Add games with the move
        for _ in range(5):
            game = GameForBook(moves=[first_move], result=1)
            add_game_to_book(game, starting_board)
        
        result = lookup_book_move(starting_board, "white", BookLookupOptions(min_play_count=1))
        
        assert result.in_book is True
        assert result.entry is not None
        assert result.move is not None
    
    def test_lookup_respects_min_play_count(self, starting_board):
        """Lookup should respect minimum play count filter."""
        moves = generate_all_legal_moves(starting_board, "white")
        first_move = moves[0]
        
        # Add only 2 games
        for _ in range(2):
            game = GameForBook(moves=[first_move], result=1)
            add_game_to_book(game, starting_board)
        
        # With min_play_count=5, should not find a move
        result = lookup_book_move(starting_board, "white", BookLookupOptions(min_play_count=5))
        
        assert result.in_book is True  # Position is in book
        assert result.move is None  # But no move meets criteria
    
    def test_lookup_deterministic_with_seed(self, starting_board):
        """Lookup with same seed should give same result."""
        moves = generate_all_legal_moves(starting_board, "white")
        
        # Add multiple different moves
        for i, move in enumerate(moves[:3]):
            for _ in range(5):
                game = GameForBook(moves=[move], result=1 if i % 2 == 0 else -1)
                add_game_to_book(game, starting_board)
        
        # Lookup with same seed multiple times
        options = BookLookupOptions(min_play_count=1, seed=12345)
        result1 = lookup_book_move(starting_board, "white", options)
        
        options = BookLookupOptions(min_play_count=1, seed=12345)
        result2 = lookup_book_move(starting_board, "white", options)
        
        assert result1.move is not None
        assert result2.move is not None
        assert result1.move.from_coord == result2.move.from_coord
        assert result1.move.to_coord == result2.move.to_coord


# ============================================================================
# Serialization Tests
# ============================================================================


class TestSerialization:
    """Tests for book serialization and deserialization."""
    
    def test_serialize_empty_book(self):
        """Serializing empty book should work."""
        clear_opening_book()
        data = serialize_book()
        
        assert "entries" in data
        assert "metadata" in data
        assert len(data["entries"]) == 0
    
    def test_serialize_deserialize_roundtrip(self, starting_board):
        """Serialize and deserialize should preserve data."""
        moves = generate_all_legal_moves(starting_board, "white")
        
        # Add some games
        for move in moves[:2]:
            for _ in range(3):
                game = GameForBook(moves=[move], result=1)
                add_game_to_book(game, starting_board)
        
        # Serialize
        json_str = export_book_to_json()
        original_size = get_book_size()
        original_stats = get_book_statistics()
        
        # Clear and deserialize
        clear_opening_book()
        load_book_from_json(json_str)
        
        # Verify
        assert get_book_size() == original_size
        new_stats = get_book_statistics()
        assert new_stats.games_count == original_stats.games_count
    
    def test_json_format_is_valid(self, starting_board):
        """Exported JSON should be valid JSON."""
        moves = generate_all_legal_moves(starting_board, "white")
        game = GameForBook(moves=[moves[0]], result=1)
        add_game_to_book(game, starting_board)
        
        json_str = export_book_to_json()
        
        # Should not raise
        parsed = json.loads(json_str)
        assert "entries" in parsed
        assert "metadata" in parsed


# ============================================================================
# Statistics Tests
# ============================================================================


class TestStatistics:
    """Tests for book statistics."""
    
    def test_empty_book_statistics(self):
        """Empty book should have zero statistics."""
        clear_opening_book()
        stats = get_book_statistics()
        
        assert stats.position_count == 0
        assert stats.total_move_entries == 0
        assert stats.games_count == 0
    
    def test_statistics_after_adding_games(self, starting_board):
        """Statistics should reflect added games."""
        moves = generate_all_legal_moves(starting_board, "white")
        
        # Add 5 games with different moves
        for i in range(5):
            game = GameForBook(moves=[moves[i % len(moves)]], result=1)
            add_game_to_book(game, starting_board)
        
        stats = get_book_statistics()
        
        assert stats.position_count >= 1
        assert stats.games_count == 5
        assert stats.highest_play_count >= 1


# ============================================================================
# AI Integration Tests
# ============================================================================


class TestAIIntegration:
    """Tests for AI integration with opening book."""
    
    def test_ai_uses_book_when_enabled(self, starting_board):
        """AI should use book move when book is enabled and position is in book."""
        moves = generate_all_legal_moves(starting_board, "white")
        first_move = moves[0]
        
        # Add games with specific move
        for _ in range(10):
            game = GameForBook(moves=[first_move], result=1)
            add_game_to_book(game, starting_board)
        
        # Get AI move with book enabled
        options = AIOptions(use_opening_book=True, book_min_play_count=1)
        result = get_ai_move(starting_board, "white", "easy", options)
        
        # Should have zero nodes (instant book lookup)
        assert result.stats.nodes_searched == 0
        assert result.move is not None
    
    def test_ai_falls_back_to_search_when_not_in_book(self, starting_board):
        """AI should fall back to search when position is not in book."""
        clear_opening_book()  # Ensure empty book
        
        options = AIOptions(use_opening_book=True, book_min_play_count=1)
        result = get_ai_move(starting_board, "white", "easy", options)
        
        # Should have searched (non-zero nodes)
        assert result.stats.nodes_searched > 0
        assert result.move is not None
    
    def test_ai_without_book_always_searches(self, starting_board):
        """AI without book option should always search."""
        moves = generate_all_legal_moves(starting_board, "white")
        
        # Add games to book
        for _ in range(10):
            game = GameForBook(moves=[moves[0]], result=1)
            add_game_to_book(game, starting_board)
        
        # Get AI move without book enabled
        result = get_ai_move(starting_board, "white", "easy")
        
        # Should have searched
        assert result.stats.nodes_searched > 0


# ============================================================================
# Format Book Entry Test
# ============================================================================


class TestFormatBookEntry:
    """Tests for formatting book entries."""
    
    def test_format_book_entry_output(self):
        """format_book_entry should produce readable output."""
        entry = BookEntry(
            hash_key="test_hash",
            moves=[
                BookMoveStats(from_q=0, from_r=3, to_q=0, to_r=2, play_count=10, wins=7, draws=2),
                BookMoveStats(from_q=1, from_r=2, to_q=1, to_r=1, play_count=5, wins=2, draws=1),
            ],
            total_visits=15
        )
        
        output = format_book_entry(entry)
        
        assert "test_hash" in output
        assert "visited 15 times" in output
        assert "0,3-0,2" in output
        assert "play_count=10" in output or "played=10" in output
