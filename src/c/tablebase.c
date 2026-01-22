/*
 * Underchex - Hexagonal Chess Variant
 * Endgame Tablebase Implementation
 *
 * Uses retrograde analysis to generate perfect endgame tablebases.
 *
 * Signed-by: agent #36 claude-sonnet-4 via opencode 20260122T09:33:00
 */

#include "tablebase.h"
#include "ai.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

/* ============================================================================
 * Global Tablebase Storage
 * ============================================================================ */

static Tablebase tablebases[TB_CONFIG_COUNT];
static bool tablebase_system_initialized = false;

/* Configuration names */
static const char* CONFIG_NAMES[] = {
    "KvK",
    "KQvK",
    "KLvK",
    "KCvK",
    "KNvK"
};

/* ============================================================================
 * Hash Function (Simple Zobrist-like)
 * ============================================================================ */

/* Pseudo-random numbers for Zobrist hashing */
static uint64_t zobrist_piece[BOARD_SIZE][BOARD_SIZE][7][3];  /* [q][r][piece_type][color] */
static uint64_t zobrist_side;
static bool zobrist_initialized = false;

static uint64_t simple_random(uint64_t* state) {
    *state ^= *state << 13;
    *state ^= *state >> 17;
    *state ^= *state << 5;
    return *state;
}

static void init_zobrist(void) {
    if (zobrist_initialized) return;
    
    uint64_t state = 0x12345678ABCDEF01ULL;
    
    for (int q = 0; q < BOARD_SIZE; q++) {
        for (int r = 0; r < BOARD_SIZE; r++) {
            for (int type = 0; type < 7; type++) {
                for (int color = 0; color < 3; color++) {
                    zobrist_piece[q][r][type][color] = simple_random(&state);
                }
            }
        }
    }
    
    zobrist_side = simple_random(&state);
    zobrist_initialized = true;
}

static uint64_t compute_hash(const Board* board) {
    init_zobrist();
    
    uint64_t hash = 0;
    
    for (int q = MIN_Q; q <= MAX_Q; q++) {
        for (int r = MIN_R; r <= MAX_R; r++) {
            Cell c = cell_make(q, r);
            if (!cell_is_valid(c)) continue;
            
            Piece* p = board_get((Board*)board, c);
            if (p->type != PIECE_NONE) {
                int qi = q + BOARD_RADIUS;
                int ri = r + BOARD_RADIUS;
                hash ^= zobrist_piece[qi][ri][p->type][p->color];
            }
        }
    }
    
    if (board->to_move == COLOR_BLACK) {
        hash ^= zobrist_side;
    }
    
    return hash;
}

/* ============================================================================
 * Tablebase Entry Storage (Simple Hash Table)
 * ============================================================================ */

static int find_entry_index(Tablebase* tb, uint64_t hash, Color side) {
    for (int i = 0; i < tb->size; i++) {
        if (tb->keys[i].hash == hash && tb->keys[i].side_to_move == side) {
            return i;
        }
    }
    return -1;
}

static bool add_entry(Tablebase* tb, uint64_t hash, Color side, TablebaseEntry* entry) {
    if (tb->size >= tb->capacity) {
        return false;
    }
    
    /* Check if already exists */
    int idx = find_entry_index(tb, hash, side);
    if (idx >= 0) {
        tb->entries[idx] = *entry;
        return true;
    }
    
    /* Add new entry */
    tb->keys[tb->size].hash = hash;
    tb->keys[tb->size].side_to_move = side;
    tb->entries[tb->size] = *entry;
    tb->size++;
    
    return true;
}

static TablebaseEntry* get_entry(Tablebase* tb, uint64_t hash, Color side) {
    int idx = find_entry_index(tb, hash, side);
    if (idx >= 0) {
        return &tb->entries[idx];
    }
    return NULL;
}

/* ============================================================================
 * Position Generation
 * ============================================================================ */

/* Check if kings are too close (adjacent) */
static bool kings_adjacent(Cell wk, Cell bk) {
    int dq = abs_int(wk.q - bk.q);
    int dr = abs_int(wk.r - bk.r);
    int ds = abs_int((-wk.q - wk.r) - (-bk.q - bk.r));
    return max3_int(dq, dr, ds) <= 1;
}

/* Check if position is illegal (opponent in check with it being our turn) */
static bool is_illegal_position(const Board* board) {
    Color opponent = opponent_color(board->to_move);
    return is_in_check(board, opponent);
}

