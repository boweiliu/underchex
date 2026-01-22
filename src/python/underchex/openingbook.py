"""
Underchex Opening Book Module

Provides opening book functionality for the AI:
- Store and lookup opening book positions
- Generate opening book from self-play games
- Probabilistic move selection based on win rates

Opening book format:
- Positions are keyed by board hash (simple string hash)
- Each position stores a list of candidate moves with statistics
- Moves are selected probabilistically based on win rate and play count

Signed-by: agent #31 claude-sonnet-4 via opencode 20260122T08:36:49
"""
from __future__ import annotations

import json
import math
import random
from dataclasses import dataclass, field, asdict
from typing import Optional, Literal, Any
from datetime import datetime

from .types import (
    HexCoord,
    Piece,
    PieceType,
    Color,
    BoardState,
    Move,
    coord_to_string,
    opposite_color,
)

from .moves import (
    generate_all_legal_moves,
    apply_move,
)

from .ai import generate_board_hash

# ============================================================================
# Opening Book Types
# ============================================================================


@dataclass
class BookMoveStats:
    """Statistics for a single move in the opening book."""
    from_q: int
    from_r: int
    to_q: int
    to_r: int
    play_count: int = 0
    wins: int = 0
    draws: int = 0
    avg_score: float = 0.0
    promotion: Optional[PieceType] = None


@dataclass
class BookEntry:
    """Entry in the opening book for a single position."""
    hash_key: str
    moves: list[BookMoveStats] = field(default_factory=list)
    total_visits: int = 0


@dataclass
class BookMetadata:
    """Metadata for the opening book."""
    created_at: str = ""
    games_count: int = 0
    max_depth: int = 0


@dataclass
class OpeningBook:
    """The full opening book structure."""
    entries: dict[str, BookEntry] = field(default_factory=dict)
    metadata: BookMetadata = field(default_factory=BookMetadata)


@dataclass
class BookLookupOptions:
    """Options for opening book lookup."""
    min_play_count: int = 3
    temperature: float = 1.0
    use_win_rate_weight: bool = True
    seed: Optional[int] = None


@dataclass
class BookLookupResult:
    """Result of opening book lookup."""
    move: Optional[Move]
    entry: Optional[BookEntry]
    in_book: bool


@dataclass
class GameForBook:
    """Game result for book generation."""
    moves: list[Move]
    result: Literal[1, 0, -1]  # 1=white win, 0=draw, -1=black win
    evaluations: Optional[list[float]] = None


@dataclass
class BookGenerationOptions:
    """Options for book generation."""
    max_depth: int = 20
    min_position_count: int = 2


# ============================================================================
# Global Opening Book Instance
# ============================================================================

_opening_book: OpeningBook = OpeningBook(
    metadata=BookMetadata(created_at=datetime.now().isoformat())
)


def get_opening_book() -> OpeningBook:
    """Get the current opening book."""
    return _opening_book


def set_opening_book(book: OpeningBook) -> None:
    """Set/replace the opening book."""
    global _opening_book
    _opening_book = book


def clear_opening_book() -> None:
    """Clear the opening book."""
    global _opening_book
    _opening_book = OpeningBook(
        metadata=BookMetadata(created_at=datetime.now().isoformat())
    )


def get_book_entry(board: BoardState) -> Optional[BookEntry]:
    """Get book entry for a position."""
    hash_key = generate_board_hash(board)
    return _opening_book.entries.get(hash_key)


def is_in_book(board: BoardState) -> bool:
    """Check if a position is in the opening book."""
    return get_book_entry(board) is not None


def get_book_size() -> int:
    """Get the number of positions in the book."""
    return len(_opening_book.entries)


# ============================================================================
# Move Selection
# ============================================================================


def create_seeded_random(seed: int) -> random.Random:
    """Create a seeded random generator."""
    rng = random.Random()
    rng.seed(seed)
    return rng


def calculate_win_rate(stats: BookMoveStats) -> float:
    """
    Calculate win rate for a book move.
    Returns value between 0 and 1.
    """
    losses = stats.play_count - stats.wins - stats.draws
    total = stats.wins + stats.draws + losses
    if total == 0:
        return 0.5  # No data, assume neutral
    # Draws count as half a win
    return (stats.wins + stats.draws * 0.5) / total


