"""
Underchex Endgame Tablebase Module

Provides perfect endgame play for positions with few pieces:
- Precomputed Win/Draw/Loss (WDL) tables
- Distance to Mate (DTM) information
- Retrograde analysis for tablebase generation
- Integration with AI search for endgame positions

Supported endgames (initial implementation):
- KvK (King vs King) - Always draw
- KQvK (King+Queen vs King) - Win for the side with queen
- KLvK (King+Lance vs King) - Usually win, some draws
- KCvK (King+Chariot vs King) - Usually win, some draws
- KNvK (King+Knight vs King) - Draw (insufficient material on hex board)

Ported from TypeScript implementation by agent #33.
Signed-by: agent #34 claude-sonnet-4 via opencode 20260122T09:10:55
"""
from __future__ import annotations

import json
import time
from dataclasses import dataclass
from typing import Literal, Optional, Iterator

from .types import (
    HexCoord,
    Piece,
    PieceType,
    Color,
    BoardState,
    Move,
    BOARD_RADIUS,
    coord_to_string,
    string_to_coord,
    opposite_color,
)

from .moves import (
    generate_all_legal_moves,
    apply_move,
    is_in_check,
    find_king,
    get_piece_at,
)

from .board import (
    is_valid_cell,
    get_all_cells,
    hex_distance,
)

from .ai import (
    generate_board_hash,
    CHECKMATE_VALUE,
)

# ============================================================================
# Tablebase Types
# ============================================================================

WDLOutcome = Literal["win", "draw", "loss"]


@dataclass
class TablebaseEntry:
    """Entry in the tablebase for a single position."""
    wdl: WDLOutcome
    dtm: int  # Distance to mate: 0 for checkmate, -1 for draws, positive for wins
    best_move: Optional[dict] = None  # {"from": HexCoord, "to": HexCoord, "promotion": Optional[PieceType]}


@dataclass
class TablebaseConfig:
    """Configuration for which piece configurations to support."""
    stronger_side: list[PieceType]  # Piece types for the stronger side (excluding king)
    weaker_side: list[PieceType]  # Piece types for the weaker side (excluding king)
    name: str


@dataclass
class TablebaseMetadata:
    """Generation metadata for a tablebase."""
    generated_at: str
    generation_time_ms: int
    win_count: int
    draw_count: int
    loss_count: int


@dataclass
class PieceTablebase:
    """Tablebase for a specific piece configuration."""
    name: str
    description: str
    entries: dict[str, TablebaseEntry]  # Map from position hash to entry
    size: int
    metadata: TablebaseMetadata


@dataclass
class TablebaseProbeResult:
    """Result of tablebase probe."""
    found: bool
    entry: Optional[TablebaseEntry] = None
    tablebase_name: Optional[str] = None


# ============================================================================
# Global Tablebase Storage
# ============================================================================

_tablebases: dict[str, PieceTablebase] = {}


def get_tablebase(name: str) -> Optional[PieceTablebase]:
    """Get a tablebase by configuration name."""
    return _tablebases.get(name)


def set_tablebase(tablebase: PieceTablebase) -> None:
    """Store a tablebase."""
    _tablebases[tablebase.name] = tablebase


def get_loaded_tablebases() -> list[str]:
    """Get all loaded tablebase names."""
    return list(_tablebases.keys())


def clear_tablebases() -> None:
    """Clear all tablebases."""
    _tablebases.clear()


# ============================================================================
# Position Key Generation
# ============================================================================

def get_tablebase_key(board: BoardState, side_to_move: Color) -> str:
    """Create a hash-based key for tablebase lookup."""
    board_hash = generate_board_hash(board)
    return f"{board_hash}-{side_to_move}"


# ============================================================================
# Configuration Detection
# ============================================================================

