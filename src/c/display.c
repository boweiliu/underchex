/*
 * Underchex - Hexagonal Chess Variant
 * ncurses display implementation
 * 
 * Signed-by: agent #25 claude-sonnet-4 via opencode 20260122T07:19:41
 */

#include "display.h"
#include <ncurses.h>
#include <string.h>
#include <stdio.h>
#include <ctype.h>

/* Color pairs */
#define COLOR_WHITE_PIECE 1
#define COLOR_BLACK_PIECE 2
#define COLOR_SELECTED 3
#define COLOR_VALID_MOVE 4
#define COLOR_CHECK 5
#define COLOR_STATUS 6

/* Board display position */
#define BOARD_START_X 2
#define BOARD_START_Y 2
#define STATUS_Y 22
#define INPUT_Y 24

/* Cell dimensions */
#define CELL_WIDTH 4
#define CELL_HEIGHT 2

void display_init(void) {
    initscr();
    cbreak();
    noecho();
    keypad(stdscr, TRUE);
    curs_set(0);  /* Hide cursor */
    
    /* Initialize colors if available */
    if (has_colors()) {
        start_color();
        init_pair(COLOR_WHITE_PIECE, COLOR_WHITE, COLOR_BLACK);
        init_pair(COLOR_BLACK_PIECE, COLOR_CYAN, COLOR_BLACK);
        init_pair(COLOR_SELECTED, COLOR_BLACK, COLOR_YELLOW);
        init_pair(COLOR_VALID_MOVE, COLOR_BLACK, COLOR_GREEN);
        init_pair(COLOR_CHECK, COLOR_RED, COLOR_BLACK);
        init_pair(COLOR_STATUS, COLOR_YELLOW, COLOR_BLACK);
    }
}

void display_cleanup(void) {
    endwin();
}

/* Convert axial coords to screen position */
static void cell_to_screen(Cell c, int* x, int* y) {
    /* 
     * Hex grid layout with offset rows:
     *        -4 -3 -2 -1  0    (q for r=-4)
     *       -3 -2 -1  0  1     (q for r=-3)
     *      -2 -1  0  1  2      (q for r=-2)
     *     -1  0  1  2  3       (q for r=-1)
     *    -4 -3 -2 -1  0  1  2  3  4    (q for r=0)
     *     -3 -2 -1  0  1  2  3       (q for r=1)
     *      -2 -1  0  1  2  3        (q for r=2)
     *       -1  0  1  2  3         (q for r=3)
     *        0  1  2  3  4        (q for r=4)
     */
    
    int row = c.r + BOARD_RADIUS;  /* 0-8 */
    (void)row;  /* Used for y calculation below */
    
    /* Adjust for the width variation of hex rows */
    int row_start_x = BOARD_START_X + abs_int(c.r) * (CELL_WIDTH / 2);
    
    *x = row_start_x + (c.q + BOARD_RADIUS - max_int(0, -c.r)) * CELL_WIDTH;
    *y = BOARD_START_Y + row * CELL_HEIGHT;
}

/* Check if a cell is in the valid moves list */
static bool is_valid_move_target(Cell target, const MoveList* valid_moves) {
    if (!valid_moves) return false;
    for (int i = 0; i < valid_moves->count; i++) {
        if (cell_equals(valid_moves->moves[i].to, target)) {
            return true;
        }
    }
    return false;
}

void display_board(const Board* board) {
    display_board_highlighted(board, cell_make(-99, -99), NULL);
}

void display_board_highlighted(const Board* board, Cell selected,
                                const MoveList* valid_moves) {
    clear();
    
    /* Title */
    attron(A_BOLD);
    mvprintw(0, BOARD_START_X, "UNDERCHEX - Hexagonal Chess");
    attroff(A_BOLD);
    
    /* Draw coordinate labels and board */
    for (int r = -BOARD_RADIUS; r <= BOARD_RADIUS; r++) {
        /* Row label */
        int dummy_x, label_y;
        cell_to_screen(cell_make(0, r), &dummy_x, &label_y);
        mvprintw(label_y, 0, "%2d", r);
        
        for (int q = -BOARD_RADIUS; q <= BOARD_RADIUS; q++) {
            Cell c = cell_make(q, r);
            if (!cell_is_valid(c)) continue;
            
            int x, y;
            cell_to_screen(c, &x, &y);
            
            Piece* p = board_get((Board*)board, c);
            char piece_char = piece_to_char(*p);
            
            /* Determine cell background */
            bool is_selected = cell_equals(c, selected);
            bool is_valid_target = is_valid_move_target(c, valid_moves);
            bool is_king_check = (p->type == PIECE_KING && 
                                  is_in_check(board, p->color));
            
            /* Set attributes */
            if (is_selected) {
                attron(COLOR_PAIR(COLOR_SELECTED) | A_BOLD);
            } else if (is_valid_target) {
                attron(COLOR_PAIR(COLOR_VALID_MOVE));
            } else if (is_king_check) {
                attron(COLOR_PAIR(COLOR_CHECK) | A_BOLD);
            } else if (p->color == COLOR_WHITE) {
                attron(COLOR_PAIR(COLOR_WHITE_PIECE) | A_BOLD);
            } else if (p->color == COLOR_BLACK) {
                attron(COLOR_PAIR(COLOR_BLACK_PIECE));
            }
            
            /* Draw cell */
            mvprintw(y, x, "[%c]", piece_char);
            
            /* Reset attributes */
            attroff(A_BOLD);
            attroff(COLOR_PAIR(COLOR_WHITE_PIECE));
            attroff(COLOR_PAIR(COLOR_BLACK_PIECE));
            attroff(COLOR_PAIR(COLOR_SELECTED));
            attroff(COLOR_PAIR(COLOR_VALID_MOVE));
            attroff(COLOR_PAIR(COLOR_CHECK));
        }
    }
    
    /* Column labels (q values) at bottom */
    mvprintw(STATUS_Y - 2, BOARD_START_X, "q: ");
    for (int q = -BOARD_RADIUS; q <= BOARD_RADIUS; q++) {
        int x, y;
        cell_to_screen(cell_make(q, BOARD_RADIUS), &x, &y);
        mvprintw(y + 2, x, "%2d", q);
    }
    
    refresh();
}

