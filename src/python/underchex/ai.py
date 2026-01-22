"""
Underchex AI - Alpha-Beta Search Implementation

Implements:
- Piece value evaluation
- Positional bonuses
- Alpha-beta pruning with iterative deepening
- Move ordering for better pruning
- Transposition table for caching evaluations
- Quiescence search for tactical accuracy

Signed-by: agent #17 claude-sonnet-4 via opencode 20260122T05:47:09
"""

from dataclasses import dataclass
from typing import Optional, Literal
import time

from .types import (
    HexCoord,
    Piece,
    PieceType,
    Color,
    BoardState,
    Move,
    BOARD_RADIUS,
    coord_to_string,
    opposite_color,
)

from .moves import (
    generate_all_legal_moves,
    apply_move,
    is_in_check,
    get_piece_at,
)

from .board import hex_distance

# ============================================================================
# Piece Values
# ============================================================================

PIECE_VALUES: dict[PieceType, int] = {
    "pawn": 100,
    "knight": 300,
    "lance": 450,
    "chariot": 450,
    "queen": 900,
    "king": 0,
}

CHECKMATE_VALUE = 100000
STALEMATE_VALUE = 0

# ============================================================================
# Position Evaluation
# ============================================================================

def get_centrality_bonus(coord: HexCoord) -> int:
    """
    Calculate centrality bonus for a position.
    Pieces closer to the center are generally stronger.
    """
    center = HexCoord(q=0, r=0)
    distance_from_center = hex_distance(coord, center)
    centrality_score = BOARD_RADIUS - distance_from_center
    return centrality_score * 5  # 5 centipawns per ring closer to center


def get_pawn_advancement_bonus(coord: HexCoord, color: Color) -> int:
    """Calculate bonus for advanced pawns."""
    target_r = -BOARD_RADIUS if color == "white" else BOARD_RADIUS
    start_r = BOARD_RADIUS if color == "white" else -BOARD_RADIUS
    
    total_distance = abs(target_r - start_r)
    distance_from_start = abs(coord.r - start_r)
    progress = distance_from_start / total_distance
    
    return int(progress * progress * 50)


def evaluate_material(board: BoardState) -> int:
    """
    Evaluate material balance for a board position.
    Returns value from white's perspective in centipawns.
    """
    score = 0
    
    for pos_str, piece in board.items():
        parts = pos_str.split(",")
        q = int(parts[0]) if len(parts) > 0 else 0
        r = int(parts[1]) if len(parts) > 1 else 0
        coord = HexCoord(q=q, r=r)
        
        value = PIECE_VALUES[piece.type]
        position_bonus = get_centrality_bonus(coord)
        
        if piece.type == "pawn":
            position_bonus += get_pawn_advancement_bonus(coord, piece.color)
        
        total_value = value + position_bonus
        
        if piece.color == "white":
            score += total_value
        else:
            score -= total_value
    
    return score


def evaluate_mobility(board: BoardState, color: Color) -> int:
    """Evaluate mobility (number of legal moves)."""
    moves = generate_all_legal_moves(board, color)
    return len(moves) * 2  # 2 centipawns per legal move


def evaluate_position(board: BoardState) -> int:
    """
    Full position evaluation.
    Returns value from white's perspective in centipawns.
    """
    score = evaluate_material(board)
    
    # Add mobility difference
    white_mobility = evaluate_mobility(board, "white")
    black_mobility = evaluate_mobility(board, "black")
    score += white_mobility - black_mobility
    
    # Check bonus (being in check is bad)
    if is_in_check(board, "white"):
        score -= 50
    if is_in_check(board, "black"):
        score += 50
    
    return score


def evaluate_for_color(board: BoardState, color: Color) -> int:
    """Evaluate position from the perspective of a specific color."""
    white_score = evaluate_position(board)
    return white_score if color == "white" else -white_score


# ============================================================================
# Transposition Table
# ============================================================================

TTEntryType = Literal["exact", "lower", "upper"]


@dataclass
class TTEntry:
    """Transposition table entry."""
    score: int
    depth: int
    type: TTEntryType
    best_move: Optional[Move]


_transposition_table: dict[str, TTEntry] = {}
MAX_TT_SIZE = 100000


