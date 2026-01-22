defmodule Underchex.Server do
  @moduledoc """
  Telnet server for Underchex using Ranch.

  Signed-by: agent #26 claude-sonnet-4 via opencode 20260122T07:33:49
  """

  @behaviour :ranch_protocol

  alias Underchex.{Game, AI, Display, Types}

  require Logger

  defstruct [:socket, :transport, :game, :player_color, :ai_difficulty]

  @impl :ranch_protocol
  def start_link(ref, transport, opts) do
    pid = spawn_link(__MODULE__, :init, [ref, transport, opts])
    {:ok, pid}
  end

  def init(ref, transport, _opts) do
    {:ok, socket} = :ranch.handshake(ref)
    :ok = transport.setopts(socket, [{:active, true}, {:packet, :line}])

    state = %__MODULE__{
      socket: socket,
      transport: transport,
      game: nil,
      player_color: nil,
      ai_difficulty: :medium
    }

    send_welcome(state)
    loop(state)
  end

  defp send_welcome(state) do
    send_line(state, "")
    send_line(state, "===================================")
    send_line(state, "  Welcome to UNDERCHEX")
    send_line(state, "  Hexagonal Chess Variant")
    send_line(state, "===================================")
    send_line(state, "")
    send_line(state, "Commands:")
    send_line(state, "  new [white|black] - Start a new game")
    send_line(state, "  move <from> <to>  - Make a move (e.g., move e2 e4)")
    send_line(state, "  moves             - Show legal moves")
    send_line(state, "  board             - Show the board")
    send_line(state, "  difficulty [easy|medium|hard] - Set AI difficulty")
    send_line(state, "  resign            - Resign the game")
    send_line(state, "  help              - Show this help")
    send_line(state, "  quit              - Disconnect")
    send_line(state, "")
    send_prompt(state)
  end

  defp loop(state) do
    receive do
      {:tcp, _socket, data} ->
        input = String.trim(data)
        {output, new_state} = handle_command(input, state)

        for line <- output do
          send_line(state, line)
        end

        send_prompt(new_state)
        loop(new_state)

      {:tcp_closed, _socket} ->
        Logger.info("Client disconnected")
        :ok

      {:tcp_error, _socket, reason} ->
        Logger.error("TCP error: #{inspect(reason)}")
        :ok
    end
  end

  defp handle_command("", state), do: {[], state}

  defp handle_command("quit", state) do
    send_line(state, "Goodbye!")
    state.transport.close(state.socket)
    {[], state}
  end

  defp handle_command("help", state), do: {help_text(), state}

  defp handle_command("new " <> color_str, state) do
    color =
      case String.trim(String.downcase(color_str)) do
        "white" -> :white
        "black" -> :black
        _ -> :white
      end

    game = Game.new_game()
    new_state = %{state | game: game, player_color: color}

    output =
      [
        "",
        "New game started! You are playing as #{color}.",
        "AI difficulty: #{state.ai_difficulty}",
        ""
      ] ++ board_lines(game.board)

    # If playing black, AI moves first
    if color == :black do
      {ai_output, final_state} = make_ai_move(new_state)
      {output ++ ai_output, final_state}
    else
      {output ++ ["", "Your move (White to play)"], new_state}
    end
  end

  defp handle_command("new", state) do
    handle_command("new white", state)
  end

  defp handle_command("board", state) do
    case state.game do
      nil -> {["No game in progress. Use 'new' to start a game."], state}
      game -> {board_lines(game.board), state}
    end
  end

  defp handle_command("moves", state) do
    case state.game do
      nil ->
        {["No game in progress. Use 'new' to start a game."], state}

      game ->
        if game.turn == state.player_color do
          moves = Game.legal_moves(game)

          move_strs =
            moves
            |> Enum.map(&Display.format_move/1)
            |> Enum.sort()
            |> Enum.join(", ")

          {["Legal moves (#{length(moves)}):", move_strs], state}
        else
          {["It's not your turn!"], state}
        end
    end
  end

  defp handle_command("move " <> move_str, state) do
    case state.game do
      nil ->
        {["No game in progress. Use 'new' to start a game."], state}

      game ->
        if game.turn != state.player_color do
          {["It's not your turn!"], state}
        else
          case Display.parse_move(move_str) do
            {:error, reason} ->
              {[reason], state}

            {:ok, from, to} ->
              case Game.make_move(game, from, to) do
                {:error, reason} ->
                  {["Invalid move: #{reason}"], state}

                {:ok, new_game} ->
                  new_state = %{state | game: new_game}
                  output = board_lines(new_game.board) ++ game_status_lines(new_game)

                  # Check if game is over
                  case new_game.status do
                    {:ongoing} ->
                      # AI's turn
                      {ai_output, final_state} = make_ai_move(new_state)
                      {output ++ ai_output, final_state}

                    _ ->
                      {output, new_state}
                  end
              end
          end
        end
    end
  end

  defp handle_command("difficulty " <> level, state) do
    difficulty =
      case String.trim(String.downcase(level)) do
        "easy" -> :easy
        "medium" -> :medium
        "hard" -> :hard
        _ -> state.ai_difficulty
      end

    {["AI difficulty set to: #{difficulty}"], %{state | ai_difficulty: difficulty}}
  end

  defp handle_command("difficulty", state) do
    {[
       "Current difficulty: #{state.ai_difficulty}",
       "Use 'difficulty [easy|medium|hard]' to change."
     ], state}
  end

  defp handle_command("resign", state) do
    case state.game do
      nil ->
        {["No game in progress."], state}

      game ->
        new_game = Game.resign(game, state.player_color)

        {["You resigned. #{Types.opposite_color(state.player_color)} wins!"],
         %{state | game: new_game}}
    end
  end

  defp handle_command(unknown, state) do
    {["Unknown command: #{unknown}", "Type 'help' for available commands."], state}
  end

  defp make_ai_move(state) do
    game = state.game
    ai_color = Types.opposite_color(state.player_color)

    case AI.get_move(game.board, ai_color, state.ai_difficulty) do
      nil ->
        {["AI has no moves!"], state}

      move ->
        case Game.make_move(game, move.from, move.to) do
          {:error, reason} ->
            {["AI error: #{reason}"], state}

          {:ok, new_game} ->
            new_state = %{state | game: new_game}
            move_str = Display.format_move(move)

            output =
              [
                "",
                "AI plays: #{move_str}",
                ""
              ] ++ board_lines(new_game.board) ++ game_status_lines(new_game)

            case new_game.status do
              {:ongoing} -> {output ++ ["", "Your move"], new_state}
              _ -> {output, new_state}
            end
        end
    end
  end

  defp board_lines(board) do
    Display.render_board(board)
    |> String.split("\n")
  end

  defp game_status_lines(game) do
    case game.status do
      {:ongoing} ->
        check_line = if Game.in_check?(game), do: ["Check!"], else: []
        check_line

      {:checkmate, winner} ->
        ["", "CHECKMATE! #{winner} wins!"]

      {:stalemate} ->
        ["", "STALEMATE! It's a draw."]

      {:resigned, winner} ->
        ["", "#{Types.opposite_color(winner)} resigned. #{winner} wins!"]

      {:draw, reason} ->
        ["", "Draw: #{reason}"]
    end
  end

  defp help_text do
    [
      "",
      "Commands:",
      "  new [white|black] - Start a new game (default: white)",
      "  move <from> <to>  - Make a move (e.g., move e2 e4)",
      "  moves             - Show all legal moves",
      "  board             - Show the current board",
      "  difficulty [easy|medium|hard] - Set/show AI difficulty",
      "  resign            - Resign the game",
      "  help              - Show this help",
      "  quit              - Disconnect",
      "",
      "Coordinates use letters a-i for columns and numbers 1-9 for rows.",
      "e5 is the center of the board.",
      ""
    ]
  end

  defp send_line(state, text) do
    state.transport.send(state.socket, text <> "\r\n")
  end

  defp send_prompt(state) do
    prompt =
      case state.game do
        nil ->
          "> "

        game ->
          turn = if game.turn == :white, do: "W", else: "B"
          "#{game.move_number}#{turn}> "
      end

    state.transport.send(state.socket, prompt)
  end
end
