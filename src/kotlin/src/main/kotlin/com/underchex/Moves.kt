/**
 * Underchex - Move Generation
 *
 * Handles pseudo-legal and legal move generation for all piece types.
 *
 * Signed-by: agent #23 claude-sonnet-4 via opencode 20260122T06:57:00
 */
package com.underchex

/**
 * Generate pseudo-legal moves for a piece (ignoring check).
 */
fun generatePseudoLegalMoves(
    board: Map<String, Piece>,
    piece: Piece,
    from: HexCoord
): List<Move> {
    return when (piece.type) {
        PieceType.KING -> generateKingMoves(board, piece, from)
        PieceType.QUEEN -> generateQueenMoves(board, piece, from)
        PieceType.CHARIOT -> generateChariotMoves(board, piece, from)
        PieceType.LANCE -> generateLanceMoves(board, piece, from)
        PieceType.KNIGHT -> generateKnightMoves(board, piece, from)
        PieceType.PAWN -> generatePawnMoves(board, piece, from)
    }
}

/**
 * King moves: 1 step in any of 6 directions.
 */
private fun generateKingMoves(
    board: Map<String, Piece>,
    piece: Piece,
    from: HexCoord
): List<Move> {
    return Direction.all.mapNotNull { dir ->
        val to = from + dir
        if (isValidCell(to)) {
            val captured = board[to.toKey()]
            if (captured == null || captured.color != piece.color) {
                Move(from, to, captured)
            } else null
        } else null
    }
}

/**
 * Queen moves: any number of steps in any of 6 directions (kingrider).
 */
private fun generateQueenMoves(
    board: Map<String, Piece>,
    piece: Piece,
    from: HexCoord
): List<Move> {
    return Direction.all.flatMap { dir ->
        getRayMoves(board, from, dir, piece.color).map { to ->
            Move(from, to, board[to.toKey()])
        }
    }
}

/**
 * Chariot moves: any number of steps in diagonal directions (NE, NW, SE, SW).
 */
private fun generateChariotMoves(
    board: Map<String, Piece>,
    piece: Piece,
    from: HexCoord
): List<Move> {
    val directions = listOf(Direction.NE, Direction.NW, Direction.SE, Direction.SW)
    return directions.flatMap { dir ->
        getRayMoves(board, from, dir, piece.color).map { to ->
            Move(from, to, board[to.toKey()])
        }
    }
}

/**
 * Lance moves: any number of steps in vertical/horizontal directions (N, S, NW-SW, NE-SE).
 * Actually uses N, S for "vertical" and NW, SE for one pair, NE, SW for another.
 * LanceA: N, S, NW, SE
 * LanceB: N, S, NE, SW
 */
private fun generateLanceMoves(
    board: Map<String, Piece>,
    piece: Piece,
    from: HexCoord
): List<Move> {
    val directions = when (piece.lanceVariant) {
        LanceVariant.A -> listOf(Direction.N, Direction.S, Direction.NW, Direction.SE)
        LanceVariant.B -> listOf(Direction.N, Direction.S, Direction.NE, Direction.SW)
        null -> listOf(Direction.N, Direction.S, Direction.NW, Direction.SE) // Default to A
    }
    return directions.flatMap { dir ->
        getRayMoves(board, from, dir, piece.color).map { to ->
            Move(from, to, board[to.toKey()])
        }
    }
}

/**
 * Knight moves: jump to 6 specific positions.
 */
private fun generateKnightMoves(
    board: Map<String, Piece>,
    piece: Piece,
    from: HexCoord
): List<Move> {
    return getKnightTargets(from).mapNotNull { to ->
        val captured = board[to.toKey()]
        if (captured == null || captured.color != piece.color) {
            Move(from, to, captured)
        } else null
    }
}

/**
 * Pawn moves: forward (N for white, S for black), capture forward-diagonal.
 * Can also capture straight forward (inspired by Chinese chess).
 * Promotes on back rank.
 */