def detect_configuration(board: BoardState) -> Optional[TablebaseConfig]:
    """
    Detect the piece configuration of a position.
    Returns None if not a supported tablebase configuration.
    """
    pieces: list[tuple[Color, PieceType]] = []
    
    for piece in board.values():
        pieces.append((piece.color, piece.type))
    
    # Count pieces by color (excluding kings)
    white_pieces = [p[1] for p in pieces if p[0] == "white" and p[1] != "king"]
    black_pieces = [p[1] for p in pieces if p[0] == "black" and p[1] != "king"]
    
    # KvK
    if len(white_pieces) == 0 and len(black_pieces) == 0:
        return TablebaseConfig(stronger_side=[], weaker_side=[], name="KvK")
    
    # Determine stronger and weaker sides
    if len(white_pieces) >= len(black_pieces):
        stronger_side = sorted(white_pieces)
        weaker_side = sorted(black_pieces)
    else:
        stronger_side = sorted(black_pieces)
        weaker_side = sorted(white_pieces)
    
    # Generate configuration name
    def piece_abbrev(pt: PieceType) -> str:
        abbrevs = {
            "queen": "Q",
            "lance": "L",
            "chariot": "C",
            "knight": "N",
            "pawn": "P",
        }
        return abbrevs.get(pt, pt[0].upper())
    
    name = "K"
    for p in stronger_side:
        name += piece_abbrev(p)
    name += "vK"
    for p in weaker_side:
        name += piece_abbrev(p)
    
    # Check if this configuration is supported (max 5 pieces for now)
    total_pieces = 2 + len(stronger_side) + len(weaker_side)  # 2 kings
    if total_pieces > 5:
        return None  # Too complex for tablebase
    
    # For now, only support configurations where weaker side has no pieces
    if len(weaker_side) > 0:
        return None  # Future: support KQvKP etc.
    
    return TablebaseConfig(stronger_side=stronger_side, weaker_side=weaker_side, name=name)


# ============================================================================
# Retrograde Analysis
# ============================================================================

def _is_illegal_position(board: BoardState, side_to_move: Color) -> bool:
    """
    Check if a position is illegal (the side NOT to move is in check).
    """
    opponent = opposite_color(side_to_move)
    return is_in_check(board, opponent)


def _get_terminal_outcome(board: BoardState, side_to_move: Color) -> Optional[tuple[WDLOutcome, int]]:
    """
    Determine the outcome of a terminal position.
    Returns (wdl, dtm) or None if not terminal.
    """
    moves = generate_all_legal_moves(board, side_to_move)
    
    if len(moves) == 0:
        # No legal moves
        if is_in_check(board, side_to_move):
            # Checkmate - side to move loses
            return ("loss", 0)
        else:
            # Stalemate - draw
            return ("draw", -1)
    
    return None  # Not terminal


def generate_all_positions(
    config: TablebaseConfig
) -> Iterator[tuple[BoardState, Color]]:
    """
    Generate all positions for a given piece configuration.
    Used in retrograde analysis to enumerate the state space.
    """
    all_cells = get_all_cells()
    
    # Enumerate all white king positions
    for white_king_pos in all_cells:
        # Enumerate all black king positions
        for black_king_pos in all_cells:
            # Kings cannot be on same cell
            if white_king_pos == black_king_pos:
                continue
            
            # Kings cannot be adjacent (would be check)
            if hex_distance(white_king_pos, black_king_pos) <= 1:
                continue
            
            # Generate positions with additional pieces
            remaining_cells = [
                c for c in all_cells 
                if c != white_king_pos and c != black_king_pos
            ]
            
            if len(config.stronger_side) == 0:
                # KvK - just yield the position with both sides to move
                for side_to_move in ["white", "black"]:
                    board: BoardState = {}
                    board[coord_to_string(white_king_pos)] = Piece(type="king", color="white")
                    board[coord_to_string(black_king_pos)] = Piece(type="king", color="black")
                    yield (board, side_to_move)
                    
            elif len(config.stronger_side) == 1:
                # K + 1 piece vs K
                piece_type = config.stronger_side[0]
                
                for piece_pos in remaining_cells:
                    for side_to_move in ["white", "black"]:
                        board: BoardState = {}
                        board[coord_to_string(white_king_pos)] = Piece(type="king", color="white")
                        board[coord_to_string(black_king_pos)] = Piece(type="king", color="black")
                        
                        # Place piece for white (stronger side)
                        if piece_type == "lance":
                            # Handle lance variants
                            for variant in ["A", "B"]:
                                board_copy = dict(board)
                                board_copy[coord_to_string(piece_pos)] = Piece(
                                    type="lance", color="white", variant=variant
                                )
                                
                                if not _is_illegal_position(board_copy, side_to_move):
                                    yield (dict(board_copy), side_to_move)
                        else:
                            board[coord_to_string(piece_pos)] = Piece(
                                type=piece_type, color="white"
                            )
                            
                            if not _is_illegal_position(board, side_to_move):
                                yield (dict(board), side_to_move)
                                
            elif len(config.stronger_side) == 2:
                # K + 2 pieces vs K
                piece1_type = config.stronger_side[0]
                piece2_type = config.stronger_side[1]
                
                for i, pos1 in enumerate(remaining_cells):
                    for pos2 in remaining_cells[i + 1:]:
                        for side_to_move in ["white", "black"]:
                            # Handle lance variants
                            variants1 = ["A", "B"] if piece1_type == "lance" else [None]
                            variants2 = ["A", "B"] if piece2_type == "lance" else [None]
                            
                            for v1 in variants1:
                                for v2 in variants2:
                                    board: BoardState = {}
                                    board[coord_to_string(white_king_pos)] = Piece(type="king", color="white")
                                    board[coord_to_string(black_king_pos)] = Piece(type="king", color="black")
                                    
                                    p1 = Piece(type=piece1_type, color="white", variant=v1) if v1 else Piece(type=piece1_type, color="white")
                                    p2 = Piece(type=piece2_type, color="white", variant=v2) if v2 else Piece(type=piece2_type, color="white")
                                    
                                    board[coord_to_string(pos1)] = p1
                                    board[coord_to_string(pos2)] = p2
                                    
                                    if not _is_illegal_position(board, side_to_move):
                                        yield (dict(board), side_to_move)


