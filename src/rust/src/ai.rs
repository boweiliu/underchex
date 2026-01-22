//! Underchex AI - Alpha-Beta Search Implementation
//!
//! Implements:
//! - Piece value evaluation
//! - Positional bonuses (centrality, mobility)
//! - Alpha-beta pruning with move ordering
//! - Transposition table for caching evaluations
//! - Quiescence search for tactical accuracy
//!
//! Signed-by: agent #22 claude-sonnet-4 via opencode 20260122T06:43:39

use std::collections::HashMap;

use crate::board::hex_distance;
use crate::moves::{apply_move, generate_all_legal_moves, is_in_check};
use crate::tablebase::{detect_configuration, get_tablebase_score, probe_tablebase};
use crate::types::BOARD_RADIUS;
use crate::types::{BoardState, Color, HexCoord, Move, Piece, PieceType};

// ============================================================================
// Piece Values
// ============================================================================

/// Base material values for pieces (in centipawns).
pub const PIECE_VALUES: [(PieceType, i32); 6] = [
    (PieceType::Pawn, 100),
    (PieceType::Knight, 300),
    (PieceType::Lance, 450),
    (PieceType::Chariot, 450),
    (PieceType::Queen, 900),
    (PieceType::King, 0),
];

/// Get piece value in centipawns.
pub fn get_piece_value(piece_type: PieceType) -> i32 {
    match piece_type {
        PieceType::Pawn => 100,
        PieceType::Knight => 300,
        PieceType::Lance => 450,
        PieceType::Chariot => 450,
        PieceType::Queen => 900,
        PieceType::King => 0,
    }
}

/// Value for checkmate (high enough to always prefer it).
pub const CHECKMATE_VALUE: i32 = 100000;

/// Value for stalemate (draw).
pub const STALEMATE_VALUE: i32 = 0;

// ============================================================================
// Position Evaluation
// ============================================================================

/// Calculate centrality bonus for a position.
/// Pieces closer to the center are generally stronger on a hex board.
pub fn get_centrality_bonus(coord: HexCoord) -> i32 {
    let center = HexCoord::new(0, 0);
    let distance_from_center = hex_distance(coord, center);
    let centrality_score = BOARD_RADIUS - distance_from_center;
    centrality_score * 5 // 5 centipawns per ring closer to center
}

/// Calculate pawn advancement bonus.
/// Pawns closer to promotion are more valuable.
pub fn get_pawn_advancement_bonus(coord: HexCoord, color: Color) -> i32 {
    let target_r = if color == Color::White {
        -BOARD_RADIUS
    } else {
        BOARD_RADIUS
    };
    let start_r = if color == Color::White {
        BOARD_RADIUS
    } else {
        -BOARD_RADIUS
    };

    let total_distance = (target_r - start_r).abs() as f64;
    let distance_from_start = (coord.r - start_r).abs() as f64;
    let progress = distance_from_start / total_distance;

    (progress * progress * 50.0) as i32
}

/// Get position bonus for a piece.
pub fn get_piece_position_bonus(piece: &Piece, coord: HexCoord) -> i32 {
    let mut bonus = get_centrality_bonus(coord);

    if piece.piece_type == PieceType::Pawn {
        bonus += get_pawn_advancement_bonus(coord, piece.color);
    }

    bonus
}

/// Evaluate material balance for a board position.
/// Returns value from white's perspective in centipawns.
pub fn evaluate_material(board: &BoardState) -> i32 {
    let mut score = 0;

    for (pos_str, piece) in board.iter() {
        let parts: Vec<&str> = pos_str.split(',').collect();
        let q: i32 = parts.get(0).and_then(|s| s.parse().ok()).unwrap_or(0);
        let r: i32 = parts.get(1).and_then(|s| s.parse().ok()).unwrap_or(0);
        let coord = HexCoord::new(q, r);

        let value = get_piece_value(piece.piece_type);
        let position_bonus = get_piece_position_bonus(piece, coord);
        let total_value = value + position_bonus;

        if piece.color == Color::White {
            score += total_value;
        } else {
            score -= total_value;
        }
    }

    score
}