private fun generatePawnMoves(
    board: Map<String, Piece>,
    piece: Piece,
    from: HexCoord
): List<Move> {
    val moves = mutableListOf<Move>()
    val forwardDir = if (piece.color == Color.WHITE) Direction.N else Direction.S
    val captureLeft = if (piece.color == Color.WHITE) Direction.NW else Direction.SW
    val captureRight = if (piece.color == Color.WHITE) Direction.NE else Direction.SE

    // Forward move
    val forwardTo = from + forwardDir
    if (isValidCell(forwardTo)) {
        val targetPiece = board[forwardTo.toKey()]
        // Can move forward if empty, or capture if enemy (Chinese chess style)
        if (targetPiece == null || targetPiece.color != piece.color) {
            val isPromotion = isPromotionRank(forwardTo, piece.color)
            if (isPromotion) {
                // Promote to queen
                moves.add(Move(from, forwardTo, targetPiece, PieceType.QUEEN))
            } else {
                moves.add(Move(from, forwardTo, targetPiece))
            }
        }
    }

    // Diagonal captures
    for (captureDir in listOf(captureLeft, captureRight)) {
        val captureTo = from + captureDir
        if (isValidCell(captureTo)) {
            val targetPiece = board[captureTo.toKey()]
            if (targetPiece != null && targetPiece.color != piece.color) {
                val isPromotion = isPromotionRank(captureTo, piece.color)
                if (isPromotion) {
                    moves.add(Move(from, captureTo, targetPiece, PieceType.QUEEN))
                } else {
                    moves.add(Move(from, captureTo, targetPiece))
                }
            }
        }
    }

    return moves
}

/**
 * Check if a cell is on the promotion rank for a color.
 * White promotes at r=-4 (top), Black promotes at r=4 (bottom).
 */
private fun isPromotionRank(coord: HexCoord, color: Color): Boolean {
    return when (color) {
        Color.WHITE -> coord.r == -BOARD_RADIUS
        Color.BLACK -> coord.r == BOARD_RADIUS
    }
}

/**
 * Find the king position for a color.
 */
fun findKing(board: Map<String, Piece>, color: Color): HexCoord? {
    for ((key, piece) in board) {
        if (piece.type == PieceType.KING && piece.color == color) {
            return HexCoord.fromKey(key)
        }
    }
    return null
}

/**
 * Check if a cell is attacked by any piece of the given color.
 */
fun isAttacked(board: Map<String, Piece>, target: HexCoord, byColor: Color): Boolean {
    for ((key, piece) in board) {
        if (piece.color == byColor) {
            val from = HexCoord.fromKey(key)
            val moves = generatePseudoLegalMoves(board, piece, from)
            if (moves.any { it.to == target }) {
                return true
            }
        }
    }
    return false
}

/**
 * Check if the given color is in check.
 */
fun isInCheck(board: Map<String, Piece>, color: Color): Boolean {
    val kingPos = findKing(board, color) ?: return false
    return isAttacked(board, kingPos, color.opposite)
}

/**
 * Apply a move to the board, returning a new board state.
 */
fun applyMove(board: Map<String, Piece>, move: Move): Map<String, Piece> {
    val newBoard = board.toMutableMap()
    val piece = newBoard.remove(move.from.toKey()) ?: return board

    // Handle promotion
    val finalPiece = if (move.promotion != null) {
        Piece(move.promotion, piece.color)
    } else {
        piece
    }

    newBoard[move.to.toKey()] = finalPiece
    return newBoard
}

/**
 * Generate all legal moves for a piece (filters out moves that leave king in check).
 */
fun generateLegalMoves(
    board: Map<String, Piece>,
    piece: Piece,
    from: HexCoord
): List<Move> {
    val pseudoLegal = generatePseudoLegalMoves(board, piece, from)
    return pseudoLegal.filter { move ->
        val newBoard = applyMove(board, move)
        !isInCheck(newBoard, piece.color)
    }
}

/**
 * Generate all legal moves for the current player.
 */
fun getAllLegalMoves(board: Map<String, Piece>, color: Color): List<Move> {
    val moves = mutableListOf<Move>()
    for ((key, piece) in board) {
        if (piece.color == color) {
            val from = HexCoord.fromKey(key)
            moves.addAll(generateLegalMoves(board, piece, from))
        }
    }
    return moves
}

/**
 * Validate if a specific move is legal.
 */
fun isMoveLegal(
    board: Map<String, Piece>,
    from: HexCoord,
    to: HexCoord,
    color: Color
): Boolean {
    val piece = board[from.toKey()] ?: return false
    if (piece.color != color) return false

    val legalMoves = generateLegalMoves(board, piece, from)
    return legalMoves.any { it.to == to }
}
