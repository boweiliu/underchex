/*
 * Underchex - Hexagonal Chess Variant
 * Board representation and basic operations
 * 
 * Signed-by: agent #25 claude-sonnet-4 via opencode 20260122T07:19:41
 */

#ifndef UNDERCHEX_BOARD_H
#define UNDERCHEX_BOARD_H

#include <stdbool.h>
#include <stdint.h>

/* Board configuration */
#define BOARD_RADIUS 4
#define MAX_Q (BOARD_RADIUS)
#define MIN_Q (-BOARD_RADIUS)
#define MAX_R (BOARD_RADIUS)
#define MIN_R (-BOARD_RADIUS)

/* Board array dimensions (for storage) */
#define BOARD_SIZE (2 * BOARD_RADIUS + 1)

/* Piece types */
typedef enum {
    PIECE_NONE = 0,
    PIECE_PAWN = 1,
    PIECE_KNIGHT = 2,
    PIECE_LANCE = 3,
    PIECE_CHARIOT = 4,
    PIECE_QUEEN = 5,
    PIECE_KING = 6
} PieceType;

/* Player colors */
typedef enum {
    COLOR_NONE = 0,
    COLOR_WHITE = 1,
    COLOR_BLACK = 2
} Color;

/* A piece with its color */
typedef struct {
    PieceType type;
    Color color;
    uint8_t variant;  /* For lance: 0=A (N,S,NW,SE), 1=B (N,S,NE,SW) */
} Piece;

/* Axial coordinates */
typedef struct {
    int8_t q;
    int8_t r;
} Cell;

/* Direction deltas */
typedef struct {
    int8_t dq;
    int8_t dr;
} Direction;

/* The 6 hex directions */
extern const Direction DIRECTIONS[6];
#define DIR_N   0
#define DIR_S   1
#define DIR_NE  2
#define DIR_SW  3
#define DIR_NW  4
#define DIR_SE  5

/* Direction names for display */
extern const char* DIRECTION_NAMES[6];

/* Board state */
typedef struct {
    Piece cells[BOARD_SIZE][BOARD_SIZE];  /* Indexed by [q+RADIUS][r+RADIUS] */
    Color to_move;
    Cell white_king;
    Cell black_king;
    int half_move_count;
    int full_move_count;
} Board;

/* Board functions */
bool cell_is_valid(Cell c);
Piece* board_get(Board* board, Cell c);
void board_set(Board* board, Cell c, Piece piece);
void board_clear(Board* board);
void board_init_starting_position(Board* board);
Board board_copy(const Board* board);

/* Utility functions */
Cell cell_make(int q, int r);
Cell cell_add(Cell c, Direction d);
bool cell_equals(Cell a, Cell b);
int abs_int(int x);
int max_int(int a, int b);
int max3_int(int a, int b, int c);

/* Piece character representation */
char piece_to_char(Piece p);
const char* piece_name(PieceType type);

/* Color functions */
Color opponent_color(Color c);
const char* color_name(Color c);

#endif /* UNDERCHEX_BOARD_H */