/// Evaluate mobility (number of legal moves).
pub fn evaluate_mobility(board: &BoardState, color: Color) -> i32 {
    let moves = generate_all_legal_moves(board, color);
    (moves.len() * 2) as i32 // 2 centipawns per legal move
}

/// Full position evaluation.
/// Returns value from white's perspective in centipawns.
pub fn evaluate_position(board: &BoardState) -> i32 {
    let mut score = evaluate_material(board);

    // Add mobility difference
    let white_mobility = evaluate_mobility(board, Color::White);
    let black_mobility = evaluate_mobility(board, Color::Black);
    score += white_mobility - black_mobility;

    // Check bonus (being in check is bad)
    if is_in_check(board, Color::White) {
        score -= 50;
    }
    if is_in_check(board, Color::Black) {
        score += 50;
    }

    score
}

/// Evaluate position from the perspective of a specific color.
pub fn evaluate_for_color(board: &BoardState, color: Color) -> i32 {
    let white_score = evaluate_position(board);
    if color == Color::White {
        white_score
    } else {
        -white_score
    }
}

// ============================================================================
// Transposition Table
// ============================================================================

/// Entry type for transposition table.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TTEntryType {
    Exact,
    Lower,
    Upper,
}

/// Transposition table entry.
#[derive(Clone, Debug)]
pub struct TTEntry {
    pub score: i32,
    pub depth: i32,
    pub entry_type: TTEntryType,
    pub best_move: Option<Move>,
}

/// Transposition table - caches position evaluations.
pub struct TranspositionTable {
    table: HashMap<String, TTEntry>,
    max_size: usize,
}

impl TranspositionTable {
    /// Create a new transposition table with given max size.
    pub fn new(max_size: usize) -> Self {
        Self {
            table: HashMap::with_capacity(max_size),
            max_size,
        }
    }

    /// Generate a hash key for a board position.
    pub fn generate_hash(board: &BoardState) -> String {
        let mut pieces: Vec<String> = board
            .iter()
            .map(|(pos_str, piece)| {
                let color_char = if piece.color == Color::White {
                    'w'
                } else {
                    'b'
                };
                let type_char = match piece.piece_type {
                    PieceType::Pawn => 'p',
                    PieceType::Knight => 'n',
                    PieceType::Lance => 'l',
                    PieceType::Chariot => 'c',
                    PieceType::Queen => 'q',
                    PieceType::King => 'k',
                };
                let variant = piece
                    .variant
                    .as_ref()
                    .map(|v| match v {
                        crate::types::LanceVariant::A => "A",
                        crate::types::LanceVariant::B => "B",
                    })
                    .unwrap_or("");
                format!("{}:{}{}{}", pos_str, color_char, type_char, variant)
            })
            .collect();
        pieces.sort();
        pieces.join(",")
    }

    /// Store a position in the transposition table.
    pub fn store(
        &mut self,
        board: &BoardState,
        depth: i32,
        score: i32,
        entry_type: TTEntryType,
        best_move: Option<Move>,
    ) {
        // Simple size management - clear half the table when full
        if self.table.len() >= self.max_size {
            let keys_to_remove: Vec<String> =
                self.table.keys().take(self.max_size / 2).cloned().collect();
            for key in keys_to_remove {
                self.table.remove(&key);
            }
        }

        let hash = Self::generate_hash(board);
        let existing = self.table.get(&hash);

        // Only replace if new entry has equal or greater depth
        if existing.is_none() || existing.unwrap().depth <= depth {
            self.table.insert(
                hash,
                TTEntry {
                    score,
                    depth,
                    entry_type,
                    best_move,
                },
            );
        }
    }

    /// Probe the transposition table for a position.
    pub fn probe(&self, board: &BoardState) -> Option<&TTEntry> {
        let hash = Self::generate_hash(board);
        self.table.get(&hash)
    }

    /// Clear the transposition table.
    pub fn clear(&mut self) {
        self.table.clear();
    }

    /// Get table size.
    pub fn size(&self) -> usize {
        self.table.len()
    }
}

impl Default for TranspositionTable {
    fn default() -> Self {
        Self::new(100000)
    }
}

// ============================================================================
// Move Ordering
// ============================================================================

