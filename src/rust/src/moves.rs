//! Underchex Move Generation and Validation
//!
//! Signed-by: agent #21 claude-sonnet-4 via opencode 20260122T06:31:01

use crate::board::{get_knight_targets, get_neighbor, get_ray, is_valid_cell};
use crate::types::{
    is_promotion_zone, BoardState, Color, Direction, HexCoord, Move, Piece, PieceType,
    PROMOTION_TARGETS,
};

// ============================================================================
// Piece Movement Patterns
// ============================================================================

/// Get the forward direction for a color.
pub fn get_forward_direction(color: Color) -> Direction {
    match color {
        Color::White => Direction::N,
        Color::Black => Direction::S,
    }
}

/// Get pawn capture directions for a color.
pub fn get_pawn_capture_directions(color: Color) -> &'static [Direction] {
    match color {
        Color::White => &[Direction::N, Direction::NE, Direction::NW],
        Color::Black => &[Direction::S, Direction::SE, Direction::SW],
    }
}

// ============================================================================
// Board Queries
// ============================================================================

/// Get piece at a position, or None if empty.
pub fn get_piece_at(board: &BoardState, coord: HexCoord) -> Option<&Piece> {
    board.get(&coord.to_key())
}

/// Check if a cell is occupied.
pub fn is_occupied(board: &BoardState, coord: HexCoord) -> bool {
    board.contains_key(&coord.to_key())
}

/// Check if a cell has an enemy piece.
pub fn has_enemy(board: &BoardState, coord: HexCoord, color: Color) -> bool {
    get_piece_at(board, coord).is_some_and(|p| p.color != color)
}

/// Check if a cell has a friendly piece.
pub fn has_friendly(board: &BoardState, coord: HexCoord, color: Color) -> bool {
    get_piece_at(board, coord).is_some_and(|p| p.color == color)
}

// ============================================================================
// Move Generation
// ============================================================================

/// Generate pseudo-legal moves for a piece (doesn't check for leaving king in check).
pub fn generate_pseudo_legal_moves(board: &BoardState, piece: &Piece, from: HexCoord) -> Vec<Move> {
    let mut moves = Vec::new();

    match piece.piece_type {
        PieceType::Pawn => generate_pawn_moves(board, piece, from, &mut moves),
        PieceType::King => generate_king_moves(board, piece, from, &mut moves),
        PieceType::Knight => generate_knight_moves(board, piece, from, &mut moves),
        PieceType::Queen | PieceType::Lance | PieceType::Chariot => {
            generate_slider_moves(board, piece, from, &mut moves)
        }
    }

    moves
}

fn generate_pawn_moves(board: &BoardState, piece: &Piece, from: HexCoord, moves: &mut Vec<Move>) {
    let forward_dir = get_forward_direction(piece.color);
    let capture_directions = get_pawn_capture_directions(piece.color);

    // Forward move (non-capture)
    if let Some(forward) = get_neighbor(from, forward_dir) {
        if !is_occupied(board, forward) {
            if is_promotion_zone(forward, piece.color) {
                // Generate promotion moves for each target piece type
                for &promo_type in PROMOTION_TARGETS {
                    moves.push(Move::new(*piece, from, forward).with_promotion(promo_type));
                }
            } else {
                moves.push(Move::new(*piece, from, forward));
            }
        }
    }

    // Captures (including forward capture)
    for &dir in capture_directions {
        if let Some(target) = get_neighbor(from, dir) {
            if has_enemy(board, target, piece.color) {
                let captured = *get_piece_at(board, target).unwrap();
                if is_promotion_zone(target, piece.color) {
                    // Generate promotion captures for each target piece type
                    for &promo_type in PROMOTION_TARGETS {
                        moves.push(
                            Move::new(*piece, from, target)
                                .with_capture(captured)
                                .with_promotion(promo_type),
                        );
                    }
                } else {
                    moves.push(Move::new(*piece, from, target).with_capture(captured));
                }
            }
        }
    }
}

fn generate_king_moves(board: &BoardState, piece: &Piece, from: HexCoord, moves: &mut Vec<Move>) {
    for &dir in Direction::all() {
        if let Some(target) = get_neighbor(from, dir) {
            if !has_friendly(board, target, piece.color) {
                let mut mv = Move::new(*piece, from, target);
                if let Some(&captured) = get_piece_at(board, target) {
                    mv = mv.with_capture(captured);
                }
                moves.push(mv);
            }
        }
    }
}

fn generate_knight_moves(board: &BoardState, piece: &Piece, from: HexCoord, moves: &mut Vec<Move>) {
    for target in get_knight_targets(from) {
        if !has_friendly(board, target, piece.color) {
            let mut mv = Move::new(*piece, from, target);
            if let Some(&captured) = get_piece_at(board, target) {
                mv = mv.with_capture(captured);
            }
            moves.push(mv);
        }
    }
}

