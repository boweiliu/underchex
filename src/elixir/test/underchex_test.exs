defmodule UnderchexTest do
  use ExUnit.Case

  alias Underchex.{Types, Board, Moves, Game, AI, Display}

  # ==========================================================================
  # Types Tests
  # ==========================================================================

  describe "Types" do
    test "valid_cell? returns true for center" do
      assert Types.valid_cell?({0, 0})
    end

    test "valid_cell? returns true for corners" do
      assert Types.valid_cell?({4, 0})
      assert Types.valid_cell?({-4, 0})
      assert Types.valid_cell?({0, 4})
      assert Types.valid_cell?({0, -4})
    end

    test "valid_cell? returns false for out of bounds" do
      refute Types.valid_cell?({5, 0})
      refute Types.valid_cell?({4, 4})
      refute Types.valid_cell?({-3, -3})
    end

    test "opposite_color" do
      assert Types.opposite_color(:white) == :black
      assert Types.opposite_color(:black) == :white
    end

    test "opposite_direction" do
      assert Types.opposite_direction(:n) == :s
      assert Types.opposite_direction(:ne) == :sw
      assert Types.opposite_direction(:nw) == :se
    end

    test "promotion_zone? white" do
      assert Types.promotion_zone?({0, -4}, :white)
      refute Types.promotion_zone?({0, 0}, :white)
    end

    test "promotion_zone? black" do
      assert Types.promotion_zone?({0, 4}, :black)
      refute Types.promotion_zone?({0, 0}, :black)
    end
  end

  # ==========================================================================
  # Board Tests
  # ==========================================================================

  describe "Board" do
    test "all_cells returns 61 cells" do
      assert length(Board.all_cells()) == 61
    end

    test "add_direction moves correctly" do
      assert Board.add_direction({0, 0}, :n) == {0, -1}
      assert Board.add_direction({0, 0}, :s) == {0, 1}
      assert Board.add_direction({0, 0}, :ne) == {1, -1}
    end

    test "get_neighbor returns nil for off-board" do
      assert Board.get_neighbor({0, -4}, :n) == nil
    end

    test "get_neighbor returns coord for valid" do
      assert Board.get_neighbor({0, 0}, :n) == {0, -1}
    end

    test "hex_distance" do
      assert Board.hex_distance({0, 0}, {0, 0}) == 0
      assert Board.hex_distance({0, 0}, {1, 0}) == 1
      assert Board.hex_distance({0, 0}, {2, -1}) == 2
    end

    test "get_knight_targets from center" do
      targets = Board.get_knight_targets({0, 0})
      assert length(targets) == 6
      assert {1, -2} in targets
      assert {-1, -1} in targets
    end
  end

  # ==========================================================================
  # Moves Tests
  # ==========================================================================

  describe "Moves" do
    test "generate_pseudo_legal_moves for pawn" do
      board = %{{0, 2} => Types.new_piece(:pawn, :white)}
      piece = board[{0, 2}]
      moves = Moves.generate_pseudo_legal_moves(board, piece, {0, 2})

      # Pawn can move forward
      assert Enum.any?(moves, fn m -> m.to == {0, 1} end)
    end

    test "generate_pseudo_legal_moves for king" do
      board = %{{0, 0} => Types.new_piece(:king, :white)}
      piece = board[{0, 0}]
      moves = Moves.generate_pseudo_legal_moves(board, piece, {0, 0})

      # King can move to all 6 neighbors
      assert length(moves) == 6
    end

    test "apply_move removes piece from source" do
      board = %{{0, 2} => Types.new_piece(:pawn, :white)}
      piece = board[{0, 2}]
      move = Types.new_move(piece, {0, 2}, {0, 1})

      new_board = Moves.apply_move(board, move)

      refute Map.has_key?(new_board, {0, 2})
      assert Map.has_key?(new_board, {0, 1})
    end

    test "in_check? detects check" do
      board = %{
        {0, 0} => Types.new_piece(:king, :white),
        {0, -2} => Types.new_piece(:queen, :black)
      }

      assert Moves.in_check?(board, :white)
    end

    test "in_check? returns false when not in check" do
      board = %{
        {0, 0} => Types.new_piece(:king, :white),
        {2, 2} => Types.new_piece(:queen, :black)
      }

      refute Moves.in_check?(board, :white)
    end
  end

  # ==========================================================================
  # Game Tests
  # ==========================================================================

  describe "Game" do
    test "new_game creates valid initial state" do
      game = Game.new_game()

      assert game.turn == :white
      assert game.move_number == 1
      assert game.status == {:ongoing}
      # 14 pieces per side
      assert map_size(game.board) == 28
    end

    test "make_move updates turn" do
      game = Game.new_game()

      # Find a valid pawn move
      {:ok, new_game} = Game.make_move(game, {0, 2}, {0, 1})

      assert new_game.turn == :black
    end

    test "make_move rejects invalid move" do
      game = Game.new_game()

      # Try to move to invalid square
      result = Game.make_move(game, {0, 2}, {5, 5})

      assert result == {:error, :invalid_destination}
    end

    test "make_move rejects moving opponent's piece" do
      game = Game.new_game()

      # Try to move black piece on white's turn
      result = Game.make_move(game, {0, -2}, {0, -1})

      assert result == {:error, :not_your_piece}
    end

    test "player_turn? returns correct value" do
      game = Game.new_game()

      assert Game.player_turn?(game, :white)
      refute Game.player_turn?(game, :black)
    end

    test "legal_moves returns moves for current player" do
      game = Game.new_game()
      moves = Game.legal_moves(game)

      assert length(moves) > 0
      assert Enum.all?(moves, fn m -> m.piece.color == :white end)
    end
  end

  # ==========================================================================
  # AI Tests
  # ==========================================================================

  describe "AI" do
    test "piece_value returns correct values" do
      assert AI.piece_value(:pawn) == 100
      assert AI.piece_value(:queen) == 900
      assert AI.piece_value(:king) == 10000
    end

    test "evaluate returns 0 for starting position" do
      game = Game.new_game()
      # Starting position should be roughly equal
      eval = AI.evaluate(game.board, :white)
      assert abs(eval) < 100
    end

    test "find_best_move returns a move" do
      game = Game.new_game()
      {move, _score} = AI.find_best_move(game.board, :white, 2)

      assert move != nil
      assert move.piece.color == :white
    end

    test "get_move respects difficulty" do
      game = Game.new_game()

      easy_move = AI.get_move(game.board, :white, :easy)
      assert easy_move != nil
    end
  end

  # ==========================================================================
  # Display Tests
  # ==========================================================================

  describe "Display" do
    test "parse_coord parses valid coordinates" do
      assert Display.parse_coord("e5") == {:ok, {0, 0}}
      assert Display.parse_coord("a5") == {:ok, {-4, 0}}
      assert Display.parse_coord("i5") == {:ok, {4, 0}}
    end

    test "parse_coord rejects invalid coordinates" do
      assert {:error, _} = Display.parse_coord("j5")
      assert {:error, _} = Display.parse_coord("e0")
    end

    test "coord_to_string formats correctly" do
      assert Display.coord_to_string({0, 0}) == "e5"
      assert Display.coord_to_string({-4, 0}) == "a5"
    end

    test "parse_move parses valid moves" do
      assert Display.parse_move("e2 e4") == {:ok, {0, -3}, {0, -1}}
      assert Display.parse_move("e2-e4") == {:ok, {0, -3}, {0, -1}}
    end

    test "render_board returns string" do
      game = Game.new_game()
      board_str = Display.render_board(game.board)

      assert is_binary(board_str)
      # White king
      assert String.contains?(board_str, "K")
      # Black king
      assert String.contains?(board_str, "k")
    end

    test "piece_char returns correct characters" do
      assert Display.piece_char(Types.new_piece(:king, :white)) == "K"
      assert Display.piece_char(Types.new_piece(:king, :black)) == "k"
      assert Display.piece_char(Types.new_piece(:queen, :white)) == "Q"
      assert Display.piece_char(Types.new_piece(:pawn, :black)) == "p"
    end
  end
end
