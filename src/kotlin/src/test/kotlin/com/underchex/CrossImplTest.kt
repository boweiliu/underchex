/**
 * Cross-Implementation Test Runner
 *
 * Runs test cases from spec/tests/move_validation.json to verify
 * Kotlin implementation matches the shared spec.
 *
 * Signed-by: agent #30 claude-sonnet-4 via opencode 20260122T08:28:01
 */
package com.underchex

import com.google.gson.Gson
import com.google.gson.annotations.SerializedName
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.TestInstance
import org.junit.jupiter.api.Assertions.*
import java.io.File

// JSON data classes
data class CoordJson(val q: Int, val r: Int)

data class PiecePlacement(
    val piece: String,
    val color: String,
    val q: Int,
    val r: Int,
    val variant: String? = null
)

data class SetupJson(
    val pieces: List<PiecePlacement>,
    val turn: String
)

data class MoveJson(
    val from: CoordJson,
    val to: CoordJson
)

data class ExpectedJson(
    val valid: Boolean? = null,
    val legal: Boolean? = null,
    val capture: Boolean? = null,
    val reason: String? = null
)

data class TestCase(
    val id: String,
    val description: String,
    val type: String,
    val input: CoordJson? = null,
    val setup: SetupJson? = null,
    val move: MoveJson? = null,
    val expected: ExpectedJson
)

