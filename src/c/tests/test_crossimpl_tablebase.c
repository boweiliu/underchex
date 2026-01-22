/*
 * Cross-Implementation Tablebase Test Runner
 *
 * Runs test cases matching spec/tests/tablebase_validation.json to verify
 * C tablebase implementation matches the shared spec.
 *
 * NOTE: Since C doesn't have a built-in JSON parser, these tests are
 * manually coded to match the spec file. Keep in sync with:
 * spec/tests/tablebase_validation.json
 *
 * NOTE: Full tablebase tests are SLOW and skipped by default.
 * Run with FULL_TABLEBASE=1 to enable all tests.
 *
 * Signed-by: agent #43 claude-sonnet-4 via opencode 20260122T10:58:25
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>

#include "../board.h"
#include "../moves.h"
#include "../tablebase.h"

/* Test counters */
static int tests_run = 0;
static int tests_passed = 0;
static int tests_skipped = 0;

/* Full tablebase mode (slow tests) */
static bool full_tablebase_enabled = false;

#define TEST(name) static void test_##name(void)
#define RUN_TEST(name) do { \
    printf("  Running %s...", #name); \
    test_##name(); \
    tests_run++; \
    tests_passed++; \
    printf(" PASSED\n"); \
} while(0)

#define RUN_TEST_IF_FULL(name) do { \
    if (full_tablebase_enabled) { \
        RUN_TEST(name); \
    } else { \
        printf("  Skipping %s (FULL_TABLEBASE not set)\n", #name); \
        tests_skipped++; \
    } \
} while(0)

#define ASSERT(cond) do { \
    if (!(cond)) { \
        printf(" FAILED at line %d: %s\n", __LINE__, #cond); \
        exit(1); \
    } \
} while(0)

#define ASSERT_EQ(a, b) do { \
    if ((a) != (b)) { \
        printf(" FAILED at line %d: %d != %d\n", __LINE__, (int)(a), (int)(b)); \
        exit(1); \
    } \
} while(0)

/* ============================================================================
 * Helper functions
 * ============================================================================ */

/* Create a board with just kings */
static void setup_kvk(Board* board, Cell wk_pos, Cell bk_pos) {
    board_clear(board);
    
    Piece wk = {PIECE_KING, COLOR_WHITE, 0};
    Piece bk = {PIECE_KING, COLOR_BLACK, 0};
    
    board_set(board, wk_pos, wk);
    board_set(board, bk_pos, bk);
    board->white_king = wk_pos;
    board->black_king = bk_pos;
}

/* Create a board with king + piece vs king */
static void setup_kpvk(Board* board, Cell wk_pos, Cell bk_pos, 
                       Cell piece_pos, PieceType piece_type, Color piece_color, uint8_t variant) {
    board_clear(board);
    
    Piece wk = {PIECE_KING, COLOR_WHITE, 0};
    Piece bk = {PIECE_KING, COLOR_BLACK, 0};
    Piece piece = {piece_type, piece_color, variant};
    
    board_set(board, wk_pos, wk);
    board_set(board, bk_pos, bk);
    board_set(board, piece_pos, piece);
    board->white_king = wk_pos;
    board->black_king = bk_pos;
}

/* ============================================================================
 * Configuration Detection Tests (from spec/tests/tablebase_validation.json)
 * ============================================================================ */

/* tb_config_001: KvK configuration detection - two kings only */
TEST(tb_config_001) {
    Board board;
    setup_kvk(&board, cell_make(0, 0), cell_make(0, -3));
    
    TablebaseConfigType config = tablebase_detect_config(&board);
    ASSERT_EQ(config, TB_CONFIG_KvK);
}

/* tb_config_002: KQvK configuration detection - white queen */
TEST(tb_config_002) {
    Board board;
    setup_kpvk(&board, cell_make(0, 0), cell_make(0, -3), 
               cell_make(2, 0), PIECE_QUEEN, COLOR_WHITE, 0);
    
    TablebaseConfigType config = tablebase_detect_config(&board);
    ASSERT_EQ(config, TB_CONFIG_KQvK);
}

