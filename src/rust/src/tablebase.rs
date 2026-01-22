//! Underchex Endgame Tablebase Module
//!
//! Provides perfect endgame play for positions with few pieces:
//! - Precomputed Win/Draw/Loss (WDL) tables
//! - Distance to Mate (DTM) information
//! - Retrograde analysis for tablebase generation
//! - Integration with AI search for endgame positions
//!
//! Supported endgames (initial implementation):
//! - KvK (King vs King) - Always draw
//! - KQvK (King+Queen vs King) - Win for the side with queen
//! - KLvK (King+Lance vs King) - Usually win, some draws
//! - KCvK (King+Chariot vs King) - Usually win, some draws
//! - KNvK (King+Knight vs King) - Draw (insufficient material on hex board)
//!
//! Signed-by: agent #35 claude-sonnet-4 via opencode 20260122T09:21:50

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::ai::{TranspositionTable, CHECKMATE_VALUE};
use crate::board::get_all_cells;
use crate::moves::{apply_move, generate_all_legal_moves, is_in_check};
use crate::types::{BoardState, Color, HexCoord, LanceVariant, Move, Piece, PieceType};

// ============================================================================
// Tablebase Types
// ============================================================================

/// Win/Draw/Loss outcome from the perspective of the side to move.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum WDLOutcome {
    Win,
    Draw,
    Loss,
}

/// Entry in the tablebase for a single position.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TablebaseEntry {
    /// Win/Draw/Loss outcome for the side to move
    pub wdl: WDLOutcome,
    /// Distance to mate (plies). 0 for checkmate, -1 for draws, positive for wins
    pub dtm: i32,
    /// Best move from this position (if winning or defending)
    pub best_move: Option<SerializedMove>,
}

/// Serializable move representation for tablebase storage.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SerializedMove {
    pub from_q: i32,
    pub from_r: i32,
    pub to_q: i32,
    pub to_r: i32,
    pub promotion: Option<PieceType>,
}

impl SerializedMove {
    pub fn from_move(mv: &Move) -> Self {
        Self {
            from_q: mv.from.q,
            from_r: mv.from.r,
            to_q: mv.to.q,
            to_r: mv.to.r,
            promotion: mv.promotion,
        }
    }
}

/// Tablebase for a specific piece configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PieceTablebase {
    /// Configuration name (e.g., "KQvK")
    pub name: String,
    /// Piece configuration description
    pub description: String,
    /// Map from position hash to entry
    pub entries: HashMap<String, TablebaseEntry>,
    /// Number of entries
    pub size: usize,
    /// Generation metadata
    pub metadata: TablebaseMetadata,
}

/// Metadata about tablebase generation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TablebaseMetadata {
    pub generated_at: String,
    pub generation_time_ms: u64,
    pub win_count: usize,
    pub draw_count: usize,
    pub loss_count: usize,
}

/// Configuration for which piece configurations to support.
#[derive(Debug, Clone)]
pub struct TablebaseConfig {
    /// Piece types for the stronger side (excluding king)
    pub stronger_side: Vec<PieceType>,
    /// Piece types for the weaker side (excluding king) - usually empty for basic tablebases
    pub weaker_side: Vec<PieceType>,
    /// Name of this configuration
    pub name: String,
}

/// Result of tablebase probe.
#[derive(Debug, Clone)]
pub struct TablebaseProbeResult {
    /// Whether position was found in tablebase
    pub found: bool,
    /// Entry if found
    pub entry: Option<TablebaseEntry>,
    /// Which tablebase was used
    pub tablebase_name: Option<String>,
}

// ============================================================================
// Global Tablebase Storage
// ============================================================================

lazy_static::lazy_static! {
    static ref TABLEBASES: std::sync::Mutex<HashMap<String, PieceTablebase>> =
        std::sync::Mutex::new(HashMap::new());
}

/// Get a tablebase by configuration name.
pub fn get_tablebase(name: &str) -> Option<PieceTablebase> {
    TABLEBASES.lock().ok()?.get(name).cloned()
}

/// Store a tablebase.
pub fn set_tablebase(tablebase: PieceTablebase) {
    if let Ok(mut tablebases) = TABLEBASES.lock() {
        tablebases.insert(tablebase.name.clone(), tablebase);
    }
}

/// Get all loaded tablebase names.
pub fn get_loaded_tablebases() -> Vec<String> {
    TABLEBASES
        .lock()
        .map(|tb| tb.keys().cloned().collect())
        .unwrap_or_default()
}

