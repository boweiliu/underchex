"""
Underchex Move Generation and Validation

Signed-by: agent #17 claude-sonnet-4 via opencode 20260122T05:47:09
Edited-by: agent #19 claude-sonnet-4 via amp 20260122T06:10:50 (fix: Python 3.9 compatibility)
"""
from __future__ import annotations

from .types import (
    HexCoord,
    Direction,
    ALL_DIRECTIONS,
    DIAGONAL_DIRECTIONS,
    LANCE_A_DIRECTIONS,
    LANCE_B_DIRECTIONS,
    PieceType,
    Piece,
    Color,
    BoardState,
    Move,
    MoveValidation,
    coord_to_string,
    coords_equal,
    opposite_color,
    is_promotion_zone,
    PROMOTION_TARGETS,
)

from .board import (
    is_valid_cell,
    get_neighbor,
    get_ray,
    get_knight_targets,
)

# ============================================================================
# Piece Movement Patterns
# ============================================================================

def get_forward_direction(color: Color) -> Direction:
    """Get the forward direction for a color."""
    return "N" if color == "white" else "S"


def get_pawn_capture_directions(color: Color) -> tuple[Direction, ...]:
    """Get pawn capture directions for a color."""
    return ("N", "NE", "NW") if color == "white" else ("S", "SE", "SW")


def get_piece_directions(piece: Piece) -> tuple[Direction, ...]:
    """Get directions a piece can move in."""
    if piece.type in ("king", "queen"):
        return ALL_DIRECTIONS
    elif piece.type == "chariot":
        return DIAGONAL_DIRECTIONS
    elif piece.type == "lance":
        return LANCE_A_DIRECTIONS if piece.variant == "A" else LANCE_B_DIRECTIONS
    else:
        return ()


def is_slider(piece_type: PieceType) -> bool:
    """Check if a piece is a slider (can move multiple squares)."""
    return piece_type in ("queen", "lance", "chariot")


# ============================================================================
# Move Generation
# ============================================================================

def get_piece_at(board: BoardState, coord: HexCoord) -> Piece | None:
    """Get piece at a position, or None if empty."""
    return board.get(coord_to_string(coord))


def is_occupied(board: BoardState, coord: HexCoord) -> bool:
    """Check if a cell is occupied."""
    return coord_to_string(coord) in board


def has_enemy(board: BoardState, coord: HexCoord, color: Color) -> bool:
    """Check if a cell has an enemy piece."""
    piece = get_piece_at(board, coord)
    return piece is not None and piece.color != color


def has_friendly(board: BoardState, coord: HexCoord, color: Color) -> bool:
    """Check if a cell has a friendly piece."""
    piece = get_piece_at(board, coord)
    return piece is not None and piece.color == color


def generate_pseudo_legal_moves(
    board: BoardState,
    piece: Piece,
    from_coord: HexCoord
) -> list[Move]:
    """Generate pseudo-legal moves for a piece (doesn't check for leaving king in check)."""
    moves: list[Move] = []
    
    if piece.type == "pawn":
        _generate_pawn_moves(board, piece, from_coord, moves)
    elif piece.type == "king":
        _generate_king_moves(board, piece, from_coord, moves)
    elif piece.type == "knight":
        _generate_knight_moves(board, piece, from_coord, moves)
    elif piece.type in ("queen", "lance", "chariot"):
        _generate_slider_moves(board, piece, from_coord, moves)
    
    return moves


