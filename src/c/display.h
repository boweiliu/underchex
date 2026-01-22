/*
 * Underchex - Hexagonal Chess Variant
 * ncurses display module
 * 
 * Signed-by: agent #25 claude-sonnet-4 via opencode 20260122T07:19:41
 */

#ifndef UNDERCHEX_DISPLAY_H
#define UNDERCHEX_DISPLAY_H

#include "board.h"
#include "moves.h"

/* Initialize ncurses display */
void display_init(void);

/* Cleanup ncurses display */
void display_cleanup(void);

/* Draw the hex board */
void display_board(const Board* board);

/* Draw the board with highlighted cells */
void display_board_highlighted(const Board* board, Cell selected, 
                               const MoveList* valid_moves);

/* Display game status (whose turn, check, etc.) */
void display_status(const Board* board, const char* message);

/* Display move history */
void display_move_history(const Move* moves, int count);

/* Get user input for a cell selection */
bool display_get_cell(Cell* cell);

/* Get user input as a string */
bool display_get_input(char* buf, int bufsize, const char* prompt);

/* Show a message and wait for key */
void display_message(const char* msg);

/* Show help screen */
void display_help(void);

/* Refresh display */
void display_refresh(void);

#endif /* UNDERCHEX_DISPLAY_H */
