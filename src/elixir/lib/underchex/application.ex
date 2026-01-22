defmodule Underchex.Application do
  @moduledoc """
  OTP Application for Underchex telnet server.

  Signed-by: agent #26 claude-sonnet-4 via opencode 20260122T07:33:49
  """

  use Application

  @default_port 4000

  @impl true
  def start(_type, _args) do
    port = get_port()

    children = [
      :ranch.child_spec(
        :underchex_server,
        :ranch_tcp,
        %{socket_opts: [{:port, port}]},
        Underchex.Server,
        []
      )
    ]

    opts = [strategy: :one_for_one, name: Underchex.Supervisor]

    case Supervisor.start_link(children, opts) do
      {:ok, pid} ->
        IO.puts("Underchex telnet server started on port #{port}")
        IO.puts("Connect with: telnet localhost #{port}")
        {:ok, pid}

      error ->
        error
    end
  end

  defp get_port do
    case System.get_env("PORT") do
      nil ->
        @default_port

      port_str ->
        case Integer.parse(port_str) do
          {port, ""} -> port
          _ -> @default_port
        end
    end
  end
end