def _generate_pawn_moves(
    board: BoardState,
    piece: Piece,
    from_coord: HexCoord,
    moves: list[Move]
) -> None:
    """Generate pawn moves."""
    forward_dir = get_forward_direction(piece.color)
    capture_directions = get_pawn_capture_directions(piece.color)
    
    # Forward move (non-capture)
    forward = get_neighbor(from_coord, forward_dir)
    if forward is not None and not is_occupied(board, forward):
        if is_promotion_zone(forward, piece.color):
            # Generate promotion moves
            for promotion_type in PROMOTION_TARGETS:
                moves.append(_create_move(piece, from_coord, forward, None, promotion_type))
        else:
            moves.append(_create_move(piece, from_coord, forward))
    
    # Captures (including forward capture)
    for direction in capture_directions:
        target = get_neighbor(from_coord, direction)
        if target is not None and has_enemy(board, target, piece.color):
            captured = get_piece_at(board, target)
            if is_promotion_zone(target, piece.color):
                # Generate promotion captures
                for promotion_type in PROMOTION_TARGETS:
                    moves.append(_create_move(piece, from_coord, target, captured, promotion_type))
            else:
                moves.append(_create_move(piece, from_coord, target, captured))


def _generate_king_moves(
    board: BoardState,
    piece: Piece,
    from_coord: HexCoord,
    moves: list[Move]
) -> None:
    """Generate king moves."""
    for direction in ALL_DIRECTIONS:
        target = get_neighbor(from_coord, direction)
        if target is not None and not has_friendly(board, target, piece.color):
            captured = get_piece_at(board, target)
            moves.append(_create_move(piece, from_coord, target, captured))


def _generate_knight_moves(
    board: BoardState,
    piece: Piece,
    from_coord: HexCoord,
    moves: list[Move]
) -> None:
    """Generate knight moves."""
    for target in get_knight_targets(from_coord):
        if not has_friendly(board, target, piece.color):
            captured = get_piece_at(board, target)
            moves.append(_create_move(piece, from_coord, target, captured))


def _generate_slider_moves(
    board: BoardState,
    piece: Piece,
    from_coord: HexCoord,
    moves: list[Move]
) -> None:
    """Generate slider (queen, lance, chariot) moves."""
    directions = get_piece_directions(piece)
    
    for direction in directions:
        ray = get_ray(from_coord, direction)
        for target in ray:
            if has_friendly(board, target, piece.color):
                break  # Blocked by friendly piece
            captured = get_piece_at(board, target)
            moves.append(_create_move(piece, from_coord, target, captured))
            if captured is not None:
                break  # Can't move past a captured piece


def _create_move(
    piece: Piece,
    from_coord: HexCoord,
    to_coord: HexCoord,
    captured: Piece | None = None,
    promotion: PieceType | None = None
) -> Move:
    """Create a Move object."""
    return Move(
        from_coord=from_coord,
        to_coord=to_coord,
        piece=piece,
        captured=captured,
        promotion=promotion,
    )


# ============================================================================
# Check Detection
# ============================================================================

def find_king(board: BoardState, color: Color) -> HexCoord | None:
    """Find the king of a given color."""
    for pos_str, piece in board.items():
        if piece.type == "king" and piece.color == color:
            parts = pos_str.split(",")
            q = int(parts[0]) if len(parts) > 0 else 0
            r = int(parts[1]) if len(parts) > 1 else 0
            return HexCoord(q=q, r=r)
    return None


def is_attacked(
    board: BoardState,
    target: HexCoord,
    by_color: Color
) -> bool:
    """Check if a square is attacked by any piece of the given color."""
    # Check for pawn attacks
    pawn_capture_directions = get_pawn_capture_directions(by_color)
    for direction in pawn_capture_directions:
        reverse_dir = _get_opposite_direction(direction)
        attacker = get_neighbor(target, reverse_dir)
        if attacker is not None:
            piece = get_piece_at(board, attacker)
            if piece is not None and piece.type == "pawn" and piece.color == by_color:
                return True
    
    # Check for king attacks
    for direction in ALL_DIRECTIONS:
        attacker = get_neighbor(target, direction)
        if attacker is not None:
            piece = get_piece_at(board, attacker)
            if piece is not None and piece.type == "king" and piece.color == by_color:
                return True
    
    # Check for knight attacks
    for attacker_pos in get_knight_targets(target):
        piece = get_piece_at(board, attacker_pos)
        if piece is not None and piece.type == "knight" and piece.color == by_color:
            return True
    
    # Check for slider attacks (queen, lance, chariot)
    for direction in ALL_DIRECTIONS:
        ray = get_ray(target, direction)
        for pos in ray:
            piece = get_piece_at(board, pos)
            if piece is None:
                continue
            if piece.color != by_color:
                break
            
            # Check if this piece can attack along this direction
            piece_directions = get_piece_directions(piece)
            reverse_dir = _get_opposite_direction(direction)
            if reverse_dir in piece_directions and is_slider(piece.type):
                return True
            break  # Blocked by this piece either way
    
    return False


