defmodule Underchex.MixProject do
  use Mix.Project

  def project do
    [
      app: :underchex,
      version: "0.1.0",
      elixir: "~> 1.17",
      start_permanent: Mix.env() == :prod,
      deps: deps()
    ]
  end

  def application do
    [
      extra_applications: [:logger],
      mod: {Underchex.Application, []}
    ]
  end

  defp deps do
    [
      {:ranch, "~> 2.1"}
    ]
  end
end
