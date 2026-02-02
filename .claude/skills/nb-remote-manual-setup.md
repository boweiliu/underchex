---
name: nb-remote-manual-setup
description: Use when configuring nb remote fails or when setting up nb in non-interactive environments
---

# NB Remote Manual Setup

## Lesson from Retro

`nb remote set` can fail silently in non-interactive environments due to TTY prompts. The command prints confirmation banners but doesn't actually configure the remote when run without user interaction.

## When to Use This Skill

Use this skill when:
- Running `nb remote set` and `nb remote` still reports "No remote configured"
- Setting up nb remotes in scripts or CI/CD environments
- Getting "Exiting..." messages from `nb remote set` despite using `--skip-confirmation`
- Working with nb in non-interactive shells or automation contexts

## Key Guidance

**The Problem:**
- `nb remote set` uses interactive prompts (`read -p "Proceed?"`)
- Without a TTY, these prompts fail silently
- With `set -e`, the script exits before reaching `git remote add origin`
- Additional prompts appear if the target branch doesn't exist on the remote

**The Solution:**
Use manual Git commands instead of `nb remote set`:

```bash
# Add the remote directly
git -C .nb_docs_repo/home remote add origin <REMOTE_URL>

# Rename the branch to match your target
git -C .nb_docs_repo/home branch -m <BRANCH_NAME>
```

After this, verify with `nb remote` - it should report the configured remote and branch.

**What Doesn't Work:**
- `printf "2\n\n" | nb remote set ... --skip-confirmation` - prints banner then exits
- `printf "2\n\n" | nb remote set ... --skip-preamble` - skips first prompt but times out on branch selection

## Full Context

For complete details, see: [NB - Debug - Remote Set](/docs/nb_-_debug_-_remote_set)

**Related commands:**
- `nb remote` - Check current remote configuration
- `nb status` - Verify nb repository status
- `git -C .nb_docs_repo/home config -l` - Inspect Git config directly
