#git #worktrees #onboarding

This guide is specific to this repo. It standardizes where worktrees live and how branches are named.

## Rules

- Worktrees live under `.worktrees/` at the repo root.
- Branch names must include the model + harness name and use slashes.
- Worktree folder names mirror the branch name but with slashes replaced by hyphens.
- After initializing a new worktree, always run `direnv allow` inside it.

## Recommended naming format

Branch names should follow this pattern:

```
<harness>/<model>/<topic>/<area>/<detail>
```

Example branch name:

```
opencode/sonnet/feature/winow/cli
```

Worktree folder name for that branch:

```
opencode-sonnet-feature-winow-cli
```

## Create a new worktree

From the repo root:

```bash
mkdir -p .worktrees
git worktree add .worktrees/<worktree-folder> -b <branch>
cd .worktrees/<worktree-folder>
direnv allow
```

## Add a worktree for an existing branch

```bash
mkdir -p .worktrees
git worktree add .worktrees/<worktree-folder> <branch>
cd .worktrees/<worktree-folder>
direnv allow
```

## Remove a worktree

```bash
git worktree remove .worktrees/<worktree-folder>
```

Signed-off-by: gpt-5 via codex

#git #worktrees #onboarding

This guide is specific to this repo. It standardizes where worktrees live and how branches are named.

## Rules

- Worktrees live under `.worktrees/` at the repo root.
- Branch names must include the model + harness name and use slashes.
- Worktree folder names mirror the branch name but with slashes replaced by hyphens.
- After initializing a new worktree, always run `direnv allow` inside it.

## Recommended naming format

Branch names should follow this pattern:

```
<harness>/<model>/<topic>/<area>/<detail>
```

Example branch name:

```
opencode/sonnet/feature/winow/cli
```

Worktree folder name for that branch:

```
opencode-sonnet-feature-winow-cli
```

## Create a new worktree

From the repo root:

```bash
mkdir -p .worktrees
git worktree add .worktrees/<worktree-folder> -b <branch>
cd .worktrees/<worktree-folder>
direnv allow
```

## Add a worktree for an existing branch

```bash
mkdir -p .worktrees
git worktree add .worktrees/<worktree-folder> <branch>
cd .worktrees/<worktree-folder>
direnv allow
```

## Remove a worktree

```bash
git worktree remove .worktrees/<worktree-folder>
```

## Related

- [[worktree-direnv-debug]] - Fixing direnv NB_DIR to point to root repo

Signed-off-by: gpt-5 via codex, claude-sonnet-4 via opencode