/* Get terminal outcome (checkmate/stalemate) */
static bool get_terminal_outcome(const Board* board, WDLOutcome* wdl, int* dtm) {
    MoveList moves;
    generate_legal_moves(board, &moves);
    
    if (moves.count == 0) {
        if (is_in_check(board, board->to_move)) {
            /* Checkmate - side to move loses */
            *wdl = WDL_LOSS;
            *dtm = 0;
        } else {
            /* Stalemate - draw */
            *wdl = WDL_DRAW;
            *dtm = -1;
        }
        return true;
    }
    
    return false;
}

/* Generate all valid cells */
static int get_all_cells(Cell* cells) {
    int count = 0;
    for (int q = MIN_Q; q <= MAX_Q; q++) {
        for (int r = MIN_R; r <= MAX_R; r++) {
            Cell c = cell_make(q, r);
            if (cell_is_valid(c)) {
                cells[count++] = c;
            }
        }
    }
    return count;
}

/* ============================================================================
 * Retrograde Analysis
 * ============================================================================ */

/* Generate KvK tablebase */
static void generate_KvK(Tablebase* tb) {
    Cell all_cells[BOARD_SIZE * BOARD_SIZE];
    int cell_count = get_all_cells(all_cells);
    
    /* Enumerate all king positions */
    for (int wi = 0; wi < cell_count; wi++) {
        Cell wk = all_cells[wi];
        
        for (int bi = 0; bi < cell_count; bi++) {
            Cell bk = all_cells[bi];
            
            /* Kings can't be on same cell or adjacent */
            if (cell_equals(wk, bk)) continue;
            if (kings_adjacent(wk, bk)) continue;
            
            /* Create position */
            Board board;
            board_clear(&board);
            board_set(&board, wk, (Piece){PIECE_KING, COLOR_WHITE, 0});
            board_set(&board, bk, (Piece){PIECE_KING, COLOR_BLACK, 0});
            board.white_king = wk;
            board.black_king = bk;
            
            /* Both sides to move */
            for (int stm = COLOR_WHITE; stm <= COLOR_BLACK; stm++) {
                board.to_move = stm;
                
                if (is_illegal_position(&board)) continue;
                
                uint64_t hash = compute_hash(&board);
                
                WDLOutcome wdl;
                int dtm;
                
                /* KvK is always draw (no mating material) */
                if (get_terminal_outcome(&board, &wdl, &dtm)) {
                    /* Terminal - stalemate = draw */
                } else {
                    /* Non-terminal KvK = draw */
                    wdl = WDL_DRAW;
                    dtm = -1;
                }
                
                TablebaseEntry entry = {wdl, dtm, {0, 0}, {0, 0}, PIECE_NONE};
                add_entry(tb, hash, stm, &entry);
                
                if (wdl == WDL_WIN) tb->win_count++;
                else if (wdl == WDL_DRAW) tb->draw_count++;
                else if (wdl == WDL_LOSS) tb->loss_count++;
            }
        }
    }
}