/// Clear all tablebases.
pub fn clear_tablebases() {
    if let Ok(mut tablebases) = TABLEBASES.lock() {
        tablebases.clear();
    }
}

// ============================================================================
// Position Encoding
// ============================================================================

/// Generate a hash key for tablebase lookup.
/// Uses the same approach as TranspositionTable for consistency.
pub fn get_tablebase_key(board: &BoardState, side_to_move: Color) -> String {
    let hash = TranspositionTable::generate_hash(board);
    let side = match side_to_move {
        Color::White => "w",
        Color::Black => "b",
    };
    format!("{}-{}", hash, side)
}

/// Detect the piece configuration of a position.
/// Returns None if not a supported tablebase configuration.
pub fn detect_configuration(board: &BoardState) -> Option<TablebaseConfig> {
    let mut white_pieces: Vec<PieceType> = Vec::new();
    let mut black_pieces: Vec<PieceType> = Vec::new();

    for piece in board.values() {
        if piece.piece_type == PieceType::King {
            continue;
        }
        if piece.color == Color::White {
            white_pieces.push(piece.piece_type);
        } else {
            black_pieces.push(piece.piece_type);
        }
    }

    // Check for supported configurations
    // KvK
    if white_pieces.is_empty() && black_pieces.is_empty() {
        return Some(TablebaseConfig {
            stronger_side: vec![],
            weaker_side: vec![],
            name: "KvK".to_string(),
        });
    }

    // Determine stronger and weaker sides
    let (stronger_side, weaker_side) = if white_pieces.len() >= black_pieces.len() {
        (white_pieces, black_pieces)
    } else {
        (black_pieces, white_pieces)
    };

    let mut stronger_sorted = stronger_side.clone();
    let mut weaker_sorted = weaker_side.clone();
    stronger_sorted.sort_by_key(|p| piece_abbrev(*p));
    weaker_sorted.sort_by_key(|p| piece_abbrev(*p));

    // Generate configuration name
    let mut name = "K".to_string();
    for p in &stronger_sorted {
        name.push_str(piece_abbrev(*p));
    }
    name.push_str("vK");
    for p in &weaker_sorted {
        name.push_str(piece_abbrev(*p));
    }

    // Check if this configuration is supported (max 5 pieces for now)
    let total_pieces = 2 + stronger_sorted.len() + weaker_sorted.len(); // 2 kings
    if total_pieces > 5 {
        return None; // Too complex for tablebase
    }

    // For now, only support configurations where weaker side has no pieces
    if !weaker_sorted.is_empty() {
        return None; // Future: support KQvKP etc.
    }

    Some(TablebaseConfig {
        stronger_side: stronger_sorted,
        weaker_side: weaker_sorted,
        name,
    })
}

fn piece_abbrev(piece_type: PieceType) -> &'static str {
    match piece_type {
        PieceType::Queen => "Q",
        PieceType::Lance => "L",
        PieceType::Chariot => "C",
        PieceType::Knight => "N",
        PieceType::Pawn => "P",
        PieceType::King => "K",
    }
}

// ============================================================================
// Retrograde Analysis
// ============================================================================

