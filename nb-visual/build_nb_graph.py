#!/usr/bin/env python3
import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path


H1_RE = re.compile(r"^#\s+(.+)$")
LINK_RE = re.compile(r"\[\[([^\]]+)\]\]")
TAG_RE = re.compile(r"#([a-zA-Z0-9_-]+)")


def discover_notebook_path(cwd: Path) -> Path:
    env_nb_dir = os.environ.get("NB_DIR")
    if env_nb_dir:
        nb_dir = Path(env_nb_dir)
        if nb_dir.is_dir():
            home = nb_dir / "home"
            if home.is_dir():
                return home
            return nb_dir

    try:
        output = subprocess.check_output(
            ["nb", "notebooks", "--paths"],
            text=True,
            stderr=subprocess.DEVNULL,
        )
        for line in output.splitlines():
            path = line.strip()
            if path:
                nb_path = Path(path)
                if nb_path.is_dir():
                    return nb_path
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass

    fallback = cwd / ".nb_docs_repo" / "home"
    if fallback.is_dir():
        return fallback

    raise FileNotFoundError("Unable to locate nb notebook path.")


def extract_title(lines: list[str], default_title: str) -> str:
    for line in lines:
        match = H1_RE.match(line.strip())
        if match:
            return match.group(1).strip()
    return default_title


def normalize_link_target(raw: str) -> str:
    target = raw.strip()
    if "|" in target:
        target = target.split("|", 1)[0].strip()
    if "#" in target:
        target = target.split("#", 1)[0].strip()
    return target


def extract_tags(text: str) -> list[str]:
    """Extract hashtags from text, typically from 'Tags: #tag1 #tag2' lines."""
    tags = []
    for line in text.splitlines():
        line_stripped = line.strip()
        # Look for lines that start with "Tags:" (case insensitive)
        if line_stripped.lower().startswith("tags:"):
            found = TAG_RE.findall(line_stripped)
            tags.extend(found)
    return list(set(tags))  # dedupe


def fetch_nb_ids() -> dict[str, int]:
    """Fetch nb numeric IDs by parsing 'nb list' output.
    
    Returns a dict mapping filename (without path) to nb ID.
    """
    filename_to_nb_id: dict[str, int] = {}
    try:
        output = subprocess.check_output(
            ["nb", "list", "--no-color", "--paths", "-n", "9999"],
            text=True,
            stderr=subprocess.DEVNULL,
        )
        # Parse lines like: [84] /path/to/file.md
        for line in output.splitlines():
            line = line.strip()
            if not line or not line.startswith("["):
                continue
            # Extract [ID] and path
            bracket_end = line.find("]")
            if bracket_end == -1:
                continue
            try:
                nb_id = int(line[1:bracket_end])
            except ValueError:
                continue
            # Extract filename from path
            path_part = line[bracket_end + 1:].strip()
            if path_part:
                filename = Path(path_part).name
                filename_to_nb_id[filename] = nb_id
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass
    return filename_to_nb_id


def build_graph(notebook_path: Path) -> dict:
    files: list[Path] = []
    for path in notebook_path.rglob("*.md"):
        if ".git" in path.parts:
            continue
        files.append(path)

    files.sort()

    # Fetch nb IDs for all files
    nb_ids = fetch_nb_ids()

    nodes = []
    title_to_ids: dict[str, list[int]] = {}
    path_to_id: dict[str, int] = {}

    file_texts: dict[int, str] = {}  # Store file texts for reuse
    
    for idx, path in enumerate(files):
        rel_path = path.relative_to(notebook_path)
        rel_posix = rel_path.as_posix()
        default_title = path.stem
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            text = path.read_text(encoding="utf-8", errors="replace")
        file_texts[idx] = text
        lines = text.splitlines()
        title = extract_title(lines, default_title)
        tags = extract_tags(text)
        nb_id = nb_ids.get(path.name)  # Get nb ID from filename
        node = {
            "id": idx,
            "title": title,
            "path": rel_posix,
            "tags": tags,
            "nb_id": nb_id,  # nb numeric ID (e.g., 84)
        }
        nodes.append(node)
        title_to_ids.setdefault(title, []).append(idx)
        path_key = rel_posix[:-3] if rel_posix.endswith(".md") else rel_posix
        path_to_id[path_key] = idx

    edges = set()
    for idx, path in enumerate(files):
        text = file_texts[idx]
        for raw in LINK_RE.findall(text):
            target = normalize_link_target(raw)
            if not target:
                continue
            target_id = path_to_id.get(target)
            if target_id is None:
                ids = title_to_ids.get(target)
                if ids:
                    target_id = ids[0]
            if target_id is None or target_id == idx:
                continue
            edges.add((idx, target_id))

    return {
        "nodes": nodes,
        "edges": [{"source": s, "target": t} for s, t in sorted(edges)],
        "metadata": {
            "notebook_path": str(notebook_path),
            "node_count": len(nodes),
            "edge_count": len(edges),
        },
    }


