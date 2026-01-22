/*
 * Underchex - Hexagonal Chess Variant
 * AI implementation with alpha-beta search and tablebase integration
 * 
 * Signed-by: agent #25 claude-sonnet-4 via opencode 20260122T07:19:41
 * Edited-by: agent #38 claude-sonnet-4 via opencode 20260122T10:03:23
 */

#include "ai.h"
#include "tablebase.h"
#include <stdlib.h>
#include <string.h>
#include <time.h>

/* Piece-square tables for positional evaluation */
/* Central bonus - pieces are generally better in the center */
static int center_bonus(Cell c) {
    int dist = max3_int(abs_int(c.q), abs_int(c.r), abs_int(-c.q - c.r));
    return (BOARD_RADIUS - dist) * 5;
}

/* Pawn advancement bonus */
static int pawn_advancement(Cell c, Color color) {
    /* White pawns advance toward negative r, black toward positive r */
    if (color == COLOR_WHITE) {
        return (BOARD_RADIUS - c.r) * 10;
    } else {
        return (BOARD_RADIUS + c.r) * 10;
    }
}

/* Get piece value */
static int piece_value(PieceType type) {
    switch (type) {
        case PIECE_PAWN:    return VALUE_PAWN;
        case PIECE_KNIGHT:  return VALUE_KNIGHT;
        case PIECE_LANCE:   return VALUE_LANCE;
        case PIECE_CHARIOT: return VALUE_CHARIOT;
        case PIECE_QUEEN:   return VALUE_QUEEN;
        case PIECE_KING:    return VALUE_KING;
        default:            return 0;
    }
}

/* Evaluate position from White's perspective */
int evaluate(const Board* board) {
    int score = 0;
    
    /* Check for checkmate/stalemate */
    MoveList moves;
    generate_legal_moves(board, &moves);
    
    if (moves.count == 0) {
        if (is_in_check(board, board->to_move)) {
            /* Checkmate - very bad for side to move */
            return (board->to_move == COLOR_WHITE) ? -EVAL_MATE : EVAL_MATE;
        } else {
            /* Stalemate */
            return EVAL_DRAW;
        }
    }
    
    /* Material and positional evaluation */
    for (int q = MIN_Q; q <= MAX_Q; q++) {
        for (int r = MIN_R; r <= MAX_R; r++) {
            Cell c = cell_make(q, r);
            if (!cell_is_valid(c)) continue;
            
            Piece* p = board_get((Board*)board, c);
            if (p->type == PIECE_NONE) continue;
            
            int piece_score = piece_value(p->type);
            
            /* Add positional bonus */
            if (p->type == PIECE_PAWN) {
                piece_score += pawn_advancement(c, p->color);
            } else if (p->type != PIECE_KING) {
                piece_score += center_bonus(c);
            }
            
            /* Add or subtract based on color */
            if (p->color == COLOR_WHITE) {
                score += piece_score;
            } else {
                score -= piece_score;
            }
        }
    }
    
    /* Mobility bonus */
    int mobility = moves.count;
    if (board->to_move == COLOR_WHITE) {
        score += mobility * 2;
    } else {
        score -= mobility * 2;
    }
    
    /* King safety - penalize being in check */
    if (is_in_check(board, COLOR_WHITE)) {
        score -= 50;
    }
    if (is_in_check(board, COLOR_BLACK)) {
        score += 50;
    }
    
    return score;
}

/* Move ordering score - captures and checks first */
static int move_order_score(const Board* board, Move move) {
    int score = 0;
    
    Piece* target = board_get((Board*)board, move.to);
    Piece* moving = board_get((Board*)board, move.from);
    
    /* Capture bonus: MVV-LVA (Most Valuable Victim - Least Valuable Attacker) */
    if (target->type != PIECE_NONE) {
        score += piece_value(target->type) * 10 - piece_value(moving->type);
    }
    
    /* Promotion bonus */
    if (move.promotion != PIECE_NONE) {
        score += piece_value(move.promotion) * 5;
    }
    
    /* Center control bonus */
    score += center_bonus(move.to);
    
    return score;
}

/* Sort moves by their ordering score */
static void sort_moves(const Board* board, MoveList* list) {
    /* Simple insertion sort for small lists */
    for (int i = 1; i < list->count; i++) {
        Move key = list->moves[i];
        int key_score = move_order_score(board, key);
        int j = i - 1;
        
        while (j >= 0 && move_order_score(board, list->moves[j]) < key_score) {
            list->moves[j + 1] = list->moves[j];
            j--;
        }
        list->moves[j + 1] = key;
    }
}