fn generate_slider_moves(board: &BoardState, piece: &Piece, from: HexCoord, moves: &mut Vec<Move>) {
    let directions = piece.directions();

    for &dir in directions {
        let ray = get_ray(from, dir);
        for target in ray {
            if has_friendly(board, target, piece.color) {
                break; // Blocked by friendly piece
            }
            let mut mv = Move::new(*piece, from, target);
            if let Some(&captured) = get_piece_at(board, target) {
                mv = mv.with_capture(captured);
                moves.push(mv);
                break; // Can't move past a captured piece
            }
            moves.push(mv);
        }
    }
}

// ============================================================================
// Check Detection
// ============================================================================

/// Find the king of a given color.
pub fn find_king(board: &BoardState, color: Color) -> Option<HexCoord> {
    for (pos_str, piece) in board.iter() {
        if piece.piece_type == PieceType::King && piece.color == color {
            return HexCoord::from_key(pos_str);
        }
    }
    None
}

/// Check if a square is attacked by any piece of the given color.
pub fn is_attacked(board: &BoardState, target: HexCoord, by_color: Color) -> bool {
    // Check for pawn attacks
    let pawn_capture_directions = get_pawn_capture_directions(by_color);
    for &dir in pawn_capture_directions {
        // Check in reverse direction from target
        let reverse_dir = dir.opposite();
        if let Some(attacker) = get_neighbor(target, reverse_dir) {
            if let Some(piece) = get_piece_at(board, attacker) {
                if piece.piece_type == PieceType::Pawn && piece.color == by_color {
                    return true;
                }
            }
        }
    }

    // Check for king attacks
    for &dir in Direction::all() {
        if let Some(attacker) = get_neighbor(target, dir) {
            if let Some(piece) = get_piece_at(board, attacker) {
                if piece.piece_type == PieceType::King && piece.color == by_color {
                    return true;
                }
            }
        }
    }

    // Check for knight attacks
    for attacker_pos in get_knight_targets(target) {
        if let Some(piece) = get_piece_at(board, attacker_pos) {
            if piece.piece_type == PieceType::Knight && piece.color == by_color {
                return true;
            }
        }
    }

    // Check for slider attacks (queen, lance, chariot)
    for &dir in Direction::all() {
        let ray = get_ray(target, dir);
        for pos in ray {
            if let Some(piece) = get_piece_at(board, pos) {
                if piece.color != by_color {
                    break;
                }

                // Check if this piece can attack along this direction
                let reverse_dir = dir.opposite();
                if piece.is_slider() && piece.directions().contains(&reverse_dir) {
                    return true;
                }
                break; // Blocked by this piece either way
            }
        }
    }

    false
}

/// Check if the king of a given color is in check.
pub fn is_in_check(board: &BoardState, color: Color) -> bool {
    if let Some(king_pos) = find_king(board, color) {
        is_attacked(board, king_pos, color.opposite())
    } else {
        false // No king - shouldn't happen in valid game
    }
}

// ============================================================================
// Legal Move Generation
// ============================================================================

/// Apply a move to a board state (returns new board state).
/// Handles pawn promotion by replacing the piece.
pub fn apply_move(board: &BoardState, mv: &Move) -> BoardState {
    let mut new_board = board.clone();
    new_board.remove(&mv.from.to_key());

    // Handle promotion
    let piece_to_place = if let Some(promo_type) = mv.promotion {
        Piece::new(promo_type, mv.piece.color)
    } else {
        mv.piece
    };

    new_board.insert(mv.to.to_key(), piece_to_place);
    new_board
}

/// Generate all legal moves for a piece.
pub fn generate_legal_moves(board: &BoardState, piece: &Piece, from: HexCoord) -> Vec<Move> {
    let pseudo_legal = generate_pseudo_legal_moves(board, piece, from);

    pseudo_legal
        .into_iter()
        .filter(|mv| {
            let new_board = apply_move(board, mv);
            !is_in_check(&new_board, piece.color)
        })
        .collect()
}

/// Generate all legal moves for a player.
pub fn generate_all_legal_moves(board: &BoardState, color: Color) -> Vec<Move> {
    let mut moves = Vec::new();

    for (pos_str, piece) in board.iter() {
        if piece.color != color {
            continue;
        }
        if let Some(from) = HexCoord::from_key(pos_str) {
            moves.extend(generate_legal_moves(board, piece, from));
        }
    }

    moves
}

// ============================================================================
// Move Validation
// ============================================================================

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MoveValidation {
    pub legal: bool,
    pub reason: Option<String>,
    pub capture: bool,
}