def write_index_html(out_dir: Path, graph: dict, tags_data: dict) -> None:
    html_path = out_dir / "index.html"
    graph_json = json.dumps(graph)
    tags_json = json.dumps(tags_data)
    html = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>NB Graph</title>
  <script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
  <style>
    :root {
      --bg: #0f151d;
      --panel: #141c26;
      --text: #f1f4f8;
      --muted: #9fb0c6;
      --accent: #6bd4ff;
      --edge: #2b3b4d;
    }
    html, body {
      height: 100%;
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: "Avenir Next", "Gill Sans", "Trebuchet MS", sans-serif;
    }
    .frame {
      display: grid;
      grid-template-columns: 280px 1fr;
      height: 100%;
    }
    .panel {
      background: var(--panel);
      padding: 20px;
      border-right: 1px solid #1e2a38;
      overflow: auto;
    }
    .panel h1 {
      margin: 0 0 10px;
      font-size: 20px;
      letter-spacing: 0.5px;
    }
    .panel p {
      margin: 6px 0;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.4;
    }
    .stats {
      margin-top: 16px;
      padding: 12px;
      background: #10161f;
      border-radius: 10px;
      font-size: 12px;
      color: var(--muted);
    }
    #graph {
      position: relative;
    }
    svg {
      width: 100%;
      height: 100%;
    }
    .node .dot {
      fill: var(--accent);
      stroke: #0b1118;
      stroke-width: 2px;
    }
    .node text {
      pointer-events: auto;
      fill: var(--text);
      font-size: 11px;
      opacity: 0.15;
      transition: opacity 0.2s ease;
    }
    .hitbox {
      fill: transparent;
      stroke: none;
      pointer-events: all;
    }
    .node.hover text {
      opacity: 0.95;
    }
    .labels-hidden .node text {
      opacity: 0;
    }
    .labels-hidden .node.hover text {
      opacity: 0;
    }
    .labels-show .node text {
      opacity: 0.9;
    }
    .edge {
      stroke: var(--edge);
      stroke-width: 1.2px;
      opacity: 0.6;
    }
    .tooltip {
      position: absolute;
      background: #0b1118;
      border: 1px solid #213245;
      color: var(--text);
      padding: 8px 10px;
      border-radius: 8px;
      font-size: 12px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s ease;
      max-width: 260px;
    }
    .footer {
      margin-top: 18px;
      font-size: 11px;
      color: var(--muted);
    }
    .footer code {
      color: var(--text);
    }
    .controls {
      margin-top: 12px;
      font-size: 12px;
      color: var(--muted);
      display: grid;
      gap: 6px;
    }
    .controls select {
      background: #0b1118;
      color: var(--text);
      border: 1px solid #213245;
      border-radius: 6px;
      padding: 6px 8px;
      font-size: 12px;
    }
    .tag-section {
      margin-top: 16px;
    }
    .tag-section h2 {
      margin: 0 0 8px;
      font-size: 14px;
      color: var(--muted);
      font-weight: 500;
    }
    .tag-list {
      max-height: 200px;
      overflow-y: auto;
      background: #10161f;
      border-radius: 10px;
      padding: 8px;
    }
    .tag-list::-webkit-scrollbar {
      width: 6px;
    }
    .tag-list::-webkit-scrollbar-track {
      background: transparent;
    }
    .tag-list::-webkit-scrollbar-thumb {
      background: #2b3b4d;
      border-radius: 3px;
    }
    .tag-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 5px 8px;
      margin: 2px 0;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .tag-item:hover {
      background: #1a2533;
    }
    .tag-item .tag-name {
      color: var(--accent);
    }
    .tag-item .tag-count {
      color: var(--muted);
      font-size: 11px;
    }
    .node.tag-highlight .dot {
      fill: #ffcc00;
      stroke: #ffcc00;
      stroke-width: 3px;
    }
    .node.tag-highlight text {
      opacity: 1 !important;
      fill: #ffcc00;
    }
    @media (max-width: 900px) {
      .frame {
        grid-template-columns: 1fr;
        grid-template-rows: auto 1fr;
      }
      .panel {
        border-right: none;
        border-bottom: 1px solid #1e2a38;
      }
    }
  </style>
