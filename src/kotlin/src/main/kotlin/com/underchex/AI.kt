/**
 * Underchex - AI Module
 *
 * Simple alpha-beta search AI with basic evaluation.
 *
 * Signed-by: agent #23 claude-sonnet-4 via opencode 20260122T06:57:00
 */
package com.underchex

import kotlin.math.max
import kotlin.math.min

/**
 * AI difficulty levels.
 */
enum class AIDifficulty(val depth: Int) {
    EASY(2),
    MEDIUM(4),
    HARD(6)
}

/**
 * Result of AI search.
 */
data class AIResult(
    val bestMove: Move?,
    val score: Int,
    val nodesSearched: Int
)

/**
 * Piece values in centipawns.
 */
object PieceValues {
    const val PAWN = 100
    const val KNIGHT = 300
    const val LANCE = 450
    const val CHARIOT = 450
    const val QUEEN = 900
    const val KING = 10000  // Effectively infinite
}

/**
 * Get the value of a piece.
 */
fun getPieceValue(piece: Piece): Int {
    return when (piece.type) {
        PieceType.PAWN -> PieceValues.PAWN
        PieceType.KNIGHT -> PieceValues.KNIGHT
        PieceType.LANCE -> PieceValues.LANCE
        PieceType.CHARIOT -> PieceValues.CHARIOT
        PieceType.QUEEN -> PieceValues.QUEEN
        PieceType.KING -> PieceValues.KING
    }
}

/**
 * Evaluate the board position from WHITE's perspective.
 */
fun evaluatePosition(board: Map<String, Piece>): Int {
    var score = 0

    for ((key, piece) in board) {
        val coord = HexCoord.fromKey(key)
        val pieceValue = getPieceValue(piece)
        val positionBonus = getCentralityBonus(coord)

        val total = pieceValue + positionBonus
        score += if (piece.color == Color.WHITE) total else -total
    }

    return score
}

/**
 * Bonus for central positions.
 */
fun getCentralityBonus(coord: HexCoord): Int {
    val distance = coord.distanceToOrigin()
    // Max bonus at center, decreasing towards edges
    return max(0, (BOARD_RADIUS - distance) * 5)
}

/**
 * Estimate move value for move ordering (MVV-LVA).
 */
fun estimateMoveValue(move: Move): Int {
    var value = 0

    // Captures: victim value - attacker value / 10
    if (move.captured != null) {
        value += getPieceValue(move.captured) * 10
    }

    // Promotions are valuable
    if (move.promotion != null) {
        value += getPieceValue(Piece(move.promotion, Color.WHITE)) - PieceValues.PAWN
    }

    return value
}

/**
 * Order moves for better alpha-beta pruning.
 */
fun orderMoves(moves: List<Move>): List<Move> {
    return moves.sortedByDescending { estimateMoveValue(it) }
}

/**
 * Alpha-beta search.
 */
fun alphaBeta(
    board: Map<String, Piece>,
    depth: Int,
    alpha: Int,
    beta: Int,
    maximizing: Boolean,
    nodesSearched: IntArray  // Mutable counter
): Int {
    nodesSearched[0]++

    val color = if (maximizing) Color.WHITE else Color.BLACK
    val moves = getAllLegalMoves(board, color)

    // Terminal conditions
    if (moves.isEmpty()) {
        return if (isInCheck(board, color)) {
            // Checkmate
            if (maximizing) -PieceValues.KING + depth else PieceValues.KING - depth
        } else {
            // Stalemate
            0
        }
    }

    if (depth == 0) {
        return evaluatePosition(board)
    }

    val orderedMoves = orderMoves(moves)
    var currentAlpha = alpha
    var currentBeta = beta

    if (maximizing) {
        var maxEval = Int.MIN_VALUE
        for (move in orderedMoves) {
            val newBoard = applyMove(board, move)
            val eval = alphaBeta(newBoard, depth - 1, currentAlpha, currentBeta, false, nodesSearched)
            maxEval = max(maxEval, eval)
            currentAlpha = max(currentAlpha, eval)
            if (currentBeta <= currentAlpha) {
                break  // Beta cutoff
            }
        }
        return maxEval
    } else {
        var minEval = Int.MAX_VALUE
        for (move in orderedMoves) {
            val newBoard = applyMove(board, move)
            val eval = alphaBeta(newBoard, depth - 1, currentAlpha, currentBeta, true, nodesSearched)
            minEval = min(minEval, eval)
            currentBeta = min(currentBeta, eval)
            if (currentBeta <= currentAlpha) {
                break  // Alpha cutoff
            }
        }
        return minEval
    }
}

/**
 * Find the best move for the given color.
 */
fun findBestMove(
    board: Map<String, Piece>,
    color: Color,
    difficulty: AIDifficulty
): AIResult {
    val moves = getAllLegalMoves(board, color)
    if (moves.isEmpty()) {
        return AIResult(null, 0, 0)
    }

    val nodesSearched = intArrayOf(0)
    val maximizing = color == Color.WHITE
    var bestMove: Move? = null
    var bestScore = if (maximizing) Int.MIN_VALUE else Int.MAX_VALUE

    val orderedMoves = orderMoves(moves)

    for (move in orderedMoves) {
        val newBoard = applyMove(board, move)
        val score = alphaBeta(
            newBoard,
            difficulty.depth - 1,
            Int.MIN_VALUE,
            Int.MAX_VALUE,
            !maximizing,
            nodesSearched
        )

        if (maximizing && score > bestScore) {
            bestScore = score
            bestMove = move
        } else if (!maximizing && score < bestScore) {
            bestScore = score
            bestMove = move
        }
    }

    return AIResult(bestMove, bestScore, nodesSearched[0])
}

/**
 * Get AI move for a game state.
 */
fun getAIMove(state: GameState, difficulty: AIDifficulty): AIResult {
    return findBestMove(state.board, state.turn, difficulty)
}

/**
 * Make AI move in a game state.
 */
fun makeAIMove(state: GameState, difficulty: AIDifficulty): GameState? {
    val result = getAIMove(state, difficulty)
    val move = result.bestMove ?: return null
    return makeMove(state, move.from, move.to)
}