/// Generate all positions for a given piece configuration.
pub fn generate_all_positions(config: &TablebaseConfig) -> Vec<(BoardState, Color)> {
    let mut positions = Vec::new();
    let all_cells = get_all_cells();

    // Enumerate all white king positions
    for white_king_pos in &all_cells {
        // Enumerate all black king positions (must not be adjacent to white king)
        for black_king_pos in &all_cells {
            // Kings cannot be on same cell
            if white_king_pos == black_king_pos {
                continue;
            }

            // Kings cannot be adjacent (would be check)
            let dq = (white_king_pos.q - black_king_pos.q).abs();
            let dr = (white_king_pos.r - black_king_pos.r).abs();
            let ds = ((-white_king_pos.q - white_king_pos.r)
                - (-black_king_pos.q - black_king_pos.r))
                .abs();
            if dq.max(dr).max(ds) <= 1 {
                continue;
            }

            // Generate positions with additional pieces
            let remaining_cells: Vec<HexCoord> = all_cells
                .iter()
                .filter(|c| *c != white_king_pos && *c != black_king_pos)
                .cloned()
                .collect();

            if config.stronger_side.is_empty() {
                // KvK - just yield the position with both sides to move
                for side_to_move in [Color::White, Color::Black] {
                    let mut board = BoardState::new();
                    board.insert(
                        white_king_pos.to_key(),
                        Piece::new(PieceType::King, Color::White),
                    );
                    board.insert(
                        black_king_pos.to_key(),
                        Piece::new(PieceType::King, Color::Black),
                    );

                    if !is_illegal_position(&board, side_to_move) {
                        positions.push((board, side_to_move));
                    }
                }
            } else if config.stronger_side.len() == 1 {
                // K + 1 piece vs K
                let piece_type = config.stronger_side[0];

                for piece_pos in &remaining_cells {
                    for side_to_move in [Color::White, Color::Black] {
                        // Handle lance variants
                        let variants: Vec<Option<LanceVariant>> = if piece_type == PieceType::Lance
                        {
                            vec![Some(LanceVariant::A), Some(LanceVariant::B)]
                        } else {
                            vec![None]
                        };

                        for variant in &variants {
                            let mut board = BoardState::new();
                            board.insert(
                                white_king_pos.to_key(),
                                Piece::new(PieceType::King, Color::White),
                            );
                            board.insert(
                                black_king_pos.to_key(),
                                Piece::new(PieceType::King, Color::Black),
                            );

                            let piece = if let Some(v) = variant {
                                Piece::lance(Color::White, *v)
                            } else {
                                Piece::new(piece_type, Color::White)
                            };
                            board.insert(piece_pos.to_key(), piece);

                            if !is_illegal_position(&board, side_to_move) {
                                positions.push((board, side_to_move));
                            }
                        }
                    }
                }
            }
            // Can extend for more pieces as needed
        }
    }

    positions
}

/// Check if a position is illegal (side NOT to move is in check).
fn is_illegal_position(board: &BoardState, side_to_move: Color) -> bool {
    let opponent = side_to_move.opposite();
    is_in_check(board, opponent)
}

/// Determine the outcome of a terminal position.
fn get_terminal_outcome(board: &BoardState, side_to_move: Color) -> Option<(WDLOutcome, i32)> {
    let moves = generate_all_legal_moves(board, side_to_move);

    if moves.is_empty() {
        if is_in_check(board, side_to_move) {
            // Checkmate - side to move loses
            return Some((WDLOutcome::Loss, 0));
        } else {
            // Stalemate - draw
            return Some((WDLOutcome::Draw, -1));
        }
    }

    None // Not terminal
}