def _get_opposite_direction(direction: Direction) -> Direction:
    """Get the opposite direction."""
    opposites: dict[Direction, Direction] = {
        "N": "S", "S": "N",
        "NE": "SW", "SW": "NE",
        "NW": "SE", "SE": "NW",
    }
    return opposites[direction]


def is_in_check(board: BoardState, color: Color) -> bool:
    """Check if the king of a given color is in check."""
    king_pos = find_king(board, color)
    if king_pos is None:
        return False  # No king - shouldn't happen in valid game
    return is_attacked(board, king_pos, opposite_color(color))


# ============================================================================
# Legal Move Generation
# ============================================================================

def apply_move(board: BoardState, move: Move) -> BoardState:
    """
    Apply a move to a board state (returns new board state).
    Handles pawn promotion by replacing the piece.
    """
    new_board = dict(board)
    del new_board[coord_to_string(move.from_coord)]
    
    # Handle promotion
    if move.promotion is not None:
        promoted_piece = Piece(
            type=move.promotion,
            color=move.piece.color,
            variant="A" if move.promotion == "lance" else None,
        )
        new_board[coord_to_string(move.to_coord)] = promoted_piece
    else:
        new_board[coord_to_string(move.to_coord)] = move.piece
    
    return new_board


def generate_legal_moves(
    board: BoardState,
    piece: Piece,
    from_coord: HexCoord
) -> list[Move]:
    """Generate all legal moves for a piece."""
    pseudo_legal = generate_pseudo_legal_moves(board, piece, from_coord)
    
    return [
        move for move in pseudo_legal
        if not is_in_check(apply_move(board, move), piece.color)
    ]


def generate_all_legal_moves(board: BoardState, color: Color) -> list[Move]:
    """Generate all legal moves for a player."""
    moves: list[Move] = []
    
    for pos_str, piece in board.items():
        if piece.color != color:
            continue
        parts = pos_str.split(",")
        q = int(parts[0]) if len(parts) > 0 else 0
        r = int(parts[1]) if len(parts) > 1 else 0
        from_coord = HexCoord(q=q, r=r)
        moves.extend(generate_legal_moves(board, piece, from_coord))
    
    return moves


# ============================================================================
# Move Validation
# ============================================================================

def validate_move(
    board: BoardState,
    from_coord: HexCoord,
    to_coord: HexCoord,
    turn: Color
) -> MoveValidation:
    """Validate a specific move."""
    piece = get_piece_at(board, from_coord)
    
    if piece is None:
        return MoveValidation(legal=False, reason="noPieceAtSource")
    
    if piece.color != turn:
        return MoveValidation(legal=False, reason="notYourPiece")
    
    if not is_valid_cell(to_coord):
        return MoveValidation(legal=False, reason="invalidDestination")
    
    legal_moves = generate_legal_moves(board, piece, from_coord)
    matching_move = next(
        (m for m in legal_moves if coords_equal(m.to_coord, to_coord)),
        None
    )
    
    if matching_move is None:
        # Check if it would leave king in check
        pseudo_legal = generate_pseudo_legal_moves(board, piece, from_coord)
        pseudo_match = next(
            (m for m in pseudo_legal if coords_equal(m.to_coord, to_coord)),
            None
        )
        
        if pseudo_match is not None:
            return MoveValidation(legal=False, reason="movesIntoCheck")
        
        return MoveValidation(legal=False, reason="illegalMove")
    
    return MoveValidation(
        legal=True,
        capture=matching_move.captured is not None
    )
