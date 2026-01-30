---
title: Worktrees   Guide   Merging To Main
---

# Worktrees - Guide - Merging to Main

Tags: #worktrees #git #guide #merging

## Problem

When working in a git worktree, you **cannot checkout main** because main is already checked out in the primary worktree. Git will error:

```
fatal: 'main' is already used by worktree at '/path/to/repo'
```

## Solution

To merge your feature branch into main:

1. `cd` to the **main worktree root** (not your feature worktree)
2. Verify you're on main: `git branch --show-current`
3. Merge from there: `git merge <feature-branch> --no-edit`

## Example

```bash
# From a worktree at /repo/.worktrees/my-feature
cd /repo                                    # Go to main worktree
git merge my-feature-branch --no-edit       # Merge feature into main
```

## Remember

- Never try `git checkout main` from inside a worktree
- The main repo root is where main lives
- After merging, you can continue working in your feature worktree

Signed-off-by: claude-opus-4 via claude-code
