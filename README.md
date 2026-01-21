# UNDERCHEX

(This readme was 100% human-writen).

Repo to handle designing and playing a hex chess variant.

## Game Overview

Most hex chess variants try to design the game to upgrade from 4-way cardinal adjacencies (N,E, W, S) to 6-way cardinal adjacencies.

In this project we will try to design hex chess as a downgrade from 8-way cardinal adjacencies (NE, NW, SE, SW, N, E, W, S) down to 6-way (N, S, NW, NE, SW, SE).

## Pieces

Pawns - let's have pawns move N and capture N/NE/NW. We also allow capturing forwards, inspired by chinese chess - perhaps that allows for more interesting pawn formations. Certainly the "outpost" pattern of western chess will be more difficult to support, since diagonals no longer cross in underchex.

Kings - Moves 1 square in any of the 6 directions (N/S/NE/NW/SE/SW).
Queens - Kingrider. Moves n squares in any of the 6 directions (N/S/NE/NW/SE/SW).

Knights - aka elephants - are now bishop-like and come in 3 colors, since they move in 6 directions: (N-NW, NW-SW, SW-S, N-NE, NE-SE, SE-S)

Traditional chess has 4-way symmetry; we break the corresponding 6-way for the following pieces:

Lances - these are 4-way riders. They can move any number of squares N, S, or NW-SW, NE-SE. They act a lot like rooks, except they come in 2 colors.
Chariots - these are 4-way riders in the other 4 directions: NE, NW, SE, SW.

We considered these pieces with 3-way symmetry, but they feel extremely weird due to their inability to retreat along the same direction:

Y-rider: moves and takes along any of: NW, NE, S
Charger: moves and takes along any of: N, SW, SE

## Project scope

1. Allow playing 2player hex chess games
2. Allow quickly changing the rules of the game (size of board, location of starting pieces, functionality and rule set)
3. Implement a chess playing AI using tree lookahead, alpha-beta pruning, and table base / positional lookup
4. Implement some sort of self-play that allows us to recompute and refine the data fed into the runtime AI
5. Figure out more about chess AIs and how they are designed & built.

## Implementation

Build and reimplement in a couple different languages, all of which should be able to communicate with each other:

1. Typescript + html + react, visual website
2. Raw html + js with no dependencies
3. Python via a suitable GUI library
4. Kotlin via a suitable java GUI
5. Terminal via curses and raw C
6. Terminal via native direct rendering
7. rust compiling to wasm running in the browser
8. elixir server supporting telnet clients, nethack style


## Development

LLM-generated docs should be clearly labeled with LLMS_ or *.llms.md.

### Tools

* opencode
* codex
* claude code
* nb. Setup:
 - `nb remote set git@github.com:boweiliu/underchex.git docs/nb`
 - `nb sync --all # note that raw nb sync fails for some reason`
 - To verify, run `git pull` and note that the branch now exists
* direnv
* AGENTS.md - i tested this with AGENTS.test.md and AGENTS.expected.md, you might as well just to check you are configuring things properly.

* winow: Custom dev tool that wraps any agent in a tmux + a worktree and sends keystrokes into it. (Need to write this)
