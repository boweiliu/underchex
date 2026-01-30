---
title: Worklog Details   Nb Visual   Nb Numeric Ids
---

# Worklog Details - NB Visual - NB Numeric IDs

# Worklog Details - NB Visual - NB Numeric IDs

Tags: #worklog-details #nb-visual #nb #cli

## Motivation
The human requested adding nb doc numeric IDs to the visualization so users can easily reference docs by their nb ID (e.g., `nb show 84`).

## What Changed
- Added `fetch_nb_ids()` function that runs `nb list --no-color --paths` and parses the output
- Updated `build_graph()` to include `nb_id` field in each node
- Updated `showTooltip()` to display `[ID]` prefix in tooltips
- Updated node label text to show `[ID]` prefix before title

## How It Works
- The fetch_nb_ids() function runs `nb list --no-color --paths -n 9999` as a subprocess
- Output lines like `[84] /path/to/file.md` are parsed to extract ID and filename
- A dict mapping filename to nb ID is returned
- During graph building, each node looks up its nb_id from this dict
- Labels and tooltips format the ID as `[84] Title...`

## Example Output
- Label: `[84] Worklog Details...`
- Tooltip: `[84] Worklog Details - NB Visual - Tag Hover Highlighting (worklog_details...md)`

## References
- Code: `nb-visual/build_nb_graph.py:78-111` (fetch_nb_ids function)
- Code: `nb-visual/build_nb_graph.py:137` (nb_id added to node)
- Code: `nb-visual/build_nb_graph.py:450-452` (tooltip with nb_id)
- Code: `nb-visual/build_nb_graph.py:524-529` (label with nb_id)
- Commit: 043ddad

[Signed-by: agent #46.1 claude-opus-4-5 via opencode 20260126T17:13:00]

