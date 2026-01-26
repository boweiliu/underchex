# Worklog Details - NB Visual - Graph JSON Format

Tags: #worklog-details #nb-visual #graph #json

## Motivation
- You asked for a dedicated doc describing the `graph.json` schema so it’s easy to consume or extend later.

## Format
- The file is a single JSON object with `nodes`, `edges`, and `metadata` fields.
- `nodes` is a list of `{ id, title, path }` objects.
  - `id` is a 0-based integer used for link references.
  - `title` is the H1 text if present, otherwise the filename stem.
  - `path` is the nb-relative path to the markdown file, with `.md` extension.
- `edges` is a list of `{ source, target }` objects.
  - `source` and `target` are node ids that form a directed edge (source references target).
- `metadata` holds summary info: notebook path and counts.

## Example
```json
{
  "nodes": [
    {"id": 0, "title": "NB - Hub", "path": "NB - Hub.md"},
    {"id": 1, "title": "NB - Guide - Note Formatting", "path": "nb_-_guide_-_note_formatting.md"}
  ],
  "edges": [
    {"source": 0, "target": 1}
  ],
  "metadata": {
    "notebook_path": "/Users/.../.nb_docs_repo/home",
    "node_count": 2,
    "edge_count": 1
  }
}
```

## How it is produced
- Nodes are built by scanning `*.md` files under the nb notebook path. (`nb-visual/build_nb_graph.py:64`)
- Links are extracted from `[[...]]` wiki-style references and normalized. (`nb-visual/build_nb_graph.py:55`)
- The JSON is written to `nb-visual/graph.json` during `uv run nb-visual/build_nb_graph.py`. (`nb-visual/build_nb_graph.py:459`)

## References
- Code: `nb-visual/build_nb_graph.py:64`, `nb-visual/build_nb_graph.py:55`, `nb-visual/build_nb_graph.py:459`
- Snippet: `{"nodes": nodes, "edges": [...], "metadata": {...}}`

[Signed-by: agent #15.3.2 opus via codex 20260126T22:25:00]

