/*
 * Cross-Implementation Test Runner
 *
 * Runs test cases matching spec/tests/move_validation.json to verify
 * C implementation matches the shared spec.
 *
 * NOTE: Since C doesn't have a built-in JSON parser, these tests are
 * manually coded to match the spec file. Keep in sync with:
 * spec/tests/move_validation.json
 *
 * Signed-by: agent #29 claude-sonnet-4 via opencode 20260122T08:15:15
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>

#include "../board.h"
#include "../moves.h"

/* Test counters */
static int tests_run = 0;
static int tests_passed = 0;

#define TEST(name) static void test_##name(void)
#define RUN_TEST(name) do { \
    printf("  Running %s...", #name); \
    test_##name(); \
    tests_run++; \
    tests_passed++; \
    printf(" PASSED\n"); \
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

/* Helper to check if a move is legal */
static bool check_move_legal(Board* board, Cell from, Cell to) {
    Move m = {from, to, PIECE_NONE};
    return is_move_legal(board, m);
}

/* Helper to check if a move captures */
static bool check_move_captures(Board* board, Cell from, Cell to) {
    Move m = {from, to, PIECE_NONE};
    if (!is_move_legal(board, m)) return false;
    Piece* target = board_get(board, to);
    return target->type != PIECE_NONE;
}

/* ============================================================================
 * Board Validation Tests (from spec/tests/move_validation.json)
 * ============================================================================ */

/* board_001: Center cell is valid */
TEST(board_001) {
    ASSERT(cell_is_valid(cell_make(0, 0)));
}

/* board_002: Corner cell at max radius is valid */
TEST(board_002) {
    ASSERT(cell_is_valid(cell_make(4, 0)));
}

/* board_003: Cell outside board is invalid */
TEST(board_003) {
    ASSERT(!cell_is_valid(cell_make(5, 0)));
}

/* board_004: Cell violating q+r constraint is invalid */
TEST(board_004) {
    ASSERT(!cell_is_valid(cell_make(3, 3)));
}

/* board_005: Negative coordinate valid cell */
TEST(board_005) {
    ASSERT(cell_is_valid(cell_make(-4, 0)));
}

/* board_006: Corner at min q, max r */
TEST(board_006) {
    ASSERT(cell_is_valid(cell_make(-4, 4)));
}

/* board_007: Cell at q+r=-4 boundary is valid */
TEST(board_007) {
    ASSERT(cell_is_valid(cell_make(0, -4)));
}

/* board_008: Cell beyond -4 boundary is invalid */
TEST(board_008) {
    ASSERT(!cell_is_valid(cell_make(0, -5)));
}

/* ============================================================================
 * Move Validation Tests (from spec/tests/move_validation.json)
 * ============================================================================ */

/* king_001: King can move to adjacent empty cell */
TEST(king_001) {
    Board board;
    board_clear(&board);
    
    Piece wk = {PIECE_KING, COLOR_WHITE, 0};
    board_set(&board, cell_make(0, 0), wk);
    board.white_king = cell_make(0, 0);
    board.to_move = COLOR_WHITE;
    
    ASSERT(check_move_legal(&board, cell_make(0, 0), cell_make(1, 0)));
}

/* king_002: King cannot move 2 squares */
TEST(king_002) {
    Board board;
    board_clear(&board);
    
    Piece wk = {PIECE_KING, COLOR_WHITE, 0};
    board_set(&board, cell_make(0, 0), wk);
    board.white_king = cell_make(0, 0);
    board.to_move = COLOR_WHITE;
    
    ASSERT(!check_move_legal(&board, cell_make(0, 0), cell_make(2, 0)));
}

/* king_003: King can capture enemy piece */
TEST(king_003) {
    Board board;
    board_clear(&board);
    
    Piece wk = {PIECE_KING, COLOR_WHITE, 0};
    Piece bp = {PIECE_PAWN, COLOR_BLACK, 0};
    board_set(&board, cell_make(0, 0), wk);
    board_set(&board, cell_make(1, 0), bp);
    board.white_king = cell_make(0, 0);
    board.to_move = COLOR_WHITE;
    
    ASSERT(check_move_legal(&board, cell_make(0, 0), cell_make(1, 0)));
    ASSERT(check_move_captures(&board, cell_make(0, 0), cell_make(1, 0)));
}

/* king_004: King cannot capture friendly piece */
TEST(king_004) {
    Board board;
    board_clear(&board);
    
    Piece wk = {PIECE_KING, COLOR_WHITE, 0};
    Piece wp = {PIECE_PAWN, COLOR_WHITE, 0};
    board_set(&board, cell_make(0, 0), wk);
    board_set(&board, cell_make(1, 0), wp);
    board.white_king = cell_make(0, 0);
    board.to_move = COLOR_WHITE;
    
    ASSERT(!check_move_legal(&board, cell_make(0, 0), cell_make(1, 0)));
}

/* queen_001: Queen can slide multiple squares */
TEST(queen_001) {
    Board board;
    board_clear(&board);
    
    Piece wq = {PIECE_QUEEN, COLOR_WHITE, 0};
    Piece wk = {PIECE_KING, COLOR_WHITE, 0};
    board_set(&board, cell_make(0, 0), wq);
    board_set(&board, cell_make(4, 0), wk);
    board.white_king = cell_make(4, 0);
    board.to_move = COLOR_WHITE;
    
    ASSERT(check_move_legal(&board, cell_make(0, 0), cell_make(0, -3)));
}

/* queen_002: Queen cannot jump over pieces */
TEST(queen_002) {
    Board board;
    board_clear(&board);
    
    Piece wq = {PIECE_QUEEN, COLOR_WHITE, 0};
    Piece wp = {PIECE_PAWN, COLOR_WHITE, 0};
    Piece wk = {PIECE_KING, COLOR_WHITE, 0};
    board_set(&board, cell_make(0, 0), wq);
    board_set(&board, cell_make(0, -1), wp);
    board_set(&board, cell_make(4, 0), wk);
    board.white_king = cell_make(4, 0);
    board.to_move = COLOR_WHITE;
    
    ASSERT(!check_move_legal(&board, cell_make(0, 0), cell_make(0, -3)));
}

/* pawn_001: White pawn moves north */
TEST(pawn_001) {
    Board board;
    board_clear(&board);
    
    Piece wp = {PIECE_PAWN, COLOR_WHITE, 0};
    Piece wk = {PIECE_KING, COLOR_WHITE, 0};
    board_set(&board, cell_make(0, 2), wp);
    board_set(&board, cell_make(4, 0), wk);
    board.white_king = cell_make(4, 0);
    board.to_move = COLOR_WHITE;
    
    ASSERT(check_move_legal(&board, cell_make(0, 2), cell_make(0, 1)));
}

/* pawn_002: White pawn cannot move south */
TEST(pawn_002) {
    Board board;
    board_clear(&board);
    
    Piece wp = {PIECE_PAWN, COLOR_WHITE, 0};
    Piece wk = {PIECE_KING, COLOR_WHITE, 0};
    board_set(&board, cell_make(0, 2), wp);
    board_set(&board, cell_make(4, 0), wk);
    board.white_king = cell_make(4, 0);
    board.to_move = COLOR_WHITE;
    
    ASSERT(!check_move_legal(&board, cell_make(0, 2), cell_make(0, 3)));
}

/* pawn_003: White pawn captures forward (north) */
TEST(pawn_003) {
    Board board;
    board_clear(&board);
    
    Piece wp = {PIECE_PAWN, COLOR_WHITE, 0};
    Piece bp = {PIECE_PAWN, COLOR_BLACK, 0};
    Piece wk = {PIECE_KING, COLOR_WHITE, 0};
    board_set(&board, cell_make(0, 2), wp);
    board_set(&board, cell_make(0, 1), bp);
    board_set(&board, cell_make(4, 0), wk);
    board.white_king = cell_make(4, 0);
    board.to_move = COLOR_WHITE;
    
    ASSERT(check_move_legal(&board, cell_make(0, 2), cell_make(0, 1)));
    ASSERT(check_move_captures(&board, cell_make(0, 2), cell_make(0, 1)));
}

/* pawn_004: White pawn captures diagonally NE */
TEST(pawn_004) {
    Board board;
    board_clear(&board);
    
    Piece wp = {PIECE_PAWN, COLOR_WHITE, 0};
    Piece bp = {PIECE_PAWN, COLOR_BLACK, 0};
    Piece wk = {PIECE_KING, COLOR_WHITE, 0};
    board_set(&board, cell_make(0, 2), wp);
    board_set(&board, cell_make(1, 1), bp);
    board_set(&board, cell_make(4, 0), wk);
    board.white_king = cell_make(4, 0);
    board.to_move = COLOR_WHITE;
    
    ASSERT(check_move_legal(&board, cell_make(0, 2), cell_make(1, 1)));
    ASSERT(check_move_captures(&board, cell_make(0, 2), cell_make(1, 1)));
}

/* pawn_005: Black pawn moves south */
TEST(pawn_005) {
    Board board;
    board_clear(&board);
    
    Piece bp = {PIECE_PAWN, COLOR_BLACK, 0};
    Piece bk = {PIECE_KING, COLOR_BLACK, 0};
    board_set(&board, cell_make(0, -2), bp);
    board_set(&board, cell_make(-4, 0), bk);
    board.black_king = cell_make(-4, 0);
    board.to_move = COLOR_BLACK;
    
    ASSERT(check_move_legal(&board, cell_make(0, -2), cell_make(0, -1)));
}

/* pawn_006: Pawn blocked by piece */
TEST(pawn_006) {
    Board board;
    board_clear(&board);
    
    Piece wp = {PIECE_PAWN, COLOR_WHITE, 0};
    Piece bp = {PIECE_PAWN, COLOR_BLACK, 0};
    Piece wk = {PIECE_KING, COLOR_WHITE, 0};
    board_set(&board, cell_make(0, 2), wp);
    board_set(&board, cell_make(0, 1), bp);
    board_set(&board, cell_make(4, 0), wk);
    board.white_king = cell_make(4, 0);
    board.to_move = COLOR_WHITE;
    
    /* Pawn can't move forward to occupied square without capture */
    /* Actually in Underchex pawns CAN capture forward, so this should be legal */
    /* Let me check: spec says pawn captures N/NE/NW. So forward capture is legal. */
    /* Test should be: pawn blocked by FRIENDLY piece */
}

/* pawn_007: Pawn blocked by friendly piece (cannot capture) */
TEST(pawn_007) {
    Board board;
    board_clear(&board);
    
    Piece wp1 = {PIECE_PAWN, COLOR_WHITE, 0};
    Piece wp2 = {PIECE_PAWN, COLOR_WHITE, 0};
    Piece wk = {PIECE_KING, COLOR_WHITE, 0};
    board_set(&board, cell_make(0, 2), wp1);
    board_set(&board, cell_make(0, 1), wp2);
    board_set(&board, cell_make(4, 0), wk);
    board.white_king = cell_make(4, 0);
    board.to_move = COLOR_WHITE;
    
    ASSERT(!check_move_legal(&board, cell_make(0, 2), cell_make(0, 1)));
}

/* knight_001: Knight leaps to valid target */
TEST(knight_001) {
    Board board;
    board_clear(&board);
    
    Piece wn = {PIECE_KNIGHT, COLOR_WHITE, 0};
    Piece wk = {PIECE_KING, COLOR_WHITE, 0};
    board_set(&board, cell_make(0, 0), wn);
    board_set(&board, cell_make(4, 0), wk);
    board.white_king = cell_make(4, 0);
    board.to_move = COLOR_WHITE;
    
    ASSERT(check_move_legal(&board, cell_make(0, 0), cell_make(1, -2)));
}

/* knight_002: Knight can jump over pieces */
TEST(knight_002) {
    Board board;
    board_clear(&board);
    
    Piece wn = {PIECE_KNIGHT, COLOR_WHITE, 0};
    Piece wp = {PIECE_PAWN, COLOR_WHITE, 0};
    Piece bp = {PIECE_PAWN, COLOR_BLACK, 0};
    Piece wk = {PIECE_KING, COLOR_WHITE, 0};
    board_set(&board, cell_make(0, 0), wn);
    board_set(&board, cell_make(0, -1), wp);
    board_set(&board, cell_make(1, -1), bp);
    board_set(&board, cell_make(4, 0), wk);
    board.white_king = cell_make(4, 0);
    board.to_move = COLOR_WHITE;
    
    ASSERT(check_move_legal(&board, cell_make(0, 0), cell_make(1, -2)));
}

/* knight_003: Knight cannot move to invalid target */
TEST(knight_003) {
    Board board;
    board_clear(&board);
    
    Piece wn = {PIECE_KNIGHT, COLOR_WHITE, 0};
    Piece wk = {PIECE_KING, COLOR_WHITE, 0};
    board_set(&board, cell_make(0, 0), wn);
    board_set(&board, cell_make(4, 0), wk);
    board.white_king = cell_make(4, 0);
    board.to_move = COLOR_WHITE;
    
    /* Adjacent move is not a knight move */
    ASSERT(!check_move_legal(&board, cell_make(0, 0), cell_make(1, 0)));
}

/* lance_001: Lance A slides north */
TEST(lance_001) {
    Board board;
    board_clear(&board);
    
    Piece wl = {PIECE_LANCE, COLOR_WHITE, 0};  /* variant 0 = A */
    Piece wk = {PIECE_KING, COLOR_WHITE, 0};
    board_set(&board, cell_make(0, 2), wl);
    board_set(&board, cell_make(4, 0), wk);
    board.white_king = cell_make(4, 0);
    board.to_move = COLOR_WHITE;
    
    ASSERT(check_move_legal(&board, cell_make(0, 2), cell_make(0, -2)));
}

/* lance_002: Lance A cannot move NE (not in its directions) */
TEST(lance_002) {
    Board board;
    board_clear(&board);
    
    Piece wl = {PIECE_LANCE, COLOR_WHITE, 0};  /* variant 0 = A: N,S,NW,SE */
    Piece wk = {PIECE_KING, COLOR_WHITE, 0};
    board_set(&board, cell_make(0, 2), wl);
    board_set(&board, cell_make(4, 0), wk);
    board.white_king = cell_make(4, 0);
    board.to_move = COLOR_WHITE;
    
    ASSERT(!check_move_legal(&board, cell_make(0, 2), cell_make(2, 0)));
}

/* lance_003: Lance B slides NE */
TEST(lance_003) {
    Board board;
    board_clear(&board);
    
    Piece wl = {PIECE_LANCE, COLOR_WHITE, 1};  /* variant 1 = B: N,S,NE,SW */
    Piece wk = {PIECE_KING, COLOR_WHITE, 0};
    board_set(&board, cell_make(0, 0), wl);
    board_set(&board, cell_make(-4, 0), wk);
    board.white_king = cell_make(-4, 0);
    board.to_move = COLOR_WHITE;
    
    ASSERT(check_move_legal(&board, cell_make(0, 0), cell_make(2, -2)));
}

/* lance_004: Lance B cannot move NW */
TEST(lance_004) {
    Board board;
    board_clear(&board);
    
    Piece wl = {PIECE_LANCE, COLOR_WHITE, 1};  /* variant 1 = B: N,S,NE,SW */
    Piece wk = {PIECE_KING, COLOR_WHITE, 0};
    board_set(&board, cell_make(0, 0), wl);
    board_set(&board, cell_make(4, 0), wk);  /* Put king away from NW direction */
    board.white_king = cell_make(4, 0);
    board.to_move = COLOR_WHITE;
    
    /* NW direction is (-1, 0) per DIRECTIONS, so (-2, 0) is 2 steps NW */
    ASSERT(!check_move_legal(&board, cell_make(0, 0), cell_make(-2, 0)));
}

/* chariot_001: Chariot slides NE */
TEST(chariot_001) {
    Board board;
    board_clear(&board);
    
    Piece wc = {PIECE_CHARIOT, COLOR_WHITE, 0};
    Piece wk = {PIECE_KING, COLOR_WHITE, 0};
    board_set(&board, cell_make(0, 0), wc);
    board_set(&board, cell_make(-4, 0), wk);
    board.white_king = cell_make(-4, 0);
    board.to_move = COLOR_WHITE;
    
    ASSERT(check_move_legal(&board, cell_make(0, 0), cell_make(3, -3)));
}

/* chariot_002: Chariot cannot move north (not diagonal) */
TEST(chariot_002) {
    Board board;
    board_clear(&board);
    
    Piece wc = {PIECE_CHARIOT, COLOR_WHITE, 0};
    Piece wk = {PIECE_KING, COLOR_WHITE, 0};
    board_set(&board, cell_make(0, 0), wc);
    board_set(&board, cell_make(-4, 0), wk);
    board.white_king = cell_make(-4, 0);
    board.to_move = COLOR_WHITE;
    
    ASSERT(!check_move_legal(&board, cell_make(0, 0), cell_make(0, -2)));
}

/* check_001: King cannot move into check */
TEST(check_001) {
    Board board;
    board_clear(&board);
    
    Piece wk = {PIECE_KING, COLOR_WHITE, 0};
    Piece bq = {PIECE_QUEEN, COLOR_BLACK, 0};
    Piece bk = {PIECE_KING, COLOR_BLACK, 0};
    board_set(&board, cell_make(0, 0), wk);
    board_set(&board, cell_make(1, -4), bq);  /* Queen attacks (1,0) along its ray */
    board_set(&board, cell_make(-4, 0), bk);
    board.white_king = cell_make(0, 0);
    board.black_king = cell_make(-4, 0);
    board.to_move = COLOR_WHITE;
    
    /* King moving to (1,0) would be under attack from queen at (1,-4) */
    ASSERT(!check_move_legal(&board, cell_make(0, 0), cell_make(1, 0)));
}

/* turn_001: Cannot move opponent's piece */
TEST(turn_001) {
    Board board;
    board_clear(&board);
    
    Piece bp = {PIECE_PAWN, COLOR_BLACK, 0};
    Piece wk = {PIECE_KING, COLOR_WHITE, 0};
    board_set(&board, cell_make(0, -2), bp);
    board_set(&board, cell_make(4, 0), wk);
    board.white_king = cell_make(4, 0);
    board.to_move = COLOR_WHITE;
    
    ASSERT(!check_move_legal(&board, cell_make(0, -2), cell_make(0, -1)));
}

/* turn_002: Cannot move from empty cell */
TEST(turn_002) {
    Board board;
    board_clear(&board);
    
    Piece wk = {PIECE_KING, COLOR_WHITE, 0};
    board_set(&board, cell_make(0, 0), wk);
    board.white_king = cell_make(0, 0);
    board.to_move = COLOR_WHITE;
    
    ASSERT(!check_move_legal(&board, cell_make(1, 0), cell_make(2, 0)));
}

/* ============================================================================
 * Coverage Report
 * ============================================================================ */

TEST(coverage_report) {
    printf("\n\n=== Spec Test Coverage Report (C) ===\n");
    printf("Board validation tests: 8\n");
    printf("Move validation tests: 21\n");
    printf("Total spec-aligned tests: 29\n");
    printf("=====================================\n\n");
    /* This test always passes - it's just for reporting */
}

/* ============================================================================
 * Main
 * ============================================================================ */

int main(void) {
    printf("Running Underchex C cross-implementation tests...\n\n");
    
    printf("Board validation tests:\n");
    RUN_TEST(board_001);
    RUN_TEST(board_002);
    RUN_TEST(board_003);
    RUN_TEST(board_004);
    RUN_TEST(board_005);
    RUN_TEST(board_006);
    RUN_TEST(board_007);
    RUN_TEST(board_008);
    
    printf("\nMove validation tests:\n");
    RUN_TEST(king_001);
    RUN_TEST(king_002);
    RUN_TEST(king_003);
    RUN_TEST(king_004);
    RUN_TEST(queen_001);
    RUN_TEST(queen_002);
    RUN_TEST(pawn_001);
    RUN_TEST(pawn_002);
    RUN_TEST(pawn_003);
    RUN_TEST(pawn_004);
    RUN_TEST(pawn_005);
    RUN_TEST(pawn_007);
    RUN_TEST(knight_001);
    RUN_TEST(knight_002);
    RUN_TEST(knight_003);
    RUN_TEST(lance_001);
    RUN_TEST(lance_002);
    RUN_TEST(lance_003);
    RUN_TEST(lance_004);
    RUN_TEST(chariot_001);
    RUN_TEST(chariot_002);
    RUN_TEST(check_001);
    RUN_TEST(turn_001);
    RUN_TEST(turn_002);
    
    RUN_TEST(coverage_report);
    
    printf("\n========================================\n");
    printf("Cross-impl Tests: %d/%d passed\n", tests_passed, tests_run);
    printf("========================================\n");
    
    return (tests_passed == tests_run) ? 0 : 1;
}
