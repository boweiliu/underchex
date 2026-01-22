//! Underchex Game State Management
//!
//! Signed-by: agent #21 claude-sonnet-4 via opencode 20260122T06:31:01

use crate::moves::{apply_move, generate_all_legal_moves, is_in_check, validate_move};
use crate::types::{
    BoardState, Color, GameState, GameStatus, HexCoord, LanceVariant, Move, Piece, PieceType,
};

// ============================================================================
// Initial Setup
// ============================================================================

/// Piece placement for initial setup
struct PiecePlacement {
    piece: Piece,
    position: HexCoord,
}

/// Standard starting position for Underchex.
fn get_starting_position() -> Vec<PiecePlacement> {
    let mut pieces = Vec::new();

    // White pieces
    pieces.push(PiecePlacement {
        piece: Piece::new(PieceType::King, Color::White),
        position: HexCoord::new(0, 4),
    });
    pieces.push(PiecePlacement {
        piece: Piece::new(PieceType::Queen, Color::White),
        position: HexCoord::new(1, 3),
    });
    pieces.push(PiecePlacement {
        piece: Piece::new(PieceType::Chariot, Color::White),
        position: HexCoord::new(-2, 4),
    });
    pieces.push(PiecePlacement {
        piece: Piece::new(PieceType::Chariot, Color::White),
        position: HexCoord::new(2, 3),
    });
    pieces.push(PiecePlacement {
        piece: Piece::lance(Color::White, LanceVariant::A),
        position: HexCoord::new(-1, 4),
    });
    pieces.push(PiecePlacement {
        piece: Piece::lance(Color::White, LanceVariant::B),
        position: HexCoord::new(1, 4),
    });
    pieces.push(PiecePlacement {
        piece: Piece::new(PieceType::Knight, Color::White),
        position: HexCoord::new(-2, 3),
    });
    pieces.push(PiecePlacement {
        piece: Piece::new(PieceType::Knight, Color::White),
        position: HexCoord::new(2, 4),
    });

    // White pawns
    let white_pawn_positions = [
        HexCoord::new(-3, 3),
        HexCoord::new(-2, 2),
        HexCoord::new(-1, 2),
        HexCoord::new(0, 2),
        HexCoord::new(1, 2),
        HexCoord::new(2, 2),
    ];
    for pos in white_pawn_positions {
        pieces.push(PiecePlacement {
            piece: Piece::new(PieceType::Pawn, Color::White),
            position: pos,
        });
    }

    // Black pieces (point reflection of white)
    pieces.push(PiecePlacement {
        piece: Piece::new(PieceType::King, Color::Black),
        position: HexCoord::new(0, -4),
    });
    pieces.push(PiecePlacement {
        piece: Piece::new(PieceType::Queen, Color::Black),
        position: HexCoord::new(-1, -3),
    });
    pieces.push(PiecePlacement {
        piece: Piece::new(PieceType::Chariot, Color::Black),
        position: HexCoord::new(2, -4),
    });
    pieces.push(PiecePlacement {
        piece: Piece::new(PieceType::Chariot, Color::Black),
        position: HexCoord::new(-2, -3),
    });
    pieces.push(PiecePlacement {
        piece: Piece::lance(Color::Black, LanceVariant::A),
        position: HexCoord::new(1, -4),
    });
    pieces.push(PiecePlacement {
        piece: Piece::lance(Color::Black, LanceVariant::B),
        position: HexCoord::new(-1, -4),
    });
    pieces.push(PiecePlacement {
        piece: Piece::new(PieceType::Knight, Color::Black),
        position: HexCoord::new(2, -3),
    });
    pieces.push(PiecePlacement {
        piece: Piece::new(PieceType::Knight, Color::Black),
        position: HexCoord::new(-2, -4),
    });

    // Black pawns
    let black_pawn_positions = [
        HexCoord::new(3, -3),
        HexCoord::new(2, -2),
        HexCoord::new(1, -2),
        HexCoord::new(0, -2),
        HexCoord::new(-1, -2),
        HexCoord::new(-2, -2),
    ];
    for pos in black_pawn_positions {
        pieces.push(PiecePlacement {
            piece: Piece::new(PieceType::Pawn, Color::Black),
            position: pos,
        });
    }

    pieces
}

/// Create initial board state from piece placements.
fn create_board_from_placements(placements: &[PiecePlacement]) -> BoardState {
    let mut board = BoardState::new();
    for placement in placements {
        board.insert(placement.position.to_key(), placement.piece);
    }
    board
}

/// Create a new game with standard starting position.
pub fn create_new_game() -> GameState {
    let placements = get_starting_position();
    let board = create_board_from_placements(&placements);

    GameState {
        board,
        turn: Color::White,
        move_number: 1,
        half_move_clock: 0,
        history: Vec::new(),
        status: GameStatus::Ongoing,
    }
}

// ============================================================================
// Game State Updates
// ============================================================================

