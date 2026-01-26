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


def build_graph(notebook_path: Path) -> dict:
    files: list[Path] = []
    for path in notebook_path.rglob("*.md"):
        if ".git" in path.parts:
            continue
        files.append(path)

    files.sort()

    nodes = []
    title_to_ids: dict[str, list[int]] = {}
    path_to_id: dict[str, int] = {}

    for idx, path in enumerate(files):
        rel_path = path.relative_to(notebook_path)
        rel_posix = rel_path.as_posix()
        default_title = path.stem
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            text = path.read_text(encoding="utf-8", errors="replace")
        lines = text.splitlines()
        title = extract_title(lines, default_title)
        node = {
            "id": idx,
            "title": title,
            "path": rel_posix,
        }
        nodes.append(node)
        title_to_ids.setdefault(title, []).append(idx)
        path_key = rel_posix[:-3] if rel_posix.endswith(".md") else rel_posix
        path_to_id[path_key] = idx

    edges = set()
    for idx, path in enumerate(files):
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            text = path.read_text(encoding="utf-8", errors="replace")
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


def write_index_html(out_dir: Path, graph: dict) -> None:
    html_path = out_dir / "index.html"
    graph_json = json.dumps(graph)
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
    .node circle {
      fill: var(--accent);
      stroke: #0b1118;
      stroke-width: 2px;
    }
    .node text {
      pointer-events: none;
      fill: var(--text);
      font-size: 11px;
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
<body>
  <div class="frame">
    <aside class="panel">
      <h1>NB Graph</h1>
      <p>Directed links between nb docs (arrowheads show direction). Reload after running the build script.</p>
      <p>Zoom: trackpad pinch or scroll. Pan: drag the background. Double-click to re-center.</p>
      <div class="stats" id="stats">Loading graph...</div>
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
    const tooltip = document.getElementById("tooltip");
    const stats = document.getElementById("stats");
    const svg = d3.select("svg");
    const width = () => svg.node().clientWidth;
    const height = () => svg.node().clientHeight;

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
      tooltip.textContent = `${d.title} (${d.path})`;
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
          .distance(70)
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
        .attr("class", "node");

      node.append("circle")
        .attr("r", 6)
        .on("mousemove", showTooltip)
        .on("mouseleave", hideTooltip);

      node.append("text")
        .attr("x", 10)
        .attr("y", 4)
        .text(d => d.title.length > 22 ? d.title.slice(0, 22) + "..." : d.title);

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

    renderGraph(graph);
  </script>
</body>
</html>
"""
    html = html.replace("__GRAPH_JSON__", graph_json)
    html_path.write_text(html, encoding="utf-8")


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
    write_index_html(out_dir, graph)

    print(f"Wrote {graph_path} and {out_dir / 'index.html'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
