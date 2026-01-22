defmodule Underchex.Moves do
  @moduledoc """
  Move generation and validation for Underchex.

  Signed-by: agent #26 claude-sonnet-4 via opencode 20260122T07:33:49
  """

  alias Underchex.{Types, Board}

  @doc """
  Generate pseudo-legal moves for a piece (doesn't check for leaving king in check).
  """
  @spec generate_pseudo_legal_moves(Types.board(), Types.piece(), Types.coord()) :: [Types.move()]
  def generate_pseudo_legal_moves(board, piece, from) do
    case piece.type do
      :pawn -> generate_pawn_moves(board, piece, from)
      :king -> generate_king_moves(board, piece, from)
      :knight -> generate_knight_moves(board, piece, from)
      type when type in [:queen, :lance, :chariot] -> generate_slider_moves(board, piece, from)
      _ -> []
    end
  end

  defp generate_pawn_moves(board, piece, from) do
    forward_dir = Types.forward_direction(piece.color)
    capture_dirs = Types.pawn_capture_directions(piece.color)

    # Forward move (non-capture)
    forward_moves =
      case Board.get_neighbor(from, forward_dir) do
        nil ->
          []

        forward ->
          if Board.occupied?(board, forward) do
            []
          else
            if Types.promotion_zone?(forward, piece.color) do
              # Generate all promotion moves
              Types.promotion_targets()
              |> Enum.map(&Types.new_move(piece, from, forward, nil, &1))
            else
              [Types.new_move(piece, from, forward)]
            end
          end
      end

    # Captures
    capture_moves =
      capture_dirs
      |> Enum.flat_map(fn dir ->
        case Board.get_neighbor(from, dir) do
          nil ->
            []

          target ->
            if Board.has_enemy?(board, target, piece.color) do
              captured = Board.get_piece_at(board, target)

              if Types.promotion_zone?(target, piece.color) do
                Types.promotion_targets()
                |> Enum.map(&Types.new_move(piece, from, target, captured, &1))
              else
                [Types.new_move(piece, from, target, captured)]
              end
            else
              []
            end
        end
      end)

    forward_moves ++ capture_moves
  end

  defp generate_king_moves(board, piece, from) do
    Types.all_directions()
    |> Enum.flat_map(fn dir ->
      case Board.get_neighbor(from, dir) do
        nil ->
          []

        target ->
          if Board.has_friendly?(board, target, piece.color) do
            []
          else
            captured = Board.get_piece_at(board, target)
            [Types.new_move(piece, from, target, captured)]
          end
      end
    end)
  end

  defp generate_knight_moves(board, piece, from) do
    Board.get_knight_targets(from)
    |> Enum.flat_map(fn target ->
      if Board.has_friendly?(board, target, piece.color) do
        []
      else
        captured = Board.get_piece_at(board, target)
        [Types.new_move(piece, from, target, captured)]
      end
    end)
  end

  defp generate_slider_moves(board, piece, from) do
    directions = Types.piece_directions(piece)

    directions
    |> Enum.flat_map(fn dir ->
      Board.get_ray(from, dir)
      |> Enum.reduce_while([], fn target, acc ->
        cond do
          Board.has_friendly?(board, target, piece.color) ->
            {:halt, acc}

          Board.has_enemy?(board, target, piece.color) ->
            captured = Board.get_piece_at(board, target)
            {:halt, [Types.new_move(piece, from, target, captured) | acc]}

          true ->
            {:cont, [Types.new_move(piece, from, target) | acc]}
        end
      end)
    end)
  end

  @doc """
  Apply a move to a board state.
  """
  @spec apply_move(Types.board(), Types.move()) :: Types.board()
  def apply_move(board, move) do
    board
    |> Map.delete(move.from)
    |> Map.put(move.to, promoted_piece(move))
  end

  defp promoted_piece(move) do
    case move.promotion do
      nil ->
        move.piece

      promotion_type ->
        # Default lance variant to :a for promotions
        variant = if promotion_type == :lance, do: :a, else: nil
        Types.new_piece(promotion_type, move.piece.color, variant)
    end
  end

  @doc """
  Check if a square is attacked by any piece of the given color.
  """
  @spec attacked?(Types.board(), Types.coord(), Types.color()) :: boolean()
  def attacked?(board, target, by_color) do
    attacked_by_pawn?(board, target, by_color) or
      attacked_by_king?(board, target, by_color) or
      attacked_by_knight?(board, target, by_color) or
      attacked_by_slider?(board, target, by_color)
  end

  defp attacked_by_pawn?(board, target, by_color) do
    capture_dirs = Types.pawn_capture_directions(by_color)

    Enum.any?(capture_dirs, fn dir ->
      reverse_dir = Types.opposite_direction(dir)

      case Board.get_neighbor(target, reverse_dir) do
        nil ->
          false

        attacker_pos ->
          case Board.get_piece_at(board, attacker_pos) do
            %{type: :pawn, color: ^by_color} -> true
            _ -> false
          end
      end
    end)
  end

  defp attacked_by_king?(board, target, by_color) do
    Enum.any?(Types.all_directions(), fn dir ->
      case Board.get_neighbor(target, dir) do
        nil ->
          false

        attacker_pos ->
          case Board.get_piece_at(board, attacker_pos) do
            %{type: :king, color: ^by_color} -> true
            _ -> false
          end
      end
    end)
  end

  defp attacked_by_knight?(board, target, by_color) do
    Board.get_knight_targets(target)
    |> Enum.any?(fn attacker_pos ->
      case Board.get_piece_at(board, attacker_pos) do
        %{type: :knight, color: ^by_color} -> true
        _ -> false
      end
    end)
  end

  defp attacked_by_slider?(board, target, by_color) do
    Enum.any?(Types.all_directions(), fn dir ->
      Board.get_ray(target, dir)
      |> Enum.reduce_while(false, fn pos, _acc ->
        case Board.get_piece_at(board, pos) do
          nil ->
            {:cont, false}

          %{color: color} when color != by_color ->
            {:halt, false}

          piece ->
            reverse_dir = Types.opposite_direction(dir)
            piece_dirs = Types.piece_directions(piece)

            if reverse_dir in piece_dirs and Types.slider?(piece.type) do
              {:halt, true}
            else
              {:halt, false}
            end
        end
      end)
    end)
  end

  @doc """
  Check if the king of a given color is in check.
  """
  @spec in_check?(Types.board(), Types.color()) :: boolean()
  def in_check?(board, color) do
    case Board.find_king(board, color) do
      nil -> false
      king_pos -> attacked?(board, king_pos, Types.opposite_color(color))
    end
  end

  @doc """
  Generate all legal moves for a piece.
  """
  @spec generate_legal_moves(Types.board(), Types.piece(), Types.coord()) :: [Types.move()]
  def generate_legal_moves(board, piece, from) do
    generate_pseudo_legal_moves(board, piece, from)
    |> Enum.filter(fn move ->
      new_board = apply_move(board, move)
      not in_check?(new_board, piece.color)
    end)
  end

  @doc """
  Generate all legal moves for a player.
  """
  @spec generate_all_legal_moves(Types.board(), Types.color()) :: [Types.move()]
  def generate_all_legal_moves(board, color) do
    board
    |> Enum.flat_map(fn {coord, piece} ->
      if piece.color == color do
        generate_legal_moves(board, piece, coord)
      else
        []
      end
    end)
  end

  @doc """
  Validate a move.
  """
  @spec validate_move(Types.board(), Types.coord(), Types.coord(), Types.color()) ::
          {:ok, Types.move()} | {:error, atom()}
  def validate_move(board, from, to, turn) do
    case Board.get_piece_at(board, from) do
      nil ->
        {:error, :no_piece_at_source}

      piece when piece.color != turn ->
        {:error, :not_your_piece}

      piece ->
        if not Types.valid_cell?(to) do
          {:error, :invalid_destination}
        else
          legal_moves = generate_legal_moves(board, piece, from)

          case Enum.find(legal_moves, fn m -> m.to == to end) do
            nil ->
              # Check if it would leave king in check
              pseudo = generate_pseudo_legal_moves(board, piece, from)

              if Enum.any?(pseudo, fn m -> m.to == to end) do
                {:error, :moves_into_check}
              else
                {:error, :illegal_move}
              end

            move ->
              {:ok, move}
          end
        end
    end
  end
end
