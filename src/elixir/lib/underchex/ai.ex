defmodule Underchex.AI do
  @moduledoc """
  AI opponent for Underchex using alpha-beta search with tablebase integration.

  Signed-by: agent #26 claude-sonnet-4 via opencode 20260122T07:33:49
  Edited-by: agent #38 claude-sonnet-4 via opencode 20260122T10:03:23
  """

  alias Underchex.{Types, Board, Moves, Tablebase}

  @piece_values %{
    pawn: 100,
    knight: 300,
    lance: 450,
    chariot: 450,
    queen: 900,
    king: 10000
  }

  @doc """
  Get the static value of a piece type.
  """
  @spec piece_value(Types.piece_type()) :: integer()
  def piece_value(type), do: Map.fetch!(@piece_values, type)

  @doc """
  Evaluate a position from the perspective of a color.
  """
  @spec evaluate(Types.board(), Types.color()) :: integer()
  def evaluate(board, color) do
    material = evaluate_material(board)
    mobility = evaluate_mobility(board, color)
    position = evaluate_position(board)

    # From white's perspective
    score = material + mobility + position

    if color == :white, do: score, else: -score
  end

  defp evaluate_material(board) do
    board
    |> Enum.reduce(0, fn {_coord, piece}, acc ->
      value = piece_value(piece.type)
      if piece.color == :white, do: acc + value, else: acc - value
    end)
  end

  defp evaluate_mobility(board, color) do
    white_moves = length(Moves.generate_all_legal_moves(board, :white))
    black_moves = length(Moves.generate_all_legal_moves(board, :black))
    mobility_diff = (white_moves - black_moves) * 2
    if color == :white, do: mobility_diff, else: -mobility_diff
  end

  defp evaluate_position(board) do
    board
    |> Enum.reduce(0, fn {{q, r}, piece}, acc ->
      # Centrality bonus
      distance = Board.hex_distance({q, r}, {0, 0})
      centrality = (4 - distance) * 3

      # Pawn advancement bonus
      advancement =
        if piece.type == :pawn do
          if piece.color == :white do
            (4 - r) * 5
          else
            (4 + r) * 5
          end
        else
          0
        end

      bonus = centrality + advancement
      if piece.color == :white, do: acc + bonus, else: acc - bonus
    end)
  end

  @doc """
  Find the best move using alpha-beta search.
  """
  @spec find_best_move(Types.board(), Types.color(), non_neg_integer()) ::
          {Types.move() | nil, integer()}
  def find_best_move(board, color, depth) do
    moves = Moves.generate_all_legal_moves(board, color)

    if Enum.empty?(moves) do
      {nil, if(Moves.in_check?(board, color), do: -100_000, else: 0)}
    else
      # Order moves (captures first)
      sorted_moves = order_moves(board, moves)

      {best_move, best_score} =
        sorted_moves
        |> Enum.reduce({nil, -1_000_000}, fn move, {_best_move, best_score} = acc ->
          new_board = Moves.apply_move(board, move)

          score =
            -alpha_beta(
              new_board,
              Types.opposite_color(color),
              depth - 1,
              -1_000_000,
              -best_score
            )

          if score > best_score do
            {move, score}
          else
            acc
          end
        end)

      {best_move, best_score}
    end
  end

  defp alpha_beta(board, color, depth, alpha, beta) do
    if depth <= 0 do
      evaluate(board, color)
    else
      moves = Moves.generate_all_legal_moves(board, color)

      if Enum.empty?(moves) do
        if Moves.in_check?(board, color) do
          # Prefer faster checkmate
          -100_000 + (10 - depth)
        else
          # Stalemate
          0
        end
      else
        sorted_moves = order_moves(board, moves)

        sorted_moves
        |> Enum.reduce_while(alpha, fn move, alpha_acc ->
          new_board = Moves.apply_move(board, move)

          score =
            -alpha_beta(new_board, Types.opposite_color(color), depth - 1, -beta, -alpha_acc)

          new_alpha = max(alpha_acc, score)

          if new_alpha >= beta do
            {:halt, new_alpha}
          else
            {:cont, new_alpha}
          end
        end)
      end
    end
  end

  @doc """
  Order moves for better alpha-beta pruning (MVV-LVA).
  """
  @spec order_moves(Types.board(), [Types.move()]) :: [Types.move()]
  def order_moves(_board, moves) do
    moves
    |> Enum.sort_by(fn move ->
      capture_value =
        case move.captured do
          nil -> 0
          captured -> piece_value(captured.type) * 10 - piece_value(move.piece.type)
        end

      promotion_value =
        case move.promotion do
          nil -> 0
          :queen -> 800
          _ -> 300
        end

      -(capture_value + promotion_value)
    end)
  end

  @doc """
  Get AI move with specified difficulty (depth).
  First probes tablebase for endgame positions, then falls back to alpha-beta search.
  """
  @spec get_move(Types.board(), Types.color(), :easy | :medium | :hard) :: Types.move() | nil
  def get_move(board, color, difficulty) do
    # First, try tablebase probe for endgame positions
    case try_tablebase_move(board, color) do
      {:ok, move} ->
        move

      :not_found ->
        # Fall back to regular search
        depth =
          case difficulty do
            :easy -> 2
            :medium -> 3
            :hard -> 4
          end

        {move, _score} = find_best_move(board, color, depth)
        move
    end
  end

  @doc """
  Try to get a move from the tablebase.
  Returns {:ok, move} if found, :not_found otherwise.
  """
  @spec try_tablebase_move(Types.board(), Types.color()) :: {:ok, Types.move()} | :not_found
  def try_tablebase_move(board, color) do
    if Tablebase.is_endgame?(board) do
      case Tablebase.probe(board, color) do
        {:ok, %{wdl: :win, best_move: move}} when move != nil ->
          {:ok, move}

        {:ok, %{wdl: :draw}} ->
          # For drawn positions, just pick any legal move
          moves = Moves.generate_all_legal_moves(board, color)

          if Enum.empty?(moves) do
            :not_found
          else
            {:ok, Enum.random(moves)}
          end

        {:ok, %{wdl: :loss}} ->
          # For losing positions, we still need to make a move
          # Let the regular search try to delay the loss
          :not_found

        _ ->
          :not_found
      end
    else
      :not_found
    end
  end

  @doc """
  Get AI move with tablebase integration and explicit search parameters.
  """
  @spec get_move_with_tablebase(Types.board(), Types.color(), integer()) ::
          {Types.move() | nil, integer()}
  def get_move_with_tablebase(board, color, depth) do
    # First, try tablebase probe
    if Tablebase.is_endgame?(board) do
      case Tablebase.get_score(board, color) do
        {:ok, score} ->
          case Tablebase.get_move(board, color) do
            {:ok, move} ->
              {move, score}

            :not_found ->
              # For draws or positions without best_move, pick any legal move
              moves = Moves.generate_all_legal_moves(board, color)

              if Enum.empty?(moves) do
                {nil, score}
              else
                {Enum.random(moves), score}
              end
          end

        :not_found ->
          find_best_move(board, color, depth)
      end
    else
      find_best_move(board, color, depth)
    end
  end
end
