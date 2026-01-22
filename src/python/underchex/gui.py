#!/usr/bin/env python3
"""
Underchex Tkinter GUI

Visual interface for playing Underchex using tkinter (no external dependencies).

Signed-by: agent #20 claude-sonnet-4 via opencode 20260122T06:35:00
"""

from __future__ import annotations

import math
import tkinter as tk
from tkinter import ttk, messagebox
from typing import Optional, Callable
from dataclasses import dataclass

from .types import (
    HexCoord,
    Color,
    Piece,
    Move,
    GameState,
    GameStatus,
    PieceType,
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

from .board import is_valid_cell, get_all_cells

from .ai import (
    get_ai_move,
    evaluate_position,
    AIDifficulty,
)


# ============================================================================
# Constants
# ============================================================================

# Colors for the hex board (3-color scheme)
CELL_COLORS = [
    "#e8dcc4",  # Light tan
    "#b7a086",  # Medium brown  
    "#8b7355",  # Dark brown
]

# UI Colors
SELECTED_COLOR = "#ffeb3b"  # Yellow highlight
LEGAL_MOVE_COLOR = "#4caf50"  # Green
CAPTURE_COLOR = "#f44336"  # Red
CHECK_COLOR = "#ff5722"  # Orange/red
WHITE_PIECE_COLOR = "#ffffff"
BLACK_PIECE_COLOR = "#1a237e"
BG_COLOR = "#1a1a2e"
PANEL_BG = "#16213e"
ACCENT_COLOR = "#e94560"

# Piece symbols (Unicode chess pieces or letters)
PIECE_SYMBOLS = {
    "king": "K",
    "queen": "Q",
    "knight": "N",
    "lance": "L",
    "chariot": "C",
    "pawn": "P",
}


# ============================================================================
# Hex Math Utilities
# ============================================================================

def get_cell_color_index(q: int, r: int) -> int:
    """Get the color index (0, 1, or 2) for a hex cell using 3-color scheme."""
    return (q - r + 300) % 3


def axial_to_pixel(q: int, r: int, size: float, cx: float, cy: float) -> tuple[float, float]:
    """Convert axial hex coordinates to pixel coordinates."""
    x = size * (3/2 * q)
    y = size * (math.sqrt(3)/2 * q + math.sqrt(3) * r)
    return (cx + x, cy + y)


def pixel_to_axial(px: float, py: float, size: float, cx: float, cy: float) -> tuple[int, int]:
    """Convert pixel coordinates to axial hex coordinates."""
    x = px - cx
    y = py - cy
    q = (2/3 * x) / size
    r = (-1/3 * x + math.sqrt(3)/3 * y) / size
    return axial_round(q, r)


def axial_round(q: float, r: float) -> tuple[int, int]:
    """Round fractional axial coordinates to nearest hex."""
    s = -q - r
    rq = round(q)
    rr = round(r)
    rs = round(s)
    
    q_diff = abs(rq - q)
    r_diff = abs(rr - r)
    s_diff = abs(rs - s)
    
    if q_diff > r_diff and q_diff > s_diff:
        rq = -rr - rs
    elif r_diff > s_diff:
        rr = -rq - rs
    
    return (int(rq), int(rr))


def get_hex_corners(cx: float, cy: float, size: float) -> list[tuple[float, float]]:
    """Get the 6 corner points of a hexagon centered at (cx, cy)."""
    corners = []
    for i in range(6):
        angle = math.pi / 3 * i
        x = cx + size * math.cos(angle)
        y = cy + size * math.sin(angle)
        corners.append((x, y))
    return corners


# ============================================================================
# Game GUI Class
# ============================================================================

class UnderchexGUI:
    """Main GUI application for Underchex."""
    
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Underchex - Hexagonal Chess")
        self.root.configure(bg=BG_COLOR)
        
        # Game state
        self.game_state: GameState = create_new_game()
        self.selected_cell: Optional[HexCoord] = None
        self.legal_moves: list[Move] = []
        self.move_history: list[str] = []
        
        # AI settings
        self.ai_enabled = False
        self.ai_color: Color = "black"
        self.ai_difficulty: AIDifficulty = "medium"
        
        # Canvas settings
        self.hex_size = 35
        self.canvas_width = 700
        self.canvas_height = 600
        
        # Create UI
        self._create_widgets()
        self._draw_board()
    
    def _create_widgets(self):
        """Create all UI widgets."""
        # Main container
        main_frame = ttk.Frame(self.root)
        main_frame.pack(padx=20, pady=20)
        
        # Title
        title = tk.Label(
            main_frame, 
            text="UNDERCHEX",
            font=("Arial", 24, "bold"),
            fg=ACCENT_COLOR,
            bg=BG_COLOR
        )
        title.pack(pady=(0, 10))
        
        # Game container (board + info panel)
        game_frame = ttk.Frame(main_frame)
        game_frame.pack()
        
        # Board canvas
        self.canvas = tk.Canvas(
            game_frame,
            width=self.canvas_width,
            height=self.canvas_height,
            bg=BG_COLOR,
            highlightthickness=0
        )
        self.canvas.pack(side=tk.LEFT, padx=(0, 20))
        self.canvas.bind("<Button-1>", self._on_click)
        
        # Info panel
        info_frame = tk.Frame(game_frame, bg=PANEL_BG, padx=15, pady=15)
        info_frame.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Turn indicator
        self.turn_label = tk.Label(
            info_frame,
            text="White's Turn",
            font=("Arial", 14, "bold"),
            width=15,
            pady=10
        )
        self.turn_label.pack(pady=(0, 10))
        
        # Status label
        self.status_label = tk.Label(
            info_frame,
            text="",
            font=("Arial", 11),
            fg=ACCENT_COLOR,
            bg=PANEL_BG,
            wraplength=180
        )
        self.status_label.pack(pady=(0, 10))
        
        # AI Settings section
        ai_frame = tk.LabelFrame(
            info_frame, 
            text="AI Settings",
            fg="white",
            bg=PANEL_BG,
            font=("Arial", 10, "bold")
        )
        ai_frame.pack(fill=tk.X, pady=(0, 10))
        
        # AI toggle
        self.ai_var = tk.BooleanVar(value=False)
        ai_check = tk.Checkbutton(
            ai_frame,
            text="Play vs AI",
            variable=self.ai_var,
            command=self._toggle_ai,
            bg=PANEL_BG,
            fg="white",
            selectcolor=BG_COLOR,
            activebackground=PANEL_BG,
            activeforeground="white"
        )
        ai_check.pack(anchor=tk.W, padx=5)
        
        # Difficulty selector
        diff_frame = tk.Frame(ai_frame, bg=PANEL_BG)
        diff_frame.pack(fill=tk.X, padx=5, pady=5)
        
        tk.Label(
            diff_frame, 
            text="Difficulty:",
            fg="white",
            bg=PANEL_BG
        ).pack(side=tk.LEFT)
        
        self.diff_var = tk.StringVar(value="medium")
        diff_menu = ttk.Combobox(
            diff_frame,
            textvariable=self.diff_var,
            values=["easy", "medium", "hard"],
            state="readonly",
            width=8
        )
        diff_menu.pack(side=tk.LEFT, padx=5)
        diff_menu.bind("<<ComboboxSelected>>", self._on_difficulty_change)
        
        # Buttons
        btn_frame = tk.Frame(info_frame, bg=PANEL_BG)
        btn_frame.pack(fill=tk.X, pady=10)
        
        new_game_btn = tk.Button(
            btn_frame,
            text="New Game",
            command=self._new_game,
            bg=ACCENT_COLOR,
            fg="white",
            font=("Arial", 10, "bold"),
            relief=tk.FLAT
        )
        new_game_btn.pack(fill=tk.X, pady=2)
        
        undo_btn = tk.Button(
            btn_frame,
            text="Undo",
            command=self._undo_move,
            bg="#444",
            fg="white",
            font=("Arial", 10),
            relief=tk.FLAT
        )
        undo_btn.pack(fill=tk.X, pady=2)
        
        # Move history
        history_label = tk.Label(
            info_frame,
            text="Move History",
            font=("Arial", 10, "bold"),
            fg="white",
            bg=PANEL_BG
        )
        history_label.pack(pady=(10, 5))
        
        history_frame = tk.Frame(info_frame, bg=PANEL_BG)
        history_frame.pack(fill=tk.BOTH, expand=True)
        
        self.history_text = tk.Text(
            history_frame,
            width=20,
            height=15,
            bg=BG_COLOR,
            fg="white",
            font=("Courier", 9),
            state=tk.DISABLED
        )
        self.history_text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        scrollbar = ttk.Scrollbar(
            history_frame,
            orient=tk.VERTICAL,
            command=self.history_text.yview
        )
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.history_text.configure(yscrollcommand=scrollbar.set)
    
    def _draw_board(self):
        """Draw the hex board and pieces."""
        self.canvas.delete("all")
        
        cx = self.canvas_width / 2
        cy = self.canvas_height / 2
        
        # Get all valid cells
        cells = get_all_cells()
        
        # Draw cells
        for cell in cells:
            q, r = cell["q"], cell["r"]
            
            # Get pixel position
            px, py = axial_to_pixel(q, r, self.hex_size, cx, cy)
            
            # Get cell color
            color_idx = get_cell_color_index(q, r)
            fill_color = CELL_COLORS[color_idx]
            
            # Check for selection/highlight
            if self.selected_cell and self.selected_cell["q"] == q and self.selected_cell["r"] == r:
                fill_color = SELECTED_COLOR
            elif self._is_legal_target(q, r):
                piece_at = get_piece_at(self.game_state["board"], {"q": q, "r": r})
                fill_color = CAPTURE_COLOR if piece_at else LEGAL_MOVE_COLOR
            
            # Draw hexagon
            corners = get_hex_corners(px, py, self.hex_size - 1)
            self.canvas.create_polygon(
                corners,
                fill=fill_color,
                outline="#333",
                width=1
            )
            
            # Draw piece if present
            piece = get_piece_at(self.game_state["board"], {"q": q, "r": r})
            if piece:
                self._draw_piece(px, py, piece)
        
        # Check indicator for king
        if is_current_player_in_check(self.game_state):
            self._draw_check_indicator()
        
        # Update turn indicator
        self._update_turn_indicator()
    
    def _draw_piece(self, x: float, y: float, piece: Piece):
        """Draw a piece at the given position."""
        symbol = PIECE_SYMBOLS.get(piece["type"], "?")
        color = WHITE_PIECE_COLOR if piece["color"] == "white" else BLACK_PIECE_COLOR
        
        # Draw piece background circle
        r = self.hex_size * 0.55
        bg_color = "#333" if piece["color"] == "white" else "#ddd"
        self.canvas.create_oval(
            x - r, y - r, x + r, y + r,
            fill=bg_color,
            outline=""
        )
        
        # Draw piece text
        self.canvas.create_text(
            x, y,
            text=symbol,
            font=("Arial", int(self.hex_size * 0.6), "bold"),
            fill=color
        )
    
    def _draw_check_indicator(self):
        """Draw an indicator showing the king is in check."""
        # Find the current player's king
        from .moves import find_king
        king_pos = find_king(self.game_state["board"], self.game_state["turn"])
        
        if king_pos:
            cx = self.canvas_width / 2
            cy = self.canvas_height / 2
            px, py = axial_to_pixel(king_pos["q"], king_pos["r"], self.hex_size, cx, cy)
            
            # Draw red ring around king
            r = self.hex_size * 0.7
            self.canvas.create_oval(
                px - r, py - r, px + r, py + r,
                outline=CHECK_COLOR,
                width=3
            )
    
    def _update_turn_indicator(self):
        """Update the turn indicator label."""
        turn = self.game_state["turn"]
        status = self.game_state["status"]
        
        if status == "ongoing":
            text = f"{'White' if turn == 'white' else 'Black'}'s Turn"
            bg = "#f0f0f0" if turn == "white" else "#333"
            fg = "#333" if turn == "white" else "#f0f0f0"
            self.status_label.config(text="")
        elif status == "checkmate":
            winner = opposite_color(turn)
            text = f"Checkmate!"
            bg = ACCENT_COLOR
            fg = "white"
            self.status_label.config(text=f"{'White' if winner == 'white' else 'Black'} wins!")
        elif status == "stalemate":
            text = "Stalemate!"
            bg = "#666"
            fg = "white"
            self.status_label.config(text="Draw by stalemate")
        elif status == "resigned":
            winner = opposite_color(turn)
            text = "Game Over"
            bg = ACCENT_COLOR
            fg = "white"
            self.status_label.config(text=f"{'White' if winner == 'white' else 'Black'} wins by resignation")
        else:
            text = turn.capitalize()
            bg = "#f0f0f0" if turn == "white" else "#333"
            fg = "#333" if turn == "white" else "#f0f0f0"
        
        self.turn_label.config(text=text, bg=bg, fg=fg)
        
        # Show check status
        if status == "ongoing" and is_current_player_in_check(self.game_state):
            self.status_label.config(text="Check!")
    
    def _is_legal_target(self, q: int, r: int) -> bool:
        """Check if a cell is a legal move target."""
        if not self.selected_cell:
            return False
        
        for move in self.legal_moves:
            if move["to"]["q"] == q and move["to"]["r"] == r:
                return True
        return False
    
    def _get_move_to(self, q: int, r: int) -> Optional[Move]:
        """Get the move to the given cell, if legal."""
        for move in self.legal_moves:
            if move["to"]["q"] == q and move["to"]["r"] == r:
                return move
        return None
    
    def _on_click(self, event):
        """Handle click on the canvas."""
        if self.game_state["status"] != "ongoing":
            return
        
        # Don't allow moves during AI turn
        if self.ai_enabled and self.game_state["turn"] == self.ai_color:
            return
        
        cx = self.canvas_width / 2
        cy = self.canvas_height / 2
        
        # Convert click to hex coords
        q, r = pixel_to_axial(event.x, event.y, self.hex_size, cx, cy)
        
        if not is_valid_cell({"q": q, "r": r}):
            return
        
        clicked_cell: HexCoord = {"q": q, "r": r}
        
        # If we have a selection, try to move there
        if self.selected_cell:
            move = self._get_move_to(q, r)
            if move:
                self._make_move(move)
                self.selected_cell = None
                self.legal_moves = []
            else:
                # Check if clicking on own piece to change selection
                piece = get_piece_at(self.game_state["board"], clicked_cell)
                if piece and piece["color"] == self.game_state["turn"]:
                    self.selected_cell = clicked_cell
                    self.legal_moves = get_legal_moves(self.game_state, clicked_cell)
                else:
                    self.selected_cell = None
                    self.legal_moves = []
        else:
            # Try to select a piece
            piece = get_piece_at(self.game_state["board"], clicked_cell)
            if piece and piece["color"] == self.game_state["turn"]:
                self.selected_cell = clicked_cell
                self.legal_moves = get_legal_moves(self.game_state, clicked_cell)
        
        self._draw_board()
    
    def _make_move(self, move: Move):
        """Make a move and update the game state."""
        # Record move in history
        from_str = coord_to_string(move["from"])
        to_str = coord_to_string(move["to"])
        piece = get_piece_at(self.game_state["board"], move["from"])
        piece_symbol = PIECE_SYMBOLS.get(piece["type"], "?") if piece else "?"
        
        move_str = f"{piece_symbol}{from_str}->{to_str}"
        if move.get("promotion"):
            move_str += f"={PIECE_SYMBOLS.get(move['promotion'], '?')}"
        
        # Make the move
        result = make_move(self.game_state, move)
        if result["success"]:
            self.game_state = result["state"]
            self._add_to_history(move_str)
            
            # Check for AI move
            if self.ai_enabled and self.game_state["status"] == "ongoing":
                if self.game_state["turn"] == self.ai_color:
                    self.root.after(100, self._ai_move)
    
    def _ai_move(self):
        """Have the AI make a move."""
        if self.game_state["status"] != "ongoing":
            return
        
        if self.game_state["turn"] != self.ai_color:
            return
        
        self.status_label.config(text="AI thinking...")
        self.root.update()
        
        ai_move = get_ai_move(self.game_state, self.ai_difficulty)
        
        if ai_move:
            self._make_move(ai_move)
        
        self._draw_board()
    
    def _add_to_history(self, move_str: str):
        """Add a move to the history display."""
        move_num = len(self.move_history) + 1
        if move_num % 2 == 1:
            # White's move
            entry = f"{(move_num + 1) // 2}. {move_str}"
        else:
            # Black's move
            entry = f" {move_str}\n"
        
        self.move_history.append(move_str)
        
        self.history_text.config(state=tk.NORMAL)
        self.history_text.insert(tk.END, entry if move_num % 2 == 0 else entry)
        self.history_text.see(tk.END)
        self.history_text.config(state=tk.DISABLED)
    
    def _new_game(self):
        """Start a new game."""
        self.game_state = create_new_game()
        self.selected_cell = None
        self.legal_moves = []
        self.move_history = []
        
        self.history_text.config(state=tk.NORMAL)
        self.history_text.delete(1.0, tk.END)
        self.history_text.config(state=tk.DISABLED)
        
        self._draw_board()
        
        # If AI is white, make first move
        if self.ai_enabled and self.ai_color == "white":
            self.root.after(100, self._ai_move)
    
    def _undo_move(self):
        """Undo the last move (placeholder - would need game history)."""
        messagebox.showinfo("Undo", "Undo not yet implemented")
    
    def _toggle_ai(self):
        """Toggle AI mode."""
        self.ai_enabled = self.ai_var.get()
        if self.ai_enabled and self.game_state["turn"] == self.ai_color:
            self.root.after(100, self._ai_move)
    
    def _on_difficulty_change(self, event):
        """Handle difficulty change."""
        self.ai_difficulty = self.diff_var.get()


# ============================================================================
# Main Entry Point
# ============================================================================

def main():
    """Run the Underchex GUI."""
    root = tk.Tk()
    root.resizable(False, False)
    
    app = UnderchexGUI(root)
    
    root.mainloop()


if __name__ == "__main__":
    main()