def generate_tablebase(config: TablebaseConfig) -> PieceTablebase:
    """
    Generate a tablebase for a given configuration using retrograde analysis.
    
    Algorithm:
    1. Initialize all positions as unknown
    2. Find all checkmate positions (DTM=0, loss for side to move)
    3. Propagate backwards: if a position has a move to a lost position, it's winning
    4. Continue until no more changes
    5. All remaining unknown positions are draws
    """
    start_time = time.time()
    
    entries: dict[str, TablebaseEntry] = {}
    metadata = TablebaseMetadata(
        generated_at="",
        generation_time_ms=0,
        win_count=0,
        draw_count=0,
        loss_count=0,
    )
    
    # Phase 1: Initialize all positions and find terminal positions
    position_map: dict[str, tuple[BoardState, Color]] = {}
    unknown_positions: set[str] = set()
    
    for board, side_to_move in generate_all_positions(config):
        key = get_tablebase_key(board, side_to_move)
        position_map[key] = (dict(board), side_to_move)
        
        # Check if terminal
        terminal = _get_terminal_outcome(board, side_to_move)
        if terminal:
            wdl, dtm = terminal
            entries[key] = TablebaseEntry(wdl=wdl, dtm=dtm)
            if wdl == "loss":
                metadata.loss_count += 1
            elif wdl == "draw":
                metadata.draw_count += 1
        else:
            unknown_positions.add(key)
    
    # Phase 2: Retrograde analysis
    MAX_ITERATIONS = 500
    changed = True
    iteration = 0
    
    while changed and iteration < MAX_ITERATIONS:
        changed = False
        iteration += 1
        
        to_resolve: list[str] = []
        
        for key in list(unknown_positions):
            pos = position_map.get(key)
            if not pos:
                continue
            
            board, side_to_move = pos
            moves = generate_all_legal_moves(board, side_to_move)
            
            # Check if any move leads to a lost position for opponent (= win for us)
            # Or all moves lead to won positions for opponent (= loss for us)
            has_winning_move = False
            all_moves_lose = True
            best_move_info: Optional[dict] = None
            max_dtm = 0
            
            for move in moves:
                new_board = apply_move(board, move)
                new_key = get_tablebase_key(new_board, opposite_color(side_to_move))
                opponent_entry = entries.get(new_key)
                
                if not opponent_entry:
                    # Unknown position - can't conclude yet
                    all_moves_lose = False
                    continue
                
                if opponent_entry.wdl == "loss":
                    # Opponent is lost = we win
                    has_winning_move = True
                    if not best_move_info or opponent_entry.dtm + 1 < best_move_info.get("dtm", float("inf")):
                        # Find the fastest win
                        best_move_info = {
                            "from": move.from_coord,
                            "to": move.to_coord,
                            "dtm": opponent_entry.dtm + 1,
                            "promotion": move.promotion,
                        }
                elif opponent_entry.wdl == "win":
                    # Opponent wins = this move loses for us
                    max_dtm = max(max_dtm, opponent_entry.dtm)
                else:
                    # Draw - better than losing
                    all_moves_lose = False
            
            if has_winning_move and best_move_info:
                # We have a winning move - this position is winning
                to_resolve.append(key)
                entries[key] = TablebaseEntry(
                    wdl="win",
                    dtm=best_move_info["dtm"],
                    best_move={
                        "from": best_move_info["from"],
                        "to": best_move_info["to"],
                        "promotion": best_move_info.get("promotion"),
                    },
                )
                metadata.win_count += 1
                changed = True
            elif all_moves_lose and len(moves) > 0:
                # All moves lead to opponent winning - we lose
                to_resolve.append(key)
                entries[key] = TablebaseEntry(
                    wdl="loss",
                    dtm=max_dtm + 1,
                )
                metadata.loss_count += 1
                changed = True
        
        # Remove resolved positions from unknown set
        for key in to_resolve:
            unknown_positions.discard(key)
    
    # Phase 3: All remaining unknown positions are draws
    for key in unknown_positions:
        entries[key] = TablebaseEntry(wdl="draw", dtm=-1)
        metadata.draw_count += 1
    
    metadata.generated_at = time.strftime("%Y-%m-%dT%H:%M:%S")
    metadata.generation_time_ms = int((time.time() - start_time) * 1000)
    
    return PieceTablebase(
        name=config.name,
        description=f"Endgame tablebase for {config.name}",
        entries=entries,
        size=len(entries),
        metadata=metadata,
    )


