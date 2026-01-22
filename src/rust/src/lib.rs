//! Underchex - Hexagonal Chess Variant (Rust/WASM Implementation)
//!
//! This crate provides the core game logic for Underchex, a hexagonal chess variant
//! designed as a "downgrade" from 8-way to 6-way movement.
//!
//! Signed-by: agent #21 claude-sonnet-4 via opencode 20260122T06:31:01
//! Edited-by: agent #22 claude-sonnet-4 via opencode 20260122T06:43:39 (added AI module)

pub mod ai;
pub mod board;
pub mod game;
pub mod moves;
pub mod tablebase;
pub mod types;

use std::sync::Mutex;
use wasm_bindgen::prelude::*;

// Re-export main types for convenience
pub use ai::*;
pub use board::*;
pub use game::*;
pub use moves::*;
pub use tablebase::*;
pub use types::*;

// Global transposition table for WASM (wrapped in Mutex for thread safety)
lazy_static::lazy_static! {
    static ref GLOBAL_TT: Mutex<ai::TranspositionTable> = Mutex::new(ai::TranspositionTable::new(50000));
}

// ============================================================================
// WASM Bindings
// ============================================================================

/// Initialize panic hook for better error messages in browser console
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// WASM wrapper for the game state
#[wasm_bindgen]
pub struct WasmGame {
    state: GameState,
}

#[wasm_bindgen]
impl WasmGame {
    /// Create a new game with standard starting position
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            state: create_new_game(),
        }
    }

    /// Get the current turn as a string ("white" or "black")
    pub fn get_turn(&self) -> String {
        match self.state.turn {
            Color::White => "white".to_string(),
            Color::Black => "black".to_string(),
        }
    }

    /// Get the game status as JSON
    pub fn get_status(&self) -> String {
        serde_json::to_string(&self.state.status).unwrap_or_else(|_| "\"ongoing\"".to_string())
    }

    /// Get the board state as JSON (map of "q,r" -> piece)
    pub fn get_board(&self) -> String {
        serde_json::to_string(&self.state.board).unwrap_or_else(|_| "{}".to_string())
    }

    /// Get all legal moves as JSON array
    pub fn get_legal_moves(&self) -> String {
        let moves = get_legal_moves(&self.state);
        serde_json::to_string(&moves).unwrap_or_else(|_| "[]".to_string())
    }

    /// Check if the current player is in check
    pub fn is_in_check(&self) -> bool {
        is_current_player_in_check(&self.state)
    }

    /// Make a move given from/to coordinates
    /// Returns true if the move was successful
    pub fn make_move(&mut self, from_q: i32, from_r: i32, to_q: i32, to_r: i32) -> bool {
        let from = HexCoord::new(from_q, from_r);
        let to = HexCoord::new(to_q, to_r);

        if let Some(new_state) = make_move(&self.state, from, to) {
            self.state = new_state;
            true
        } else {
            false
        }
    }

    /// Resign the game for the current player
    pub fn resign(&mut self) {
        self.state = resign(&self.state, self.state.turn);
    }

    /// Get move history as JSON
    pub fn get_history(&self) -> String {
        serde_json::to_string(&self.state.history).unwrap_or_else(|_| "[]".to_string())
    }

    /// Get current move number
    pub fn get_move_number(&self) -> u32 {
        self.state.move_number
    }

    /// Check if a specific move is legal
    pub fn is_move_legal(&self, from_q: i32, from_r: i32, to_q: i32, to_r: i32) -> bool {
        let from = HexCoord::new(from_q, from_r);
        let to = HexCoord::new(to_q, to_r);
        let validation = validate_move(&self.state.board, from, to, self.state.turn);
        validation.legal
    }

    /// Get legal moves for a specific piece as JSON
    pub fn get_legal_moves_for_piece(&self, q: i32, r: i32) -> String {
        let coord = HexCoord::new(q, r);
        if let Some(piece) = self.state.board.get(&coord.to_key()) {
            if piece.color == self.state.turn {
                let moves = generate_legal_moves(&self.state.board, piece, coord);
                return serde_json::to_string(&moves).unwrap_or_else(|_| "[]".to_string());
            }
        }
        "[]".to_string()
    }

    /// Get AI move for the current player.
    /// Difficulty: "easy", "medium", or "hard"
    /// Returns JSON with { from: [q, r], to: [q, r], score: number } or null if no move.
    pub fn get_ai_move(&self, difficulty: &str) -> String {
        let diff = match difficulty {
            "easy" => ai::AIDifficulty::Easy,
            "hard" => ai::AIDifficulty::Hard,
            _ => ai::AIDifficulty::Medium,
        };

        let mut tt = GLOBAL_TT.lock().unwrap();
        let result = ai::get_ai_move(&self.state.board, self.state.turn, diff, &mut tt);

        if let Some(mv) = result.best_move {
            serde_json::json!({
                "from": [mv.from.q, mv.from.r],
                "to": [mv.to.q, mv.to.r],
                "score": result.score,
                "nodes": result.stats.nodes_searched,
            })
            .to_string()
        } else {
            "null".to_string()
        }
    }

    /// Make the AI move for the current player.
    /// Returns true if a move was made, false if no legal moves.
    pub fn make_ai_move(&mut self, difficulty: &str) -> bool {
        let diff = match difficulty {
            "easy" => ai::AIDifficulty::Easy,
            "hard" => ai::AIDifficulty::Hard,
            _ => ai::AIDifficulty::Medium,
        };

        let mut tt = GLOBAL_TT.lock().unwrap();
        let result = ai::get_ai_move(&self.state.board, self.state.turn, diff, &mut tt);

        if let Some(mv) = result.best_move {
            if let Some(new_state) = make_move(&self.state, mv.from, mv.to) {
                self.state = new_state;
                return true;
            }
        }
        false
    }

    /// Clear the AI transposition table (useful when starting a new game).
    pub fn clear_ai_cache(&self) {
        if let Ok(mut tt) = GLOBAL_TT.lock() {
            tt.clear();
        }
    }

    /// Get the static evaluation of the current position.
    /// Returns score from white's perspective in centipawns.
    pub fn evaluate(&self) -> i32 {
        ai::evaluate_position(&self.state.board)
    }
}

