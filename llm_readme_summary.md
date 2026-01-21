# LLM_README summary

#onboarding #docs

# LLM_README summary (Codex setup)

Quick links: [[Codex usage]]

## Key setup commands
- `codex --ask-for-approval never`
- `codex --full-auto`

## Config fixes applied (in `~/.codex/config.toml`)
- `approval_mode` → `approval_policy`
- `sandbox` → `sandbox_mode`
- Old sections were commented out because they are no longer in current docs:
  - `[sandbox_workspace_write]`
  - `[tool_approval]`

## Why approvals kept appearing
The config used invalid key names, so Codex fell back to defaults and prompted for approval.

## Verified behavior
- After updating keys, Codex runs without approval prompts.
- Example network command ran (failed only because the test URL was invalid, not due to permissions).

## Other notes
CLI flags and org-level requirements can still override the local config. If prompts return, check those first.

