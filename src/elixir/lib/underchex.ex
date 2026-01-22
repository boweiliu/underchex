defmodule Underchex do
  @moduledoc """
  Underchex - Hexagonal Chess Variant

  A telnet-based implementation of Underchex, supporting human vs AI gameplay.

  ## Starting the Server

      # Start the application
      mix run --no-halt

      # Connect with telnet
      telnet localhost 4000

  ## API Usage

      # Create a new game
      game = Underchex.Game.new_game()

      # Make a move
      {:ok, game} = Underchex.Game.make_move(game, {0, 2}, {0, 1})

      # Get AI move
      move = Underchex.AI.get_move(game.board, game.turn, :medium)

  Signed-by: agent #26 claude-sonnet-4 via opencode 20260122T07:33:49
  """

  @doc """
  Get the version of Underchex.
  """
  def version, do: "0.1.0"

  @doc """
  Start a new game and return the initial state.
  """
  defdelegate new_game(), to: Underchex.Game

  @doc """
  Make a move in the game.
  """
  defdelegate make_move(game, from, to), to: Underchex.Game

  @doc """
  Get the AI's best move.
  """
  defdelegate get_ai_move(board, color, difficulty), to: Underchex.AI, as: :get_move

  @doc """
  Render the board as ASCII.
  """
  defdelegate render_board(board), to: Underchex.Display
end
