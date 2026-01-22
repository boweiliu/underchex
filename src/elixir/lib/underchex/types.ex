defmodule Underchex.Types do
  @moduledoc """
  Core types for Underchex hexagonal chess.

  Signed-by: agent #26 claude-sonnet-4 via opencode 20260122T07:33:49
  """

  @type coord :: {integer(), integer()}
  @type direction :: :n | :s | :ne | :nw | :se | :sw
  @type piece_type :: :pawn | :king | :queen | :knight | :lance | :chariot
  @type color :: :white | :black
  @type lance_variant :: :a | :b

  @type piece :: %{
          type: piece_type(),
          color: color(),
          variant: lance_variant() | nil
        }

  @type move :: %{
          from: coord(),
          to: coord(),
          piece: piece(),
          captured: piece() | nil,
          promotion: piece_type() | nil
        }

  @type game_status ::
          {:ongoing}
          | {:checkmate, color()}
          | {:stalemate}
          | {:draw, String.t()}
          | {:resigned, color()}

  @type board :: %{coord() => piece()}

  @type game_state :: %{
          board: board(),
          turn: color(),
          move_number: non_neg_integer(),
          half_move_clock: non_neg_integer(),
          history: [move()],
          status: game_status()
        }

  @board_radius 4

  # Direction vectors in axial coordinates
  @directions %{
    n: {0, -1},
    s: {0, 1},
    ne: {1, -1},
    sw: {-1, 1},
    nw: {-1, 0},
    se: {1, 0}
  }

  @all_directions [:n, :s, :ne, :sw, :nw, :se]
  @diagonal_directions [:ne, :nw, :se, :sw]
  @lance_a_directions [:n, :s, :nw, :se]
  @lance_b_directions [:n, :s, :ne, :sw]

  @promotion_targets [:queen, :chariot, :lance, :knight]

  @knight_offsets [
    # N then NE
    {1, -2},
    # N then NW
    {-1, -1},
    # NE then SE
    {2, -1},
    # SE then S
    {1, 1},
    # S then SW
    {-1, 2},
    # SW then NW
    {-2, 1}
  ]

  # Getters for module attributes
  def board_radius, do: @board_radius
  def directions, do: @directions
  def all_directions, do: @all_directions
  def diagonal_directions, do: @diagonal_directions
  def lance_a_directions, do: @lance_a_directions
  def lance_b_directions, do: @lance_b_directions
  def promotion_targets, do: @promotion_targets
  def knight_offsets, do: @knight_offsets

  @doc """
  Get the direction vector for a direction atom.
  """
  @spec direction_vector(direction()) :: coord()
  def direction_vector(dir), do: Map.fetch!(@directions, dir)

  @doc """
  Get the opposite direction.
  """
  @spec opposite_direction(direction()) :: direction()
  def opposite_direction(:n), do: :s
  def opposite_direction(:s), do: :n
  def opposite_direction(:ne), do: :sw
  def opposite_direction(:sw), do: :ne
  def opposite_direction(:nw), do: :se
  def opposite_direction(:se), do: :nw

  @doc """
  Get the opposite color.
  """
  @spec opposite_color(color()) :: color()
  def opposite_color(:white), do: :black
  def opposite_color(:black), do: :white

  @doc """
  Check if a coordinate is within the hexagonal board.
  """
  @spec valid_cell?(coord()) :: boolean()
  def valid_cell?({q, r}) do
    s = -q - r
    max(abs(q), max(abs(r), abs(s))) <= @board_radius
  end

  @doc """
  Check if a coordinate is in the promotion zone for a color.
  """
  @spec promotion_zone?(coord(), color()) :: boolean()
  def promotion_zone?({_q, r}, :white), do: r == -@board_radius
  def promotion_zone?({_q, r}, :black), do: r == @board_radius

  @doc """
  Get forward direction for a color.
  """
  @spec forward_direction(color()) :: direction()
  def forward_direction(:white), do: :n
  def forward_direction(:black), do: :s

  @doc """
  Get pawn capture directions for a color.
  """
  @spec pawn_capture_directions(color()) :: [direction()]
  def pawn_capture_directions(:white), do: [:n, :ne, :nw]
  def pawn_capture_directions(:black), do: [:s, :se, :sw]

  @doc """
  Get directions a piece can move in.
  """
  @spec piece_directions(piece()) :: [direction()]
  def piece_directions(%{type: :king}), do: @all_directions
  def piece_directions(%{type: :queen}), do: @all_directions
  def piece_directions(%{type: :chariot}), do: @diagonal_directions
  def piece_directions(%{type: :lance, variant: :a}), do: @lance_a_directions
  def piece_directions(%{type: :lance, variant: :b}), do: @lance_b_directions
  # default
  def piece_directions(%{type: :lance}), do: @lance_a_directions
  def piece_directions(_), do: []

  @doc """
  Check if a piece type is a slider.
  """
  @spec slider?(piece_type()) :: boolean()
  def slider?(:queen), do: true
  def slider?(:lance), do: true
  def slider?(:chariot), do: true
  def slider?(_), do: false

  @doc """
  Create a new piece.
  """
  @spec new_piece(piece_type(), color(), lance_variant() | nil) :: piece()
  def new_piece(type, color, variant \\ nil) do
    %{type: type, color: color, variant: variant}
  end

  @doc """
  Create a new move.
  """
  @spec new_move(piece(), coord(), coord(), piece() | nil, piece_type() | nil) :: move()
  def new_move(piece, from, to, captured \\ nil, promotion \\ nil) do
    %{
      piece: piece,
      from: from,
      to: to,
      captured: captured,
      promotion: promotion
    }
  end
end
