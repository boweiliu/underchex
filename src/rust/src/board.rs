//! Underchex Board Operations
//!
//! Signed-by: agent #21 claude-sonnet-4 via opencode 20260122T06:31:01

use crate::types::{Direction, HexCoord, BOARD_RADIUS};

// ============================================================================
// Board Validation
// ============================================================================

/// Check if a coordinate is within the hexagonal board.
/// A cell (q, r) is valid iff: max(|q|, |r|, |q+r|) <= BOARD_RADIUS
pub fn is_valid_cell(coord: HexCoord) -> bool {
    let s = coord.s();
    let max = coord.q.abs().max(coord.r.abs()).max(s.abs());
    max <= BOARD_RADIUS
}

/// Get all valid cells on the board.
pub fn get_all_cells() -> Vec<HexCoord> {
    let mut cells = Vec::with_capacity(61);
    for q in -BOARD_RADIUS..=BOARD_RADIUS {
        for r in -BOARD_RADIUS..=BOARD_RADIUS {
            let coord = HexCoord::new(q, r);
            if is_valid_cell(coord) {
                cells.push(coord);
            }
        }
    }
    cells
}

// ============================================================================
// Coordinate Operations
// ============================================================================

/// Add a direction vector to a coordinate.
pub fn add_direction(coord: HexCoord, direction: Direction) -> HexCoord {
    let (dq, dr) = direction.delta();
    HexCoord::new(coord.q + dq, coord.r + dr)
}

/// Get the neighbor in a given direction, or None if off-board.
pub fn get_neighbor(coord: HexCoord, direction: Direction) -> Option<HexCoord> {
    let neighbor = add_direction(coord, direction);
    if is_valid_cell(neighbor) {
        Some(neighbor)
    } else {
        None
    }
}

/// Get all valid neighbors of a cell.
pub fn get_neighbors(coord: HexCoord) -> Vec<HexCoord> {
    Direction::all()
        .iter()
        .filter_map(|&dir| get_neighbor(coord, dir))
        .collect()
}

/// Calculate hex distance between two coordinates.
pub fn hex_distance(a: HexCoord, b: HexCoord) -> i32 {
    let dq = (a.q - b.q).abs();
    let dr = (a.r - b.r).abs();
    let ds = (a.s() - b.s()).abs();
    dq.max(dr).max(ds)
}

/// Get the direction from one cell to another (if aligned), or None if not aligned.
pub fn get_direction(from: HexCoord, to: HexCoord) -> Option<Direction> {
    let dq = to.q - from.q;
    let dr = to.r - from.r;

    if dq == 0 && dr == 0 {
        return None;
    }

    for &dir in Direction::all() {
        let (delta_q, delta_r) = dir.delta();

        // Check if (dq, dr) is a positive multiple of (delta_q, delta_r)
        if delta_q == 0 && delta_r == 0 {
            continue;
        }

        if delta_q == 0 {
            if dq == 0 && dr.signum() == delta_r.signum() {
                return Some(dir);
            }
        } else if delta_r == 0 {
            if dr == 0 && dq.signum() == delta_q.signum() {
                return Some(dir);
            }
        } else {
            // Both non-zero, check ratio
            if dq % delta_q == 0 && dr % delta_r == 0 {
                let ratio_q = dq / delta_q;
                let ratio_r = dr / delta_r;
                if ratio_q == ratio_r && ratio_q > 0 {
                    return Some(dir);
                }
            }
        }
    }

    None
}

/// Get all cells along a direction from a starting point (exclusive of start).
pub fn get_ray(start: HexCoord, direction: Direction) -> Vec<HexCoord> {
    let mut cells = Vec::new();
    let mut current = start;

    loop {
        let next = add_direction(current, direction);
        if !is_valid_cell(next) {
            break;
        }
        cells.push(next);
        current = next;
    }

    cells
}

/// Get all cells between two aligned points (exclusive of both endpoints).
pub fn get_cells_between(from: HexCoord, to: HexCoord) -> Option<Vec<HexCoord>> {
    let direction = get_direction(from, to)?;

    let mut cells = Vec::new();
    let mut current = from;

    loop {
        current = add_direction(current, direction);
        if current == to {
            break;
        }
        if !is_valid_cell(current) {
            return None; // Shouldn't happen if to is valid
        }
        cells.push(current);
    }

    Some(cells)
}

// ============================================================================
// Knight Movement
// ============================================================================

/// Knight leap offsets.
/// Knight moves 1 step in one direction, then 1 step in an adjacent (non-opposite) direction.
const KNIGHT_OFFSETS: [(i32, i32); 6] = [
    (1, -2),  // N then NE, or NE then N
    (-1, -1), // N then NW, or NW then N
    (2, -1),  // NE then SE, or SE then NE
    (1, 1),   // SE then S, or S then SE
    (-1, 2),  // S then SW, or SW then S
    (-2, 1),  // SW then NW, or NW then SW
];

/// Get all valid knight moves from a position.
pub fn get_knight_targets(from: HexCoord) -> Vec<HexCoord> {
    KNIGHT_OFFSETS
        .iter()
        .map(|&(dq, dr)| HexCoord::new(from.q + dq, from.r + dr))
        .filter(|&coord| is_valid_cell(coord))
        .collect()
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_valid_cell() {
        // Center is valid
        assert!(is_valid_cell(HexCoord::new(0, 0)));

        // Corners are valid
        assert!(is_valid_cell(HexCoord::new(4, 0)));
        assert!(is_valid_cell(HexCoord::new(-4, 0)));
        assert!(is_valid_cell(HexCoord::new(0, 4)));
        assert!(is_valid_cell(HexCoord::new(0, -4)));
        assert!(is_valid_cell(HexCoord::new(4, -4)));
        assert!(is_valid_cell(HexCoord::new(-4, 4)));

        // Outside is invalid
        assert!(!is_valid_cell(HexCoord::new(5, 0)));
        assert!(!is_valid_cell(HexCoord::new(3, 3)));
        assert!(!is_valid_cell(HexCoord::new(-3, -3)));
    }

    #[test]
    fn test_get_all_cells_count() {
        let cells = get_all_cells();
        assert_eq!(cells.len(), 61);
    }

    #[test]
    fn test_hex_distance() {
        let a = HexCoord::new(0, 0);
        let b = HexCoord::new(2, -1);
        assert_eq!(hex_distance(a, b), 2);

        let c = HexCoord::new(-4, 4);
        assert_eq!(hex_distance(a, c), 4);
    }

    #[test]
    fn test_get_direction() {
        let origin = HexCoord::new(0, 0);

        assert_eq!(
            get_direction(origin, HexCoord::new(0, -2)),
            Some(Direction::N)
        );
        assert_eq!(
            get_direction(origin, HexCoord::new(0, 2)),
            Some(Direction::S)
        );
        assert_eq!(
            get_direction(origin, HexCoord::new(2, -2)),
            Some(Direction::NE)
        );
        assert_eq!(
            get_direction(origin, HexCoord::new(-2, 2)),
            Some(Direction::SW)
        );

        // Not aligned
        assert_eq!(get_direction(origin, HexCoord::new(1, 1)), None);
    }

    #[test]
    fn test_knight_targets() {
        let targets = get_knight_targets(HexCoord::new(0, 0));
        assert_eq!(targets.len(), 6);
    }
}
