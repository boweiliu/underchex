# NB Visual Architecture Reference

A quick-reference guide for agents working on the nb-visual graph visualization tool.

## File Inventory

| File | Purpose |
|------|---------|
| `build_nb_graph.py` | Python script that parses nb docs and generates output files |
| `index.html` | Generated single-page app with embedded D3 visualization |
| `graph.json` | Generated graph data (nodes, edges, metadata) |
| `tags.json` | Generated tag frequency data for sidebar |
| `README.md` | Basic usage instructions |

## Build & Workflow

```bash
# Build/rebuild the visualization
uv run nb-visual/build_nb_graph.py

# View the result
open nb-visual/index.html
```

**When to rebuild:** After any change to `build_nb_graph.py`, or when nb docs change and you want the graph to reflect updates.

## Architecture Overview

### Generator (`build_nb_graph.py`)

The Python script follows this pipeline:

1. **Discover notebook path** - Checks `NB_DIR` env, `nb notebooks --paths`, or falls back to `.nb_docs_repo/home/`
2. **Parse all `.md` files** - Extracts title (first H1), tags (`#tag` on `Tags:` lines), and `[wiki-links](/docs/wiki_links)`
3. **Build graph structure** - Creates nodes (docs) and edges (links between docs)
4. **Fetch nb IDs** - Calls `nb list` to get numeric IDs for each doc
5. **Generate outputs** - Writes `graph.json`, `tags.json`, and `index.html`

Key functions to know:
- `discover_notebook_path()` - Finds the nb docs directory
- `build_graph()` - Main graph construction logic
- `extract_tags()` / `extract_title()` - Parsing helpers
- `fetch_nb_ids()` - Gets `[42]` style IDs from nb CLI
- `write_index_html()` - Generates the self-contained HTML viewer

### Viewer (`index.html`)

A self-contained D3.js visualization with:

- **Force-directed layout** using D3's simulation forces (link, charge, collide, center)
- **Zoom/pan** via D3 zoom behavior
- **Proximity hover** - Labels appear for nodes near cursor
- **Tag filtering** - Sidebar lists tags; hovering highlights matching nodes
- **Tooltip** - Shows full title and path on node hover

CSS class conventions:
- `.node` - Node group container
- `.node.hover` - Mouse directly over node
- `.node.proximity` - Node within proximity radius of cursor
- `.node.tag-highlight` - Node matches selected tag
- `.edge` - Link lines between nodes

## Common Modifications

| Task | Where to look |
|------|---------------|
| Change node appearance | CSS in `write_index_html()`, look for `.node .dot` |
| Modify hover behavior | JS event handlers on `node` selection (`mouseenter`/`mouseleave`) |
| Add new data to nodes | `build_graph()` - modify the node dict structure |
| Change layout physics | D3 force configuration in `renderGraph()` |
| Add sidebar features | HTML structure + JS in `write_index_html()` |

## Key Concepts

**D3 patterns used:**
- `d3.forceSimulation` - Physics-based node positioning
- `d3.zoom` - Pan and zoom with transform tracking
- `d3.pointer` - Get cursor position for proximity calculations
- Data join pattern (`selectAll().data().enter().append()`)

**Graph data structure:**
```json
{
  "nodes": [{"id": 0, "title": "...", "path": "...", "tags": [...], "nb_id": 42}],
  "edges": [{"source": 0, "target": 1}],
  "metadata": {"notebook_path": "...", "node_count": N, "edge_count": M}
}
```

## Related Documents

- [Worklog - Agent 15.3.2 - NB Visual Graph](/docs/worklog_agent_15_3_2_nb_visual_graph) - Original implementation worklog with full history
- [Worklog Details - NB Visual - Graph JSON Format](/docs/worklog_details_nb_visual_graph_json_format) - Schema details for `graph.json`
- [Worklog Details - NB Visual - Tags JSON Format](/docs/worklog_details_nb_visual_tags_json_format) - Schema details for `tags.json`
- [NB - Guide - Tagging](/docs/nb_guide_tagging) - Tag conventions used in nb docs

---

## Triggers (when to surface this document)

> **Note:** Overly broad triggers are noisy and unhelpful. The following are curated from retrospective analysis (agent 48.1) with refinements applied.

**Recommended triggers:**
- Task explicitly mentions modifying or debugging `nb-visual`
- Agent reads `nb-visual/build_nb_graph.py` for the first time in a session
- `nb search` for compound terms: "nb-visual", "nb graph", "graph visualization"

**Avoid triggering on:**
- Generic searches for "graph", "d3", "node", "hover" (too broad, will fire constantly)
- Any `rg` or `grep` containing "nb-visual" (often just incidental matches)
- Simply listing or viewing `nb-visual/` directory contents

---

## Backlinks
- [NB Visual - Build Pipeline Quick Reference](/docs/nb_visual_build_pipeline_quick_reference)

Tags: #nb-visual #visualization #d3 #graph #reference #architecture

[Signed-by: agent #48.2 claude-opus-4-5 via amp 20260129T15:59:00]
[Edited-by: agent #48.2 claude-opus-4-5 via amp 20260129T16:12:00]
[Edited-by: agent #15.3.2 claude-sonnet-4 via amp 20260129T17:59:08]
