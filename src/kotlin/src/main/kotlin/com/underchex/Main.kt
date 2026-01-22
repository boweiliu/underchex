/**
 * Underchex - Kotlin CLI Application
 *
 * Terminal interface for playing Underchex against AI or another player.
 *
 * Signed-by: agent #23 claude-sonnet-4 via opencode 20260122T06:57:00
 */
package com.underchex

import kotlin.system.exitProcess

// ANSI color codes
const val RESET = "\u001B[0m"
const val BOLD = "\u001B[1m"
const val RED = "\u001B[31m"
const val GREEN = "\u001B[32m"
const val YELLOW = "\u001B[33m"
const val BLUE = "\u001B[34m"
const val CYAN = "\u001B[36m"
const val WHITE_BG = "\u001B[47m"
const val BLACK_FG = "\u001B[30m"

// Piece symbols (Unicode chess pieces)
val PIECE_SYMBOLS = mapOf(
    PieceType.KING to Pair("♔", "♚"),
    PieceType.QUEEN to Pair("♕", "♛"),
    PieceType.CHARIOT to Pair("♖", "♜"),
    PieceType.LANCE to Pair("♗", "♝"),
    PieceType.KNIGHT to Pair("♘", "♞"),
    PieceType.PAWN to Pair("♙", "♟")
)

/**
 * Get piece symbol for display.
 */
fun getPieceSymbol(piece: Piece): String {
    val (white, black) = PIECE_SYMBOLS[piece.type] ?: Pair("?", "?")
    return if (piece.color == Color.WHITE) white else black
}

/**
 * Print the board in a simple text format.
 */
fun printBoard(state: GameState) {
    println("\n${CYAN}=== UNDERCHEX ===${RESET}")
    println("Turn: ${BOLD}${state.turn}${RESET} | Move: ${state.moveNumber}")

    if (isCurrentPlayerInCheck(state)) {
        println("${RED}${BOLD}CHECK!${RESET}")
    }

    println()

    // Print board with row-by-row hex display
    for (r in -BOARD_RADIUS..BOARD_RADIUS) {
        // Indent based on row to create hex shape
        val indent = " ".repeat(kotlin.math.abs(r) * 2)
        print(indent)

        // Print cells for this row
        val cells = getAllCells().filter { it.r == r }.sortedBy { it.q }
        for (cell in cells) {
            val piece = state.board[cell.toKey()]
            val symbol = if (piece != null) {
                val color = if (piece.color == Color.WHITE) WHITE_BG + BLACK_FG else ""
                "$color${getPieceSymbol(piece)}$RESET"
            } else {
                val cellColor = getCellColor(cell)
                when (cellColor) {
                    0 -> "·"
                    1 -> "○"
                    else -> "◦"
                }
            }
            print(" $symbol ")
        }
        println(" (r=$r)")
    }

    println()
}

/**
 * Print status message.
 */
fun printStatus(state: GameState) {
    when (val status = state.status) {
        is GameStatus.Ongoing -> {}
        is GameStatus.Checkmate -> {
            println("${GREEN}${BOLD}CHECKMATE! ${status.winner} wins!${RESET}")
        }
        is GameStatus.Stalemate -> {
            println("${YELLOW}${BOLD}STALEMATE! Draw.${RESET}")
        }
        is GameStatus.Resigned -> {
            println("${GREEN}${BOLD}${status.winner} wins by resignation!${RESET}")
        }
    }
}

/**
 * Parse a coordinate from user input (format: "q,r" or "q r").
 */
fun parseCoord(input: String): HexCoord? {
    val parts = input.replace(",", " ").split("\\s+".toRegex()).filter { it.isNotEmpty() }
    if (parts.size != 2) return null
    return try {
        val q = parts[0].toInt()
        val r = parts[1].toInt()
        HexCoord(q, r)
    } catch (_: NumberFormatException) {
        null
    }
}

/**
 * Print help message.
 */
fun printHelp() {
    println("""
        ${CYAN}Commands:${RESET}
          ${BOLD}move <q1> <r1> <q2> <r2>${RESET} - Make a move from (q1,r1) to (q2,r2)
          ${BOLD}ai${RESET}                      - Let AI make a move
          ${BOLD}hint${RESET}                    - Get AI suggestion
          ${BOLD}legal${RESET}                   - Show all legal moves
          ${BOLD}legal <q> <r>${RESET}           - Show legal moves for piece at (q,r)
          ${BOLD}new${RESET}                     - Start a new game
          ${BOLD}resign${RESET}                  - Resign the game
          ${BOLD}eval${RESET}                    - Show position evaluation
          ${BOLD}help${RESET}                    - Show this help
          ${BOLD}quit${RESET}                    - Exit the game
        
        ${CYAN}Coordinates:${RESET}
          Use axial coordinates (q, r) where q is column, r is row.
          Center of board is (0, 0).
          Example: "move 0 3 0 2" moves a white pawn forward.
    """.trimIndent())
}

/**
 * Main game loop.
 */
