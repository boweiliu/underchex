/**
 * Underchex - Endgame Tablebase Module
 *
 * Provides perfect endgame play for positions with few pieces:
 * - Precomputed Win/Draw/Loss (WDL) tables
 * - Distance to Mate (DTM) information
 * - Retrograde analysis for tablebase generation
 * - Integration with AI search for endgame positions
 *
 * Supported endgames (initial implementation):
 * - KvK (King vs King) - Always draw
 * - KQvK (King+Queen vs King) - Win for the side with queen
 * - KLvK (King+Lance vs King) - Usually win, some draws
 * - KCvK (King+Chariot vs King) - Usually win, some draws
 * - KNvK (King+Knight vs King) - Draw (insufficient material on hex board)
 *
 * Ported from TypeScript/Python implementations.
 * Signed-by: agent #37 claude-sonnet-4 via opencode 20260122T09:52:00
 */
package com.underchex

import kotlin.math.abs

// ============================================================================
// Tablebase Types
// ============================================================================

/**
 * Win/Draw/Loss outcome for tablebase entries.
 */
enum class WDLOutcome {
    WIN, DRAW, LOSS, UNKNOWN
}

/**
 * Entry in the tablebase for a single position.
 */
data class TablebaseEntry(
    val wdl: WDLOutcome,
    val dtm: Int,  // Distance to mate: 0 for checkmate, -1 for draws, positive for wins
    val bestMoveFrom: HexCoord? = null,
    val bestMoveTo: HexCoord? = null,
    val promotion: PieceType? = null
)

/**
 * Configuration for which piece configurations to support.
 */
data class TablebaseConfig(
    val strongerSide: List<PieceType>,  // Piece types for the stronger side (excluding king)
    val weakerSide: List<PieceType>,  // Piece types for the weaker side (excluding king)
    val name: String
)

/**
 * Generation metadata for a tablebase.
 */
data class TablebaseMetadata(
    val generatedAt: String,
    val generationTimeMs: Long,
    val winCount: Int,
    val drawCount: Int,
    val lossCount: Int
)

/**
 * Tablebase for a specific piece configuration.
 */
data class PieceTablebase(
    val name: String,
    val description: String,
    val entries: MutableMap<String, TablebaseEntry>,
    val size: Int,
    val metadata: TablebaseMetadata
)

/**
 * Result of tablebase probe.
 */
data class TablebaseProbeResult(
    val found: Boolean,
    val entry: TablebaseEntry? = null,
    val tablebaseName: String? = null
)

// ============================================================================
// Global Tablebase Storage
// ============================================================================

private val tablebases = mutableMapOf<String, PieceTablebase>()

fun getTablebase(name: String): PieceTablebase? = tablebases[name]

fun setTablebase(tablebase: PieceTablebase) {
    tablebases[tablebase.name] = tablebase
}

fun getLoadedTablebases(): List<String> = tablebases.keys.toList()

fun clearTablebases() {
    tablebases.clear()
}

// ============================================================================
// Position Key Generation (Simple Zobrist-like hash)
// ============================================================================

private val zobristTable: Array<Array<Array<Long>>> by lazy {
    val random = java.util.Random(0x12345678L)
    Array(9) { Array(9) { Array(12) { random.nextLong() } } }
}
private val zobristSide: Long by lazy { java.util.Random(0x12345678L).nextLong() }

fun generateBoardHash(board: Map<String, Piece>): Long {
    var hash = 0L
    for ((key, piece) in board) {
        val coord = HexCoord.fromKey(key)
        val qi = coord.q + BOARD_RADIUS
        val ri = coord.r + BOARD_RADIUS
        val pieceIndex = piece.type.ordinal * 2 + if (piece.color == Color.WHITE) 0 else 1
        hash = hash xor zobristTable[qi][ri][pieceIndex]
    }
    return hash
}

fun getTablebaseKey(board: Map<String, Piece>, sideToMove: Color): String {
    val boardHash = generateBoardHash(board)
    return "$boardHash-${sideToMove.name}"
}

// ============================================================================
// Configuration Detection
// ============================================================================

/**
 * Detect the piece configuration of a position.
 * Returns null if not a supported tablebase configuration.
 */
