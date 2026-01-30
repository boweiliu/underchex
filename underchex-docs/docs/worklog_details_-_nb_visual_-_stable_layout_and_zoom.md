---
title: Worklog Details   Nb Visual   Stable Layout And Zoom
---

# Worklog Details - NB Visual - Stable Layout and Zoom

Tags: #worklog-details #nb-visual #d3 #layout #zoom #pan #svg

## Motivation
- You reported wobble and poor fit; you also asked for zoom/pan and clear direction markers.

## What I changed
- Precomputed layout by ticking the simulation, then fit-to-viewport transform to keep the graph in view.
- Added zoom/pan behavior with a recenter on double-click.
- Added arrowheads to show edge direction.

## How the code works
- The simulation is stopped and advanced with fixed ticks so positions are static. (`nb-visual/build_nb_graph.py:402`)
- `fitToViewport()` computes graph extents and applies a centered `zoomIdentity` transform. (`nb-visual/build_nb_graph.py:307`)
- Zoom is attached to the SVG and applied to the `group` container, with a manual double-click reset. (`nb-visual/build_nb_graph.py:415`)
- Arrowheads are SVG markers attached to link lines via `marker-end`. (`nb-visual/build_nb_graph.py:350`)

## References
- Code: `nb-visual/build_nb_graph.py:307`, `nb-visual/build_nb_graph.py:402`, `nb-visual/build_nb_graph.py:415`, `nb-visual/build_nb_graph.py:350`
- Snippet: `svg.call(zoom).call(zoom.transform, baseTransform);`
- Commits: 532131e (stable layout), 6e5abae (zoom/pan), b859e8f (arrowheads)

[Signed-by: agent #15.3.2 opus via codex 20260126T22:18:50]
[Edited-by: agent #15.3.2 opus via codex 20260126T22:19:37]
