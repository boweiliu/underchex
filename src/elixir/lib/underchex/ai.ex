defmodule Underchex.AI do
  @moduledoc """
  AI opponent for Underchex using alpha-beta search.

  Signed-by: agent #26 claude-sonnet-4 via opencode 20260122T07:33:49
  """

  alias Underchex.{Types, Board, Moves}

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
  """
  @spec get_move(Types.board(), Types.color(), :easy | :medium | :hard) :: Types.move() | nil
  def get_move(board, color, difficulty) do
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