fun detectConfiguration(board: Map<String, Piece>): TablebaseConfig? {
    val whitePieces = mutableListOf<PieceType>()
    val blackPieces = mutableListOf<PieceType>()
    
    for ((_, piece) in board) {
        if (piece.type != PieceType.KING) {
            if (piece.color == Color.WHITE) {
                whitePieces.add(piece.type)
            } else {
                blackPieces.add(piece.type)
            }
        }
    }
    
    // KvK
    if (whitePieces.isEmpty() && blackPieces.isEmpty()) {
        return TablebaseConfig(strongerSide = emptyList(), weakerSide = emptyList(), name = "KvK")
    }
    
    // Determine stronger and weaker sides
    val strongerSide: List<PieceType>
    val weakerSide: List<PieceType>
    if (whitePieces.size >= blackPieces.size) {
        strongerSide = whitePieces.sorted()
        weakerSide = blackPieces.sorted()
    } else {
        strongerSide = blackPieces.sorted()
        weakerSide = whitePieces.sorted()
    }
    
    // Generate configuration name
    fun pieceAbbrev(pt: PieceType): String = when (pt) {
        PieceType.QUEEN -> "Q"
        PieceType.LANCE -> "L"
        PieceType.CHARIOT -> "C"
        PieceType.KNIGHT -> "N"
        PieceType.PAWN -> "P"
        PieceType.KING -> "K"
    }
    
    var name = "K"
    for (p in strongerSide) {
        name += pieceAbbrev(p)
    }
    name += "vK"
    for (p in weakerSide) {
        name += pieceAbbrev(p)
    }
    
    // Check if this configuration is supported (max 5 pieces for now)
    val totalPieces = 2 + strongerSide.size + weakerSide.size  // 2 kings
    if (totalPieces > 5) {
        return null  // Too complex for tablebase
    }
    
    // For now, only support configurations where weaker side has no pieces
    if (weakerSide.isNotEmpty()) {
        return null  // Future: support KQvKP etc.
    }
    
    return TablebaseConfig(strongerSide = strongerSide, weakerSide = weakerSide, name = name)
}

// ============================================================================
// Retrograde Analysis
// ============================================================================

private fun isIllegalPosition(board: Map<String, Piece>, sideToMove: Color): Boolean {
    val opponent = sideToMove.opposite
    return isInCheck(board, opponent)
}

private fun getTerminalOutcome(board: Map<String, Piece>, sideToMove: Color): Pair<WDLOutcome, Int>? {
    val moves = getAllLegalMoves(board, sideToMove)
    
    if (moves.isEmpty()) {
        return if (isInCheck(board, sideToMove)) {
            // Checkmate - side to move loses
            Pair(WDLOutcome.LOSS, 0)
        } else {
            // Stalemate - draw
            Pair(WDLOutcome.DRAW, -1)
        }
    }
    
    return null  // Not terminal
}

/**
 * Generate all positions for KvK configuration.
 */
private fun generateKvKPositions(): Sequence<Pair<Map<String, Piece>, Color>> = sequence {
    val allCells = getAllCells()
    
    for (whiteKingPos in allCells) {
        for (blackKingPos in allCells) {
            // Kings cannot be on same cell or adjacent
            if (whiteKingPos == blackKingPos) continue
            if (hexDistance(whiteKingPos, blackKingPos) <= 1) continue
            
            for (sideToMove in listOf(Color.WHITE, Color.BLACK)) {
                val board = mutableMapOf<String, Piece>()
                board[whiteKingPos.toKey()] = Piece(PieceType.KING, Color.WHITE)
                board[blackKingPos.toKey()] = Piece(PieceType.KING, Color.BLACK)
                
                if (!isIllegalPosition(board, sideToMove)) {
                    yield(Pair(board.toMap(), sideToMove))
                }
            }
        }
    }
}

/**
 * Generate all positions for K+Piece vs K configuration.
 */