/// Determine game status after a move.
fn determine_status(board: &BoardState, next_turn: Color) -> GameStatus {
    let legal_moves = generate_all_legal_moves(board, next_turn);

    if legal_moves.is_empty() {
        if is_in_check(board, next_turn) {
            GameStatus::Checkmate {
                winner: next_turn.opposite(),
            }
        } else {
            GameStatus::Stalemate
        }
    } else {
        GameStatus::Ongoing
    }
}

/// Make a move and return the new game state.
/// Returns None if the move is invalid.
pub fn make_move(state: &GameState, from: HexCoord, to: HexCoord) -> Option<GameState> {
    if state.status != GameStatus::Ongoing {
        return None; // Game is over
    }

    let validation = validate_move(&state.board, from, to, state.turn);
    if !validation.legal {
        return None;
    }

    let piece = *state.board.get(&from.to_key())?;
    let captured = state.board.get(&to.to_key()).copied();

    let mv = Move {
        piece,
        from,
        to,
        captured,
        promotion: None, // TODO: Handle promotion selection
    };

    let new_board = apply_move(&state.board, &mv);
    let next_turn = state.turn.opposite();
    let status = determine_status(&new_board, next_turn);

    // Update half-move clock (reset on pawn move or capture)
    let half_move_clock = if piece.piece_type == PieceType::Pawn || captured.is_some() {
        0
    } else {
        state.half_move_clock + 1
    };

    // Increment move number when black moves
    let move_number = if state.turn == Color::Black {
        state.move_number + 1
    } else {
        state.move_number
    };

    let mut history = state.history.clone();
    history.push(mv);

    Some(GameState {
        board: new_board,
        turn: next_turn,
        move_number,
        half_move_clock,
        history,
        status,
    })
}

/// Resign the game.
pub fn resign(state: &GameState, color: Color) -> GameState {
    GameState {
        status: GameStatus::Resigned {
            winner: color.opposite(),
        },
        ..state.clone()
    }
}

// ============================================================================
// Game Queries
// ============================================================================

/// Check if it's a specific player's turn.
pub fn is_player_turn(state: &GameState, color: Color) -> bool {
    state.status == GameStatus::Ongoing && state.turn == color
}

/// Get all legal moves for the current player.
pub fn get_legal_moves(state: &GameState) -> Vec<Move> {
    if state.status != GameStatus::Ongoing {
        return Vec::new();
    }
    generate_all_legal_moves(&state.board, state.turn)
}

/// Check if the current player is in check.
pub fn is_current_player_in_check(state: &GameState) -> bool {
    is_in_check(&state.board, state.turn)
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_new_game() {
        let game = create_new_game();
        assert_eq!(game.turn, Color::White);
        assert_eq!(game.move_number, 1);
        assert_eq!(game.status, GameStatus::Ongoing);
        assert!(game.history.is_empty());

        // Check piece count: 8 pieces + 6 pawns per side = 28 total
        assert_eq!(game.board.len(), 28);

        // Check white king position
        let white_king = game.board.get("0,4");
        assert!(white_king.is_some());
        assert_eq!(white_king.unwrap().piece_type, PieceType::King);
        assert_eq!(white_king.unwrap().color, Color::White);

        // Check black king position
        let black_king = game.board.get("0,-4");
        assert!(black_king.is_some());
        assert_eq!(black_king.unwrap().piece_type, PieceType::King);
        assert_eq!(black_king.unwrap().color, Color::Black);
    }

    #[test]
    fn test_starting_position_legal_moves() {
        let game = create_new_game();
        let moves = get_legal_moves(&game);

        // Should have legal moves available
        assert!(!moves.is_empty());

        // All moves should be for white pieces
        for mv in &moves {
            assert_eq!(mv.piece.color, Color::White);
        }
    }

    #[test]
    fn test_make_valid_move() {
        let game = create_new_game();

        // Try moving a pawn forward
        let from = HexCoord::new(0, 2);
        let to = HexCoord::new(0, 1);

        let new_game = make_move(&game, from, to);
        assert!(new_game.is_some());

        let new_game = new_game.unwrap();
        assert_eq!(new_game.turn, Color::Black);
        assert_eq!(new_game.history.len(), 1);

        // Pawn should be at new position
        assert!(new_game.board.get("0,1").is_some());
        assert!(new_game.board.get("0,2").is_none());
    }

    #[test]
    fn test_make_invalid_move() {
        let game = create_new_game();

        // Try moving a pawn to an invalid position
        let from = HexCoord::new(0, 2);
        let to = HexCoord::new(3, 3); // Invalid move

        let new_game = make_move(&game, from, to);
        assert!(new_game.is_none());
    }

    #[test]
    fn test_resign() {
        let game = create_new_game();
        let resigned = resign(&game, Color::White);

        assert_eq!(
            resigned.status,
            GameStatus::Resigned {
                winner: Color::Black
            }
        );
    }

    #[test]
    fn test_is_player_turn() {
        let game = create_new_game();
        assert!(is_player_turn(&game, Color::White));
        assert!(!is_player_turn(&game, Color::Black));
    }
}
