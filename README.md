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



## Dev tools

* opencode
* codex
* claude code
* nb
* direnv

