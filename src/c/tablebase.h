/*
 * Underchex - Hexagonal Chess Variant
 * Endgame Tablebase Module
 *
 * Provides perfect endgame play for positions with few pieces:
 * - Precomputed Win/Draw/Loss (WDL) tables
 * - Distance to Mate (DTM) information
 * - Retrograde analysis for tablebase generation
 *
 * Supported endgames:
 * - KvK (King vs King) - Always draw
 * - KQvK (King+Queen vs King) - Win for the side with queen
 * - KLvK (King+Lance vs King) - Usually win, some draws
 * - KCvK (King+Chariot vs King) - Usually win, some draws
 * - KNvK (King+Knight vs King) - Mostly draws
 *
 * Signed-by: agent #36 claude-sonnet-4 via opencode 20260122T09:33:00
 */

#ifndef UNDERCHEX_TABLEBASE_H
#define UNDERCHEX_TABLEBASE_H

#include "board.h"
#include "moves.h"
#include <stdbool.h>

/* Maximum tablebase configurations to load */
#define MAX_TABLEBASES 16

/* Maximum positions per tablebase */
#define MAX_TABLEBASE_SIZE 150000

/* Win/Draw/Loss outcomes */
typedef enum {
    WDL_UNKNOWN = 0,
    WDL_WIN = 1,
    WDL_DRAW = 2,
    WDL_LOSS = 3
} WDLOutcome;

/* Tablebase entry for a single position */
typedef struct {
    WDLOutcome wdl;
    int dtm;          /* Distance to mate (plies). 0 for checkmate, -1 for draws */
    Cell best_from;   /* Best move source (if winning) */
    Cell best_to;     /* Best move destination */
    PieceType promotion; /* Promotion piece if applicable */
} TablebaseEntry;

/* Position key for tablebase lookup */
typedef struct {
    uint64_t hash;
    Color side_to_move;
} TablebaseKey;

/* Tablebase configuration */
typedef enum {
    TB_CONFIG_KvK = 0,    /* King vs King */
    TB_CONFIG_KQvK = 1,   /* King+Queen vs King */
    TB_CONFIG_KLvK = 2,   /* King+Lance vs King */
    TB_CONFIG_KCvK = 3,   /* King+Chariot vs King */
    TB_CONFIG_KNvK = 4,   /* King+Knight vs King */
    TB_CONFIG_COUNT = 5
} TablebaseConfigType;

/* Tablebase for a specific piece configuration */
typedef struct {
    TablebaseConfigType config;
    const char* name;
    TablebaseEntry* entries;
    TablebaseKey* keys;
    int size;
    int capacity;
    int win_count;
    int draw_count;
    int loss_count;
    bool generated;
} Tablebase;

/* Tablebase probe result */
typedef struct {
    bool found;
    WDLOutcome wdl;
    int dtm;
    Move best_move;
    TablebaseConfigType config;
} TablebaseProbeResult;

/* Tablebase statistics */
typedef struct {
    int total_entries;
    int total_wins;
    int total_draws;
    int total_losses;
    int tablebases_loaded;
} TablebaseStats;

/* ============================================================================
 * Tablebase Initialization and Cleanup
 * ============================================================================ */

/* Initialize the tablebase system */
void tablebase_init(void);

/* Free all tablebase memory */
void tablebase_cleanup(void);

/* Generate a specific tablebase */
bool tablebase_generate(TablebaseConfigType config);

/* Generate all common tablebases */
void tablebase_generate_all(void);

/* ============================================================================
 * Position Detection
 * ============================================================================ */

/* Detect which tablebase configuration a position belongs to.
 * Returns TB_CONFIG_COUNT if not a supported configuration. */
TablebaseConfigType tablebase_detect_config(const Board* board);

/* Check if a position is a tablebase position (few enough pieces) */
bool tablebase_is_endgame(const Board* board);

/* ============================================================================
 * Tablebase Probe
 * ============================================================================ */

/* Probe the tablebase for a position */
TablebaseProbeResult tablebase_probe(const Board* board);

/* Get the tablebase score for evaluation integration.
 * Returns a large positive value for wins, 0 for draws, large negative for losses.
 * Returns 0 and sets *found=false if position not in tablebase. */
int tablebase_get_score(const Board* board, bool* found);

/* Get the best move from tablebase */
Move tablebase_get_move(const Board* board, bool* found);

/* ============================================================================
 * Tablebase Statistics
 * ============================================================================ */

/* Get statistics about loaded tablebases */
TablebaseStats tablebase_get_stats(void);

/* Print tablebase statistics */
void tablebase_print_stats(void);

/* ============================================================================
 * Utility Functions
 * ============================================================================ */

/* Get the name of a tablebase configuration */
const char* tablebase_config_name(TablebaseConfigType config);

/* Count total pieces on the board (excluding kings) */
int tablebase_count_pieces(const Board* board, Color color);

#endif /* UNDERCHEX_TABLEBASE_H */