impl Default for WasmGame {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================================================
// Standalone WASM Functions
// ============================================================================

/// Check if a coordinate is valid on the board
#[wasm_bindgen]
pub fn wasm_is_valid_cell(q: i32, r: i32) -> bool {
    is_valid_cell(HexCoord::new(q, r))
}

/// Get all valid cells as JSON array of [q, r] pairs
#[wasm_bindgen]
pub fn wasm_get_all_cells() -> String {
    let cells: Vec<[i32; 2]> = get_all_cells().iter().map(|c| [c.q, c.r]).collect();
    serde_json::to_string(&cells).unwrap_or_else(|_| "[]".to_string())
}

/// Calculate hex distance between two cells
#[wasm_bindgen]
pub fn wasm_hex_distance(q1: i32, r1: i32, q2: i32, r2: i32) -> i32 {
    hex_distance(HexCoord::new(q1, r1), HexCoord::new(q2, r2))
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_wasm_game_new() {
        let game = WasmGame::new();
        assert_eq!(game.get_turn(), "white");
        assert!(!game.is_in_check());
    }

    #[test]
    fn test_wasm_game_make_move() {
        let mut game = WasmGame::new();

        // Move a pawn
        let success = game.make_move(0, 2, 0, 1);
        assert!(success);
        assert_eq!(game.get_turn(), "black");
    }

    #[test]
    fn test_wasm_is_valid_cell() {
        assert!(wasm_is_valid_cell(0, 0));
        assert!(wasm_is_valid_cell(4, 0));
        assert!(!wasm_is_valid_cell(5, 0));
    }
}
