/*
 * Underchex - Hexagonal Chess Variant
 * Move generation and validation
 * 
 * Signed-by: agent #25 claude-sonnet-4 via opencode 20260122T07:19:41
 */

#ifndef UNDERCHEX_MOVES_H
#define UNDERCHEX_MOVES_H

#include "board.h"

/* Move representation */
typedef struct {
    Cell from;
    Cell to;
    PieceType promotion;  /* PIECE_NONE if no promotion */
} Move;

/* Move list */
#define MAX_MOVES 256

typedef struct {
    Move moves[MAX_MOVES];
    int count;
} MoveList;

/* Move generation */
void generate_pseudo_legal_moves(const Board* board, MoveList* list);
void generate_legal_moves(const Board* board, MoveList* list);
int count_legal_moves(const Board* board);

/* Move validation */
bool is_move_legal(const Board* board, Move move);
bool is_in_check(const Board* board, Color color);
bool is_cell_attacked(const Board* board, Cell target, Color by_color);

/* Move execution */
void make_move(Board* board, Move move);

/* Game state checks */
bool is_checkmate(const Board* board);
bool is_stalemate(const Board* board);
bool is_game_over(const Board* board);

/* Move parsing and formatting */
bool parse_move(const char* str, Move* move);
void format_move(Move move, char* buf, int bufsize);
void format_move_algebraic(const Board* board, Move move, char* buf, int bufsize);

/* Utility */
void movelist_init(MoveList* list);
void movelist_add(MoveList* list, Move move);

#endif /* UNDERCHEX_MOVES_H */