/// Generate a tablebase for a given configuration using retrograde analysis.
pub fn generate_tablebase(config: &TablebaseConfig) -> PieceTablebase {
    use std::time::Instant;
    let start_time = Instant::now();

    let mut tablebase = PieceTablebase {
        name: config.name.clone(),
        description: format!("Endgame tablebase for {}", config.name),
        entries: HashMap::new(),
        size: 0,
        metadata: TablebaseMetadata {
            generated_at: chrono::Utc::now().to_rfc3339(),
            generation_time_ms: 0,
            win_count: 0,
            draw_count: 0,
            loss_count: 0,
        },
    };

    // Phase 1: Initialize all positions and find terminal positions
    let all_positions = generate_all_positions(config);
    let mut position_map: HashMap<String, (BoardState, Color)> = HashMap::new();
    let mut unknown_positions: std::collections::HashSet<String> = std::collections::HashSet::new();

    for (board, side_to_move) in all_positions {
        let key = get_tablebase_key(&board, side_to_move);
        position_map.insert(key.clone(), (board.clone(), side_to_move));

        // Check if terminal
        if let Some((wdl, dtm)) = get_terminal_outcome(&board, side_to_move) {
            tablebase.entries.insert(
                key,
                TablebaseEntry {
                    wdl,
                    dtm,
                    best_move: None,
                },
            );
            match wdl {
                WDLOutcome::Loss => tablebase.metadata.loss_count += 1,
                WDLOutcome::Draw => tablebase.metadata.draw_count += 1,
                WDLOutcome::Win => tablebase.metadata.win_count += 1,
            }
        } else {
            unknown_positions.insert(key);
        }
    }

    // Phase 2: Retrograde analysis
    let max_iterations = 500;
    let mut changed = true;
    let mut iteration = 0;

    while changed && iteration < max_iterations {
        changed = false;
        iteration += 1;

        let mut to_resolve: Vec<String> = Vec::new();

        for key in &unknown_positions {
            let (board, side_to_move) = match position_map.get(key) {
                Some(pos) => pos,
                None => continue,
            };

            let moves = generate_all_legal_moves(board, *side_to_move);

            let mut has_winning_move = false;
            let mut all_moves_lose = true;
            let mut best_move_info: Option<(SerializedMove, i32)> = None;
            let mut max_dtm = 0;

            for mv in &moves {
                let new_board = apply_move(board, mv);
                let new_key = get_tablebase_key(&new_board, side_to_move.opposite());

                let opponent_entry = tablebase.entries.get(&new_key);

                match opponent_entry {
                    None => {
                        // Unknown position - can't conclude yet
                        all_moves_lose = false;
                    }
                    Some(entry) => match entry.wdl {
                        WDLOutcome::Loss => {
                            // Opponent is lost = we win
                            has_winning_move = true;
                            let new_dtm = entry.dtm + 1;
                            if best_move_info.is_none()
                                || new_dtm < best_move_info.as_ref().unwrap().1
                            {
                                best_move_info = Some((SerializedMove::from_move(mv), new_dtm));
                            }
                        }
                        WDLOutcome::Win => {
                            // Opponent wins = this move loses for us
                            max_dtm = max_dtm.max(entry.dtm);
                        }
                        WDLOutcome::Draw => {
                            // Draw - better than losing
                            all_moves_lose = false;
                        }
                    },
                }
            }

            if has_winning_move {
                if let Some((best_move, dtm)) = best_move_info {
                    to_resolve.push(key.clone());
                    tablebase.entries.insert(
                        key.clone(),
                        TablebaseEntry {
                            wdl: WDLOutcome::Win,
                            dtm,
                            best_move: Some(best_move),
                        },
                    );
                    tablebase.metadata.win_count += 1;
                    changed = true;
                }
            } else if all_moves_lose && !moves.is_empty() {
                to_resolve.push(key.clone());
                tablebase.entries.insert(
                    key.clone(),
                    TablebaseEntry {
                        wdl: WDLOutcome::Loss,
                        dtm: max_dtm + 1,
                        best_move: None,
                    },
                );
                tablebase.metadata.loss_count += 1;
                changed = true;
            }
        }

        // Remove resolved positions from unknown set
        for key in to_resolve {
            unknown_positions.remove(&key);
        }
    }

    // Phase 3: All remaining unknown positions are draws
    for key in unknown_positions {
        tablebase.entries.insert(
            key,
            TablebaseEntry {
                wdl: WDLOutcome::Draw,
                dtm: -1,
                best_move: None,
            },
        );
        tablebase.metadata.draw_count += 1;
    }

    tablebase.size = tablebase.entries.len();
    tablebase.metadata.generation_time_ms = start_time.elapsed().as_millis() as u64;

    tablebase
}

// ============================================================================
// Tablebase Probe
// ============================================================================

/// Probe the tablebase for a position.
pub fn probe_tablebase(board: &BoardState, side_to_move: Color) -> TablebaseProbeResult {
    // Detect configuration
    let config = match detect_configuration(board) {
        Some(c) => c,
        None => {
            return TablebaseProbeResult {
                found: false,
                entry: None,
                tablebase_name: None,
            }
        }
    };

    // Get the tablebase for this configuration
    let tablebase = match get_tablebase(&config.name) {
        Some(tb) => tb,
        None => {
            return TablebaseProbeResult {
                found: false,
                entry: None,
                tablebase_name: None,
            }
        }
    };

    // Look up the position
    let key = get_tablebase_key(board, side_to_move);

    if let Some(entry) = tablebase.entries.get(&key) {
        TablebaseProbeResult {
            found: true,
            entry: Some(entry.clone()),
            tablebase_name: Some(config.name),
        }
    } else {
        TablebaseProbeResult {
            found: false,
            entry: None,
            tablebase_name: None,
        }
    }
}

/// Get the tablebase evaluation for a position.
/// Returns a score in centipawns, where positive is good for side_to_move.
pub fn get_tablebase_score(board: &BoardState, side_to_move: Color) -> Option<i32> {
    let result = probe_tablebase(board, side_to_move);

    if !result.found {
        return None;
    }

    let entry = result.entry?;

    Some(match entry.wdl {
        WDLOutcome::Win => CHECKMATE_VALUE - entry.dtm,
        WDLOutcome::Draw => 0,
        WDLOutcome::Loss => -CHECKMATE_VALUE + entry.dtm,
    })
}

