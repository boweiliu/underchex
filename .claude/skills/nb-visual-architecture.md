---
name: nb-visual-architecture
description: Use when modifying or debugging nb-visual graph visualization tool
---

# NB Visual Architecture Reference

## About This Tool

nb-visual is a graph visualization tool that parses nb docs and generates an interactive D3.js force-directed graph. It consists of a Python build script (`build_nb_graph.py`) that generates a self-contained HTML viewer with embedded graph data.

## When to Use This Skill

Use this skill when:
- Task explicitly mentions modifying or debugging `nb-visual`
- About to read or modify `nb-visual/build_nb_graph.py`
- Working on graph visualization features
- Debugging hover, proximity, or tag filtering behavior
- Adding new data fields or visualization features

## Quick Reference

### Build Pipeline
```bash
# Build/rebuild the visualization
uv run nb-visual/build_nb_graph.py

# View the result
open nb-visual/index.html
```

### File Inventory
- `build_nb_graph.py` - Python script that parses nb docs and generates output files
- `index.html` - Generated single-page app with embedded D3 visualization (self-contained)
- `graph.json` - Generated graph data (nodes, edges, metadata)
- `tags.json` - Generated tag frequency data for sidebar

### Generator Pipeline (`build_nb_graph.py`)
1. Discover notebook path (NB_DIR env, `nb notebooks --paths`, or fallback)
2. Parse all `.md` files (extract title, tags, wiki-links)
3. Build graph structure (nodes and edges)
4. Fetch nb IDs (calls `nb list` for numeric IDs)
5. Generate outputs (writes `graph.json`, `tags.json`, `index.html`)

### Key Functions
- `discover_notebook_path()` - Finds the nb docs directory
- `build_graph()` - Main graph construction logic
- `extract_tags()` / `extract_title()` - Parsing helpers
- `fetch_nb_ids()` - Gets `[42]` style IDs from nb CLI
- `write_index_html()` - Generates the self-contained HTML viewer

### Viewer Features (`index.html`)
- **Force-directed layout** - D3's simulation forces (link, charge, collide, center)
- **Zoom/pan** - D3 zoom behavior
- **Proximity hover** - Labels appear for nodes near cursor
- **Tag filtering** - Sidebar lists tags; hovering highlights matching nodes
- **Tooltip** - Shows full title and path on node hover

### CSS Classes
- `.node` - Node group container
- `.node.hover` - Mouse directly over node
- `.node.proximity` - Node within proximity radius of cursor
- `.node.tag-highlight` - Node matches selected tag
- `.edge` - Link lines between nodes

## Common Modifications Guide

| Task | Where to Look |
|------|---------------|
| Change node appearance | CSS in `write_index_html()`, look for `.node .dot` |
| Modify hover behavior | JS event handlers on `node` selection (`mouseenter`/`mouseleave`) |
| Add new data to nodes | `build_graph()` - modify the node dict structure |
| Change layout physics | D3 force configuration in `renderGraph()` |
| Add sidebar features | HTML structure + JS in `write_index_html()` |

## Graph Data Structure
```json
{
  "nodes": [{"id": 0, "title": "...", "path": "...", "tags": [...], "nb_id": 42}],
  "edges": [{"source": 0, "target": 1}],
  "metadata": {"notebook_path": "...", "node_count": N, "edge_count": M}
}
```

## D3 Patterns Used
- `d3.forceSimulation` - Physics-based node positioning
- `d3.zoom` - Pan and zoom with transform tracking
- `d3.pointer` - Get cursor position for proximity calculations
- Data join pattern (`selectAll().data().enter().append()`)

## Full Context

For complete architectural details, see: [NB Visual Architecture Reference](/docs/nb_visual_architecture_reference)

**Related documents:**
- Worklog - Agent 15.3.2 - NB Visual Graph (nb 67) - Original implementation worklog
- Worklog Details - NB Visual - Graph JSON Format (nb 76) - Schema details
- Worklog Details - NB Visual - Tags JSON Format (nb 82) - Schema details
- NB - Guide - Tagging (nb 78) - Tag conventions
- NB Visual - Build Pipeline Quick Reference (nb 107)
