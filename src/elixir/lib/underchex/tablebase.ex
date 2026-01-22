defmodule Underchex.Tablebase do
  @moduledoc """
  Endgame Tablebase Module for Underchex.

  Provides perfect endgame play for positions with few pieces:
  - Precomputed Win/Draw/Loss (WDL) tables
  - Distance to Mate (DTM) information
  - Retrograde analysis for tablebase generation

  Supported endgames:
  - KvK (King vs King) - Always draw
  - KQvK (King+Queen vs King) - Win for the side with queen
  - KLvK (King+Lance vs King) - Usually win, some draws
  - KCvK (King+Chariot vs King) - Usually win, some draws
  - KNvK (King+Knight vs King) - Mostly draws

  Signed-by: agent #36 claude-sonnet-4 via opencode 20260122T09:33:00
  """

  alias Underchex.{Types, Board, Moves}

  # ============================================================================
  # Types
  # ============================================================================

  @type wdl :: :win | :draw | :loss | :unknown
  @type config :: :kvk | :kqvk | :klvk | :kcvk | :knvk

  @type entry :: %{
          wdl: wdl(),
          dtm: integer(),
          best_move: Types.move() | nil
        }

  @type tablebase :: %{
          config: config(),
          name: String.t(),
          entries: %{String.t() => entry()},
          stats: %{wins: integer(), draws: integer(), losses: integer()}
        }

  # ============================================================================
  # Tablebase Storage (ETS-based)
  # ============================================================================

  @table_name :underchex_tablebase

  @doc """
  Initialize the tablebase ETS table.
  """
  @spec init() :: :ok
  def init do
    if :ets.whereis(@table_name) == :undefined do
      :ets.new(@table_name, [:named_table, :set, :public])
    end

    :ok
  end

  @doc """
  Clear all tablebases.
  """
  @spec clear() :: :ok
  def clear do
    if :ets.whereis(@table_name) != :undefined do
      :ets.delete_all_objects(@table_name)
    end

    :ok
  end

  @doc """
  Store a tablebase entry.
  """
  @spec store(config(), String.t(), entry()) :: true
  def store(config, key, entry) do
    init()
    :ets.insert(@table_name, {{config, key}, entry})
  end

  @doc """
  Lookup a tablebase entry.
  """
  @spec lookup(config(), String.t()) :: entry() | nil
  def lookup(config, key) do
    init()

    case :ets.lookup(@table_name, {config, key}) do
      [{{^config, ^key}, entry}] -> entry
      [] -> nil
    end
  end

  # ============================================================================
  # Position Encoding
  # ============================================================================

  @doc """
  Encode a board position into a canonical key for tablebase lookup.
  """
  @spec encode_position(Types.board(), Types.color()) :: String.t()
  def encode_position(board, side_to_move) do
    # Simple encoding: sorted piece positions with side to move
    pieces =
      board
      |> Enum.map(fn {{q, r}, piece} ->
        type_char = piece_type_char(piece.type)
        color_char = if piece.color == :white, do: "W", else: "B"
        variant_str = if piece.variant, do: Atom.to_string(piece.variant), else: ""
        "#{color_char}#{type_char}#{variant_str}@#{q},#{r}"
      end)
      |> Enum.sort()
      |> Enum.join("-")

    stm = if side_to_move == :white, do: "W", else: "B"
    "#{pieces}|#{stm}"
  end

  defp piece_type_char(:king), do: "K"
  defp piece_type_char(:queen), do: "Q"
  defp piece_type_char(:lance), do: "L"
  defp piece_type_char(:chariot), do: "C"
  defp piece_type_char(:knight), do: "N"
  defp piece_type_char(:pawn), do: "P"

  # ============================================================================
  # Configuration Detection
  # ============================================================================

  @doc """
  Detect which tablebase configuration a position belongs to.
  Returns nil if not a supported configuration.
  """
  @spec detect_config(Types.board()) :: config() | nil
  def detect_config(board) do
    pieces = board |> Map.values() |> Enum.filter(&(&1.type != :king))
    white_pieces = pieces |> Enum.filter(&(&1.color == :white)) |> Enum.map(& &1.type)
    black_pieces = pieces |> Enum.filter(&(&1.color == :black)) |> Enum.map(& &1.type)

    total = length(pieces)

    cond do
      # KvK
      total == 0 ->
        :kvk

      # K + Piece vs K
      total == 1 ->
        piece_type = List.first(white_pieces) || List.first(black_pieces)

        case piece_type do
          :queen -> :kqvk
          :lance -> :klvk
          :chariot -> :kcvk
          :knight -> :knvk
          _ -> nil
        end

      # Not supported
      true ->
        nil
    end
  end

  @doc """
  Check if a position is a supported tablebase endgame.
  """
  @spec is_endgame?(Types.board()) :: boolean()
  def is_endgame?(board) do
    detect_config(board) != nil
  end

  # ============================================================================
  # Tablebase Generation
  # ============================================================================

  @doc """
  Generate a tablebase for a specific configuration.
  """
  @spec generate(config()) :: :ok
  def generate(config) do
    init()

    case config do
      :kvk -> generate_kvk()
      :kqvk -> generate_kpvk(:queen)
      :klvk -> generate_kpvk(:lance)
      :kcvk -> generate_kpvk(:chariot)
      :knvk -> generate_kpvk(:knight)
    end

    :ok
  end

  @doc """
  Generate all common tablebases.
  """
  @spec generate_all() :: :ok
  def generate_all do
    [:kvk, :kqvk, :klvk, :kcvk, :knvk]
    |> Enum.each(&generate/1)

    :ok
  end

  defp generate_kvk do
    all_cells = Board.all_cells()

    # KvK is always a draw (no mating material)
    for wk <- all_cells,
        bk <- all_cells,
        wk != bk,
        not kings_adjacent?(wk, bk),
        stm <- [:white, :black] do
      board = %{
        wk => Types.new_piece(:king, :white),
        bk => Types.new_piece(:king, :black)
      }

      # KvK is always draw unless terminal
      {wdl, dtm} = get_terminal_outcome(board, stm) || {:draw, -1}

      key = encode_position(board, stm)
      entry = %{wdl: wdl, dtm: dtm, best_move: nil}
      store(:kvk, key, entry)
    end
  end

  defp generate_kpvk(piece_type) do
    all_cells = Board.all_cells()
    config = config_for_piece(piece_type)

    # Phase 1: Generate all positions, find terminals
    positions =
      for wk <- all_cells,
          bk <- all_cells,
          wk != bk,
          not kings_adjacent?(wk, bk),
          pc <- all_cells,
          pc != wk,
          pc != bk,
          variant <- variants_for_piece(piece_type),
          stm <- [:white, :black] do
        board = %{
          wk => Types.new_piece(:king, :white),
          bk => Types.new_piece(:king, :black),
          pc => Types.new_piece(piece_type, :white, variant)
        }

        # Skip illegal positions (opponent in check when it's not their turn)
        if not illegal_position?(board, stm) do
          {board, stm, encode_position(board, stm)}
        else
          nil
        end
      end
      |> Enum.reject(&is_nil/1)

    # Initialize terminals
    terminals =
      positions
      |> Enum.filter(fn {board, stm, _key} ->
        get_terminal_outcome(board, stm) != nil
      end)

    for {board, stm, key} <- terminals do
      {wdl, dtm} = get_terminal_outcome(board, stm)
      entry = %{wdl: wdl, dtm: dtm, best_move: nil}
      store(config, key, entry)
    end

    # Track unknown positions
    unknown_keys =
      positions
      |> Enum.filter(fn {board, stm, _key} ->
        get_terminal_outcome(board, stm) == nil
      end)
      |> MapSet.new(fn {_, _, key} -> key end)

    # Phase 2: Retrograde analysis
    do_retrograde(config, positions, unknown_keys, 0, 100)
  end

  defp do_retrograde(config, positions, unknown_keys, iteration, max_iter) do
    if iteration >= max_iter or MapSet.size(unknown_keys) == 0 do
      # Mark remaining unknowns as draws
      for {_board, _stm, key} <- positions,
          MapSet.member?(unknown_keys, key) do
        entry = %{wdl: :draw, dtm: -1, best_move: nil}
        store(config, key, entry)
      end

      :ok
    else
      do_retrograde_step(config, positions, unknown_keys, iteration, max_iter)
    end
  end

  defp do_retrograde_step(config, positions, unknown_keys, iteration, max_iter) do
    resolved =
      positions
      |> Enum.filter(fn {_, _, key} -> MapSet.member?(unknown_keys, key) end)
      |> Enum.reduce([], fn {board, stm, key}, acc ->
        case try_resolve_position(config, board, stm) do
          nil ->
            acc

          entry ->
            store(config, key, entry)
            [key | acc]
        end
      end)

    if Enum.empty?(resolved) do
      # Mark remaining as draws (done by the caller)
      :ok
    else
      new_unknown = Enum.reduce(resolved, unknown_keys, &MapSet.delete(&2, &1))
      do_retrograde(config, positions, new_unknown, iteration + 1, max_iter)
    end
  end

  defp try_resolve_position(config, board, stm) do
    moves = Moves.generate_all_legal_moves(board, stm)

    {has_winning_move, all_lose, best_info, max_loss_dtm} =
      Enum.reduce(moves, {false, true, nil, 0}, fn move, {win, lose, best, max_dtm} ->
        new_board = Moves.apply_move(board, move)
        opp_stm = Types.opposite_color(stm)
        opp_key = encode_position(new_board, opp_stm)

        case lookup(config, opp_key) do
          nil ->
            {win, false, best, max_dtm}

          %{wdl: :unknown} ->
            {win, false, best, max_dtm}

          %{wdl: :loss, dtm: dtm} ->
            # Opponent loses = we win
            new_best =
              if best == nil or dtm + 1 < elem(best, 1) do
                {move, dtm + 1}
              else
                best
              end

            {true, lose, new_best, max_dtm}

          %{wdl: :win, dtm: dtm} ->
            # Opponent wins = we lose with this move
            {win, lose, best, max(max_dtm, dtm)}

          %{wdl: :draw} ->
            {win, false, best, max_dtm}
        end
      end)

    cond do
      has_winning_move and best_info != nil ->
        {best_move, dtm} = best_info
        %{wdl: :win, dtm: dtm, best_move: best_move}

      all_lose and length(moves) > 0 ->
        %{wdl: :loss, dtm: max_loss_dtm + 1, best_move: nil}

      true ->
        nil
    end
  end

  defp config_for_piece(:queen), do: :kqvk
  defp config_for_piece(:lance), do: :klvk
  defp config_for_piece(:chariot), do: :kcvk
  defp config_for_piece(:knight), do: :knvk

  defp variants_for_piece(:lance), do: [:a, :b]
  defp variants_for_piece(_), do: [nil]

  defp kings_adjacent?({q1, r1}, {q2, r2}) do
    dq = abs(q1 - q2)
    dr = abs(r1 - r2)
    ds = abs(-q1 - r1 - (-q2 - r2))
    max(dq, max(dr, ds)) <= 1
  end

  defp illegal_position?(board, stm) do
    opponent = Types.opposite_color(stm)
    Moves.in_check?(board, opponent)
  end

  defp get_terminal_outcome(board, stm) do
    moves = Moves.generate_all_legal_moves(board, stm)

    if Enum.empty?(moves) do
      if Moves.in_check?(board, stm) do
        {:loss, 0}
      else
        {:draw, -1}
      end
    else
      nil
    end
  end

  # ============================================================================
  # Tablebase Probe
  # ============================================================================

  @doc """
  Probe the tablebase for a position.
  Returns {:ok, entry} if found, :not_found otherwise.
  """
  @spec probe(Types.board(), Types.color()) :: {:ok, entry()} | :not_found
  def probe(board, stm) do
    case detect_config(board) do
      nil ->
        :not_found

      config ->
        # Ensure tablebase is generated
        if not tablebase_exists?(config) do
          generate(config)
        end

        key = encode_position(board, stm)

        case lookup(config, key) do
          nil -> :not_found
          entry -> {:ok, entry}
        end
    end
  end

  @doc """
  Get the tablebase score for evaluation integration.
  Returns large positive for wins, 0 for draws, large negative for losses.
  """
  @spec get_score(Types.board(), Types.color()) :: {:ok, integer()} | :not_found
  def get_score(board, stm) do
    case probe(board, stm) do
      {:ok, %{wdl: :win, dtm: dtm}} -> {:ok, 100_000 - dtm}
      {:ok, %{wdl: :draw}} -> {:ok, 0}
      {:ok, %{wdl: :loss, dtm: dtm}} -> {:ok, -100_000 + dtm}
      :not_found -> :not_found
    end
  end

  @doc """
  Get the best move from tablebase.
  """
  @spec get_move(Types.board(), Types.color()) :: {:ok, Types.move()} | :not_found
  def get_move(board, stm) do
    case probe(board, stm) do
      {:ok, %{wdl: :win, best_move: move}} when move != nil -> {:ok, move}
      _ -> :not_found
    end
  end

  defp tablebase_exists?(config) do
    init()
    # Check if any entry exists for this config
    :ets.match_object(@table_name, {{config, :_}, :_}) != []
  end

  # ============================================================================
  # Statistics
  # ============================================================================

  @doc """
  Get statistics about loaded tablebases.
  """
  @spec get_stats() :: %{
          config() => %{entries: integer(), wins: integer(), draws: integer(), losses: integer()}
        }
  def get_stats do
    init()

    configs = [:kvk, :kqvk, :klvk, :kcvk, :knvk]

    configs
    |> Enum.map(fn config ->
      entries = :ets.match_object(@table_name, {{config, :_}, :_})

      stats =
        Enum.reduce(entries, %{entries: 0, wins: 0, draws: 0, losses: 0}, fn {_, entry}, acc ->
          acc = Map.update!(acc, :entries, &(&1 + 1))

          case entry.wdl do
            :win -> Map.update!(acc, :wins, &(&1 + 1))
            :draw -> Map.update!(acc, :draws, &(&1 + 1))
            :loss -> Map.update!(acc, :losses, &(&1 + 1))
            _ -> acc
          end
        end)

      {config, stats}
    end)
    |> Map.new()
  end

  @doc """
  Format tablebase statistics for display.
  """
  @spec format_stats() :: String.t()
  def format_stats do
    stats = get_stats()

    total =
      stats
      |> Map.values()
      |> Enum.reduce(0, fn s, acc -> acc + s.entries end)

    lines = [
      "=== Endgame Tablebase Statistics ===",
      "",
      "Total entries: #{total}",
      ""
    ]

    config_lines =
      stats
      |> Enum.filter(fn {_, s} -> s.entries > 0 end)
      |> Enum.map(fn {config, s} ->
        name = config_name(config)
        win_pct = if s.entries > 0, do: Float.round(100 * s.wins / s.entries, 1), else: 0.0
        draw_pct = if s.entries > 0, do: Float.round(100 * s.draws / s.entries, 1), else: 0.0
        loss_pct = if s.entries > 0, do: Float.round(100 * s.losses / s.entries, 1), else: 0.0

        """
        #{name}:
          Size: #{s.entries} positions
          Wins: #{s.wins} (#{win_pct}%)
          Draws: #{s.draws} (#{draw_pct}%)
          Losses: #{s.losses} (#{loss_pct}%)
        """
      end)

    Enum.join(lines ++ config_lines, "\n")
  end

  defp config_name(:kvk), do: "KvK"
  defp config_name(:kqvk), do: "KQvK"
  defp config_name(:klvk), do: "KLvK"
  defp config_name(:kcvk), do: "KCvK"
  defp config_name(:knvk), do: "KNvK"
end