/// Estimate move value for ordering (higher is better).
pub fn estimate_move_value(mv: &Move) -> i32 {
    let mut score = 0;

    // Captures: MVV-LVA (Most Valuable Victim - Least Valuable Attacker)
    if let Some(captured) = &mv.captured {
        let victim_value = get_piece_value(captured.piece_type);
        let attacker_value = get_piece_value(mv.piece.piece_type);
        score += 10000 + victim_value * 10 - attacker_value;
    }

    // Promotions are very valuable
    if let Some(promotion) = &mv.promotion {
        score += 9000 + get_piece_value(*promotion) - get_piece_value(PieceType::Pawn);
    }

    // Centrality bonus for destination
    score += get_centrality_bonus(mv.to);

    score
}

/// Sort moves by estimated value (best first).
pub fn order_moves(moves: &mut [Move]) {
    moves.sort_by(|a, b| estimate_move_value(b).cmp(&estimate_move_value(a)));
}

// ============================================================================
// Quiescence Search
// ============================================================================

const MAX_QUIESCENCE_DEPTH: i32 = 8;

/// Check if a move is a capture or promotion (tactical move).
pub fn is_tactical_move(mv: &Move) -> bool {
    mv.captured.is_some() || mv.promotion.is_some()
}

/// Generate only tactical moves (captures and promotions).
pub fn generate_tactical_moves(board: &BoardState, color: Color) -> Vec<Move> {
    generate_all_legal_moves(board, color)
        .into_iter()
        .filter(is_tactical_move)
        .collect()
}

/// Quiescence search - extends search until position is "quiet".
pub fn quiescence_search(
    board: &BoardState,
    mut alpha: i32,
    mut beta: i32,
    maximizing: bool,
    stats: &mut SearchStats,
    q_depth: i32,
) -> i32 {
    stats.nodes_searched += 1;
    stats.quiescence_nodes += 1;

    // Stand-pat score (evaluation if we don't make any tactical move)
    let stand_pat = evaluate_position(board);

    if maximizing {
        if stand_pat >= beta {
            return beta;
        }
        alpha = alpha.max(stand_pat);
    } else {
        if stand_pat <= alpha {
            return alpha;
        }
        beta = beta.min(stand_pat);
    }

    // Stop if we've searched too deep in quiescence
    if q_depth >= MAX_QUIESCENCE_DEPTH {
        return stand_pat;
    }

    let color = if maximizing {
        Color::White
    } else {
        Color::Black
    };
    let mut tactical_moves = generate_tactical_moves(board, color);

    // No tactical moves - position is quiet
    if tactical_moves.is_empty() {
        return stand_pat;
    }

    order_moves(&mut tactical_moves);

    if maximizing {
        for mv in &tactical_moves {
            let new_board = apply_move(board, mv);
            let score = quiescence_search(&new_board, alpha, beta, false, stats, q_depth + 1);

            if score >= beta {
                stats.cutoffs += 1;
                return beta;
            }
            alpha = alpha.max(score);
        }
        alpha
    } else {
        for mv in &tactical_moves {
            let new_board = apply_move(board, mv);
            let score = quiescence_search(&new_board, alpha, beta, true, stats, q_depth + 1);

            if score <= alpha {
                stats.cutoffs += 1;
                return alpha;
            }
            beta = beta.min(score);
        }
        beta
    }
}

// ============================================================================
// Alpha-Beta Search
// ============================================================================

/// Search statistics for debugging/tuning.
#[derive(Clone, Debug, Default)]
pub struct SearchStats {
    pub nodes_searched: u64,
    pub cutoffs: u64,
    pub max_depth_reached: i32,
    pub tt_hits: u64,
    pub quiescence_nodes: u64,
}

/// Search result containing best move and evaluation.
#[derive(Clone, Debug)]
pub struct SearchResult {
    pub best_move: Option<Move>,
    pub score: i32,
    pub stats: SearchStats,
}

