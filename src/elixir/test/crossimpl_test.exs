defmodule CrossImplTest do
  @moduledoc """
  Cross-Implementation Test Runner

  Runs test cases from spec/tests/move_validation.json to verify
  Elixir implementation matches the shared spec.

  Signed-by: agent #29 claude-sonnet-4 via opencode 20260122T08:15:15
  """

  use ExUnit.Case

  alias Underchex.{Types, Moves}

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
        "move_validation.json"
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

  # ============================================================================
  # Board Validation Tests
  # ============================================================================

  describe "Board Validation (from spec)" do
    test "board_001: Center cell is valid" do
      assert Types.valid_cell?({0, 0})
    end

    test "board_002: Corner cell at max radius is valid" do
      assert Types.valid_cell?({4, 0})
    end

    test "board_003: Cell outside board is invalid" do
      refute Types.valid_cell?({5, 0})
    end

    test "board_004: Cell violating q+r constraint is invalid" do
      refute Types.valid_cell?({3, 3})
    end

    test "board_005: Negative coordinate valid cell" do
      assert Types.valid_cell?({-4, 0})
    end

    test "board_006: Corner at min q, max r" do
      assert Types.valid_cell?({-4, 4})
    end

    test "board_007: Cell at q+r=-4 boundary is valid" do
      assert Types.valid_cell?({0, -4})
    end

    test "board_008: Cell beyond -4 boundary is invalid" do
      refute Types.valid_cell?({0, -5})
    end

    test "all board validation tests from spec" do
      suite = load_test_suite()

      board_tests =
        suite["testCases"]
        |> Enum.filter(fn tc -> tc["type"] == "boardValidation" end)

      for tc <- board_tests do
        coord = {tc["input"]["q"], tc["input"]["r"]}
        result = Types.valid_cell?(coord)
        expected = tc["expected"]["valid"]

        assert result == expected,
               "#{tc["id"]}: #{tc["description"]} - expected valid=#{expected}, got valid=#{result}"
      end
    end
  end

  # ============================================================================
  # Move Validation Tests
  # ============================================================================

  describe "Move Validation - King (from spec)" do
    test "king_001: King can move to adjacent empty cell" do
      board = %{{0, 0} => Types.new_piece(:king, :white)}

      case Moves.validate_move(board, {0, 0}, {1, 0}, :white) do
        {:ok, _move} -> assert true
        {:error, reason} -> flunk("Expected legal move, got error: #{reason}")
      end
    end

    test "king_002: King cannot move 2 squares" do
      board = %{{0, 0} => Types.new_piece(:king, :white)}

      case Moves.validate_move(board, {0, 0}, {2, 0}, :white) do
        {:ok, _move} -> flunk("Expected illegal move")
        {:error, _reason} -> assert true
      end
    end

    test "king_003: King can capture enemy piece" do
      board = %{
        {0, 0} => Types.new_piece(:king, :white),
        {1, 0} => Types.new_piece(:pawn, :black)
      }

      case Moves.validate_move(board, {0, 0}, {1, 0}, :white) do
        {:ok, move} ->
          assert move.captured != nil

        {:error, reason} ->
          flunk("Expected legal capture, got error: #{reason}")
      end
    end

    test "king_004: King cannot capture friendly piece" do
      board = %{
        {0, 0} => Types.new_piece(:king, :white),
        {1, 0} => Types.new_piece(:pawn, :white)
      }

      case Moves.validate_move(board, {0, 0}, {1, 0}, :white) do
        {:ok, _move} -> flunk("Expected illegal move")
        {:error, _reason} -> assert true
      end
    end
  end

  describe "Move Validation - Queen (from spec)" do
    test "queen_001: Queen can slide multiple squares" do
      board = %{
        {0, 0} => Types.new_piece(:queen, :white),
        {4, 0} => Types.new_piece(:king, :white)
      }

      case Moves.validate_move(board, {0, 0}, {0, -3}, :white) do
        {:ok, _move} -> assert true
        {:error, reason} -> flunk("Expected legal move, got error: #{reason}")
      end
    end

    test "queen_002: Queen cannot jump over pieces" do
      board = %{
        {0, 0} => Types.new_piece(:queen, :white),
        {0, -1} => Types.new_piece(:pawn, :white),
        {4, 0} => Types.new_piece(:king, :white)
      }

      case Moves.validate_move(board, {0, 0}, {0, -3}, :white) do
        {:ok, _move} -> flunk("Expected illegal move")
        {:error, _reason} -> assert true
      end
    end
  end

  describe "Move Validation - Pawn (from spec)" do
    test "pawn_001: White pawn moves north" do
      board = %{
        {0, 2} => Types.new_piece(:pawn, :white),
        {4, 0} => Types.new_piece(:king, :white)
      }

      case Moves.validate_move(board, {0, 2}, {0, 1}, :white) do
        {:ok, _move} -> assert true
        {:error, reason} -> flunk("Expected legal move, got error: #{reason}")
      end
    end

    test "pawn_002: White pawn cannot move south" do
      board = %{
        {0, 2} => Types.new_piece(:pawn, :white),
        {4, 0} => Types.new_piece(:king, :white)
      }

      case Moves.validate_move(board, {0, 2}, {0, 3}, :white) do
        {:ok, _move} -> flunk("Expected illegal move")
        {:error, _reason} -> assert true
      end
    end

    test "pawn_003: White pawn captures forward (north)" do
      board = %{
        {0, 2} => Types.new_piece(:pawn, :white),
        {0, 1} => Types.new_piece(:pawn, :black),
        {4, 0} => Types.new_piece(:king, :white)
      }

      case Moves.validate_move(board, {0, 2}, {0, 1}, :white) do
        {:ok, move} -> assert move.captured != nil
        {:error, reason} -> flunk("Expected legal capture, got error: #{reason}")
      end
    end

    test "pawn_004: White pawn captures diagonally NE" do
      board = %{
        {0, 2} => Types.new_piece(:pawn, :white),
        {1, 1} => Types.new_piece(:pawn, :black),
        {4, 0} => Types.new_piece(:king, :white)
      }

      case Moves.validate_move(board, {0, 2}, {1, 1}, :white) do
        {:ok, move} -> assert move.captured != nil
        {:error, reason} -> flunk("Expected legal capture, got error: #{reason}")
      end
    end

    test "pawn_005: Black pawn moves south" do
      board = %{
        {0, -2} => Types.new_piece(:pawn, :black),
        {-4, 0} => Types.new_piece(:king, :black)
      }

      case Moves.validate_move(board, {0, -2}, {0, -1}, :black) do
        {:ok, _move} -> assert true
        {:error, reason} -> flunk("Expected legal move, got error: #{reason}")
      end
    end

    test "pawn_007: Pawn blocked by friendly piece" do
      board = %{
        {0, 2} => Types.new_piece(:pawn, :white),
        {0, 1} => Types.new_piece(:pawn, :white),
        {4, 0} => Types.new_piece(:king, :white)
      }

      case Moves.validate_move(board, {0, 2}, {0, 1}, :white) do
        {:ok, _move} -> flunk("Expected illegal move")
        {:error, _reason} -> assert true
      end
    end
  end

  describe "Move Validation - Knight (from spec)" do
    test "knight_001: Knight leaps to valid target" do
      board = %{
        {0, 0} => Types.new_piece(:knight, :white),
        {4, 0} => Types.new_piece(:king, :white)
      }

      case Moves.validate_move(board, {0, 0}, {1, -2}, :white) do
        {:ok, _move} -> assert true
        {:error, reason} -> flunk("Expected legal move, got error: #{reason}")
      end
    end

    test "knight_002: Knight can jump over pieces" do
      board = %{
        {0, 0} => Types.new_piece(:knight, :white),
        {0, -1} => Types.new_piece(:pawn, :white),
        {1, -1} => Types.new_piece(:pawn, :black),
        {4, 0} => Types.new_piece(:king, :white)
      }

      case Moves.validate_move(board, {0, 0}, {1, -2}, :white) do
        {:ok, _move} -> assert true
        {:error, reason} -> flunk("Expected legal move, got error: #{reason}")
      end
    end

    test "knight_003: Knight cannot move to invalid target" do
      board = %{
        {0, 0} => Types.new_piece(:knight, :white),
        {4, 0} => Types.new_piece(:king, :white)
      }

      case Moves.validate_move(board, {0, 0}, {1, 0}, :white) do
        {:ok, _move} -> flunk("Expected illegal move")
        {:error, _reason} -> assert true
      end
    end
  end

  describe "Move Validation - Lance (from spec)" do
    test "lance_001: Lance A slides north" do
      board = %{
        {0, 2} => Types.new_piece(:lance, :white, :a),
        {4, 0} => Types.new_piece(:king, :white)
      }

      case Moves.validate_move(board, {0, 2}, {0, -2}, :white) do
        {:ok, _move} -> assert true
        {:error, reason} -> flunk("Expected legal move, got error: #{reason}")
      end
    end

    test "lance_002: Lance A cannot move NE" do
      board = %{
        {0, 2} => Types.new_piece(:lance, :white, :a),
        {4, 0} => Types.new_piece(:king, :white)
      }

      case Moves.validate_move(board, {0, 2}, {2, 0}, :white) do
        {:ok, _move} -> flunk("Expected illegal move")
        {:error, _reason} -> assert true
      end
    end

    test "lance_003: Lance B slides NE" do
      board = %{
        {0, 0} => Types.new_piece(:lance, :white, :b),
        {-4, 0} => Types.new_piece(:king, :white)
      }

      case Moves.validate_move(board, {0, 0}, {2, -2}, :white) do
        {:ok, _move} -> assert true
        {:error, reason} -> flunk("Expected legal move, got error: #{reason}")
      end
    end

    test "lance_004: Lance B cannot move NW" do
      board = %{
        {0, 0} => Types.new_piece(:lance, :white, :b),
        {4, 0} => Types.new_piece(:king, :white)
      }

      # NW is {-1, 0}, so {-2, 0} is 2 steps NW
      case Moves.validate_move(board, {0, 0}, {-2, 0}, :white) do
        {:ok, _move} -> flunk("Expected illegal move")
        {:error, _reason} -> assert true
      end
    end
  end

  describe "Move Validation - Chariot (from spec)" do
    test "chariot_001: Chariot slides NE" do
      board = %{
        {0, 0} => Types.new_piece(:chariot, :white),
        {-4, 0} => Types.new_piece(:king, :white)
      }

      case Moves.validate_move(board, {0, 0}, {3, -3}, :white) do
        {:ok, _move} -> assert true
        {:error, reason} -> flunk("Expected legal move, got error: #{reason}")
      end
    end

    test "chariot_002: Chariot cannot move north" do
      board = %{
        {0, 0} => Types.new_piece(:chariot, :white),
        {-4, 0} => Types.new_piece(:king, :white)
      }

      case Moves.validate_move(board, {0, 0}, {0, -2}, :white) do
        {:ok, _move} -> flunk("Expected illegal move")
        {:error, _reason} -> assert true
      end
    end
  end

  describe "Move Validation - Check (from spec)" do
    test "check_001: King cannot move into check" do
      board = %{
        {0, 0} => Types.new_piece(:king, :white),
        {1, -4} => Types.new_piece(:queen, :black),
        {-4, 0} => Types.new_piece(:king, :black)
      }

      case Moves.validate_move(board, {0, 0}, {1, 0}, :white) do
        {:ok, _move} -> flunk("Expected illegal move (would be in check)")
        {:error, :moves_into_check} -> assert true
        {:error, other} -> flunk("Expected :moves_into_check, got: #{other}")
      end
    end
  end

  describe "Move Validation - Turn (from spec)" do
    test "turn_001: Cannot move opponent's piece" do
      board = %{
        {0, -2} => Types.new_piece(:pawn, :black),
        {4, 0} => Types.new_piece(:king, :white)
      }

      case Moves.validate_move(board, {0, -2}, {0, -1}, :white) do
        {:ok, _move} -> flunk("Expected illegal move")
        {:error, :not_your_piece} -> assert true
        {:error, other} -> flunk("Expected :not_your_piece, got: #{other}")
      end
    end

    test "turn_002: Cannot move from empty cell" do
      board = %{
        {0, 0} => Types.new_piece(:king, :white)
      }

      case Moves.validate_move(board, {1, 0}, {2, 0}, :white) do
        {:ok, _move} -> flunk("Expected illegal move")
        {:error, :no_piece_at_source} -> assert true
        {:error, other} -> flunk("Expected :no_piece_at_source, got: #{other}")
      end
    end
  end

  describe "Move Validation - All from spec" do
    test "all move validation tests from spec" do
      suite = load_test_suite()

      move_tests =
        suite["testCases"]
        |> Enum.filter(fn tc -> tc["type"] == "moveValidation" end)

      for tc <- move_tests do
        board = build_board_from_spec(tc["setup"])
        turn = string_to_color(tc["setup"]["turn"])

        from = {tc["move"]["from"]["q"], tc["move"]["from"]["r"]}
        to = {tc["move"]["to"]["q"], tc["move"]["to"]["r"]}

        result = Moves.validate_move(board, from, to, turn)
        expected_legal = tc["expected"]["legal"]

        case {result, expected_legal} do
          {{:ok, move}, true} ->
            # Check capture if specified
            if tc["expected"]["capture"] do
              assert move.captured != nil,
                     "#{tc["id"]}: #{tc["description"]} - expected capture"
            end

          {{:error, _reason}, false} ->
            # Check reason if specified
            expected_reason = tc["expected"]["reason"]

            if expected_reason do
              reason_atom = reason_to_atom(expected_reason)

              {_, actual_reason} = result

              assert actual_reason == reason_atom,
                     "#{tc["id"]}: #{tc["description"]} - expected reason #{expected_reason}, got #{actual_reason}"
            end

          {{:ok, _move}, false} ->
            flunk("#{tc["id"]}: #{tc["description"]} - expected illegal, got legal")

          {{:error, reason}, true} ->
            flunk("#{tc["id"]}: #{tc["description"]} - expected legal, got error: #{reason}")
        end
      end
    end
  end

  defp reason_to_atom("noPieceAtSource"), do: :no_piece_at_source
  defp reason_to_atom("notYourPiece"), do: :not_your_piece
  defp reason_to_atom("invalidDestination"), do: :invalid_destination
  defp reason_to_atom("movesIntoCheck"), do: :moves_into_check
  defp reason_to_atom("illegalMove"), do: :illegal_move
  defp reason_to_atom(_), do: :unknown

  # ============================================================================
  # Coverage Report
  # ============================================================================

  describe "Coverage Report" do
    test "reports test case coverage" do
      suite = load_test_suite()

      board_tests =
        suite["testCases"]
        |> Enum.filter(fn tc -> tc["type"] == "boardValidation" end)
        |> length()

      move_tests =
        suite["testCases"]
        |> Enum.filter(fn tc -> tc["type"] == "moveValidation" end)
        |> length()

      IO.puts("\n\n=== Spec Test Coverage Report (Elixir) ===")
      IO.puts("Board validation tests: #{board_tests}")
      IO.puts("Move validation tests: #{move_tests}")
      IO.puts("Total spec tests: #{length(suite["testCases"])}")
      IO.puts("==========================================\n")

      assert length(suite["testCases"]) > 0
    end
  end
end
