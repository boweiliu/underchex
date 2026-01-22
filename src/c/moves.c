/*
 * Underchex - Hexagonal Chess Variant
 * Move generation implementation
 * 
 * Signed-by: agent #25 claude-sonnet-4 via opencode 20260122T07:19:41
 */

#include "moves.h"
#include <string.h>
#include <stdio.h>
#include <ctype.h>
#include <stdlib.h>

/* Unique knight offsets (6 unique destinations) */
static const Direction KNIGHT_OFFSETS[6] = {
    { 1, -2},  /* N-NE or NE-N */
    {-1, -1},  /* N-NW or NW-N */
    { 2, -1},  /* NE-SE or SE-NE */
    { 1,  1},  /* SE-S or S-SE */
    {-1,  2},  /* S-SW or SW-S */
    {-2,  1}   /* SW-NW or NW-SW */
};

/* Lance A directions: N, S, NW, SE */
static const int LANCE_A_DIRS[4] = {DIR_N, DIR_S, DIR_NW, DIR_SE};

/* Lance B directions: N, S, NE, SW */
static const int LANCE_B_DIRS[4] = {DIR_N, DIR_S, DIR_NE, DIR_SW};

/* Chariot directions: NE, NW, SE, SW */
static const int CHARIOT_DIRS[4] = {DIR_NE, DIR_SW, DIR_NW, DIR_SE};

void movelist_init(MoveList* list) {
    list->count = 0;
}

void movelist_add(MoveList* list, Move move) {
    if (list->count < MAX_MOVES) {
        list->moves[list->count++] = move;
    }
}

/* Generate rider moves in a direction */
static void generate_rider_moves(const Board* board, Cell from, Color color,
                                  int dir_idx, MoveList* list) {
    Direction d = DIRECTIONS[dir_idx];
    Cell to = cell_add(from, d);
    
    while (cell_is_valid(to)) {
        Piece* target = board_get((Board*)board, to);
        if (target->type == PIECE_NONE) {
            Move m = {from, to, PIECE_NONE};
            movelist_add(list, m);
        } else if (target->color != color) {
            /* Capture */
            Move m = {from, to, PIECE_NONE};
            movelist_add(list, m);
            break;
        } else {
            /* Blocked by own piece */
            break;
        }
        to = cell_add(to, d);
    }
}

/* Generate step moves (king-like) */
static void generate_step_moves(const Board* board, Cell from, Color color,
                                 const int* dirs, int num_dirs, MoveList* list) {
    for (int i = 0; i < num_dirs; i++) {
        Direction d = DIRECTIONS[dirs[i]];
        Cell to = cell_add(from, d);
        
        if (!cell_is_valid(to)) continue;
        
        Piece* target = board_get((Board*)board, to);
        if (target->type == PIECE_NONE || target->color != color) {
            Move m = {from, to, PIECE_NONE};
            movelist_add(list, m);
        }
    }
}

/* Check if a pawn move results in promotion */
static bool is_promotion_rank(Cell to, Color color) {
    if (color == COLOR_WHITE) {
        return to.r == -BOARD_RADIUS;
    } else {
        return to.r == BOARD_RADIUS;
    }
}