def calculate_move_weight(
    stats: BookMoveStats,
    options: BookLookupOptions
) -> float:
    """
    Calculate selection weight for a book move.
    Combines play count and win rate.
    """
    temperature = options.temperature
    
    # Base weight from play count (popularity)
    weight = math.sqrt(stats.play_count)
    
    # Adjust by win rate if enabled
    if options.use_win_rate_weight:
        win_rate = calculate_win_rate(stats)
        # Scale win rate to 0.5-1.5 range to adjust weight
        win_rate_multiplier = 0.5 + win_rate
        weight *= win_rate_multiplier
    
    # Apply temperature (higher temperature = more randomness)
    if temperature > 0:
        weight = math.pow(weight, 1.0 / temperature)
    
    return weight


def select_book_move(
    moves: list[BookMoveStats],
    options: BookLookupOptions,
    rng: random.Random
) -> Optional[BookMoveStats]:
    """Select a move from book moves probabilistically."""
    min_play_count = options.min_play_count
    
    # Filter moves by minimum play count
    eligible_moves = [m for m in moves if m.play_count >= min_play_count]
    
    if not eligible_moves:
        return None
    
    # Calculate weights for all eligible moves
    weights = [calculate_move_weight(m, options) for m in eligible_moves]
    total_weight = sum(weights)
    
    if total_weight == 0:
        return None
    
    # Weighted random selection
    r = rng.random() * total_weight
    for i, move in enumerate(eligible_moves):
        r -= weights[i]
        if r <= 0:
            return move
    
    # Fallback to last move (shouldn't happen normally)
    return eligible_moves[-1]


def find_matching_move(
    legal_moves: list[Move],
    book_stats: BookMoveStats
) -> Optional[Move]:
    """Find a move from the book entry that matches the given coordinates."""
    for move in legal_moves:
        if (
            move.from_coord.q == book_stats.from_q and
            move.from_coord.r == book_stats.from_r and
            move.to_coord.q == book_stats.to_q and
            move.to_coord.r == book_stats.to_r and
            move.promotion == book_stats.promotion
        ):
            return move
    return None


def lookup_book_move(
    board: BoardState,
    color: Color,
    options: Optional[BookLookupOptions] = None
) -> BookLookupResult:
    """
    Lookup a move from the opening book for the given position.
    
    Args:
        board: The current board position
        color: The side to move
        options: Lookup options for move selection
        
    Returns:
        BookLookupResult with selected move (or None if not in book)
    """
    if options is None:
        options = BookLookupOptions()
    
    entry = get_book_entry(board)
    
    if entry is None or not entry.moves:
        return BookLookupResult(move=None, entry=None, in_book=False)
    
    # Create RNG for selection
    seed = options.seed if options.seed is not None else int(datetime.now().timestamp() * 1000)
    rng = create_seeded_random(seed)
    
    # Select a book move
    selected_stats = select_book_move(entry.moves, options, rng)
    
    if selected_stats is None:
        return BookLookupResult(move=None, entry=entry, in_book=True)
    
    # Get legal moves and find the matching one
    legal_moves = generate_all_legal_moves(board, color)
    move = find_matching_move(legal_moves, selected_stats)
    
    return BookLookupResult(move=move, entry=entry, in_book=True)


# ============================================================================
# Book Generation from Self-Play
# ============================================================================


