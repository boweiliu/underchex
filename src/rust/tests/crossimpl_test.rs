//! Cross-Implementation Test Runner
//!
//! Runs test cases from spec/tests/move_validation.json to verify
//! Rust implementation matches the shared spec.
//!
//! Signed-by: agent #29 claude-sonnet-4 via opencode 20260122T08:15:15

use serde::Deserialize;
use std::collections::HashMap;
use std::fs;
use std::path::Path;

// Import from the crate
use underchex_wasm::{
    is_valid_cell, validate_move, BoardState, Color, HexCoord, LanceVariant, Piece, PieceType,
};

// ============================================================================
// Test Case Structures (matching JSON spec)
// ============================================================================

#[derive(Debug, Deserialize)]
struct TestSuite {
    #[serde(rename = "testCases")]
    test_cases: Vec<TestCase>,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
enum TestCase {
    #[serde(rename = "boardValidation")]
    BoardValidation(BoardValidationCase),
    #[serde(rename = "moveValidation")]
    MoveValidation(MoveValidationCase),
}

#[derive(Debug, Deserialize)]
struct BoardValidationCase {
    id: String,
    description: String,
    input: CoordInput,
    expected: BoardExpected,
}

#[derive(Debug, Deserialize)]
struct CoordInput {
    q: i32,
    r: i32,
}

#[derive(Debug, Deserialize)]
struct BoardExpected {
    valid: bool,
}

#[derive(Debug, Deserialize)]
struct MoveValidationCase {
    id: String,
    description: String,
    setup: SetupConfig,
    #[serde(rename = "move")]
    the_move: MoveConfig,
    expected: MoveExpected,
}

#[derive(Debug, Deserialize)]
struct SetupConfig {
    pieces: Vec<PiecePlacement>,
    turn: String,
}

#[derive(Debug, Deserialize)]
struct PiecePlacement {
    piece: String,
    color: String,
    q: i32,
    r: i32,
    variant: Option<String>,
}

#[derive(Debug, Deserialize)]
struct MoveConfig {
    from: CoordInput,
    to: CoordInput,
}

#[derive(Debug, Deserialize)]
struct MoveExpected {
    legal: bool,
    capture: Option<bool>,
    reason: Option<String>,
}

// ============================================================================
// Helper Functions
// ============================================================================

fn load_test_suite() -> TestSuite {
    let spec_path = Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .parent()
        .unwrap()
        .join("spec")
        .join("tests")
        .join("move_validation.json");

    let content = fs::read_to_string(&spec_path)
        .unwrap_or_else(|e| panic!("Failed to read spec file at {:?}: {}", spec_path, e));

    serde_json::from_str(&content).expect("Failed to parse spec JSON")
}

fn string_to_color(s: &str) -> Color {
    match s {
        "white" => Color::White,
        "black" => Color::Black,
        _ => panic!("Invalid color: {}", s),
    }
}

fn string_to_piece_type(s: &str) -> PieceType {
    match s {
        "king" => PieceType::King,
        "queen" => PieceType::Queen,
        "knight" => PieceType::Knight,
        "pawn" => PieceType::Pawn,
        "lance" => PieceType::Lance,
        "chariot" => PieceType::Chariot,
        _ => panic!("Invalid piece type: {}", s),
    }
}

fn string_to_lance_variant(s: &str) -> LanceVariant {
    match s {
        "A" => LanceVariant::A,
        "B" => LanceVariant::B,
        _ => panic!("Invalid lance variant: {}", s),
    }
}

fn build_board_from_spec(setup: &SetupConfig) -> BoardState {
    let mut board: BoardState = HashMap::new();

    for placement in &setup.pieces {
        let piece_type = string_to_piece_type(&placement.piece);
        let color = string_to_color(&placement.color);

        let piece = if piece_type == PieceType::Lance {
            let variant = placement
                .variant
                .as_ref()
                .map(|v| string_to_lance_variant(v))
                .unwrap_or(LanceVariant::A);
            Piece::lance(color, variant)
        } else {
            Piece::new(piece_type, color)
        };

        let coord = HexCoord::new(placement.q, placement.r);
        board.insert(coord.to_key(), piece);
    }

    board
}

// ============================================================================
// Tests
// ============================================================================

#[test]
fn test_board_validation_from_spec() {
    let suite = load_test_suite();
    let mut count = 0;

    for tc in &suite.test_cases {
        if let TestCase::BoardValidation(case) = tc {
            let coord = HexCoord::new(case.input.q, case.input.r);
            let result = is_valid_cell(coord);

            assert_eq!(
                result, case.expected.valid,
                "{}: {} - expected valid={}, got valid={}",
                case.id, case.description, case.expected.valid, result
            );
            count += 1;
        }
    }

    println!("Board validation tests passed: {}", count);
    assert!(count > 0, "No board validation tests found");
}

#[test]
fn test_move_validation_from_spec() {
    let suite = load_test_suite();
    let mut count = 0;

    for tc in &suite.test_cases {
        if let TestCase::MoveValidation(case) = tc {
            let board = build_board_from_spec(&case.setup);
            let turn = string_to_color(&case.setup.turn);

            let from = HexCoord::new(case.the_move.from.q, case.the_move.from.r);
            let to = HexCoord::new(case.the_move.to.q, case.the_move.to.r);

            let result = validate_move(&board, from, to, turn);

            // Check legal/illegal
            assert_eq!(
                result.legal, case.expected.legal,
                "{}: {} - expected legal={}, got legal={}",
                case.id, case.description, case.expected.legal, result.legal
            );

            // If legal and capture is specified, check it
            if case.expected.legal {
                if let Some(expected_capture) = case.expected.capture {
                    assert_eq!(
                        result.capture, expected_capture,
                        "{}: {} - expected capture={}, got capture={}",
                        case.id, case.description, expected_capture, result.capture
                    );
                }
            }

            // If illegal with specific reason, check it
            if !case.expected.legal {
                if let Some(expected_reason) = &case.expected.reason {
                    assert_eq!(
                        result.reason.as_deref(),
                        Some(expected_reason.as_str()),
                        "{}: {} - expected reason={:?}, got reason={:?}",
                        case.id,
                        case.description,
                        expected_reason,
                        result.reason
                    );
                }
            }

            count += 1;
        }
    }

    println!("Move validation tests passed: {}", count);
    assert!(count > 0, "No move validation tests found");
}

// ============================================================================
// Individual Test Cases (for better error reporting)
// ============================================================================

#[test]
fn test_center_cell_is_valid() {
    assert!(is_valid_cell(HexCoord::new(0, 0)));
}

#[test]
fn test_corner_at_max_radius_is_valid() {
    assert!(is_valid_cell(HexCoord::new(4, 0)));
}

#[test]
fn test_cell_outside_board_is_invalid() {
    assert!(!is_valid_cell(HexCoord::new(5, 0)));
}

#[test]
fn test_cell_violating_constraint_is_invalid() {
    assert!(!is_valid_cell(HexCoord::new(3, 3)));
}

#[test]
fn test_king_can_move_to_adjacent_empty_cell() {
    let mut board: BoardState = HashMap::new();
    board.insert(
        HexCoord::new(0, 0).to_key(),
        Piece::new(PieceType::King, Color::White),
    );

    let result = validate_move(
        &board,
        HexCoord::new(0, 0),
        HexCoord::new(1, 0),
        Color::White,
    );
    assert!(result.legal);
}

#[test]
fn test_king_cannot_move_two_squares() {
    let mut board: BoardState = HashMap::new();
    board.insert(
        HexCoord::new(0, 0).to_key(),
        Piece::new(PieceType::King, Color::White),
    );

    let result = validate_move(
        &board,
        HexCoord::new(0, 0),
        HexCoord::new(2, 0),
        Color::White,
    );
    assert!(!result.legal);
}

#[test]
fn test_king_can_capture_enemy() {
    let mut board: BoardState = HashMap::new();
    board.insert(
        HexCoord::new(0, 0).to_key(),
        Piece::new(PieceType::King, Color::White),
    );
    board.insert(
        HexCoord::new(1, 0).to_key(),
        Piece::new(PieceType::Pawn, Color::Black),
    );

    let result = validate_move(
        &board,
        HexCoord::new(0, 0),
        HexCoord::new(1, 0),
        Color::White,
    );
    assert!(result.legal);
    assert!(result.capture);
}

#[test]
fn test_queen_can_slide_multiple_squares() {
    let mut board: BoardState = HashMap::new();
    board.insert(
        HexCoord::new(0, 0).to_key(),
        Piece::new(PieceType::Queen, Color::White),
    );

    let result = validate_move(
        &board,
        HexCoord::new(0, 0),
        HexCoord::new(0, -3),
        Color::White,
    );
    assert!(result.legal);
}

#[test]
fn test_queen_cannot_jump_over_pieces() {
    let mut board: BoardState = HashMap::new();
    board.insert(
        HexCoord::new(0, 0).to_key(),
        Piece::new(PieceType::Queen, Color::White),
    );
    board.insert(
        HexCoord::new(0, -1).to_key(),
        Piece::new(PieceType::Pawn, Color::White),
    );

    let result = validate_move(
        &board,
        HexCoord::new(0, 0),
        HexCoord::new(0, -3),
        Color::White,
    );
    assert!(!result.legal);
}

#[test]
fn test_white_pawn_moves_north() {
    let mut board: BoardState = HashMap::new();
    board.insert(
        HexCoord::new(0, 2).to_key(),
        Piece::new(PieceType::Pawn, Color::White),
    );

    let result = validate_move(
        &board,
        HexCoord::new(0, 2),
        HexCoord::new(0, 1),
        Color::White,
    );
    assert!(result.legal);
}

#[test]
fn test_white_pawn_cannot_move_south() {
    let mut board: BoardState = HashMap::new();
    board.insert(
        HexCoord::new(0, 2).to_key(),
        Piece::new(PieceType::Pawn, Color::White),
    );

    let result = validate_move(
        &board,
        HexCoord::new(0, 2),
        HexCoord::new(0, 3),
        Color::White,
    );
    assert!(!result.legal);
}

#[test]
fn test_knight_leaps_to_valid_target() {
    let mut board: BoardState = HashMap::new();
    board.insert(
        HexCoord::new(0, 0).to_key(),
        Piece::new(PieceType::Knight, Color::White),
    );

    let result = validate_move(
        &board,
        HexCoord::new(0, 0),
        HexCoord::new(1, -2),
        Color::White,
    );
    assert!(result.legal);
}

#[test]
fn test_knight_can_jump_over_pieces() {
    let mut board: BoardState = HashMap::new();
    board.insert(
        HexCoord::new(0, 0).to_key(),
        Piece::new(PieceType::Knight, Color::White),
    );
    board.insert(
        HexCoord::new(0, -1).to_key(),
        Piece::new(PieceType::Pawn, Color::White),
    );
    board.insert(
        HexCoord::new(1, -1).to_key(),
        Piece::new(PieceType::Pawn, Color::Black),
    );

    let result = validate_move(
        &board,
        HexCoord::new(0, 0),
        HexCoord::new(1, -2),
        Color::White,
    );
    assert!(result.legal);
}

#[test]
fn test_lance_a_slides_north() {
    let mut board: BoardState = HashMap::new();
    board.insert(
        HexCoord::new(0, 2).to_key(),
        Piece::lance(Color::White, LanceVariant::A),
    );

    let result = validate_move(
        &board,
        HexCoord::new(0, 2),
        HexCoord::new(0, -2),
        Color::White,
    );
    assert!(result.legal);
}

#[test]
fn test_lance_a_cannot_move_ne() {
    let mut board: BoardState = HashMap::new();
    board.insert(
        HexCoord::new(0, 2).to_key(),
        Piece::lance(Color::White, LanceVariant::A),
    );

    let result = validate_move(
        &board,
        HexCoord::new(0, 2),
        HexCoord::new(2, 0),
        Color::White,
    );
    assert!(!result.legal);
}

#[test]
fn test_chariot_slides_ne() {
    let mut board: BoardState = HashMap::new();
    board.insert(
        HexCoord::new(0, 0).to_key(),
        Piece::new(PieceType::Chariot, Color::White),
    );

    let result = validate_move(
        &board,
        HexCoord::new(0, 0),
        HexCoord::new(3, -3),
        Color::White,
    );
    assert!(result.legal);
}

#[test]
fn test_chariot_cannot_move_north() {
    let mut board: BoardState = HashMap::new();
    board.insert(
        HexCoord::new(0, 0).to_key(),
        Piece::new(PieceType::Chariot, Color::White),
    );

    let result = validate_move(
        &board,
        HexCoord::new(0, 0),
        HexCoord::new(0, -2),
        Color::White,
    );
    assert!(!result.legal);
}

#[test]
fn test_king_cannot_move_into_check() {
    let mut board: BoardState = HashMap::new();
    board.insert(
        HexCoord::new(0, 0).to_key(),
        Piece::new(PieceType::King, Color::White),
    );
    board.insert(
        HexCoord::new(1, -4).to_key(),
        Piece::new(PieceType::Queen, Color::Black),
    );

    let result = validate_move(
        &board,
        HexCoord::new(0, 0),
        HexCoord::new(1, 0),
        Color::White,
    );
    assert!(!result.legal);
    assert_eq!(result.reason.as_deref(), Some("movesIntoCheck"));
}

#[test]
fn test_cannot_move_opponents_piece() {
    let mut board: BoardState = HashMap::new();
    board.insert(
        HexCoord::new(0, -2).to_key(),
        Piece::new(PieceType::Pawn, Color::Black),
    );

    let result = validate_move(
        &board,
        HexCoord::new(0, -2),
        HexCoord::new(0, -1),
        Color::White,
    );
    assert!(!result.legal);
    assert_eq!(result.reason.as_deref(), Some("notYourPiece"));
}

#[test]
fn test_cannot_move_from_empty_cell() {
    let mut board: BoardState = HashMap::new();
    board.insert(
        HexCoord::new(0, 0).to_key(),
        Piece::new(PieceType::King, Color::White),
    );

    let result = validate_move(
        &board,
        HexCoord::new(1, 0),
        HexCoord::new(2, 0),
        Color::White,
    );
    assert!(!result.legal);
    assert_eq!(result.reason.as_deref(), Some("noPieceAtSource"));
}

#[test]
fn test_coverage_report() {
    let suite = load_test_suite();

    let board_tests = suite
        .test_cases
        .iter()
        .filter(|tc| matches!(tc, TestCase::BoardValidation(_)))
        .count();

    let move_tests = suite
        .test_cases
        .iter()
        .filter(|tc| matches!(tc, TestCase::MoveValidation(_)))
        .count();

    println!("\n=== Spec Test Coverage Report (Rust) ===");
    println!("Board validation tests: {}", board_tests);
    println!("Move validation tests: {}", move_tests);
    println!("Total spec tests: {}", suite.test_cases.len());
    println!("=========================================\n");

    assert!(suite.test_cases.len() > 0);
}