/* Generate pawn moves */
static void generate_pawn_moves(const Board* board, Cell from, Color color, MoveList* list) {
    /* Forward direction depends on color */
    int forward_dir = (color == COLOR_WHITE) ? DIR_N : DIR_S;
    int forward_left = (color == COLOR_WHITE) ? DIR_NW : DIR_SW;
    int forward_right = (color == COLOR_WHITE) ? DIR_NE : DIR_SE;
    
    Direction fwd = DIRECTIONS[forward_dir];
    Direction fwd_left = DIRECTIONS[forward_left];
    Direction fwd_right = DIRECTIONS[forward_right];
    
    /* Forward move */
    Cell to = cell_add(from, fwd);
    if (cell_is_valid(to)) {
        Piece* target = board_get((Board*)board, to);
        if (target->type == PIECE_NONE) {
            if (is_promotion_rank(to, color)) {
                /* Promotion - generate all promotion options */
                PieceType promos[] = {PIECE_QUEEN, PIECE_LANCE, PIECE_CHARIOT, PIECE_KNIGHT};
                for (int i = 0; i < 4; i++) {
                    Move m = {from, to, promos[i]};
                    movelist_add(list, m);
                }
            } else {
                Move m = {from, to, PIECE_NONE};
                movelist_add(list, m);
            }
        }
    }
    
    /* Capture moves (forward, forward-left, forward-right in Underchex) */
    Direction capture_dirs[] = {fwd, fwd_left, fwd_right};
    for (int i = 0; i < 3; i++) {
        to = cell_add(from, capture_dirs[i]);
        if (!cell_is_valid(to)) continue;
        
        Piece* target = board_get((Board*)board, to);
        if (target->type != PIECE_NONE && target->color != color) {
            if (is_promotion_rank(to, color)) {
                PieceType promos[] = {PIECE_QUEEN, PIECE_LANCE, PIECE_CHARIOT, PIECE_KNIGHT};
                for (int j = 0; j < 4; j++) {
                    Move m = {from, to, promos[j]};
                    movelist_add(list, m);
                }
            } else {
                Move m = {from, to, PIECE_NONE};
                movelist_add(list, m);
            }
        }
    }
}

/* Generate knight moves */
static void generate_knight_moves(const Board* board, Cell from, Color color, MoveList* list) {
    for (int i = 0; i < 6; i++) {
        Cell to = cell_make(from.q + KNIGHT_OFFSETS[i].dq, 
                           from.r + KNIGHT_OFFSETS[i].dr);
        
        if (!cell_is_valid(to)) continue;
        
        Piece* target = board_get((Board*)board, to);
        if (target->type == PIECE_NONE || target->color != color) {
            Move m = {from, to, PIECE_NONE};
            movelist_add(list, m);
        }
    }
}

void generate_pseudo_legal_moves(const Board* board, MoveList* list) {
    movelist_init(list);
    Color color = board->to_move;
    
    /* All 6 directions for king/queen */
    int all_dirs[6] = {0, 1, 2, 3, 4, 5};
    
    /* Iterate over all cells */
    for (int q = MIN_Q; q <= MAX_Q; q++) {
        for (int r = MIN_R; r <= MAX_R; r++) {
            Cell cell = cell_make(q, r);
            if (!cell_is_valid(cell)) continue;
            
            Piece* p = board_get((Board*)board, cell);
            if (p->type == PIECE_NONE || p->color != color) continue;
            
            switch (p->type) {
                case PIECE_PAWN:
                    generate_pawn_moves(board, cell, color, list);
                    break;
                    
                case PIECE_KNIGHT:
                    generate_knight_moves(board, cell, color, list);
                    break;
                    
                case PIECE_LANCE:
                    if (p->variant == 0) {
                        /* Lance A: N, S, NW, SE */
                        for (int i = 0; i < 4; i++) {
                            generate_rider_moves(board, cell, color, LANCE_A_DIRS[i], list);
                        }
                    } else {
                        /* Lance B: N, S, NE, SW */
                        for (int i = 0; i < 4; i++) {
                            generate_rider_moves(board, cell, color, LANCE_B_DIRS[i], list);
                        }
                    }
                    break;
                    
                case PIECE_CHARIOT:
                    for (int i = 0; i < 4; i++) {
                        generate_rider_moves(board, cell, color, CHARIOT_DIRS[i], list);
                    }
                    break;
                    
                case PIECE_QUEEN:
                    for (int i = 0; i < 6; i++) {
                        generate_rider_moves(board, cell, color, i, list);
                    }
                    break;
                    
                case PIECE_KING:
                    generate_step_moves(board, cell, color, all_dirs, 6, list);
                    break;
                    
                default:
                    break;
            }
        }
    }
}

