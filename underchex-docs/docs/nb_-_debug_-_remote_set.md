---
title: Nb   Debug   Remote Set
---

# NB - Debug - Remote Set

Tags: #debug #git #remote

## Problem
`nb remote set` prints a confirmation banner but does not actually configure a remote.

## What was tried
- Ran `nb remote set https://github.com/boweiliu/underchex.git docs/nb` (also with `home:` prefix).
- Verified with `nb remote` and `nb status`.

## Issue
- `nb remote set` printed the confirmation banner, but no remote was actually configured.
- `nb remote` continued to report "No remote configured," and `.nb_docs_repo/home/.git/config` had no `origin`.

## Root cause (suspected)
- `nb remote set` is interactive and prompts with `read -p "Proceed?"`.
- When run without a TTY, the prompt fails; with `set -e`, the script exits before it reaches `git remote add origin`, so no remote is written.
- There is another prompt if the target branch does not exist on the remote (choose merge vs orphan), which also fails in non-interactive runs.

## Solution (manual workaround)
Manually add the Git remote and rename the branch:
```bash
git -C .nb_docs_repo/home remote add origin https://github.com/boweiliu/underchex.git
git -C .nb_docs_repo/home branch -m docs/nb
```

After this, `nb remote` reports `https://github.com/boweiliu/underchex.git (docs/nb)`.

## Non-interactive attempts (unsuccessful)
- `printf "2\n\n" | nb remote set ... --skip-confirmation` printed update banner, then "Exiting..."; remote unchanged.
- `printf "2\n\n" | nb remote set ... --skip-preamble` skipped the first prompt but timed out on branch-selection prompts; remote unchanged.