/* Generate tablebase for K+Piece vs K */
static void generate_KPvK(Tablebase* tb, PieceType piece_type) {
    Cell all_cells[BOARD_SIZE * BOARD_SIZE];
    int cell_count = get_all_cells(all_cells);
    
    /* Track unknown positions for retrograde analysis */
    typedef struct {
        Board board;
        uint64_t hash;
        Color stm;
    } Position;
    
    Position* unknown = malloc(sizeof(Position) * MAX_TABLEBASE_SIZE);
    int unknown_count = 0;
    
    /* Phase 1: Enumerate all positions, find terminals */
    for (int wi = 0; wi < cell_count; wi++) {
        Cell wk = all_cells[wi];
        
        for (int bi = 0; bi < cell_count; bi++) {
            Cell bk = all_cells[bi];
            
            if (cell_equals(wk, bk)) continue;
            if (kings_adjacent(wk, bk)) continue;
            
            for (int pi = 0; pi < cell_count; pi++) {
                Cell pc = all_cells[pi];
                
                /* Piece can't be on king squares */
                if (cell_equals(pc, wk) || cell_equals(pc, bk)) continue;
                
                /* Handle lance variants */
                int num_variants = (piece_type == PIECE_LANCE) ? 2 : 1;
                
                for (int var = 0; var < num_variants; var++) {
                    /* Create position */
                    Board board;
                    board_clear(&board);
                    board_set(&board, wk, (Piece){PIECE_KING, COLOR_WHITE, 0});
                    board_set(&board, bk, (Piece){PIECE_KING, COLOR_BLACK, 0});
                    board_set(&board, pc, (Piece){piece_type, COLOR_WHITE, (uint8_t)var});
                    board.white_king = wk;
                    board.black_king = bk;
                    
                    for (int stm = COLOR_WHITE; stm <= COLOR_BLACK; stm++) {
                        board.to_move = stm;
                        
                        if (is_illegal_position(&board)) continue;
                        
                        uint64_t hash = compute_hash(&board);
                        
                        WDLOutcome wdl;
                        int dtm;
                        
                        if (get_terminal_outcome(&board, &wdl, &dtm)) {
                            TablebaseEntry entry = {wdl, dtm, {0, 0}, {0, 0}, PIECE_NONE};
                            add_entry(tb, hash, stm, &entry);
                            
                            if (wdl == WDL_WIN) tb->win_count++;
                            else if (wdl == WDL_DRAW) tb->draw_count++;
                            else if (wdl == WDL_LOSS) tb->loss_count++;
                        } else {
                            /* Non-terminal - add to unknown list */
                            if (unknown_count < MAX_TABLEBASE_SIZE) {
                                unknown[unknown_count].board = board;
                                unknown[unknown_count].hash = hash;
                                unknown[unknown_count].stm = stm;
                                unknown_count++;
                            }
                        }
                    }
                }
            }
        }
    }
    
    /* Phase 2: Retrograde analysis */
    bool changed = true;
    int max_iterations = 200;
    int iteration = 0;
    
    while (changed && iteration < max_iterations) {
        changed = false;
        iteration++;
        
        for (int i = 0; i < unknown_count; i++) {
            Board* board = &unknown[i].board;
            uint64_t hash = unknown[i].hash;
            Color stm = unknown[i].stm;
            
            /* Skip if already resolved */
            TablebaseEntry* existing = get_entry(tb, hash, stm);
            if (existing && existing->wdl != WDL_UNKNOWN) continue;
            
            MoveList moves;
            board->to_move = stm;
            generate_legal_moves(board, &moves);
            
            bool has_winning_move = false;
            bool all_moves_lose = true;
            int best_dtm = 1000;
            Move best_move = {{0, 0}, {0, 0}, PIECE_NONE};
            int max_loss_dtm = 0;
            
            for (int m = 0; m < moves.count; m++) {
                Board copy = board_copy(board);
                make_move(&copy, moves.moves[m]);
                
                uint64_t new_hash = compute_hash(&copy);
                Color opponent = opponent_color(stm);
                
                TablebaseEntry* opp_entry = get_entry(tb, new_hash, opponent);
                
                if (!opp_entry || opp_entry->wdl == WDL_UNKNOWN) {
                    /* Unknown position - can't conclude */
                    all_moves_lose = false;
                    continue;
                }
                
                if (opp_entry->wdl == WDL_LOSS) {
                    /* Opponent loses = we win */
                    has_winning_move = true;
                    if (opp_entry->dtm + 1 < best_dtm) {
                        best_dtm = opp_entry->dtm + 1;
                        best_move = moves.moves[m];
                    }
                } else if (opp_entry->wdl == WDL_WIN) {
                    /* Opponent wins = we lose with this move */
                    if (opp_entry->dtm > max_loss_dtm) {
                        max_loss_dtm = opp_entry->dtm;
                    }
                } else {
                    /* Draw - better than losing */
                    all_moves_lose = false;
                }
            }
            
            if (has_winning_move) {
                TablebaseEntry entry = {WDL_WIN, best_dtm, best_move.from, best_move.to, best_move.promotion};
                add_entry(tb, hash, stm, &entry);
                tb->win_count++;
                changed = true;
            } else if (all_moves_lose && moves.count > 0) {
                TablebaseEntry entry = {WDL_LOSS, max_loss_dtm + 1, {0, 0}, {0, 0}, PIECE_NONE};
                add_entry(tb, hash, stm, &entry);
                tb->loss_count++;
                changed = true;
            }
        }
    }
    
    /* Phase 3: Remaining unknowns are draws */
    for (int i = 0; i < unknown_count; i++) {
        uint64_t hash = unknown[i].hash;
        Color stm = unknown[i].stm;
        
        TablebaseEntry* existing = get_entry(tb, hash, stm);
        if (!existing || existing->wdl == WDL_UNKNOWN) {
            TablebaseEntry entry = {WDL_DRAW, -1, {0, 0}, {0, 0}, PIECE_NONE};
            add_entry(tb, hash, stm, &entry);
            tb->draw_count++;
        }
    }
    
    free(unknown);
}

