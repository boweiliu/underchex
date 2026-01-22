"""
Underchex Board Operations

Hex board validation, coordinate operations, and navigation.

Signed-by: agent #17 claude-sonnet-4 via opencode 20260122T05:47:09
Edited-by: agent #19 claude-sonnet-4 via amp 20260122T06:10:50 (fix: Python 3.9 compatibility)
"""
from __future__ import annotations

from .types import (
    HexCoord,
    Direction,
    DIRECTIONS,
    BOARD_RADIUS,
    coords_equal,
)

# ============================================================================
# Board Validation
# ============================================================================

def is_valid_cell(coord: HexCoord) -> bool:
    """
    Check if a coordinate is within the hexagonal board.
    A cell (q, r) is valid iff: max(|q|, |r|, |q+r|) <= BOARD_RADIUS
    """
    q, r = coord.q, coord.r
    s = -q - r
    return max(abs(q), abs(r), abs(s)) <= BOARD_RADIUS


def get_all_cells() -> list[HexCoord]:
    """Get all valid cells on the board."""
    cells: list[HexCoord] = []
    for q in range(-BOARD_RADIUS, BOARD_RADIUS + 1):
        for r in range(-BOARD_RADIUS, BOARD_RADIUS + 1):
            coord = HexCoord(q=q, r=r)
            if is_valid_cell(coord):
                cells.append(coord)
    return cells


# ============================================================================
# Coordinate Operations
# ============================================================================

def add_direction(coord: HexCoord, direction: Direction) -> HexCoord:
    """Add a direction vector to a coordinate."""
    delta = DIRECTIONS[direction]
    return HexCoord(q=coord.q + delta.q, r=coord.r + delta.r)


def get_neighbor(coord: HexCoord, direction: Direction) -> HexCoord | None:
    """Get the neighbor in a given direction, or None if off-board."""
    neighbor = add_direction(coord, direction)
    return neighbor if is_valid_cell(neighbor) else None


def get_neighbors(coord: HexCoord) -> list[HexCoord]:
    """Get all valid neighbors of a cell."""
    neighbors: list[HexCoord] = []
    for direction in DIRECTIONS:
        neighbor = get_neighbor(coord, direction)
        if neighbor is not None:
            neighbors.append(neighbor)
    return neighbors


def hex_distance(a: HexCoord, b: HexCoord) -> int:
    """Calculate hex distance between two coordinates."""
    dq = abs(a.q - b.q)
    dr = abs(a.r - b.r)
    ds = abs((-a.q - a.r) - (-b.q - b.r))
    return max(dq, dr, ds)


def get_direction(from_coord: HexCoord, to_coord: HexCoord) -> Direction | None:
    """
    Get the direction from one cell to another (if aligned), 
    or None if not aligned.
    """
    dq = to_coord.q - from_coord.q
    dr = to_coord.r - from_coord.r
    
    if dq == 0 and dr == 0:
        return None
    
    # Check if the delta matches a direction (scaled)
    for direction, delta in DIRECTIONS.items():
        if delta.q == 0 and delta.r == 0:
            continue
        
        if delta.q == 0:
            if dq == 0 and _sign(dr) == _sign(delta.r):
                return direction
        elif delta.r == 0:
            if dr == 0 and _sign(dq) == _sign(delta.q):
                return direction
        else:
            # Both non-zero, check ratio
            ratio_q = dq / delta.q
            ratio_r = dr / delta.r
            if ratio_q == ratio_r and ratio_q > 0 and ratio_q == int(ratio_q):
                return direction
    
    return None


def _sign(x: int | float) -> int:
    """Get the sign of a number."""
    if x > 0:
        return 1
    elif x < 0:
        return -1
    return 0


def get_ray(start: HexCoord, direction: Direction) -> list[HexCoord]:
    """Get all cells along a direction from a starting point (exclusive of start)."""
    cells: list[HexCoord] = []
    current = start
    
    while True:
        next_coord = add_direction(current, direction)
        if not is_valid_cell(next_coord):
            break
        cells.append(next_coord)
        current = next_coord
    
    return cells


def get_cells_between(from_coord: HexCoord, to_coord: HexCoord) -> list[HexCoord] | None:
    """
    Get all cells between two aligned points (exclusive of both endpoints).
    Returns None if points are not aligned.
    """
    direction = get_direction(from_coord, to_coord)
    if direction is None:
        return None
    
    cells: list[HexCoord] = []
    current = from_coord
    
    while True:
        current = add_direction(current, direction)
        if coords_equal(current, to_coord):
            break
        if not is_valid_cell(current):
            return None  # Shouldn't happen if to_coord is valid
        cells.append(current)
    
    return cells


# ============================================================================
# Knight Movement
# ============================================================================

# Knight leap targets from a given position.
# Knight moves 1 step in one direction, then 1 step in an adjacent (non-opposite) direction.
KNIGHT_OFFSETS: tuple[HexCoord, ...] = (
    HexCoord(q=1,  r=-2),  # N then NE, or NE then N
    HexCoord(q=-1, r=-1),  # N then NW, or NW then N
    HexCoord(q=2,  r=-1),  # NE then SE, or SE then NE
    HexCoord(q=1,  r=1),   # SE then S, or S then SE
    HexCoord(q=-1, r=2),   # S then SW, or SW then S
    HexCoord(q=-2, r=1),   # SW then NW, or NW then SW
)


def get_knight_targets(from_coord: HexCoord) -> list[HexCoord]:
    """Get all valid knight moves from a position."""
    targets: list[HexCoord] = []
    for offset in KNIGHT_OFFSETS:
        target = HexCoord(q=from_coord.q + offset.q, r=from_coord.r + offset.r)
        if is_valid_cell(target):
            targets.append(target)
    return targets