/* tb_config_003: KQvK configuration detection - black queen */
TEST(tb_config_003) {
    Board board;
    setup_kpvk(&board, cell_make(0, 0), cell_make(0, -3), 
               cell_make(2, 0), PIECE_QUEEN, COLOR_BLACK, 0);
    
    TablebaseConfigType config = tablebase_detect_config(&board);
    /* Black having queen still detects as KQvK (color-agnostic) */
    ASSERT_EQ(config, TB_CONFIG_KQvK);
}

/* tb_config_004: KLvK configuration detection - lance */
TEST(tb_config_004) {
    Board board;
    setup_kpvk(&board, cell_make(0, 0), cell_make(0, -3), 
               cell_make(2, 0), PIECE_LANCE, COLOR_WHITE, 0);  /* variant A */
    
    TablebaseConfigType config = tablebase_detect_config(&board);
    ASSERT_EQ(config, TB_CONFIG_KLvK);
}

/* tb_config_005: KCvK configuration detection - chariot */
TEST(tb_config_005) {
    Board board;
    setup_kpvk(&board, cell_make(0, 0), cell_make(0, -3), 
               cell_make(2, 0), PIECE_CHARIOT, COLOR_WHITE, 0);
    
    TablebaseConfigType config = tablebase_detect_config(&board);
    ASSERT_EQ(config, TB_CONFIG_KCvK);
}

/* tb_config_006: KNvK configuration detection - knight */
TEST(tb_config_006) {
    Board board;
    setup_kpvk(&board, cell_make(0, 0), cell_make(0, -3), 
               cell_make(2, 0), PIECE_KNIGHT, COLOR_WHITE, 0);
    
    TablebaseConfigType config = tablebase_detect_config(&board);
    ASSERT_EQ(config, TB_CONFIG_KNvK);
}

/* tb_config_007: Complex position not supported by tablebase */
TEST(tb_config_007) {
    Board board;
    board_clear(&board);
    
    /* Multiple queens - not supported */
    Piece wk = {PIECE_KING, COLOR_WHITE, 0};
    Piece bk = {PIECE_KING, COLOR_BLACK, 0};
    Piece wq1 = {PIECE_QUEEN, COLOR_WHITE, 0};
    Piece wq2 = {PIECE_QUEEN, COLOR_WHITE, 0};
    Piece wq3 = {PIECE_QUEEN, COLOR_WHITE, 0};
    
    board_set(&board, cell_make(0, 0), wk);
    board_set(&board, cell_make(2, 0), wq1);
    board_set(&board, cell_make(1, 0), wq2);
    board_set(&board, cell_make(-1, 0), wq3);
    board_set(&board, cell_make(0, -3), bk);
    board.white_king = cell_make(0, 0);
    board.black_king = cell_make(0, -3);
    
    TablebaseConfigType config = tablebase_detect_config(&board);
    /* Not a supported configuration */
    ASSERT_EQ(config, TB_CONFIG_COUNT);
}

/* ============================================================================
 * WDL Lookup Tests - Fast (KvK only)
 * ============================================================================ */

/* tb_wdl_001: KvK is always a draw (white to move) */
TEST(tb_wdl_001) {
    tablebase_init();
    tablebase_generate(TB_CONFIG_KvK);
    
    Board board;
    setup_kvk(&board, cell_make(0, 0), cell_make(0, -3));
    board.to_move = COLOR_WHITE;
    
    TablebaseProbeResult result = tablebase_probe(&board);
    
    ASSERT(result.found);
    ASSERT_EQ(result.wdl, WDL_DRAW);
}

/* tb_wdl_002: KvK is draw for black too */
TEST(tb_wdl_002) {
    Board board;
    setup_kvk(&board, cell_make(0, 0), cell_make(0, -3));
    board.to_move = COLOR_BLACK;
    
    TablebaseProbeResult result = tablebase_probe(&board);
    
    ASSERT(result.found);
    ASSERT_EQ(result.wdl, WDL_DRAW);
}

/* ============================================================================
 * WDL Lookup Tests - Full (requires FULL_TABLEBASE=1)
 * ============================================================================ */

/* tb_wdl_003: KQvK - queen side to move is winning */
TEST(tb_wdl_003) {
    tablebase_generate(TB_CONFIG_KQvK);
    
    Board board;
    setup_kpvk(&board, cell_make(0, 0), cell_make(0, -4), 
               cell_make(2, 0), PIECE_QUEEN, COLOR_WHITE, 0);
    board.to_move = COLOR_WHITE;
    
    TablebaseProbeResult result = tablebase_probe(&board);
    
    ASSERT(result.found);
    ASSERT_EQ(result.wdl, WDL_WIN);
}

