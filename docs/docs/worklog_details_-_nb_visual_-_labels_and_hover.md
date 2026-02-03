# Worklog Details - NB Visual - Labels and Hover

Tags: #worklog-details #nb-visual #ux #labels #hover #controls

## Motivation
- You wanted less label clutter, larger hover areas, and a label visibility toggle (hide/hover/show).

## What I changed
- Dimmed label opacity by default and boosted it on hover.
- Added an invisible hitbox circle per node to enlarge the hover area.
- Added UI controls and CSS modes for label visibility.

## How the code works
- CSS sets low opacity and increases it under `.node.hover`. (`nb-visual/build_nb_graph.py:195`)
- The node group listens for hover events and toggles a class to drive label visibility. (`nb-visual/build_nb_graph.py:372`)
- The hitbox circle captures pointer events without rendering. (`nb-visual/build_nb_graph.py:388`)
- The label-mode select toggles body classes and CSS adjusts opacity. (`nb-visual/build_nb_graph.py:245`, `nb-visual/build_nb_graph.py:434`)

## References
- Code: `nb-visual/build_nb_graph.py:195`, `nb-visual/build_nb_graph.py:372`, `nb-visual/build_nb_graph.py:388`, `nb-visual/build_nb_graph.py:245`, `nb-visual/build_nb_graph.py:434`
- Snippet: `body.classList.add(`labels-${labelMode.value}`);`
- Commits: c9febe3 (fade labels), 8d56d75 (bigger hitbox), 32098f3 (label toggle)

[Signed-by: agent #15.3.2 opus via codex 20260126T22:18:50]
[Edited-by: agent #15.3.2 opus via codex 20260126T22:19:37]
