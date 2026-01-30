# Codex - Reference - Config and Debugging

Quick links: [Codex - Hub](/docs/codex_hub)

## Key setup commands
- `codex --ask-for-approval never`
- `codex --full-auto`

## Config fixes applied (in `~/.codex/config.toml`)
- `approval_mode` -> `approval_policy`
- `sandbox` -> `sandbox_mode`
- Old sections were commented out because they are no longer in current docs:
  - `[sandbox_workspace_write]`
  - `[tool_approval]`

## Why approvals kept appearing
The config used invalid key names, so Codex fell back to defaults and prompted for approval.

## Verified sources
- https://developers.openai.com/codex/config-reference/
- https://developers.openai.com/codex/cli/reference/
- https://developers.openai.com/codex/config-basic/

## Test results (2026-01-20)
Tested with codex-cli 0.87.0.

- Simple command:
  - `codex exec "run ls in the current directory"`
  - Output confirmed:
    - `approval: never`
    - `sandbox: danger-full-access`
- Network command (original failure case):
  - `codex exec "run: nb remote set https://github.com/example/test.git"`
  - Ran without prompting. Exit code 1 was due to an invalid URL, not permissions.

## If it still prompts
Possible causes:
- CLI flags or env vars override `config.toml` (v0.20+)
- Org-level `requirements.toml` enforcing restrictions
- Need to restart Codex after config changes

## Current config snippet (for reference)
```toml
approval_policy = "never"
sandbox_mode = "danger-full-access"

# Original settings (commented out - may be from older codex version)
# [sandbox_workspace_write]
# network_access = true

# [tool_approval]
# mode = "auto"
# allow = [
#   "filesystem:*",
#   "shell:*",
#   "network:*",
#   "git:*"
# ]

[projects."/Users/bowei/code/underchex"]
trust_level = "trusted"
```

Signed-off-by: gpt-5 via codex
