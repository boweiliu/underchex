defmodule Underchex.Display do
  @moduledoc """
  ASCII display for Underchex board.

  Signed-by: agent #26 claude-sonnet-4 via opencode 20260122T07:33:49
  """

  alias Underchex.{Types, Board}

  @doc """
  Render the board as an ASCII string.
  """
  @spec render_board(Types.board()) :: String.t()
  def render_board(board) do
    # Hex board layout for radius 4
    # We'll render row by row, with proper offset for hex grid
    rows =
      for r <- -4..4 do
        render_row(board, r)
      end

    header = "     " <> Enum.join(~w[a b c d e f g h i], " ") <> "\n"
    header <> Enum.join(rows, "\n")
  end

  defp render_row(board, r) do
    # Calculate offset for hex grid display
    offset = abs(r)
    padding = String.duplicate(" ", offset)

    # Get cells for this row
    q_min = max(-4, -4 - r)
    q_max = min(4, 4 - r)

    cells =
      for q <- q_min..q_max do
        coord = {q, r}

        if Types.valid_cell?(coord) do
          case Board.get_piece_at(board, coord) do
            nil -> "."
            piece -> piece_char(piece)
          end
        else
          " "
        end
      end

    row_label = String.pad_leading(Integer.to_string(5 + r), 2)
    row_label <> " " <> padding <> Enum.join(cells, " ")
  end

  @doc """
  Get the character representation of a piece.
  """
  @spec piece_char(Types.piece()) :: String.t()
  def piece_char(%{type: type, color: color}) do
    char =
      case type do
        :king -> "K"
        :queen -> "Q"
        :chariot -> "C"
        :lance -> "L"
        :knight -> "N"
        :pawn -> "P"
      end

    if color == :white, do: char, else: String.downcase(char)
  end

  @doc """
  Parse a move string like "e2 e4" or "e2-e4" into coordinates.
  """
  @spec parse_move(String.t()) :: {:ok, Types.coord(), Types.coord()} | {:error, String.t()}
  def parse_move(input) do
    # Remove extra whitespace and split
    parts =
      input
      |> String.trim()
      |> String.downcase()
      |> String.replace("-", " ")
      |> String.split(~r/\s+/)

    case parts do
      [from_str, to_str] ->
        with {:ok, from} <- parse_coord(from_str),
             {:ok, to} <- parse_coord(to_str) do
          {:ok, from, to}
        end

      _ ->
        {:error, "Invalid move format. Use: e2 e4 or e2-e4"}
    end
  end

  @doc """
  Parse a coordinate string like "e4" into {q, r}.
  For the hex board, we use a-i for columns (q offset) and 1-9 for rows (r offset).
  """
  @spec parse_coord(String.t()) :: {:ok, Types.coord()} | {:error, String.t()}
  def parse_coord(str) do
    case String.graphemes(str) do
      [col, row] ->
        q = col_to_q(col)
        r = row_to_r(row)

        if q && r && Types.valid_cell?({q, r}) do
          {:ok, {q, r}}
        else
          {:error, "Invalid coordinate: #{str}"}
        end

      [col, row1, row2] ->
        q = col_to_q(col)
        r = row_to_r(row1 <> row2)

        if q && r && Types.valid_cell?({q, r}) do
          {:ok, {q, r}}
        else
          {:error, "Invalid coordinate: #{str}"}
        end

      _ ->
        {:error, "Invalid coordinate format: #{str}"}
    end
  end

  defp col_to_q(col) do
    case col do
      "a" -> -4
      "b" -> -3
      "c" -> -2
      "d" -> -1
      "e" -> 0
      "f" -> 1
      "g" -> 2
      "h" -> 3
      "i" -> 4
      _ -> nil
    end
  end

  defp row_to_r(row) do
    case Integer.parse(row) do
      # row 5 = r=0
      {n, ""} when n >= 1 and n <= 9 -> n - 5
      _ -> nil
    end
  end

  @doc """
  Convert a coordinate to a string like "e4".
  """
  @spec coord_to_string(Types.coord()) :: String.t()
  def coord_to_string({q, r}) do
    col = Enum.at(~w[a b c d e f g h i], q + 4)
    row = r + 5
    "#{col}#{row}"
  end

  @doc """
  Format a move for display.
  """
  @spec format_move(Types.move()) :: String.t()
  def format_move(move) do
    from = coord_to_string(move.from)
    to = coord_to_string(move.to)

    capture = if move.captured, do: "x", else: "-"
    promotion = if move.promotion, do: "=#{piece_type_char(move.promotion)}", else: ""

    "#{from}#{capture}#{to}#{promotion}"
  end

  defp piece_type_char(:queen), do: "Q"
  defp piece_type_char(:chariot), do: "C"
  defp piece_type_char(:lance), do: "L"
  defp piece_type_char(:knight), do: "N"
  defp piece_type_char(_), do: ""
end
