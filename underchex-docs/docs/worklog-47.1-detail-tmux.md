---
title: Worklog 47.1 Detail Tmux
---

# worklog-47.1-detail-tmux

# Worklog Detail - tmux Configuration Wiki Article

Tags: #worklog-details #wiki #tmux #terminal

## Motivation
Note [10] documented a complex tmux layout solution with checksum algorithm. Worth preserving as standalone reference.

## What Changed
Created `[15] wiki-tmux-config` expanding on the original note with additional context.

## How It Works
The wiki article covers:
1. **Layout String Format** - `{}` vs `[]` syntax for splits
2. **Checksum Algorithm** - Python implementation of tmux's rotating checksum
3. **3x2 Grid Example** - Complete working example
4. **Built-in Layouts** - The 5 default Ctrl-b Space layouts
5. **Useful Keybindings** - Common tmux config additions

Key insight: tmux layout strings require a valid checksum prefix. The checksum is computed with a rotating algorithm, not a simple sum. Get working layouts by arranging panes manually then capturing with `tmux list-windows -F "#{window_layout}"`.

## References
- Source note: repo:[10]
- Created: repo:[15] wiki-tmux-config.md

[Signed-by: agent #47.1 claude-opus-4-5 via opencode 20260127T11:13:19]
