/*
 * Underchex - Hexagonal Chess Variant
 * Main game loop with ncurses interface
 * 
 * Usage: ./underchex [options]
 * Options:
 *   -d N    Set AI depth (1-7, default 3)
 *   -c W|B  Play as White or Black (default White)
 *   -2      Two-player mode (no AI)
 *   -h      Show help
 * 
 * Signed-by: agent #25 claude-sonnet-4 via opencode 20260122T07:19:41
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include <getopt.h>

#include "board.h"
#include "moves.h"
#include "ai.h"
#include "display.h"

/* Game configuration */
typedef struct {
    int ai_depth;
    Color human_color;
    bool two_player;
} GameConfig;

/* Game state */
typedef struct {
    Board board;
    Move history[1000];
    int history_count;
    Board history_boards[1000];  /* For undo */
    bool game_over;
    char status_message[256];
} GameState;

static void print_usage(const char* prog) {
    printf("Underchex - Hexagonal Chess Variant\n");
    printf("Usage: %s [options]\n", prog);
    printf("Options:\n");
    printf("  -d N    Set AI depth (1-7, default 3)\n");
    printf("  -c W|B  Play as White or Black (default White)\n");
    printf("  -2      Two-player mode (no AI)\n");
    printf("  -h      Show this help\n");
}

static void game_init(GameState* state) {
    board_init_starting_position(&state->board);
    state->history_count = 0;
    state->game_over = false;
    state->status_message[0] = '\0';
}

static void game_save_state(GameState* state) {
    if (state->history_count < 1000) {
        state->history_boards[state->history_count] = board_copy(&state->board);
    }
}

static bool game_undo(GameState* state) {
    if (state->history_count > 0) {
        state->history_count--;
        state->board = board_copy(&state->history_boards[state->history_count]);
        state->game_over = false;
        return true;
    }
    return false;
}

static void game_make_move(GameState* state, Move move) {
    game_save_state(state);
    state->history[state->history_count++] = move;
    make_move(&state->board, move);
    
    /* Check for game over */
    if (is_checkmate(&state->board)) {
        state->game_over = true;
        Color winner = opponent_color(state->board.to_move);
        snprintf(state->status_message, sizeof(state->status_message),
                 "CHECKMATE! %s wins!", color_name(winner));
    } else if (is_stalemate(&state->board)) {
        state->game_over = true;
        snprintf(state->status_message, sizeof(state->status_message),
                 "STALEMATE! Game is a draw.");
    } else {
        state->status_message[0] = '\0';
    }
}

/* Try to parse and execute a move from user input */
static bool try_execute_move(GameState* state, const char* input) {
    Move move;
    
    /* Try to parse as a full move */
    if (parse_move(input, &move)) {
        if (is_move_legal(&state->board, move)) {
            game_make_move(state, move);
            return true;
        } else {
            snprintf(state->status_message, sizeof(state->status_message),
                     "Illegal move!");
            return false;
        }
    }
    
    return false;
}

/* AI makes a move */
static void ai_move(GameState* state, int depth) {
    snprintf(state->status_message, sizeof(state->status_message),
             "AI thinking...");
    display_board(&state->board);
    display_status(&state->board, state->status_message);
    
    SearchStats stats;
    Move move = find_best_move(&state->board, depth, &stats);
    
    char move_str[64];
    format_move(move, move_str, sizeof(move_str));
    
    game_make_move(state, move);
    
    if (!state->game_over) {
        snprintf(state->status_message, sizeof(state->status_message),
                 "AI played: %s (eval: %d, nodes: %d)",
                 move_str, stats.eval, stats.nodes_searched);
    }
}