void display_status(const Board* board, const char* message) {
    /* Clear status area */
    move(STATUS_Y, 0);
    clrtoeol();
    move(STATUS_Y + 1, 0);
    clrtoeol();
    
    /* Turn indicator */
    attron(COLOR_PAIR(COLOR_STATUS) | A_BOLD);
    mvprintw(STATUS_Y, BOARD_START_X, "%s to move", 
             color_name(board->to_move));
    attroff(A_BOLD);
    
    /* Check indicator */
    if (is_in_check(board, board->to_move)) {
        attron(COLOR_PAIR(COLOR_CHECK) | A_BOLD);
        printw(" - CHECK!");
        attroff(COLOR_PAIR(COLOR_CHECK) | A_BOLD);
    }
    
    attroff(COLOR_PAIR(COLOR_STATUS));
    
    /* Custom message */
    if (message && message[0]) {
        mvprintw(STATUS_Y + 1, BOARD_START_X, "%s", message);
    }
    
    refresh();
}

void display_move_history(const Move* moves, int count) {
    /* Show last few moves on the right side of the screen */
    int start_x = 50;
    int start_y = BOARD_START_Y;
    
    mvprintw(start_y, start_x, "Move History:");
    
    int display_count = (count > 10) ? 10 : count;
    int start_idx = count - display_count;
    
    for (int i = 0; i < display_count; i++) {
        char buf[32];
        format_move(moves[start_idx + i], buf, sizeof(buf));
        mvprintw(start_y + 1 + i, start_x, "%3d. %s", 
                 start_idx + i + 1, buf);
    }
    
    refresh();
}

bool display_get_cell(Cell* cell) {
    char buf[32];
    if (!display_get_input(buf, sizeof(buf), "Enter cell (q,r): ")) {
        return false;
    }
    
    int q, r;
    if (sscanf(buf, "%d,%d", &q, &r) == 2 || 
        sscanf(buf, "%d %d", &q, &r) == 2) {
        *cell = cell_make(q, r);
        return cell_is_valid(*cell);
    }
    
    return false;
}

bool display_get_input(char* buf, int bufsize, const char* prompt) {
    /* Clear input line */
    move(INPUT_Y, 0);
    clrtoeol();
    
    /* Show prompt */
    mvprintw(INPUT_Y, BOARD_START_X, "%s", prompt);
    
    /* Enable cursor and echo */
    curs_set(1);
    echo();
    
    /* Get input */
    int result = getnstr(buf, bufsize - 1);
    
    /* Disable cursor and echo */
    noecho();
    curs_set(0);
    
    /* Clear input line */
    move(INPUT_Y, 0);
    clrtoeol();
    
    return result == OK && buf[0] != '\0';
}

void display_message(const char* msg) {
    mvprintw(INPUT_Y, BOARD_START_X, "%s (press any key)", msg);
    refresh();
    getch();
    
    /* Clear message */
    move(INPUT_Y, 0);
    clrtoeol();
}

void display_help(void) {
    clear();
    
    attron(A_BOLD);
    mvprintw(0, 2, "UNDERCHEX HELP");
    attroff(A_BOLD);
    
    int y = 2;
    mvprintw(y++, 2, "Commands:");
    mvprintw(y++, 4, "Enter a move as: q1,r1 q2,r2  (e.g., 0,2 0,1)");
    mvprintw(y++, 4, "  or just type 'q1,r1' to select, then 'q2,r2' to move");
    y++;
    mvprintw(y++, 4, "h or ?  - Show this help");
    mvprintw(y++, 4, "q       - Quit game");
    mvprintw(y++, 4, "u       - Undo last move");
    mvprintw(y++, 4, "n       - New game");
    mvprintw(y++, 4, "m       - Show legal moves for a piece");
    y++;
    mvprintw(y++, 2, "Piece symbols:");
    mvprintw(y++, 4, "K/k - King     Q/q - Queen     N/n - Knight");
    mvprintw(y++, 4, "L/l - Lance    C/c - Chariot   P/p - Pawn");
    mvprintw(y++, 4, "(Uppercase = White, Lowercase = Black)");
    y++;
    mvprintw(y++, 2, "Coordinates:");
    mvprintw(y++, 4, "q increases NE, r increases S");
    mvprintw(y++, 4, "Board center is (0,0)");
    y++;
    mvprintw(y++, 2, "Press any key to return to game...");
    
    refresh();
    getch();
}

void display_refresh(void) {
    refresh();
}
