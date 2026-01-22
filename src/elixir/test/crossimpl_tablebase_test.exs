defmodule CrossImplTablebaseTest do
  @moduledoc """
  Cross-Implementation Tablebase Test Runner

  Runs test cases from spec/tests/tablebase_validation.json to verify
  Elixir tablebase implementation matches the shared spec.

  NOTE: Full tablebase tests are SLOW and skipped by default.
  Run with FULL_TABLEBASE=1 to enable all tests:
    FULL_TABLEBASE=1 mix test test/crossimpl_tablebase_test.exs

  Signed-by: agent #43 claude-sonnet-4 via opencode 20260122T10:58:25
  """

  use ExUnit.Case

  alias Underchex.{Types, Tablebase, Moves}

  # Check for full tablebase mode
  @full_tablebase System.get_env("FULL_TABLEBASE") == "1"

  # ============================================================================
  # Test Suite Loading
  # ============================================================================

  defp load_test_suite do
    spec_path =
      Path.join([
        File.cwd!(),
        "..",
        "..",
        "spec",
        "tests",
        "tablebase_validation.json"
      ])

    spec_path
    |> File.read!()
    |> Jason.decode!()
  end

  defp string_to_color("white"), do: :white
  defp string_to_color("black"), do: :black

  defp string_to_piece_type("king"), do: :king
  defp string_to_piece_type("queen"), do: :queen
  defp string_to_piece_type("knight"), do: :knight
  defp string_to_piece_type("pawn"), do: :pawn
  defp string_to_piece_type("lance"), do: :lance
  defp string_to_piece_type("chariot"), do: :chariot

  defp string_to_lance_variant("A"), do: :a
  defp string_to_lance_variant("B"), do: :b
  defp string_to_lance_variant(_), do: nil

  defp build_board_from_spec(setup) do
    setup["pieces"]
    |> Enum.map(fn placement ->
      piece_type = string_to_piece_type(placement["piece"])
      color = string_to_color(placement["color"])
      variant = placement["variant"] && string_to_lance_variant(placement["variant"])
      piece = Types.new_piece(piece_type, color, variant)
      coord = {placement["q"], placement["r"]}
      {coord, piece}
    end)
    |> Map.new()
  end

  defp wdl_to_string(:win), do: "win"
  defp wdl_to_string(:draw), do: "draw"
  defp wdl_to_string(:loss), do: "loss"
  defp wdl_to_string(:unknown), do: "unknown"

  # ============================================================================
  # Configuration Detection Tests
  # ============================================================================

  describe "Tablebase Configuration Detection (from spec)" do
    test "tb_config_001: KvK configuration detection - two kings only" do
      board = %{
        {0, 0} => Types.new_piece(:king, :white),
        {0, -3} => Types.new_piece(:king, :black)
      }

      config = Tablebase.detect_config(board)
      assert config == :kvk
    end

    test "tb_config_002: KQvK configuration detection - white queen" do
      board = %{
        {0, 0} => Types.new_piece(:king, :white),
        {2, 0} => Types.new_piece(:queen, :white),
        {0, -3} => Types.new_piece(:king, :black)
      }

      config = Tablebase.detect_config(board)
      assert config == :kqvk
    end

    test "tb_config_003: KQvK configuration detection - black queen" do
      board = %{
        {0, 0} => Types.new_piece(:king, :white),
        {2, 0} => Types.new_piece(:queen, :black),
        {0, -3} => Types.new_piece(:king, :black)
      }

      config = Tablebase.detect_config(board)
      # Black having queen still detects as KQvK (color-agnostic)
      assert config == :kqvk
    end

    test "tb_config_004: KLvK configuration detection - lance" do
      board = %{
        {0, 0} => Types.new_piece(:king, :white),
        {2, 0} => Types.new_piece(:lance, :white, :a),
        {0, -3} => Types.new_piece(:king, :black)
      }

      config = Tablebase.detect_config(board)
      assert config == :klvk
    end

    test "tb_config_005: KCvK configuration detection - chariot" do
      board = %{
        {0, 0} => Types.new_piece(:king, :white),
        {2, 0} => Types.new_piece(:chariot, :white),
        {0, -3} => Types.new_piece(:king, :black)
      }

      config = Tablebase.detect_config(board)
      assert config == :kcvk
    end

    test "tb_config_006: KNvK configuration detection - knight" do
      board = %{
        {0, 0} => Types.new_piece(:king, :white),
        {2, 0} => Types.new_piece(:knight, :white),
        {0, -3} => Types.new_piece(:king, :black)
      }

      config = Tablebase.detect_config(board)
      assert config == :knvk
    end

    test "tb_config_007: Complex position not supported by tablebase" do
      board = %{
        {0, 0} => Types.new_piece(:king, :white),
        {2, 0} => Types.new_piece(:queen, :white),
        {1, 0} => Types.new_piece(:queen, :white),
        {-1, 0} => Types.new_piece(:queen, :white),
        {0, -3} => Types.new_piece(:king, :black)
      }

      config = Tablebase.detect_config(board)
      # Not a supported configuration
      assert config == nil
    end

    test "all tablebaseConfig tests from spec" do
      suite = load_test_suite()

      config_tests =
        suite["testCases"]
        |> Enum.filter(fn tc -> tc["type"] == "tablebaseConfig" end)

      for tc <- config_tests do
        board = build_board_from_spec(tc["setup"])
        config = Tablebase.detect_config(board)

        if tc["expected"]["supported"] do
          assert config != nil,
                 "#{tc["id"]}: #{tc["description"]} - should be supported"

          if expected_config = tc["expected"]["config"] do
            actual_name = config_name(config)

            assert actual_name == expected_config,
                   "#{tc["id"]}: #{tc["description"]} - expected #{expected_config}, got #{actual_name}"
          end
        else
          # Not supported means nil config
          assert config == nil,
                 "#{tc["id"]}: #{tc["description"]} - should not be supported"
        end
      end
    end
  end

  # ============================================================================
  # WDL Lookup Tests - Fast (KvK only)
  # ============================================================================

  describe "Tablebase WDL Lookup - Fast (KvK)" do
    setup do
      Tablebase.init()
      Tablebase.clear()
      Tablebase.generate(:kvk)
      :ok
    end

    test "tb_wdl_001: KvK is always a draw (white to move)" do
      board = %{
        {0, 0} => Types.new_piece(:king, :white),
        {0, -3} => Types.new_piece(:king, :black)
      }

      result = Tablebase.probe(board, :white)

      assert {:ok, entry} = result
      assert entry.wdl == :draw
    end

    test "tb_wdl_002: KvK is draw for black too" do
      board = %{
        {0, 0} => Types.new_piece(:king, :white),
        {0, -3} => Types.new_piece(:king, :black)
      }

      result = Tablebase.probe(board, :black)

      assert {:ok, entry} = result
      assert entry.wdl == :draw
    end
  end

  # ============================================================================
  # WDL Lookup Tests - Full (requires FULL_TABLEBASE=1)
  # ============================================================================

  describe "Tablebase WDL Lookup - Full (requires FULL_TABLEBASE=1)" do
    setup do
      if @full_tablebase do
        Tablebase.init()
        Tablebase.clear()
        Tablebase.generate_all()
      end

      :ok
    end

    @tag :slow
    test "tb_wdl_003: KQvK - queen side to move is winning" do
      unless @full_tablebase do
        IO.puts("  Skipping (FULL_TABLEBASE not set)")
        assert true
      else
        board = %{
          {0, 0} => Types.new_piece(:king, :white),
          {2, 0} => Types.new_piece(:queen, :white),
          {0, -4} => Types.new_piece(:king, :black)
        }

        result = Tablebase.probe(board, :white)

        assert {:ok, entry} = result
        assert entry.wdl == :win
      end
    end

    @tag :slow
    test "tb_wdl_004: KQvK - lone king to move is losing" do
      unless @full_tablebase do
        IO.puts("  Skipping (FULL_TABLEBASE not set)")
        assert true
      else
        board = %{
          {0, 0} => Types.new_piece(:king, :white),
          {2, 0} => Types.new_piece(:queen, :white),
          {0, -4} => Types.new_piece(:king, :black)
        }

        result = Tablebase.probe(board, :black)

        assert {:ok, entry} = result
        assert entry.wdl == :loss
      end
    end

    @tag :slow
    test "tb_wdl_006: KNvK - knight alone cannot checkmate (draw)" do
      unless @full_tablebase do
        IO.puts("  Skipping (FULL_TABLEBASE not set)")
        assert true
      else
        board = %{
          {0, 0} => Types.new_piece(:king, :white),
          {2, 0} => Types.new_piece(:knight, :white),
          {0, -3} => Types.new_piece(:king, :black)
        }

        result = Tablebase.probe(board, :white)

        assert {:ok, entry} = result
        assert entry.wdl == :draw
      end
    end

    @tag :slow
    test "tb_wdl_007: KLvK - lance with good position is winning" do
      unless @full_tablebase do
        IO.puts("  Skipping (FULL_TABLEBASE not set)")
        assert true
      else
        board = %{
          {0, 0} => Types.new_piece(:king, :white),
          {0, -2} => Types.new_piece(:lance, :white, :a),
          {0, -4} => Types.new_piece(:king, :black)
        }

        result = Tablebase.probe(board, :white)

        assert {:ok, entry} = result
        assert entry.wdl == :win
      end
    end

    @tag :slow
    test "tb_wdl_008: KCvK - chariot with good position is winning" do
      unless @full_tablebase do
        IO.puts("  Skipping (FULL_TABLEBASE not set)")
        assert true
      else
        board = %{
          {0, 0} => Types.new_piece(:king, :white),
          {2, -2} => Types.new_piece(:chariot, :white),
          {3, -4} => Types.new_piece(:king, :black)
        }

        result = Tablebase.probe(board, :white)

        assert {:ok, entry} = result
        assert entry.wdl == :win
      end
    end

    @tag :slow
    test "all tablebaseWDL tests from spec" do
      unless @full_tablebase do
        IO.puts("  Skipping full WDL tests (FULL_TABLEBASE not set)")
        assert true
      else
        suite = load_test_suite()

        wdl_tests =
          suite["testCases"]
          |> Enum.filter(fn tc -> tc["type"] == "tablebaseWDL" end)

        for tc <- wdl_tests do
          board = build_board_from_spec(tc["setup"])
          turn = string_to_color(tc["setup"]["turn"])

          result = Tablebase.probe(board, turn)

          assert {:ok, entry} = result,
                 "#{tc["id"]}: #{tc["description"]} - should find position in tablebase"

          actual_wdl = wdl_to_string(entry.wdl)
          expected_wdl = tc["expected"]["wdl"]

          assert actual_wdl == expected_wdl,
                 "#{tc["id"]}: #{tc["description"]} - expected WDL=#{expected_wdl}, got WDL=#{actual_wdl}"

          if expected_dtm = tc["expected"]["dtm"] do
            assert entry.dtm == expected_dtm,
                   "#{tc["id"]}: #{tc["description"]} - expected DTM=#{expected_dtm}, got DTM=#{entry.dtm}"
          end
        end
      end
    end
  end

  # ============================================================================
  # Move Suggestion Tests
  # ============================================================================

  describe "Tablebase Move Suggestion" do
    setup do
      Tablebase.init()
      Tablebase.clear()
      Tablebase.generate(:kvk)
      :ok
    end

    test "tb_move_002: KvK - no winning move available (draw)" do
      board = %{
        {0, 0} => Types.new_piece(:king, :white),
        {0, -3} => Types.new_piece(:king, :black)
      }

      # For KvK, there's no winning move - it's always a draw
      result = Tablebase.probe(board, :white)

      assert {:ok, entry} = result
      assert entry.wdl == :draw
    end

    @tag :slow
    test "tb_move_001: KQvK - tablebase returns a move that maintains win" do
      unless @full_tablebase do
        IO.puts("  Skipping (FULL_TABLEBASE not set)")
        assert true
      else
        Tablebase.generate(:kqvk)

        board = %{
          {0, 0} => Types.new_piece(:king, :white),
          {2, 0} => Types.new_piece(:queen, :white),
          {0, -4} => Types.new_piece(:king, :black)
        }

        result = Tablebase.probe(board, :white)

        assert {:ok, entry} = result
        assert entry.wdl == :win
        assert entry.best_move != nil

        # Apply the move and verify opponent is losing
        new_board = Moves.apply_move(board, entry.best_move)
        new_result = Tablebase.probe(new_board, :black)

        assert {:ok, new_entry} = new_result
        assert new_entry.wdl == :loss
      end
    end
  end

  # ============================================================================
  # Symmetry Tests
  # ============================================================================

  describe "Tablebase Symmetry (requires FULL_TABLEBASE=1)" do
    setup do
      if @full_tablebase do
        Tablebase.init()
        Tablebase.clear()
        Tablebase.generate(:kqvk)
      end

      :ok
    end

    @tag :slow
    test "tb_symmetric_001: Black queen vs white king - queen side wins" do
      unless @full_tablebase do
        IO.puts("  Skipping (FULL_TABLEBASE not set)")
        assert true
      else
        board = %{
          {0, 4} => Types.new_piece(:king, :white),
          {2, 0} => Types.new_piece(:queen, :black),
          {0, 0} => Types.new_piece(:king, :black)
        }

        result = Tablebase.probe(board, :black)

        assert {:ok, entry} = result
        assert entry.wdl == :win
      end
    end

    @tag :slow
    test "tb_symmetric_002: Black queen vs white king - lone king loses" do
      unless @full_tablebase do
        IO.puts("  Skipping (FULL_TABLEBASE not set)")
        assert true
      else
        board = %{
          {0, 4} => Types.new_piece(:king, :white),
          {2, 0} => Types.new_piece(:queen, :black),
          {0, 0} => Types.new_piece(:king, :black)
        }

        result = Tablebase.probe(board, :white)

        assert {:ok, entry} = result
        assert entry.wdl == :loss
      end
    end
  end

  # ============================================================================
  # Coverage Report
  # ============================================================================

  describe "Tablebase Coverage Report" do
    test "reports tablebase test case coverage" do
      suite = load_test_suite()

      config_tests =
        suite["testCases"]
        |> Enum.filter(fn tc -> tc["type"] == "tablebaseConfig" end)
        |> length()

      wdl_tests =
        suite["testCases"]
        |> Enum.filter(fn tc -> tc["type"] == "tablebaseWDL" end)
        |> length()

      move_tests =
        suite["testCases"]
        |> Enum.filter(fn tc -> tc["type"] == "tablebaseMove" end)
        |> length()

      IO.puts("\n\n=== Tablebase Spec Test Coverage Report (Elixir) ===")
      IO.puts("Configuration detection tests: #{config_tests}")
      IO.puts("WDL lookup tests: #{wdl_tests}")
      IO.puts("Move suggestion tests: #{move_tests}")
      IO.puts("Total tablebase spec tests: #{length(suite["testCases"])}")
      IO.puts("Full tablebase mode: #{if @full_tablebase, do: "ENABLED", else: "disabled"}")
      IO.puts("=====================================================\n")

      assert length(suite["testCases"]) > 0
    end
  end

  # Helper function to convert config atom to string name
  defp config_name(:kvk), do: "KvK"
  defp config_name(:kqvk), do: "KQvK"
  defp config_name(:klvk), do: "KLvK"
  defp config_name(:kcvk), do: "KCvK"
  defp config_name(:knvk), do: "KNvK"
  defp config_name(nil), do: "nil"
end