private fun generateKPvKPositions(pieceType: PieceType): Sequence<Pair<Map<String, Piece>, Color>> = sequence {
    val allCells = getAllCells()
    
    for (whiteKingPos in allCells) {
        for (blackKingPos in allCells) {
            // Kings cannot be on same cell or adjacent
            if (whiteKingPos == blackKingPos) continue
            if (hexDistance(whiteKingPos, blackKingPos) <= 1) continue
            
            val remainingCells = allCells.filter { it != whiteKingPos && it != blackKingPos }
            
            for (piecePos in remainingCells) {
                // Handle lance variants
                val variants: List<LanceVariant?> = if (pieceType == PieceType.LANCE) {
                    listOf(LanceVariant.A, LanceVariant.B)
                } else {
                    listOf(null)
                }
                
                for (variant in variants) {
                    for (sideToMove in listOf(Color.WHITE, Color.BLACK)) {
                        val board = mutableMapOf<String, Piece>()
                        board[whiteKingPos.toKey()] = Piece(PieceType.KING, Color.WHITE)
                        board[blackKingPos.toKey()] = Piece(PieceType.KING, Color.BLACK)
                        board[piecePos.toKey()] = Piece(pieceType, Color.WHITE, variant)
                        
                        if (!isIllegalPosition(board, sideToMove)) {
                            yield(Pair(board.toMap(), sideToMove))
                        }
                    }
                }
            }
        }
    }
}

/**
 * Generate a tablebase for a given configuration using retrograde analysis.
 * 
 * Algorithm:
 * 1. Initialize all positions as unknown
 * 2. Find all checkmate positions (DTM=0, loss for side to move)
 * 3. Propagate backwards: if a position has a move to a lost position, it's winning
 * 4. Continue until no more changes
 * 5. All remaining unknown positions are draws
 */
fun generateTablebase(config: TablebaseConfig): PieceTablebase {
    val startTime = System.currentTimeMillis()
    
    val entries = mutableMapOf<String, TablebaseEntry>()
    var winCount = 0
    var drawCount = 0
    var lossCount = 0
    
    // Phase 1: Initialize all positions and find terminal positions
    val positionMap = mutableMapOf<String, Pair<Map<String, Piece>, Color>>()
    val unknownPositions = mutableSetOf<String>()
    
    val positions: Sequence<Pair<Map<String, Piece>, Color>> = when {
        config.strongerSide.isEmpty() -> generateKvKPositions()
        config.strongerSide.size == 1 -> generateKPvKPositions(config.strongerSide[0])
        else -> emptySequence()  // Not supported yet
    }
    
    for ((board, sideToMove) in positions) {
        val key = getTablebaseKey(board, sideToMove)
        positionMap[key] = Pair(board, sideToMove)
        
        // Check if terminal
        val terminal = getTerminalOutcome(board, sideToMove)
        if (terminal != null) {
            val (wdl, dtm) = terminal
            entries[key] = TablebaseEntry(wdl = wdl, dtm = dtm)
            when (wdl) {
                WDLOutcome.LOSS -> lossCount++
                WDLOutcome.DRAW -> drawCount++
                else -> {}
            }
        } else {
            unknownPositions.add(key)
        }
    }
    
    // Phase 2: Retrograde analysis
    val maxIterations = 500
    var changed = true
    var iteration = 0
    
    while (changed && iteration < maxIterations) {
        changed = false
        iteration++
        
        val toResolve = mutableListOf<String>()
        
        for (key in unknownPositions.toList()) {
            val pos = positionMap[key] ?: continue
            val (board, sideToMove) = pos
            val moves = getAllLegalMoves(board, sideToMove)
            
            var hasWinningMove = false
            var allMovesLose = true
            var bestMoveInfo: Triple<HexCoord, HexCoord, Int>? = null
            var maxDtm = 0
            
            for (move in moves) {
                val newBoard = applyMove(board, move)
                val newKey = getTablebaseKey(newBoard, sideToMove.opposite)
                val opponentEntry = entries[newKey]
                
                if (opponentEntry == null) {
                    // Unknown position - can't conclude yet
                    allMovesLose = false
                    continue
                }
                
                when (opponentEntry.wdl) {
                    WDLOutcome.LOSS -> {
                        // Opponent is lost = we win
                        hasWinningMove = true
                        val thisDtm = opponentEntry.dtm + 1
                        if (bestMoveInfo == null || thisDtm < bestMoveInfo.third) {
                            bestMoveInfo = Triple(move.from, move.to, thisDtm)
                        }
                    }
                    WDLOutcome.WIN -> {
                        // Opponent wins = this move loses for us
                        maxDtm = maxOf(maxDtm, opponentEntry.dtm)
                    }
                    else -> {
                        // Draw - better than losing
                        allMovesLose = false
                    }
                }
            }
            
            if (hasWinningMove && bestMoveInfo != null) {
                toResolve.add(key)
                entries[key] = TablebaseEntry(
                    wdl = WDLOutcome.WIN,
                    dtm = bestMoveInfo.third,
                    bestMoveFrom = bestMoveInfo.first,
                    bestMoveTo = bestMoveInfo.second
                )
                winCount++
                changed = true
            } else if (allMovesLose && moves.isNotEmpty()) {
                toResolve.add(key)
                entries[key] = TablebaseEntry(
                    wdl = WDLOutcome.LOSS,
                    dtm = maxDtm + 1
                )
                lossCount++
                changed = true
            }
        }
        
        // Remove resolved positions from unknown set
        unknownPositions.removeAll(toResolve.toSet())
    }
    
    // Phase 3: All remaining unknown positions are draws
    for (key in unknownPositions) {
        entries[key] = TablebaseEntry(wdl = WDLOutcome.DRAW, dtm = -1)
        drawCount++
    }
    
    val generationTimeMs = System.currentTimeMillis() - startTime
    
    val metadata = TablebaseMetadata(
        generatedAt = java.time.Instant.now().toString(),
        generationTimeMs = generationTimeMs,
        winCount = winCount,
        drawCount = drawCount,
        lossCount = lossCount
    )
    
    return PieceTablebase(
        name = config.name,
        description = "Endgame tablebase for ${config.name}",
        entries = entries,
        size = entries.size,
        metadata = metadata
    )
}

