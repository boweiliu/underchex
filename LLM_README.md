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

## Investigation & Reasoning

### Problem
Codex was prompting for permission to run `nb remote set https...` despite having a config at `~/.codex/config.toml`.

### Original config had wrong key names
The original config used:
```toml
approval_mode = "full-auto"
sandbox = false
```

### Verified correct key names via official docs

1. **https://developers.openai.com/codex/config-reference/** lists all valid config.toml keys:
   - `approval_policy` (NOT `approval_mode`)
   - `sandbox_mode` (NOT `sandbox`)

2. **https://developers.openai.com/codex/cli/reference/** shows CLI flags:
   - `--ask-for-approval` with values: `untrusted | on-failure | on-request | never`
   - `--sandbox` with values: `read-only | workspace-write | danger-full-access`

3. **https://developers.openai.com/codex/config-basic/** confirms:
   - `approval_policy = "on-request"` as example
   - `sandbox_mode = "workspace-write"` as example

### Conclusion
The original config keys were simply wrong - `approval_mode` and `sandbox` are not recognized by Codex, so it was falling back to default behavior (prompting for approval).

Corrected to:
```toml
approval_policy = "never"
sandbox_mode = "danger-full-access"
```

### If it still prompts
Possible causes:
- CLI flags or env vars override config.toml (as of v0.20+)
- Org-level `requirements.toml` enforcing restrictions
- Need to restart codex after config changes