# ============================================================================
# Tablebase Probe
# ============================================================================

def probe_tablebase(board: BoardState, side_to_move: Color) -> TablebaseProbeResult:
    """Probe the tablebase for a position."""
    # Detect configuration
    config = detect_configuration(board)
    if not config:
        return TablebaseProbeResult(found=False)
    
    # Get the tablebase for this configuration
    tablebase = _tablebases.get(config.name)
    if not tablebase:
        return TablebaseProbeResult(found=False)
    
    # Look up the position
    key = get_tablebase_key(board, side_to_move)
    entry = tablebase.entries.get(key)
    
    if entry:
        return TablebaseProbeResult(
            found=True,
            entry=entry,
            tablebase_name=config.name,
        )
    
    return TablebaseProbeResult(found=False)


def get_tablebase_move(board: BoardState, side_to_move: Color) -> Optional[Move]:
    """
    Get the tablebase move for a position.
    Returns the best move according to the tablebase, or None if not found.
    """
    result = probe_tablebase(board, side_to_move)
    
    if not result.found or not result.entry or not result.entry.best_move:
        return None
    
    # Reconstruct the move from the tablebase entry
    from_coord = result.entry.best_move["from"]
    to_coord = result.entry.best_move["to"]
    promotion = result.entry.best_move.get("promotion")
    
    piece = get_piece_at(board, from_coord)
    if not piece:
        return None
    
    captured = get_piece_at(board, to_coord)
    
    return Move(
        from_coord=from_coord,
        to_coord=to_coord,
        piece=piece,
        captured=captured,
        promotion=promotion,
    )


def get_tablebase_score(board: BoardState, side_to_move: Color) -> Optional[int]:
    """
    Get the tablebase evaluation for a position.
    Returns a score in centipawns, where positive is good for side_to_move.
    
    Winning: +CHECKMATE_VALUE - DTM (so quicker mates are better)
    Drawing: 0
    Losing: -CHECKMATE_VALUE + DTM (so slower losses are better)
    """
    result = probe_tablebase(board, side_to_move)
    
    if not result.found or not result.entry:
        return None
    
    if result.entry.wdl == "win":
        return CHECKMATE_VALUE - result.entry.dtm
    elif result.entry.wdl == "draw":
        return 0
    else:  # loss
        return -CHECKMATE_VALUE + result.entry.dtm


# ============================================================================
# Tablebase Initialization
# ============================================================================

def initialize_tablebases() -> None:
    """
    Generate and load common endgame tablebases.
    Call this at startup or when tablebases are needed.
    """
    configs = [
        TablebaseConfig(stronger_side=[], weaker_side=[], name="KvK"),
        TablebaseConfig(stronger_side=["queen"], weaker_side=[], name="KQvK"),
        TablebaseConfig(stronger_side=["lance"], weaker_side=[], name="KLvK"),
        TablebaseConfig(stronger_side=["chariot"], weaker_side=[], name="KCvK"),
        TablebaseConfig(stronger_side=["knight"], weaker_side=[], name="KNvK"),
    ]
    
    for config in configs:
        tablebase = generate_tablebase(config)
        set_tablebase(tablebase)


def generate_tablebase_on_demand(name: str) -> Optional[PieceTablebase]:
    """Generate a single tablebase on demand."""
    import re
    
    # Parse the configuration from the name
    # Format: K[pieces]vK[pieces]
    match = re.match(r"^K([QLCNP]*)vK([QLCNP]*)$", name)
    if not match:
        return None
    
    piece_map = {
        "Q": "queen",
        "L": "lance",
        "C": "chariot",
        "N": "knight",
        "P": "pawn",
    }
    
    stronger_side: list[PieceType] = []
    weaker_side: list[PieceType] = []
    
    for char in match.group(1):
        piece_type = piece_map.get(char)
        if piece_type:
            stronger_side.append(piece_type)
    
    for char in match.group(2):
        piece_type = piece_map.get(char)
        if piece_type:
            weaker_side.append(piece_type)
    
    config = TablebaseConfig(stronger_side=stronger_side, weaker_side=weaker_side, name=name)
    tablebase = generate_tablebase(config)
    set_tablebase(tablebase)
    
    return tablebase


