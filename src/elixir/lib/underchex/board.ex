defmodule Underchex.Board do
  @moduledoc """
  Board operations for Underchex.

  Signed-by: agent #26 claude-sonnet-4 via opencode 20260122T07:33:49
  """

  alias Underchex.Types

  @doc """
  Get all valid cells on the board.
  """
  @spec all_cells() :: [Types.coord()]
  def all_cells do
    radius = Types.board_radius()

    for q <- -radius..radius,
        r <- -radius..radius,
        Types.valid_cell?({q, r}),
        do: {q, r}
  end

  @doc """
  Add a direction to a coordinate.
  """
  @spec add_direction(Types.coord(), Types.direction()) :: Types.coord()
  def add_direction({q, r}, dir) do
    {dq, dr} = Types.direction_vector(dir)
    {q + dq, r + dr}
  end

  @doc """
  Get neighbor in a direction, or nil if off-board.
  """
  @spec get_neighbor(Types.coord(), Types.direction()) :: Types.coord() | nil
  def get_neighbor(coord, dir) do
    neighbor = add_direction(coord, dir)
    if Types.valid_cell?(neighbor), do: neighbor, else: nil
  end

  @doc """
  Get all valid neighbors of a cell.
  """
  @spec get_neighbors(Types.coord()) :: [Types.coord()]
  def get_neighbors(coord) do
    Types.all_directions()
    |> Enum.map(&get_neighbor(coord, &1))
    |> Enum.filter(&(&1 != nil))
  end

  @doc """
  Calculate hex distance between two coordinates.
  """
  @spec hex_distance(Types.coord(), Types.coord()) :: non_neg_integer()
  def hex_distance({q1, r1}, {q2, r2}) do
    dq = abs(q1 - q2)
    dr = abs(r1 - r2)
    ds = abs(-q1 - r1 - (-q2 - r2))
    max(dq, max(dr, ds))
  end

  @doc """
  Get direction from one cell to another (if aligned), or nil.
  """
  @spec get_direction(Types.coord(), Types.coord()) :: Types.direction() | nil
  def get_direction({q1, r1}, {q2, r2}) do
    dq = q2 - q1
    dr = r2 - r1

    if dq == 0 and dr == 0 do
      nil
    else
      Types.all_directions()
      |> Enum.find(fn dir ->
        {delta_q, delta_r} = Types.direction_vector(dir)

        cond do
          delta_q == 0 and delta_r == 0 ->
            false

          delta_q == 0 ->
            dq == 0 and sign(dr) == sign(delta_r)

          delta_r == 0 ->
            dr == 0 and sign(dq) == sign(delta_q)

          true ->
            ratio_q = dq / delta_q
            ratio_r = dr / delta_r
            ratio_q == ratio_r and ratio_q > 0 and trunc(ratio_q) == ratio_q
        end
      end)
    end
  end

  defp sign(0), do: 0
  defp sign(n) when n > 0, do: 1
  defp sign(_), do: -1

  @doc """
  Get all cells along a direction from a starting point (exclusive of start).
  """
  @spec get_ray(Types.coord(), Types.direction()) :: [Types.coord()]
  def get_ray(start, direction) do
    get_ray_impl(start, direction, [])
    |> Enum.reverse()
  end

  defp get_ray_impl(current, direction, acc) do
    next = add_direction(current, direction)

    if Types.valid_cell?(next) do
      get_ray_impl(next, direction, [next | acc])
    else
      acc
    end
  end

  @doc """
  Get knight target positions from a position.
  """
  @spec get_knight_targets(Types.coord()) :: [Types.coord()]
  def get_knight_targets({q, r}) do
    Types.knight_offsets()
    |> Enum.map(fn {dq, dr} -> {q + dq, r + dr} end)
    |> Enum.filter(&Types.valid_cell?/1)
  end

  @doc """
  Get piece at a position.
  """
  @spec get_piece_at(Types.board(), Types.coord()) :: Types.piece() | nil
  def get_piece_at(board, coord) do
    Map.get(board, coord)
  end

  @doc """
  Check if a cell is occupied.
  """
  @spec occupied?(Types.board(), Types.coord()) :: boolean()
  def occupied?(board, coord) do
    Map.has_key?(board, coord)
  end

  @doc """
  Check if a cell has an enemy piece.
  """
  @spec has_enemy?(Types.board(), Types.coord(), Types.color()) :: boolean()
  def has_enemy?(board, coord, color) do
    case get_piece_at(board, coord) do
      nil -> false
      piece -> piece.color != color
    end
  end

  @doc """
  Check if a cell has a friendly piece.
  """
  @spec has_friendly?(Types.board(), Types.coord(), Types.color()) :: boolean()
  def has_friendly?(board, coord, color) do
    case get_piece_at(board, coord) do
      nil -> false
      piece -> piece.color == color
    end
  end

  @doc """
  Find the king of a given color.
  """
  @spec find_king(Types.board(), Types.color()) :: Types.coord() | nil
  def find_king(board, color) do
    board
    |> Enum.find(fn {_coord, piece} ->
      piece.type == :king and piece.color == color
    end)
    |> case do
      {coord, _piece} -> coord
      nil -> nil
    end
  end
end