/// Alpha-beta search with pruning and transposition table.
pub fn alpha_beta(
    board: &BoardState,
    depth: i32,
    mut alpha: i32,
    mut beta: i32,
    maximizing: bool,
    stats: &mut SearchStats,
    tt: &mut TranspositionTable,
    use_quiescence: bool,
) -> i32 {
    stats.nodes_searched += 1;

    let original_alpha = alpha;
    let color = if maximizing {
        Color::White
    } else {
        Color::Black
    };
    let in_check = is_in_check(board, color);

    // Probe transposition table
    if let Some(tt_entry) = tt.probe(board) {
        if tt_entry.depth >= depth {
            stats.tt_hits += 1;
            match tt_entry.entry_type {
                TTEntryType::Exact => return tt_entry.score,
                TTEntryType::Lower => alpha = alpha.max(tt_entry.score),
                TTEntryType::Upper => beta = beta.min(tt_entry.score),
            }

            if alpha >= beta {
                return tt_entry.score;
            }
        }
    }

    let mut moves = generate_all_legal_moves(board, color);

    // Terminal node checks
    if moves.is_empty() {
        if in_check {
            // Checkmate
            return if maximizing {
                -CHECKMATE_VALUE + depth
            } else {
                CHECKMATE_VALUE - depth
            };
        } else {
            // Stalemate
            return STALEMATE_VALUE;
        }
    }

    // Leaf node
    if depth == 0 {
        if use_quiescence {
            return quiescence_search(board, alpha, beta, maximizing, stats, 0);
        }
        return evaluate_position(board);
    }

    // Order moves for better pruning
    // Check if TT has a best move to try first
    let tt_best_move = tt.probe(board).and_then(|e| e.best_move.clone());

    if let Some(ref best_move) = tt_best_move {
        // Put TT best move first
        let best_idx = moves
            .iter()
            .position(|m| m.from == best_move.from && m.to == best_move.to);
        if let Some(idx) = best_idx {
            moves.swap(0, idx);
        }
        order_moves(&mut moves[1..]); // Order the rest
    } else {
        order_moves(&mut moves);
    }

    let mut best_move: Option<Move> = None;

    if maximizing {
        let mut max_eval = -CHECKMATE_VALUE - 1;

        for mv in &moves {
            let new_board = apply_move(board, mv);
            let eval_score = alpha_beta(
                &new_board,
                depth - 1,
                alpha,
                beta,
                false,
                stats,
                tt,
                use_quiescence,
            );

            if eval_score > max_eval {
                max_eval = eval_score;
                best_move = Some(mv.clone());
            }

            alpha = alpha.max(eval_score);

            if beta <= alpha {
                stats.cutoffs += 1;
                break;
            }
        }

        // Store in TT
        let tt_type = if max_eval <= original_alpha {
            TTEntryType::Upper
        } else if max_eval >= beta {
            TTEntryType::Lower
        } else {
            TTEntryType::Exact
        };
        tt.store(board, depth, max_eval, tt_type, best_move);

        max_eval
    } else {
        let mut min_eval = CHECKMATE_VALUE + 1;

        for mv in &moves {
            let new_board = apply_move(board, mv);
            let eval_score = alpha_beta(
                &new_board,
                depth - 1,
                alpha,
                beta,
                true,
                stats,
                tt,
                use_quiescence,
            );

            if eval_score < min_eval {
                min_eval = eval_score;
                best_move = Some(mv.clone());
            }

            beta = beta.min(eval_score);

            if beta <= alpha {
                stats.cutoffs += 1;
                break;
            }
        }

        // Store in TT
        let tt_type = if min_eval >= beta {
            TTEntryType::Lower
        } else if min_eval <= original_alpha {
            TTEntryType::Upper
        } else {
            TTEntryType::Exact
        };
        tt.store(board, depth, min_eval, tt_type, best_move);

        min_eval
    }
}