data class TestSuite(
    val testCases: List<TestCase>
)

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class CrossImplTest {

    private lateinit var testSuite: TestSuite
    private val gson = Gson()

    @BeforeAll
    fun loadTestSuite() {
        // Navigate from kotlin/src/test to spec/tests
        val specPath = File("../../spec/tests/move_validation.json")
        val content = specPath.readText()
        testSuite = gson.fromJson(content, TestSuite::class.java)
    }

    /**
     * Convert spec piece name to PieceType
     */
    private fun specToPieceType(name: String): PieceType {
        return when (name.lowercase()) {
            "king" -> PieceType.KING
            "queen" -> PieceType.QUEEN
            "chariot" -> PieceType.CHARIOT
            "lance" -> PieceType.LANCE
            "knight" -> PieceType.KNIGHT
            "pawn" -> PieceType.PAWN
            else -> throw IllegalArgumentException("Unknown piece type: $name")
        }
    }

    /**
     * Convert spec color to Color
     */
    private fun specToColor(name: String): Color {
        return when (name.lowercase()) {
            "white" -> Color.WHITE
            "black" -> Color.BLACK
            else -> throw IllegalArgumentException("Unknown color: $name")
        }
    }

    /**
     * Convert spec variant to LanceVariant
     */
    private fun specToLanceVariant(variant: String?): LanceVariant? {
        return when (variant?.uppercase()) {
            "A" -> LanceVariant.A
            "B" -> LanceVariant.B
            else -> null
        }
    }

    /**
     * Build board from spec setup
     */
    private fun buildBoardFromSpec(setup: SetupJson): Map<String, Piece> {
        val board = mutableMapOf<String, Piece>()
        for (placement in setup.pieces) {
            val pieceType = specToPieceType(placement.piece)
            val color = specToColor(placement.color)
            val lanceVariant = if (pieceType == PieceType.LANCE) specToLanceVariant(placement.variant) else null
            val piece = Piece(pieceType, color, lanceVariant)
            val coord = HexCoord(placement.q, placement.r)
            board[coord.toKey()] = piece
        }
        return board
    }

    // === Board Validation Tests ===

    @Test
    fun `board_001 - Center cell is valid`() {
        assertTrue(isValidCell(HexCoord(0, 0)))
    }

    @Test
    fun `board_002 - Corner cell at max radius is valid`() {
        assertTrue(isValidCell(HexCoord(4, 0)))
    }

    @Test
    fun `board_003 - Cell outside board is invalid`() {
        assertFalse(isValidCell(HexCoord(5, 0)))
    }

    @Test
    fun `board_004 - Cell violating q+r constraint is invalid`() {
        assertFalse(isValidCell(HexCoord(3, 3)))
    }

    @Test
    fun `all board validation tests from spec`() {
        val boardTests = testSuite.testCases.filter { it.type == "boardValidation" }
        
        for (tc in boardTests) {
            val input = tc.input ?: continue
            val coord = HexCoord(input.q, input.r)
            val result = isValidCell(coord)
            val expected = tc.expected.valid ?: continue
            
            assertEquals(expected, result, "${tc.id}: ${tc.description}")
        }
        
        println("\n=== Board Validation Tests Passed ===")
        println("Total: ${boardTests.size}")
    }

    // === Move Validation Tests ===

    @Test
    fun `king_001 - King can move to adjacent empty cell`() {
        val board = mapOf("0,0" to Piece(PieceType.KING, Color.WHITE))
        assertTrue(isMoveLegal(board, HexCoord(0, 0), HexCoord(1, 0), Color.WHITE))
    }

    @Test
    fun `king_002 - King cannot move 2 squares`() {
        val board = mapOf("0,0" to Piece(PieceType.KING, Color.WHITE))
        assertFalse(isMoveLegal(board, HexCoord(0, 0), HexCoord(2, 0), Color.WHITE))
    }

    @Test
    fun `king_003 - King can capture enemy piece`() {
        val board = mapOf(
            "0,0" to Piece(PieceType.KING, Color.WHITE),
            "1,0" to Piece(PieceType.PAWN, Color.BLACK)
        )
        assertTrue(isMoveLegal(board, HexCoord(0, 0), HexCoord(1, 0), Color.WHITE))
    }

    @Test
    fun `queen_001 - Queen can slide multiple squares`() {
        val board = mapOf("0,0" to Piece(PieceType.QUEEN, Color.WHITE))
        assertTrue(isMoveLegal(board, HexCoord(0, 0), HexCoord(0, -3), Color.WHITE))
    }

    @Test
    fun `queen_002 - Queen cannot jump over pieces`() {
        val board = mapOf(
            "0,0" to Piece(PieceType.QUEEN, Color.WHITE),
            "0,-1" to Piece(PieceType.PAWN, Color.WHITE)
        )
        assertFalse(isMoveLegal(board, HexCoord(0, 0), HexCoord(0, -3), Color.WHITE))
    }

    @Test
    fun `pawn_001 - White pawn moves north`() {
        val board = mapOf("0,2" to Piece(PieceType.PAWN, Color.WHITE))
        assertTrue(isMoveLegal(board, HexCoord(0, 2), HexCoord(0, 1), Color.WHITE))
    }

    @Test
    fun `pawn_002 - White pawn cannot move south`() {
        val board = mapOf("0,2" to Piece(PieceType.PAWN, Color.WHITE))
        assertFalse(isMoveLegal(board, HexCoord(0, 2), HexCoord(0, 3), Color.WHITE))
    }

    @Test
    fun `knight_001 - Knight leaps to valid target`() {
        val board = mapOf("0,0" to Piece(PieceType.KNIGHT, Color.WHITE))
        assertTrue(isMoveLegal(board, HexCoord(0, 0), HexCoord(1, -2), Color.WHITE))
    }

    @Test
    fun `knight_002 - Knight can jump over pieces`() {
        val board = mapOf(
            "0,0" to Piece(PieceType.KNIGHT, Color.WHITE),
            "0,-1" to Piece(PieceType.PAWN, Color.WHITE),
            "1,-1" to Piece(PieceType.PAWN, Color.BLACK)
        )
        assertTrue(isMoveLegal(board, HexCoord(0, 0), HexCoord(1, -2), Color.WHITE))
    }

    @Test
    fun `lance_001 - Lance A slides north`() {
        val board = mapOf("0,2" to Piece(PieceType.LANCE, Color.WHITE, LanceVariant.A))
        assertTrue(isMoveLegal(board, HexCoord(0, 2), HexCoord(0, -2), Color.WHITE))
    }

    @Test
    fun `lance_002 - Lance A cannot move NE`() {
        val board = mapOf("0,2" to Piece(PieceType.LANCE, Color.WHITE, LanceVariant.A))
        assertFalse(isMoveLegal(board, HexCoord(0, 2), HexCoord(2, 0), Color.WHITE))
    }

    @Test
    fun `chariot_001 - Chariot slides NE`() {
        val board = mapOf("0,0" to Piece(PieceType.CHARIOT, Color.WHITE))
        assertTrue(isMoveLegal(board, HexCoord(0, 0), HexCoord(3, -3), Color.WHITE))
    }

    @Test
    fun `chariot_002 - Chariot cannot move north`() {
        val board = mapOf("0,0" to Piece(PieceType.CHARIOT, Color.WHITE))
        assertFalse(isMoveLegal(board, HexCoord(0, 0), HexCoord(0, -2), Color.WHITE))
    }

    @Test
    fun `check_001 - King cannot move into check`() {
        val board = mapOf(
            "0,0" to Piece(PieceType.KING, Color.WHITE),
            "1,-4" to Piece(PieceType.QUEEN, Color.BLACK)
        )
        assertFalse(isMoveLegal(board, HexCoord(0, 0), HexCoord(1, 0), Color.WHITE))
    }

    @Test
    fun `all move validation tests from spec`() {
        val moveTests = testSuite.testCases.filter { it.type == "moveValidation" }
        var passed = 0
        var failed = 0
        
        for (tc in moveTests) {
            val setup = tc.setup ?: continue
            val move = tc.move ?: continue
            
            val board = buildBoardFromSpec(setup)
            val turn = specToColor(setup.turn)
            val from = HexCoord(move.from.q, move.from.r)
            val to = HexCoord(move.to.q, move.to.r)
            
            val result = isMoveLegal(board, from, to, turn)
            val expected = tc.expected.legal ?: continue
            
            if (result == expected) {
                passed++
            } else {
                failed++
                println("FAILED ${tc.id}: ${tc.description}")
                println("  Expected: legal=$expected, Got: legal=$result")
            }
        }
        
        println("\n=== Spec Test Coverage Report (Kotlin) ===")
        println("Board validation tests: ${testSuite.testCases.count { it.type == "boardValidation" }}")
        println("Move validation tests: ${moveTests.size}")
        println("Total spec tests: ${testSuite.testCases.size}")
        println("Passed: $passed, Failed: $failed")
        println("==========================================")
        
        assertEquals(0, failed, "Some move validation tests failed")
    }
}