/* Check if a cell is attacked by a specific color */
bool is_cell_attacked(const Board* board, Cell target, Color by_color) {
    /* Check attacks from each direction (riders) */
    for (int dir = 0; dir < 6; dir++) {
        Direction d = DIRECTIONS[dir];
        Cell from = cell_add(target, d);
        int dist = 1;
        
        while (cell_is_valid(from)) {
            Piece* p = board_get((Board*)board, from);
            if (p->type != PIECE_NONE) {
                if (p->color == by_color) {
                    /* Check if this piece can attack along this direction */
                    bool can_attack = false;
                    
                    if (p->type == PIECE_QUEEN) {
                        can_attack = true;
                    } else if (p->type == PIECE_KING && dist == 1) {
                        can_attack = true;
                    } else if (p->type == PIECE_LANCE) {
                        if (p->variant == 0) {
                            /* Lance A: N, S, NW, SE */
                            can_attack = (dir == DIR_N || dir == DIR_S || 
                                         dir == DIR_NW || dir == DIR_SE);
                        } else {
                            /* Lance B: N, S, NE, SW */
                            can_attack = (dir == DIR_N || dir == DIR_S || 
                                         dir == DIR_NE || dir == DIR_SW);
                        }
                    } else if (p->type == PIECE_CHARIOT) {
                        can_attack = (dir == DIR_NE || dir == DIR_NW || 
                                     dir == DIR_SE || dir == DIR_SW);
                    } else if (p->type == PIECE_PAWN && dist == 1) {
                        /* Pawns capture forward and diagonally forward */
                        if (by_color == COLOR_WHITE) {
                            /* White attacks N, NE, NW */
                            can_attack = (dir == DIR_S || dir == DIR_SE || dir == DIR_SW);
                        } else {
                            /* Black attacks S, SE, SW */
                            can_attack = (dir == DIR_N || dir == DIR_NE || dir == DIR_NW);
                        }
                    }
                    
                    if (can_attack) return true;
                }
                break;  /* Blocked */
            }
            from = cell_add(from, d);
            dist++;
        }
    }
    
    /* Check knight attacks */
    for (int i = 0; i < 6; i++) {
        Cell from = cell_make(target.q + KNIGHT_OFFSETS[i].dq,
                             target.r + KNIGHT_OFFSETS[i].dr);
        if (!cell_is_valid(from)) continue;
        
        Piece* p = board_get((Board*)board, from);
        if (p->type == PIECE_KNIGHT && p->color == by_color) {
            return true;
        }
    }
    
    return false;
}

bool is_in_check(const Board* board, Color color) {
    Cell king_pos = (color == COLOR_WHITE) ? board->white_king : board->black_king;
    return is_cell_attacked(board, king_pos, opponent_color(color));
}

void make_move(Board* board, Move move) {
    Piece* from_piece = board_get(board, move.from);
    Piece moving = *from_piece;
    
    /* Handle promotion */
    if (move.promotion != PIECE_NONE) {
        moving.type = move.promotion;
        /* For lance promotion, keep same variant as would be placed */
        if (move.promotion == PIECE_LANCE) {
            moving.variant = 0;  /* Default to Lance A */
        }
    }
    
    /* Clear from square */
    Piece empty = {PIECE_NONE, COLOR_NONE, 0};
    board_set(board, move.from, empty);
    
    /* Place piece on destination */
    board_set(board, move.to, moving);
    
    /* Update turn */
    if (board->to_move == COLOR_BLACK) {
        board->full_move_count++;
    }
    board->to_move = opponent_color(board->to_move);
    board->half_move_count++;
}

bool is_move_legal(const Board* board, Move move) {
    /* Check basic validity */
    if (!cell_is_valid(move.from) || !cell_is_valid(move.to)) return false;
    
    Piece* from_piece = board_get((Board*)board, move.from);
    if (from_piece->type == PIECE_NONE) return false;
    if (from_piece->color != board->to_move) return false;
    
    /* Check if move is in the pseudo-legal list */
    MoveList pseudo;
    generate_pseudo_legal_moves(board, &pseudo);
    
    bool found = false;
    for (int i = 0; i < pseudo.count; i++) {
        if (cell_equals(pseudo.moves[i].from, move.from) && 
            cell_equals(pseudo.moves[i].to, move.to)) {
            found = true;
            break;
        }
    }
    if (!found) return false;
    
    /* Make move on a copy and check if king is in check */
    Board copy = board_copy(board);
    make_move(&copy, move);
    
    /* After the move, check if the moving side's king is in check */
    return !is_in_check(&copy, board->to_move);
}