/// Find the best move for the given color using alpha-beta search.
pub fn find_best_move(
    board: &BoardState,
    color: Color,
    depth: i32,
    tt: &mut TranspositionTable,
    use_quiescence: bool,
) -> SearchResult {
    let mut stats = SearchStats {
        max_depth_reached: depth,
        ..Default::default()
    };

    let mut moves = generate_all_legal_moves(board, color);

    if moves.is_empty() {
        return SearchResult {
            best_move: None,
            score: 0,
            stats,
        };
    }

    let maximizing = color == Color::White;

    // Order moves
    if let Some(tt_entry) = tt.probe(board) {
        if let Some(ref best_move) = tt_entry.best_move {
            let best_idx = moves
                .iter()
                .position(|m| m.from == best_move.from && m.to == best_move.to);
            if let Some(idx) = best_idx {
                moves.swap(0, idx);
            }
            order_moves(&mut moves[1..]);
        } else {
            order_moves(&mut moves);
        }
    } else {
        order_moves(&mut moves);
    }

    let mut best_move = moves[0].clone();
    let mut best_score = if maximizing {
        -CHECKMATE_VALUE - 1
    } else {
        CHECKMATE_VALUE + 1
    };
    let mut alpha = -CHECKMATE_VALUE - 1;
    let mut beta = CHECKMATE_VALUE + 1;

    for mv in &moves {
        let new_board = apply_move(board, mv);
        let eval_score = alpha_beta(
            &new_board,
            depth - 1,
            alpha,
            beta,
            !maximizing,
            &mut stats,
            tt,
            use_quiescence,
        );

        if maximizing {
            if eval_score > best_score {
                best_score = eval_score;
                best_move = mv.clone();
            }
            alpha = alpha.max(eval_score);
        } else {
            if eval_score < best_score {
                best_score = eval_score;
                best_move = mv.clone();
            }
            beta = beta.min(eval_score);
        }
    }

    // Store in TT
    tt.store(
        board,
        depth,
        best_score,
        TTEntryType::Exact,
        Some(best_move.clone()),
    );

    SearchResult {
        best_move: Some(best_move),
        score: best_score,
        stats,
    }
}

/// Find best move using iterative deepening.
pub fn find_best_move_iterative(
    board: &BoardState,
    color: Color,
    max_depth: i32,
    time_limit_ms: u64,
    tt: &mut TranspositionTable,
    use_quiescence: bool,
) -> SearchResult {
    use std::time::Instant;

    let start_time = Instant::now();

    // Track accumulated stats
    let mut total_nodes = 0u64;
    let mut total_cutoffs = 0u64;
    let mut total_tt_hits = 0u64;
    let mut total_q_nodes = 0u64;

    // Get initial move quickly at depth 1
    let initial_result = find_best_move(board, color, 1, tt, use_quiescence);
    let mut best_result = initial_result.clone();
    total_nodes += initial_result.stats.nodes_searched;
    total_cutoffs += initial_result.stats.cutoffs;
    total_tt_hits += initial_result.stats.tt_hits;
    total_q_nodes += initial_result.stats.quiescence_nodes;

    for depth in 2..=max_depth {
        let elapsed = start_time.elapsed().as_millis() as u64;
        if elapsed > time_limit_ms {
            break;
        }

        let result = find_best_move(board, color, depth, tt, use_quiescence);

        if result.best_move.is_some() {
            best_result = result.clone();
            best_result.stats.max_depth_reached = depth;
        }

        total_nodes += result.stats.nodes_searched;
        total_cutoffs += result.stats.cutoffs;
        total_tt_hits += result.stats.tt_hits;
        total_q_nodes += result.stats.quiescence_nodes;
    }

    // Update accumulated stats
    best_result.stats.nodes_searched = total_nodes;
    best_result.stats.cutoffs = total_cutoffs;
    best_result.stats.tt_hits = total_tt_hits;
    best_result.stats.quiescence_nodes = total_q_nodes;

    best_result
}

// ============================================================================
// AI Difficulty Levels
// ============================================================================

/// AI difficulty level.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AIDifficulty {
    Easy,
    Medium,
    Hard,
}