/* Interactive cell selection with highlighting */
static bool select_and_move(GameState* state) {
    char input[64];
    Cell from_cell = {-99, -99};
    Cell to_cell;
    MoveList valid_moves;
    
    movelist_init(&valid_moves);
    
    /* First, get the 'from' cell */
    display_board(&state->board);
    display_status(&state->board, "Select piece (q,r) or enter full move:");
    
    if (!display_get_input(input, sizeof(input), "> ")) {
        return false;
    }
    
    /* Check for commands */
    if (input[0] == 'q' || input[0] == 'Q') {
        return false;  /* Quit signal */
    }
    if (input[0] == 'h' || input[0] == '?') {
        display_help();
        return true;
    }
    if (input[0] == 'u' || input[0] == 'U') {
        if (game_undo(state)) {
            snprintf(state->status_message, sizeof(state->status_message),
                     "Move undone");
        } else {
            snprintf(state->status_message, sizeof(state->status_message),
                     "Nothing to undo");
        }
        return true;
    }
    if (input[0] == 'n' || input[0] == 'N') {
        game_init(state);
        snprintf(state->status_message, sizeof(state->status_message),
                 "New game started");
        return true;
    }
    
    /* Try as full move first */
    if (try_execute_move(state, input)) {
        return true;
    }
    
    /* Try as cell selection */
    int q, r;
    if (sscanf(input, "%d,%d", &q, &r) == 2 || sscanf(input, "%d %d", &q, &r) == 2) {
        from_cell = cell_make(q, r);
        
        if (!cell_is_valid(from_cell)) {
            snprintf(state->status_message, sizeof(state->status_message),
                     "Invalid cell");
            return true;
        }
        
        Piece* p = board_get(&state->board, from_cell);
        if (p->type == PIECE_NONE) {
            snprintf(state->status_message, sizeof(state->status_message),
                     "No piece at that cell");
            return true;
        }
        if (p->color != state->board.to_move) {
            snprintf(state->status_message, sizeof(state->status_message),
                     "That's not your piece!");
            return true;
        }
        
        /* Generate valid moves for this piece */
        MoveList all_moves;
        generate_legal_moves(&state->board, &all_moves);
        
        movelist_init(&valid_moves);
        for (int i = 0; i < all_moves.count; i++) {
            if (cell_equals(all_moves.moves[i].from, from_cell)) {
                movelist_add(&valid_moves, all_moves.moves[i]);
            }
        }
        
        if (valid_moves.count == 0) {
            snprintf(state->status_message, sizeof(state->status_message),
                     "No valid moves for that piece");
            return true;
        }
        
        /* Show board with highlighted moves */
        display_board_highlighted(&state->board, from_cell, &valid_moves);
        display_status(&state->board, "Select destination (q,r):");
        
        if (!display_get_input(input, sizeof(input), "> ")) {
            return true;  /* Cancelled */
        }
        
        /* Parse destination */
        if (sscanf(input, "%d,%d", &q, &r) == 2 || sscanf(input, "%d %d", &q, &r) == 2) {
            to_cell = cell_make(q, r);
            
            /* Find and execute the move */
            for (int i = 0; i < valid_moves.count; i++) {
                if (cell_equals(valid_moves.moves[i].to, to_cell)) {
                    /* Check for promotion */
                    if (valid_moves.moves[i].promotion != PIECE_NONE) {
                        /* Find all promotion options for this destination */
                        snprintf(state->status_message, sizeof(state->status_message),
                                 "Promote to (Q/L/C/N):");
                        display_status(&state->board, state->status_message);
                        
                        if (display_get_input(input, sizeof(input), "> ")) {
                            char promo = toupper(input[0]);
                            PieceType promo_type = PIECE_QUEEN;
                            switch (promo) {
                                case 'Q': promo_type = PIECE_QUEEN; break;
                                case 'L': promo_type = PIECE_LANCE; break;
                                case 'C': promo_type = PIECE_CHARIOT; break;
                                case 'N': promo_type = PIECE_KNIGHT; break;
                            }
                            
                            /* Find the matching promotion move */
                            for (int j = 0; j < valid_moves.count; j++) {
                                if (cell_equals(valid_moves.moves[j].to, to_cell) &&
                                    valid_moves.moves[j].promotion == promo_type) {
                                    game_make_move(state, valid_moves.moves[j]);
                                    return true;
                                }
                            }
                        }
                    } else {
                        game_make_move(state, valid_moves.moves[i]);
                        return true;
                    }
                }
            }
            
            snprintf(state->status_message, sizeof(state->status_message),
                     "Invalid destination");
        }
    } else {
        snprintf(state->status_message, sizeof(state->status_message),
                 "Invalid input. Use q,r format or type 'h' for help.");
    }
    
    return true;
}

int main(int argc, char* argv[]) {
    GameConfig config = {
        .ai_depth = 3,
        .human_color = COLOR_WHITE,
        .two_player = false
    };
    
    /* Parse command line arguments */
    int opt;
    while ((opt = getopt(argc, argv, "d:c:2h")) != -1) {
        switch (opt) {
            case 'd':
                config.ai_depth = atoi(optarg);
                if (config.ai_depth < 1) config.ai_depth = 1;
                if (config.ai_depth > 7) config.ai_depth = 7;
                break;
            case 'c':
                if (optarg[0] == 'B' || optarg[0] == 'b') {
                    config.human_color = COLOR_BLACK;
                }
                break;
            case '2':
                config.two_player = true;
                break;
            case 'h':
                print_usage(argv[0]);
                return 0;
            default:
                print_usage(argv[0]);
                return 1;
        }
    }
    
    /* Initialize game */
    GameState state;
    game_init(&state);
    
    /* Initialize display */
    display_init();
    
    /* Main game loop */
    bool running = true;
    while (running) {
        display_board(&state.board);
        display_status(&state.board, state.status_message);
        
        if (state.history_count > 0) {
            display_move_history(state.history, state.history_count);
        }
        
        if (state.game_over) {
            display_message(state.status_message);
            
            /* Ask for new game */
            char input[32];
            if (display_get_input(input, sizeof(input), "New game? (y/n): ")) {
                if (input[0] == 'y' || input[0] == 'Y') {
                    game_init(&state);
                    continue;
                }
            }
            break;
        }
        
        /* Determine whose turn it is */
        bool human_turn = config.two_player || 
                          (state.board.to_move == config.human_color);
        
        if (human_turn) {
            running = select_and_move(&state);
        } else {
            /* AI turn */
            ai_move(&state, config.ai_depth);
        }
    }
    
    /* Cleanup */
    display_cleanup();
    
    printf("Thanks for playing Underchex!\n");
    return 0;
}