def generate_board_hash(board: BoardState) -> str:
    """Generate a hash key for a board position."""
    pieces = []
    for pos_str, piece in board.items():
        variant_str = piece.variant or ""
        pieces.append(f"{pos_str}:{piece.color[0]}{piece.type[0]}{variant_str}")
    pieces.sort()
    return ",".join(pieces)


def tt_store(
    board: BoardState,
    depth: int,
    score: int,
    entry_type: TTEntryType,
    best_move: Optional[Move]
) -> None:
    """Store a position in the transposition table."""
    global _transposition_table
    
    if len(_transposition_table) >= MAX_TT_SIZE:
        # Simple size management - clear half the table when full
        keys = list(_transposition_table.keys())[:MAX_TT_SIZE // 2]
        for key in keys:
            del _transposition_table[key]
    
    hash_key = generate_board_hash(board)
    existing = _transposition_table.get(hash_key)
    
    if existing is None or existing.depth <= depth:
        _transposition_table[hash_key] = TTEntry(score, depth, entry_type, best_move)


def tt_probe(board: BoardState) -> Optional[TTEntry]:
    """Probe the transposition table for a position."""
    hash_key = generate_board_hash(board)
    return _transposition_table.get(hash_key)


def tt_clear() -> None:
    """Clear the transposition table."""
    global _transposition_table
    _transposition_table.clear()


# ============================================================================
# Move Ordering
# ============================================================================

def estimate_move_value(move: Move) -> int:
    """
    Estimate move value for ordering (higher is better).
    Good move ordering improves alpha-beta pruning efficiency.
    """
    score = 0
    
    # Captures: MVV-LVA (Most Valuable Victim - Least Valuable Attacker)
    if move.captured is not None:
        victim_value = PIECE_VALUES[move.captured.type]
        attacker_value = PIECE_VALUES[move.piece.type]
        score += 10000 + victim_value * 10 - attacker_value
    
    # Promotions are very valuable
    if move.promotion is not None:
        score += 9000 + PIECE_VALUES[move.promotion] - PIECE_VALUES["pawn"]
    
    # Centrality bonus for destination
    score += get_centrality_bonus(move.to_coord)
    
    return score


def order_moves(moves: list[Move]) -> list[Move]:
    """Sort moves by estimated value (best first)."""
    return sorted(moves, key=estimate_move_value, reverse=True)


# ============================================================================
# Quiescence Search
# ============================================================================

MAX_QUIESCENCE_DEPTH = 8


def is_tactical_move(move: Move) -> bool:
    """Check if a move is a capture or promotion (tactical move)."""
    return move.captured is not None or move.promotion is not None


def generate_tactical_moves(board: BoardState, color: Color) -> list[Move]:
    """Generate only tactical moves (captures and promotions)."""
    all_moves = generate_all_legal_moves(board, color)
    return [m for m in all_moves if is_tactical_move(m)]


def quiescence_search(
    board: BoardState,
    alpha: int,
    beta: int,
    maximizing: bool,
    stats: "SearchStats",
    q_depth: int = 0
) -> int:
    """
    Quiescence search - extends search until position is "quiet".
    Prevents horizon effect where the AI misses obvious captures.
    """
    stats.nodes_searched += 1
    stats.quiescence_nodes += 1
    
    # Stand-pat score (evaluation if we don't make any tactical move)
    stand_pat = evaluate_position(board)
    
    if maximizing:
        if stand_pat >= beta:
            return beta
        alpha = max(alpha, stand_pat)
    else:
        if stand_pat <= alpha:
            return alpha
        beta = min(beta, stand_pat)
    
    # Stop if we've searched too deep in quiescence
    if q_depth >= MAX_QUIESCENCE_DEPTH:
        return stand_pat
    
    color: Color = "white" if maximizing else "black"
    tactical_moves = generate_tactical_moves(board, color)
    
    # No tactical moves - position is quiet
    if len(tactical_moves) == 0:
        return stand_pat
    
    ordered_moves = order_moves(tactical_moves)
    
    if maximizing:
        for move in ordered_moves:
            new_board = apply_move(board, move)
            score = quiescence_search(new_board, alpha, beta, False, stats, q_depth + 1)
            
            if score >= beta:
                stats.cutoffs += 1
                return beta
            alpha = max(alpha, score)
        return alpha
    else:
        for move in ordered_moves:
            new_board = apply_move(board, move)
            score = quiescence_search(new_board, alpha, beta, True, stats, q_depth + 1)
            
            if score <= alpha:
                stats.cutoffs += 1
                return alpha
            beta = min(beta, score)
        return beta


# ============================================================================
# Alpha-Beta Search
# ============================================================================

@dataclass
class SearchStats:
    """Search statistics for debugging/tuning."""
    nodes_searched: int = 0
    cutoffs: int = 0
    max_depth_reached: int = 0
    tt_hits: int = 0
    quiescence_nodes: int = 0


@dataclass
class SearchResult:
    """Search result containing best move and evaluation."""
    move: Optional[Move]
    score: int
    stats: SearchStats


def alpha_beta(
    board: BoardState,
    depth: int,
    alpha: int,
    beta: int,
    maximizing: bool,
    stats: SearchStats,
    use_tt: bool = True,
    use_quiescence: bool = True
) -> int:
    """Alpha-beta search with pruning and transposition table."""
    stats.nodes_searched += 1
    
    original_alpha = alpha
    color: Color = "white" if maximizing else "black"
    in_check = is_in_check(board, color)
    
    # Probe transposition table
    if use_tt:
        tt_entry = tt_probe(board)
        if tt_entry is not None and tt_entry.depth >= depth:
            stats.tt_hits += 1
            if tt_entry.type == "exact":
                return tt_entry.score
            elif tt_entry.type == "lower":
                alpha = max(alpha, tt_entry.score)
            elif tt_entry.type == "upper":
                beta = min(beta, tt_entry.score)
            
            if alpha >= beta:
                return tt_entry.score
    
    moves = generate_all_legal_moves(board, color)
    
    # Terminal node checks
    if len(moves) == 0:
        if in_check:
            # Checkmate
            return -CHECKMATE_VALUE + depth if maximizing else CHECKMATE_VALUE - depth
        else:
            # Stalemate
            return STALEMATE_VALUE
    
    # Leaf node
    if depth == 0:
        if use_quiescence:
            return quiescence_search(board, alpha, beta, maximizing, stats)
        return evaluate_position(board)
    
    # Order moves for better pruning
    ordered_moves: list[Move]
    if use_tt:
        tt_entry = tt_probe(board)
        if tt_entry is not None and tt_entry.best_move is not None:
            # Put TT best move first
            best_move = tt_entry.best_move
            other_moves = [
                m for m in moves
                if not (m.from_coord == best_move.from_coord and m.to_coord == best_move.to_coord)
            ]
            ordered_moves = [best_move] + order_moves(other_moves)
        else:
            ordered_moves = order_moves(moves)
    else:
        ordered_moves = order_moves(moves)
    
    best_move: Optional[Move] = None
    
    if maximizing:
        max_eval = -CHECKMATE_VALUE - 1
        
        for move in ordered_moves:
            new_board = apply_move(board, move)
            eval_score = alpha_beta(new_board, depth - 1, alpha, beta, False, stats, use_tt, use_quiescence)
            
            if eval_score > max_eval:
                max_eval = eval_score
                best_move = move
            
            alpha = max(alpha, eval_score)
            
            if beta <= alpha:
                stats.cutoffs += 1
                break
        
        if use_tt:
            tt_type: TTEntryType = (
                "upper" if max_eval <= original_alpha
                else "lower" if max_eval >= beta
                else "exact"
            )
            tt_store(board, depth, max_eval, tt_type, best_move)
        
        return max_eval
    else:
        min_eval = CHECKMATE_VALUE + 1
        
        for move in ordered_moves:
            new_board = apply_move(board, move)
            eval_score = alpha_beta(new_board, depth - 1, alpha, beta, True, stats, use_tt, use_quiescence)
            
            if eval_score < min_eval:
                min_eval = eval_score
                best_move = move
            
            beta = min(beta, eval_score)
            
            if beta <= alpha:
                stats.cutoffs += 1
                break
        
        if use_tt:
            tt_type: TTEntryType = (
                "lower" if min_eval >= beta
                else "upper" if min_eval <= original_alpha
                else "exact"
            )
            tt_store(board, depth, min_eval, tt_type, best_move)
        
        return min_eval


def find_best_move(
    board: BoardState,
    color: Color,
    depth: int = 4,
    use_tt: bool = True,
    use_quiescence: bool = True
) -> SearchResult:
    """
    Find the best move for the given color using alpha-beta search.
    """
    stats = SearchStats(max_depth_reached=depth)
    
    moves = generate_all_legal_moves(board, color)
    
    if len(moves) == 0:
        return SearchResult(move=None, score=0, stats=stats)
    
    maximizing = color == "white"
    
    # Order moves
    ordered_moves: list[Move]
    if use_tt:
        tt_entry = tt_probe(board)
        if tt_entry is not None and tt_entry.best_move is not None:
            best_move = tt_entry.best_move
            other_moves = [
                m for m in moves
                if not (m.from_coord == best_move.from_coord and m.to_coord == best_move.to_coord)
            ]
            ordered_moves = [best_move] + order_moves(other_moves)
        else:
            ordered_moves = order_moves(moves)
    else:
        ordered_moves = order_moves(moves)
    
    best_move = ordered_moves[0]
    best_score = -CHECKMATE_VALUE - 1 if maximizing else CHECKMATE_VALUE + 1
    alpha = -CHECKMATE_VALUE - 1
    beta = CHECKMATE_VALUE + 1
    
    for move in ordered_moves:
        new_board = apply_move(board, move)
        eval_score = alpha_beta(
            new_board, depth - 1, alpha, beta,
            not maximizing, stats, use_tt, use_quiescence
        )
        
        if maximizing:
            if eval_score > best_score:
                best_score = eval_score
                best_move = move
            alpha = max(alpha, eval_score)
        else:
            if eval_score < best_score:
                best_score = eval_score
                best_move = move
            beta = min(beta, eval_score)
    
    # Store in TT
    if use_tt:
        tt_store(board, depth, int(best_score), "exact", best_move)
    
    return SearchResult(move=best_move, score=int(best_score), stats=stats)


def find_best_move_iterative(
    board: BoardState,
    color: Color,
    max_depth: int = 6,
    time_limit_ms: int = 5000,
    use_tt: bool = True,
    use_quiescence: bool = True
) -> SearchResult:
    """
    Find best move using iterative deepening.
    Searches at increasing depths until time limit is reached.
    """
    start_time = time.time() * 1000
    best_result = SearchResult(
        move=None,
        score=0,
        stats=SearchStats()
    )
    
    # Track accumulated stats
    total_nodes = 0
    total_cutoffs = 0
    total_tt_hits = 0
    total_q_nodes = 0
    
    # Get initial moves quickly at depth 1
    initial_result = find_best_move(board, color, 1, use_tt, use_quiescence)
    best_result = initial_result
    total_nodes += initial_result.stats.nodes_searched
    total_cutoffs += initial_result.stats.cutoffs
    total_tt_hits += initial_result.stats.tt_hits
    total_q_nodes += initial_result.stats.quiescence_nodes
    
    for depth in range(2, max_depth + 1):
        elapsed = (time.time() * 1000) - start_time
        if elapsed > time_limit_ms:
            break
        
        result = find_best_move(board, color, depth, use_tt, use_quiescence)
        
        if result.move is not None:
            best_result = result
        
        total_nodes += result.stats.nodes_searched
        total_cutoffs += result.stats.cutoffs
        total_tt_hits += result.stats.tt_hits
        total_q_nodes += result.stats.quiescence_nodes
    
    # Update accumulated stats
    best_result.stats.nodes_searched = total_nodes
    best_result.stats.cutoffs = total_cutoffs
    best_result.stats.tt_hits = total_tt_hits
    best_result.stats.quiescence_nodes = total_q_nodes
    
    return best_result


# ============================================================================
# AI Difficulty Levels
# ============================================================================

AIDifficulty = Literal["easy", "medium", "hard"]


def get_ai_move(
    board: BoardState,
    color: Color,
    difficulty: AIDifficulty = "medium"
) -> SearchResult:
    """
    Get AI move based on difficulty level.
    
    - easy: depth 2, no quiescence
    - medium: depth 4, with quiescence
    - hard: depth 6, with quiescence, iterative deepening
    """
    if difficulty == "easy":
        return find_best_move(board, color, depth=2, use_quiescence=False)
    elif difficulty == "medium":
        return find_best_move(board, color, depth=4, use_quiescence=True)
    else:  # hard
        return find_best_move_iterative(
            board, color, max_depth=6, time_limit_ms=5000,
            use_quiescence=True
        )