/* tb_wdl_004: KQvK - lone king to move is losing */
TEST(tb_wdl_004) {
    Board board;
    setup_kpvk(&board, cell_make(0, 0), cell_make(0, -4), 
               cell_make(2, 0), PIECE_QUEEN, COLOR_WHITE, 0);
    board.to_move = COLOR_BLACK;
    
    TablebaseProbeResult result = tablebase_probe(&board);
    
    ASSERT(result.found);
    ASSERT_EQ(result.wdl, WDL_LOSS);
}

/* tb_wdl_006: KNvK - knight alone cannot checkmate (draw) */
TEST(tb_wdl_006) {
    tablebase_generate(TB_CONFIG_KNvK);
    
    Board board;
    setup_kpvk(&board, cell_make(0, 0), cell_make(0, -3), 
               cell_make(2, 0), PIECE_KNIGHT, COLOR_WHITE, 0);
    board.to_move = COLOR_WHITE;
    
    TablebaseProbeResult result = tablebase_probe(&board);
    
    ASSERT(result.found);
    ASSERT_EQ(result.wdl, WDL_DRAW);
}

/* tb_wdl_007: KLvK - lance with good position is winning */
TEST(tb_wdl_007) {
    tablebase_generate(TB_CONFIG_KLvK);
    
    Board board;
    setup_kpvk(&board, cell_make(0, 0), cell_make(0, -4), 
               cell_make(0, -2), PIECE_LANCE, COLOR_WHITE, 0);  /* variant A */
    board.to_move = COLOR_WHITE;
    
    TablebaseProbeResult result = tablebase_probe(&board);
    
    ASSERT(result.found);
    ASSERT_EQ(result.wdl, WDL_WIN);
}

/* tb_wdl_008: KCvK - chariot with good position is winning */
TEST(tb_wdl_008) {
    tablebase_generate(TB_CONFIG_KCvK);
    
    Board board;
    setup_kpvk(&board, cell_make(0, 0), cell_make(3, -4), 
               cell_make(2, -2), PIECE_CHARIOT, COLOR_WHITE, 0);
    board.to_move = COLOR_WHITE;
    
    TablebaseProbeResult result = tablebase_probe(&board);
    
    ASSERT(result.found);
    ASSERT_EQ(result.wdl, WDL_WIN);
}

/* ============================================================================
 * Move Suggestion Tests
 * ============================================================================ */

/* tb_move_002: KvK - no winning move available (draw) */
TEST(tb_move_002) {
    Board board;
    setup_kvk(&board, cell_make(0, 0), cell_make(0, -3));
    board.to_move = COLOR_WHITE;
    
    /* For KvK, there's no winning move - it's always a draw */
    TablebaseProbeResult result = tablebase_probe(&board);
    ASSERT_EQ(result.wdl, WDL_DRAW);
}

/* tb_move_001: KQvK - tablebase returns a move that maintains win */
TEST(tb_move_001) {
    Board board;
    setup_kpvk(&board, cell_make(0, 0), cell_make(0, -4), 
               cell_make(2, 0), PIECE_QUEEN, COLOR_WHITE, 0);
    board.to_move = COLOR_WHITE;
    
    TablebaseProbeResult result = tablebase_probe(&board);
    ASSERT(result.found);
    ASSERT_EQ(result.wdl, WDL_WIN);
    
    /* Should have a best move */
    Move best_move = result.best_move;
    ASSERT(best_move.from.q != 0 || best_move.from.r != 0 || 
           best_move.to.q != 0 || best_move.to.r != 0);
    
    /* Apply the move and verify opponent is losing */
    Board copy = board_copy(&board);
    make_move(&copy, best_move);
    
    TablebaseProbeResult new_result = tablebase_probe(&copy);
    ASSERT(new_result.found);
    ASSERT_EQ(new_result.wdl, WDL_LOSS);
}

/* ============================================================================
 * Symmetry Tests (requires FULL_TABLEBASE=1)
 * ============================================================================ */

