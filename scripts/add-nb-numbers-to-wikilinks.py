#!/usr/bin/env python3
"""
Add nb document numbers to wikilinks in all nb docs.

Transforms wikilinks like:
    [[NB - Guide - Note Formatting]]
To:
    [[NB - Guide - Note Formatting]] (nb 14)

Skips wikilinks that already have the (nb N) suffix.

Usage:
    python scripts/add-nb-numbers-to-wikilinks.py        # dry run
    python scripts/add-nb-numbers-to-wikilinks.py --apply  # apply changes
"""

import argparse
import re
import subprocess
from pathlib import Path


def get_nb_title_to_id_map() -> dict[str, str]:
    """Build a mapping of note titles to their nb IDs.
    
    Includes both main notebook and subfolders like Project/.
    """
    title_to_id = {}
    # Parse lines like: [14]  NB - Guide - Note Formatting
    # or: [Project/2] Underchex - Hub
    pattern = re.compile(r'^\[([^\]]+)\]\s+(.+)$')
    
    # Get main notebook entries
    result = subprocess.run(
        ["nb", "list", "--no-color"],
        capture_output=True,
        text=True,
        check=True,
    )
    
    for line in result.stdout.strip().split('\n'):
        match = pattern.match(line)
        if match:
            nb_id = match.group(1)
            title = match.group(2).strip()
            title_to_id[title] = nb_id
    
    # Get subfolder entries (e.g., Project/)
    # First, find all subfolders
    result = subprocess.run(
        ["nb", "ls", "-t", "folder", "--no-color"],
        capture_output=True,
        text=True,
    )
    
    folder_pattern = re.compile(r'^\[([^\]]+)\]\s+📂\s+(.+)$')
    folders = []
    for line in result.stdout.strip().split('\n'):
        match = folder_pattern.match(line)
        if match:
            folders.append(match.group(2).strip())
    
    # Get entries from each subfolder
    for folder in folders:
        result = subprocess.run(
            ["nb", "list", f"{folder}/", "--no-color"],
            capture_output=True,
            text=True,
        )
        for line in result.stdout.strip().split('\n'):
            match = pattern.match(line)
            if match:
                nb_id = match.group(1)  # e.g., "Project/2"
                title = match.group(2).strip()
                # Store with folder prefix for wikilink matching
                title_to_id[f"{folder}/{title}"] = nb_id
    
    return title_to_id


def get_nb_docs_path() -> Path:
    """Get the path to the nb docs repository."""
    result = subprocess.run(
        ["nb", "show", "1", "--path"],
        capture_output=True,
        text=True,
        check=True,
    )
    # Get parent directory of any doc
    return Path(result.stdout.strip()).parent


def remove_code_blocks(content: str) -> tuple[str, list[tuple[int, int, str]]]:
    """Remove code blocks from content, returning cleaned content and block positions.
    
    Returns (content_without_code_blocks, [(start, end, original_block), ...])
    """
    # Match fenced code blocks (``` or ~~~)
    code_block_pattern = re.compile(r'(```|~~~).*?\1', re.DOTALL)
    
    blocks = []
    for match in code_block_pattern.finditer(content):
        blocks.append((match.start(), match.end(), match.group(0)))
    
    # Replace code blocks with placeholders of the same length (to preserve positions)
    result = content
    offset = 0
    for start, end, block in blocks:
        placeholder = '\x00' * len(block)  # Use null chars as placeholder
        result = result[:start - offset] + placeholder + result[end - offset:]
    
    return result, blocks


def restore_code_blocks(content: str, blocks: list[tuple[int, int, str]]) -> str:
    """Restore code blocks to their original positions."""
    result = content
    for start, end, block in blocks:
        placeholder = '\x00' * len(block)
        result = result.replace(placeholder, block, 1)
    return result


def process_file(filepath: Path, title_to_id: dict[str, str], apply: bool) -> list[str]:
    """Process a single file, adding nb numbers to wikilinks.
    
    Returns list of changes made (for reporting).
    Skips wikilinks inside code blocks.
    """
    content = filepath.read_text()
    changes = []
    
    # Remove code blocks temporarily to avoid transforming examples
    content_no_code, code_blocks = remove_code_blocks(content)
    
    # Match wikilinks: [[Title]] not followed by (nb
    # This regex captures the full wikilink and ensures it's not already followed by (nb
    pattern = re.compile(r'\[\[([^\]]+)\]\](?!\s*\(nb)')
    
    def replace_wikilink(match):
        full_match = match.group(0)
        title = match.group(1)
        
        # Look up the nb ID for this title
        if title in title_to_id:
            nb_id = title_to_id[title]
            replacement = f"[[{title}]] (nb {nb_id})"
            changes.append(f"  {full_match} -> {replacement}")
            return replacement
        else:
            # Title not found - might be a broken link or special case
            # Leave it unchanged but report it
            changes.append(f"  WARNING: No nb ID found for [[{title}]]")
            return full_match
    
    new_content_no_code = pattern.sub(replace_wikilink, content_no_code)
    
    # Restore code blocks
    new_content = restore_code_blocks(new_content_no_code, code_blocks)
    
    if apply and new_content != content:
        filepath.write_text(new_content)
    
    return changes


def main():
    parser = argparse.ArgumentParser(description="Add nb numbers to wikilinks")
    parser.add_argument("--apply", action="store_true", help="Apply changes (default is dry run)")
    args = parser.parse_args()
    
    print("Building title -> nb ID mapping...")
    title_to_id = get_nb_title_to_id_map()
    print(f"Found {len(title_to_id)} nb documents")
    
    nb_docs_path = get_nb_docs_path()
    print(f"Scanning {nb_docs_path}...")
    
    total_changes = 0
    files_changed = 0
    
    for md_file in nb_docs_path.glob("**/*.md"):
        changes = process_file(md_file, title_to_id, args.apply)
        if changes:
            # Filter out warnings for reporting
            actual_changes = [c for c in changes if not c.startswith("  WARNING")]
            if actual_changes:
                files_changed += 1
                total_changes += len(actual_changes)
                print(f"\n{md_file.name}:")
                for change in changes:
                    print(change)
    
    print(f"\n{'Applied' if args.apply else 'Would apply'} {total_changes} changes to {files_changed} files")
    
    if not args.apply:
        print("\nRun with --apply to make changes")


if __name__ == "__main__":
    main()
