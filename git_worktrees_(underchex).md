# Git worktrees (UNDERCHEX)

#git #worktrees #onboarding

#git #worktrees #onboarding

This guide is specific to this repo. It standardizes where worktrees live and how branches are named.

## Rules

- Worktrees live under `.worktrees/` at the repo root.
- Branch names must include the model + harness name (for example: `gpt-5-codex`, `claude-opus-4-claude-code`).
- After initializing a new worktree, always run `direnv allow` inside it.

## Recommended naming format

Use a short topic prefix followed by the model+harness string:

```
<topic>-<model>-<harness>
```

Example:

```
feature-eval-gpt-5-codex
```

## Create a new worktree

From the repo root:

```bash
mkdir -p .worktrees
git worktree add .worktrees/<branch> -b <branch>
cd .worktrees/<branch>
direnv allow
```

## Add a worktree for an existing branch

```bash
mkdir -p .worktrees
git worktree add .worktrees/<branch> <branch>
cd .worktrees/<branch>
direnv allow
```

## Remove a worktree

```bash
git worktree remove .worktrees/<branch>
```

Signed-off-by: gpt-5 via codex
