/*
 * Underchex - Hexagonal Chess Variant
 * Board implementation
 * 
 * Signed-by: agent #25 claude-sonnet-4 via opencode 20260122T07:19:41
 */

#include "board.h"
#include <string.h>
#include <stdlib.h>

/* Direction vectors for hex grid */
const Direction DIRECTIONS[6] = {
    { 0, -1},  /* N  */
    { 0,  1},  /* S  */
    { 1, -1},  /* NE */
    {-1,  1},  /* SW */
    {-1,  0},  /* NW */
    { 1,  0}   /* SE */
};

const char* DIRECTION_NAMES[6] = {"N", "S", "NE", "SW", "NW", "SE"};

/* Utility functions */
int abs_int(int x) {
    return x < 0 ? -x : x;
}

int max_int(int a, int b) {
    return a > b ? a : b;
}

int max3_int(int a, int b, int c) {
    return max_int(max_int(a, b), c);
}

Cell cell_make(int q, int r) {
    Cell c = {(int8_t)q, (int8_t)r};
    return c;
}

Cell cell_add(Cell c, Direction d) {
    return cell_make(c.q + d.dq, c.r + d.dr);
}

bool cell_equals(Cell a, Cell b) {
    return a.q == b.q && a.r == b.r;
}

/* Check if cell is within hex board bounds */
bool cell_is_valid(Cell c) {
    int s = -c.q - c.r;
    return max3_int(abs_int(c.q), abs_int(c.r), abs_int(s)) <= BOARD_RADIUS;
}

/* Convert axial coords to array index */
static inline int q_to_idx(int q) { return q + BOARD_RADIUS; }
static inline int r_to_idx(int r) { return r + BOARD_RADIUS; }

Piece* board_get(Board* board, Cell c) {
    if (!cell_is_valid(c)) return NULL;
    return &board->cells[q_to_idx(c.q)][r_to_idx(c.r)];
}

void board_set(Board* board, Cell c, Piece piece) {
    if (!cell_is_valid(c)) return;
    board->cells[q_to_idx(c.q)][r_to_idx(c.r)] = piece;
    
    /* Track king positions */
    if (piece.type == PIECE_KING) {
        if (piece.color == COLOR_WHITE) {
            board->white_king = c;
        } else if (piece.color == COLOR_BLACK) {
            board->black_king = c;
        }
    }
}

void board_clear(Board* board) {
    memset(board, 0, sizeof(Board));
    board->to_move = COLOR_WHITE;
    board->white_king = cell_make(0, 0);
    board->black_king = cell_make(0, 0);
    board->half_move_count = 0;
    board->full_move_count = 1;
}

Board board_copy(const Board* board) {
    Board copy;
    memcpy(&copy, board, sizeof(Board));
    return copy;
}

/* Initialize starting position per spec/starting_position.json */
void board_init_starting_position(Board* board) {
    board_clear(board);
    Piece wp = {PIECE_PAWN, COLOR_WHITE, 0};
    Piece bp = {PIECE_PAWN, COLOR_BLACK, 0};
    Piece wn = {PIECE_KNIGHT, COLOR_WHITE, 0};
    Piece bn = {PIECE_KNIGHT, COLOR_BLACK, 0};
    Piece wla = {PIECE_LANCE, COLOR_WHITE, 0};  /* Lance A */
    Piece wlb = {PIECE_LANCE, COLOR_WHITE, 1};  /* Lance B */
    Piece bla = {PIECE_LANCE, COLOR_BLACK, 0};
    Piece blb = {PIECE_LANCE, COLOR_BLACK, 1};
    Piece wc = {PIECE_CHARIOT, COLOR_WHITE, 0};
    Piece bc = {PIECE_CHARIOT, COLOR_BLACK, 0};
    Piece wq = {PIECE_QUEEN, COLOR_WHITE, 0};
    Piece bq = {PIECE_QUEEN, COLOR_BLACK, 0};
    Piece wk = {PIECE_KING, COLOR_WHITE, 0};
    Piece bk = {PIECE_KING, COLOR_BLACK, 0};
    
    /* White pieces (south side, positive r) */
    /* Back rank (r=4) */
    board_set(board, cell_make(0, 4), wk);    /* King in center */
    board_set(board, cell_make(-1, 4), wq);   /* Queen */
    board_set(board, cell_make(1, 4), wn);    /* Knight */
    board_set(board, cell_make(-2, 4), wla);  /* Lance A */
    board_set(board, cell_make(2, 4), wlb);   /* Lance B */
    
    /* Second rank (r=3) */
    board_set(board, cell_make(-1, 3), wc);   /* Chariot */
    board_set(board, cell_make(0, 3), wn);    /* Knight */
    board_set(board, cell_make(1, 3), wc);    /* Chariot */
    
    /* Pawns (r=2) */
    board_set(board, cell_make(-2, 2), wp);
    board_set(board, cell_make(-1, 2), wp);
    board_set(board, cell_make(0, 2), wp);
    board_set(board, cell_make(1, 2), wp);
    board_set(board, cell_make(2, 2), wp);
    board_set(board, cell_make(3, 2), wp);
    
    /* Black pieces (north side, negative r) */
    /* Back rank (r=-4) */
    board_set(board, cell_make(0, -4), bk);   /* King in center */
    board_set(board, cell_make(1, -4), bq);   /* Queen */
    board_set(board, cell_make(-1, -4), bn);  /* Knight */
    board_set(board, cell_make(2, -4), bla);  /* Lance A */
    board_set(board, cell_make(-2, -4), blb); /* Lance B */
    
    /* Second rank (r=-3) */
    board_set(board, cell_make(1, -3), bc);   /* Chariot */
    board_set(board, cell_make(0, -3), bn);   /* Knight */
    board_set(board, cell_make(-1, -3), bc);  /* Chariot */
    
    /* Pawns (r=-2) */
    board_set(board, cell_make(-3, -2), bp);
    board_set(board, cell_make(-2, -2), bp);
    board_set(board, cell_make(-1, -2), bp);
    board_set(board, cell_make(0, -2), bp);
    board_set(board, cell_make(1, -2), bp);
    board_set(board, cell_make(2, -2), bp);
}

char piece_to_char(Piece p) {
    if (p.type == PIECE_NONE) return '.';
    
    char c;
    switch (p.type) {
        case PIECE_PAWN:    c = 'P'; break;
        case PIECE_KNIGHT:  c = 'N'; break;
        case PIECE_LANCE:   c = 'L'; break;
        case PIECE_CHARIOT: c = 'C'; break;
        case PIECE_QUEEN:   c = 'Q'; break;
        case PIECE_KING:    c = 'K'; break;
        default:            c = '?'; break;
    }
    
    /* Lowercase for black pieces */
    if (p.color == COLOR_BLACK) {
        c = c - 'A' + 'a';
    }
    
    return c;
}

const char* piece_name(PieceType type) {
    switch (type) {
        case PIECE_PAWN:    return "Pawn";
        case PIECE_KNIGHT:  return "Knight";
        case PIECE_LANCE:   return "Lance";
        case PIECE_CHARIOT: return "Chariot";
        case PIECE_QUEEN:   return "Queen";
        case PIECE_KING:    return "King";
        default:            return "None";
    }
}

Color opponent_color(Color c) {
    if (c == COLOR_WHITE) return COLOR_BLACK;
    if (c == COLOR_BLACK) return COLOR_WHITE;
    return COLOR_NONE;
}

const char* color_name(Color c) {
    switch (c) {
        case COLOR_WHITE: return "White";
        case COLOR_BLACK: return "Black";
        default:          return "None";
    }
}