int alpha_beta(Board* board, int depth, int alpha, int beta, bool maximizing,
               Move* best_move, SearchStats* stats) {
    stats->nodes_searched++;
    
    /* Terminal node or depth limit */
    if (depth == 0) {
        return evaluate(board);
    }
    
    MoveList moves;
    generate_legal_moves(board, &moves);
    
    if (moves.count == 0) {
        /* Game over */
        if (is_in_check(board, board->to_move)) {
            return maximizing ? (-EVAL_MATE + (stats->depth_reached - depth)) 
                              : (EVAL_MATE - (stats->depth_reached - depth));
        }
        return EVAL_DRAW;
    }
    
    /* Sort moves for better pruning */
    sort_moves(board, &moves);
    
    if (maximizing) {
        int max_eval = -EVAL_INF;
        Move local_best = moves.moves[0];
        
        for (int i = 0; i < moves.count; i++) {
            Board copy = board_copy(board);
            make_move(&copy, moves.moves[i]);
            
            int eval = alpha_beta(&copy, depth - 1, alpha, beta, false, NULL, stats);
            
            if (eval > max_eval) {
                max_eval = eval;
                local_best = moves.moves[i];
            }
            
            alpha = max_int(alpha, eval);
            if (beta <= alpha) break;  /* Beta cutoff */
        }
        
        if (best_move) *best_move = local_best;
        return max_eval;
    } else {
        int min_eval = EVAL_INF;
        Move local_best = moves.moves[0];
        
        for (int i = 0; i < moves.count; i++) {
            Board copy = board_copy(board);
            make_move(&copy, moves.moves[i]);
            
            int eval = alpha_beta(&copy, depth - 1, alpha, beta, true, NULL, stats);
            
            if (eval < min_eval) {
                min_eval = eval;
                local_best = moves.moves[i];
            }
            
            beta = max_int(beta, -eval);  /* Note: using max because we're minimizing */
            beta = eval < beta ? eval : beta;
            if (beta <= alpha) break;  /* Alpha cutoff */
        }
        
        if (best_move) *best_move = local_best;
        return min_eval;
    }
}

Move find_best_move(const Board* board, int depth, SearchStats* stats) {
    Move best_move = {{0, 0}, {0, 0}, PIECE_NONE};
    
    stats->nodes_searched = 0;
    stats->depth_reached = depth;
    stats->eval = 0;
    
    bool maximizing = (board->to_move == COLOR_WHITE);
    stats->eval = alpha_beta((Board*)board, depth, -EVAL_INF, EVAL_INF, 
                             maximizing, &best_move, stats);
    
    return best_move;
}

Move get_random_move(const Board* board) {
    MoveList moves;
    generate_legal_moves(board, &moves);
    
    if (moves.count == 0) {
        Move empty = {{0, 0}, {0, 0}, PIECE_NONE};
        return empty;
    }
    
    static bool seeded = false;
    if (!seeded) {
        srand(time(NULL));
        seeded = true;
    }
    
    return moves.moves[rand() % moves.count];
}

Move find_best_move_with_tablebase(const Board* board, int depth, SearchStats* stats) {
    Move best_move = {{0, 0}, {0, 0}, PIECE_NONE};
    
    stats->nodes_searched = 0;
    stats->depth_reached = depth;
    stats->eval = 0;
    
    /* First, try tablebase probe for endgame positions */
    if (tablebase_is_endgame(board)) {
        TablebaseProbeResult probe = tablebase_probe(board);
        
        if (probe.found) {
            /* Found in tablebase - use the tablebase move */
            stats->eval = (probe.wdl == WDL_WIN) ? (EVAL_MATE - probe.dtm) :
                          (probe.wdl == WDL_LOSS) ? (-EVAL_MATE + probe.dtm) : EVAL_DRAW;
            
            /* Check if we have a best move from tablebase */
            if (probe.best_move.from.q != 0 || probe.best_move.from.r != 0 ||
                probe.best_move.to.q != 0 || probe.best_move.to.r != 0) {
                return probe.best_move;
            }
            
            /* For drawn positions, just pick any legal move */
            if (probe.wdl == WDL_DRAW) {
                return get_random_move(board);
            }
        }
    }
    
    /* Fall back to alpha-beta search */
    bool maximizing = (board->to_move == COLOR_WHITE);
    stats->eval = alpha_beta((Board*)board, depth, -EVAL_INF, EVAL_INF, 
                             maximizing, &best_move, stats);
    
    return best_move;
}
