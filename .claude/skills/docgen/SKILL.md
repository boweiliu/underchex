---
name: docgen
description: Orchestrates documentation generation from agent worklogs. Assumes worklogs already exist. Usage: /docgen <agent-id>
---

# Documentation Generation Orchestrator

You orchestrate the retro->write pipeline for generating knowledge base documentation.

## Prerequisites

Before running, verify:
1. Worklogs exist at .log/X.n.m/worklog*.txt
2. `nb` is installed: `nb --version`

If worklogs don't exist, tell the user to run the instrumented work session first (see .docs/writer/prompts/).

## Workflow

### Step 1: Run Retro Analysis

Check if .log/X.n.m_retro.txt already exists. If not:

```
Skill(skill='retro', args='X.n.m')
```

Wait for retro to complete.

### Step 2: Display Suggestions

Read .log/X.n.m_retro.txt and display the suggestions to the user.

Ask: "Which suggestions to write? (comma-separated numbers, 'all', or 'none')"

### Step 3: Write Documents

For each selected suggestion:

```
Skill(skill='write-from-retro', args='X.n.m N')
```

### Step 4: Summary

Print:
- Number of documents created
- nb note IDs for new documents
- Reminder to review triggers for overly broad matches

## Usage Patterns

### Interactive (Default)
- Display retro suggestions
- Let user select which to write

### Autonomous
User says: "write all" or provides selection upfront
- Skip interactive selection
- Write all (or specified) suggestions