</head>
<body class="labels-hover">
  <div class="frame">
    <aside class="panel">
      <h1>NB Graph</h1>
      <p>Directed links between nb docs (arrowheads show direction). Reload after running the build script.</p>
      <p>Zoom: trackpad pinch or scroll. Pan: drag the background. Double-click to re-center.</p>
      <div class="controls">
        <label for="label-mode">Labels</label>
        <select id="label-mode">
          <option value="hidden">Hide all</option>
          <option value="hover" selected>Show on hover</option>
          <option value="show">Show all</option>
        </select>
      </div>
      <div class="stats" id="stats">Loading graph...</div>
      <div class="tag-section">
        <h2>Tags</h2>
        <div class="tag-list" id="tag-list"></div>
      </div>
      <div class="footer">
        <div>Build: <code>python nb-visual/build_nb_graph.py</code></div>
        <div>Data: <code>nb-visual/graph.json</code></div>
      </div>
    </aside>
    <main id="graph">
      <div class="tooltip" id="tooltip"></div>
      <svg></svg>
    </main>
  </div>
  <script>
    const graph = __GRAPH_JSON__;
    const tagsData = __TAGS_JSON__;
    const body = document.body;
    const labelMode = document.getElementById("label-mode");
    const tooltip = document.getElementById("tooltip");
    const stats = document.getElementById("stats");
    const tagList = document.getElementById("tag-list");
    const svg = d3.select("svg");
    const width = () => svg.node().clientWidth;
    const height = () => svg.node().clientHeight;
    
    // Build a lookup from tag to doc_ids for highlighting
    const tagToDocIds = {};
    tagsData.tags.forEach(t => {
      tagToDocIds[t.tag] = new Set(t.doc_ids);
    });

    function fitToViewport(group, nodes) {
      const w = width();
      const h = height();
      const padding = 40;
      const xExtent = d3.extent(nodes, d => d.x);
      const yExtent = d3.extent(nodes, d => d.y);
      const graphW = Math.max(1, xExtent[1] - xExtent[0]);
      const graphH = Math.max(1, yExtent[1] - yExtent[0]);
      const scale = Math.min((w - padding * 2) / graphW, (h - padding * 2) / graphH, 2);
      const tx = (w - graphW * scale) / 2 - xExtent[0] * scale;
      const ty = (h - graphH * scale) / 2 - yExtent[0] * scale;
      const transform = d3.zoomIdentity.translate(tx, ty).scale(scale);
      group.attr("transform", transform);
      return transform;
    }

    function showTooltip(event, d) {
      tooltip.style.opacity = 1;
      tooltip.style.left = `${event.offsetX + 12}px`;
      tooltip.style.top = `${event.offsetY + 12}px`;
      const nbIdStr = d.nb_id != null ? `[${d.nb_id}] ` : "";
      tooltip.textContent = `${nbIdStr}${d.title} (${d.path})`;
    }

    function hideTooltip() {
      tooltip.style.opacity = 0;
    }

    function renderGraph(graph) {
      stats.textContent = `Nodes: ${graph.nodes.length} | Edges: ${graph.edges.length}`;
      svg.selectAll("*").remove();

      const group = svg.append("g");
      const simulation = d3.forceSimulation(graph.nodes)
        .force("link", d3.forceLink(graph.edges)
          .id(d => d.id)
          .distance(140)
          .strength(0.8))
        .force("charge", d3.forceManyBody().strength(-160))
        .force("collide", d3.forceCollide(10))
        .force("x", d3.forceX(width() / 2).strength(0.05))
        .force("y", d3.forceY(height() / 2).strength(0.05))
        .force("center", d3.forceCenter(width() / 2, height() / 2));

      const defs = svg.append("defs");
      defs.append("marker")
        .attr("id", "arrow")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 18)
        .attr("refY", 0)
        .attr("markerWidth", 10)
        .attr("markerHeight", 10)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#6bd4ff");

      const link = group.append("g")
        .attr("stroke-linecap", "round")
        .selectAll("line")
        .data(graph.edges)
        .enter()
        .append("line")
        .attr("class", "edge")
        .attr("marker-end", "url(#arrow)");

      const node = group.append("g")
        .selectAll("g")
        .data(graph.nodes)
        .enter()
        .append("g")
        .attr("class", "node")
        .on("mouseenter", function(event, d) {
          d3.select(this).classed("hover", true);
          showTooltip(event, d);
        })
        .on("mousemove", showTooltip)
        .on("mouseleave", function() {
          d3.select(this).classed("hover", false);
          hideTooltip();
        });

      node.append("circle")
        .attr("r", 24)
        .attr("class", "hitbox");

      node.append("circle")
        .attr("r", 6)
        .attr("class", "dot")
        .style("pointer-events", "none");

      node.append("text")
        .attr("x", 10)
        .attr("y", 4)
        .text(d => {
          const prefix = d.nb_id != null ? `[${d.nb_id}] ` : "";
          const maxLen = 22 - prefix.length;
          const title = d.title.length > maxLen ? d.title.slice(0, maxLen) + "..." : d.title;
          return prefix + title;
        });

      simulation.stop();
      for (let i = 0; i < 240; i += 1) {
        simulation.tick();
      }

      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      node.attr("transform", d => `translate(${d.x}, ${d.y})`);

      const baseTransform = fitToViewport(group, graph.nodes);
      const zoom = d3.zoom()
        .scaleExtent([0.2, 4])
        .on("zoom", (event) => {
          group.attr("transform", event.transform);
        });

      svg.call(zoom).call(zoom.transform, baseTransform);
      svg.on("dblclick.zoom", null);
      svg.on("dblclick", () => {
        svg.transition().duration(250).call(zoom.transform, baseTransform);
      });

      window.addEventListener("resize", () => {
        const nextTransform = fitToViewport(group, graph.nodes);
        svg.call(zoom.transform, nextTransform);
      });
    }

    labelMode.addEventListener("change", () => {
      body.classList.remove("labels-hidden", "labels-hover", "labels-show");
      body.classList.add(`labels-${labelMode.value}`);
    });

    function highlightDocsByTag(docIds) {
      d3.selectAll(".node").each(function(d) {
        const el = d3.select(this);
        if (docIds && docIds.has(d.id)) {
          el.classed("tag-highlight", true);
        } else {
          el.classed("tag-highlight", false);
        }
      });
    }

    function renderTagList() {
      tagList.innerHTML = "";
      tagsData.tags.forEach(t => {
        const item = document.createElement("div");
        item.className = "tag-item";
        item.innerHTML = `<span class="tag-name">#${t.tag}</span><span class="tag-count">${t.count}</span>`;
        item.addEventListener("mouseenter", () => {
          highlightDocsByTag(tagToDocIds[t.tag]);
        });
        item.addEventListener("mouseleave", () => {
          highlightDocsByTag(null);
        });
        tagList.appendChild(item);
      });
    }

    renderGraph(graph);
    renderTagList();
  </script>