void generate_legal_moves(const Board* board, MoveList* list) {
    MoveList pseudo;
    generate_pseudo_legal_moves(board, &pseudo);
    
    movelist_init(list);
    
    for (int i = 0; i < pseudo.count; i++) {
        if (is_move_legal(board, pseudo.moves[i])) {
            movelist_add(list, pseudo.moves[i]);
        }
    }
}

int count_legal_moves(const Board* board) {
    MoveList list;
    generate_legal_moves(board, &list);
    return list.count;
}

bool is_checkmate(const Board* board) {
    if (!is_in_check(board, board->to_move)) return false;
    return count_legal_moves(board) == 0;
}

bool is_stalemate(const Board* board) {
    if (is_in_check(board, board->to_move)) return false;
    return count_legal_moves(board) == 0;
}

bool is_game_over(const Board* board) {
    return count_legal_moves(board) == 0;
}

/* Parse move from string like "e2e4" or "0,2 0,1" */
bool parse_move(const char* str, Move* move) {
    int from_q, from_r, to_q, to_r;
    char promo = 0;
    
    /* Try with promotion FIRST: "q1,r1 q2,r2 Q" (must check before simpler formats) */
    if (sscanf(str, "%d,%d %d,%d %c", &from_q, &from_r, &to_q, &to_r, &promo) == 5) {
        move->from = cell_make(from_q, from_r);
        move->to = cell_make(to_q, to_r);
        
        promo = toupper(promo);
        switch (promo) {
            case 'Q': move->promotion = PIECE_QUEEN; break;
            case 'L': move->promotion = PIECE_LANCE; break;
            case 'C': move->promotion = PIECE_CHARIOT; break;
            case 'N': move->promotion = PIECE_KNIGHT; break;
            default: move->promotion = PIECE_NONE;
        }
        return true;
    }
    
    /* Try axial format: "q1,r1 q2,r2" or "q1,r1,q2,r2" */
    if (sscanf(str, "%d,%d %d,%d", &from_q, &from_r, &to_q, &to_r) == 4 ||
        sscanf(str, "%d,%d,%d,%d", &from_q, &from_r, &to_q, &to_r) == 4) {
        move->from = cell_make(from_q, from_r);
        move->to = cell_make(to_q, to_r);
        move->promotion = PIECE_NONE;
        return true;
    }
    
    return false;
}

void format_move(Move move, char* buf, int bufsize) {
    if (move.promotion != PIECE_NONE) {
        snprintf(buf, bufsize, "%d,%d -> %d,%d=%c",
                 move.from.q, move.from.r, move.to.q, move.to.r,
                 piece_to_char((Piece){move.promotion, COLOR_WHITE, 0}));
    } else {
        snprintf(buf, bufsize, "%d,%d -> %d,%d",
                 move.from.q, move.from.r, move.to.q, move.to.r);
    }
}

void format_move_algebraic(const Board* board, Move move, char* buf, int bufsize) {
    Piece* p = board_get((Board*)board, move.from);
    Piece* target = board_get((Board*)board, move.to);
    
    char piece_char = (p->type == PIECE_PAWN) ? '\0' : piece_to_char(*p);
    bool capture = (target->type != PIECE_NONE);
    
    int pos = 0;
    if (piece_char) {
        buf[pos++] = toupper(piece_char);
    }
    
    /* Add from coordinates for disambiguation */
    pos += snprintf(buf + pos, bufsize - pos, "(%d,%d)", move.from.q, move.from.r);
    
    if (capture) {
        buf[pos++] = 'x';
    } else {
        buf[pos++] = '-';
    }
    
    pos += snprintf(buf + pos, bufsize - pos, "(%d,%d)", move.to.q, move.to.r);
    
    if (move.promotion != PIECE_NONE) {
        buf[pos++] = '=';
        buf[pos++] = piece_to_char((Piece){move.promotion, COLOR_WHITE, 0});
    }
    
    buf[pos] = '\0';
}