/* ============================================================================
 * Public API
 * ============================================================================ */

void tablebase_init(void) {
    if (tablebase_system_initialized) return;
    
    init_zobrist();
    
    for (int i = 0; i < TB_CONFIG_COUNT; i++) {
        tablebases[i].config = i;
        tablebases[i].name = CONFIG_NAMES[i];
        tablebases[i].entries = malloc(sizeof(TablebaseEntry) * MAX_TABLEBASE_SIZE);
        tablebases[i].keys = malloc(sizeof(TablebaseKey) * MAX_TABLEBASE_SIZE);
        tablebases[i].size = 0;
        tablebases[i].capacity = MAX_TABLEBASE_SIZE;
        tablebases[i].win_count = 0;
        tablebases[i].draw_count = 0;
        tablebases[i].loss_count = 0;
        tablebases[i].generated = false;
    }
    
    tablebase_system_initialized = true;
}

void tablebase_cleanup(void) {
    if (!tablebase_system_initialized) return;
    
    for (int i = 0; i < TB_CONFIG_COUNT; i++) {
        free(tablebases[i].entries);
        free(tablebases[i].keys);
        tablebases[i].entries = NULL;
        tablebases[i].keys = NULL;
        tablebases[i].size = 0;
        tablebases[i].generated = false;
    }
    
    tablebase_system_initialized = false;
}

bool tablebase_generate(TablebaseConfigType config) {
    if (!tablebase_system_initialized) {
        tablebase_init();
    }
    
    if (config >= TB_CONFIG_COUNT) return false;
    
    Tablebase* tb = &tablebases[config];
    if (tb->generated) return true;
    
    /* Reset counts */
    tb->size = 0;
    tb->win_count = 0;
    tb->draw_count = 0;
    tb->loss_count = 0;
    
    switch (config) {
        case TB_CONFIG_KvK:
            generate_KvK(tb);
            break;
        case TB_CONFIG_KQvK:
            generate_KPvK(tb, PIECE_QUEEN);
            break;
        case TB_CONFIG_KLvK:
            generate_KPvK(tb, PIECE_LANCE);
            break;
        case TB_CONFIG_KCvK:
            generate_KPvK(tb, PIECE_CHARIOT);
            break;
        case TB_CONFIG_KNvK:
            generate_KPvK(tb, PIECE_KNIGHT);
            break;
        default:
            return false;
    }
    
    tb->generated = true;
    return true;
}

void tablebase_generate_all(void) {
    for (int i = 0; i < TB_CONFIG_COUNT; i++) {
        tablebase_generate(i);
    }
}

TablebaseConfigType tablebase_detect_config(const Board* board) {
    int white_pieces = 0;
    int black_pieces = 0;
    PieceType white_type = PIECE_NONE;
    PieceType black_type = PIECE_NONE;
    
    for (int q = MIN_Q; q <= MAX_Q; q++) {
        for (int r = MIN_R; r <= MAX_R; r++) {
            Cell c = cell_make(q, r);
            if (!cell_is_valid(c)) continue;
            
            Piece* p = board_get((Board*)board, c);
            if (p->type == PIECE_NONE || p->type == PIECE_KING) continue;
            
            if (p->color == COLOR_WHITE) {
                white_pieces++;
                white_type = p->type;
            } else {
                black_pieces++;
                black_type = p->type;
            }
        }
    }
    
    int total = white_pieces + black_pieces;
    
    /* KvK */
    if (total == 0) {
        return TB_CONFIG_KvK;
    }
    
    /* K+Piece vs K */
    if (total == 1) {
        PieceType piece = (white_pieces == 1) ? white_type : black_type;
        switch (piece) {
            case PIECE_QUEEN:   return TB_CONFIG_KQvK;
            case PIECE_LANCE:   return TB_CONFIG_KLvK;
            case PIECE_CHARIOT: return TB_CONFIG_KCvK;
            case PIECE_KNIGHT:  return TB_CONFIG_KNvK;
            default: break;
        }
    }
    
    /* Not a supported configuration */
    return TB_CONFIG_COUNT;
}

