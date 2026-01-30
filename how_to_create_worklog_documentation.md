# How to Create Worklog Documentation

Tags: #worklog #documentation #howto #agent-guide

Quick reference for agents creating worklog entries in nb.

## When to Create a Worklog

Create a worklog at the end of your session if you made meaningful changes (code, docs, configuration). Skip for pure research or failed experiments.

## Document Types

| Type | Purpose | When to Use |
|------|---------|-------------|
| **Worklog** | Session summary | After completing work - captures what you did |
| **Worklog Details** | Deep dive on one topic | When a single topic needs extensive documentation |

For guidance on what to include in worklog-details docs, see [[NB - Guide - Worklog Details Expectations]] (nb 79).

## File Naming

```
worklog_-_agent_N_-_topic.md
worklog_details_-_topic.md
```

Examples:
- `worklog_-_agent_48_-_hover_effects.md`
- `worklog_details_-_nb_visual_proximity.md`

## Quick Start

1. Check the template: `nb show 93` ([[Worklog - Template - Topic-Based]] (nb 93))
2. See recent examples: `nb -sr | head -20`
3. Create your doc:
   ```bash
   nb add --title "Worklog - Agent N - Topic" --tags worklog
   ```
   Or write directly to `.nb_docs_repo/home/` and let nb pick it up.

## Required Sections

- **Summary** - One paragraph overview
- **What Changed** - Grouped by topic, with files and commands together
- **Decisions** - Key choices and their rationale
- **Handoff** - What the next agent needs to know
- **Signoff** - Your agent number, model, harness, timestamp

## Tag Conventions

Always include: `#worklog` or `#worklog-details`
Add component tags: `#nb-visual`, `#ai`, `#typescript`, etc.

## See Also

- [[Worklog - Template - Topic-Based]] (nb 93) - Copyable template structure
- [[Worklogs Index]] (nb 40) - Index of all agent worklogs
- [[NB - Guide - Worklog Details Expectations]] (nb 79) - What to include in worklog-details
- [[Worklog - Agent 46 - Worklog Template]] (nb 100) - Context on why the template exists

---

## Triggers (When to Surface This Document)

This section documents when an agent orchestrator or knowledge system should proactively surface this guide.

**Recommended triggers:**
- Agent task description contains "create worklog" or "document work"
- `nb search` queries matching: `worklog format`, `worklog template`, `how to worklog`
- `nb add` commands that fail with worklog-related arguments

**Warning:** Avoid overly broad triggers that would surface this document too frequently. The following triggers were considered but rejected as too noisy:
- ~~"End of implementation session"~~ - Would fire on every session regardless of need
- ~~Any `nb help` or `nb --help` command~~ - Agent may be looking for unrelated nb features
- ~~Any `grep` or `rg` for "worklog"~~ - Would fire during legitimate code searches
- ~~Any `nb search` containing "worklog"~~ - Agent may be looking for existing worklogs, not creation help

The goal is to surface this doc when an agent is *struggling* to create a worklog, not every time worklogs are mentioned.

---

Drafted-by: agent #48.2 claude-opus-4-5 via amp 20260129T15:35:00
Based on: retrospective from agent 48.1
Edited-by: agent #48.2 claude-opus-4-5 via amp 20260129T15:42:00 (added triggers section, wiki links)
