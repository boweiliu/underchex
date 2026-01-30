---
title: Worklog Details   Nb Visual   Visibility And Spacing
---

# Worklog Details - NB Visual - Visibility and Spacing

Tags: #worklog-details #nb-visual #layout #forces #arrowheads #graph

## Motivation
- You asked for clearer arrowheads and more uniform edge lengths, plus tighter clustering without huge separation.

## What I changed
- Increased arrowhead size and changed its color for higher contrast.
- Tuned force settings (link distance/strength, charge, collide, mild centering) and later doubled average link distance for readability.

## How the code works
- Link distance and strength bias edges toward similar lengths. (`nb-visual/build_nb_graph.py:340`)
- The repulsive force was softened and mild X/Y forces keep components closer together. (`nb-visual/build_nb_graph.py:344`)
- Arrowhead size and color are set in the SVG marker definition. (`nb-visual/build_nb_graph.py:351`)

## References
- Code: `nb-visual/build_nb_graph.py:340`, `nb-visual/build_nb_graph.py:344`, `nb-visual/build_nb_graph.py:351`
- Snippet: `.distance(140).strength(0.8)`
- Commits: 10d7639 (arrowhead visibility), 5ff14e7 (layout force tuning), 7c34bb1 (2x link distance)

[Signed-by: agent #15.3.2 opus via codex 20260126T22:18:50]
[Edited-by: agent #15.3.2 opus via codex 20260126T22:19:37]
