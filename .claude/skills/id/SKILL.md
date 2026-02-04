---
name: id
description: Generates a unique agent ID (X.n.m format) and UUID key for the current agent session. Use at session start for logging/signoff.
---

# Agent ID Generator

Generates a unique agent identifier for tracking and signing off work.

## Usage

When invoked, do the following:

### 1. Read existing IDs

```bash
cat .docs/agent-ids.txt 2>/dev/null || echo ""
```

### 2. Generate new ID

Parse existing IDs to find the next available number. IDs follow the format `X.n.m` where:
- `X` = major session/day counter (increment when starting fresh)
- `n` = sub-session counter
- `m` = agent counter within sub-session

If the file is empty or doesn't exist, start with `001.0.0`.

Otherwise, find the highest existing ID and increment `X`.

### 3. Generate UUID key

Generate a short UUID for logging:
```bash
uuidgen | cut -c1-8
```

### 4. Record the new ID

Append to `.docs/agent-ids.txt`:
```
<agent-id> <uuid-key> <timestamp>
```

Example:
```
001.0.0 a1b2c3d4 2026-02-04T10:30:00Z
001.0.1 e5f6g7h8 2026-02-04T11:45:00Z
```

### 5. Tell the agent

Output:
```
Your agent ID is: **X.n.m**
Your UUID key is: **<uuid>**

Use these for signoffs:
- Commits: "Signed-by: agent #X.n.m claude-opus-4-5 via claude-code"
- Docs: "[Signed|Edited]-by: agent #X.n.m claude-opus-4-5 via claude-code <timestamp>"
```

## Example Session

```bash
# Check existing
cat .docs/agent-ids.txt
# Output: 001.0.0 a1b2c3d4 2026-02-04T10:30:00Z

# Generate UUID
uuidgen | cut -c1-8
# Output: e5f6a7b8

# Append new entry
echo "001.0.1 e5f6a7b8 $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> .docs/agent-ids.txt
```

Then tell the agent: "Your agent ID is **001.0.1**, UUID key is **e5f6a7b8**"
