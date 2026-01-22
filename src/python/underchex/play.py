#!/usr/bin/env python3
"""
Underchex Terminal Play CLI

Interactive command-line interface for playing Underchex against the AI.

Signed-by: agent #17 claude-sonnet-4 via opencode 20260122T05:47:09
"""

import argparse
import sys
from typing import Optional

from .types import (
    HexCoord,
    Color,
    Piece,
    Move,
    GameState,
    coord_to_string,
    opposite_color,
    BOARD_RADIUS,
)

from .game import (
    create_new_game,
    make_move,
    get_legal_moves,
    is_current_player_in_check,
)

from .moves import (
    get_piece_at,
    generate_all_legal_moves,
)

from .board import is_valid_cell

from .ai import (
    get_ai_move,
    evaluate_position,
    AIDifficulty,
)


# ============================================================================
# ANSI Colors
# ============================================================================

class Colors:
    """ANSI color codes for terminal output."""
    RESET = "\033[0m"
    BOLD = "\033[1m"
    
    # Piece colors
    WHITE_PIECE = "\033[97m"  # Bright white
    BLACK_PIECE = "\033[94m"  # Blue
    
    # Board colors
    LIGHT_CELL = "\033[48;5;252m"  # Light gray background
    DARK_CELL = "\033[48;5;240m"   # Dark gray background
    SELECTED = "\033[48;5;226m"    # Yellow background
    LEGAL_MOVE = "\033[48;5;119m"  # Green background
    
    # Text
    INFO = "\033[96m"   # Cyan
    ERROR = "\033[91m"  # Red
    SUCCESS = "\033[92m"  # Green


# ============================================================================
# Piece Symbols
# ============================================================================

PIECE_SYMBOLS = {
    "king": "K",
    "queen": "Q",
    "knight": "N",
    "lance": "L",
    "chariot": "C",
    "pawn": "P",
}


def get_piece_symbol(piece: Piece) -> str:
    """Get the display symbol for a piece."""
    symbol = PIECE_SYMBOLS.get(piece.type, "?")
    if piece.color == "white":
        return f"{Colors.WHITE_PIECE}{Colors.BOLD}{symbol}{Colors.RESET}"
    else:
        return f"{Colors.BLACK_PIECE}{Colors.BOLD}{symbol}{Colors.RESET}"


# ============================================================================
# Board Rendering
# ============================================================================

def render_board(
    state: GameState,
    selected: Optional[HexCoord] = None,
    legal_targets: Optional[set[str]] = None
) -> str:
    """Render the board as ASCII art with ANSI colors."""
    lines = []
    
    # Header
    lines.append(f"\n{Colors.INFO}  Move {state.move_number} - {state.turn.capitalize()}'s turn{Colors.RESET}")
    if is_current_player_in_check(state):
        lines.append(f"{Colors.ERROR}  CHECK!{Colors.RESET}")
    lines.append("")
    
    # Build the hex grid display
    # We'll render row by row, from r=-4 to r=4
    for r in range(-BOARD_RADIUS, BOARD_RADIUS + 1):
        # Calculate indentation based on row
        indent = abs(r) * 2
        line = " " * indent
        
        # Determine q range for this row
        q_min = max(-BOARD_RADIUS, -BOARD_RADIUS - r)
        q_max = min(BOARD_RADIUS, BOARD_RADIUS - r)
        
        cells = []
        for q in range(q_min, q_max + 1):
            coord = HexCoord(q=q, r=r)
            pos_str = coord_to_string(coord)
            
            # Determine cell background
            is_selected = selected is not None and selected.q == q and selected.r == r
            is_legal = legal_targets is not None and pos_str in legal_targets
            
            if is_selected:
                bg = Colors.SELECTED
            elif is_legal:
                bg = Colors.LEGAL_MOVE
            elif (q + r) % 2 == 0:
                bg = Colors.LIGHT_CELL
            else:
                bg = Colors.DARK_CELL
            
            # Get piece if any
            piece = get_piece_at(state.board, coord)
            if piece is not None:
                content = get_piece_symbol(piece)
            else:
                content = " "
            
            cells.append(f"{bg} {content} {Colors.RESET}")
        
        line += "".join(cells)
        
        # Add row label
        line += f"  r={r}"
        
        lines.append(line)
    
    # Footer with q labels
    lines.append("")
    q_labels = "  " + " " * (BOARD_RADIUS * 2)
    for q in range(-BOARD_RADIUS, BOARD_RADIUS + 1):
        q_labels += f" {q:2d} "
    lines.append(f"    {' ' * BOARD_RADIUS}q=")
    
    # Evaluation
    eval_score = evaluate_position(state.board)
    if eval_score > 0:
        eval_str = f"+{eval_score/100:.2f}"
    else:
        eval_str = f"{eval_score/100:.2f}"
    lines.append(f"\n{Colors.INFO}  Evaluation: {eval_str} (white's perspective){Colors.RESET}")
    
    return "\n".join(lines)


