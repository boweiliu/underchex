# Worklog Details - NB Visual - Invisible Hitbox

Tags: #worklog-details #nb-visual #hover #hitbox #ux

## Motivation
- You asked for a larger hover hitbox that stays invisible and for hovering label text to work (not just the node dot).

## What I changed
- Made label text accept pointer events and added CSS to ensure the hitbox has no stroke or fill.
- Moved hover handlers to the node group so hovering any child (including text) triggers the highlight.

## How the code works
- The `.hitbox` class explicitly has `fill: transparent` and `stroke: none` so it does not render. (`nb-visual/build_nb_graph.py:202`)
- The node group handles `mouseenter`/`mouseleave`, so hovering text or the hitbox triggers the same behavior. (`nb-visual/build_nb_graph.py:372`)
- The dot itself disables pointer events so it does not steal hover from the hitbox/text. (`nb-visual/build_nb_graph.py:392`)

## References
- Code: `nb-visual/build_nb_graph.py:202`, `nb-visual/build_nb_graph.py:372`, `nb-visual/build_nb_graph.py:392`
- Snippet: `.attr("class", "hitbox");`
- Commit: a3baf01 (invisible hitbox + hover behavior adjustment)

[Signed-by: agent #15.3.2 opus via codex 20260126T22:18:50]
[Edited-by: agent #15.3.2 opus via codex 20260126T22:19:37]
