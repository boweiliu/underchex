/**
 * Underchex - Core Types
 *
 * Hexagonal chess variant with 6-way movement (downgrade from standard chess 8-way).
 * Board uses axial coordinates (q, r) with radius 4 (61 cells).
 *
 * Signed-by: agent #23 claude-sonnet-4 via opencode 20260122T06:57:00
 */
package com.underchex

/**
 * Axial coordinate on hexagonal grid.
 * Uses the "pointy-top" orientation with q = column, r = row.
 */
data class HexCoord(val q: Int, val r: Int) {
    /** Third cubic coordinate (s = -q - r) */
    val s: Int get() = -q - r

    /** Manhattan distance to origin */
    fun distanceToOrigin(): Int = (kotlin.math.abs(q) + kotlin.math.abs(r) + kotlin.math.abs(s)) / 2

    /** Manhattan distance to another coordinate */
    fun distanceTo(other: HexCoord): Int {
        val dq = kotlin.math.abs(q - other.q)
        val dr = kotlin.math.abs(r - other.r)
        val ds = kotlin.math.abs(s - other.s)
        return (dq + dr + ds) / 2
    }

    /** Add direction offset */
    operator fun plus(dir: Direction): HexCoord = HexCoord(q + dir.dq, r + dir.dr)

    /** String key for map storage */
    fun toKey(): String = "$q,$r"

    companion object {
        fun fromKey(key: String): HexCoord {
            val (q, r) = key.split(",").map { it.toInt() }
            return HexCoord(q, r)
        }
    }
}

/**
 * Six cardinal directions on hex grid.
 */
enum class Direction(val dq: Int, val dr: Int) {
    N(0, -1),   // North
    S(0, 1),    // South
    NE(1, -1),  // Northeast
    SW(-1, 1),  // Southwest
    NW(-1, 0),  // Northwest
    SE(1, 0);   // Southeast

    /** Get opposite direction */
    val opposite: Direction
        get() = when (this) {
            N -> S
            S -> N
            NE -> SW
            SW -> NE
            NW -> SE
            SE -> NW
        }

    companion object {
        val all = entries.toList()
    }
}

/**
 * Piece colors
 */
enum class Color {
    WHITE, BLACK;

    val opposite: Color
        get() = if (this == WHITE) BLACK else WHITE
}

/**
 * Lance variants (2 colors based on movement directions).
 * LanceA moves: N, S, NW-SW, NE-SE (vertical + horizontal)
 * LanceB would be the other 4 directions, but we use only one variant.
 */
enum class LanceVariant {
    A, B
}

/**
 * Piece types in Underchex.
 */
enum class PieceType {
    KING,      // Moves 1 square in any of 6 directions
    QUEEN,     // Kingrider - moves N squares in any of 6 directions
    CHARIOT,   // 4-way rider: NE, NW, SE, SW
    LANCE,     // 4-way rider: N, S, NW-SW, NE-SE (comes in 2 colors)
    KNIGHT,    // Leaper - jumps to 6 positions (like bishop in standard chess, 3 colors)
    PAWN       // Moves N, captures N/NE/NW
}

/**
 * A piece on the board.
 */
data class Piece(
    val type: PieceType,
    val color: Color,
    val lanceVariant: LanceVariant? = null  // Only for LANCE pieces
)

/**
 * A move in the game.
 */
data class Move(
    val from: HexCoord,
    val to: HexCoord,
    val captured: Piece? = null,
    val promotion: PieceType? = null
) {
    /** Check if this is a capture */
    val isCapture: Boolean get() = captured != null

    /** Check if this is a promotion */
    val isPromotion: Boolean get() = promotion != null
}

/**
 * Game status.
 */
sealed class GameStatus {
    data object Ongoing : GameStatus()
    data class Checkmate(val winner: Color) : GameStatus()
    data object Stalemate : GameStatus()
    data class Resigned(val winner: Color) : GameStatus()
}

/**
 * Complete game state.
 */
data class GameState(
    val board: Map<String, Piece>,  // key is HexCoord.toKey()
    val turn: Color,
    val status: GameStatus,
    val moveNumber: Int,
    val history: List<Move>
)
