/**
 * Underchex - Game State Management
 *
 * Handles game creation, move execution, and status updates.
 *
 * Signed-by: agent #23 claude-sonnet-4 via opencode 20260122T06:57:00
 */
package com.underchex

/**
 * Create a new game with standard starting position.
 */
fun createNewGame(): GameState {
    val board = createStartingPosition()
    return GameState(
        board = board,
        turn = Color.WHITE,
        status = GameStatus.Ongoing,
        moveNumber = 1,
        history = emptyList()
    )
}

/**
 * Create the standard starting position.
 *
 * White pieces start at bottom (positive r), Black at top (negative r).
 *
 * Back rank (r=4 for white, r=-4 for black):
 *   Lance-A, Knight, Chariot, Queen, King, Chariot, Knight, Lance-B
 *
 * Pawns on second rank (r=3 for white, r=-3 for black)
 */
fun createStartingPosition(): Map<String, Piece> {
    val board = mutableMapOf<String, Piece>()

    // White back rank (r = 4)
    placeBackRank(board, Color.WHITE, 4)

    // White pawns (r = 3)
    placePawns(board, Color.WHITE, 3)

    // Black back rank (r = -4)
    placeBackRank(board, Color.BLACK, -4)

    // Black pawns (r = -3)
    placePawns(board, Color.BLACK, -3)

    return board
}

private fun placeBackRank(board: MutableMap<String, Piece>, color: Color, row: Int) {
    // Valid q values for row r=4 or r=-4: q from -BOARD_RADIUS+|r| to BOARD_RADIUS-|r|
    // For r=4: q from 0 to 0 (only center)
    // Actually, we need to check valid cells. For r=4, valid q range is limited.

    // Let's enumerate valid cells for the back rank
    val validCells = getAllCells().filter { it.r == row }.sortedBy { it.q }

    // Place pieces symmetrically
    // For a hex board with radius 4, at r=4 (or -4), we have fewer cells
    // r=4: valid cells are limited by distance constraint

    // Let's check: at r=4, valid q are those where |q| + |4| + |-q-4| <= 8
    // Simplifying: we need distance from origin <= 4

    if (validCells.size >= 5) {
        // Center piece is King
        val mid = validCells.size / 2
        val pieces = when (validCells.size) {
            5 -> listOf(
                // Lance, Knight, King, Knight, Lance
                Piece(PieceType.LANCE, color, LanceVariant.A),
                Piece(PieceType.KNIGHT, color),
                Piece(PieceType.KING, color),
                Piece(PieceType.KNIGHT, color),
                Piece(PieceType.LANCE, color, LanceVariant.B)
            )
            7 -> listOf(
                Piece(PieceType.LANCE, color, LanceVariant.A),
                Piece(PieceType.KNIGHT, color),
                Piece(PieceType.CHARIOT, color),
                Piece(PieceType.KING, color),
                Piece(PieceType.CHARIOT, color),
                Piece(PieceType.KNIGHT, color),
                Piece(PieceType.LANCE, color, LanceVariant.B)
            )
            9 -> listOf(
                Piece(PieceType.LANCE, color, LanceVariant.A),
                Piece(PieceType.KNIGHT, color),
                Piece(PieceType.CHARIOT, color),
                Piece(PieceType.QUEEN, color),
                Piece(PieceType.KING, color),
                Piece(PieceType.QUEEN, color),
                Piece(PieceType.CHARIOT, color),
                Piece(PieceType.KNIGHT, color),
                Piece(PieceType.LANCE, color, LanceVariant.B)
            )
            else -> {
                // Fallback: just place king in center
                val kingCell = validCells[mid]
                board[kingCell.toKey()] = Piece(PieceType.KING, color)
                return
            }
        }

        for ((i, cell) in validCells.withIndex()) {
            if (i < pieces.size) {
                board[cell.toKey()] = pieces[i]
            }
        }
    } else if (validCells.isNotEmpty()) {
        // Just place king
        board[validCells[validCells.size / 2].toKey()] = Piece(PieceType.KING, color)
    }
}

private fun placePawns(board: MutableMap<String, Piece>, color: Color, row: Int) {
    val validCells = getAllCells().filter { it.r == row }
    for (cell in validCells) {
        board[cell.toKey()] = Piece(PieceType.PAWN, color)
    }
}

/**
 * Make a move in the game, returning a new game state or null if invalid.
 */
fun makeMove(state: GameState, from: HexCoord, to: HexCoord): GameState? {
    if (state.status != GameStatus.Ongoing) return null

    val piece = state.board[from.toKey()] ?: return null
    if (piece.color != state.turn) return null

    val legalMoves = generateLegalMoves(state.board, piece, from)
    val move = legalMoves.find { it.to == to } ?: return null

    val newBoard = applyMove(state.board, move)
    val nextTurn = state.turn.opposite

    // Check for checkmate or stalemate
    val opponentMoves = getAllLegalMoves(newBoard, nextTurn)
    val status = when {
        opponentMoves.isEmpty() && isInCheck(newBoard, nextTurn) ->
            GameStatus.Checkmate(state.turn)
        opponentMoves.isEmpty() ->
            GameStatus.Stalemate
        else ->
            GameStatus.Ongoing
    }

    return GameState(
        board = newBoard,
        turn = nextTurn,
        status = status,
        moveNumber = if (state.turn == Color.BLACK) state.moveNumber + 1 else state.moveNumber,
        history = state.history + move
    )
}

/**
 * Resign the game for a player.
 */
fun resign(state: GameState, resigningColor: Color): GameState {
    return state.copy(status = GameStatus.Resigned(resigningColor.opposite))
}

/**
 * Check if the current player is in check.
 */
fun isCurrentPlayerInCheck(state: GameState): Boolean {
    return isInCheck(state.board, state.turn)
}

/**
 * Get all legal moves for the current player.
 */
fun getLegalMoves(state: GameState): List<Move> {
    return getAllLegalMoves(state.board, state.turn)
}