/* tb_symmetric_001: Black queen vs white king - queen side wins */
TEST(tb_symmetric_001) {
    Board board;
    setup_kpvk(&board, cell_make(0, 4), cell_make(0, 0), 
               cell_make(2, 0), PIECE_QUEEN, COLOR_BLACK, 0);
    board.to_move = COLOR_BLACK;
    
    TablebaseProbeResult result = tablebase_probe(&board);
    
    ASSERT(result.found);
    ASSERT_EQ(result.wdl, WDL_WIN);
}

/* tb_symmetric_002: Black queen vs white king - lone king loses */
TEST(tb_symmetric_002) {
    Board board;
    setup_kpvk(&board, cell_make(0, 4), cell_make(0, 0), 
               cell_make(2, 0), PIECE_QUEEN, COLOR_BLACK, 0);
    board.to_move = COLOR_WHITE;
    
    TablebaseProbeResult result = tablebase_probe(&board);
    
    ASSERT(result.found);
    ASSERT_EQ(result.wdl, WDL_LOSS);
}

/* ============================================================================
 * Coverage Report
 * ============================================================================ */

TEST(coverage_report) {
    printf("\n\n=== Tablebase Spec Test Coverage Report (C) ===\n");
    printf("Configuration detection tests: 7\n");
    printf("WDL lookup tests (fast): 2\n");
    printf("WDL lookup tests (full): 5\n");
    printf("Move suggestion tests: 2\n");
    printf("Symmetry tests: 2\n");
    printf("Total tablebase spec tests: 18\n");
    printf("Full tablebase mode: %s\n", full_tablebase_enabled ? "ENABLED" : "disabled");
    printf("================================================\n\n");
    /* This test always passes - it's just for reporting */
}

/* ============================================================================
 * Main
 * ============================================================================ */

int main(int argc, char* argv[]) {
    /* Check for FULL_TABLEBASE environment variable */
    char* env = getenv("FULL_TABLEBASE");
    full_tablebase_enabled = (env != NULL && strcmp(env, "1") == 0);
    
    /* Also check command line argument */
    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "--full") == 0 || strcmp(argv[i], "-f") == 0) {
            full_tablebase_enabled = true;
        }
    }
    
    printf("Running Underchex C cross-implementation tablebase tests...\n");
    if (full_tablebase_enabled) {
        printf("(FULL_TABLEBASE mode enabled - this may take a while)\n");
    }
    printf("\n");
    
    /* Initialize tablebase system once */
    tablebase_init();
    
    printf("Configuration detection tests:\n");
    RUN_TEST(tb_config_001);
    RUN_TEST(tb_config_002);
    RUN_TEST(tb_config_003);
    RUN_TEST(tb_config_004);
    RUN_TEST(tb_config_005);
    RUN_TEST(tb_config_006);
    RUN_TEST(tb_config_007);
    
    printf("\nWDL lookup tests (fast - KvK only):\n");
    RUN_TEST(tb_wdl_001);
    RUN_TEST(tb_wdl_002);
    
    printf("\nWDL lookup tests (full - requires FULL_TABLEBASE=1):\n");
    RUN_TEST_IF_FULL(tb_wdl_003);
    RUN_TEST_IF_FULL(tb_wdl_004);
    RUN_TEST_IF_FULL(tb_wdl_006);
    RUN_TEST_IF_FULL(tb_wdl_007);
    RUN_TEST_IF_FULL(tb_wdl_008);
    
    printf("\nMove suggestion tests:\n");
    RUN_TEST(tb_move_002);  /* Fast test - KvK */
    RUN_TEST_IF_FULL(tb_move_001);  /* Slow test - KQvK */
    
    printf("\nSymmetry tests (requires FULL_TABLEBASE=1):\n");
    RUN_TEST_IF_FULL(tb_symmetric_001);
    RUN_TEST_IF_FULL(tb_symmetric_002);
    
    RUN_TEST(coverage_report);
    
    /* Cleanup tablebase memory */
    tablebase_cleanup();
    
    printf("\n========================================\n");
    printf("Tablebase Cross-impl Tests: %d/%d passed", tests_passed, tests_run);
    if (tests_skipped > 0) {
        printf(" (%d skipped)", tests_skipped);
    }
    printf("\n========================================\n");
    
    return (tests_passed == tests_run) ? 0 : 1;
}
