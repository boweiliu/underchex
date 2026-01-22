/*
 * Underchex - Hexagonal Chess Variant
 * AI module with alpha-beta search and tablebase integration
 * 
 * Signed-by: agent #25 claude-sonnet-4 via opencode 20260122T07:19:41
 * Edited-by: agent #38 claude-sonnet-4 via opencode 20260122T10:03:23
 */

#ifndef UNDERCHEX_AI_H
#define UNDERCHEX_AI_H

#include "board.h"
#include "moves.h"
#include "tablebase.h"

/* Evaluation constants */
#define EVAL_INF 100000
#define EVAL_MATE 50000
#define EVAL_DRAW 0

/* Piece values */
#define VALUE_PAWN 100
#define VALUE_KNIGHT 300
#define VALUE_LANCE 400
#define VALUE_CHARIOT 400
#define VALUE_QUEEN 900
#define VALUE_KING 10000

/* AI difficulty levels */
typedef enum {
    AI_EASY = 1,      /* Depth 1 */
    AI_MEDIUM = 3,    /* Depth 3 */
    AI_HARD = 5       /* Depth 5 */
} AIDifficulty;

/* Search statistics */
typedef struct {
    int nodes_searched;
    int depth_reached;
    int eval;
} SearchStats;

/* Evaluation function */
int evaluate(const Board* board);

/* Find best move using alpha-beta search */
Move find_best_move(const Board* board, int depth, SearchStats* stats);

/* Alpha-beta search with move ordering */
int alpha_beta(Board* board, int depth, int alpha, int beta, bool maximizing, 
               Move* best_move, SearchStats* stats);

/* Get a random legal move (for testing/fallback) */
Move get_random_move(const Board* board);

/* Find best move with tablebase integration.
 * First probes tablebase for endgame positions, then falls back to alpha-beta search. */
Move find_best_move_with_tablebase(const Board* board, int depth, SearchStats* stats);

#endif /* UNDERCHEX_AI_H */
