# README - written by LLMs

# Codex Setup Instructions

```bash
codex --ask-for-approval never
# or
codex --full-auto
```

## Changes made to ~/.codex/config.toml

Changed:
- `approval_mode = "full-auto"` → `approval_policy = "never"` (correct key name per docs)
- `sandbox = false` → `sandbox_mode = "danger-full-access"` (correct key name per docs)

Commented out (may be from older codex version, not in current docs):
- `[sandbox_workspace_write]` section with `network_access = true`
- `[tool_approval]` section with mode/allow patterns