bool tablebase_is_endgame(const Board* board) {
    return tablebase_detect_config(board) != TB_CONFIG_COUNT;
}

TablebaseProbeResult tablebase_probe(const Board* board) {
    TablebaseProbeResult result = {false, WDL_UNKNOWN, 0, {{0, 0}, {0, 0}, PIECE_NONE}, TB_CONFIG_COUNT};
    
    TablebaseConfigType config = tablebase_detect_config(board);
    if (config == TB_CONFIG_COUNT) {
        return result;
    }
    
    if (!tablebases[config].generated) {
        tablebase_generate(config);
    }
    
    uint64_t hash = compute_hash(board);
    TablebaseEntry* entry = get_entry(&tablebases[config], hash, board->to_move);
    
    if (entry && entry->wdl != WDL_UNKNOWN) {
        result.found = true;
        result.wdl = entry->wdl;
        result.dtm = entry->dtm;
        result.config = config;
        
        if (entry->wdl == WDL_WIN) {
            result.best_move.from = entry->best_from;
            result.best_move.to = entry->best_to;
            result.best_move.promotion = entry->promotion;
        }
    }
    
    return result;
}

int tablebase_get_score(const Board* board, bool* found) {
    TablebaseProbeResult result = tablebase_probe(board);
    
    *found = result.found;
    if (!result.found) {
        return 0;
    }
    
    switch (result.wdl) {
        case WDL_WIN:
            return EVAL_MATE - result.dtm;
        case WDL_DRAW:
            return EVAL_DRAW;
        case WDL_LOSS:
            return -EVAL_MATE + result.dtm;
        default:
            return 0;
    }
}

Move tablebase_get_move(const Board* board, bool* found) {
    TablebaseProbeResult result = tablebase_probe(board);
    Move empty = {{0, 0}, {0, 0}, PIECE_NONE};
    
    *found = result.found && result.wdl == WDL_WIN;
    if (*found) {
        return result.best_move;
    }
    
    return empty;
}

TablebaseStats tablebase_get_stats(void) {
    TablebaseStats stats = {0, 0, 0, 0, 0};
    
    for (int i = 0; i < TB_CONFIG_COUNT; i++) {
        if (tablebases[i].generated) {
            stats.total_entries += tablebases[i].size;
            stats.total_wins += tablebases[i].win_count;
            stats.total_draws += tablebases[i].draw_count;
            stats.total_losses += tablebases[i].loss_count;
            stats.tablebases_loaded++;
        }
    }
    
    return stats;
}

void tablebase_print_stats(void) {
    printf("=== Endgame Tablebase Statistics ===\n\n");
    
    TablebaseStats stats = tablebase_get_stats();
    printf("Total entries: %d\n", stats.total_entries);
    printf("Tablebases loaded: %d\n\n", stats.tablebases_loaded);
    
    for (int i = 0; i < TB_CONFIG_COUNT; i++) {
        if (tablebases[i].generated) {
            Tablebase* tb = &tablebases[i];
            printf("%s:\n", tb->name);
            printf("  Size: %d positions\n", tb->size);
            printf("  Wins: %d (%.1f%%)\n", tb->win_count, 
                   tb->size > 0 ? 100.0 * tb->win_count / tb->size : 0);
            printf("  Draws: %d (%.1f%%)\n", tb->draw_count,
                   tb->size > 0 ? 100.0 * tb->draw_count / tb->size : 0);
            printf("  Losses: %d (%.1f%%)\n\n", tb->loss_count,
                   tb->size > 0 ? 100.0 * tb->loss_count / tb->size : 0);
        }
    }
}

const char* tablebase_config_name(TablebaseConfigType config) {
    if (config < TB_CONFIG_COUNT) {
        return CONFIG_NAMES[config];
    }
    return "Unknown";
}

int tablebase_count_pieces(const Board* board, Color color) {
    int count = 0;
    
    for (int q = MIN_Q; q <= MAX_Q; q++) {
        for (int r = MIN_R; r <= MAX_R; r++) {
            Cell c = cell_make(q, r);
            if (!cell_is_valid(c)) continue;
            
            Piece* p = board_get((Board*)board, c);
            if (p->type != PIECE_NONE && p->type != PIECE_KING && p->color == color) {
                count++;
            }
        }
    }
    
    return count;
}
