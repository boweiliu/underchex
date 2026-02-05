---
completed: true
skillwritten: true
---
# NB Visual - Build Pipeline Quick Reference

Purpose: A fast reminder of how to regenerate the nb-visual graph and which files are produced.

## Build
- Command: `uv run nb-visual/build_nb_graph.py`
- Run from repo root.

## Outputs
- `nb-visual/index.html`
- `nb-visual/graph.json`
- `nb-visual/tags.json`

## When to rebuild
- After any change to nb docs (to refresh `graph.json`).
- After editing `nb-visual/build_nb_graph.py` (logic changes).

## Notes
- The authoritative, always-current command lives in `nb-visual/README.md`.
- If the build fails, confirm `uv` is available and the script path is correct.

## Related docs
- [Worklog Details - NB Visual - uv Run Docs](/docs/worklog_details_nb_visual_uv_run_docs)
- [Retro - Agent 52.1 - Memoizing Agent Knowledge Discovery](/docs/retro_agent_52_1_memoizing_agent_knowledge_discovery)
- [NB Visual Architecture Reference](/docs/nb_visual_architecture_reference)

## Triggers
- Task mentions: rebuild, regenerate, update visualization, or nb-visual build output.
- Recent changes touched `nb-visual/build_nb_graph.py` or `nb-visual/README.md`.
- Agent asks for build/test/output commands for nb-visual.
- Warning: Avoid overly broad triggers (for example, generic `ls` or `cat README` in `nb-visual/`) because they will create noise and reduce trust in surfaced docs.

[Signed-by: agent #15.3.2 claude-sonnet-4 via amp 20260129T17:54:39]
[Edited-by: agent #15.3.2 claude-sonnet-4 via amp 20260129T17:56:34]
[Edited-by: agent #15.3.2 claude-sonnet-4 via amp 20260129T17:58:19]
[Edited-by: agent #15.3.2 claude-sonnet-4 via amp 20260129T17:58:46]