fun main() {
    println("${BOLD}${CYAN}Welcome to Underchex!${RESET}")
    println("Type 'help' for commands.\n")

    var state = createNewGame()
    var aiDifficulty = AIDifficulty.MEDIUM

    printBoard(state)

    while (true) {
        print("${BOLD}>${RESET} ")
        val line = readLine()?.trim()?.lowercase() ?: break

        if (line.isEmpty()) continue

        val parts = line.split("\\s+".toRegex())
        val command = parts[0]

        when (command) {
            "quit", "exit", "q" -> {
                println("Goodbye!")
                exitProcess(0)
            }

            "help", "h", "?" -> {
                printHelp()
            }

            "new", "reset" -> {
                state = createNewGame()
                println("New game started.")
                printBoard(state)
            }

            "move", "m" -> {
                if (parts.size < 5) {
                    println("${RED}Usage: move <q1> <r1> <q2> <r2>${RESET}")
                    continue
                }
                try {
                    val fromQ = parts[1].toInt()
                    val fromR = parts[2].toInt()
                    val toQ = parts[3].toInt()
                    val toR = parts[4].toInt()

                    val from = HexCoord(fromQ, fromR)
                    val to = HexCoord(toQ, toR)

                    val newState = makeMove(state, from, to)
                    if (newState != null) {
                        state = newState
                        printBoard(state)
                        printStatus(state)
                    } else {
                        println("${RED}Invalid move!${RESET}")
                    }
                } catch (_: NumberFormatException) {
                    println("${RED}Invalid coordinates!${RESET}")
                }
            }

            "ai" -> {
                if (state.status != GameStatus.Ongoing) {
                    println("${YELLOW}Game is over!${RESET}")
                    continue
                }
                println("${CYAN}AI thinking...${RESET}")
                val result = getAIMove(state, aiDifficulty)
                if (result.bestMove != null) {
                    val move = result.bestMove
                    println("AI plays: (${move.from.q},${move.from.r}) -> (${move.to.q},${move.to.r})")
                    println("Score: ${result.score / 100.0}, Nodes: ${result.nodesSearched}")
                    state = makeMove(state, move.from, move.to) ?: state
                    printBoard(state)
                    printStatus(state)
                } else {
                    println("${RED}No legal moves!${RESET}")
                }
            }

            "hint" -> {
                if (state.status != GameStatus.Ongoing) {
                    println("${YELLOW}Game is over!${RESET}")
                    continue
                }
                println("${CYAN}Calculating hint...${RESET}")
                val result = getAIMove(state, aiDifficulty)
                if (result.bestMove != null) {
                    val move = result.bestMove
                    println("${GREEN}Best move: (${move.from.q},${move.from.r}) -> (${move.to.q},${move.to.r})${RESET}")
                    println("Score: ${result.score / 100.0} pawns, Nodes: ${result.nodesSearched}")
                } else {
                    println("${RED}No legal moves!${RESET}")
                }
            }

            "legal", "moves" -> {
                if (parts.size >= 3) {
                    // Legal moves for specific piece
                    try {
                        val q = parts[1].toInt()
                        val r = parts[2].toInt()
                        val coord = HexCoord(q, r)
                        val piece = state.board[coord.toKey()]
                        if (piece == null) {
                            println("${RED}No piece at ($q, $r)${RESET}")
                        } else if (piece.color != state.turn) {
                            println("${RED}Not your piece!${RESET}")
                        } else {
                            val moves = generateLegalMoves(state.board, piece, coord)
                            println("Legal moves for ${piece.type} at ($q, $r):")
                            for (move in moves) {
                                val capture = if (move.captured != null) " captures ${move.captured.type}" else ""
                                val promo = if (move.promotion != null) " promotes to ${move.promotion}" else ""
                                println("  -> (${move.to.q}, ${move.to.r})$capture$promo")
                            }
                        }
                    } catch (_: NumberFormatException) {
                        println("${RED}Invalid coordinates!${RESET}")
                    }
                } else {
                    // All legal moves
                    val moves = getLegalMoves(state)
                    println("Legal moves (${moves.size} total):")
                    for (move in moves.take(20)) {
                        val capture = if (move.captured != null) " x${move.captured.type}" else ""
                        println("  (${move.from.q},${move.from.r}) -> (${move.to.q},${move.to.r})$capture")
                    }
                    if (moves.size > 20) {
                        println("  ... and ${moves.size - 20} more")
                    }
                }
            }

            "eval" -> {
                val score = evaluatePosition(state.board)
                val prefix = if (score > 0) "+" else ""
                println("Evaluation: $prefix${score / 100.0} pawns (from White's perspective)")
            }

            "resign" -> {
                state = resign(state, state.turn)
                printBoard(state)
                printStatus(state)
            }

            "difficulty", "diff" -> {
                if (parts.size >= 2) {
                    aiDifficulty = when (parts[1]) {
                        "easy", "e", "1" -> AIDifficulty.EASY
                        "medium", "m", "2" -> AIDifficulty.MEDIUM
                        "hard", "h", "3" -> AIDifficulty.HARD
                        else -> aiDifficulty
                    }
                }
                println("AI difficulty: $aiDifficulty (depth ${aiDifficulty.depth})")
            }

            "board", "show" -> {
                printBoard(state)
            }

            else -> {
                println("${RED}Unknown command: $command${RESET}")
                println("Type 'help' for available commands.")
            }
        }
    }
}
