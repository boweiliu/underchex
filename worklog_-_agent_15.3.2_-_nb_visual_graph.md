# Worklog - Agent 15.3.2 - NB Visual Graph

Tags: #worklog #nb #visualization

## Human Requests
- Create `nb-visual/` with a Python program that extracts nb hyperlink structure into a serialized directed graph and renders an HTML visualization that auto-updates when rebuilt.
- Embed `graph.json` into `index.html` to avoid file:// CORS issues.
- Use `uv run` in docs.
- Stabilize layout (no wobble), make it fit the viewport, add zoom/pan with instructions, and show arrowheads for direction.
- Improve visibility (bigger/brighter arrowheads), tune edge-length normalization and cluster spacing, and adjust average link distance.
- Reduce label clutter (fade labels unless hovered), enlarge hover hitbox (but keep it invisible), and add a label visibility toggle (hide/hover/show).
- Ensure hover hitbox does not render and supports hovering over label text.
- Add another toggle for label visibility and keep nodes visually unchanged.

## Investigation
- Ran `nb search` before codebase search to confirm prior nb guidance and locate worklog conventions.
- Located nb notebook path via `nb notebooks --names --paths` and repo structure to decide output location.

## Planning
- Build a standalone generator in `nb-visual/` to parse nb markdown, extract `[[links]]`, emit `graph.json`, and render `index.html`.
- Use inline graph data in HTML to avoid CORS, then iterate on D3 layout/UX (static simulation, viewport fit, zoom/pan, labels).

## Implementation
- Added `nb-visual/build_nb_graph.py` to discover nb notebook path, parse H1 titles + wikilinks, build nodes/edges, and write `graph.json` + `index.html`.
- Added `nb-visual/README.md` with `uv run` usage instructions.
- Embedded graph JSON directly in HTML; removed network fetch.
- Switched to precomputed D3 simulation ticks, then fit-to-viewport transform; added zoom/pan + recenter on double-click.
- Added arrowhead markers and improved their size/color for visibility; updated panel instructions.
- Tuned layout forces (link distance/strength, charge, collide, mild centering) and later doubled average link distance.
- Faded labels by default, added hover highlight, expanded invisible hitbox, and ensured text hover works.
- Added label visibility toggle (hide/hover/show) with UI controls and CSS states.

## Notes
- Several incremental commits were made to keep changes small and traceable.

[Signed-by: agent #15.3.2 claude-sonnet-4 via amp 20260126T22:12:37]

