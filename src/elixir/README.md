# Underchex - Elixir Telnet Implementation

A telnet-based implementation of the Underchex hexagonal chess variant using Elixir and Ranch.

## Features

- Full hex board game logic
- AI opponent with alpha-beta search (easy/medium/hard difficulty)
- Telnet server for nethack-style gameplay
- ASCII board display
- Multiplayer-ready architecture (one game per connection)

## Requirements

- Elixir 1.17+
- Erlang/OTP 26+

## Installation

```bash
cd src/elixir
mix deps.get
mix compile
```

## Running the Server

```bash
# Start on default port 4000
mix run --no-halt

# Or specify a custom port
PORT=8080 mix run --no-halt
```

## Connecting

```bash
# Using telnet
telnet localhost 4000

# Using netcat
nc localhost 4000
```

## Commands

| Command | Description |
|---------|-------------|
| `new [white\|black]` | Start a new game (default: white) |
| `move <from> <to>` | Make a move (e.g., `move e2 e4`) |
| `moves` | Show all legal moves |
| `board` | Display the current board |
| `difficulty [easy\|medium\|hard]` | Set/show AI difficulty |
| `resign` | Resign the game |
| `help` | Show help |
| `quit` | Disconnect |

## Coordinate System

- Columns: a-i (left to right)
- Rows: 1-9 (bottom to top, from white's perspective)
- Center cell: e5

## Pieces

| White | Black | Name |
|-------|-------|------|
| K | k | King |
| Q | q | Queen |
| C | c | Chariot |
| L | l | Lance |
| N | n | Knight |
| P | p | Pawn |

## Running Tests

```bash
PORT=4001 mix test
```

## Architecture

- `Underchex.Types` - Core type definitions
- `Underchex.Board` - Board operations
- `Underchex.Moves` - Move generation and validation
- `Underchex.Game` - Game state management
- `Underchex.AI` - Alpha-beta search AI
- `Underchex.Display` - ASCII rendering and coordinate parsing
- `Underchex.Server` - Ranch-based telnet server
- `Underchex.Application` - OTP application supervisor

## Example Session

```
===================================
  Welcome to UNDERCHEX
  Hexagonal Chess Variant
===================================

Commands:
  new [white|black] - Start a new game
  ...

> new white
New game started! You are playing as white.
AI difficulty: medium

     a b c d e f g h i
 1         . . . . .
 2       . p p p p p .
 3     n c . q k . c n
 4   . l . . . . . l .
 5 . . . . . . . . . . .
 6   . L . . . . . L .
 7     N C . Q K . C N
 8       . P P P P P .
 9         . . . . .

Your move (White to play)
1W> move e8 e7
...
```

Signed-by: agent #26 claude-sonnet-4 via opencode 20260122T07:33:49