# ============================================================================
# Serialization
# ============================================================================

def serialize_tablebase(tablebase: PieceTablebase) -> dict:
    """Serialize a tablebase to JSON-compatible format."""
    entries = []
    
    for key, entry in tablebase.entries.items():
        entry_dict = {
            "key": key,
            "wdl": entry.wdl,
            "dtm": entry.dtm,
        }
        if entry.best_move:
            entry_dict["bestMove"] = {
                "from": {"q": entry.best_move["from"].q, "r": entry.best_move["from"].r},
                "to": {"q": entry.best_move["to"].q, "r": entry.best_move["to"].r},
            }
            if entry.best_move.get("promotion"):
                entry_dict["bestMove"]["promotion"] = entry.best_move["promotion"]
        entries.append(entry_dict)
    
    return {
        "name": tablebase.name,
        "description": tablebase.description,
        "entries": entries,
        "metadata": {
            "generatedAt": tablebase.metadata.generated_at,
            "generationTimeMs": tablebase.metadata.generation_time_ms,
            "winCount": tablebase.metadata.win_count,
            "drawCount": tablebase.metadata.draw_count,
            "lossCount": tablebase.metadata.loss_count,
        },
    }


def deserialize_tablebase(data: dict) -> PieceTablebase:
    """Deserialize a tablebase from JSON format."""
    entries: dict[str, TablebaseEntry] = {}
    
    for entry_data in data["entries"]:
        best_move = None
        if "bestMove" in entry_data:
            bm = entry_data["bestMove"]
            best_move = {
                "from": HexCoord(q=bm["from"]["q"], r=bm["from"]["r"]),
                "to": HexCoord(q=bm["to"]["q"], r=bm["to"]["r"]),
                "promotion": bm.get("promotion"),
            }
        
        entries[entry_data["key"]] = TablebaseEntry(
            wdl=entry_data["wdl"],
            dtm=entry_data["dtm"],
            best_move=best_move,
        )
    
    metadata = TablebaseMetadata(
        generated_at=data["metadata"]["generatedAt"],
        generation_time_ms=data["metadata"]["generationTimeMs"],
        win_count=data["metadata"]["winCount"],
        draw_count=data["metadata"]["drawCount"],
        loss_count=data["metadata"]["lossCount"],
    )
    
    return PieceTablebase(
        name=data["name"],
        description=data["description"],
        entries=entries,
        size=len(entries),
        metadata=metadata,
    )


def export_tablebase_to_json(tablebase: PieceTablebase) -> str:
    """Export a tablebase to JSON string."""
    return json.dumps(serialize_tablebase(tablebase), indent=2)


def import_tablebase_from_json(json_str: str) -> PieceTablebase:
    """Import a tablebase from JSON string."""
    data = json.loads(json_str)
    return deserialize_tablebase(data)


# ============================================================================
# Statistics
# ============================================================================

def get_tablebase_statistics() -> dict:
    """Get statistics about loaded tablebases."""
    total_entries = 0
    stats = []
    
    for name, tb in _tablebases.items():
        total_entries += tb.size
        stats.append({
            "name": name,
            "size": tb.size,
            "wins": tb.metadata.win_count,
            "draws": tb.metadata.draw_count,
            "losses": tb.metadata.loss_count,
            "generationTimeMs": tb.metadata.generation_time_ms,
        })
    
    return {"totalEntries": total_entries, "tablebases": stats}


def format_tablebase_statistics() -> str:
    """Format tablebase statistics for display."""
    stats = get_tablebase_statistics()
    
    output = "=== Endgame Tablebase Statistics ===\n\n"
    output += f"Total entries: {stats['totalEntries']:,}\n"
    output += f"Loaded tablebases: {len(stats['tablebases'])}\n\n"
    
    for tb in stats["tablebases"]:
        output += f"{tb['name']}:\n"
        output += f"  Size: {tb['size']:,} positions\n"
        if tb['size'] > 0:
            output += f"  Wins: {tb['wins']:,} ({100 * tb['wins'] / tb['size']:.1f}%)\n"
            output += f"  Draws: {tb['draws']:,} ({100 * tb['draws'] / tb['size']:.1f}%)\n"
            output += f"  Losses: {tb['losses']:,} ({100 * tb['losses'] / tb['size']:.1f}%)\n"
        output += f"  Generation time: {tb['generationTimeMs']}ms\n\n"
    
    return output
