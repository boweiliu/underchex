defmodule Underchex.Game do
  @moduledoc """
  Game state management for Underchex.

  Signed-by: agent #26 claude-sonnet-4 via opencode 20260122T07:33:49
  """

  alias Underchex.{Types, Moves}

  @doc """
  Get the starting position for a standard game.
  """
  @spec starting_position() :: [{Types.piece(), Types.coord()}]
  def starting_position do
    white_pieces() ++ black_pieces()
  end

  defp white_pieces do
    [
      {Types.new_piece(:king, :white), {0, 4}},
      {Types.new_piece(:queen, :white), {1, 3}},
      {Types.new_piece(:chariot, :white), {-2, 4}},
      {Types.new_piece(:chariot, :white), {2, 3}},
      {Types.new_piece(:lance, :white, :a), {-1, 4}},
      {Types.new_piece(:lance, :white, :b), {1, 4}},
      {Types.new_piece(:knight, :white), {-2, 3}},
      {Types.new_piece(:knight, :white), {2, 4}},
      # Pawns
      {Types.new_piece(:pawn, :white), {-3, 3}},
      {Types.new_piece(:pawn, :white), {-2, 2}},
      {Types.new_piece(:pawn, :white), {-1, 2}},
      {Types.new_piece(:pawn, :white), {0, 2}},
      {Types.new_piece(:pawn, :white), {1, 2}},
      {Types.new_piece(:pawn, :white), {2, 2}}
    ]
  end

  defp black_pieces do
    [
      {Types.new_piece(:king, :black), {0, -4}},
      {Types.new_piece(:queen, :black), {-1, -3}},
      {Types.new_piece(:chariot, :black), {2, -4}},
      {Types.new_piece(:chariot, :black), {-2, -3}},
      {Types.new_piece(:lance, :black, :a), {1, -4}},
      {Types.new_piece(:lance, :black, :b), {-1, -4}},
      {Types.new_piece(:knight, :black), {2, -3}},
      {Types.new_piece(:knight, :black), {-2, -4}},
      # Pawns
      {Types.new_piece(:pawn, :black), {3, -3}},
      {Types.new_piece(:pawn, :black), {2, -2}},
      {Types.new_piece(:pawn, :black), {1, -2}},
      {Types.new_piece(:pawn, :black), {0, -2}},
      {Types.new_piece(:pawn, :black), {-1, -2}},
      {Types.new_piece(:pawn, :black), {-2, -2}}
    ]
  end

  @doc """
  Create a board from piece placements.
  """
  @spec board_from_placements([{Types.piece(), Types.coord()}]) :: Types.board()
  def board_from_placements(placements) do
    placements
    |> Enum.into(%{}, fn {piece, coord} -> {coord, piece} end)
  end

  @doc """
  Create a new game with standard starting position.
  """
  @spec new_game() :: Types.game_state()
  def new_game do
    %{
      board: board_from_placements(starting_position()),
      turn: :white,
      move_number: 1,
      half_move_clock: 0,
      history: [],
      status: {:ongoing}
    }
  end

  @doc """
  Determine game status after a move.
  """
  @spec determine_status(Types.board(), Types.color()) :: Types.game_status()
  def determine_status(board, next_turn) do
    legal_moves = Moves.generate_all_legal_moves(board, next_turn)

    if Enum.empty?(legal_moves) do
      if Moves.in_check?(board, next_turn) do
        {:checkmate, Types.opposite_color(next_turn)}
      else
        {:stalemate}
      end
    else
      {:ongoing}
    end
  end

  @doc """
  Make a move and return the new game state.
  Returns {:error, reason} if the move is invalid.
  """
  @spec make_move(Types.game_state(), Types.coord(), Types.coord()) ::
          {:ok, Types.game_state()} | {:error, atom()}
  def make_move(state, from, to) do
    case state.status do
      {:ongoing} ->
        case Moves.validate_move(state.board, from, to, state.turn) do
          {:error, reason} ->
            {:error, reason}

          {:ok, move} ->
            new_board = Moves.apply_move(state.board, move)
            next_turn = Types.opposite_color(state.turn)
            status = determine_status(new_board, next_turn)

            # Update half-move clock
            half_move_clock =
              if move.piece.type == :pawn or move.captured != nil do
                0
              else
                state.half_move_clock + 1
              end

            # Increment move number when black moves
            move_number =
              if state.turn == :black do
                state.move_number + 1
              else
                state.move_number
              end

            {:ok,
             %{
               board: new_board,
               turn: next_turn,
               move_number: move_number,
               half_move_clock: half_move_clock,
               history: state.history ++ [move],
               status: status
             }}
        end

      _ ->
        {:error, :game_over}
    end
  end

  @doc """
  Resign the game.
  """
  @spec resign(Types.game_state(), Types.color()) :: Types.game_state()
  def resign(state, color) do
    %{state | status: {:resigned, Types.opposite_color(color)}}
  end

  @doc """
  Check if it's a specific player's turn.
  """
  @spec player_turn?(Types.game_state(), Types.color()) :: boolean()
  def player_turn?(state, color) do
    state.status == {:ongoing} and state.turn == color
  end

  @doc """
  Get all legal moves for the current player.
  """
  @spec legal_moves(Types.game_state()) :: [Types.move()]
  def legal_moves(state) do
    case state.status do
      {:ongoing} -> Moves.generate_all_legal_moves(state.board, state.turn)
      _ -> []
    end
  end

  @doc """
  Check if the current player is in check.
  """
  @spec in_check?(Types.game_state()) :: boolean()
  def in_check?(state) do
    Moves.in_check?(state.board, state.turn)
  end
end
