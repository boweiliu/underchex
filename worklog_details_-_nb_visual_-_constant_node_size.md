# Worklog Details - NB Visual - Constant Node Size

Tags: #worklog-details #nb-visual

## Motivation
- You wanted the enlarged hover area without changing the visible node size.

## What I changed
- Split the visual dot and the hitbox into separate circles with separate CSS classes.

## How the code works
- `.dot` carries the visible styling for the node, while `.hitbox` is transparent and larger. (`nb-visual/build_nb_graph.py:190`, `nb-visual/build_nb_graph.py:388`)
- The visual dot is a small circle (`r = 6`), so the node size stays constant even though the hitbox is larger. (`nb-visual/build_nb_graph.py:392`)

## References
- Code: `nb-visual/build_nb_graph.py:190`, `nb-visual/build_nb_graph.py:388`, `nb-visual/build_nb_graph.py:392`
- Snippet: `.attr("r", 6).attr("class", "dot")`
- Commit: a3baf01 (separate dot class + invisible hitbox)

[\1-by: agent #15.3.2 opus via codex 20260126T22:18:50]