/// Get AI move based on difficulty level.
/// First probes tablebase for endgame positions, then falls back to search.
pub fn get_ai_move(
    board: &BoardState,
    color: Color,
    difficulty: AIDifficulty,
    tt: &mut TranspositionTable,
) -> SearchResult {
    // Try tablebase probe first for endgame positions
    if detect_configuration(board).is_some() {
        let probe_result = probe_tablebase(board, color);
        if probe_result.found {
            if let Some(entry) = &probe_result.entry {
                if let Some(best_move) = &entry.best_move {
                    // Get the piece at the source coordinate
                    let from_coord = HexCoord::new(best_move.from_q, best_move.from_r);
                    let to_coord = HexCoord::new(best_move.to_q, best_move.to_r);
                    let from_key = format!("{},{}", from_coord.q, from_coord.r);

                    if let Some(piece) = board.get(&from_key) {
                        let to_key = format!("{},{}", to_coord.q, to_coord.r);
                        let captured = board.get(&to_key).cloned();

                        let mv = Move {
                            from: from_coord,
                            to: to_coord,
                            piece: piece.clone(),
                            captured,
                            promotion: best_move.promotion,
                        };

                        let score = get_tablebase_score(board, color).unwrap_or(0);

                        return SearchResult {
                            best_move: Some(mv),
                            score,
                            stats: SearchStats::default(),
                        };
                    }
                }
            }
        }
    }

    // Fall back to regular search
    match difficulty {
        AIDifficulty::Easy => find_best_move(board, color, 2, tt, false),
        AIDifficulty::Medium => find_best_move(board, color, 4, tt, true),
        AIDifficulty::Hard => find_best_move_iterative(board, color, 6, 5000, tt, true),
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::game::create_new_game;

    #[test]
    fn test_piece_values() {
        assert_eq!(get_piece_value(PieceType::Pawn), 100);
        assert_eq!(get_piece_value(PieceType::Queen), 900);
        assert_eq!(get_piece_value(PieceType::King), 0);
    }

    #[test]
    fn test_centrality_bonus() {
        let center = HexCoord::new(0, 0);
        let edge = HexCoord::new(4, 0);

        assert!(get_centrality_bonus(center) > get_centrality_bonus(edge));
    }

    #[test]
    fn test_evaluate_starting_position() {
        let game = create_new_game();
        let score = evaluate_position(&game.board);

        // Starting position should be roughly equal (within a small margin)
        assert!(
            score.abs() < 100,
            "Starting position score {} should be near 0",
            score
        );
    }

    #[test]
    fn test_move_ordering() {
        let game = create_new_game();
        let mut moves = generate_all_legal_moves(&game.board, Color::White);

        assert!(!moves.is_empty());
        order_moves(&mut moves);

        // After ordering, moves should have non-increasing estimated values
        for i in 1..moves.len() {
            assert!(
                estimate_move_value(&moves[i - 1]) >= estimate_move_value(&moves[i]),
                "Moves not properly ordered"
            );
        }
    }

    #[test]
    fn test_find_best_move() {
        let game = create_new_game();
        let mut tt = TranspositionTable::new(1000);

        let result = find_best_move(&game.board, Color::White, 2, &mut tt, false);

        assert!(result.best_move.is_some());
        assert!(result.stats.nodes_searched > 0);
    }

    #[test]
    fn test_transposition_table() {
        let game = create_new_game();
        let mut tt = TranspositionTable::new(100);

        // Store an entry
        tt.store(&game.board, 3, 50, TTEntryType::Exact, None);

        // Probe should find it
        let entry = tt.probe(&game.board);
        assert!(entry.is_some());
        assert_eq!(entry.unwrap().score, 50);
        assert_eq!(entry.unwrap().depth, 3);
    }

    #[test]
    fn test_quiescence_search() {
        let game = create_new_game();
        let mut stats = SearchStats::default();

        let score = quiescence_search(
            &game.board,
            -CHECKMATE_VALUE,
            CHECKMATE_VALUE,
            true,
            &mut stats,
            0,
        );

        // Should return a valid score
        assert!(score.abs() < CHECKMATE_VALUE);
        assert!(stats.nodes_searched > 0);
    }

    #[test]
    fn test_ai_difficulty() {
        let game = create_new_game();
        let mut tt = TranspositionTable::new(1000);

        // Easy should be fast
        let easy_result = get_ai_move(&game.board, Color::White, AIDifficulty::Easy, &mut tt);
        assert!(easy_result.best_move.is_some());

        // Medium should search more nodes
        let medium_result = get_ai_move(&game.board, Color::White, AIDifficulty::Medium, &mut tt);
        assert!(medium_result.best_move.is_some());
        assert!(medium_result.stats.nodes_searched >= easy_result.stats.nodes_searched);
    }
}
