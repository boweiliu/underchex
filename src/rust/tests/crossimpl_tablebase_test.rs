//! Cross-Implementation Tablebase Test Runner
//!
//! Runs test cases from spec/tests/tablebase_validation.json to verify
//! Rust tablebase implementation matches the shared spec.
//!
//! NOTE: Full tablebase tests are SLOW and skipped by default.
//! Run with FULL_TABLEBASE=1 to enable all tests.
//!
//! Signed-by: agent #42 claude-sonnet-4 via opencode 20260122T10:47:57

use serde::Deserialize;
use std::collections::HashMap;
use std::env;
use std::fs;
use std::path::Path;

// Import from the crate
use underchex_wasm::{
    apply_move, generate_all_legal_moves, BoardState, Color, HexCoord, LanceVariant, Piece,
    PieceType,
};

// Import tablebase functions
use underchex_wasm::tablebase::{
    clear_tablebases, detect_configuration, generate_tablebase, get_loaded_tablebases,
    probe_tablebase, set_tablebase, TablebaseConfig, WDLOutcome,
};

// ============================================================================
// Test Case Structures (matching JSON spec)
// ============================================================================

#[derive(Debug, Deserialize)]
struct TablebaseTestSuite {
    #[serde(rename = "testCases")]
    test_cases: Vec<TablebaseTestCase>,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
enum TablebaseTestCase {
    #[serde(rename = "tablebaseConfig")]
    Config(TablebaseConfigCase),
    #[serde(rename = "tablebaseWDL")]
    WDL(TablebaseWDLCase),
    #[serde(rename = "tablebaseMove")]
    Move(TablebaseMoveCase),
}

#[derive(Debug, Deserialize)]
struct TablebaseConfigCase {
    id: String,
    description: String,
    setup: SetupConfig,
    expected: ConfigExpected,
}

#[derive(Debug, Deserialize)]
struct TablebaseWDLCase {
    id: String,
    description: String,
    setup: SetupWithTurn,
    expected: WDLExpected,
}

#[derive(Debug, Deserialize)]
struct TablebaseMoveCase {
    id: String,
    description: String,
    setup: SetupWithTurn,
    expected: MoveExpected,
}

#[derive(Debug, Deserialize)]
struct SetupConfig {
    pieces: Vec<PiecePlacement>,
}

#[derive(Debug, Deserialize)]
struct SetupWithTurn {
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
struct ConfigExpected {
    config: Option<String>,
    supported: bool,
}

#[derive(Debug, Deserialize)]
struct WDLExpected {
    wdl: String,
    dtm: Option<i32>,
}

#[derive(Debug, Deserialize)]
struct MoveExpected {
    #[serde(rename = "hasMove")]
    has_move: bool,
    #[serde(rename = "preservesWin")]
    preserves_win: Option<bool>,
}

// ============================================================================
// Helper Functions
// ============================================================================

fn load_test_suite() -> TablebaseTestSuite {
    let spec_path = Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .parent()
        .unwrap()
        .join("spec")
        .join("tests")
        .join("tablebase_validation.json");

    let content = fs::read_to_string(&spec_path)
        .unwrap_or_else(|e| panic!("Failed to read spec file at {:?}: {}", spec_path, e));

    serde_json::from_str(&content).expect("Failed to parse spec JSON")
}

fn is_full_tablebase_enabled() -> bool {
    env::var("FULL_TABLEBASE")
        .map(|v| v == "1")
        .unwrap_or(false)
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

fn build_board_from_spec(pieces: &[PiecePlacement]) -> BoardState {
    let mut board: BoardState = HashMap::new();

    for placement in pieces {
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

fn wdl_to_string(wdl: WDLOutcome) -> &'static str {
    match wdl {
        WDLOutcome::Win => "win",
        WDLOutcome::Draw => "draw",
        WDLOutcome::Loss => "loss",
    }
}

fn initialize_test_tablebases(full: bool) {
    clear_tablebases();

    if full {
        // Generate all tablebases for full tests
        let configs = vec![
            TablebaseConfig {
                stronger_side: vec![],
                weaker_side: vec![],
                name: "KvK".to_string(),
            },
            TablebaseConfig {
                stronger_side: vec![PieceType::Queen],
                weaker_side: vec![],
                name: "KQvK".to_string(),
            },
            TablebaseConfig {
                stronger_side: vec![PieceType::Lance],
                weaker_side: vec![],
                name: "KLvK".to_string(),
            },
            TablebaseConfig {
                stronger_side: vec![PieceType::Chariot],
                weaker_side: vec![],
                name: "KCvK".to_string(),
            },
            TablebaseConfig {
                stronger_side: vec![PieceType::Knight],
                weaker_side: vec![],
                name: "KNvK".to_string(),
            },
        ];

        for config in configs {
            let tablebase = generate_tablebase(&config);
            set_tablebase(tablebase);
        }
    } else {
        // Only generate KvK for fast tests
        let kvk_config = TablebaseConfig {
            stronger_side: vec![],
            weaker_side: vec![],
            name: "KvK".to_string(),
        };
        let kvk_tablebase = generate_tablebase(&kvk_config);
        set_tablebase(kvk_tablebase);
    }
}

// ============================================================================
// Tests - Configuration Detection
// ============================================================================

#[test]
fn test_tablebase_config_detection_from_spec() {
    let suite = load_test_suite();
    let mut count = 0;

    for tc in &suite.test_cases {
        if let TablebaseTestCase::Config(case) = tc {
            let board = build_board_from_spec(&case.setup.pieces);
            let config = detect_configuration(&board);

            if case.expected.supported {
                assert!(
                    config.is_some(),
                    "{}: {} - should be supported but got None",
                    case.id,
                    case.description
                );
                if let Some(expected_name) = &case.expected.config {
                    assert_eq!(
                        config.as_ref().unwrap().name,
                        *expected_name,
                        "{}: {} - config name mismatch",
                        case.id,
                        case.description
                    );
                }
            } else {
                // Not supported means either null config or complex position
                let is_unsupported = config.is_none()
                    || config
                        .as_ref()
                        .map(|c| c.stronger_side.len() > 2)
                        .unwrap_or(false);
                assert!(
                    is_unsupported,
                    "{}: {} - should not be supported",
                    case.id, case.description
                );
            }
            count += 1;
        }
    }

    println!("Tablebase config detection tests passed: {}", count);
    assert!(count > 0, "No tablebase config tests found");
}

#[test]
fn test_tb_config_001_kvk_detection() {
    let board = build_board_from_spec(&[
        PiecePlacement {
            piece: "king".to_string(),
            color: "white".to_string(),
            q: 0,
            r: 0,
            variant: None,
        },
        PiecePlacement {
            piece: "king".to_string(),
            color: "black".to_string(),
            q: 0,
            r: -3,
            variant: None,
        },
    ]);

    let config = detect_configuration(&board);
    assert!(config.is_some());
    assert_eq!(config.unwrap().name, "KvK");
}

#[test]
fn test_tb_config_002_kqvk_detection() {
    let board = build_board_from_spec(&[
        PiecePlacement {
            piece: "king".to_string(),
            color: "white".to_string(),
            q: 0,
            r: 0,
            variant: None,
        },
        PiecePlacement {
            piece: "queen".to_string(),
            color: "white".to_string(),
            q: 2,
            r: 0,
            variant: None,
        },
        PiecePlacement {
            piece: "king".to_string(),
            color: "black".to_string(),
            q: 0,
            r: -3,
            variant: None,
        },
    ]);

    let config = detect_configuration(&board);
    assert!(config.is_some());
    assert_eq!(config.unwrap().name, "KQvK");
}

#[test]
fn test_tb_config_003_kqvk_black_queen() {
    let board = build_board_from_spec(&[
        PiecePlacement {
            piece: "king".to_string(),
            color: "white".to_string(),
            q: 0,
            r: 0,
            variant: None,
        },
        PiecePlacement {
            piece: "queen".to_string(),
            color: "black".to_string(),
            q: 2,
            r: 0,
            variant: None,
        },
        PiecePlacement {
            piece: "king".to_string(),
            color: "black".to_string(),
            q: 0,
            r: -3,
            variant: None,
        },
    ]);

    let config = detect_configuration(&board);
    assert!(config.is_some());
    // Black having queen still detects as KQvK (color-agnostic)
    assert_eq!(config.unwrap().name, "KQvK");
}

// ============================================================================
// Tests - WDL Lookups (Fast - KvK only)
// ============================================================================

#[test]
fn test_tb_wdl_001_kvk_is_draw_for_white() {
    initialize_test_tablebases(false);

    let board = build_board_from_spec(&[
        PiecePlacement {
            piece: "king".to_string(),
            color: "white".to_string(),
            q: 0,
            r: 0,
            variant: None,
        },
        PiecePlacement {
            piece: "king".to_string(),
            color: "black".to_string(),
            q: 0,
            r: -3,
            variant: None,
        },
    ]);

    let result = probe_tablebase(&board, Color::White);
    assert!(result.found, "Should find KvK position in tablebase");
    assert_eq!(
        result.entry.as_ref().unwrap().wdl,
        WDLOutcome::Draw,
        "KvK should be draw"
    );
}

#[test]
fn test_tb_wdl_002_kvk_is_draw_for_black() {
    initialize_test_tablebases(false);

    let board = build_board_from_spec(&[
        PiecePlacement {
            piece: "king".to_string(),
            color: "white".to_string(),
            q: 0,
            r: 0,
            variant: None,
        },
        PiecePlacement {
            piece: "king".to_string(),
            color: "black".to_string(),
            q: 0,
            r: -3,
            variant: None,
        },
    ]);

    let result = probe_tablebase(&board, Color::Black);
    assert!(result.found, "Should find KvK position in tablebase");
    assert_eq!(
        result.entry.as_ref().unwrap().wdl,
        WDLOutcome::Draw,
        "KvK should be draw for black too"
    );
}

// ============================================================================
// Tests - WDL Lookups (Full - requires FULL_TABLEBASE=1)
// ============================================================================

#[test]
fn test_tablebase_wdl_from_spec_full() {
    if !is_full_tablebase_enabled() {
        println!("Skipping full tablebase WDL tests (FULL_TABLEBASE not set)");
        return;
    }

    initialize_test_tablebases(true);
    let suite = load_test_suite();
    let mut count = 0;

    for tc in &suite.test_cases {
        if let TablebaseTestCase::WDL(case) = tc {
            let board = build_board_from_spec(&case.setup.pieces);
            let turn = string_to_color(&case.setup.turn);

            let result = probe_tablebase(&board, turn);

            assert!(
                result.found,
                "{}: {} - should find position in tablebase",
                case.id, case.description
            );

            let actual_wdl = wdl_to_string(result.entry.as_ref().unwrap().wdl);
            assert_eq!(
                actual_wdl, case.expected.wdl,
                "{}: {} - WDL mismatch (expected {}, got {})",
                case.id, case.description, case.expected.wdl, actual_wdl
            );

            if let Some(expected_dtm) = case.expected.dtm {
                assert_eq!(
                    result.entry.as_ref().unwrap().dtm,
                    expected_dtm,
                    "{}: {} - DTM mismatch",
                    case.id,
                    case.description
                );
            }

            count += 1;
        }
    }

    println!("Tablebase WDL tests passed: {}", count);
}

#[test]
fn test_tb_wdl_003_kqvk_queen_side_wins() {
    if !is_full_tablebase_enabled() {
        println!("Skipping (FULL_TABLEBASE not set)");
        return;
    }

    initialize_test_tablebases(true);

    let board = build_board_from_spec(&[
        PiecePlacement {
            piece: "king".to_string(),
            color: "white".to_string(),
            q: 0,
            r: 0,
            variant: None,
        },
        PiecePlacement {
            piece: "queen".to_string(),
            color: "white".to_string(),
            q: 2,
            r: 0,
            variant: None,
        },
        PiecePlacement {
            piece: "king".to_string(),
            color: "black".to_string(),
            q: 0,
            r: -4,
            variant: None,
        },
    ]);

    let result = probe_tablebase(&board, Color::White);
    assert!(result.found);
    assert_eq!(result.entry.as_ref().unwrap().wdl, WDLOutcome::Win);
}

#[test]
fn test_tb_wdl_004_kqvk_lone_king_loses() {
    if !is_full_tablebase_enabled() {
        println!("Skipping (FULL_TABLEBASE not set)");
        return;
    }

    initialize_test_tablebases(true);

    let board = build_board_from_spec(&[
        PiecePlacement {
            piece: "king".to_string(),
            color: "white".to_string(),
            q: 0,
            r: 0,
            variant: None,
        },
        PiecePlacement {
            piece: "queen".to_string(),
            color: "white".to_string(),
            q: 2,
            r: 0,
            variant: None,
        },
        PiecePlacement {
            piece: "king".to_string(),
            color: "black".to_string(),
            q: 0,
            r: -4,
            variant: None,
        },
    ]);

    let result = probe_tablebase(&board, Color::Black);
    assert!(result.found);
    assert_eq!(result.entry.as_ref().unwrap().wdl, WDLOutcome::Loss);
}

#[test]
fn test_tb_wdl_006_knvk_is_draw() {
    if !is_full_tablebase_enabled() {
        println!("Skipping (FULL_TABLEBASE not set)");
        return;
    }

    initialize_test_tablebases(true);

    let board = build_board_from_spec(&[
        PiecePlacement {
            piece: "king".to_string(),
            color: "white".to_string(),
            q: 0,
            r: 0,
            variant: None,
        },
        PiecePlacement {
            piece: "knight".to_string(),
            color: "white".to_string(),
            q: 2,
            r: 0,
            variant: None,
        },
        PiecePlacement {
            piece: "king".to_string(),
            color: "black".to_string(),
            q: 0,
            r: -3,
            variant: None,
        },
    ]);

    let result = probe_tablebase(&board, Color::White);
    assert!(result.found);
    assert_eq!(
        result.entry.as_ref().unwrap().wdl,
        WDLOutcome::Draw,
        "Knight alone cannot checkmate"
    );
}

// ============================================================================
// Tests - Move Suggestions
// ============================================================================

#[test]
fn test_tb_move_002_kvk_no_winning_move() {
    initialize_test_tablebases(false);

    let board = build_board_from_spec(&[
        PiecePlacement {
            piece: "king".to_string(),
            color: "white".to_string(),
            q: 0,
            r: 0,
            variant: None,
        },
        PiecePlacement {
            piece: "king".to_string(),
            color: "black".to_string(),
            q: 0,
            r: -3,
            variant: None,
        },
    ]);

    // For KvK, there's no winning move - it's always a draw
    let result = probe_tablebase(&board, Color::White);
    assert_eq!(result.entry.as_ref().unwrap().wdl, WDLOutcome::Draw);
    // Draw positions may or may not have a best_move, but the WDL must be draw
}

#[test]
fn test_tablebase_move_from_spec_full() {
    if !is_full_tablebase_enabled() {
        println!("Skipping full tablebase move tests (FULL_TABLEBASE not set)");
        return;
    }

    initialize_test_tablebases(true);
    let suite = load_test_suite();
    let mut count = 0;

    for tc in &suite.test_cases {
        if let TablebaseTestCase::Move(case) = tc {
            let board = build_board_from_spec(&case.setup.pieces);
            let turn = string_to_color(&case.setup.turn);

            let result = probe_tablebase(&board, turn);

            if case.expected.has_move {
                // If we expect a winning move, the position should be winning
                // and should have a best_move
                assert!(
                    result.found,
                    "{}: {} - should find position in tablebase",
                    case.id, case.description
                );

                let entry = result.entry.as_ref().unwrap();

                if case.expected.preserves_win.unwrap_or(false) {
                    assert_eq!(
                        entry.wdl,
                        WDLOutcome::Win,
                        "{}: {} - should be winning position",
                        case.id,
                        case.description
                    );

                    // Should have a best move
                    assert!(
                        entry.best_move.is_some(),
                        "{}: {} - winning position should have best move",
                        case.id,
                        case.description
                    );

                    // Verify the move preserves win
                    if let Some(ref best_move) = entry.best_move {
                        // Reconstruct the move
                        let from = HexCoord::new(best_move.from_q, best_move.from_r);
                        let to = HexCoord::new(best_move.to_q, best_move.to_r);

                        // Find the matching legal move
                        let legal_moves = generate_all_legal_moves(&board, turn);
                        let matching_move = legal_moves.iter().find(|m| {
                            m.from.q == from.q
                                && m.from.r == from.r
                                && m.to.q == to.q
                                && m.to.r == to.r
                        });

                        assert!(
                            matching_move.is_some(),
                            "{}: {} - best move should be legal",
                            case.id,
                            case.description
                        );

                        // Apply the move and check opponent is losing
                        let new_board = apply_move(&board, matching_move.unwrap());
                        let opponent_turn = turn.opposite();
                        let new_result = probe_tablebase(&new_board, opponent_turn);

                        assert!(
                            new_result.found,
                            "{}: {} - resulting position should be in tablebase",
                            case.id, case.description
                        );
                        assert_eq!(
                            new_result.entry.as_ref().unwrap().wdl,
                            WDLOutcome::Loss,
                            "{}: {} - opponent should be losing after our winning move",
                            case.id,
                            case.description
                        );
                    }
                }
            } else {
                // No move expected - position should be a draw
                assert!(result.found);
                assert_eq!(
                    result.entry.as_ref().unwrap().wdl,
                    WDLOutcome::Draw,
                    "{}: {} - should be draw if no winning move",
                    case.id,
                    case.description
                );
            }

            count += 1;
        }
    }

    println!("Tablebase move tests passed: {}", count);
}

// ============================================================================
// Tests - Symmetry
// ============================================================================

#[test]
fn test_tb_symmetric_001_black_queen_wins() {
    if !is_full_tablebase_enabled() {
        println!("Skipping (FULL_TABLEBASE not set)");
        return;
    }

    initialize_test_tablebases(true);

    let board = build_board_from_spec(&[
        PiecePlacement {
            piece: "king".to_string(),
            color: "white".to_string(),
            q: 0,
            r: 4,
            variant: None,
        },
        PiecePlacement {
            piece: "queen".to_string(),
            color: "black".to_string(),
            q: 2,
            r: 0,
            variant: None,
        },
        PiecePlacement {
            piece: "king".to_string(),
            color: "black".to_string(),
            q: 0,
            r: 0,
            variant: None,
        },
    ]);

    let result = probe_tablebase(&board, Color::Black);
    assert!(result.found);
    assert_eq!(result.entry.as_ref().unwrap().wdl, WDLOutcome::Win);
}

#[test]
fn test_tb_symmetric_002_white_king_loses() {
    if !is_full_tablebase_enabled() {
        println!("Skipping (FULL_TABLEBASE not set)");
        return;
    }

    initialize_test_tablebases(true);

    let board = build_board_from_spec(&[
        PiecePlacement {
            piece: "king".to_string(),
            color: "white".to_string(),
            q: 0,
            r: 4,
            variant: None,
        },
        PiecePlacement {
            piece: "queen".to_string(),
            color: "black".to_string(),
            q: 2,
            r: 0,
            variant: None,
        },
        PiecePlacement {
            piece: "king".to_string(),
            color: "black".to_string(),
            q: 0,
            r: 0,
            variant: None,
        },
    ]);

    let result = probe_tablebase(&board, Color::White);
    assert!(result.found);
    assert_eq!(result.entry.as_ref().unwrap().wdl, WDLOutcome::Loss);
}

// ============================================================================
// Coverage Report
// ============================================================================

#[test]
fn test_tablebase_coverage_report() {
    initialize_test_tablebases(is_full_tablebase_enabled());
    let suite = load_test_suite();

    let config_tests = suite
        .test_cases
        .iter()
        .filter(|tc| matches!(tc, TablebaseTestCase::Config(_)))
        .count();

    let wdl_tests = suite
        .test_cases
        .iter()
        .filter(|tc| matches!(tc, TablebaseTestCase::WDL(_)))
        .count();

    let move_tests = suite
        .test_cases
        .iter()
        .filter(|tc| matches!(tc, TablebaseTestCase::Move(_)))
        .count();

    let loaded = get_loaded_tablebases();

    println!("\n=== Tablebase Spec Test Coverage Report (Rust) ===");
    println!("Configuration detection tests: {}", config_tests);
    println!("WDL lookup tests: {}", wdl_tests);
    println!("Move suggestion tests: {}", move_tests);
    println!("Total tablebase spec tests: {}", suite.test_cases.len());
    println!("Loaded tablebases: {}", loaded.join(", "));
    println!(
        "Full tablebase mode: {}",
        if is_full_tablebase_enabled() {
            "ENABLED"
        } else {
            "disabled"
        }
    );
    println!("====================================================\n");

    assert!(suite.test_cases.len() > 0);
}
