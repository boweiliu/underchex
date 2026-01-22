/**
 * Underchex - Tablebase Tests
 *
 * Tests for the endgame tablebase module.
 *
 * Signed-by: agent #37 claude-sonnet-4 via opencode 20260122T09:52:00
 */
package com.underchex

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Assertions.*

class TablebaseConfigurationTest {
    @BeforeEach
    fun setup() {
        clearTablebases()
    }
    
    @Test
    fun `test detects KvK configuration`() {
        val board = mapOf(
            "0,0" to Piece(PieceType.KING, Color.WHITE),
            "2,-2" to Piece(PieceType.KING, Color.BLACK)
        )
        
        val config = detectConfiguration(board)
        assertNotNull(config)
        assertEquals("KvK", config?.name)
        assertTrue(config?.strongerSide?.isEmpty() == true)
        assertTrue(config?.weakerSide?.isEmpty() == true)
    }
    
    @Test
    fun `test detects KQvK configuration`() {
        val board = mapOf(
            "0,0" to Piece(PieceType.KING, Color.WHITE),
            "1,0" to Piece(PieceType.QUEEN, Color.WHITE),
            "3,-3" to Piece(PieceType.KING, Color.BLACK)
        )
        
        val config = detectConfiguration(board)
        assertNotNull(config)
        assertEquals("KQvK", config?.name)
        assertEquals(listOf(PieceType.QUEEN), config?.strongerSide)
    }
    
    @Test
    fun `test detects KLvK configuration`() {
        val board = mapOf(
            "0,0" to Piece(PieceType.KING, Color.WHITE),
            "1,0" to Piece(PieceType.LANCE, Color.WHITE, LanceVariant.A),
            "3,-3" to Piece(PieceType.KING, Color.BLACK)
        )
        
        val config = detectConfiguration(board)
        assertNotNull(config)
        assertEquals("KLvK", config?.name)
    }
    
    @Test
    fun `test detects KCvK configuration`() {
        val board = mapOf(
            "0,0" to Piece(PieceType.KING, Color.WHITE),
            "1,0" to Piece(PieceType.CHARIOT, Color.WHITE),
            "3,-3" to Piece(PieceType.KING, Color.BLACK)
        )
        
        val config = detectConfiguration(board)
        assertNotNull(config)
        assertEquals("KCvK", config?.name)
    }
    
    @Test
    fun `test detects KNvK configuration`() {
        val board = mapOf(
            "0,0" to Piece(PieceType.KING, Color.WHITE),
            "1,0" to Piece(PieceType.KNIGHT, Color.WHITE),
            "3,-3" to Piece(PieceType.KING, Color.BLACK)
        )
        
        val config = detectConfiguration(board)
        assertNotNull(config)
        assertEquals("KNvK", config?.name)
    }
    
    @Test
    fun `test returns null for complex positions`() {
        // 6 pieces total (2 kings + 3 queens + 1 chariot) exceeds the 5-piece limit
        val board = mapOf(
            "0,0" to Piece(PieceType.KING, Color.WHITE),
            "1,0" to Piece(PieceType.QUEEN, Color.WHITE),
            "2,0" to Piece(PieceType.QUEEN, Color.WHITE),
            "3,0" to Piece(PieceType.QUEEN, Color.WHITE),
            "-1,0" to Piece(PieceType.CHARIOT, Color.WHITE),
            "-3,3" to Piece(PieceType.KING, Color.BLACK)
        )
        
        val config = detectConfiguration(board)
        assertNull(config)  // Too many pieces
    }
    
    @Test
    fun `test isTablebaseEndgame for valid endgame`() {
        val board = mapOf(
            "0,0" to Piece(PieceType.KING, Color.WHITE),
            "2,-2" to Piece(PieceType.KING, Color.BLACK)
        )
        
        assertTrue(isTablebaseEndgame(board))
    }
    
    @Test
    fun `test isTablebaseEndgame for complex position`() {
        val state = createNewGame()
        assertFalse(isTablebaseEndgame(state.board))
    }
}

class TablebaseGenerationTest {
    @BeforeEach
    fun setup() {
        clearTablebases()
    }
    
    @Test
    fun `test KvK tablebase generation`() {
        val config = TablebaseConfig(
            strongerSide = emptyList(),
            weakerSide = emptyList(),
            name = "KvK"
        )
        
        val tablebase = generateTablebase(config)
        
        assertTrue(tablebase.size > 0)
        assertEquals("KvK", tablebase.name)
        // KvK should be all draws
        assertTrue(tablebase.metadata.winCount == 0)
        assertTrue(tablebase.metadata.lossCount == 0)
        assertTrue(tablebase.metadata.drawCount > 0)
    }
    
    @Test
    fun `test KvK is always draw`() {
        val config = TablebaseConfig(
            strongerSide = emptyList(),
            weakerSide = emptyList(),
            name = "KvK"
        )
        
        val tablebase = generateTablebase(config)
        setTablebase(tablebase)
        
        val board = mapOf(
            "0,0" to Piece(PieceType.KING, Color.WHITE),
            "0,-3" to Piece(PieceType.KING, Color.BLACK)
        )
        
        val result = probeTablebase(board, Color.WHITE)
        
        assertTrue(result.found)
        assertEquals(WDLOutcome.DRAW, result.entry?.wdl)
    }
    
    @Test
    fun `test tablebase statistics`() {
        val config = TablebaseConfig(
            strongerSide = emptyList(),
            weakerSide = emptyList(),
            name = "KvK"
        )
        
        val tablebase = generateTablebase(config)
        setTablebase(tablebase)
        
        val stats = getTablebaseStatistics()
        @Suppress("UNCHECKED_CAST")
        val tbStats = stats["tablebases"] as List<Map<String, Any>>
        
        assertEquals(1, tbStats.size)
        assertEquals("KvK", tbStats[0]["name"])
    }
}

