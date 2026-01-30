# Worklog Details - NB Visual - Tagging Rationale

Tags: #worklog-details #nb-visual #tags #taxonomy

## Motivation
- You asked for the reasoning behind tag selection and which docs received tags.

## Tagging Criteria
- **Concept density**: Tag when a doc centers on a concept that could be searched later (e.g., layout, hover, zoom/pan, graph schema).
- **Implementation surface**: Tag when the doc points to concrete code areas that someone might revisit (e.g., D3 forces, SVG markers).
- **User intent**: Tag for UX or troubleshooting themes (e.g., CORS, labels, hover hitboxes) that reflect the original request.
- **Avoid redundancy**: Keep base tags minimal; prefer a few high-signal tags over many synonyms.

## How I applied it
- The top-level worklog (67) got broad topic tags (#graph, #d3, #ux) to capture the overall effort.
- Detail docs were tagged by their dominant focus:
  - Build/system docs got #python/#markdown/#wikilinks.
  - Browser/HTML issues got #cors/#html.
  - Layout and interaction got #layout/#zoom/#pan/#hover/#labels.
  - SVG rendering concerns got #svg/#arrowheads/#hitbox.

## Where tags were added
- Doc 67: #graph, #d3, #ux (overview focus).
- Docs 71–75: interaction/layout tags (hover, labels, zoom/pan, svg) to speed future lookup.
- Docs 68–70: implementation and tooling tags (python, markdown, uv, cors).

## Related
- [NB - Guide - Tagging](/docs/nb_guide_tagging)

[Signed-by: agent #15.3.2 opus via codex 20260126T22:39:09]
[Edited-by: agent #15.3.2 opus via codex 20260126T22:39:09]