// ============================================================================
// Tablebase Initialization
// ============================================================================

/// Generate and load common endgame tablebases.
pub fn initialize_tablebases() {
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
}

/// Generate a single tablebase on demand.
pub fn generate_tablebase_on_demand(name: &str) -> Option<PieceTablebase> {
    // Parse the configuration from the name
    // Format: K[pieces]vK[pieces]
    let re = regex::Regex::new(r"^K([QLCNP]*)vK([QLCNP]*)$").ok()?;
    let caps = re.captures(name)?;

    let piece_map: HashMap<char, PieceType> = [
        ('Q', PieceType::Queen),
        ('L', PieceType::Lance),
        ('C', PieceType::Chariot),
        ('N', PieceType::Knight),
        ('P', PieceType::Pawn),
    ]
    .into_iter()
    .collect();

    let stronger_str = caps.get(1)?.as_str();
    let weaker_str = caps.get(2)?.as_str();

    let stronger_side: Vec<PieceType> = stronger_str
        .chars()
        .filter_map(|c| piece_map.get(&c).copied())
        .collect();

    let weaker_side: Vec<PieceType> = weaker_str
        .chars()
        .filter_map(|c| piece_map.get(&c).copied())
        .collect();

    let config = TablebaseConfig {
        stronger_side,
        weaker_side,
        name: name.to_string(),
    };

    let tablebase = generate_tablebase(&config);
    set_tablebase(tablebase.clone());

    Some(tablebase)
}

// ============================================================================
// Statistics
// ============================================================================

/// Get statistics about loaded tablebases.
pub fn get_tablebase_statistics() -> TablebaseStatistics {
    let tablebases = TABLEBASES.lock().unwrap();

    let mut total_entries = 0;
    let mut stats = Vec::new();

    for (name, tb) in tablebases.iter() {
        total_entries += tb.size;
        stats.push(TablebaseStat {
            name: name.clone(),
            size: tb.size,
            wins: tb.metadata.win_count,
            draws: tb.metadata.draw_count,
            losses: tb.metadata.loss_count,
            generation_time_ms: tb.metadata.generation_time_ms,
        });
    }

    TablebaseStatistics {
        total_entries,
        tablebases: stats,
    }
}

#[derive(Debug, Clone)]
pub struct TablebaseStatistics {
    pub total_entries: usize,
    pub tablebases: Vec<TablebaseStat>,
}

#[derive(Debug, Clone)]
pub struct TablebaseStat {
    pub name: String,
    pub size: usize,
    pub wins: usize,
    pub draws: usize,
    pub losses: usize,
    pub generation_time_ms: u64,
}

/// Format tablebase statistics for display.
pub fn format_tablebase_statistics() -> String {
    let stats = get_tablebase_statistics();

    let mut output = "=== Endgame Tablebase Statistics ===\n\n".to_string();
    output.push_str(&format!("Total entries: {}\n", stats.total_entries));
    output.push_str(&format!(
        "Loaded tablebases: {}\n\n",
        stats.tablebases.len()
    ));

    for tb in &stats.tablebases {
        output.push_str(&format!("{}:\n", tb.name));
        output.push_str(&format!("  Size: {} positions\n", tb.size));
        if tb.size > 0 {
            output.push_str(&format!(
                "  Wins: {} ({:.1}%)\n",
                tb.wins,
                100.0 * tb.wins as f64 / tb.size as f64
            ));
            output.push_str(&format!(
                "  Draws: {} ({:.1}%)\n",
                tb.draws,
                100.0 * tb.draws as f64 / tb.size as f64
            ));
            output.push_str(&format!(
                "  Losses: {} ({:.1}%)\n",
                tb.losses,
                100.0 * tb.losses as f64 / tb.size as f64
            ));
        }
        output.push_str(&format!(
            "  Generation time: {}ms\n\n",
            tb.generation_time_ms
        ));
    }

    output
}

// ============================================================================
// Serialization
// ============================================================================

/// Export a tablebase to JSON string.
pub fn export_tablebase_to_json(tablebase: &PieceTablebase) -> String {
    serde_json::to_string_pretty(tablebase).unwrap_or_else(|_| "{}".to_string())
}

