---
name: nb-visual-build-pipeline
description: Use when rebuilding nb-visual graph, updating visualization outputs, or modifying build_nb_graph.py
---

# NB Visual - Build Pipeline Quick Reference

## Lesson from Retro

The nb-visual system requires explicit rebuilding after changes to nb docs or the build script itself. Agents need quick access to the correct build command and output locations to maintain the visualization system.

## When to Use This Skill

Use this skill when:
- Task mentions: rebuild, regenerate, update visualization, or nb-visual build output
- You're working with `nb-visual/build_nb_graph.py` or `nb-visual/README.md`
- Agent needs to know build/test/output commands for nb-visual
- Changes have been made to nb docs that need to be reflected in the graph

## Build Command

```bash
uv run nb-visual/build_nb_graph.py
```

**Important:** Run this command from the repository root.

## Output Files

The build produces three files:
- `nb-visual/index.html` - The visualization interface
- `nb-visual/graph.json` - The graph data structure
- `nb-visual/tags.json` - Tag metadata

## When to Rebuild

Rebuild is required after:
- Any change to nb docs (to refresh `graph.json`)
- Editing `nb-visual/build_nb_graph.py` (logic changes)

## Troubleshooting

If the build fails:
- Confirm `uv` is available in your environment
- Verify the script path is correct
- Check `nb-visual/README.md` for the authoritative, always-current command

## Full Context

For complete details, see: [NB Visual - Build Pipeline Quick Reference](/docs/nb_visual_-_build_pipeline_quick_reference)

**Related documents:**
- [Worklog Details - NB Visual - uv Run Docs](/docs/worklog_details_-_nb_visual_-_uv_run_docs) (nb 70)
- [Retro - Agent 52.1 - Memoizing Agent Knowledge Discovery](/docs/retro_-_agent_52.1_-_memoizing_agent_knowledge_discovery) (nb 103)
- [NB Visual Architecture Reference](/docs/nb_visual_architecture_reference) (nb 106)