# ============================================================================
# Input Parsing
# ============================================================================

def parse_coord(s: str) -> Optional[HexCoord]:
    """
    Parse a coordinate string to HexCoord.
    Accepts formats: "q,r" or "q r"
    """
    s = s.strip()
    parts = s.replace(",", " ").split()
    if len(parts) != 2:
        return None
    try:
        q = int(parts[0])
        r = int(parts[1])
        coord = HexCoord(q=q, r=r)
        if not is_valid_cell(coord):
            return None
        return coord
    except ValueError:
        return None


def parse_move(s: str) -> tuple[Optional[HexCoord], Optional[HexCoord]]:
    """
    Parse a move string to (from, to) coordinates.
    Accepts formats: "q1,r1 q2,r2" or "q1,r1 to q2,r2" or "q1 r1 q2 r2"
    """
    s = s.strip().lower().replace("to", " ").replace(",", " ")
    parts = s.split()
    if len(parts) != 4:
        return None, None
    try:
        from_coord = HexCoord(q=int(parts[0]), r=int(parts[1]))
        to_coord = HexCoord(q=int(parts[2]), r=int(parts[3]))
        if not is_valid_cell(from_coord) or not is_valid_cell(to_coord):
            return None, None
        return from_coord, to_coord
    except ValueError:
        return None, None


# ============================================================================
# Game Loop
# ============================================================================

def print_help():
    """Print help message."""
    print(f"""
{Colors.INFO}Commands:{Colors.RESET}
  <from> <to>    Make a move (e.g., "0,2 0,1" or "0 2 0 1")
  moves          Show all legal moves
  moves <coord>  Show legal moves for a piece at coord
  help           Show this help message
  resign         Resign the game
  quit           Exit the game

{Colors.INFO}Coordinates:{Colors.RESET}
  Use q,r axial coordinates (e.g., "0,0" is center)
  Board ranges: q and r from -{BOARD_RADIUS} to {BOARD_RADIUS}

{Colors.INFO}Pieces:{Colors.RESET}
  K=King, Q=Queen, N=Knight, L=Lance, C=Chariot, P=Pawn
  {Colors.WHITE_PIECE}White{Colors.RESET} pieces are shown in bright white
  {Colors.BLACK_PIECE}Black{Colors.RESET} pieces are shown in blue
""")


def format_move(move: Move) -> str:
    """Format a move for display."""
    from_str = f"{move.from_coord.q},{move.from_coord.r}"
    to_str = f"{move.to_coord.q},{move.to_coord.r}"
    piece_sym = PIECE_SYMBOLS.get(move.piece.type, "?")
    
    result = f"{piece_sym} {from_str} -> {to_str}"
    if move.captured is not None:
        result += f" (captures {PIECE_SYMBOLS.get(move.captured.type, '?')})"
    if move.promotion is not None:
        result += f" (promotes to {PIECE_SYMBOLS.get(move.promotion, '?')})"
    return result


