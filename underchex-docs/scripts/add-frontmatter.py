from pathlib import Path

for md in Path("docs").rglob("*.md"):
    text = md.read_text()

    if text.startswith("---"):
        continue

    title = md.stem.replace("-", " ").replace("_", " ").title()

    md.write_text(
        f"---\n"
        f"title: {title}\n"
        f"---\n\n"
        + text
    )