</body>
</html>
"""
    html = html.replace("__GRAPH_JSON__", graph_json)
    html = html.replace("__TAGS_JSON__", tags_json)
    html_path.write_text(html, encoding="utf-8")


def build_tags_data(graph: dict) -> dict:
    """Build tag frequency data from graph nodes.
    
    Returns a dict with:
    - tags: list of {tag, count, doc_ids} sorted by count descending
    """
    tag_to_docs: dict[str, list[int]] = {}
    
    for node in graph["nodes"]:
        node_id = node["id"]
        for tag in node.get("tags", []):
            tag_lower = tag.lower()
            if tag_lower not in tag_to_docs:
                tag_to_docs[tag_lower] = []
            tag_to_docs[tag_lower].append(node_id)
    
    tags_list = []
    for tag, doc_ids in tag_to_docs.items():
        tags_list.append({
            "tag": tag,
            "count": len(doc_ids),
            "doc_ids": sorted(doc_ids),
        })
    
    # Sort by count descending, then alphabetically
    tags_list.sort(key=lambda x: (-x["count"], x["tag"]))
    
    return {
        "tags": tags_list,
        "metadata": {
            "total_tags": len(tags_list),
            "total_tag_usages": sum(t["count"] for t in tags_list),
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Build nb hyperlink graph.")
    parser.add_argument("--notebook-path", type=Path, default=None)
    parser.add_argument("--out-dir", type=Path, default=None)
    args = parser.parse_args()

    cwd = Path.cwd()
    notebook_path = args.notebook_path or discover_notebook_path(cwd)
    out_dir = args.out_dir or Path(__file__).resolve().parent
    out_dir.mkdir(parents=True, exist_ok=True)

    graph = build_graph(notebook_path)
    graph_path = out_dir / "graph.json"
    graph_path.write_text(json.dumps(graph, indent=2), encoding="utf-8")
    
    tags_data = build_tags_data(graph)
    tags_path = out_dir / "tags.json"
    tags_path.write_text(json.dumps(tags_data, indent=2), encoding="utf-8")
    
    write_index_html(out_dir, graph, tags_data)

    print(f"Wrote {graph_path}, {tags_path}, and {out_dir / 'index.html'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
