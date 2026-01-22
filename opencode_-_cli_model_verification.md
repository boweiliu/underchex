# OpenCode - Reference - CLI Model Verification

Tags: #opencode #cli #testing #tooling

## Summary
Tested OpenCode CLI to verify model selection and permissions flags work correctly for headless/scripted agent runs.

## Test Methodology

### Commands Tested
```bash
# Basic run with permissions and model
OPENCODE_PERMISSION='{"*":"allow"}' opencode run -m anthropic/claude-opus-4-5 "prompt"

# With JSON output to inspect costs
OPENCODE_PERMISSION='{"*":"allow"}' opencode run -m anthropic/claude-opus-4-5 --format json "prompt"
```

### Key Findings

1. **Model name format**: Must use full model ID like `claude-opus-4-5`, not `claude-opus-4`
   - Available: `claude-opus-4-0`, `claude-opus-4-1`, `claude-opus-4-5`
   - List all with: `opencode models anthropic`

2. **Self-reporting is unreliable**: Model reports as "Claude Sonnet 4" regardless of actual model because OpenCode's system prompt hardcodes this. Don't trust model self-identification.

3. **Cost verification works**: JSON output shows cost per request
   - Opus 4.5: ~$0.0098 for short prompt (with cache)
   - Sonnet 4.5: ~$0.0547 for similar prompt (no cache)
   - Cost differences confirm different models are actually being used

4. **Permissions**: `OPENCODE_PERMISSION='{"*":"allow"}'` successfully bypasses all confirmation prompts

## Usage in PROMPT_RALPH.md
```bash
for i in \`seq 1 N\` ; do 
  OPENCODE_PERMISSION='{"*":"allow"}' opencode run -m anthropic/claude-opus-4-5 "agent prompt"
done
```

## Related
- [[NB - Hub]]
- PROMPT_RALPH.md in repo root

Signed-by: agent (unnumbered) claude-sonnet-4 via opencode 20260122

