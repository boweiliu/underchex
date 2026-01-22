//! Underchex Core Types
//!
//! Signed-by: agent #21 claude-sonnet-4 via opencode 20260122T06:31:01

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use wasm_bindgen::prelude::*;

// ============================================================================
// Coordinate System
// ============================================================================

/// Axial coordinates for hex grid.
/// The third coordinate s = -q - r is implicit.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[wasm_bindgen]
pub struct HexCoord {
    pub q: i32,
    pub r: i32,
}

#[wasm_bindgen]
impl HexCoord {
    #[wasm_bindgen(constructor)]
    pub fn new(q: i32, r: i32) -> Self {
        Self { q, r }
    }

    /// Get the implicit third coordinate (s = -q - r)
    pub fn s(&self) -> i32 {
        -self.q - self.r
    }

    /// Convert to string "q,r"
    pub fn to_key(&self) -> String {
        format!("{},{}", self.q, self.r)
    }

    /// Parse from string "q,r"
    pub fn from_key(key: &str) -> Option<Self> {
        let parts: Vec<&str> = key.split(',').collect();
        if parts.len() != 2 {
            return None;
        }
        let q = parts[0].parse().ok()?;
        let r = parts[1].parse().ok()?;
        Some(Self { q, r })
    }
}

// ============================================================================
// Directions
// ============================================================================

/// Six cardinal directions on a hex grid
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Direction {
    N,
    S,
    NE,
    SW,
    NW,
    SE,
}

impl Direction {
    /// Get the delta (dq, dr) for this direction
    pub fn delta(&self) -> (i32, i32) {
        match self {
            Direction::N => (0, -1),
            Direction::S => (0, 1),
            Direction::NE => (1, -1),
            Direction::SW => (-1, 1),
            Direction::NW => (-1, 0),
            Direction::SE => (1, 0),
        }
    }

    /// Get the opposite direction
    pub fn opposite(&self) -> Direction {
        match self {
            Direction::N => Direction::S,
            Direction::S => Direction::N,
            Direction::NE => Direction::SW,
            Direction::SW => Direction::NE,
            Direction::NW => Direction::SE,
            Direction::SE => Direction::NW,
        }
    }

    /// All six directions
    pub fn all() -> &'static [Direction] {
        &[
            Direction::N,
            Direction::S,
            Direction::NE,
            Direction::SW,
            Direction::NW,
            Direction::SE,
        ]
    }

    /// Diagonal directions (NE, NW, SE, SW) - used by Chariot
    pub fn diagonals() -> &'static [Direction] {
        &[Direction::NE, Direction::NW, Direction::SE, Direction::SW]
    }

    /// Lance A directions (N, S, NW, SE)
    pub fn lance_a() -> &'static [Direction] {
        &[Direction::N, Direction::S, Direction::NW, Direction::SE]
    }

    /// Lance B directions (N, S, NE, SW)
    pub fn lance_b() -> &'static [Direction] {
        &[Direction::N, Direction::S, Direction::NE, Direction::SW]
    }
}

// ============================================================================
// Pieces
// ============================================================================

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum PieceType {
    Pawn,
    King,
    Queen,
    Knight,
    Lance,
    Chariot,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Color {
    White,
    Black,
}

impl Color {
    pub fn opposite(&self) -> Color {
        match self {
            Color::White => Color::Black,
            Color::Black => Color::White,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum LanceVariant {
    A,
    B,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Piece {
    pub piece_type: PieceType,
    pub color: Color,
    pub variant: Option<LanceVariant>, // Only for lances
}

impl Piece {
    pub fn new(piece_type: PieceType, color: Color) -> Self {
        Self {
            piece_type,
            color,
            variant: None,
        }
    }

    pub fn lance(color: Color, variant: LanceVariant) -> Self {
        Self {
            piece_type: PieceType::Lance,
            color,
            variant: Some(variant),
        }
    }

    /// Get directions this piece can move in (for sliders)
    pub fn directions(&self) -> &'static [Direction] {
        match self.piece_type {
            PieceType::King | PieceType::Queen => Direction::all(),
            PieceType::Chariot => Direction::diagonals(),
            PieceType::Lance => match self.variant {
                Some(LanceVariant::A) => Direction::lance_a(),
                Some(LanceVariant::B) | None => Direction::lance_b(),
            },
            _ => &[],
        }
    }

    /// Check if this piece is a slider (can move multiple squares)
    pub fn is_slider(&self) -> bool {
        matches!(
            self.piece_type,
            PieceType::Queen | PieceType::Lance | PieceType::Chariot
        )
    }
}

// ============================================================================
// Board Constants
// ============================================================================

pub const BOARD_RADIUS: i32 = 4;
pub const TOTAL_CELLS: usize = 61; // For radius 4 hex board

/// Check if coord is in promotion zone for given color
pub fn is_promotion_zone(coord: HexCoord, color: Color) -> bool {
    let target_r = match color {
        Color::White => -BOARD_RADIUS,
        Color::Black => BOARD_RADIUS,
    };
    coord.r == target_r
}

// ============================================================================
// Board State
// ============================================================================

/// Board state as a map from position key to piece
pub type BoardState = HashMap<String, Piece>;

// ============================================================================
// Moves
// ============================================================================

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Move {
    pub from: HexCoord,
    pub to: HexCoord,
    pub piece: Piece,
    pub captured: Option<Piece>,
    pub promotion: Option<PieceType>,
}

impl Move {
    pub fn new(piece: Piece, from: HexCoord, to: HexCoord) -> Self {
        Self {
            from,
            to,
            piece,
            captured: None,
            promotion: None,
        }
    }

    pub fn with_capture(mut self, captured: Piece) -> Self {
        self.captured = Some(captured);
        self
    }

    pub fn with_promotion(mut self, promotion: PieceType) -> Self {
        self.promotion = Some(promotion);
        self
    }
}

/// Valid promotion targets for pawns
pub const PROMOTION_TARGETS: &[PieceType] = &[
    PieceType::Queen,
    PieceType::Chariot,
    PieceType::Lance,
    PieceType::Knight,
];

// ============================================================================
// Game Status
// ============================================================================

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum GameStatus {
    Ongoing,
    Checkmate { winner: Color },
    Stalemate,
    Draw { reason: String },
    Resigned { winner: Color },
}

// ============================================================================
// Game State
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameState {
    pub board: BoardState,
    pub turn: Color,
    pub move_number: u32,
    pub half_move_clock: u32,
    pub history: Vec<Move>,
    pub status: GameStatus,
}
