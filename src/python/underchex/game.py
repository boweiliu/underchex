"""
Underchex Game State Management

Signed-by: agent #17 claude-sonnet-4 via opencode 20260122T05:47:09
"""

from dataclasses import dataclass
from .types import (
    HexCoord,
    Piece,
    Color,
    BoardState,
    GameState,
    GameStatus,
    GameStatusOngoing,
    GameStatusCheckmate,
    GameStatusStalemate,
    GameStatusResigned,
    Move,
    coord_to_string,
    opposite_color,
)

from .moves import (
    apply_move,
    generate_all_legal_moves,
    is_in_check,
    validate_move,
    get_piece_at,
)


# ============================================================================
# Initial Setup
# ============================================================================

@dataclass
class PiecePlacement:
    """A piece with its position."""
    piece: Piece
    position: HexCoord


def get_starting_position() -> list[PiecePlacement]:
    """Standard starting position for Underchex."""
    pieces: list[PiecePlacement] = []
    
    # White pieces
    pieces.append(PiecePlacement(Piece("king", "white"), HexCoord(0, 4)))
    pieces.append(PiecePlacement(Piece("queen", "white"), HexCoord(1, 3)))
    pieces.append(PiecePlacement(Piece("chariot", "white"), HexCoord(-2, 4)))
    pieces.append(PiecePlacement(Piece("chariot", "white"), HexCoord(2, 3)))
    pieces.append(PiecePlacement(Piece("lance", "white", "A"), HexCoord(-1, 4)))
    pieces.append(PiecePlacement(Piece("lance", "white", "B"), HexCoord(1, 4)))
    pieces.append(PiecePlacement(Piece("knight", "white"), HexCoord(-2, 3)))
    pieces.append(PiecePlacement(Piece("knight", "white"), HexCoord(2, 4)))
    
    # White pawns
    white_pawn_positions = [
        HexCoord(-3, 3),
        HexCoord(-2, 2),
        HexCoord(-1, 2),
        HexCoord(0, 2),
        HexCoord(1, 2),
        HexCoord(2, 2),
    ]
    for pos in white_pawn_positions:
        pieces.append(PiecePlacement(Piece("pawn", "white"), pos))
    
    # Black pieces (point reflection of white)
    pieces.append(PiecePlacement(Piece("king", "black"), HexCoord(0, -4)))
    pieces.append(PiecePlacement(Piece("queen", "black"), HexCoord(-1, -3)))
    pieces.append(PiecePlacement(Piece("chariot", "black"), HexCoord(2, -4)))
    pieces.append(PiecePlacement(Piece("chariot", "black"), HexCoord(-2, -3)))
    pieces.append(PiecePlacement(Piece("lance", "black", "A"), HexCoord(1, -4)))
    pieces.append(PiecePlacement(Piece("lance", "black", "B"), HexCoord(-1, -4)))
    pieces.append(PiecePlacement(Piece("knight", "black"), HexCoord(2, -3)))
    pieces.append(PiecePlacement(Piece("knight", "black"), HexCoord(-2, -4)))
    
    # Black pawns
    black_pawn_positions = [
        HexCoord(3, -3),
        HexCoord(2, -2),
        HexCoord(1, -2),
        HexCoord(0, -2),
        HexCoord(-1, -2),
        HexCoord(-2, -2),
    ]
    for pos in black_pawn_positions:
        pieces.append(PiecePlacement(Piece("pawn", "black"), pos))
    
    return pieces


def create_board_from_placements(placements: list[PiecePlacement]) -> BoardState:
    """Create initial board state from piece placements."""
    board: BoardState = {}
    for placement in placements:
        board[coord_to_string(placement.position)] = placement.piece
    return board


def create_new_game() -> GameState:
    """Create a new game with standard starting position."""
    placements = get_starting_position()
    board = create_board_from_placements(placements)
    
    return GameState(
        board=board,
        turn="white",
        move_number=1,
        half_move_clock=0,
        history=[],
        status=GameStatusOngoing(),
    )


# ============================================================================
# Game State Updates
# ============================================================================

def _determine_status(board: BoardState, next_turn: Color) -> GameStatus:
    """Determine game status after a move."""
    legal_moves = generate_all_legal_moves(board, next_turn)
    
    if len(legal_moves) == 0:
        if is_in_check(board, next_turn):
            return GameStatusCheckmate(winner=opposite_color(next_turn))
        else:
            return GameStatusStalemate()
    
    return GameStatusOngoing()


def make_move(
    state: GameState,
    from_coord: HexCoord,
    to_coord: HexCoord,
    promotion: str | None = None,
) -> GameState | None:
    """
    Make a move and return the new game state.
    Returns None if the move is invalid.
    """
    if state.status.type != "ongoing":
        return None  # Game is over
    
    validation = validate_move(state.board, from_coord, to_coord, state.turn)
    if not validation.legal:
        return None
    
    piece = state.board[coord_to_string(from_coord)]
    captured = get_piece_at(state.board, to_coord)
    
    move = Move(
        from_coord=from_coord,
        to_coord=to_coord,
        piece=piece,
        captured=captured,
        promotion=promotion,
    )
    
    new_board = apply_move(state.board, move)
    next_turn = opposite_color(state.turn)
    status = _determine_status(new_board, next_turn)
    
    # Update half-move clock (reset on pawn move or capture)
    half_move_clock = 0 if (piece.type == "pawn" or captured) else state.half_move_clock + 1
    
    # Increment move number when black moves
    move_number = state.move_number + 1 if state.turn == "black" else state.move_number
    
    return GameState(
        board=new_board,
        turn=next_turn,
        move_number=move_number,
        half_move_clock=half_move_clock,
        history=[*state.history, move],
        status=status,
    )


def resign(state: GameState, color: Color) -> GameState:
    """Resign the game."""
    return GameState(
        board=state.board,
        turn=state.turn,
        move_number=state.move_number,
        half_move_clock=state.half_move_clock,
        history=state.history,
        status=GameStatusResigned(winner=opposite_color(color)),
    )


# ============================================================================
# Game Queries
# ============================================================================

def is_player_turn(state: GameState, color: Color) -> bool:
    """Check if it's a specific player's turn."""
    return state.status.type == "ongoing" and state.turn == color


def get_legal_moves(state: GameState) -> list[Move]:
    """Get all legal moves for the current player."""
    if state.status.type != "ongoing":
        return []
    return generate_all_legal_moves(state.board, state.turn)


def is_current_player_in_check(state: GameState) -> bool:
    """Check if the current player is in check."""
    return is_in_check(state.board, state.turn)