def add_game_to_book(
    game: GameForBook,
    starting_board: BoardState,
    options: Optional[BookGenerationOptions] = None
) -> None:
    """
    Add a single game to the opening book.
    
    Args:
        game: The game to add
        starting_board: The starting position (for replay)
        options: Generation options
    """
    if options is None:
        options = BookGenerationOptions()
    
    max_depth = options.max_depth
    
    current_board = dict(starting_board)
    current_color: Color = "white"
    
    for ply in range(min(len(game.moves), max_depth)):
        move = game.moves[ply]
        hash_key = generate_board_hash(current_board)
        
        # Get or create book entry for this position
        entry = _opening_book.entries.get(hash_key)
        if entry is None:
            entry = BookEntry(hash_key=hash_key)
            _opening_book.entries[hash_key] = entry
        
        entry.total_visits += 1
        
        # Find or create move stats
        move_stats: Optional[BookMoveStats] = None
        for m in entry.moves:
            if (
                m.from_q == move.from_coord.q and
                m.from_r == move.from_coord.r and
                m.to_q == move.to_coord.q and
                m.to_r == move.to_coord.r and
                m.promotion == move.promotion
            ):
                move_stats = m
                break
        
        if move_stats is None:
            move_stats = BookMoveStats(
                from_q=move.from_coord.q,
                from_r=move.from_coord.r,
                to_q=move.to_coord.q,
                to_r=move.to_coord.r,
                promotion=move.promotion,
            )
            entry.moves.append(move_stats)
        
        move_stats.play_count += 1
        
        # Update win/draw stats based on game result
        # Win for the side that played the move
        if game.result == 1 and current_color == "white":
            move_stats.wins += 1
        elif game.result == -1 and current_color == "black":
            move_stats.wins += 1
        elif game.result == 0:
            move_stats.draws += 1
        
        # Update average score if evaluations provided
        if game.evaluations and ply < len(game.evaluations):
            eval_score = game.evaluations[ply]
            # Convert to moving side's perspective
            side_eval = eval_score if current_color == "white" else -eval_score
            # Running average
            move_stats.avg_score = (
                (move_stats.avg_score * (move_stats.play_count - 1) + side_eval) /
                move_stats.play_count
            )
        
        # Apply the move
        current_board = apply_move(current_board, move)
        current_color = opposite_color(current_color)
        
        # Update max depth in metadata
        if ply + 1 > _opening_book.metadata.max_depth:
            _opening_book.metadata.max_depth = ply + 1
    
    _opening_book.metadata.games_count += 1


def generate_opening_book(
    games: list[GameForBook],
    starting_board: BoardState,
    options: Optional[BookGenerationOptions] = None
) -> OpeningBook:
    """
    Generate an opening book from multiple games.
    
    Args:
        games: Array of games to include
        starting_board: The starting position
        options: Generation options
        
    Returns:
        The generated opening book
    """
    if options is None:
        options = BookGenerationOptions()
    
    # Clear and reset
    clear_opening_book()
    
    # Add all games
    for game in games:
        add_game_to_book(game, starting_board, options)
    
    # Prune positions with too few visits
    prune_book(options.min_position_count)
    
    _opening_book.metadata.created_at = datetime.now().isoformat()
    
    return _opening_book