/// Validate a specific move.
pub fn validate_move(
    board: &BoardState,
    from: HexCoord,
    to: HexCoord,
    turn: Color,
) -> MoveValidation {
    let piece = match get_piece_at(board, from) {
        Some(p) => p,
        None => {
            return MoveValidation {
                legal: false,
                reason: Some("noPieceAtSource".to_string()),
                capture: false,
            }
        }
    };

    if piece.color != turn {
        return MoveValidation {
            legal: false,
            reason: Some("notYourPiece".to_string()),
            capture: false,
        };
    }

    if !is_valid_cell(to) {
        return MoveValidation {
            legal: false,
            reason: Some("invalidDestination".to_string()),
            capture: false,
        };
    }

    let legal_moves = generate_legal_moves(board, piece, from);
    if let Some(matching_move) = legal_moves.iter().find(|m| m.to == to) {
        return MoveValidation {
            legal: true,
            reason: None,
            capture: matching_move.captured.is_some(),
        };
    }

    // Check if it would leave king in check
    let pseudo_legal = generate_pseudo_legal_moves(board, piece, from);
    if pseudo_legal.iter().any(|m| m.to == to) {
        return MoveValidation {
            legal: false,
            reason: Some("movesIntoCheck".to_string()),
            capture: false,
        };
    }

    MoveValidation {
        legal: false,
        reason: Some("illegalMove".to_string()),
        capture: false,
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::LanceVariant;

    fn create_empty_board() -> BoardState {
        BoardState::new()
    }

    #[test]
    fn test_pawn_moves() {
        let mut board = create_empty_board();
        let pawn = Piece::new(PieceType::Pawn, Color::White);
        let from = HexCoord::new(0, 2);
        board.insert(from.to_key(), pawn);

        let moves = generate_pseudo_legal_moves(&board, &pawn, from);
        assert_eq!(moves.len(), 1); // Only forward move
        assert_eq!(moves[0].to, HexCoord::new(0, 1));
    }

    #[test]
    fn test_pawn_captures() {
        let mut board = create_empty_board();
        let white_pawn = Piece::new(PieceType::Pawn, Color::White);
        let black_pawn = Piece::new(PieceType::Pawn, Color::Black);

        let from = HexCoord::new(0, 2);
        board.insert(from.to_key(), white_pawn);

        // Enemy to capture at NE
        board.insert(HexCoord::new(1, 1).to_key(), black_pawn);

        let moves = generate_pseudo_legal_moves(&board, &white_pawn, from);
        // Forward + capture NE
        assert_eq!(moves.len(), 2);
        assert!(moves
            .iter()
            .any(|m| m.to == HexCoord::new(1, 1) && m.captured.is_some()));
    }

    #[test]
    fn test_king_moves() {
        let mut board = create_empty_board();
        let king = Piece::new(PieceType::King, Color::White);
        let from = HexCoord::new(0, 0);
        board.insert(from.to_key(), king);

        let moves = generate_pseudo_legal_moves(&board, &king, from);
        assert_eq!(moves.len(), 6); // 6 directions
    }

    #[test]
    fn test_knight_moves() {
        let mut board = create_empty_board();
        let knight = Piece::new(PieceType::Knight, Color::White);
        let from = HexCoord::new(0, 0);
        board.insert(from.to_key(), knight);

        let moves = generate_pseudo_legal_moves(&board, &knight, from);
        assert_eq!(moves.len(), 6); // 6 knight positions
    }

    #[test]
    fn test_queen_moves_empty_board() {
        let mut board = create_empty_board();
        let queen = Piece::new(PieceType::Queen, Color::White);
        let from = HexCoord::new(0, 0);
        board.insert(from.to_key(), queen);

        let moves = generate_pseudo_legal_moves(&board, &queen, from);
        // Queen at center can reach many cells (4 in each of 6 directions)
        assert_eq!(moves.len(), 24);
    }

    #[test]
    fn test_lance_a_moves() {
        let mut board = create_empty_board();
        let lance = Piece::lance(Color::White, LanceVariant::A);
        let from = HexCoord::new(0, 0);
        board.insert(from.to_key(), lance);

        let moves = generate_pseudo_legal_moves(&board, &lance, from);
        // Lance A moves N, S, NW, SE (4 rays x 4 cells each)
        assert_eq!(moves.len(), 16);
    }

    #[test]
    fn test_is_in_check() {
        let mut board = create_empty_board();

        // White king at center
        let white_king = Piece::new(PieceType::King, Color::White);
        board.insert(HexCoord::new(0, 0).to_key(), white_king);

        // Black queen attacking from the north
        let black_queen = Piece::new(PieceType::Queen, Color::Black);
        board.insert(HexCoord::new(0, -3).to_key(), black_queen);

        assert!(is_in_check(&board, Color::White));
        assert!(!is_in_check(&board, Color::Black));
    }

    #[test]
    fn test_legal_moves_avoid_check() {
        let mut board = create_empty_board();

        // White king
        let white_king = Piece::new(PieceType::King, Color::White);
        board.insert(HexCoord::new(0, 0).to_key(), white_king);

        // Black queen attacking from north - king can't move north
        let black_queen = Piece::new(PieceType::Queen, Color::Black);
        board.insert(HexCoord::new(0, -3).to_key(), black_queen);

        let legal_moves = generate_legal_moves(&board, &white_king, HexCoord::new(0, 0));

        // King can't move N (into queen's line) but can move other directions
        assert!(!legal_moves.iter().any(|m| m.to == HexCoord::new(0, -1)));
        // But can move NE, NW, S, SE, SW
        assert!(legal_moves.len() < 6);
    }
}