// ============================================================================
// Tablebase Probe
// ============================================================================

/**
 * Probe the tablebase for a position.
 */
fun probeTablebase(board: Map<String, Piece>, sideToMove: Color): TablebaseProbeResult {
    // Detect configuration
    val config = detectConfiguration(board) ?: return TablebaseProbeResult(found = false)
    
    // Get the tablebase for this configuration
    val tablebase = tablebases[config.name] ?: return TablebaseProbeResult(found = false)
    
    // Look up the position
    val key = getTablebaseKey(board, sideToMove)
    val entry = tablebase.entries[key]
    
    return if (entry != null) {
        TablebaseProbeResult(
            found = true,
            entry = entry,
            tablebaseName = config.name
        )
    } else {
        TablebaseProbeResult(found = false)
    }
}

/**
 * Get the tablebase move for a position.
 * Returns the best move according to the tablebase, or null if not found.
 */
fun getTablebaseMove(board: Map<String, Piece>, sideToMove: Color): Move? {
    val result = probeTablebase(board, sideToMove)
    
    if (!result.found || result.entry == null || result.entry.bestMoveFrom == null || result.entry.bestMoveTo == null) {
        return null
    }
    
    val from = result.entry.bestMoveFrom
    val to = result.entry.bestMoveTo
    val captured = board[to.toKey()]
    
    return Move(
        from = from,
        to = to,
        captured = captured,
        promotion = result.entry.promotion
    )
}

/**
 * Get the tablebase evaluation for a position.
 * Returns a score in centipawns, where positive is good for side_to_move.
 *
 * Winning: +CHECKMATE_VALUE - DTM (so quicker mates are better)
 * Drawing: 0
 * Losing: -CHECKMATE_VALUE + DTM (so slower losses are better)
 */
fun getTablebaseScore(board: Map<String, Piece>, sideToMove: Color): Int? {
    val result = probeTablebase(board, sideToMove)
    
    if (!result.found || result.entry == null) {
        return null
    }
    
    return when (result.entry.wdl) {
        WDLOutcome.WIN -> PieceValues.KING - result.entry.dtm
        WDLOutcome.DRAW -> 0
        WDLOutcome.LOSS -> -PieceValues.KING + result.entry.dtm
        WDLOutcome.UNKNOWN -> null
    }
}