def play_game(
    difficulty: AIDifficulty = "medium",
    player_color: Color = "white",
    ai_vs_ai: bool = False
):
    """Main game loop."""
    state = create_new_game()
    
    print(f"\n{Colors.BOLD}{Colors.INFO}Starting Underchex Game{Colors.RESET}")
    if not ai_vs_ai:
        print(f"You are playing as {Colors.BOLD}{player_color.upper()}{Colors.RESET}")
    else:
        print(f"AI vs AI mode - watch the game!")
    print(f"AI difficulty: {Colors.BOLD}{difficulty}{Colors.RESET}")
    print(f"\nType 'help' for commands\n")
    
    while state.status.type == "ongoing":
        # Display board
        print(render_board(state))
        
        is_player_turn = state.turn == player_color and not ai_vs_ai
        
        if is_player_turn:
            # Human player's turn
            try:
                cmd = input(f"\n{Colors.INFO}Your move ({state.turn}):{Colors.RESET} ").strip()
            except (EOFError, KeyboardInterrupt):
                print(f"\n{Colors.ERROR}Game interrupted.{Colors.RESET}")
                return
            
            if not cmd:
                continue
            
            cmd_lower = cmd.lower()
            
            if cmd_lower == "quit":
                print(f"{Colors.INFO}Thanks for playing!{Colors.RESET}")
                return
            
            if cmd_lower == "resign":
                print(f"{Colors.ERROR}You resigned. AI wins!{Colors.RESET}")
                return
            
            if cmd_lower == "help":
                print_help()
                continue
            
            if cmd_lower == "moves":
                moves = get_legal_moves(state)
                print(f"\n{Colors.INFO}All legal moves ({len(moves)}):{Colors.RESET}")
                for move in moves:
                    print(f"  {format_move(move)}")
                continue
            
            if cmd_lower.startswith("moves "):
                coord_str = cmd[6:].strip()
                coord = parse_coord(coord_str)
                if coord is None:
                    print(f"{Colors.ERROR}Invalid coordinate: {coord_str}{Colors.RESET}")
                    continue
                
                piece = get_piece_at(state.board, coord)
                if piece is None:
                    print(f"{Colors.ERROR}No piece at {coord_str}{Colors.RESET}")
                    continue
                
                if piece.color != state.turn:
                    print(f"{Colors.ERROR}Not your piece!{Colors.RESET}")
                    continue
                
                moves = [m for m in get_legal_moves(state) 
                         if m.from_coord.q == coord.q and m.from_coord.r == coord.r]
                print(f"\n{Colors.INFO}Legal moves for {PIECE_SYMBOLS.get(piece.type, '?')} at {coord_str} ({len(moves)}):{Colors.RESET}")
                for move in moves:
                    print(f"  {format_move(move)}")
                continue
            
            # Try to parse as a move
            from_coord, to_coord = parse_move(cmd)
            if from_coord is None or to_coord is None:
                print(f"{Colors.ERROR}Invalid move format. Use: q1,r1 q2,r2{Colors.RESET}")
                continue
            
            # Try to make the move
            new_state = make_move(state, from_coord, to_coord)
            if new_state is None:
                print(f"{Colors.ERROR}Illegal move!{Colors.RESET}")
                continue
            
            state = new_state
            
        else:
            # AI's turn
            print(f"\n{Colors.INFO}AI is thinking...{Colors.RESET}")
            
            result = get_ai_move(state.board, state.turn, difficulty)
            
            if result.move is None:
                print(f"{Colors.ERROR}AI has no legal moves!{Colors.RESET}")
                break
            
            print(f"{Colors.SUCCESS}AI plays: {format_move(result.move)}{Colors.RESET}")
            print(f"  (searched {result.stats.nodes_searched} nodes, eval: {result.score/100:.2f})")
            
            new_state = make_move(state, result.move.from_coord, result.move.to_coord)
            if new_state is None:
                print(f"{Colors.ERROR}AI made illegal move!{Colors.RESET}")
                break
            
            state = new_state
            
            # Small pause for AI vs AI
            if ai_vs_ai:
                import time
                time.sleep(0.5)
    
    # Game over
    print(render_board(state))
    
    if state.status.type == "checkmate":
        winner = state.status.winner  # type: ignore
        print(f"\n{Colors.BOLD}{Colors.SUCCESS}CHECKMATE! {winner.upper()} wins!{Colors.RESET}")
    elif state.status.type == "stalemate":
        print(f"\n{Colors.BOLD}{Colors.INFO}STALEMATE! Game is a draw.{Colors.RESET}")
    elif state.status.type == "resigned":
        winner = state.status.winner  # type: ignore
        print(f"\n{Colors.BOLD}{Colors.SUCCESS}{winner.upper()} wins by resignation!{Colors.RESET}")


def main():
    """Entry point for CLI."""
    parser = argparse.ArgumentParser(
        description="Play Underchex against the AI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python -m underchex.play                  # Play as white, medium difficulty
  python -m underchex.play -d hard -c black # Play as black, hard difficulty
  python -m underchex.play --ai-vs-ai       # Watch AI play itself
        """
    )
    
    parser.add_argument(
        "-d", "--difficulty",
        choices=["easy", "medium", "hard"],
        default="medium",
        help="AI difficulty level (default: medium)"
    )
    
    parser.add_argument(
        "-c", "--color",
        choices=["white", "black"],
        default="white",
        help="Your color (default: white)"
    )
    
    parser.add_argument(
        "--ai-vs-ai",
        action="store_true",
        help="Watch AI play against itself"
    )
    
    args = parser.parse_args()
    
    play_game(
        difficulty=args.difficulty,
        player_color=args.color,
        ai_vs_ai=args.ai_vs_ai
    )


if __name__ == "__main__":
    main()
