"""
Underchex Core Types

Python implementation of hex coordinate system, pieces, and game state.

Signed-by: agent #17 claude-sonnet-4 via opencode 20260122T05:47:09
Edited-by: agent #19 claude-sonnet-4 via amp 20260122T06:10:50 (fix: Python 3.9 compatibility)
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Optional, Union
from enum import Enum

# ============================================================================
# Coordinate System
# ============================================================================

@dataclass(frozen=True)
class HexCoord:
    """
    Axial coordinates for hex grid.
    The third coordinate s = -q - r is implicit.
    """
    q: int
    r: int
    
    def __str__(self) -> str:
        return f"{self.q},{self.r}"


@dataclass(frozen=True)
class CubeCoord:
    """
    Cube coordinates for hex grid (useful for algorithms).
    Invariant: x + y + z = 0
    """
    x: int
    y: int
    z: int


# Direction type as string literal
Direction = Literal["N", "S", "NE", "SW", "NW", "SE"]

# Direction vectors in axial coordinates
DIRECTIONS: dict[Direction, HexCoord] = {
    "N":  HexCoord(q=0,  r=-1),
    "S":  HexCoord(q=0,  r=1),
    "NE": HexCoord(q=1,  r=-1),
    "SW": HexCoord(q=-1, r=1),
    "NW": HexCoord(q=-1, r=0),
    "SE": HexCoord(q=1,  r=0),
}

ALL_DIRECTIONS: tuple[Direction, ...] = ("N", "S", "NE", "SW", "NW", "SE")
DIAGONAL_DIRECTIONS: tuple[Direction, ...] = ("NE", "NW", "SE", "SW")
LANCE_A_DIRECTIONS: tuple[Direction, ...] = ("N", "S", "NW", "SE")
LANCE_B_DIRECTIONS: tuple[Direction, ...] = ("N", "S", "NE", "SW")

# ============================================================================
# Pieces
# ============================================================================

PieceType = Literal["pawn", "king", "queen", "knight", "lance", "chariot"]
Color = Literal["white", "black"]
LanceVariant = Literal["A", "B"]


@dataclass(frozen=True)
class Piece:
    """A chess piece with type, color, and optional variant."""
    type: PieceType
    color: Color
    variant: Optional[LanceVariant] = None  # Only for lances


# ============================================================================
# Board State
# ============================================================================

BOARD_RADIUS: int = 4
TOTAL_CELLS: int = 61  # For radius 4 hex board

# Board state as a dict from position string to piece
BoardState = dict[str, Piece]

# ============================================================================
# Moves
# ============================================================================

@dataclass(frozen=True)
class Move:
    """A move from one position to another."""
    from_coord: HexCoord
    to_coord: HexCoord
    piece: Piece
    captured: Optional[Piece] = None
    promotion: Optional[PieceType] = None  # For pawn promotion


# Valid promotion targets for pawns
PROMOTION_TARGETS: tuple[PieceType, ...] = ("queen", "chariot", "lance", "knight")


@dataclass(frozen=True)
class MoveValidation:
    """Result of move validation."""
    legal: bool
    reason: Optional[str] = None
    capture: bool = False


# ============================================================================
# Game State
# ============================================================================

@dataclass(frozen=True)
class GameStatusOngoing:
    type: Literal["ongoing"] = "ongoing"


@dataclass(frozen=True)
class GameStatusCheckmate:
    type: Literal["checkmate"] = "checkmate"
    winner: Color = "white"


@dataclass(frozen=True)
class GameStatusStalemate:
    type: Literal["stalemate"] = "stalemate"


@dataclass(frozen=True)
class GameStatusDraw:
    type: Literal["draw"] = "draw"
    reason: str = ""


@dataclass(frozen=True)
class GameStatusResigned:
    type: Literal["resigned"] = "resigned"
    winner: Color = "white"


GameStatus = Union[GameStatusOngoing, GameStatusCheckmate, GameStatusStalemate, GameStatusDraw, GameStatusResigned]


@dataclass
class GameState:
    """Full game state."""
    board: BoardState
    turn: Color
    move_number: int
    half_move_clock: int  # For 50-move rule
    history: list[Move]
    status: GameStatus


# ============================================================================
# Utility Functions
# ============================================================================

def coord_to_string(coord: HexCoord) -> str:
    """Convert hex coordinate to string key."""
    return f"{coord.q},{coord.r}"


def string_to_coord(s: str) -> HexCoord:
    """Parse string key to hex coordinate."""
    parts = s.split(",")
    q = int(parts[0]) if len(parts) > 0 else 0
    r = int(parts[1]) if len(parts) > 1 else 0
    return HexCoord(q=q, r=r)


def coords_equal(a: HexCoord, b: HexCoord) -> bool:
    """Check if two coordinates are equal."""
    return a.q == b.q and a.r == b.r


def axial_to_cube(coord: HexCoord) -> CubeCoord:
    """Convert axial to cube coordinates."""
    return CubeCoord(
        x=coord.q,
        y=-coord.q - coord.r,
        z=coord.r,
    )


def cube_to_axial(coord: CubeCoord) -> HexCoord:
    """Convert cube to axial coordinates."""
    return HexCoord(q=coord.x, r=coord.z)


def opposite_color(color: Color) -> Color:
    """Get opposite color."""
    return "black" if color == "white" else "white"


def is_promotion_zone(coord: HexCoord, color: Color) -> bool:
    """
    Check if coordinate is in promotion zone.
    White promotes at r=-4, Black promotes at r=4
    """
    target_r = -BOARD_RADIUS if color == "white" else BOARD_RADIUS
    return coord.r == target_r
