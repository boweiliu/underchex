"""
Underchex - A hexagonal chess variant game engine

Python implementation matching the TypeScript reference.

Signed-by: agent #17 claude-sonnet-4 via opencode 20260122T05:47:09
"""

from .types import (
    HexCoord,
    Direction,
    DIRECTIONS,
    ALL_DIRECTIONS,
    DIAGONAL_DIRECTIONS,
    LANCE_A_DIRECTIONS,
    LANCE_B_DIRECTIONS,
    PieceType,
    Color,
    LanceVariant,
    Piece,
    Move,
    GameStatus,
    GameState,
    BOARD_RADIUS,
    PROMOTION_TARGETS,
    coord_to_string,
    string_to_coord,
    coords_equal,
    opposite_color,
    is_promotion_zone,
)

from .board import (
    is_valid_cell,
    get_all_cells,
    add_direction,
    get_neighbor,
    get_neighbors,
    hex_distance,
    get_direction,
    get_ray,
    get_cells_between,
    KNIGHT_OFFSETS,
    get_knight_targets,
)

from .moves import (
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

from .game import (
    get_starting_position,
    create_board_from_placements,
    create_new_game,
    make_move,
    resign,
    is_player_turn,
    get_legal_moves,
    is_current_player_in_check,
)

__version__ = "0.1.0"
__all__ = [
    # Types
    "HexCoord",
    "Direction",
    "DIRECTIONS",
    "ALL_DIRECTIONS",
    "DIAGONAL_DIRECTIONS",
    "LANCE_A_DIRECTIONS",
    "LANCE_B_DIRECTIONS",
    "PieceType",
    "Color",
    "LanceVariant",
    "Piece",
    "Move",
    "GameStatus",
    "GameState",
    "BOARD_RADIUS",
    "PROMOTION_TARGETS",
    "coord_to_string",
    "string_to_coord",
    "coords_equal",
    "opposite_color",
    "is_promotion_zone",
    # Board
    "is_valid_cell",
    "get_all_cells",
    "add_direction",
    "get_neighbor",
    "get_neighbors",
    "hex_distance",
    "get_direction",
    "get_ray",
    "get_cells_between",
    "KNIGHT_OFFSETS",
    "get_knight_targets",
    # Moves
    "get_forward_direction",
    "get_pawn_capture_directions",
    "get_piece_directions",
    "is_slider",
    "get_piece_at",
    "is_occupied",
    "has_enemy",
    "has_friendly",
    "generate_pseudo_legal_moves",
    "find_king",
    "is_attacked",
    "is_in_check",
    "apply_move",
    "generate_legal_moves",
    "generate_all_legal_moves",
    "validate_move",
    # Game
    "get_starting_position",
    "create_board_from_placements",
    "create_new_game",
    "make_move",
    "resign",
    "is_player_turn",
    "get_legal_moves",
    "is_current_player_in_check",
]
