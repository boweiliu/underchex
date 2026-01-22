/**
 * Underchex - Board Operations
 *
 * Board is a hexagonal grid with radius 4, containing 61 cells.
 * Coordinates use axial system (q, r).
 *
 * Signed-by: agent #23 claude-sonnet-4 via opencode 20260122T06:57:00
 */
package com.underchex

/** Board radius (cells from center to edge) */
const val BOARD_RADIUS = 4

/**
 * Check if a coordinate is valid on the board.
 */
fun isValidCell(coord: HexCoord): Boolean {
    return coord.distanceToOrigin() <= BOARD_RADIUS
}

/**
 * Get all valid cells on the board.
 */
fun getAllCells(): List<HexCoord> {
    val cells = mutableListOf<HexCoord>()
    for (q in -BOARD_RADIUS..BOARD_RADIUS) {
        for (r in -BOARD_RADIUS..BOARD_RADIUS) {
            val coord = HexCoord(q, r)
            if (isValidCell(coord)) {
                cells.add(coord)
            }
        }
    }
    return cells
}

/**
 * Get neighbor in a given direction.
 */
fun getNeighbor(coord: HexCoord, dir: Direction): HexCoord? {
    val neighbor = coord + dir
    return if (isValidCell(neighbor)) neighbor else null
}

/**
 * Get all valid neighbors of a cell.
 */
fun getNeighbors(coord: HexCoord): List<HexCoord> {
    return Direction.all.mapNotNull { getNeighbor(coord, it) }
}

/**
 * Get a ray of cells in a direction (for sliding pieces).
 * Returns cells from start (exclusive) to edge or first piece.
 */
fun getRay(
    board: Map<String, Piece>,
    start: HexCoord,
    dir: Direction
): List<HexCoord> {
    val ray = mutableListOf<HexCoord>()
    var current = start + dir
    while (isValidCell(current)) {
        ray.add(current)
        if (board.containsKey(current.toKey())) {
            break  // Stop at first piece
        }
        current = current + dir
    }
    return ray
}

/**
 * Get all cells a ray can reach, including the first enemy piece (for captures).
 */
fun getRayMoves(
    board: Map<String, Piece>,
    start: HexCoord,
    dir: Direction,
    color: Color
): List<HexCoord> {
    val moves = mutableListOf<HexCoord>()
    var current = start + dir
    while (isValidCell(current)) {
        val piece = board[current.toKey()]
        if (piece == null) {
            moves.add(current)
        } else {
            if (piece.color != color) {
                moves.add(current)  // Capture
            }
            break  // Stop at piece
        }
        current = current + dir
    }
    return moves
}

/**
 * Get knight jump targets (6 positions).
 * Knight moves like a bishop in standard chess - leaps to cells that are
 * 2 "diagonal" steps away (N-NE, N-NW, S-SE, S-SW, NE-SE, NW-SW).
 */
fun getKnightTargets(coord: HexCoord): List<HexCoord> {
    // Knight jumps are combinations of two different directions
    val jumps = listOf(
        // N + NE = (0,-1) + (1,-1) = (1,-2)
        HexCoord(coord.q + 1, coord.r - 2),
        // N + NW = (0,-1) + (-1,0) = (-1,-1)
        HexCoord(coord.q - 1, coord.r - 1),
        // S + SE = (0,1) + (1,0) = (1,1)
        HexCoord(coord.q + 1, coord.r + 1),
        // S + SW = (0,1) + (-1,1) = (-1,2)
        HexCoord(coord.q - 1, coord.r + 2),
        // NE + SE = (1,-1) + (1,0) = (2,-1)
        HexCoord(coord.q + 2, coord.r - 1),
        // NW + SW = (-1,0) + (-1,1) = (-2,1)
        HexCoord(coord.q - 2, coord.r + 1)
    )
    return jumps.filter { isValidCell(it) }
}

/**
 * Get hex distance between two coordinates.
 */
fun hexDistance(a: HexCoord, b: HexCoord): Int = a.distanceTo(b)

/**
 * Get the color of a hex cell (3-color pattern for visual distinction).
 * Used for board rendering.
 */
fun getCellColor(coord: HexCoord): Int {
    // Use q coordinate mod 3 for consistent coloring
    return ((coord.q % 3) + 3) % 3
}
