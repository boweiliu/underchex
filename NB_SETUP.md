# nb Setup Guide

`nb` is a command-line note-taking tool used as a local knowledge base in this project.

## Prerequisites

Install nb: https://github.com/xwmx/nb

## Environment Setup

The project uses direnv for environment configuration. Ensure `.envrc` is loaded:

```bash
direnv allow
```

This sets:
```bash
export NB_DIR="$(cd "$(dirname "$(git rev-parse --git-common-dir 2>/dev/null)")" && pwd)/.docs"
export NB_AUTO_SYNC=0
```

## Remote Sync Setup

```bash
nb remote set git@github.com:boweiliu/underchex.git docs/nb
nb sync --all
```

Note: Use `nb sync --all` rather than plain `nb sync`.

## Common Commands

```bash
# List all notes (sorted reverse with titles)
nb -sr

# Search notes
nb search '#keyword'
nb search home: keyword --list

# View a note
nb show <id>

# Edit a note (use --overwrite to replace content)
nb edit <id> --content "new content" --overwrite

# Add a new note
nb add --title "Topic - Type - Specific" --tags tag1,tag2 "Content..."

# Manual sync
nb sync
```

## File Locations

- Notes: `.docs/home/`
- Agent onboarding: `.docs/home/NB_README.llm.md`
- Human quick reference: `NB_README.human.md`

## nb-visual (Graph Visualization)

```bash
uv run nb-visual/build_nb_graph.py
# Open nb-visual/index.html in browser
```