/**
 * Check if a position is a tablebase endgame.
 */
fun isTablebaseEndgame(board: Map<String, Piece>): Boolean {
    return detectConfiguration(board) != null
}

// ============================================================================
// Tablebase Initialization
// ============================================================================

/**
 * Generate and load common endgame tablebases.
 * Call this at startup or when tablebases are needed.
 */
fun initializeTablebases() {
    val configs = listOf(
        TablebaseConfig(strongerSide = emptyList(), weakerSide = emptyList(), name = "KvK"),
        TablebaseConfig(strongerSide = listOf(PieceType.QUEEN), weakerSide = emptyList(), name = "KQvK"),
        TablebaseConfig(strongerSide = listOf(PieceType.LANCE), weakerSide = emptyList(), name = "KLvK"),
        TablebaseConfig(strongerSide = listOf(PieceType.CHARIOT), weakerSide = emptyList(), name = "KCvK"),
        TablebaseConfig(strongerSide = listOf(PieceType.KNIGHT), weakerSide = emptyList(), name = "KNvK"),
    )
    
    for (config in configs) {
        val tablebase = generateTablebase(config)
        setTablebase(tablebase)
    }
}

/**
 * Generate a single tablebase on demand.
 */
fun generateTablebaseOnDemand(name: String): PieceTablebase? {
    // Parse the configuration from the name
    // Format: K[pieces]vK[pieces]
    val regex = Regex("^K([QLCNP]*)vK([QLCNP]*)$")
    val match = regex.matchEntire(name) ?: return null
    
    val pieceMap = mapOf(
        'Q' to PieceType.QUEEN,
        'L' to PieceType.LANCE,
        'C' to PieceType.CHARIOT,
        'N' to PieceType.KNIGHT,
        'P' to PieceType.PAWN
    )
    
    val strongerSide = match.groupValues[1].mapNotNull { pieceMap[it] }
    val weakerSide = match.groupValues[2].mapNotNull { pieceMap[it] }
    
    val config = TablebaseConfig(strongerSide = strongerSide, weakerSide = weakerSide, name = name)
    val tablebase = generateTablebase(config)
    setTablebase(tablebase)
    
    return tablebase
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Get statistics about loaded tablebases.
 */
fun getTablebaseStatistics(): Map<String, Any> {
    var totalEntries = 0
    val stats = mutableListOf<Map<String, Any>>()
    
    for ((name, tb) in tablebases) {
        totalEntries += tb.size
        stats.add(mapOf(
            "name" to name,
            "size" to tb.size,
            "wins" to tb.metadata.winCount,
            "draws" to tb.metadata.drawCount,
            "losses" to tb.metadata.lossCount,
            "generationTimeMs" to tb.metadata.generationTimeMs
        ))
    }
    
    return mapOf("totalEntries" to totalEntries, "tablebases" to stats)
}

/**
 * Format tablebase statistics for display.
 */
fun formatTablebaseStatistics(): String {
    val stats = getTablebaseStatistics()
    val builder = StringBuilder()
    
    builder.appendLine("=== Endgame Tablebase Statistics ===")
    builder.appendLine()
    builder.appendLine("Total entries: ${stats["totalEntries"]}")
    
    @Suppress("UNCHECKED_CAST")
    val tbStats = stats["tablebases"] as List<Map<String, Any>>
    builder.appendLine("Loaded tablebases: ${tbStats.size}")
    builder.appendLine()
    
    for (tb in tbStats) {
        builder.appendLine("${tb["name"]}:")
        builder.appendLine("  Size: ${tb["size"]} positions")
        val size = tb["size"] as Int
        if (size > 0) {
            val wins = tb["wins"] as Int
            val draws = tb["draws"] as Int
            val losses = tb["losses"] as Int
            builder.appendLine("  Wins: $wins (${100.0 * wins / size}%)")
            builder.appendLine("  Draws: $draws (${100.0 * draws / size}%)")
            builder.appendLine("  Losses: $losses (${100.0 * losses / size}%)")
        }
        builder.appendLine("  Generation time: ${tb["generationTimeMs"]}ms")
        builder.appendLine()
    }
    
    return builder.toString()
}