def prune_book(min_count: int) -> None:
    """Remove positions with fewer than min_count visits."""
    to_delete: list[str] = []
    
    for hash_key, entry in _opening_book.entries.items():
        if entry.total_visits < min_count:
            to_delete.append(hash_key)
        else:
            # Also prune moves with too few plays within each entry
            min_move_count = max(1, min_count // 2)
            entry.moves = [m for m in entry.moves if m.play_count >= min_move_count]
    
    for hash_key in to_delete:
        del _opening_book.entries[hash_key]


# ============================================================================
# Book Serialization
# ============================================================================


def book_move_stats_to_dict(stats: BookMoveStats) -> dict[str, Any]:
    """Convert BookMoveStats to dictionary for JSON serialization."""
    d: dict[str, Any] = {
        "from_q": stats.from_q,
        "from_r": stats.from_r,
        "to_q": stats.to_q,
        "to_r": stats.to_r,
        "play_count": stats.play_count,
        "wins": stats.wins,
        "draws": stats.draws,
        "avg_score": stats.avg_score,
    }
    if stats.promotion is not None:
        d["promotion"] = stats.promotion
    return d


def dict_to_book_move_stats(d: dict[str, Any]) -> BookMoveStats:
    """Convert dictionary to BookMoveStats."""
    return BookMoveStats(
        from_q=d["from_q"],
        from_r=d["from_r"],
        to_q=d["to_q"],
        to_r=d["to_r"],
        play_count=d.get("play_count", 0),
        wins=d.get("wins", 0),
        draws=d.get("draws", 0),
        avg_score=d.get("avg_score", 0.0),
        promotion=d.get("promotion"),
    )


def serialize_book(book: Optional[OpeningBook] = None) -> dict[str, Any]:
    """Serialize opening book to JSON-compatible format."""
    if book is None:
        book = _opening_book
    
    entries: list[dict[str, Any]] = []
    
    for hash_key, entry in book.entries.items():
        entries.append({
            "hash": hash_key,
            "moves": [book_move_stats_to_dict(m) for m in entry.moves],
            "totalVisits": entry.total_visits,
        })
    
    return {
        "entries": entries,
        "metadata": {
            "createdAt": book.metadata.created_at,
            "gamesCount": book.metadata.games_count,
            "maxDepth": book.metadata.max_depth,
        },
    }


def deserialize_book(data: dict[str, Any]) -> OpeningBook:
    """Deserialize opening book from JSON format."""
    entries: dict[str, BookEntry] = {}
    
    for entry_data in data.get("entries", []):
        hash_key = entry_data["hash"]
        moves = [dict_to_book_move_stats(m) for m in entry_data.get("moves", [])]
        entries[hash_key] = BookEntry(
            hash_key=hash_key,
            moves=moves,
            total_visits=entry_data.get("totalVisits", 0),
        )
    
    metadata_data = data.get("metadata", {})
    metadata = BookMetadata(
        created_at=metadata_data.get("createdAt", ""),
        games_count=metadata_data.get("gamesCount", 0),
        max_depth=metadata_data.get("maxDepth", 0),
    )
    
    return OpeningBook(entries=entries, metadata=metadata)


def export_book_to_json(book: Optional[OpeningBook] = None) -> str:
    """Export opening book to JSON string."""
    return json.dumps(serialize_book(book), indent=2)


def import_book_from_json(json_str: str) -> OpeningBook:
    """Import opening book from JSON string."""
    data = json.loads(json_str)
    return deserialize_book(data)


def load_book_from_json(json_str: str) -> None:
    """Load opening book from JSON string and set as active book."""
    book = import_book_from_json(json_str)
    set_opening_book(book)


def save_book_to_file(filepath: str, book: Optional[OpeningBook] = None) -> None:
    """Save opening book to a JSON file."""
    json_str = export_book_to_json(book)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(json_str)


def load_book_from_file(filepath: str) -> OpeningBook:
    """Load opening book from a JSON file."""
    with open(filepath, "r", encoding="utf-8") as f:
        json_str = f.read()
    return import_book_from_json(json_str)


# ============================================================================
# Book Statistics
# ============================================================================


@dataclass
class BookStatistics:
    """Statistics about the opening book."""
    position_count: int = 0
    total_move_entries: int = 0
    avg_moves_per_position: float = 0.0
    max_depth: int = 0
    games_count: int = 0
    most_visited_position: Optional[str] = None
    highest_play_count: int = 0


def get_book_statistics() -> BookStatistics:
    """Get statistics about the current opening book."""
    total_move_entries = 0
    most_visited_position: Optional[str] = None
    most_visits = 0
    highest_play_count = 0
    
    for hash_key, entry in _opening_book.entries.items():
        total_move_entries += len(entry.moves)
        
        if entry.total_visits > most_visits:
            most_visits = entry.total_visits
            most_visited_position = hash_key
        
        for move in entry.moves:
            if move.play_count > highest_play_count:
                highest_play_count = move.play_count
    
    position_count = len(_opening_book.entries)
    
    return BookStatistics(
        position_count=position_count,
        total_move_entries=total_move_entries,
        avg_moves_per_position=(
            total_move_entries / position_count if position_count > 0 else 0.0
        ),
        max_depth=_opening_book.metadata.max_depth,
        games_count=_opening_book.metadata.games_count,
        most_visited_position=most_visited_position,
        highest_play_count=highest_play_count,
    )


def format_book_entry(entry: BookEntry) -> str:
    """Format book entry for display (debugging/UI)."""
    lines: list[str] = []
    lines.append(f"Position hash: {entry.hash_key} (visited {entry.total_visits} times)")
    lines.append("Moves:")
    
    # Sort by play count
    sorted_moves = sorted(entry.moves, key=lambda m: m.play_count, reverse=True)
    
    for move in sorted_moves:
        win_rate = calculate_win_rate(move)
        from_str = f"{move.from_q},{move.from_r}"
        to_str = f"{move.to_q},{move.to_r}"
        promo = f" (={move.promotion})" if move.promotion else ""
        lines.append(
            f"  {from_str}-{to_str}{promo}: "
            f"played={move.play_count}, wins={move.wins}, draws={move.draws}, "
            f"winRate={win_rate * 100:.1f}%"
        )
    
    return "\n".join(lines)