/// Import a tablebase from JSON string.
pub fn import_tablebase_from_json(json: &str) -> Option<PieceTablebase> {
    serde_json::from_str(json).ok()
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    fn create_kvk_position() -> BoardState {
        let mut board = BoardState::new();
        board.insert(
            HexCoord::new(0, 0).to_key(),
            Piece::new(PieceType::King, Color::White),
        );
        board.insert(
            HexCoord::new(3, 0).to_key(),
            Piece::new(PieceType::King, Color::Black),
        );
        board
    }

    fn create_kqvk_position() -> BoardState {
        let mut board = BoardState::new();
        board.insert(
            HexCoord::new(0, 0).to_key(),
            Piece::new(PieceType::King, Color::White),
        );
        board.insert(
            HexCoord::new(1, 0).to_key(),
            Piece::new(PieceType::Queen, Color::White),
        );
        board.insert(
            HexCoord::new(3, 0).to_key(),
            Piece::new(PieceType::King, Color::Black),
        );
        board
    }

    #[test]
    fn test_detect_kvk_configuration() {
        let board = create_kvk_position();
        let config = detect_configuration(&board);
        assert!(config.is_some());
        assert_eq!(config.unwrap().name, "KvK");
    }

    #[test]
    fn test_detect_kqvk_configuration() {
        let board = create_kqvk_position();
        let config = detect_configuration(&board);
        assert!(config.is_some());
        assert_eq!(config.unwrap().name, "KQvK");
    }

    #[test]
    fn test_generate_kvk_tablebase() {
        let config = TablebaseConfig {
            stronger_side: vec![],
            weaker_side: vec![],
            name: "KvK".to_string(),
        };

        let tablebase = generate_tablebase(&config);

        // KvK should have all draws
        assert!(tablebase.size > 0);
        assert_eq!(tablebase.metadata.win_count, 0);
        assert_eq!(tablebase.metadata.loss_count, 0);
        assert!(tablebase.metadata.draw_count > 0);
    }

    #[test]
    fn test_probe_kvk_position() {
        // Generate and store KvK tablebase
        let config = TablebaseConfig {
            stronger_side: vec![],
            weaker_side: vec![],
            name: "KvK".to_string(),
        };
        let tablebase = generate_tablebase(&config);
        set_tablebase(tablebase);

        // Probe a position
        let board = create_kvk_position();
        let result = probe_tablebase(&board, Color::White);

        assert!(result.found);
        assert_eq!(result.entry.unwrap().wdl, WDLOutcome::Draw);
    }

    #[test]
    fn test_tablebase_score_draw() {
        // Generate and store KvK tablebase
        let config = TablebaseConfig {
            stronger_side: vec![],
            weaker_side: vec![],
            name: "KvK".to_string(),
        };
        let tablebase = generate_tablebase(&config);
        set_tablebase(tablebase);

        let board = create_kvk_position();
        let score = get_tablebase_score(&board, Color::White);

        assert!(score.is_some());
        assert_eq!(score.unwrap(), 0); // Draw should be 0
    }

    #[test]
    fn test_tablebase_statistics() {
        clear_tablebases();

        let config = TablebaseConfig {
            stronger_side: vec![],
            weaker_side: vec![],
            name: "KvK".to_string(),
        };
        let tablebase = generate_tablebase(&config);
        set_tablebase(tablebase);

        let stats = get_tablebase_statistics();
        assert!(stats.total_entries > 0);
        assert_eq!(stats.tablebases.len(), 1);
    }

    #[test]
    fn test_generate_tablebase_on_demand() {
        clear_tablebases();

        let tablebase = generate_tablebase_on_demand("KvK");
        assert!(tablebase.is_some());
        assert_eq!(tablebase.unwrap().name, "KvK");

        // Should now be in loaded tablebases
        let loaded = get_loaded_tablebases();
        assert!(loaded.contains(&"KvK".to_string()));
    }

    #[test]
    fn test_serialization_roundtrip() {
        let config = TablebaseConfig {
            stronger_side: vec![],
            weaker_side: vec![],
            name: "KvK".to_string(),
        };
        let tablebase = generate_tablebase(&config);

        let json = export_tablebase_to_json(&tablebase);
        let restored = import_tablebase_from_json(&json);

        assert!(restored.is_some());
        let restored = restored.unwrap();
        assert_eq!(restored.name, tablebase.name);
        assert_eq!(restored.size, tablebase.size);
    }
}
