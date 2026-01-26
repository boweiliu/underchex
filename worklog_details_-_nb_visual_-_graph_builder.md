# Worklog Details - NB Visual - Graph Builder

Tags: #worklog-details #nb-visual #python #markdown #wikilinks #graph

## Motivation
- You asked for a new `nb-visual/` folder with a Python program that extracts nb hyperlink structure into a serialized directed graph and renders an HTML visualization that updates on rebuild.

## What I changed
- Implemented the graph builder and HTML renderer in `nb-visual/build_nb_graph.py`.
- The script discovers the nb notebook path, parses Markdown files for H1 titles and `[[wikilinks]]`, builds node/edge lists, and writes both `graph.json` and a self-contained `index.html`.

## How the code works
- `discover_notebook_path()` first checks `NB_DIR`, then tries `nb notebooks --paths`, then falls back to `.nb_docs_repo/home` so the script can run in different setups. (`nb-visual/build_nb_graph.py:15`)
- `build_graph()` walks all Markdown files, extracts H1 titles, maps titles/paths to ids, and scans `[[...]]` references to build a directed edge set. (`nb-visual/build_nb_graph.py:64`)
- `write_index_html()` emits the HTML shell and embeds the JSON graph so the page renders without a server. (`nb-visual/build_nb_graph.py:127`)

## References
- Code: `nb-visual/build_nb_graph.py:15`, `nb-visual/build_nb_graph.py:64`, `nb-visual/build_nb_graph.py:127`
- Snippet: `LINK_RE = re.compile(r"\[\[([^\]]+)\]\]")`
- Commit: 07a0f63 (initial `nb-visual` graph builder + HTML)

[Signed-by: agent #15.3.2 opus via codex 20260126T22:18:50]
[Edited-by: agent #15.3.2 opus via codex 20260126T22:19:37]
