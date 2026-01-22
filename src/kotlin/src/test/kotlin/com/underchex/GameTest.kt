/**
 * Underchex - Game Tests
 *
 * Signed-by: agent #23 claude-sonnet-4 via opencode 20260122T06:57:00
 */
package com.underchex

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.*

class GameTest {
    @Test
    fun `test new game starts with white to move`() {
        val state = createNewGame()
        assertEquals(Color.WHITE, state.turn)
        assertEquals(GameStatus.Ongoing, state.status)
        assertEquals(1, state.moveNumber)
    }

    @Test
    fun `test board has valid cells`() {
        val cells = getAllCells()
        assertEquals(61, cells.size, "Radius 4 hex board should have 61 cells")
        assertTrue(cells.all { isValidCell(it) })
    }

    @Test
    fun `test center cell is valid`() {
        assertTrue(isValidCell(HexCoord(0, 0)))
    }

    @Test
    fun `test edge cells are valid`() {
        assertTrue(isValidCell(HexCoord(4, 0)))
        assertTrue(isValidCell(HexCoord(0, 4)))
        assertTrue(isValidCell(HexCoord(-4, 0)))
        assertTrue(isValidCell(HexCoord(0, -4)))
    }

    @Test
    fun `test cells outside radius are invalid`() {
        assertFalse(isValidCell(HexCoord(5, 0)))
        assertFalse(isValidCell(HexCoord(3, 3)))
    }

    @Test
    fun `test hex distance calculation`() {
        assertEquals(0, hexDistance(HexCoord(0, 0), HexCoord(0, 0)))
        assertEquals(1, hexDistance(HexCoord(0, 0), HexCoord(1, 0)))
        assertEquals(4, hexDistance(HexCoord(0, 0), HexCoord(4, 0)))
        assertEquals(2, hexDistance(HexCoord(1, 1), HexCoord(3, 0)))
    }

    @Test
    fun `test knight targets`() {
        val targets = getKnightTargets(HexCoord(0, 0))
        assertEquals(6, targets.size, "Knight should have 6 jump targets from center")
    }

    @Test
    fun `test starting position has kings`() {
        val state = createNewGame()
        val whiteKing = findKing(state.board, Color.WHITE)
        val blackKing = findKing(state.board, Color.BLACK)
        assertNotNull(whiteKing)
        assertNotNull(blackKing)
    }

    @Test
    fun `test starting position not in check`() {
        val state = createNewGame()
        assertFalse(isInCheck(state.board, Color.WHITE))
        assertFalse(isInCheck(state.board, Color.BLACK))
    }

    @Test
    fun `test legal moves available at start`() {
        val state = createNewGame()
        val moves = getLegalMoves(state)
        assertTrue(moves.isNotEmpty(), "Should have legal moves at game start")
    }
}

class MovesTest {
    @Test
    fun `test king moves to neighbors`() {
        val board = mapOf("0,0" to Piece(PieceType.KING, Color.WHITE))
        val king = board["0,0"]!!
        val moves = generateLegalMoves(board, king, HexCoord(0, 0))
        assertEquals(6, moves.size, "King should have 6 moves on empty board center")
    }

    @Test
    fun `test queen slides in all directions`() {
        val board = mapOf("0,0" to Piece(PieceType.QUEEN, Color.WHITE))
        val queen = board["0,0"]!!
        val moves = generateLegalMoves(board, queen, HexCoord(0, 0))
        assertTrue(moves.size > 6, "Queen should be able to slide multiple squares")
    }

    @Test
    fun `test pawn moves forward`() {
        val board = mapOf("0,3" to Piece(PieceType.PAWN, Color.WHITE))
        val pawn = board["0,3"]!!
        val moves = generateLegalMoves(board, pawn, HexCoord(0, 3))
        assertTrue(moves.any { it.to == HexCoord(0, 2) }, "White pawn should move north")
    }

    @Test
    fun `test cannot capture own piece`() {
        val board = mapOf(
            "0,0" to Piece(PieceType.KING, Color.WHITE),
            "0,-1" to Piece(PieceType.PAWN, Color.WHITE)
        )
        val king = board["0,0"]!!
        val moves = generateLegalMoves(board, king, HexCoord(0, 0))
        assertFalse(moves.any { it.to == HexCoord(0, -1) }, "Cannot capture own piece")
    }

    @Test
    fun `test can capture enemy piece`() {
        val board = mapOf(
            "0,0" to Piece(PieceType.KING, Color.WHITE),
            "0,-1" to Piece(PieceType.PAWN, Color.BLACK)
        )
        val king = board["0,0"]!!
        val moves = generateLegalMoves(board, king, HexCoord(0, 0))
        assertTrue(moves.any { it.to == HexCoord(0, -1) && it.captured != null })
    }
}

class AITest {
    @Test
    fun `test piece values are positive`() {
        assertTrue(PieceValues.PAWN > 0)
        assertTrue(PieceValues.KNIGHT > 0)
        assertTrue(PieceValues.QUEEN > 0)
    }

    @Test
    fun `test queen worth more than pawn`() {
        assertTrue(PieceValues.QUEEN > PieceValues.PAWN)
    }

    @Test
    fun `test evaluation is symmetric`() {
        // Empty board should evaluate to 0
        val emptyBoard = emptyMap<String, Piece>()
        assertEquals(0, evaluatePosition(emptyBoard))
    }

    @Test
    fun `test AI finds move at start`() {
        val state = createNewGame()
        val result = getAIMove(state, AIDifficulty.EASY)
        assertNotNull(result.bestMove, "AI should find a move at game start")
    }

    @Test
    fun `test AI captures hanging piece`() {
        // Set up a position where white queen can capture undefended black pawn
        val board = mapOf(
            "0,0" to Piece(PieceType.KING, Color.WHITE),
            "0,2" to Piece(PieceType.QUEEN, Color.WHITE),
            "0,-2" to Piece(PieceType.KING, Color.BLACK),
            "0,1" to Piece(PieceType.PAWN, Color.BLACK)  // Hanging pawn
        )
        val state = GameState(board, Color.WHITE, GameStatus.Ongoing, 1, emptyList())

        val result = getAIMove(state, AIDifficulty.EASY)
        assertNotNull(result.bestMove)
        // AI should capture the pawn
        assertEquals(HexCoord(0, 1), result.bestMove?.to)
    }
}
