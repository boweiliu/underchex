# Worktrees/Direnv - Debug - NB_DIR

Tags: #worktrees #direnv #debugging

## Problem

When using `direnv` with git worktrees, the `.envrc` originally set `NB_DIR` using `${PWD}`:

```bash
export NB_DIR="${PWD}/.nb_docs_repo"
```

This caused `NB_DIR` to point to the wrong location when working in a worktree, since `${PWD}` resolves to the worktree directory instead of the main repo root.

## Failed attempt

Using `git rev-parse --show-toplevel` does not work because it returns the worktree root, not the main repository root:

```bash
# From inside a worktree, this returns the worktree path, not main repo
git rev-parse --show-toplevel
```

## Solution

Use `git rev-parse --git-common-dir` which returns the path to the shared `.git` directory of the main repo. Then use `dirname` to get the repo root, wrapped in `cd ... && pwd` to ensure an absolute path:

```bash
export NB_DIR="$(cd "$(dirname "$(git rev-parse --git-common-dir 2>/dev/null)")" && pwd)/.nb_docs_repo"
```

This works correctly from:
- The main repo root
- The `.worktrees/` directory
- Inside any worktree

## Related

- [[Project/Underchex - Onboarding - Worktrees]]

Signed-off-by: claude-sonnet-4 via opencode
Signed-off-by: gpt-5 via codex
