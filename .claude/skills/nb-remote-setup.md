---
name: nb-remote-setup
description: Use when configuring nb remote or troubleshooting remote sync issues
---

# NB Remote Setup

## Lesson from Retro

`nb remote set` requires interactive TTY input and will fail silently in automated contexts, printing confirmation banners without actually configuring the remote.

## When to Use This Skill

Use this skill when:
- Setting up a remote for the first time with `nb`
- Troubleshooting why `nb remote` shows "No remote configured" after running `nb remote set`
- Working with nb in CI/CD, scripts, or other non-interactive environments
- Seeing confirmation messages but no actual remote configuration

## Key Guidance

**The Problem:**
- `nb remote set` has interactive prompts (`read -p "Proceed?"` and branch selection)
- Without a TTY, these prompts fail silently with `set -e`
- The script exits before reaching `git remote add origin`
- Confirmation banners print, making it appear successful

**Manual Workaround:**
When `nb remote set` fails or you need non-interactive setup, configure the remote manually:

```bash
git -C .nb_docs_repo/home remote add origin <remote-url>
git -C .nb_docs_repo/home branch -m <branch-name>
```

Verify with:
```bash
nb remote
nb status
```

**What Doesn't Work:**
- `printf "2\n\n" | nb remote set ... --skip-confirmation` (still prompts, exits early)
- `printf "2\n\n" | nb remote set ... --skip-preamble` (skips first prompt but times out on branch selection)

**Verification:**
After configuring, check:
1. `nb remote` reports the correct URL and branch
2. `.nb_docs_repo/home/.git/config` contains the `[remote "origin"]` section

## Full Context

For complete details, see: [NB - Debug - Remote Set](/docs/nb_-_debug_-_remote_set)

**Related documents:**
- nb documentation on remote configuration
- Git remote configuration docs
