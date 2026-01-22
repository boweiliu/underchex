"""
Tests for board operations.

Signed-by: agent #17 claude-sonnet-4 via opencode 20260122T05:47:09
"""

import pytest
from underchex.types import HexCoord, BOARD_RADIUS
from underchex.board import (
    is_valid_cell,
    get_all_cells,
    add_direction,
    get_neighbor,
    get_neighbors,
    hex_distance,
    get_direction,
    get_ray,
    get_cells_between,
    get_knight_targets,
    KNIGHT_OFFSETS,
)


class TestIsValidCell:
    def test_center_is_valid(self):
        assert is_valid_cell(HexCoord(0, 0)) is True
    
    def test_edge_cells_are_valid(self):
        # r = -4, q = 0 (top edge)
        assert is_valid_cell(HexCoord(0, -BOARD_RADIUS)) is True
        # r = 4, q = 0 (bottom edge)
        assert is_valid_cell(HexCoord(0, BOARD_RADIUS)) is True
        # q = 4, r = 0
        assert is_valid_cell(HexCoord(BOARD_RADIUS, 0)) is True
    
    def test_corner_cells_are_valid(self):
        # The six corners of the hexagon
        assert is_valid_cell(HexCoord(4, -4)) is True
        assert is_valid_cell(HexCoord(-4, 4)) is True
        assert is_valid_cell(HexCoord(4, 0)) is True
        assert is_valid_cell(HexCoord(-4, 0)) is True
        assert is_valid_cell(HexCoord(0, 4)) is True
        assert is_valid_cell(HexCoord(0, -4)) is True
    
    def test_outside_cells_are_invalid(self):
        # s = -q - r, and max(|q|, |r|, |s|) must be <= 4
        # q=5, r=0: s=-5, max is 5 > 4
        assert is_valid_cell(HexCoord(5, 0)) is False
        # q=0, r=5: s=-5, max is 5 > 4
        assert is_valid_cell(HexCoord(0, 5)) is False
        # q=3, r=-4: s=1, max(3,4,1)=4, valid
        assert is_valid_cell(HexCoord(3, -4)) is True
        # q=4, r=-5: s=1, max(4,5,1)=5 > 4
        assert is_valid_cell(HexCoord(4, -5)) is False


class TestGetAllCells:
    def test_correct_count(self):
        # For radius 4, hexagonal board has 1 + 6 + 12 + 18 + 24 = 61 cells
        cells = get_all_cells()
        assert len(cells) == 61
    
    def test_all_cells_are_valid(self):
        cells = get_all_cells()
        for cell in cells:
            assert is_valid_cell(cell)
    
    def test_includes_center(self):
        cells = get_all_cells()
        assert any(c.q == 0 and c.r == 0 for c in cells)


class TestAddDirection:
    def test_north(self):
        result = add_direction(HexCoord(0, 0), "N")
        assert result.q == 0 and result.r == -1
    
    def test_south(self):
        result = add_direction(HexCoord(0, 0), "S")
        assert result.q == 0 and result.r == 1
    
    def test_northeast(self):
        result = add_direction(HexCoord(0, 0), "NE")
        assert result.q == 1 and result.r == -1
    
    def test_southwest(self):
        result = add_direction(HexCoord(0, 0), "SW")
        assert result.q == -1 and result.r == 1


class TestGetNeighbor:
    def test_neighbor_on_board(self):
        neighbor = get_neighbor(HexCoord(0, 0), "N")
        assert neighbor is not None
        assert neighbor.q == 0 and neighbor.r == -1
    
    def test_neighbor_off_board(self):
        # From edge of board, going outward
        neighbor = get_neighbor(HexCoord(0, -4), "N")
        assert neighbor is None


class TestGetNeighbors:
    def test_center_has_six_neighbors(self):
        neighbors = get_neighbors(HexCoord(0, 0))
        assert len(neighbors) == 6
    
    def test_corner_has_three_neighbors(self):
        # q=4, r=0 is an edge cell
        neighbors = get_neighbors(HexCoord(4, 0))
        assert len(neighbors) == 3


class TestHexDistance:
    def test_distance_to_self(self):
        assert hex_distance(HexCoord(0, 0), HexCoord(0, 0)) == 0
    
    def test_distance_to_neighbor(self):
        assert hex_distance(HexCoord(0, 0), HexCoord(0, -1)) == 1
        assert hex_distance(HexCoord(0, 0), HexCoord(1, 0)) == 1
    
    def test_distance_to_far(self):
        assert hex_distance(HexCoord(0, 0), HexCoord(0, -4)) == 4
        assert hex_distance(HexCoord(0, 0), HexCoord(4, 0)) == 4


class TestGetDirection:
    def test_north_direction(self):
        assert get_direction(HexCoord(0, 0), HexCoord(0, -3)) == "N"
    
    def test_south_direction(self):
        assert get_direction(HexCoord(0, 0), HexCoord(0, 3)) == "S"
    
    def test_northeast_direction(self):
        assert get_direction(HexCoord(0, 0), HexCoord(2, -2)) == "NE"
    
    def test_non_aligned(self):
        # Not on any of the 6 directions
        assert get_direction(HexCoord(0, 0), HexCoord(1, 1)) is None
    
    def test_same_position(self):
        assert get_direction(HexCoord(0, 0), HexCoord(0, 0)) is None


class TestGetRay:
    def test_ray_north_from_center(self):
        ray = get_ray(HexCoord(0, 0), "N")
        # Should get cells at r=-1, -2, -3, -4
        assert len(ray) == 4
        assert all(c.q == 0 for c in ray)
        assert ray[0].r == -1
        assert ray[-1].r == -4


class TestGetCellsBetween:
    def test_cells_between_aligned(self):
        cells = get_cells_between(HexCoord(0, 0), HexCoord(0, -3))
        assert cells is not None
        assert len(cells) == 2  # (0, -1) and (0, -2)
    
    def test_cells_between_non_aligned(self):
        cells = get_cells_between(HexCoord(0, 0), HexCoord(1, 1))
        assert cells is None
    
    def test_cells_between_adjacent(self):
        cells = get_cells_between(HexCoord(0, 0), HexCoord(0, -1))
        assert cells is not None
        assert len(cells) == 0


class TestGetKnightTargets:
    def test_knight_from_center(self):
        targets = get_knight_targets(HexCoord(0, 0))
        assert len(targets) == 6  # All 6 knight offsets should be valid from center
    
    def test_knight_offsets_count(self):
        assert len(KNIGHT_OFFSETS) == 6
    
    def test_knight_from_edge(self):
        # From edge, some targets will be off-board
        targets = get_knight_targets(HexCoord(4, 0))
        assert len(targets) < 6