class TablebaseProbeTest {
    @BeforeEach
    fun setup() {
        clearTablebases()
        // Generate KvK tablebase for tests
        val config = TablebaseConfig(
            strongerSide = emptyList(),
            weakerSide = emptyList(),
            name = "KvK"
        )
        val tablebase = generateTablebase(config)
        setTablebase(tablebase)
    }
    
    @Test
    fun `test probeTablebase finds position`() {
        val board = mapOf(
            "0,0" to Piece(PieceType.KING, Color.WHITE),
            "0,-3" to Piece(PieceType.KING, Color.BLACK)
        )
        
        val result = probeTablebase(board, Color.WHITE)
        
        assertTrue(result.found)
        assertNotNull(result.entry)
        assertEquals("KvK", result.tablebaseName)
    }
    
    @Test
    fun `test probeTablebase returns not found for unknown position`() {
        val board = mapOf(
            "0,0" to Piece(PieceType.KING, Color.WHITE),
            "0,1" to Piece(PieceType.QUEEN, Color.WHITE),
            "0,-3" to Piece(PieceType.KING, Color.BLACK)
        )
        
        // KQvK tablebase not generated
        val result = probeTablebase(board, Color.WHITE)
        
        assertFalse(result.found)
    }
    
    @Test
    fun `test getTablebaseScore returns 0 for draw`() {
        val board = mapOf(
            "0,0" to Piece(PieceType.KING, Color.WHITE),
            "0,-3" to Piece(PieceType.KING, Color.BLACK)
        )
        
        val score = getTablebaseScore(board, Color.WHITE)
        
        assertNotNull(score)
        assertEquals(0, score)
    }
}

class TablebaseGlobalStorageTest {
    @BeforeEach
    fun setup() {
        clearTablebases()
    }
    
    @Test
    fun `test clearTablebases removes all`() {
        val config = TablebaseConfig(
            strongerSide = emptyList(),
            weakerSide = emptyList(),
            name = "KvK"
        )
        val tablebase = generateTablebase(config)
        setTablebase(tablebase)
        
        assertEquals(1, getLoadedTablebases().size)
        
        clearTablebases()
        
        assertEquals(0, getLoadedTablebases().size)
    }
    
    @Test
    fun `test getTablebase returns stored tablebase`() {
        val config = TablebaseConfig(
            strongerSide = emptyList(),
            weakerSide = emptyList(),
            name = "KvK"
        )
        val tablebase = generateTablebase(config)
        setTablebase(tablebase)
        
        val retrieved = getTablebase("KvK")
        
        assertNotNull(retrieved)
        assertEquals("KvK", retrieved?.name)
    }
    
    @Test
    fun `test getTablebase returns null for unknown`() {
        val retrieved = getTablebase("NonExistent")
        assertNull(retrieved)
    }
    
    @Test
    fun `test generateTablebaseOnDemand parses name correctly`() {
        val tablebase = generateTablebaseOnDemand("KvK")
        
        assertNotNull(tablebase)
        assertEquals("KvK", tablebase?.name)
        assertTrue(tablebase?.size ?: 0 > 0)
    }
    
    @Test
    fun `test generateTablebaseOnDemand returns null for invalid name`() {
        val tablebase = generateTablebaseOnDemand("InvalidName")
        assertNull(tablebase)
    }
}

/**
 * Tests for AI tablebase integration.
 * Signed-by: agent #38 claude-sonnet-4 via opencode 20260122T10:03:23
 */
class AITablebaseIntegrationTest {
    @BeforeEach
    fun setup() {
        clearTablebases()
        // Generate KvK tablebase for tests
        val config = TablebaseConfig(
            strongerSide = emptyList(),
            weakerSide = emptyList(),
            name = "KvK"
        )
        val tablebase = generateTablebase(config)
        setTablebase(tablebase)
    }
    
    @Test
    fun `test AI uses tablebase for KvK endgame`() {
        val board = mapOf(
            "0,0" to Piece(PieceType.KING, Color.WHITE),
            "0,-3" to Piece(PieceType.KING, Color.BLACK)
        )
        
        val result = getAIMoveWithTablebase(board, Color.WHITE, AIDifficulty.MEDIUM)
        
        // Should find a legal move
        assertNotNull(result.bestMove)
        // Score should be 0 for draw
        assertEquals(0, result.score)
    }
    
    @Test
    fun `test AI falls back to search for non-endgame`() {
        val state = createNewGame()
        
        val result = getAIMoveWithTablebase(state.board, Color.WHITE, AIDifficulty.EASY)
        
        // Should find a legal move using regular search
        assertNotNull(result.bestMove)
        // Should have searched some nodes
        assertTrue(result.nodesSearched > 0)
    }
    
    @Test
    fun `test getAIMove integrates tablebase`() {
        val board = mapOf(
            "0,0" to Piece(PieceType.KING, Color.WHITE),
            "0,-3" to Piece(PieceType.KING, Color.BLACK)
        )
        
        val state = GameState(
            board = board,
            turn = Color.WHITE,
            status = GameStatus.Ongoing,
            moveNumber = 1,
            history = emptyList()
        )
        
        val result = getAIMove(state, AIDifficulty.MEDIUM)
        
        // Should find a legal move from tablebase
        assertNotNull(result.bestMove)
        assertEquals(0, result.score)
    }
}
